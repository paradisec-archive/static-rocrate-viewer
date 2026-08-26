declare module 'ro-crate' {
  interface ROCrateOptions {
    array?: boolean;
    link?: boolean;
  }

  interface Entity {
    '@id': string;
    '@type': string | string[];
    name?: string | string[];
    description?: string | string[];
    [key: string]: unknown;
  }

  class ROCrate {
    constructor(data?: unknown, options?: ROCrateOptions);
    rootDataset: Entity;
    getEntity(id: string): Entity | undefined;
    entities(): Iterable<Entity>;
    toJSON(): unknown;
  }

  export { Entity, ROCrate };
}
