import { describe, expect, it } from 'vitest';
import { getMediaKind, getMediaLabel } from './mediaTypes.ts';

describe('getMediaKind', () => {
  it('classifies audio and video by prefix, so the long tail needs no allowlist', () => {
    expect(getMediaKind('audio/mpeg')).toBe('audio');
    expect(getMediaKind('audio/vnd.wav')).toBe('audio');
    expect(getMediaKind('audio/x-aiff')).toBe('audio');
    expect(getMediaKind('video/mp4')).toBe('video');
    expect(getMediaKind('video/x-msvideo')).toBe('video');
  });

  it('keeps images on an allowlist, so image/tiff never reaches an <img>', () => {
    expect(getMediaKind('image/jpeg')).toBe('image');
    expect(getMediaKind('image/png')).toBe('image');
    expect(getMediaKind('image/tiff')).toBe('other');
  });

  it('calls everything else other', () => {
    expect(getMediaKind('application/eaf+xml')).toBe('other');
    expect(getMediaKind('application/mxf')).toBe('other');
    expect(getMediaKind('')).toBe('other');
  });
});

describe('getMediaLabel', () => {
  it('derives a label from the subtype, since the input set is now open', () => {
    expect(getMediaLabel('video/mp4')).toBe('MP4 Video');
    expect(getMediaLabel('audio/flac')).toBe('FLAC Audio');
    expect(getMediaLabel('image/tiff')).toBe('TIFF Image');
  });

  it('strips the x- and vnd. prefixes archives spell formats with', () => {
    expect(getMediaLabel('audio/vnd.wav')).toBe('WAV Audio');
    expect(getMediaLabel('audio/wav')).toBe('WAV Audio');
    expect(getMediaLabel('audio/x-aiff')).toBe('AIFF Audio');
  });

  it('strips a structured-syntax suffix', () => {
    expect(getMediaLabel('application/eaf+xml')).toBe('EAF');
  });

  it('names an unknown type without a kind, rather than guessing one', () => {
    expect(getMediaLabel('application/mxf')).toBe('MXF');
  });

  it('spells out the one derived name that would mislead', () => {
    // 'MPEG Audio' reads like video, and every archive MP3 carries audio/mpeg.
    expect(getMediaLabel('audio/mpeg')).toBe('MP3 Audio');
  });

  it('falls back to the format itself when it is not a media type at all', () => {
    expect(getMediaLabel('')).toBe('');
    expect(getMediaLabel('nonsense')).toBe('nonsense');
  });
});
