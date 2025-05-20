import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SkillAnimation({ heroName, isVisible, onAnimationEnd }) {
  const [videoError, setVideoError] = useState(false);
  
  // Formatage du nom du héros pour correspondre aux noms de fichiers
  const formatHeroName = (name) => {
    if (!name) return '';
    
    // Map des noms spéciaux qui pourraient ne pas correspondre exactement aux noms de fichiers
    const nameMap = {
      // Ajoutez ici des mappages spéciaux si nécessaire
      // Ex: "ML Piera": "ml-piera"
    };
    
    return nameMap[name] || name.toLowerCase();
  };
  
  const videoSrc = `/epic7-Hero/Animation/${formatHeroName(heroName)}.mp4`;
  
  // Réinitialise l'erreur lorsque le héros change
  useEffect(() => {
    setVideoError(false);
  }, [heroName]);
  
  // Gérer l'erreur si la vidéo n'existe pas
  const handleVideoError = () => {
    console.warn(`Animation non trouvée pour ${heroName}`);
    setVideoError(true);
    // Terminer l'animation après un court délai
    setTimeout(onAnimationEnd, 500);
  };
  
  // Si la vidéo est en erreur, ne rien afficher
  if (videoError) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <video 
            src={videoSrc} 
            autoPlay 
            className="max-w-full max-h-full object-contain"
            onEnded={onAnimationEnd}
            onError={handleVideoError}
            muted={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}