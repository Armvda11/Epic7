// src/components/equipment/EquipmentDetailsPanel.jsx
import React from "react";

const EquipmentDetailsPanel = ({ equipment, currentHeroId, onEquip, onUnequip }) => {
  if (!equipment) return null;

  return (
    <div className="text-white">
      <h3 className="text-xl font-bold text-center mb-2">{equipment.name}</h3>
      <p className="text-sm text-center mb-2">{equipment.rarity} • Niveau {equipment.level} • XP {equipment.experience}</p>

      <div className="space-y-1 text-sm bg-gray-800 p-3 rounded-md mb-3">
        <p>⚔️ Attaque : {equipment.attackBonus}</p>
        <p>🛡️ Défense : {equipment.defenseBonus}</p>
        <p>💨 Vitesse : {equipment.speedBonus}</p>
        <p>❤️ PV : {equipment.healthBonus}</p>
      </div>

      {equipment.equipped ? (
  <button onClick={() => onUnequip(equipment.id)} className="btn btn-danger">Déséquiper</button>
) : (
  <button onClick={() => onEquip(equipment.id)} className="btn btn-success">Équiper</button>
)}


    </div>
  );
};

export default EquipmentDetailsPanel;
