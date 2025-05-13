// src/hooks/useRtaBattle.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import webSocketService from '../services/webSocketService';

/**
 * Hook pour gérer le combat en temps réel (RTA - Real Time Arena)
 */
export default function useRtaBattle() {
  // Phase du combat: 'selection', 'matchmaking', 'battle'
  const [phase, setPhase] = useState('selection');
  
  // ID de bataille une fois le match trouvé
  const [battleId, setBattleId] = useState(null);
  
  // État actuel de la bataille
  const [battleState, setBattleState] = useState(null);
  
  // Temps d'attente en file
  const [waitingTime, setWaitingTime] = useState(0);
  
  // État de connexion WebSocket
  const [isConnected, setIsConnected] = useState(false);
  
  // Timer pour le temps d'attente
  const timerRef = useRef(null);
  
  // ID du héros qui doit jouer actuellement
  const [activeHeroId, setActiveHeroId] = useState(null);
  
  // Si c'est notre tour ou non
  const [isOurTurn, setIsOurTurn] = useState(false);
  
  // Sélection courante (héro et cible pour une compétence)
  const [currentSelection, setCurrentSelection] = useState({
    heroId: null,
    skillId: null,
    targetId: null
  });
  
  // Initialiser les callbacks du WebSocket
  useEffect(() => {
    webSocketService.on('onConnect', () => {
      console.log('WebSocket connecté!');
      setIsConnected(true);
    });
    
    webSocketService.on('onDisconnect', () => {
      console.log('WebSocket déconnecté!');
      setIsConnected(false);
    });
    
    webSocketService.on('onError', (error) => {
      console.error('Erreur WebSocket:', error.message);
      toast.error(`Erreur: ${error.message}`);
    });
    
    webSocketService.on('onWaiting', () => {
      console.log('En attente d\'un adversaire...');
    });
    
    webSocketService.on('onMatchFound', (newBattleId) => {
      console.log('Match trouvé avec ID:', newBattleId);
      setPhase('battle');
      setBattleId(newBattleId);
      clearInterval(timerRef.current);
      toast.success('Match trouvé! Le combat commence...');
    });
    
    webSocketService.on('onBattleState', (state) => {
      console.log('Nouvel état de bataille:', state);
      setBattleState(state);
      
      // Déterminer qui doit jouer
      if (state && state.currentHero) {
        setActiveHeroId(state.currentHero.id);
        
        // Déterminer si c'est notre tour
        const isMyHero = state.myHeroes && state.myHeroes.some(h => h.id === state.currentHero.id);
        setIsOurTurn(isMyHero);
        
        if (isMyHero) {
          toast.info('C\'est à votre tour de jouer!');
        }
      }
    });
    
    webSocketService.on('onBattleEnd', (finalState) => {
      console.log('Combat terminé:', finalState);
      setBattleState(finalState);
      
      if (finalState.winner === 'YOU') {
        toast.success('Victoire! 🎉');
      } else {
        toast.error('Défaite! 😢');
      }
      
      // Retour à la phase de sélection après 5 secondes
      setTimeout(() => {
        resetBattle();
      }, 5000);
    });
    
    webSocketService.on('onNextTurn', (heroId) => {
      console.log('Au tour de:', heroId);
      setActiveHeroId(heroId);
    });
    
    // Tenter une connexion au démarrage
    webSocketService.connect().catch(() => {
      toast.error('Impossible de se connecter au serveur de combat');
    });
    
    // Nettoyage à la destruction du composant
    return () => {
      clearInterval(timerRef.current);
      webSocketService.disconnect();
    };
  }, []);
  
  // Rejoindre la file d'attente avec les héros sélectionnés
  const joinQueue = useCallback((heroIds) => {
    // Vérifier que nous avons bien 4 héros
    if (!heroIds || heroIds.length !== 4) {
      toast.error('Vous devez sélectionner 4 héros');
      return;
    }
    
    // Passer en phase "matchmaking"
    setPhase('matchmaking');
    setWaitingTime(0);
    
    // Démarrer le compteur de temps d'attente
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
    
    // Rejoindre le matchmaking
    webSocketService.joinMatchmaking(heroIds)
      .then(() => {
        toast.info('En file d\'attente pour un combat...');
      })
      .catch((error) => {
        toast.error(`Erreur: ${error.message}`);
        resetBattle();
      });
  }, []);
  
  // Sélectionner un héros pour utiliser une compétence
  const selectHero = useCallback((heroId) => {
    if (!isOurTurn) {
      toast.warning('Ce n\'est pas à votre tour de jouer');
      return;
    }
    
    setCurrentSelection(prev => ({
      ...prev,
      heroId
    }));
  }, [isOurTurn]);
  
  // Sélectionner une compétence
  const selectSkill = useCallback((skillId) => {
    if (!isOurTurn || !currentSelection.heroId) {
      toast.warning('Vous devez d\'abord sélectionner un héros');
      return;
    }
    
    setCurrentSelection(prev => ({
      ...prev,
      skillId
    }));
  }, [isOurTurn, currentSelection.heroId]);
  
  // Sélectionner une cible
  const selectTarget = useCallback((targetId) => {
    if (!isOurTurn || !currentSelection.heroId || !currentSelection.skillId) {
      toast.warning('Vous devez d\'abord sélectionner un héros et une compétence');
      return;
    }
    
    // Action complète: utiliser la compétence
    useSkill(currentSelection.heroId, currentSelection.skillId, targetId);
    
    // Réinitialiser la sélection
    setCurrentSelection({
      heroId: null,
      skillId: null,
      targetId: null
    });
  }, [isOurTurn, currentSelection]);
  
  // Utiliser une compétence directement
  const useSkill = useCallback((heroId, skillId, targetId) => {
    if (!isOurTurn) {
      toast.warning('Ce n\'est pas à votre tour de jouer');
      return;
    }
    
    if (!battleId) {
      console.error('Impossible d\'utiliser une compétence: pas de bataille en cours');
      return;
    }
    
    webSocketService.useSkill(battleId, skillId, targetId);
    
    // Une fois la compétence utilisée, ce n'est plus notre tour
    setIsOurTurn(false);
  }, [battleId, isOurTurn]);
  
  // Quitter/abandonner le combat
  const leave = useCallback(() => {
    if (battleId && phase === 'battle') {
      webSocketService.leaveBattle(battleId);
      toast.info('Vous avez quitté le combat');
    } else if (phase === 'matchmaking') {
      webSocketService.leaveQueue();
      toast.info('Vous avez quitté la file d\'attente');
    }
    
    resetBattle();
  }, [battleId, phase]);
  
  // Réinitialiser l'état de bataille
  const resetBattle = useCallback(() => {
    clearInterval(timerRef.current);
    setPhase('selection');
    setBattleId(null);
    setBattleState(null);
    setWaitingTime(0);
    setActiveHeroId(null);
    setIsOurTurn(false);
    setCurrentSelection({
      heroId: null, 
      skillId: null,
      targetId: null
    });
  }, []);

  return {
    phase,
    waitingTime,
    battleId,
    battleState,
    isConnected,
    isOurTurn,
    activeHeroId,
    currentSelection,
    joinQueue,
    selectHero,
    selectSkill,
    selectTarget,
    useSkill,
    leave,
    resetBattle
  };
}
