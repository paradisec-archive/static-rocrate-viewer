import type { Entity } from 'ro-crate';
import { identifierValue, resolveValue } from '../lib/roCrateValue';

const DISPLAY_FIELDS: [string, string][] = [
  ['name', 'Title'],
  ['description', 'Description'],
  ['dateCreated', 'Date Created'],
  ['dateModified', 'Date Modified'],
  ['originatedOn', 'Originated On'],
  ['startDate', 'Date'],
  ['inLanguage', 'Languages'],
  ['ldac:subjectLanguage', 'Subject Languages'],
  ['countries', 'Countries'],
  ['contentLocation', 'Location'],
  ['publisher', 'Publisher'],
  ['author', 'Author'],
  ['accountablePerson', 'Accountable Person'],
  ['recorder', 'Recorder'],
  ['speaker', 'Speakers'],
  ['license', 'Licence'],
  ['languageAsGiven', 'Language (as given)'],
  ['languageGenre', 'Genre'],
];

export const MetadataPanel = ({ entity }: { entity: Entity }) => {
  const doi = identifierValue(entity, 'doi');

  return (
    <div className="rounded-lg border border-primary-200 bg-white">
      <dl className="divide-y divide-primary-100">
        {doi && (
          <div className="px-5 py-3 sm:flex sm:gap-4">
            <dt className="text-sm font-medium text-primary-500 sm:w-40 sm:shrink-0">DOI</dt>
            <dd className="mt-1 text-sm text-primary-900 sm:mt-0">
              <a href={`https://doi.org/${doi}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline hover:text-primary-800">
                {doi}
              </a>
            </dd>
          </div>
        )}
        {DISPLAY_FIELDS.map(([field, label]) => {
          const raw = entity[field];
          const value = resolveValue(raw);
          if (!value) {
            return null;
          }
          return (
            <div key={field} className="px-5 py-3 sm:flex sm:gap-4">
              <dt className="text-sm font-medium text-primary-500 sm:w-40 sm:shrink-0">{label}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-primary-900 sm:mt-0">{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
};
