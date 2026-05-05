import { createContext, useContext } from 'react';
import { useApiResource } from '../lib/useApiResource';

const SiteContext = createContext({
  navSections: [],
  topics: [],
  loading: true,
  error: null,
  refreshNavigation: async () => {},
});

export function SiteProvider({ children }) {
  const { data, loading, error, refetch } = useApiResource('/api/navigation', []);

  return (
    <SiteContext.Provider
      value={{
        navSections: data?.navSections ?? [],
        topics: data?.topics ?? [],
        loading,
        error,
        refreshNavigation: refetch,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
