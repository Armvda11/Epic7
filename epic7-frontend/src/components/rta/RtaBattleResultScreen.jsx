// src/components/rta/RtaBattleResultScreen.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function RtaBattleResultScreen({ battleState, onReturn }) {
  const [result, setResult] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!battleState) return;

    // Déterminer le résultat
    const myHeroes = battleState.participants.filter(p => p.userId === battleState.currentUserId);
    const enemyHeroes = battleState.participants.filter(p => p.userId !== battleState.currentUserId);
    
    const myAliveHeroes = myHeroes.filter(h => h.currentHp > 0);
    const enemyAliveHeroes = enemyHeroes.filter(h => h.currentHp > 0);
    
    // Vérifier s'il y a un message d'abandon dans les logs
    const abandonMessage = battleState.logs.find(log => log.includes("abandonné") || log.includes("abandon"));
    const victoryMessage = battleState.logs.find(log => log.includes("🏆") && log.includes("victoire"));
    
    if (abandonMessage || victoryMessage) {
      // Cas d'abandon - déterminer le résultat basé sur les logs et userId
      if (victoryMessage) {
        const isMyVictory = 
          (victoryMessage.includes(battleState.player1Name) && battleState.currentUserId === battleState.player1Id) ||
          (victoryMessage.includes(battleState.player2Name) && battleState.currentUserId === battleState.player2Id);
        
        setResult(isMyVictory ? 'VICTOIRE' : 'DÉFAITE');
      } else {
        // Backup - vérifier qui a abandonné
        setResult(abandonMessage.includes("abandonné") ? 'DÉFAITE' : 'VICTOIRE');
      }
    } else {
      // Cas normal - vérifier les héros vivants
      if (myAliveHeroes.length > 0 && enemyAliveHeroes.length === 0) {
        setResult('VICTOIRE');
      } else if (myAliveHeroes.length === 0 && enemyAliveHeroes.length > 0) {
        setResult('DÉFAITE');
      } else {
        setResult('ÉGALITÉ');
      }
    }
  }, [battleState]);

  useEffect(() => {
    if (countdown <= 0) {
      onReturn();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onReturn]);

  const getResultColor = () => {
    switch (result) {
      case 'VICTOIRE':
        return 'from-green-500 to-yellow-500';
      case 'DÉFAITE':
        return 'from-red-500 to-red-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  const getResultEmoji = () => {
    switch (result) {
      case 'VICTOIRE':
        return '🏆';
      case 'DÉFAITE':
        return '💀';
      default:
        return '⚔️';
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Background effects */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20"
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

      {/* Résultat principal */}
      <motion.div
        className="text-center mb-8 z-10"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="text-8xl mb-4"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {getResultEmoji()}
        </motion.div>
        
        <motion.h1
          className={`text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r ${getResultColor()}`}
          animate={{
            textShadow: [
              "0 0 20px rgba(255,255,255,0.5)",
              "0 0 40px rgba(255,255,255,0.8)",
              "0 0 20px rgba(255,255,255,0.5)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {result}
        </motion.h1>
      </motion.div>

      {/* Logs de bataille */}
      {battleState?.logs && (
        <motion.div
          className="max-w-2xl bg-black/60 p-6 rounded-lg backdrop-blur-sm mb-8 z-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <h3 className="text-xl font-bold mb-4 text-center">Résumé du combat</h3>
          <div className="max-h-40 overflow-y-auto text-sm text-gray-200">
            {battleState.logs.slice(-8).map((log, i) => (
              <div key={i} className="mb-2 p-2 bg-gray-800/50 rounded">
                {log}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Countdown */}
      <motion.div
        className="text-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <p className="text-lg text-gray-300 mb-2">
          Retour au menu dans...
        </p>
        <motion.div
          className="text-3xl font-bold text-white"
          animate={{
            scale: countdown <= 3 ? [1, 1.2, 1] : 1,
            color: countdown <= 3 ? ["#ffffff", "#ff0000", "#ffffff"] : "#ffffff",
          }}
          transition={{
            duration: 0.5,
            repeat: countdown <= 3 ? Infinity : 0,
          }}
        >
          {countdown}
        </motion.div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReturn}
          className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg font-bold"
        >
          Retourner maintenant
        </motion.button>
      </motion.div>
    </div>
  );
}
