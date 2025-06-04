// src/pages/RtaBattlePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
import API from '../api/axiosInstance';
import useRtaBattle from '../hooks/useRtaBattle';
import { useMusic } from '../context/MusicContext';
import HeroSelectionPanel from '../components/battle/battleSelection/HeroSelectionPanel';
import RtaMatchmakingScreen from '../components/rta/RtaMatchmakingScreen';
import RtaBattleResultScreen from '../components/rta/RtaBattleResultScreen';
import RtaPreBattleScreen from '../components/rta/RtaPreBattleScreen';
import RtaBattle from '../components/rta/RtaBattle';
import { MusicController } from '../components/ui';

export default function RtaBattlePage() {
  const navigate = useNavigate();

  // Hook pour la musique de fond
  const {
    preloadMusic,
    playRtaSelectionMusic,
    playRtaBattleMusic,
    stopCurrentMusic
  } = useMusic();

  // 1) États locaux pour la sélection des héros
  const [availableHeroes, setAvailableHeroes] = useState([]);
  const [selectedHeroes, setSelectedHeroes] = useState([]);

  // 2) Récupération des héros du joueur au montage
  useEffect(() => {
    // Précharger la musique
    preloadMusic();
    
    API.get('/player-hero/my')
      .then(res => {
        setAvailableHeroes(res.data);
        // Démarrer la musique de sélection RTA
        setTimeout(() => {
          playRtaSelectionMusic();
        }, 500);
      })
      .catch(err => {
        console.error('Erreur chargement héros:', err);
        // toast.error("Impossible de charger vos héros");
      });
      
    // Nettoyage lors du démontage
    return () => {
      stopCurrentMusic();
    };
  }, [preloadMusic, playRtaSelectionMusic, stopCurrentMusic]);

  // 3) Hook RTA (matchmaking + combat)
  const {
    phase,          // 'selection', 'matchmaking', 'prebattle', 'battle'
    waitingTime,    // pour l'écran d'attente
    battleId,       // identifiant unique du combat
    battleState,    // état complet du combat
    matchData,      // données des adversaires pour l'écran de pré-combat
    isConnected,
    isOurTurn,
    activeHeroId,
    currentSelection,
    joinQueue,      // fonction pour rejoindre la file
    selectHero,
    selectSkill, 
    selectTarget,
    useSkill,       // fonction pour utiliser une compétence
    startBattle,    // fonction pour passer de prebattle à battle
    leave,          // fonction pour quitter/abandonner
    resetBattle
  } = useRtaBattle();

  // Effet pour changer la musique selon la phase
  useEffect(() => {
    switch (phase) {
      case 'selection':
      case 'matchmaking':
        // Musique de sélection/attente
        playRtaSelectionMusic();
        break;
      case 'prebattle':
      case 'battle':
        // Musique de combat
        playRtaBattleMusic();
        break;
      default:
        break;
    }
  }, [phase, playRtaSelectionMusic, playRtaBattleMusic]);

  // 4) Lancement de la recherche de match
  const handleStart = () => {
    // Récupérer uniquement les héros alliés (les 2 premiers slots)
    const allyHeroes = selectedHeroes.slice(0, 2).filter(Boolean);
    
    if (allyHeroes.length !== 2) {
    //   toast.warning("Vous devez sélectionner 2 héros pour lancer un combat RTA");
      return;
    }
    
    // Envoyer uniquement les héros alliés au serveur
    joinQueue(allyHeroes.map(h => h.id));
  };

  // 5) Abandon du combat
  const handleForfeit = () => {
    // toast.info('Vous avez abandonné le combat');
    leave();
    navigate('/dashboard');
  };

  // 6) Rendu selon la phase
  if (phase === 'selection') {
    return (
      <div className="relative">
        <HeroSelectionPanel
          availableHeroes={availableHeroes}
          selectedHeroes={selectedHeroes}
          setSelectedHeroes={setSelectedHeroes}
          onStart={handleStart}
          rtaMode={true}
        />
        <MusicController />
      </div>
    );
  }

  if (phase === 'matchmaking') {
    return (
      <div className="relative">
        <RtaMatchmakingScreen
          waitingTime={waitingTime}
          onCancel={leave}
          selectedHeroes={selectedHeroes}
        />
        <MusicController />
      </div>
    );
  }

  if (phase === 'prebattle') {
    return (
      <div className="relative">
        <RtaPreBattleScreen
          matchData={matchData}
          countdown={10}
          onCountdownEnd={startBattle}
        />
        <MusicController />
      </div>
    );
  }

  if (phase === 'battle') {
    // Vérifier que nous avons bien un état de bataille valide
    console.log("RtaPage - Phase de bataille", { battleState, battleId });
    
    if (!battleState || !battleState.participants) {
      // Plus de tentative de récupération - abandon immédiat
      return (
        <div className="h-screen w-screen bg-[url('/arena.webp')] bg-cover bg-center flex flex-col items-center justify-center text-white">
          <div className="text-2xl font-bold mb-4 text-red-400">Erreur de connexion</div>
          <div className="max-w-md bg-black/70 p-6 rounded text-center">
            <div className="mb-4">La connexion au combat a été perdue.</div>
            <div className="mb-6">Vous avez été déconnecté du combat.</div>
            <button 
              onClick={handleForfeit} 
              className="px-6 py-3 bg-red-600 hover:bg-red-700 transition-colors rounded-lg font-bold"
            >
              Retour au menu
            </button>
          </div>
        </div>
      );
    }
    
    // Si le combat est terminé, afficher l'écran de résultat
    if (battleState?.finished) {
      return (
        <div className="relative">
          <RtaBattleResultScreen
            battleState={battleState}
            onReturn={handleForfeit}
          />
          <MusicController />
        </div>
      );
    }

    return (
      <div className="relative">
        <RtaBattle
          battleState={battleState}
          battleId={battleId}
          useSkill={useSkill}
          onForfeit={handleForfeit}
        />
        <MusicController />
      </div>
    );
  }

  // cas par défaut
  return (
    <div className="relative">
      <div className="flex items-center justify-center h-screen">Chargement...</div>
      <MusicController />
    </div>
  );
}
