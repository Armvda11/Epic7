// src/context/SettingsContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { t as translateFunction } from "../i18n/translate"; // Import the translation function

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("fr");

  // Dark mode toggle (ajoute/remove la class "dark" sur <html>)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const changeLanguage = (lang) => setLanguage(lang);

  // Use the imported translation function with current language
  const t = (key, lang = language) => translateFunction(key, lang);

  return (
    <SettingsContext.Provider
      value={{ theme, toggleTheme, language, changeLanguage, t }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Hook personnalisé
export const useSettings = () => useContext(SettingsContext);
