import { XMLParser } from 'fast-xml-parser';
import type { EafAnnotation, EafDocument, EafLanguage, EafTier } from '../src/lib/eaf';

type XmlNode = Record<string, unknown>;

// Tags that may legitimately occur once; without this the parser collapses a
// lone TIER or ANNOTATION to a bare object and every walk below breaks.
const repeatingTags = new Set(['TIER', 'ANNOTATION', 'TIME_SLOT', 'LANGUAGE']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Annotation text is linguistic data: '123' and 'true' must stay strings.
  parseTagValue: false,
  isArray: (name) => repeatingTags.has(name),
});

const attr = (node: XmlNode | undefined, name: string): string | undefined => {
  const value = node?.[`@_${name}`];
  if (typeof value !== 'string' || value === '') {
    return undefined;
  }
  return value;
};

const children = (node: XmlNode | undefined, name: string): XmlNode[] => {
  const value = node?.[name];
  return Array.isArray(value) ? (value as XmlNode[]) : [];
};

const annotationValue = (node: XmlNode): string => {
  const value = node.ANNOTATION_VALUE;
  return typeof value === 'string' ? value : '';
};

const timeSlotMap = (document: XmlNode): Map<string, number> => {
  const slots = new Map<string, number>();
  for (const slot of children(document.TIME_ORDER as XmlNode | undefined, 'TIME_SLOT')) {
    const id = attr(slot, 'TIME_SLOT_ID');
    const value = attr(slot, 'TIME_VALUE');
    if (id && value !== undefined) {
      slots.set(id, Number.parseInt(value, 10));
    }
  }
  return slots;
};

const parseLanguages = (document: XmlNode): EafLanguage[] =>
  children(document, 'LANGUAGE').flatMap((element) => {
    const langId = attr(element, 'LANG_ID');
    if (!langId) {
      return [];
    }
    return [{ langId, langDef: attr(element, 'LANG_DEF'), langLabel: attr(element, 'LANG_LABEL') }];
  });

type PendingRef = { id: string; annotationRef: string; value: string };

export const parseEaf = (xml: string): EafDocument => {
  const document = (parser.parse(xml) as XmlNode).ANNOTATION_DOCUMENT as XmlNode | undefined;
  if (!document) {
    throw new Error('Not an ELAN annotation document: no ANNOTATION_DOCUMENT element');
  }

  const slots = timeSlotMap(document);
  const tierElements = children(document, 'TIER');

  const resolved = new Map<string, EafAnnotation>();
  const pending: PendingRef[] = [];
  // Annotation ids in the order each tier declares them, so tiers can be rebuilt
  // once every REF_ANNOTATION has found its times.
  const tierAnnotationIds: string[][] = [];

  for (const tier of tierElements) {
    const ids: string[] = [];
    for (const wrapper of children(tier, 'ANNOTATION')) {
      const alignable = wrapper.ALIGNABLE_ANNOTATION as XmlNode | undefined;
      if (alignable) {
        const id = attr(alignable, 'ANNOTATION_ID');
        if (id) {
          ids.push(id);
          resolved.set(id, {
            id,
            startMs: slots.get(attr(alignable, 'TIME_SLOT_REF1') ?? '') ?? 0,
            endMs: slots.get(attr(alignable, 'TIME_SLOT_REF2') ?? '') ?? 0,
            value: annotationValue(alignable),
          });
        }
        continue;
      }

      const ref = wrapper.REF_ANNOTATION as XmlNode | undefined;
      const id = attr(ref, 'ANNOTATION_ID');
      const annotationRef = attr(ref, 'ANNOTATION_REF');
      if (ref && id && annotationRef) {
        ids.push(id);
        pending.push({ id, annotationRef, value: annotationValue(ref) });
      }
    }
    tierAnnotationIds.push(ids);
  }

  // Refs can chain (word → sentence → time-aligned utterance), so sweep to a
  // fixed point rather than assuming a ref's parent is already resolved.
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const ref of pending) {
      if (resolved.has(ref.id)) {
        continue;
      }
      const parent = resolved.get(ref.annotationRef);
      if (parent) {
        resolved.set(ref.id, { id: ref.id, startMs: parent.startMs, endMs: parent.endMs, value: ref.value });
        progressed = true;
      }
    }
  }

  const tiers: EafTier[] = tierElements.map((tier, index) => {
    const annotations = (tierAnnotationIds[index] ?? []).flatMap((id) => {
      const annotation = resolved.get(id);
      return annotation ? [annotation] : [];
    });
    annotations.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

    return {
      tierId: attr(tier, 'TIER_ID') ?? 'Unknown',
      participant: attr(tier, 'PARTICIPANT'),
      annotator: attr(tier, 'ANNOTATOR'),
      linguisticTypeRef: attr(tier, 'LINGUISTIC_TYPE_REF'),
      parentRef: attr(tier, 'PARENT_REF'),
      langRef: attr(tier, 'LANG_REF'),
      annotations,
    };
  });

  return {
    author: attr(document, 'AUTHOR'),
    date: attr(document, 'DATE'),
    version: attr(document, 'VERSION'),
    format: attr(document, 'FORMAT'),
    languages: parseLanguages(document),
    tiers,
  };
};
