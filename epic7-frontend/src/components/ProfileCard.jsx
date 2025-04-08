// src/components/ProfileCard.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { heroImg, heroImgUnknown } from "./heroUtils";

// Ce composant représente une carte de profil utilisateur.
const ProfileCard = ({ user, onClose }) => {
  const { t, language } = useSettings();
  
  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.section
          initial={{ y: 80, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 80, scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 200 }}
          className="relative w-full max-w-md p-6 bg-white dark:bg-[#2a2442] rounded-xl shadow-2xl text-gray-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gray-600 dark:hover:text-white"
            aria-label="Close profile card"
          >
            ✕
          </button>

          {/* Avatar + Infos */}
          <div className="flex flex-col items-center text-center">
            <img
              src={ heroImg("mavuika")}
              alt="avatar"
              className="w-24 h-24 rounded-full mb-4 object-cover shadow-lg bg-gray-300 dark:bg-gray-600"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = heroImgUnknown;
              }}
            />

            <h2 className="text-2xl font-bold">{user.username}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t("level", language)} {user.level}</p>

            <div className="grid grid-cols-3 gap-4 w-full text-sm">
              <div className="bg-gray-100 dark:bg-[#403a6b] p-3 rounded-lg">💰 {user.gold}</div>
              <div className="bg-gray-100 dark:bg-[#403a6b] p-3 rounded-lg">💎 {user.diamonds}</div>
              <div className="bg-gray-100 dark:bg-[#403a6b] p-3 rounded-lg">⚡ {user.energy}</div>
            </div>
          </div>
        </motion.section>
      </motion.aside>
    </AnimatePresence>
  );
};

export default ProfileCard;
