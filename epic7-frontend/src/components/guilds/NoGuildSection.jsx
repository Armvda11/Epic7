import React from "react";
import { FaUserPlus, FaSearch } from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";

const NoGuildSection = ({ onCreateClick, onSearchClick }) => {
  const { language, t } = useSettings();

  return (
    <section className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 shadow-xl mb-8 text-center">
      <h2 className="text-2xl font-bold mb-4">{t("noGuild", language)}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {t("noGuildDescription", language)}
      </p>
      
      {/* Buttons to join or create a guild */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <button
          onClick={onCreateClick}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <FaUserPlus /> {t("createGuild", language)}
        </button>
        <button
          onClick={onSearchClick}
          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <FaSearch /> {t("searchGuilds", language)}
        </button>
      </div>
    </section>
  );
};

export default NoGuildSection;
