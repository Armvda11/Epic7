// src/hooks/useRtaBattle.js
import { useState, useEffect, useRef, useCallback } from 'react';

export default function useRtaBattle() {
  const [phase, setPhase] = useState('selection');   // 'selection' | 'matchmaking' | 'battle'
  const [battleId, setBattleId] = useState(null);
  const [battleState, setBattleState] = useState(null);
  const [waitingTime, setWaitingTime] = useState(0);

  const wsRef    = useRef(null);
  const timerRef = useRef(null);

  // Utility to grab userId (adapté à ton auth)
  const getUserId = () => localStorage.getItem('userId');

  // ouvre la WS et démarre le matchmaking
  const joinQueue = useCallback((heroIds) => {
    // réinitialisation
    if (wsRef.current) {
      wsRef.current.close();
      clearInterval(timerRef.current);
    }

    // phase "matchmaking"
    setPhase('matchmaking');
    setWaitingTime(0);

    // démarre le compteur
    timerRef.current = setInterval(() => {
      setWaitingTime(t => t + 1);
    }, 1000);

    // nouvelle connexion WS vers /ws (proxy Vite → back 8080)
    const sock = new WebSocket(
      (window.location.protocol === 'https:' ? 'wss://' : 'ws://')
      + window.location.host
      + '/ws/battle'
    );

    sock.onopen = () => {
      // on envoie le JOIN vers ton handler raw
      sock.send(JSON.stringify({
        type:     'JOIN',
        userId:   getUserId(),
        heroIds,
      }));
    };

    sock.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); }
      catch (e) { console.error('Cannot parse WS message', evt.data); return; }

      switch (msg.type) {
        case 'JOIN_CONFIRMED':
          // le back confirme la mise en file ; on reste en matchmaking
          break;

        case 'MATCH_READY':
          // le back nous envoie l’ID de combat
          setBattleId(msg.battleId);
          clearInterval(timerRef.current);
          setPhase('battle');
          break;

        case 'BATTLE_UPDATE':
          // nouvelle state de combat
          setBattleState(msg.state);
          break;

        case 'BATTLE_END':
          // fin de combat
          setBattleState(msg.state);
          clearInterval(timerRef.current);
          break;

        case 'ERROR':
          console.error('WS error payload:', msg.message);
          break;

        default:
          console.warn('WS message inconnu:', msg);
      }
    };

    sock.onclose = () => {
      console.log('WebSocket fermé');
      // si on était en matchmaking, retour à selection
      if (phase === 'matchmaking') {
        clearInterval(timerRef.current);
        setPhase('selection');
      }
    };

    sock.onerror = (err) => {
      console.error('WebSocket erreur', err);
    };

    wsRef.current = sock;
  }, [phase]);

  // envoi d’une action de compétence
  const useSkill = useCallback((skillId, targetId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type:     'USE_SKILL',
      userId:   getUserId(),
      battleId,
      skillId,
      targetId,
    }));
  }, [battleId]);

  // quitter file / abandon de combat
  const leave = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type:     'LEAVE',
        userId:   getUserId(),
        battleId,
      }));
      wsRef.current.close();
    }
    clearInterval(timerRef.current);
    setPhase('selection');
    setBattleId(null);
    setBattleState(null);
    setWaitingTime(0);
  }, [battleId]);

  // cleanup au démontage
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(timerRef.current);
    };
  }, []);

  return {
    phase,
    waitingTime,
    battleId,
    battleState,
    joinQueue,
    useSkill,
    leave,
  };
}
