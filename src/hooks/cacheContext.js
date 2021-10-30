import React, { createContext, useContext, useEffect, useState } from "react";

import { useLocalStorage } from "./useLocalStorage";

const CacheContext = createContext();

function CacheProvider({ children, initialState = {} }) {
  const [localStorage, setLocalStorage] = useLocalStorage("ddt", initialState);
  const [state, setState] = useState(localStorage);

  useEffect(() => {
    setLocalStorage(state);
    // eslint-disable-next-line
  }, [state]);

  function getValue(key) {
    return state[key];
  }

  function resetCache(stateToLoad = {}) {
    setState(() => ({ ...initialState, ...stateToLoad }));
  }

  function setValue(key, value) {
    setState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
  }

  const value = {
    getValue,
    setValue,
    resetCache,
    state,
  };

  return (
    <CacheContext.Provider value={value}>{children}</CacheContext.Provider>
  );
}

function useCache() {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error("useCache must be used within a CacheProvider");
  }
  return context;
}

export { CacheProvider, useCache };
