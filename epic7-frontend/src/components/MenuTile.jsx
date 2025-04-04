// src/components/MenuTile.jsx
import React from 'react';

const MenuTile = ({ label, icon, onClick, index }) => {
  return (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-[#2f2b50] hover:bg-purple-50 dark:hover:bg-[#3a3660] 
                text-gray-900 dark:text-white rounded-xl shadow-md hover:shadow-lg 
                transition-all p-6 flex flex-col items-center gap-3 
                transform hover:scale-105 active:scale-95`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="text-purple-600 dark:text-purple-400">
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default MenuTile;
