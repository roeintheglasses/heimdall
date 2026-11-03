'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCategories } from '@/contexts/CategoryContext';
import { filtersEqual, parseFilters, serializeFilters, type UrlFilters } from '@/lib/filterUrl';

/**
 * Keeps service, category, repo and search in the URL. On load the URL is
 * applied to the filter state. After that, filter changes are written back with
 * router.replace so the back button still leaves the page and scroll stays put.
 * Renders nothing. It reads useSearchParams, so mount it inside <Suspense>.
 */
export default function FilterUrlSync() {
  const { filter, setFilter } = useCategories();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const applied = useRef(false);
  const [ready, setReady] = useState(false);

  // Restore from the URL once.
  useEffect(() => {
    if (applied.current) return;
    const fromUrl = parseFilters(searchParams);
    setFilter({
      selectedService: fromUrl.service,
      selectedCategory: fromUrl.category,
      repositoryFilter: fromUrl.repo,
      searchQuery: fromUrl.search,
    });
    applied.current = true;
    setReady(true);
    // Only the first render's URL matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write filter changes back.
  useEffect(() => {
    // Wait for the render that carries the restored filters, or the URL would be wiped.
    if (!ready) return;
    const current: UrlFilters = {
      service: filter.selectedService,
      category: filter.selectedCategory,
      repo: filter.repositoryFilter.trim(),
      search: filter.searchQuery.trim(),
    };
    if (filtersEqual(current, parseFilters(searchParams))) return;
    const next = serializeFilters(current, new URLSearchParams(searchParams.toString())).toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [ready, filter, pathname, router, searchParams]);

  return null;
}
