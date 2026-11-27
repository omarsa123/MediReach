import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';

export function useAddressSuggestions(query, { enabled = true, delay = 600 } = {}) {
  const [result, setResult] = useState({ query: '', items: [] });
  const trimmedQuery = String(query || '').trim();
  const canSearch = enabled && trimmedQuery.length >= 2;
  const debouncedQuery = useDebounce(trimmedQuery, delay);

  useEffect(() => {
    if (!canSearch || debouncedQuery.length < 2) {
      return undefined;
    }

    const controller = new AbortController();

    async function fetchSuggestions() {
      try {
        const searchQuery = encodeURIComponent(`${debouncedQuery} مصر`);
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${searchQuery}&limit=5`,
          { signal: controller.signal }
        );
        const data = await response.json();

        const items = data?.features?.length
          ? data.features.map((feature, index) => {
              const props = feature.properties || {};
              const addressParts = [
                props.name,
                props.district,
                props.city || props.town,
                props.state,
              ].filter(Boolean);
              const uniqueParts = [...new Set(addressParts)];
              return {
                place_id: props.osm_id || `${debouncedQuery}-${index}`,
                display_name: `${uniqueParts.join('، ')}، مصر`,
              };
            })
          : [];

        if (!controller.signal.aborted) {
          setResult({ query: debouncedQuery, items });
        }
      } catch (err) {
        if (err?.name !== 'AbortError' && !controller.signal.aborted) {
          setResult({ query: debouncedQuery, items: [] });
        }
      }
    }

    fetchSuggestions();
    return () => controller.abort();
  }, [canSearch, debouncedQuery]);

  return {
    suggestions: canSearch && result.query === debouncedQuery ? result.items : [],
    isSearching: canSearch && result.query !== trimmedQuery,
  };
}
