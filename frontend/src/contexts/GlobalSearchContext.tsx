import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type GlobalSearchContextType = {
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextType>({
  globalSearch: '',
  setGlobalSearch: () => {}
});

export const GlobalSearchProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();

  // Clear search on route change
  useEffect(() => {
    setGlobalSearch('');
  }, [location.pathname]);

  return (
    <GlobalSearchContext.Provider value={{ globalSearch, setGlobalSearch }}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearch = () => useContext(GlobalSearchContext);
