import { afterEach, describe, expect, it } from 'vitest';
import { getTranscripts } from './dataLoader.ts';

const setWindow = (value: unknown) => {
  globalThis.window = value as Window & typeof globalThis;
};

afterEach(() => {
  setWindow(undefined);
});

describe('getTranscripts', () => {
  it('is empty rather than throwing when transcripts.js never loaded', () => {
    // An older generator emits no such file, and a missing script under file://
    // fails silently — so this is the ordinary case for existing data dirs.
    setWindow({});
    expect(getTranscripts()).toEqual({});
  });

  it('returns the index the generator wrote', () => {
    const index = { 'fixtures/NT1/001/NT1-001-001B.mp3': [] };
    setWindow({ __ROCRATE_VIEWER_TRANSCRIPTS__: index });
    expect(getTranscripts()).toBe(index);
  });
});
