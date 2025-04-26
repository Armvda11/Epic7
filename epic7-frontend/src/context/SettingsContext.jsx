// src/context/SettingsContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { t as translateFunction } from "../i18n/translate"; // Import the translation function

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  // Initialize states from localStorage with fallback to system preference
  const [theme, setTheme] = useState(() => {
    // Check if there's a saved theme preference in localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }
    
    // Otherwise, use system preference as default
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "fr");

  // Apply theme to the entire application
  useEffect(() => {
    // Apply theme immediately on component mount and when theme changes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Save to localStorage
    localStorage.setItem("theme", theme);
    
    // Log for debugging
    // console.log(`Theme set to: ${theme}`);
  }, [theme]);

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    //console.log(`Toggling theme from ${theme} to ${newTheme}`);
    setTheme(newTheme);
  };
  
  const changeLanguage = (lang) => setLanguage(lang);

  // Use the imported translation function with current language
  const t = (key, lang = language) => translateFunction(key, lang);

  return (
    <SettingsContext.Provider
      value={{ 
        theme, 
        toggleTheme, 
        language, 
        changeLanguage, 
        t,
        // Add isLightMode and isDarkMode helpers for easier component logic 
        isLightMode: theme === "light",
        isDarkMode: theme === "dark"
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Hook personnalisé
export const useSettings = () => useContext(SettingsContext);
