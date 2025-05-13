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
          
          // Demander immédiatement l'état de la bataille
          setTimeout(() => {
            this.requestBattleState(battleId)
              .then(() => console.log("Demande d'état initial envoyée avec succès"))
              .catch(err => console.error("Erreur lors de la demande d'état initial:", err));
          }, 300);
          
          // Invoquer le callback onMatchFound s'il existe
          if (typeof this.callbacks.onMatchFound === 'function') {
            this.callbacks.onMatchFound(battleId);
          }
          
          // Planifier plusieurs tentatives de récupération d'état en cas d'échec
          const retryIntervals = [1000, 2000, 3000, 5000];
          retryIntervals.forEach((delay, index) => {
            setTimeout(() => {
              // Vérifier si nous avons toujours besoin de l'état
              if (this.subscriptions.battleState) {
                console.log(`Tentative de récupération #${index + 1} de l'état de bataille`);
                this.requestBattleState(battleId).catch(console.error);
              }
            }, delay);
          });
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
   * Demande l'état actuel d'une bataille spécifique
   * @param {string} battleId - L'identifiant de la bataille
   * @param {number} maxRetries - Nombre maximum de tentatives (par défaut: 3)
   * @returns {Promise} - Promise résolue quand la demande est envoyée
   */
  requestBattleState(battleId, maxRetries = 3, currentRetry = 0) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.stompClient) {
        // Tenter de se reconnecter d'abord
        if (currentRetry < maxRetries) {
          console.log(`WebSocket non connecté, tentative de reconnexion ${currentRetry + 1}/${maxRetries}`);
          return this.connect()
            .then(() => this.requestBattleState(battleId, maxRetries, currentRetry + 1))
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('WebSocket non connecté après plusieurs tentatives'));
          return;
        }
      }
      
      if (!battleId) {
        reject(new Error('ID de bataille non fourni'));
        return;
      }
      
      try {
        console.log(`Demande de l'état actuel de la bataille: ${battleId} (tentative ${currentRetry + 1}/${maxRetries + 1})`);
        
        // Vérifier si l'abonnement au canal d'état existe déjà
        if (!this.subscriptions[`state_${battleId}`]) {
          console.log(`Abonnement manquant pour le canal d'état ${battleId}, tentative de réabonnement...`);
          this._subscribeToBattleChannels(battleId);
        }
        
        this.stompClient.send(
          '/app/rta/state/request',
          {},
          battleId
        );
        
        // Si c'est la première tentative, on configure un timeout pour réessayer automatiquement
        if (currentRetry === 0) {
          const stateTimeout = setTimeout(() => {
            console.log(`Pas de réponse après 3 secondes, nouvelle tentative automatique...`);
            if (currentRetry < maxRetries) {
              this.requestBattleState(battleId, maxRetries, currentRetry + 1)
                .then(resolve)
                .catch(reject);
            }
          }, 3000);
          
          // Nettoyer le timeout si la promesse est résolue
          Promise.race([
            new Promise(r => setTimeout(r, 2900)),
            new Promise(r => {
              const checkInterval = setInterval(() => {
                if (this.lastBattleState && this.lastBattleState.battleId === battleId) {
                  clearInterval(checkInterval);
                  r(true);
                }
              }, 500);
            })
          ]).then(result => {
            clearTimeout(stateTimeout);
            if (result === true) {
              console.log(`État de bataille reçu avec succès`);
            }
          });
        }
        
        resolve();
      } catch (error) {
        console.error('Erreur lors de la demande d\'état de bataille:', error);
        
        // Réessayer si possible
        if (currentRetry < maxRetries) {
          setTimeout(() => {
            this.requestBattleState(battleId, maxRetries, currentRetry + 1)
              .then(resolve)
              .catch(reject);
          }, 1000);
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * S'abonne aux canaux de combat pour un battleId donné
   */
  _subscribeToBattleChannels(battleId) {
    if (!this.connected || !this.stompClient) return;
    
    try {
      // Canal d'état de bataille personnalisé (spécifique à l'utilisateur)
      const stateSub = this.stompClient.subscribe(
        `/user/queue/rta/state/${battleId}`,
        (message) => {
          try {
            const state = JSON.parse(message.body);
            console.log('État de bataille personnalisé reçu:', state);
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
    
    // Vérification des valeurs avec des logs détaillés
    if (!battleId) {
      console.error('useSkill: battleId manquant');
      return;
    }
    
    if (skillId === undefined || skillId === null) {
      console.error('useSkill: skillId manquant');
      return;
    }
    
    if (targetId === undefined || targetId === null) {
      console.error('useSkill: targetId manquant');
      return;
    }
    
    // Conversion des ID avec validation stricte et garantie de type Long pour le backend
    let numSkillId, numTargetId;
    
    try {
      // Convertir en nombre puis en entier
      numSkillId = parseInt(Number(skillId), 10);
      if (isNaN(numSkillId)) {
        throw new Error(`SkillId invalide: ${skillId} (type: ${typeof skillId})`);
      }
      
      numTargetId = parseInt(Number(targetId), 10);
      if (isNaN(numTargetId)) {
        throw new Error(`TargetId invalide: ${targetId} (type: ${typeof targetId})`);
      }
    } catch (error) {
      console.error('Erreur de conversion des ID:', error);
      return;
    }
    
    // Créer le payload pour le backend (qui attend des Long)
    // Utilisation d'un payload standardisé qui correspond exactement à SkillActionMessage.java
    const payload = {
      battleId: String(battleId), // Le backend attend une chaîne
      skillId: numSkillId,       // Le backend attend un Long/Number
      targetId: numTargetId      // Le backend attend un Long/Number
    };
    
    console.log(`Utilisation de la compétence ${numSkillId} (${typeof numSkillId}) sur cible ${numTargetId} (${typeof numTargetId}) dans la bataille ${battleId}`, payload);
    
    try {
      this.stompClient.send(
        '/app/rta/action',
        {},
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'action:', error);
    }
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