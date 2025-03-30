import React from "react";
// import { motion } from "framer-motion";

const icons = {
  WEAPON: "⚔️",
  ARMOR: "🛡️",
  NECKLACE: "📿",
  BOOTS: "🥾",
};
const EquipmentSlot = ({ type, equipment, onClick }) => {
  
  
    return (
      <div
        onClick={onClick}
        className={`cursor-pointer rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center ${
          equipment ? "bg-blue-700" : "bg-gray-700"
        }`}
      >
        <div className="text-xl mb-1">
          {/* Icône selon le type */}
          {type === "WEAPON" ? "⚔️" :
           type === "ARMOR" ? "🛡️" :
           type === "BOOTS" ? "🥾" :
           type === "NECKLACE" ? "📿" : "❓"}
        </div>
        <p className="text-xs font-semibold text-center">
          {equipment ? equipment.name : type}
        </p>
      </div>
    );
  };
  

export default EquipmentSlot;

