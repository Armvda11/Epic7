import React, { useState, useEffect } from 'react';

/**
 * Composant pour afficher les animations de compétences au centre de l'écran
 */
export default function SkillAnimation({ heroCode, skillPosition, onAnimationEnd, isVisible }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('entering'); // entering, playing, exiting
  const [videoProgress, setVideoProgress] = useState(0);

  // Construire le chemin de l'animation basé sur le nom du héros
  const getAnimationPath = (heroCode) => {
    if (!heroCode) return null;
    
    // Convertir le nom héros en nom de fichier d'animation
    // Remplacer les espaces par des tirets et mettre en minuscules
    // Exemple: si heroCode = "Seaside Bellona", chercher "seaside-bellona.mp4"
    const animationFile = `${heroCode.toLowerCase().replace(/\s+/g, '-')}.mp4`;
    return `/epic7-Hero/Animation/${animationFile}`;
  };

  // Gestionnaire pour la fin de la vidéo
  const handleVideoEnd = () => {
    console.log(`🎬 Animation terminée pour: ${heroCode}`);
    setAnimationPhase('exiting');
    
    // Petite animation de sortie puis on termine
    setTimeout(() => {
      setShowAnimation(false);
      setAnimationPhase('entering');
      setVideoProgress(0);
      onAnimationEnd();
    }, 500);
  };

  // Gestionnaire pour la progression de la vidéo
  const handleVideoProgress = (e) => {
    const video = e.target;
    if (video.duration) {
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
    }
  };

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
      setAnimationPhase('entering');
      
      // Phase d'entrée (fade in + zoom)
      const enterTimer = setTimeout(() => {
        setAnimationPhase('playing');
      }, 300);

      return () => {
        clearTimeout(enterTimer);
      };
    } else {
      // Reset quand pas visible
      setShowAnimation(false);
      setAnimationPhase('entering');
      setVideoProgress(0);
    }
  }, [isVisible]);

  if (!isVisible || !showAnimation) return null;

  const animationPath = getAnimationPath(heroCode);
  
  if (!animationPath) {
    // Fallback si pas d'animation trouvée - afficher une animation de remplacement
    console.warn(`❌ Animation non trouvée pour: ${heroCode}`);
    return (
      <div className={getAnimationClasses()}>
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Animation de remplacement */}
        <div className="relative z-10 w-[600px] h-[400px] rounded-lg overflow-hidden shadow-2xl border-4 border-yellow-400 bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">⚔️</div>
            <div className="text-2xl font-bold mb-2">{heroCode}</div>
            <div className="text-lg">Compétence {skillPosition + 1}</div>
          </div>
          
          {/* Effets de particules */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Indicateur de progression */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 ease-out"
              style={{
                width: animationPhase === 'entering' ? '0%' : 
                       animationPhase === 'playing' ? '100%' : '100%'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const getAnimationClasses = () => {
    const baseClasses = "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300";
    
    switch (animationPhase) {
      case 'entering':
        return `${baseClasses} opacity-0 scale-75`;
      case 'playing':
        return `${baseClasses} opacity-100 scale-100`;
      case 'exiting':
        return `${baseClasses} opacity-0 scale-125`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className={getAnimationClasses()}>
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Conteneur de l'animation */}
      <div className="relative z-10 w-[600px] h-[400px] rounded-lg overflow-hidden shadow-2xl border-4 border-yellow-400">
        {/* Effet de brillance */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-blue-600/20 pointer-events-none" />
        
        {/* Vidéo d'animation */}
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop={false}
          onLoadStart={() => console.log(`🎬 Chargement animation: ${heroCode}`)}
          onCanPlay={() => console.log(`✅ Animation prête: ${heroCode}`)}
          onEnded={handleVideoEnd}
          onTimeUpdate={handleVideoProgress}
          onError={(e) => {
            console.error(`❌ Erreur chargement animation: ${heroCode}`, e);
            console.log(`🔄 Tentative de chargement: ${animationPath}`);
            // Fallback - terminer l'animation si erreur de chargement
            setTimeout(() => {
              handleVideoEnd();
            }, 1000);
          }}
        >
          <source src={animationPath} type="video/mp4" />
        </video>
        
        {/* Texte de compétence */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-black/70 px-6 py-2 rounded-full">
            <span className="text-yellow-400 font-bold text-lg">
              Compétence {skillPosition}
            </span>
          </div>
        </div>
        
        {/* Effets de particules */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Indicateur de progression */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-100 ease-out"
            style={{
              width: animationPhase === 'entering' ? '0%' : 
                     animationPhase === 'playing' ? `${videoProgress}%` : '100%'
            }}
          />
        </div>
        <div className="text-center mt-2 text-white text-sm">
          {Math.round(videoProgress)}%
        </div>
      </div>
    </div>
  );
}
