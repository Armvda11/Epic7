// Service WebSocket pour le combat en temps réel
import axios from '../api/axiosInstance';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.stompClient = null;
    this.callbacks = {};
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 secondes
    this.subscriptions = {};
  }

  /**
   * Connecte au serveur WebSocket avec authentification
   * @returns {Promise} - Promise résolue quand connecté, rejetée en cas d'erreur
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.stompClient) {
        console.log('WebSocket déjà connecté');
        resolve();
        return;
      }

      // Récupérer le token JWT depuis le localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        const error = new Error('Pas de token JWT trouvé, connexion WebSocket impossible');
        console.error(error);
        reject(error);
        return;
      }

      // IMPORTANT: SockJS nécessite une URL HTTP/HTTPS, pas une URL WebSocket (ws/wss)
      // On utilise directement l'URL HTTP/HTTPS de l'API
      let sockJsUrl = axios.defaults.baseURL || 'http://localhost:8080';
      
      // Pour corriger l'erreur précédente, on s'assure que l'URL est HTTP/HTTPS
      // et on enlève le préfixe /api qui crée des problèmes
      sockJsUrl = sockJsUrl.replace(/^ws/, 'http').replace(/^wss/, 'https');
      if (sockJsUrl.includes('/api')) {
        sockJsUrl = sockJsUrl.replace('/api', '');
      }
      
      // Puis on ajoute le point d'entrée WebSocket
      sockJsUrl = sockJsUrl + '/ws';
      
      console.log(`Connexion WebSocket via SockJS à: ${sockJsUrl}`);

      try {
        // Créer une connexion SockJS - SockJS fait la conversion HTTP -> WS en interne
        const socket = new SockJS(sockJsUrl);
        this.socket = socket;
        
        // Initialiser le client STOMP
        const stompClient = Stomp.over(socket);
        this.stompClient = stompClient;

        // Configurer le client STOMP
        stompClient.debug = process.env.NODE_ENV === 'production' ? () => {} : console.log;
        
        // En-têtes avec le token JWT
        const headers = {
          'Authorization': `Bearer ${token}`
        };
        
        // Connexion avec callbacks
        stompClient.connect(
          headers,
          // Callback de succès
          () => {
            console.log('WebSocket connecté avec succès!');
            this.connected = true;
            this.reconnectAttempts = 0;
            
            // S'abonner au canal d'erreurs personnelles
            this._subscribeToErrorChannel();
            
            // Invoquer le callback onConnect s'il existe
            if (typeof this.callbacks.onConnect === 'function') {
              this.callbacks.onConnect();
            }
            
            resolve();
          },
          // Callback d'erreur
          (error) => {
            console.error('Erreur de connexion WebSocket:', error);
            this.connected = false;
            
            // Tenter une reconnexion automatique
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              console.log(`Tentative de reconnexion ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}...`);
              setTimeout(() => {
                this.reconnectAttempts++;
                this.connect().then(resolve).catch(reject);
              }, this.reconnectDelay);
            } else {
              console.error('Nombre maximum de tentatives de reconnexion atteint');
              // Invoquer le callback onError s'il existe
              if (typeof this.callbacks.onError === 'function') {
                this.callbacks.onError(error);
              }
              reject(error);
            }
          }
        );
        
        // Gérer la déconnexion
        stompClient.onDisconnect = () => {
          console.log('WebSocket déconnecté');
          this.connected = false;
          
          // Invoquer le callback onDisconnect s'il existe
          if (typeof this.callbacks.onDisconnect === 'function') {
            this.callbacks.onDisconnect();
          }
          
          // Tenter une reconnexion automatique si la déconnexion n'était pas volontaire
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this._isDisconnecting) {
            console.log(`Tentative de reconnexion après déconnexion ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}...`);
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect().catch(console.error);
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * S'abonne au canal d'erreurs personnelles
   */
  _subscribeToErrorChannel() {
    if (!this.connected || !this.stompClient) return;
    
    // Obtenir l'email de l'utilisateur pour les messages ciblés
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    
    // S'abonner au canal d'erreurs personnelles
    const subscription = this.stompClient.subscribe(
      `/user/queue/rta/error`,
      (message) => {
        console.error('Erreur reçue du serveur:', message.body);
        if (typeof this.callbacks.onError === 'function') {
          this.callbacks.onError(new Error(message.body));
        }
      }
    );
    
    this.subscriptions.errorChannel = subscription;
  }

  /**
   * Rejoindre le matchmaking avec une équipe de héros
   * @param {Array} heroIds - Tableau des IDs de héros (2)
   * @returns {Promise} - Promise résolue quand souscrit, rejetée en cas d'erreur
   */
  joinMatchmaking(heroIds) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.stompClient) {
        this.connect()
          .then(() => this._doJoinMatchmaking(heroIds, resolve, reject))
          .catch(reject);
      } else {
        this._doJoinMatchmaking(heroIds, resolve, reject);
      }
    });
  }

  /**
   * Implémentation interne pour rejoindre le matchmaking
   */
  _doJoinMatchmaking(heroIds, resolve, reject) {
    // Vérifier que nous avons exactement 2 héros
    if (!heroIds || !Array.isArray(heroIds) || heroIds.length !== 2) {
      const error = new Error('Vous devez sélectionner exactement 2 héros');
      reject(error);
      return;
    }

    try {
      // Obtenir l'email de l'utilisateur pour les messages ciblés
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        reject(new Error('Utilisateur non connecté'));
        return;
      }

      // S'abonner d'abord au canal de matchmaking pour recevoir les mises à jour
      const matchmakingSub = this.stompClient.subscribe(
        `/user/queue/rta/match`,
        (message) => {
          const content = message.body;
          console.log('Message de matchmaking reçu:', content);
          
          // Si "waiting", toujours en attente
          if (content === "waiting") {
            if (typeof this.callbacks.onWaiting === 'function') {
              this.callbacks.onWaiting();
            }
            return;
          }
          
          // Sinon, un match a été trouvé (content = battleId)
          const battleId = content;
          console.log('Match trouvé! ID:', battleId);
          
          // Nettoyer l'abonnement de matchmaking
          matchmakingSub.unsubscribe();
          delete this.subscriptions.matchmaking;
          
          // S'abonner aux canaux de combat
          this._subscribeToBattleChannels(battleId);
          
          // Invoquer le callback onMatchFound s'il existe
          if (typeof this.callbacks.onMatchFound === 'function') {
            this.callbacks.onMatchFound(battleId);
          }
        }
      );
      
      this.subscriptions.matchmaking = matchmakingSub;
      
      // Envoyer la demande de matchmaking
      console.log('Envoi de la demande de matchmaking avec héros:', heroIds);
      this.stompClient.send(
        '/app/rta/join',
        {},
        JSON.stringify({ heroIds })
      );
      
      // Résoudre immédiatement puisque nous sommes maintenant en attente
      resolve();
    } catch (error) {
      console.error('Erreur lors de la demande de matchmaking:', error);
      reject(error);
    }
  }

  /**
   * S'abonne aux canaux de combat pour un battleId donné
   */
  _subscribeToBattleChannels(battleId) {
    if (!this.connected || !this.stompClient) return;
    
    try {
      // Canal d'état de bataille
      const stateSub = this.stompClient.subscribe(
        `/topic/rta/state/${battleId}`,
        (message) => {
          try {
            const state = JSON.parse(message.body);
            console.log('État de bataille mis à jour:', state);
            if (typeof this.callbacks.onBattleState === 'function') {
              this.callbacks.onBattleState(state);
            }
          } catch (error) {
            console.error('Erreur de parsing de l\'état de bataille:', error);
          }
        }
      );
      this.subscriptions.battleState = stateSub;
      
      // Canal de fin de combat
      const endSub = this.stompClient.subscribe(
        `/topic/rta/end/${battleId}`,
        (message) => {
          try {
            const finalState = JSON.parse(message.body);
            console.log('Combat terminé:', finalState);
            if (typeof this.callbacks.onBattleEnd === 'function') {
              this.callbacks.onBattleEnd(finalState);
            }
          } catch (error) {
            console.error('Erreur de parsing de l\'état final:', error);
          }
        }
      );
      this.subscriptions.battleEnd = endSub;
      
      // Canal de tour suivant
      const turnSub = this.stompClient.subscribe(
        `/topic/rta/turn/${battleId}`,
        (message) => {
          try {
            const nextHero = message.body;
            console.log('Tour suivant:', nextHero);
            if (typeof this.callbacks.onNextTurn === 'function') {
              this.callbacks.onNextTurn(nextHero);
            }
          } catch (error) {
            console.error('Erreur de traitement du tour suivant:', error);
          }
        }
      );
      this.subscriptions.nextTurn = turnSub;
      
      console.log('Abonnement aux canaux de bataille réussi');
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux canaux de bataille:', error);
    }
  }

  /**
   * Utiliser une compétence sur une cible
   * @param {String} battleId - ID de la bataille
   * @param {Number} skillId - ID de la compétence à utiliser
   * @param {Number} targetId - ID de la cible
   */
  useSkill(battleId, skillId, targetId) {
    if (!this.connected || !this.stompClient) {
      console.error('WebSocket non connecté');
      return;
    }
    
    console.log(`Utilisation de la compétence ${skillId} sur cible ${targetId} dans la bataille ${battleId}`);
    this.stompClient.send(
      '/app/rta/action',
      {},
      JSON.stringify({
        battleId,
        skillId,
        targetId
      })
    );
  }

  /**
   * Quitter un combat
   * @param {String} battleId - ID de la bataille à quitter
   */
  leaveBattle(battleId) {
    if (!this.connected || !this.stompClient) {
      console.error('WebSocket non connecté');
      return;
    }
    
    console.log(`Quitter la bataille ${battleId}`);
    this.stompClient.send(
      '/app/rta/leave',
      {},
      battleId
    );
    
    // Nettoyer les abonnements
    this._cleanupBattleSubscriptions();
  }
  
  /**
   * Quitter la file d'attente
   */
  leaveQueue() {
    if (!this.connected || !this.stompClient) {
      console.error('WebSocket non connecté');
      return;
    }
    
    if (this.subscriptions.matchmaking) {
      this.subscriptions.matchmaking.unsubscribe();
      delete this.subscriptions.matchmaking;
    }
    
    console.log('Quitter la file d\'attente');
    this.stompClient.send(
      '/app/rta/queue/leave',
      {},
      '{}'
    );
  }

  /**
   * Nettoie les abonnements liés à une bataille
   */
  _cleanupBattleSubscriptions() {
    ['battleState', 'battleEnd', 'nextTurn'].forEach(key => {
      if (this.subscriptions[key]) {
        this.subscriptions[key].unsubscribe();
        delete this.subscriptions[key];
      }
    });
  }

  /**
   * Enregistre un callback
   * @param {String} event - Nom de l'événement
   * @param {Function} callback - Fonction à appeler
   */
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  /**
   * Se déconnecte du serveur WebSocket
   */
  disconnect() {
    this._isDisconnecting = true;
    
    // Nettoyer tous les abonnements
    Object.values(this.subscriptions).forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = {};
    
    // Déconnecter le client STOMP
    if (this.stompClient) {
      if (this.connected) {
        this.stompClient.disconnect();
      }
      this.stompClient = null;
    }
    
    // Fermer le socket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connected = false;
    this._isDisconnecting = false;
    console.log('WebSocket déconnecté');
  }
}

// Exporter une instance singleton
export default new WebSocketService();