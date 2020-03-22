import React, { createContext, useContext, useState } from "react";

import useLocalStorage from "./useLocalStorage";

const CacheContext = createContext();

function CacheProvider({ children, initialState = {} }) {
  const [localStorage, setLocalStorage] = useLocalStorage("ddt", initialState);
  const [state, setState] = useState(localStorage);

  const getValue = key => {
    return state[key];
  };

  const resetCache = (stateToLoad = {}) => {
    setState({ ...initialState, ...stateToLoad });
  };

  const setValue = (key, value) => {
    const newState = {
      ...state,
      [key]: value
    };

    setState(newState);
    setLocalStorage(newState);
  };

  const value = {
    getValue,
    setValue,
    resetCache,
    state
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
