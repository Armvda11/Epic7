import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import HeroSelectionPanel from '../components/battle/battleSelection/HeroSelectionPanel';
import RtaMatchmakingScreen from '../components/rta/RtaMatchmakingScreen';
import RtaBattle from '../components/rta/RtaBattle';
import { toast } from 'react-toastify';

export default function RtaBattlePage() {
  // États généraux
  const [phase, setPhase] = useState('selection'); // 'selection', 'matchmaking', 'battle'
  const [availableHeroes, setAvailableHeroes] = useState([]);
  const [selectedHeroes, setSelectedHeroes] = useState([null, null, null, null]);
  const [battleId, setBattleId] = useState(null);
  const [battleState, setBattleState] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [waitingTime, setWaitingTime] = useState(0);
  
  // Référence vers la connexion WebSocket
  const stompClient = useRef(null);
  const navigate = useNavigate();

  // Récupération des héros disponibles au chargement
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const res = await API.get('/player-hero/my');
        setAvailableHeroes(res.data);
      } catch (error) {
        console.error("Erreur lors du chargement des héros :", error);
        toast.error("Impossible de charger vos héros");
      }
    };
    
    fetchHeroes();
  }, []);

  // Initialisation de la connexion WebSocket
  const initWebSocket = () => {
    // Déconnexion d'une ancienne connexion si elle existe
    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.disconnect();
    }

    const socket = new SockJS('/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    client.onConnect = () => {
      console.log('WebSocket connecté!');
      
      // S'abonner à la file d'attente de matchmaking personnelle
      client.subscribe('/user/queue/rta/match', message => {
        const response = message.body;
        console.log('Match response:', response);
        
        if (response === 'waiting') {
          setPhase('matchmaking');
        } else {
          // Un match a été trouvé, battleId reçu
          setBattleId(response);
          setPhase('battle');
          
          // S'abonner aux topics du combat
          subscribeToRtaBattle(client, response);
        }
      });
    };

    client.onStompError = frame => {
      console.error('Erreur STOMP:', frame);
      toast.error('Erreur de connexion au serveur');
    };

    client.activate();
    stompClient.current = client;
  };
  
  // S'abonner aux topics du combat
  const subscribeToRtaBattle = (client, battleId) => {
    // Topic d'état du combat
    client.subscribe(`/topic/rta/state/${battleId}`, message => {
      const state = JSON.parse(message.body);
      setBattleState(state);
    });
    
    // Topic de notification de tour
    client.subscribe(`/topic/rta/turn/${battleId}`, message => {
      const nextHeroName = message.body;
      toast.info(`C'est au tour de ${nextHeroName}`);
    });
    
    // Topic de fin de combat
    client.subscribe(`/topic/rta/end/${battleId}`, message => {
      const finalState = JSON.parse(message.body);
      setBattleState(finalState);
      
      // Afficher le résultat final
      const isVictory = finalState.logs.some(log => log.includes("Victoire"));
      if (isVictory) {
        toast.success('Victoire!');
      } else {
        toast.error('Défaite!');
      }
      
      // Redirection après 5 secondes
      setTimeout(() => navigate('/dashboard'), 5000);
    });
  };
  
  // Rejoindre le matchmaking avec les héros sélectionnés
  const startSearchingMatch = () => {
    // Vérifier que 4 héros sont sélectionnés
    const heroIds = selectedHeroes.filter(Boolean).map(h => h.id);
    if (heroIds.length !== 4) {
      toast.error("Vous devez sélectionner 4 héros");
      return;
    }
    
    // Initialiser WebSocket
    initWebSocket();
    
    // Timer pour le temps d'attente
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
    
    // Envoyer la demande de matchmaking
    setTimeout(() => {
      if (stompClient.current && stompClient.current.connected) {
        stompClient.current.publish({
          destination: '/app/rta/join',
          body: JSON.stringify({ heroIds })
        });
      } else {
        toast.error("Problème de connexion au serveur");
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  };
  
  // Annuler la recherche de match
  const cancelSearch = () => {
    if (stompClient.current) {
      stompClient.current.disconnect();
    }
    setPhase('selection');
    setWaitingTime(0);
  };
  
  // Utiliser une compétence
  const useSkill = (skillId, targetId) => {
    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.publish({
        destination: '/app/rta/action',
        body: JSON.stringify({
          battleId,
          skillId,
          targetId
        })
      });
    }
  };
  
  // Abandonner le combat
  const forfeitBattle = () => {
    toast.info("Abandon du combat...");
    if (stompClient.current) {
      stompClient.current.disconnect();
    }
    navigate('/dashboard');
  };

  // Rendu conditionnel selon la phase
  if (phase === 'selection') {
    return (
      <HeroSelectionPanel 
        availableHeroes={availableHeroes} 
        selectedHeroes={selectedHeroes} 
        setSelectedHeroes={setSelectedHeroes} 
        onStart={startSearchingMatch} 
        rtaMode={true}
      />
    );
  }
  
  if (phase === 'matchmaking') {
    return (
      <RtaMatchmakingScreen 
        waitingTime={waitingTime} 
        onCancel={cancelSearch} 
        selectedHeroes={selectedHeroes.filter(Boolean)}
      />
    );
  }
  
  if (phase === 'battle') {
    return (
      <RtaBattle 
        battleState={battleState}
        battleId={battleId}
        useSkill={useSkill}
        onForfeit={forfeitBattle}
      />
    );
  }
  
  return <div>Chargement...</div>;
}