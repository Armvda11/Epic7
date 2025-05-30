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
      // toast.error(`Erreur: ${error.message}`);
    });
    
    webSocketService.on('onWaiting', () => {
      console.log('En attente d\'un adversaire...');
    });
    
    webSocketService.on('onMatchFound', (newBattleId) => {
      console.log('Match trouvé avec ID:', newBattleId);
      setPhase('battle');
      setBattleId(newBattleId);
      clearInterval(timerRef.current);
      // toast.success('Match trouvé! Le combat commence...');
      
      // Demander immédiatement l'état initial de la bataille
      // Cette requête permet de s'assurer que les deux joueurs ont un état initial
      setTimeout(() => {
        webSocketService.requestBattleState(newBattleId);
      }, 500);
    });
    
    webSocketService.on('onBattleState', (state) => {
      console.log('Nouvel état de bataille:', state);
      
      if (state) {
        // Vérifier que l'état est complet
        if (!state.participants || state.participants.length === 0) {
          console.error("État de bataille incomplet reçu, participants manquants:", state);
          
          // Ne pas mettre à jour l'état et demander une mise à jour
          if (battleId) {
            setTimeout(() => {
              webSocketService.requestBattleState(battleId);
            }, 800);
          }
          return;
        }
        
        // Vérification et correction de l'indice de tour
        if (state.currentTurnIndex < 0 || state.currentTurnIndex >= state.participants.length) {
          console.error("Index de tour invalide:", state.currentTurnIndex);
          
          // Trouver un participant vivant pour corriger l'index
          let validIndex = -1;
          for (let i = 0; i < state.participants.length; i++) {
            if (state.participants[i].currentHp > 0) {
              validIndex = i;
              break;
            }
          }
          
          if (validIndex >= 0) {
            console.log("Correction de l'index de tour à:", validIndex);
            state.currentTurnIndex = validIndex;
          } else {
            console.error("Impossible de trouver un participant vivant");
          }
        }
        
        // Vérifier si le participant actuel est vivant
        const currentParticipant = state.participants[state.currentTurnIndex];
        if (currentParticipant && currentParticipant.currentHp <= 0) {
          console.error("Le participant actuel est mort, recherche d'un participant vivant");
          
          // Trouver le prochain participant vivant
          let validIndex = -1;
          for (let i = 0; i < state.participants.length; i++) {
            if (state.participants[i].currentHp > 0) {
              validIndex = i;
              break;
            }
          }
          
          if (validIndex >= 0) {
            console.log("Correction de l'index de tour à:", validIndex);
            state.currentTurnIndex = validIndex;
          }
        }
        
        // Vérifier si currentUserId est défini
        if (state.currentUserId) {
          console.log(`État personnalisé pour l'utilisateur ${state.currentUserId}`);
          
          // Pour le débogage - afficher les héros du joueur vs ennemis
          const myHeroes = state.participants.filter(p => p.userId === state.currentUserId);
          const enemyHeroes = state.participants.filter(p => p.userId !== state.currentUserId);
          
          console.log(`Mes héros (${myHeroes.length}):`, myHeroes.map(h => h.name).join(', '));
          console.log(`Héros ennemis (${enemyHeroes.length}):`, enemyHeroes.map(h => h.name).join(', '));
          
          // Vérification critique: s'assurer que chaque héros a un identifiant userId
          const heroesWithoutUserId = state.participants.filter(p => p.userId === undefined);
          if (heroesWithoutUserId.length > 0) {
            console.error("Attention: certains héros n'ont pas d'userId défini!", heroesWithoutUserId);
            
            // Tenter de corriger le problème en ajoutant une propriété userId
            state.participants = state.participants.map(p => {
              if (p.userId === undefined) {
                // Déterminer si c'est un héros allié (du joueur) ou ennemi
                // Ici on suppose que les héros sans userId sont des ennemis
                const isAlly = p.player === true;
                return {
                  ...p,
                  userId: isAlly ? state.currentUserId : 'enemy'
                };
              }
              return p;
            });
          }
        } else {
          console.error("Erreur: currentUserId n'est pas défini dans l'état de bataille!");
          
          // Si currentUserId est manquant, ajouter un fallback
          state = {
            ...state,
            currentUserId: 'player1' // Valeur par défaut, sera remplacée par la vraie valeur plus tard
          };
        }
        
        // Repérer et nettoyer les participants null ou invalides
        if (state.participants.some(p => p === null || p === undefined)) {
          console.warn("Participants invalides détectés, nettoyage...");
          state.participants = state.participants.filter(p => p !== null && p !== undefined);
        }
        
        // Debug complet de l'état reçu
        console.log("État de bataille complet:", JSON.stringify(state, null, 2));
        
        // Enregistrer le nouvel état de bataille
        setBattleState(state);
        
        // Déterminer qui doit jouer
        if (state.currentTurnIndex >= 0 && state.currentTurnIndex < state.participants.length) {
          const currentHero = state.participants[state.currentTurnIndex];
          if (currentHero) {
            setActiveHeroId(currentHero.id);
            
            // Déterminer si c'est notre tour (en utilisant userId)
            const isMyHero = currentHero.userId === state.currentUserId;
            setIsOurTurn(isMyHero);
            
            console.log(`Tour actuel: ${currentHero.name} (${isMyHero ? 'MON TOUR' : 'TOUR ADVERSAIRE'})`);
            
            if (isMyHero) {
              // toast.info('C\'est à votre tour de jouer!');
            } else {
              // toast.info(`Tour de l'adversaire (${currentHero.name})...`);
            }
          } else {
            console.error("currentHero est null bien que l'index soit valide");
          }
        } else {
          console.error("Impossible de déterminer le héros actuel, index invalide:", state.currentTurnIndex);
        }
      }
    });
    
    webSocketService.on('onBattleEnd', (finalState) => {
      console.log('Combat terminé:', finalState);
      setBattleState(finalState);
      
      if (finalState.winner === 'YOU') {
        // toast.success('Victoire! 🎉');
      } else {
        // toast.error('Défaite! 😢');
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
  
  // Mécanisme de détection de tour bloqué et heartbeat
  useEffect(() => {
    // Démarrer un heartbeat toutes les 25 secondes
    const heartbeatInterval = setInterval(() => {
      if (isConnected) {
        webSocketService.sendHeartbeat();
      }
    }, 25000);
    
    // Vérifier si le tour est bloqué
    const checkStuckTurn = setInterval(() => {
      // Ne vérifier que pendant les phases de combat
      if (phase !== 'battle' || !battleId || !battleState) return;
      
      // Récupérer les timestamps des derniers changements d'état
      const lastStateUpdate = parseInt(sessionStorage.getItem(`battle_${battleId}_lastUpdate`) || '0');
      const now = Date.now();
      
      // Si pas de mise à jour depuis plus de 20 secondes
      if (lastStateUpdate > 0 && (now - lastStateUpdate) > 20000) {
        console.warn("Aucune mise à jour d'état détectée depuis plus de 20 secondes, demande de rafraîchissement");
        
        // Demander un rafraîchissement de l'état
        webSocketService.requestBattleState(battleId);
        
        // Mettre à jour le timestamp pour éviter les demandes trop fréquentes
        sessionStorage.setItem(`battle_${battleId}_lastUpdate`, now.toString());
      }
    }, 10000); // Vérifier toutes les 10 secondes
    
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(checkStuckTurn);
    };
  }, [isConnected, phase, battleId, battleState]);
  
  // Mise à jour du timestamp à chaque changement d'état
  useEffect(() => {
    if (battleState && battleId) {
      sessionStorage.setItem(`battle_${battleId}_lastUpdate`, Date.now().toString());
    }
  }, [battleState, battleId]);
  
  // Rejoindre la file d'attente avec les héros sélectionnés
  const joinQueue = useCallback((heroIds) => {
    // Vérifier que nous avons bien 2 héros
    if (!heroIds || heroIds.length !== 2) {
      // toast.error('Vous devez sélectionner 2 héros');
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
        // toast.info('En file d\'attente pour un combat...');
      })
      .catch((error) => {
        // toast.error(`Erreur: ${error.message}`);
        resetBattle();
      });
  }, []);
  
  // Sélectionner un héros pour utiliser une compétence
  const selectHero = useCallback((heroId) => {
    if (!isOurTurn) {
      // toast.warning('Ce n\'est pas à votre tour de jouer');
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
      // toast.warning('Vous devez d\'abord sélectionner un héros');
      return;
    }
    
    setCurrentSelection(prev => ({
      ...prev,
      skillId
    }));
  }, [isOurTurn, currentSelection.heroId]);
  
  // Utiliser une compétence directement
  const useSkill = useCallback((heroId, skillId, targetId) => {
    if (!isOurTurn) {
      // toast.warning('Ce n\'est pas à votre tour de jouer');
      return;
    }
    
    if (!battleId) {
      console.error('Impossible d\'utiliser une compétence: pas de bataille en cours');
      return;
    }
    
    // Validation stricte des paramètres avec plus de détails
    if (skillId === undefined || skillId === null) {
      console.error('useSkill: ID de compétence manquant');
      // toast.error('Erreur: Compétence non spécifiée');
      return;
    }
    
    if (targetId === undefined || targetId === null) {
      console.error('useSkill: ID de cible manquant');
      // toast.error('Erreur: Cible non spécifiée');
      return;
    }
    
    // Convertir en nombres entiers pour s'assurer de la compatibilité
    const numSkillId = parseInt(Number(skillId), 10);
    const numTargetId = parseInt(Number(targetId), 10);
    
    if (isNaN(numSkillId)) {
      console.error(`useSkill: ID de compétence invalide: ${skillId}`);
      // toast.error('Erreur: ID de compétence invalide');
      return;
    }
    
    if (isNaN(numTargetId)) {
      console.error(`useSkill: ID de cible invalide: ${targetId}`);
      // toast.error('Erreur: ID de cible invalide');
      return;
    }
    
    console.log("useRtaBattle - Utilisation compétence:", { 
      battleId, 
      heroId,
      skillId: numSkillId, 
      targetId: numTargetId,
      types: {
        skillIdType: typeof numSkillId,
        targetIdType: typeof numTargetId
      }
    });
    
    // Envoi de l'action avec les valeurs numériques
    try {
      // S'assurer que les IDs sont bien des nombres entiers
      webSocketService.useSkill(battleId, numSkillId, numTargetId);
      
      // Une fois la compétence utilisée, ce n'est plus notre tour
      setIsOurTurn(false);
      
      // Feedback visuel pour le joueur
      toast.success(`Compétence utilisée sur la cible`);
    } catch (error) {
      console.error('Erreur lors de l\'utilisation de la compétence:', error);
      // toast.error(`Erreur: ${error.message || 'Erreur inconnue lors de l\'utilisation de la compétence'}`);
    }
  }, [battleId, isOurTurn]);
  
  // Sélectionner une cible
  const selectTarget = useCallback((targetId) => {
    if (!isOurTurn || !currentSelection.heroId || !currentSelection.skillId) {
      // toast.warning('Vous devez d\'abord sélectionner un héros et une compétence');
      return;
    }
    
    // Journaliser les informations complètes avant d'appeler useSkill
    console.log("selectTarget - Sélection complète:", {
      heroId: currentSelection.heroId,
      skillId: currentSelection.skillId,
      targetId: targetId
    });
    
    // Action complète: utiliser la compétence (s'assurer que l'appel est correct)
    useSkill(currentSelection.heroId, currentSelection.skillId, targetId);
    
    // Réinitialiser la sélection
    setCurrentSelection({
      heroId: null,
      skillId: null,
      targetId: null
    });
  }, [isOurTurn, currentSelection, useSkill]);
  
  // Quitter/abandonner le combat
  const leave = useCallback(() => {
    if (battleId && phase === 'battle') {
      webSocketService.leaveBattle(battleId);
      // toast.info('Vous avez quitté le combat');
    } else if (phase === 'matchmaking') {
      webSocketService.leaveQueue();
      // toast.info('Vous avez quitté la file d\'attente');
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
    
    // S'assurer que la connexion WebSocket est active
    if (!isConnected) {
      // toast.info("Reconnexion au serveur...");
      webSocketService.connect().catch(error => {
        // toast.error(`Impossible de se reconnecter: ${error.message}`);
      });
    }
  }, [isConnected]);

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
