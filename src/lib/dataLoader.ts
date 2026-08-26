import { ROCrate } from 'ro-crate';
import type { TranscriptIndex } from './eaf';
import type { Catalog } from './types';

declare global {
  interface Window {
    __ROCRATE_VIEWER_CATALOG__?: Catalog;
    __ROCRATE_VIEWER_DATA__?: Record<string, unknown>;
    __ROCRATE_VIEWER_TRANSCRIPTS__?: TranscriptIndex;
  }
}

export const getCatalog = (): Catalog => {
  const data = window.__ROCRATE_VIEWER_CATALOG__;
  if (!data) {
    throw new Error('Catalog not loaded. Run generate-catalog.js first.');
  }
  return data;
};

// One crate can describe a whole collection, so several items may share a key.
export const getRoCrate = (crateKey: string): ROCrate => {
  const allData = window.__ROCRATE_VIEWER_DATA__;
  if (!allData) {
    throw new Error('RO-Crate data not loaded.');
  }
  const json = allData[crateKey];
  if (!json) {
    throw new Error(`No RO-Crate data for ${crateKey}`);
  }
  return new ROCrate(json, { array: true, link: true });
};

// Absent whenever an older generator produced the data directory, and a missing
// script under file:// fails silently — so no transcripts is normal, not an error.
export const getTranscripts = (): TranscriptIndex => window.__ROCRATE_VIEWER_TRANSCRIPTS__ ?? {};
