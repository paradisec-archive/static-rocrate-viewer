/** With `array: true` a crate property is a list as often as a single value. */
export const asList = (value: unknown): unknown[] => (value == null ? [] : Array.isArray(value) ? value : [value]);

/**
 * Flatten a value off a linked RO-Crate entity to something displayable. With
 * `link: true` a property arrives as an array of entities as often as a string,
 * and a linked entity is worth showing by `name` where it has one and by `@id`
 * where it does not. Shared by the generator and the metadata panel so the two
 * never disagree about what a crate value reads as.
 */
export const resolveValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(resolveValue).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const entity = value as Record<string, unknown>;
    if (entity.name) {
      return resolveValue(entity.name);
    }

    if (entity['@id']) {
      return String(entity['@id']);
    }
  }

  return String(value);
};

/** The same, kept as separate values rather than joined into one string. */
export const resolveValueList = (value: unknown): string[] => asList(value).map(resolveValue).filter(Boolean);

/**
 * The value of a named `PropertyValue` in an entity's `identifier` list —
 * `collectionIdentifier`, `itemIdentifier`, `doi`. These are the archive's own
 * identifiers, so they take precedence over anything derived from an `@id`.
 */
export const identifierValue = (entity: Record<string, unknown>, name: string): string | undefined => {
  for (const property of asList(entity.identifier)) {
    if (typeof property !== 'object' || property === null) {
      continue;
    }
    const candidate = property as Record<string, unknown>;
    if (asList(candidate.name).includes(name)) {
      const value = resolveValue(candidate.value);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
};
