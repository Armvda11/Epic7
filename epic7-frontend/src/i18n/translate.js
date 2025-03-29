const translations = {
    fr: {
      inventory: "Inventaire",
      myHeroes: "Mes Héros",
      friends: "Amis",
      guilds: "Guildes",
      quests: "Quêtes",
      battle: "Combat",
      settings: "Paramètres",
      theme: "Thème",
      lightMode: "☀️ Mode Clair",
      darkMode: "🌙 Mode Sombre",
      language: "Langue",
      moreOptions: "Plus d'options viendront bientôt...",
      welcome: "Bienvenue",
      logout: "Se déconnecter",
      // éléments supplémentaires
back: "Retour",
all: "Tous",
fire: "Feu",
ice: "Glace",
earth: "Terre",
dark: "Ténèbres",
light: "Lumière",
common: "Commun",
rare: "Rare",
epic: "Épique",
legendary: "Légendaire",
locked: "🔒 Verrouillé",
unlocked: "🔓 Déverrouillé",

    },
    en: {
      inventory: "Inventory",
      myHeroes: "My Heroes",
      friends: "Friends",
      guilds: "Guilds",
      quests: "Quests",
      battle: "Battle",
      settings: "Settings",
      theme: "Theme",
      lightMode: "☀️ Light Mode",
      darkMode: "🌙 Dark Mode",
      language: "Language",
      moreOptions: "More options coming soon...",
      welcome: "Welcome",
      logout: "Logout",
      back: "Back",
all: "All",
fire: "Fire",
ice: "Ice",
earth: "Earth",
dark: "Dark",
light: "Light",
common: "Common",
rare: "Rare",
epic: "Epic",
legendary: "Legendary",
locked: "🔒 Locked",
unlocked: "🔓 Unlocked",

    },
  };
  
  // Fonction utilitaire globale
  export const t = (key, lang = "fr") => {
    return translations[lang]?.[key] || key;
  };
  