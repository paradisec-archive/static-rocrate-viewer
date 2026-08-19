export interface EafAnnotation {
  id: string;
  startMs: number;
  endMs: number;
  value: string;
}

export interface EafTier {
  tierId: string;
  participant?: string;
  annotator?: string;
  linguisticTypeRef?: string;
  parentRef?: string;
  langRef?: string;
  annotations: EafAnnotation[];
}

export interface EafLanguage {
  langId: string;
  langDef?: string;
  langLabel?: string;
}

export interface EafDocument {
  author?: string;
  date?: string;
  version?: string;
  format?: string;
  languages: EafLanguage[];
  tiers: EafTier[];
}
