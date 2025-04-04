// src/components/SettingsPanel.jsx
import { useSettings } from '../../context/SettingsContext.jsx';

// Ce composant affiche le panneau de paramètres de l'application.
// Il permet à l'utilisateur de changer le thème et la langue de l'application.
// Il utilise le contexte SettingsContext pour accéder aux paramètres actuels et aux fonctions de mise à jour.
const SettingsPanel = () => {
  const { theme, toggleTheme, language, changeLanguage } = useSettings();

  return (
    <section className="p-4 bg-white dark:bg-[#2e2e45] rounded-lg shadow text-black dark:text-white max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">⚙️ Paramètres</h2>

      {/* Thème */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Thème</label>
        <button
          onClick={toggleTheme}
          className="mt-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
        >
          {theme === "dark" ? "🌙 Mode Sombre" : "☀️ Mode Clair"}
        </button>
      </div>

      {/* Langue */}
      <div className="mb-4">
        <label htmlFor="language" className="block text-sm font-medium">Langue</label>
        <select
          id="language"
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="mt-1 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Futurs paramètres */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Plus d'options viendront bientôt...
      </p>
    </section>
  );
};

export default SettingsPanel;
