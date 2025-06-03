// src/hooks/useRtaBattle.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import webSocketService from '../services/webSocketService';

/**
 * Hook pour gérer le combat en temps réel (RTA - Real Time Arena)
 */
export default function useRtaBattle() {
  // Phase du combat: 'selection', 'matchmaking', 'prebattle', 'battle'
  const [phase, setPhase] = useState('selection');
  
  // ID de bataille une fois le match trouvé
  const [battleId, setBattleId] = useState(null);
  
  // État actuel de la bataille
  const [battleState, setBattleState] = useState(null);
  
  // Données de match pour l'écran de pré-bataille
  const [matchData, setMatchData] = useState(null);
  
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
      
      // Passer en phase de pré-bataille au lieu de directement en bataille
      setPhase('prebattle');
      setBattleId(newBattleId);
      clearInterval(timerRef.current);
      
      // toast.success('Match trouvé! Préparation du combat...');
      
      // Demander immédiatement l'état initial pour récupérer les données du match
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
          return; // Ne plus demander de resynchronisation
        }
        
        // Extraire les données du match si nous avons les informations des joueurs
        if (state.player1Id && state.player2Id && state.player1Name && state.player2Name) {
          console.log('Création des données de match avec:', {
            player1Id: state.player1Id,
            player1Name: state.player1Name,
            player2Id: state.player2Id,
            player2Name: state.player2Name
          });
          
          // Créer les données de match pour l'écran de pré-bataille
          const player1Heroes = state.participants.filter(p => p.userId === state.player1Id);
          const player2Heroes = state.participants.filter(p => p.userId === state.player2Id);
          
          const newMatchData = {
            player1: {
              id: state.player1Id,
              username: state.player1Name,
              level: 99, // Sera remplacé par les vraies données si disponibles
              heroes: player1Heroes
            },
            player2: {
              id: state.player2Id,
              username: state.player2Name,
              level: 99,
              heroes: player2Heroes
            },
            // Ajouter aussi directement les noms pour compatibilité
            player1Name: state.player1Name,
            player2Name: state.player2Name
          };
          
          console.log('Nouvelles données de match créées:', newMatchData);
          setMatchData(newMatchData);
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
      
      // Déterminer le gagnant en fonction de l'état final
      if (finalState && finalState.participants) {
        const myHeroes = finalState.participants.filter(p => p.userId === finalState.currentUserId);
        const enemyHeroes = finalState.participants.filter(p => p.userId !== finalState.currentUserId);
        
        const myAliveHeroes = myHeroes.filter(h => h.currentHp > 0);
        const enemyAliveHeroes = enemyHeroes.filter(h => h.currentHp > 0);
        
        // Vérifier s'il y a un message d'abandon dans les logs
        const abandonMessage = finalState.logs.find(log => log.includes("abandonné") || log.includes("abandon"));
        const victoryMessage = finalState.logs.find(log => log.includes("🏆") && log.includes("victoire"));
        
        if (abandonMessage || victoryMessage) {
          // Cas d'abandon - déterminer le résultat basé sur les logs
          if (victoryMessage && victoryMessage.includes(finalState.player1Name) && finalState.currentUserId === finalState.player1Id) {
            // toast.success('Victoire! 🎉 Votre adversaire a abandonné!');
          } else if (victoryMessage && victoryMessage.includes(finalState.player2Name) && finalState.currentUserId === finalState.player2Id) {
            // toast.success('Victoire! 🎉 Votre adversaire a abandonné!');
          } else if (abandonMessage && abandonMessage.includes("abandonné")) {
            // toast.error('Défaite! 😢 Vous avez abandonné le combat!');
          }
        } else {
          // Cas normal - vérifier les héros vivants
          if (myAliveHeroes.length > 0 && enemyAliveHeroes.length === 0) {
            // toast.success('Victoire! 🎉 Tous les héros ennemis ont été vaincus!');
          } else if (myAliveHeroes.length === 0 && enemyAliveHeroes.length > 0) {
            // toast.error('Défaite! 😢 Tous vos héros ont été vaincus!');
          } else {
            // toast.info('Combat terminé!');
          }
        }
      }
      
      // CORRECTION: Laisser l'écran de résultat gérer la durée d'affichage
      console.log('🎯 Combat terminé, affichage des résultats');
      // Le resetBattle sera appelé par l'écran de résultat après 10 secondes
    });
    
    webSocketService.on('onNextTurn', (heroId) => {
      console.log('Au tour de:', heroId);
      setActiveHeroId(heroId);
    });
    
    // SUPPRESSION: Ne plus se connecter automatiquement au démarrage
    // Le WebSocket se connectera seulement quand on lance un combat via joinQueue
    
    // Nettoyage à la destruction du composant
    return () => {
      clearInterval(timerRef.current);
      webSocketService.disconnect();
    };
  }, []);
  
  // Mécanisme de heartbeat simple (sans resynchronisation)
  useEffect(() => {
    // Démarrer un heartbeat toutes les 30 secondes seulement pour maintenir la connexion
    const heartbeatInterval = setInterval(() => {
      if (isConnected) {
        webSocketService.sendHeartbeat();
      }
    }, 30000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isConnected, phase]);
  
  // Mise à jour du timestamp supprimée - pas de resynchronisation
  
  // Rejoindre la file d'attente avec les héros sélectionnés
  const joinQueue = useCallback((heroIds) => {
    // Vérifier que nous avons bien 2 héros
    if (!heroIds || heroIds.length !== 2) {
      // toast.error('Vous devez sélectionner 2 héros');
      return;
    }
    
    console.log('🚀 Démarrage d\'un nouveau combat - Réinitialisation du WebSocket...');
    
    // CORRECTION: Réinitialiser complètement le WebSocket pour chaque nouveau combat
    webSocketService.resetForNewBattle()
      .then(() => {
        console.log('✅ WebSocket réinitialisé, démarrage du matchmaking...');
        
        // Passer en phase "matchmaking"
        setPhase('matchmaking');
        setWaitingTime(0);
        
        // Démarrer le compteur de temps d'attente
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setWaitingTime(prev => prev + 1);
        }, 1000);
        
        // Rejoindre le matchmaking
        return webSocketService.joinMatchmaking(heroIds);
      })
      .then(() => {
        console.log('🎯 En file d\'attente pour un combat...');
        // toast.info('En file d\'attente pour un combat...');
      })
      .catch((error) => {
        console.error('❌ Erreur lors du démarrage du combat:', error);
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
  
  // Passer de la phase prebattle à battle
  const startBattle = useCallback(() => {
    setPhase('battle');
  }, []);
  
  // Quitter/abandonner le combat
  const leave = useCallback(() => {
    if (battleId && (phase === 'battle' || phase === 'prebattle')) {
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
    console.log('🔄 Réinitialisation de l\'état de bataille');
    
    clearInterval(timerRef.current);
    setPhase('selection');
    setBattleId(null);
    setBattleState(null);
    setMatchData(null);
    setWaitingTime(0);
    setActiveHeroId(null);
    setIsOurTurn(false);
    setCurrentSelection({
      heroId: null, 
      skillId: null,
      targetId: null
    });
    
    // Nettoyer les abonnements WebSocket liés au combat
    webSocketService.cleanupBattleSubscriptions();
    
    console.log('✅ État de bataille réinitialisé');
  }, []);

  return {
    phase,
    waitingTime,
    battleId,
    battleState,
    matchData,
    isConnected,
    isOurTurn,
    activeHeroId,
    currentSelection,
    joinQueue,
    selectHero,
    selectSkill,
    selectTarget,
    useSkill,
    startBattle,
    leave,
    resetBattle
  };
}
