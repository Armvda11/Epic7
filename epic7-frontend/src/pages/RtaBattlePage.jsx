// src/pages/RtaBattlePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
import API from '../api/axiosInstance';
import useRtaBattle from '../hooks/useRtaBattle';
import HeroSelectionPanel from '../components/battle/battleSelection/HeroSelectionPanel';
import RtaMatchmakingScreen from '../components/rta/RtaMatchmakingScreen';
import RtaBattle from '../components/rta/RtaBattle';

export default function RtaBattlePage() {
  const navigate = useNavigate();

  // 1) États locaux pour la sélection des héros
  const [availableHeroes, setAvailableHeroes] = useState([]);
  const [selectedHeroes, setSelectedHeroes] = useState([]);

  // 2) Récupération des héros du joueur au montage
  useEffect(() => {
    API.get('/player-hero/my')
      .then(res => setAvailableHeroes(res.data))
      .catch(err => {
        console.error('Erreur chargement héros:', err);
        // toast.error("Impossible de charger vos héros");
      });
  }, []);

  // 3) Hook RTA (matchmaking + combat)
  const {
    phase,          // 'selection', 'matchmaking', 'battle'
    waitingTime,    // pour l'écran d'attente
    battleId,       // identifiant unique du combat
    battleState,    // état complet du combat
    isConnected,
    isOurTurn,
    activeHeroId,
    currentSelection,
    joinQueue,      // fonction pour rejoindre la file
    selectHero,
    selectSkill, 
    selectTarget,
    useSkill,       // fonction pour utiliser une compétence
    leave,          // fonction pour quitter/abandonner
    resetBattle
  } = useRtaBattle();

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
      <HeroSelectionPanel
        availableHeroes={availableHeroes}
        selectedHeroes={selectedHeroes}
        setSelectedHeroes={setSelectedHeroes}
        onStart={handleStart}
        rtaMode={true}
      />
    );
  }

  if (phase === 'matchmaking') {
    return (
      <RtaMatchmakingScreen
        waitingTime={waitingTime}
        onCancel={leave}
        selectedHeroes={selectedHeroes}
      />
    );
  }

  if (phase === 'battle') {
    // Vérifier que nous avons bien un état de bataille valide
    console.log("RtaPage - Phase de bataille", { battleState, battleId });
    
    if (!battleState || !battleState.participants) {
      console.error("État de bataille invalide reçu dans la phase de bataille", battleState);
      
      // Tentative de récupération des données
      const handleRetryBattleState = () => {
        if (battleId) {
        //   toast.info("Tentative de récupération des données de combat...");
          
          // Référence au service WebSocket
          const webSocketService = require('../services/webSocketService').default;
          
          // Vérifier la connexion WebSocket
          if (!webSocketService.connected) {
            // toast.warning("Reconnexion au serveur en cours...");
            webSocketService.connect()
              .then(() => {
                console.log("WebSocket reconnecté, demande de l'état de bataille...");
                return webSocketService.requestBattleState(battleId, 5); // Plus de tentatives
              })
              .catch(error => {
                console.error("Erreur lors de la reconnexion:", error);
                // toast.error("Erreur de connexion. Veuillez rafraîchir la page.");
              });
          } else {
            // Demander l'état de bataille avec plusieurs tentatives
            webSocketService.requestBattleState(battleId, 5)
              .catch(err => {
                console.error("Échec de récupération après plusieurs tentatives:", err);
                // toast.error("Impossible de récupérer les données du combat.");
              });
          }
        } else {
          handleForfeit();
        }
      };
      
      // Message temporaire pour afficher le problème avec option de retry
      return (
        <div className="h-screen w-screen bg-[url('/arena.webp')] bg-cover bg-center flex flex-col items-center justify-center text-white">
          <div className="text-2xl font-bold mb-4">Chargement du combat en cours...</div>
          <div className="max-w-md bg-black/70 p-4 rounded">
            <div className="mb-4">Récupération des données de combat en cours...</div>
            <div className="flex justify-center mb-6">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={handleRetryBattleState} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg"
              >
                Réessayer
              </button>
              <button 
                onClick={handleForfeit} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 transition-colors rounded-lg"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <RtaBattle
        battleState={battleState}
        battleId={battleId}
        useSkill={useSkill}
        onForfeit={handleForfeit}
      />
    );
  }

  // cas par défaut
  return <div className="flex items-center justify-center h-screen">Chargement...</div>;
}
