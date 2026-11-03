import { DEFAULT_CATEGORIES, DEFAULT_SERVICES } from '@/types/categories';

/** The filters that live in the URL so a view survives reloads and can be shared. */
export interface UrlFilters {
  service: string | null;
  category: string | null;
  repo: string;
  search: string;
}

export const EMPTY_URL_FILTERS: UrlFilters = {
  service: null,
  category: null,
  repo: '',
  search: '',
};

export const URL_FILTER_KEYS = ['service', 'category', 'repo', 'q'] as const;
const MAX_TEXT = 200;

interface ParamReader {
  get(_name: string): string | null;
}

function cleanText(value: string | null): string {
  return (value ?? '').trim().slice(0, MAX_TEXT);
}

function oneOf(value: string | null, allowed: string[]): string | null {
  const v = (value ?? '').trim().toLowerCase();
  return allowed.includes(v) ? v : null;
}

/** Reads filters from URL params. Unknown services and categories are dropped. */
export function parseFilters(params: ParamReader): UrlFilters {
  return {
    service: oneOf(
      params.get('service'),
      DEFAULT_SERVICES.map((s) => s.id)
    ),
    category: oneOf(
      params.get('category'),
      DEFAULT_CATEGORIES.map((c) => c.id)
    ),
    repo: cleanText(params.get('repo')),
    search: cleanText(params.get('q')),
  };
}

/**
 * Writes filters onto a copy of `base`, keeping unrelated params. Empty
 * filters are removed so the default view has a clean URL.
 */
export function serializeFilters(filters: UrlFilters, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base?.toString());
  for (const key of URL_FILTER_KEYS) params.delete(key);
  if (filters.service) params.set('service', filters.service);
  if (filters.category) params.set('category', filters.category);
  if (filters.repo.trim()) params.set('repo', filters.repo.trim().slice(0, MAX_TEXT));
  if (filters.search.trim()) params.set('q', filters.search.trim().slice(0, MAX_TEXT));
  return params;
}

export function filtersEqual(a: UrlFilters, b: UrlFilters): boolean {
  return (
    a.service === b.service &&
    a.category === b.category &&
    a.repo === b.repo &&
    a.search === b.search
  );
}
