import { EVENT_TYPE_CATEGORY_MAP, classifyEvent, extractService } from '@/types/categories';

interface TypeFilter {
  selectedService: string | null;
  selectedCategory: string | null;
}

/**
 * The backend `type` parameter is an exact match on event_type. Returns the
 * type when the service and category filters narrow the known types to exactly
 * one, and null when a type filter would be wrong or too narrow.
 */
export function backendTypeFor(filter: TypeFilter): string | null {
  const service =
    filter.selectedService && filter.selectedService !== 'all' ? filter.selectedService : null;
  const category =
    filter.selectedCategory && filter.selectedCategory !== 'all' ? filter.selectedCategory : null;
  if (!service && !category) return null;

  const matches = Object.keys(EVENT_TYPE_CATEGORY_MAP).filter(
    (type) =>
      (!service || extractService(type) === service) &&
      (!category || classifyEvent(type) === category)
  );
  return matches.length === 1 ? matches[0] : null;
}
