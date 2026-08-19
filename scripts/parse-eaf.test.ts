import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEaf } from './parse-eaf.ts';

const fixture = (path: string) => parseEaf(readFileSync(join(import.meta.dirname, '..', 'fixtures', path), 'utf8'));

const eaf = (body: string) =>
  parseEaf(
    `<?xml version="1.0" encoding="UTF-8"?><ANNOTATION_DOCUMENT AUTHOR="" DATE="2021-01-01T00:00:00+00:00" FORMAT="3.0" VERSION="3.0">${body}</ANNOTATION_DOCUMENT>`,
  );

describe('document metadata', () => {
  it('reads AUTHOR, DATE, VERSION and FORMAT off the root element', () => {
    const doc = fixture('KD1/VU20180811SAN/KD1-VU20180811SAN-03.eaf');
    expect(doc.date).toBe('2021-04-14T13:19:58+01:00');
    expect(doc.version).toBe('3.0');
    expect(doc.format).toBe('3.0');
  });

  it('treats an empty attribute as absent', () => {
    // Every fixture carries AUTHOR="", which would otherwise ship as noise.
    expect(fixture('NT1/001/NT1-001-001B.eaf').author).toBeUndefined();
  });

  it('reads document-level LANGUAGE elements', () => {
    const doc = eaf('<LANGUAGE LANG_DEF="http://cdb.iso.org/lg/CDB-00130975-001" LANG_ID="msn" LANG_LABEL="Vurës"/><LANGUAGE LANG_ID="en"/>');
    expect(doc.languages).toEqual([
      { langId: 'msn', langDef: 'http://cdb.iso.org/lg/CDB-00130975-001', langLabel: 'Vurës' },
      { langId: 'en', langDef: undefined, langLabel: undefined },
    ]);
  });

  it('rejects XML that is not an ELAN document', () => {
    expect(() => parseEaf('<?xml version="1.0"?><rdf:RDF xmlns:rdf="x"/>')).toThrow(/ANNOTATION_DOCUMENT/);
  });
});

describe('tiers', () => {
  it('reads a lone tier, which the XML parser would otherwise collapse to an object', () => {
    const doc = fixture('NT1/001/NT1-001-001B.eaf');
    expect(doc.tiers).toHaveLength(1);
    expect(doc.tiers[0]?.tierId).toBe('Channel1');
    expect(doc.tiers[0]?.linguisticTypeRef).toBe('default-lt');
    expect(doc.tiers[0]?.parentRef).toBeUndefined();
  });

  it('reads tier attributes and preserves document order', () => {
    const doc = fixture('KD1/VU20180811SAN/KD1-VU20180811SAN-01.eaf');
    expect(doc.tiers.map((tier) => tier.tierId)).toEqual([
      'ref',
      'Transcription-txt-msn',
      'Words-txt-msn',
      'Translation-gls-en',
      'Translation-gls-bi-Vu-fonipa-x-emic',
    ]);
    expect(doc.tiers.map((tier) => tier.parentRef)).toEqual([undefined, 'ref', 'Transcription-txt-msn', 'Transcription-txt-msn', 'Transcription-txt-msn']);
    expect(new Set(doc.tiers.map((tier) => tier.participant))).toEqual(new Set(['Godfrey Manar']));
  });

  it('reads LANG_REF and ANNOTATOR, which no fixture carries', () => {
    const [tier] = eaf('<TIER ANNOTATOR="AF" LANG_REF="msn" LINGUISTIC_TYPE_REF="t" TIER_ID="a"/>').tiers;
    expect(tier?.annotator).toBe('AF');
    expect(tier?.langRef).toBe('msn');
  });

  it('keeps an empty self-closing tier with no annotations', () => {
    const doc = fixture('KD1/VU20180811SAN/KD1-VU20180811SAN-01.eaf');
    const empty = doc.tiers.filter((tier) => tier.annotations.length === 0);
    expect(empty.map((tier) => tier.tierId)).toEqual(['Words-txt-msn', 'Translation-gls-en', 'Translation-gls-bi-Vu-fonipa-x-emic']);
  });
});

describe('alignable annotations', () => {
  it('resolves start and end through the TIME_ORDER map', () => {
    const doc = fixture('NT1/001/NT1-001-001B.eaf');
    const annotations = doc.tiers[0]?.annotations ?? [];
    expect(annotations).toHaveLength(451);
    expect(annotations[0]).toEqual({ id: 'a701', startMs: 0, endMs: 15620, value: '' });
    expect(annotations.at(-1)).toEqual({ id: 'a1036', startMs: 1086580, endMs: 1089666, value: '' });
  });

  it('keeps empty annotation values as empty strings', () => {
    const annotations = fixture('NT1/001/NT1-001-001B.eaf').tiers[0]?.annotations ?? [];
    expect(annotations.filter((annotation) => annotation.value === '')).toHaveLength(110);
    expect(annotations.every((annotation) => typeof annotation.value === 'string')).toBe(true);
  });

  it('leaves a numeric-looking value as a string', () => {
    const doc = eaf(
      '<TIME_ORDER><TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/><TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="10"/></TIME_ORDER>' +
        '<TIER TIER_ID="a"><ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2"><ANNOTATION_VALUE>123</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION></TIER>',
    );
    expect(doc.tiers[0]?.annotations[0]?.value).toBe('123');
  });

  it('falls back to zero for a time slot that carries no value', () => {
    const doc = eaf(
      '<TIME_ORDER><TIME_SLOT TIME_SLOT_ID="ts1"/><TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="10"/></TIME_ORDER>' +
        '<TIER TIER_ID="a"><ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2"><ANNOTATION_VALUE>x</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION></TIER>',
    );
    expect(doc.tiers[0]?.annotations[0]).toEqual({ id: 'a1', startMs: 0, endMs: 10, value: 'x' });
  });

  it('sorts annotations by start then end', () => {
    const doc = eaf(
      '<TIME_ORDER><TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="50"/><TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="90"/><TIME_SLOT TIME_SLOT_ID="ts3" TIME_VALUE="10"/><TIME_SLOT TIME_SLOT_ID="ts4" TIME_VALUE="60"/></TIME_ORDER>' +
        '<TIER TIER_ID="a">' +
        '<ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="late" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2"><ANNOTATION_VALUE>b</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION>' +
        '<ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="early" TIME_SLOT_REF1="ts3" TIME_SLOT_REF2="ts4"><ANNOTATION_VALUE>a</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION>' +
        '</TIER>',
    );
    expect(doc.tiers[0]?.annotations.map((annotation) => annotation.id)).toEqual(['early', 'late']);
  });
});

describe('ref annotations', () => {
  it('inherits times from the referenced annotation', () => {
    const doc = fixture('KD1/VU20180811SAN/KD1-VU20180811SAN-01.eaf');
    const [refTier, transcription] = doc.tiers;
    expect(refTier?.annotations).toHaveLength(65);
    expect(transcription?.annotations).toHaveLength(65);
    // The ref tier holds the times and no text; the transcription holds the text.
    expect(refTier?.annotations[0]).toEqual({ id: 'a1', startMs: 4260, endMs: 10203, value: '' });
    expect(transcription?.annotations[0]?.startMs).toBe(4260);
    expect(transcription?.annotations[0]?.endMs).toBe(10203);
    expect(transcription?.annotations[0]?.value).toMatch(/^O tok ni gogoro/);
  });

  it('resolves a chain of refs two deep', () => {
    // Translation-gls-en refs Transcription-txt-msn, which itself refs the
    // time-aligned `ref` tier.
    const doc = fixture('KD1/VU20180811SAN/KD1-VU20180811SAN-03.eaf');
    const byId = new Map(doc.tiers.map((tier) => [tier.tierId, tier]));
    const alignable = byId.get('ref')?.annotations ?? [];
    const translation = byId.get('Translation-gls-en')?.annotations ?? [];
    expect(alignable).toHaveLength(6);
    expect(translation).toHaveLength(6);
    expect(translation.map((annotation) => [annotation.startMs, annotation.endMs])).toEqual(
      alignable.map((annotation) => [annotation.startMs, annotation.endMs]),
    );
    expect(translation[0]?.value).toBe('The snail is crawling on its belly.');
  });

  it('resolves a chain declared parent-last, which needs more than one pass', () => {
    const doc = eaf(
      '<TIME_ORDER><TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="100"/><TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="200"/></TIME_ORDER>' +
        '<TIER TIER_ID="grandchild" PARENT_REF="child"><ANNOTATION><REF_ANNOTATION ANNOTATION_ID="c" ANNOTATION_REF="b"><ANNOTATION_VALUE>word</ANNOTATION_VALUE></REF_ANNOTATION></ANNOTATION></TIER>' +
        '<TIER TIER_ID="child" PARENT_REF="root"><ANNOTATION><REF_ANNOTATION ANNOTATION_ID="b" ANNOTATION_REF="a"><ANNOTATION_VALUE>sentence</ANNOTATION_VALUE></REF_ANNOTATION></ANNOTATION></TIER>' +
        '<TIER TIER_ID="root"><ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="a" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2"><ANNOTATION_VALUE/></ALIGNABLE_ANNOTATION></ANNOTATION></TIER>',
    );
    expect(doc.tiers[0]?.annotations[0]).toEqual({ id: 'c', startMs: 100, endMs: 200, value: 'word' });
    expect(doc.tiers[1]?.annotations[0]).toEqual({ id: 'b', startMs: 100, endMs: 200, value: 'sentence' });
  });

  it('drops a ref whose target does not exist rather than looping', () => {
    const doc = eaf(
      '<TIER TIER_ID="a"><ANNOTATION><REF_ANNOTATION ANNOTATION_ID="b" ANNOTATION_REF="missing"><ANNOTATION_VALUE>x</ANNOTATION_VALUE></REF_ANNOTATION></ANNOTATION></TIER>',
    );
    expect(doc.tiers[0]?.annotations).toEqual([]);
  });

  it('drops refs that form a cycle', () => {
    const doc = eaf(
      '<TIER TIER_ID="a">' +
        '<ANNOTATION><REF_ANNOTATION ANNOTATION_ID="x" ANNOTATION_REF="y"><ANNOTATION_VALUE>1</ANNOTATION_VALUE></REF_ANNOTATION></ANNOTATION>' +
        '<ANNOTATION><REF_ANNOTATION ANNOTATION_ID="y" ANNOTATION_REF="x"><ANNOTATION_VALUE>2</ANNOTATION_VALUE></REF_ANNOTATION></ANNOTATION>' +
        '</TIER>',
    );
    expect(doc.tiers[0]?.annotations).toEqual([]);
  });
});
