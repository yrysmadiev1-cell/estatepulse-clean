import { useMemo, useState, useCallback } from "react";

// Small helper hook to keep search state and derived helpers in one place
export function useSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const matches = useCallback(
    (text = "") => {
      if (!normalizedQuery) return true;
      return text.toLowerCase().includes(normalizedQuery);
    },
    [normalizedQuery]
  );

  const filterByTitle = useCallback(
    (posts = []) => posts.filter((post) => matches(post?.title || "")),
    [matches]
  );

  const handleChange = useCallback((event) => setQuery(event.target.value), []);

  return { query, setQuery, normalizedQuery, filterByTitle, handleChange };
}

export default useSearch;
