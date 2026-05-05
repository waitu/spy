import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from './api';

export function useApiResource(url, dependencies = [], initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchJson(url);
      setData(payload);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load, ...dependencies]);

  return { data, setData, loading, error, refetch: load };
}
