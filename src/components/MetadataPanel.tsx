import type { Entity } from "ro-crate";

function resolveValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(resolveValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const obj = value as Entity;
    if (obj.name) return resolveValue(obj.name);
    if (obj["@id"]) return String(obj["@id"]);
  }
  return String(value);
}

const DISPLAY_FIELDS: [string, string][] = [
  ["name", "Title"],
  ["description", "Description"],
  ["dateCreated", "Date Created"],
  ["dateModified", "Date Modified"],
  ["originatedOn", "Originated On"],
  ["inLanguage", "Languages"],
  ["subjectLanguages", "Subject Languages"],
  ["countries", "Countries"],
  ["contentLocation", "Location"],
  ["publisher", "Publisher"],
  ["recorder", "Recorder"],
  ["speaker", "Speakers"],
  ["license", "Licence"],
  ["languageAsGiven", "Language (as given)"],
  ["languageGenre", "Genre"],
];

export function MetadataPanel({ rootDataset }: { rootDataset: Entity }) {
  // Find DOI from identifiers
  const identifiers = rootDataset.identifier as unknown[];
  let doi: string | undefined;
  if (Array.isArray(identifiers)) {
    for (const id of identifiers) {
      const entity = id as Entity;
      if (
        entity?.name === "doi" ||
        (Array.isArray(entity?.name) && entity.name.includes("doi"))
      ) {
        doi = resolveValue(entity.value);
      }
    }
  }

  return (
    <div className="rounded-lg border border-primary-200 bg-white">
      <dl className="divide-y divide-primary-100">
        {doi && (
          <div className="px-5 py-3 sm:flex sm:gap-4">
            <dt className="text-sm font-medium text-primary-500 sm:w-40 sm:shrink-0">
              DOI
            </dt>
            <dd className="mt-1 text-sm text-primary-900 sm:mt-0">
              <a
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 underline hover:text-primary-800"
              >
                {doi}
              </a>
            </dd>
          </div>
        )}
        {DISPLAY_FIELDS.map(([field, label]) => {
          const raw = rootDataset[field];
          const value = resolveValue(raw);
          if (!value) return null;
          return (
            <div key={field} className="px-5 py-3 sm:flex sm:gap-4">
              <dt className="text-sm font-medium text-primary-500 sm:w-40 sm:shrink-0">
                {label}
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-primary-900 sm:mt-0">
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
