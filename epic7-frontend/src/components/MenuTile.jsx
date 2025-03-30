// src/components/MenuTile.jsx
import { motion } from "framer-motion";
import React from "react";


// Ce composant représente une tuile de menu avec une icône et un label.
// Il utilise Framer Motion pour les animations.
// Il prend en props une icône, un label, une fonction onClick et un index pour l'animation.
// Il est utilisé dans le composant Menu pour afficher les différentes options de menu.
const MenuTile = ({ icon, label, onClick, index }) => {
  return (
    <motion.article
      onClick={onClick}
      className={`bg-[#332c56] hover:bg-[#4a3f78] p-6 rounded-xl shadow-lg flex flex-col items-center justify-center cursor-pointer ${
        onClick ? "hover:ring-2 ring-blue-400" : ""
      }`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <span className="text-4xl mb-2">{icon}</span>
      <span className="text-lg font-semibold">{label}</span>
    </motion.article>
  );
};

export default MenuTile;
