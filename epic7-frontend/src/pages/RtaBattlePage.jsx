// src/pages/RtaBattlePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
        toast.error("Impossible de charger vos héros");
      });
  }, []);

  // 3) Hook RTA (matchmaking + combat)
  const {
    phase,          // 'selection', 'matchmaking', 'battle'
    waitingTime,    // pour l'écran d'attente
    battleId,       // identifiant unique du combat
    battleState,    // état complet du combat
    joinQueue,      // fonction pour rejoindre la file
    useSkill,       // fonction pour utiliser une compétence
    leave,          // fonction pour quitter/abandonner
  } = useRtaBattle();

  // 4) Lancement de la recherche de match
  const handleStart = () => {
    if (selectedHeroes.length !== 4) {
      toast.error('Vous devez sélectionner exactement 4 héros');
      return;
    }
    joinQueue(selectedHeroes.map(h => h.id));
  };

  // 5) Abandon du combat
  const handleForfeit = () => {
    toast.info('Vous avez abandonné le combat');
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
