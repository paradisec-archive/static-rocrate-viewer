import { ROCrate } from 'ro-crate';
import type { Catalog } from './types';

declare global {
  interface Window {
    __ROCRATE_VIEWER_CATALOG__?: Catalog;
    __ROCRATE_VIEWER_DATA__?: Record<string, unknown>;
  }
}

export const getCatalog = (): Catalog => {
  const data = window.__ROCRATE_VIEWER_CATALOG__;
  if (!data)
    throw new Error('Catalog not loaded. Run generate-catalog.js first.');
  return data;
};

export const getRoCrate = (collectionId: string, itemId?: string): ROCrate => {
  const allData = window.__ROCRATE_VIEWER_DATA__;
  if (!allData) throw new Error('RO-Crate data not loaded.');
  const key = itemId ? `${collectionId}/${itemId}` : collectionId;
  const json = allData[key];
  if (!json) throw new Error(`No RO-Crate data for ${key}`);
  return new ROCrate(json, { array: true, link: true });
};
