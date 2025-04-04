import React from 'react';

export default function BattleForfeitButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm tracking-wide uppercase rounded-full shadow-lg transition-all duration-300 ease-in-out z-50"
    >
      Abandonner
    </button>
  );
}