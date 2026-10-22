import { createContext, useContext } from 'react';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

let pendingDate = null;
export const setPendingDate = (key) => {
  pendingDate = key;
};
export const takePendingDate = () => {
  const d = pendingDate;
  pendingDate = null;
  return d;
};
