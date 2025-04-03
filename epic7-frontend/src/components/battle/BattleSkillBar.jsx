import React from 'react';
import { motion } from 'framer-motion';

export default function BattleSkillBar({ currentHero, currentHeroSkills, cooldowns, selectedSkillId, onSkillClick }) {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex justify-center gap-6 z-40 backdrop-blur-md bg-black/30 px-8 py-6 rounded-2xl border border-indigo-500/50 shadow-2xl ring-1 ring-indigo-700/30">
      {currentHeroSkills.map(skill => {
        const folder = currentHero.name.toLowerCase().replace(/ /g, '-');
        const skillImg = `/icons/${folder}_skill/${folder}_skill_${skill.position + 1}.webp`;
        const cooldownLeft = cooldowns?.[currentHero?.id]?.[skill.id] || 0;
        const isDisabled = skill.category === 'PASSIVE' || cooldownLeft > 0;

        return (
          <motion.div key={skill.id} whileHover={{ scale: 1.1 }} className="relative group">
            <button
              disabled={isDisabled}
              onClick={() => onSkillClick(skill)}
              className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition duration-300 ease-in-out 
                ${isDisabled ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-br from-purple-600 to-indigo-700 hover:brightness-110'}
                ${selectedSkillId === skill.id ? 'ring-4 ring-yellow-400 scale-110' : 'ring-2 ring-purple-500'}`}
            >
              {cooldownLeft > 0 ? (
                <span className="text-white text-xl font-bold animate-pulse">{cooldownLeft}</span>
              ) : (
                <img src={skillImg} alt={skill.name} className="w-12 h-12 object-contain" />
              )}
            </button>

            <p className="text-xs text-center text-white mt-2 font-semibold drop-shadow-md">
              {skill.name}
            </p>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col bg-gradient-to-br from-gray-800 to-black text-white rounded-lg px-4 py-3 w-64 shadow-lg z-50 text-left border border-gray-600 backdrop-blur">
              <p className="font-semibold text-sm text-blue-400">{skill.name}</p>
              <p className="text-xs italic text-gray-400 mb-1">{skill.category}</p>
              <p className="text-sm text-gray-300 leading-snug tracking-wide">{skill.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
