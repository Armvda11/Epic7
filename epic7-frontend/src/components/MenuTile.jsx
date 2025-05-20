import React from 'react';

const MenuTile = ({ label, icon, onClick, index }) => {
  return (
    <button
      onClick={onClick}
      className="bg-transparent text-gray-900 dark:text-white border border-gray-500 rounded-xl shadow-md hover:shadow-lg 
              transition-all p-4 flex flex-col items-center gap-2 
              transform hover:scale-105 active:scale-95"
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
