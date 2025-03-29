// src/context/SettingsContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

// Traductions simples
const translations = {
  fr: {
    welcome: "Bienvenue",
    logout: "Se déconnecter",
    level: "Niveau",
    loadingProfile: "Chargement du profil",
    inventory: "Inventaire",
    myHeroes: "Mes Héros",
    friends: "Amis",
    guilds: "Guildes",
    quests: "Quêtes",
    battle: "Combat",
    back: "Retour",
  attack: "Attaque",
  defense: "Défense",
  speed: "Vitesse",
  health: "PV",
  heroLoadError: "Impossible de charger les héros.",
  locked: "Verrouillé",
  unlocked: "Déverrouillé",
  
  },
  en: {
    welcome: "Welcome",
    logout: "Logout",
    level: "Level",
    loadingProfile: "Loading profile",
    inventory: "Inventory",
    myHeroes: "My Heroes",
    friends: "Friends",
    guilds: "Guilds",
    quests: "Quests",
    battle: "Battle",
    back: "Back",
    attack: "Attack",
    defense: "Defense",
    speed: "Speed",
    health: "HP",
    heroLoadError: "Failed to load heroes.",

  locked: "Locked",
  unlocked: "Unlocked",
  },
};

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

  // Traduction avec fallback
  const t = (key, lang = language) => translations[lang]?.[key] || key;

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
