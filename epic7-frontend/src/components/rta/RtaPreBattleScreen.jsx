// src/components/rta/RtaPreBattleScreen.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { heroImg, heroImgUnknown } from '../heroUtils';

export default function RtaPreBattleScreen({ matchData, countdown, onCountdownEnd }) {
  const [timeLeft, setTimeLeft] = useState(countdown || 10);

  useEffect(() => {
    if (timeLeft <= 0) {
      onCountdownEnd();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onCountdownEnd]);

  const formatTime = (seconds) => {
    return seconds.toString().padStart(2, '0');
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Background effects */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-blue-500/20"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Title */}
      <motion.div
        className="text-center mb-12 z-10"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600">
          COMBAT RTA
        </h1>
        <p className="text-xl text-gray-200">Préparez-vous au combat!</p>
      </motion.div>

      {/* VS Section */}
      <div className="flex items-center justify-center w-full max-w-6xl z-10">
        {/* Player 1 */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-blue-400 mb-2">
              {matchData?.player1?.username || matchData?.player1Name || "Joueur 1"}
            </h2>
            <p className="text-lg text-gray-300">Niveau {matchData?.player1?.level || "??"}</p>
          </div>
          
          <div className="flex flex-col gap-4">
            {matchData?.player1?.heroes?.map((hero, index) => (
              <motion.div
                key={index}
                className="relative group"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.2 }}
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden border-3 border-blue-500 shadow-xl bg-gradient-to-br from-blue-900 to-blue-700">
                  <img
                    src={heroImg(hero.name)}
                    alt={hero.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = heroImgUnknown;
                    }}
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-blue-200 whitespace-nowrap">
                  {hero.name}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* VS Center */}
        <motion.div
          className="mx-16 text-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.div
            className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-4"
            animate={{
              textShadow: [
                "0 0 20px rgba(255,255,0,0.5)",
                "0 0 40px rgba(255,0,0,0.8)",
                "0 0 20px rgba(255,255,0,0.5)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            VS
          </motion.div>
          
          {/* Countdown */}
          <motion.div
            className="text-4xl font-bold text-white"
            animate={{
              scale: timeLeft <= 3 ? [1, 1.2, 1] : 1,
              color: timeLeft <= 3 ? ["#ffffff", "#ff0000", "#ffffff"] : "#ffffff",
            }}
            transition={{
              duration: 0.5,
              repeat: timeLeft <= 3 ? Infinity : 0,
            }}
          >
            {formatTime(timeLeft)}
          </motion.div>
        </motion.div>

        {/* Player 2 */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-red-400 mb-2">
              {matchData?.player2?.username || matchData?.player2Name || "Joueur 2"}
            </h2>
            <p className="text-lg text-gray-300">Niveau {matchData?.player2?.level || "??"}</p>
          </div>
          
          <div className="flex flex-col gap-4">
            {matchData?.player2?.heroes?.map((hero, index) => (
              <motion.div
                key={index}
                className="relative group"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.2 }}
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden border-3 border-red-500 shadow-xl bg-gradient-to-br from-red-900 to-red-700">
                  <img
                    src={heroImg(hero.name)}
                    alt={hero.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = heroImgUnknown;
                    }}
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium text-red-200 whitespace-nowrap">
                  {hero.name}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom text */}
      <motion.div
        className="absolute bottom-12 text-center z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <p className="text-xl text-gray-300 mb-2">Le combat commence dans</p>
        <p className="text-lg text-gray-400">
          {timeLeft <= 3 ? "Préparez-vous!" : "Bonne chance aux deux adversaires!"}
        </p>
      </motion.div>

      {/* Particle effects */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}
