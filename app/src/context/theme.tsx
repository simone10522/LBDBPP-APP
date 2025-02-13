import { createContext } from "react";

export type ThemeType = 'light' | 'dark';

const ThemeContext = createContext<ThemeType>('light');

export default ThemeContext;