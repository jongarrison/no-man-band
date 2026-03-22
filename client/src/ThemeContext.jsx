import { createContext, useContext } from "react";

const ThemeContext = createContext("clean");

export const ThemeProvider = ThemeContext.Provider;

export function useTheme() {
  return useContext(ThemeContext);
}
