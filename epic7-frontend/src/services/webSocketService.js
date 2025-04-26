// Créez un utilitaire WebSocket dans votre projet frontend
// filepath: /Users/hermas/Desktop/Projets/Epic7/epic7-frontend/src/services/websocketService.js

class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
  }

  connect(userId) {
    const url = `ws://${window.location.host}/ws/battle`;
    // ou en développement: const url = `ws://localhost:8080/ws/battle`;
    
    this.socket = new WebSocket(url);
    
    this.socket.onopen = () => {
      console.log('WebSocket connecté!');
      this.callbacks.onOpen?.();
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message WebSocket reçu:', data);
        
        // Dispatcher selon le type
        if (this.callbacks[data.type]) {
          this.callbacks[data.type](data);
        }
        
        // Toujours appeler le gestionnaire générique s'il existe
        this.callbacks.onMessage?.(data);
      } catch (e) {
        console.error('Erreur de parsing WebSocket:', e);
      }
    };
    
    this.socket.onclose = (event) => {
      console.log('WebSocket déconnecté:', event.code, event.reason);
      this.callbacks.onClose?.(event);
    };
    
    this.socket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
      this.callbacks.onError?.(error);
    };
  }
  
  joinBattle(userId, battleId) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket non connecté');
      return;
    }
    
    this.send({
      type: 'JOIN',
      userId,
      battleId
    });
  }
  
  useSkill(userId, battleId, skillId, targetId) {
    this.send({
      type: 'USE_SKILL',
      userId,
      battleId,
      skillId,
      targetId
    });
  }
  
  leaveBattle(userId, battleId) {
    this.send({
      type: 'LEAVE',
      userId,
      battleId
    });
  }
  
  send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket non connecté');
      return;
    }
    
    this.socket.send(JSON.stringify(data));
  }
  
  on(event, callback) {
    this.callbacks[event] = callback;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default new WebSocketService();