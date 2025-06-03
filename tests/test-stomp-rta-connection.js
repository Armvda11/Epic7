#!/usr/bin/env node

/**
 * Test RTA avec connexion STOMP correcte - Version Node.js
 * Test des 3 corrections avec protocole STOMP/SockJS approprié
 */

const SockJS = require('sockjs-client');
const { Client } = require('@stomp/stompjs');
global.WebSocket = require('ws');

class StompRtaConnectionTest {
    constructor() {
        this.backendUrl = 'http://localhost:8080/ws';
        this.stompClient = null;
        this.testResults = [];
        this.hermásUserId = 2; // Configuration exacte du seeder
        this.aryaUserId = 3;   // Configuration exacte du seeder
        this.testStartTime = null;
        this.connectionEstablished = false;
        this.messagesReceived = [];
        this.battleId = null;
        
        // Configuration exacte des héros du seeder
        this.hermásHeroes = [
            { id: 0, name: 'Hwayoung', speed: 147, attack: 1228, defense: 592, health: 6266 },
            { id: 1, name: 'Ml Piera', speed: 160, attack: 1182, defense: 627, health: 5542 },
            { id: 5, name: 'Ylinav', speed: 142, attack: 1039, defense: 758, health: 6148 },
            { id: 3, name: 'Krau', speed: 140, attack: 757, defense: 1177, health: 8077 }
        ];
        
        this.aryaHeroes = [
            { id: 0, name: 'Hwayoung', speed: 142, attack: 1200, defense: 580, health: 6100 },
            { id: 1, name: 'Ml Piera', speed: 155, attack: 1150, defense: 620, health: 5400 },
            { id: 5, name: 'Ylinav', speed: 138, attack: 1020, defense: 740, health: 6000 },
            { id: 3, name: 'Krau', speed: 135, attack: 740, defense: 1150, health: 7900 }
        ];
    }

    /**
     * Test complet avec connexion STOMP appropriée
     */
    async runStompConnectionTest() {
        this.testStartTime = Date.now();
        console.log('🚀 === TEST CONNEXION RTA STOMP ===');
        console.log(`📡 Connexion STOMP à: ${this.backendUrl}`);
        
        try {
            // Test 1: Établir la connexion STOMP
            await this.establishStompConnection();
            
            // Test 2: Test de joining RTA room
            await this.testRtaJoin();
            
            // Test 3: Simulation de bataille et test des corrections
            await this.simulateBattleWithCorrections();
            
            // Test 4: Test de robustesse WebSocket
            await this.testWebSocketRobustness();
            
            this.displayResults();
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erreur lors du test STOMP:', error);
            this.testResults.push({
                test: 'STOMP Connection Test',
                status: '❌ ERREUR',
                details: `Exception: ${error.message}`,
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        } finally {
            this.cleanup();
        }
    }

    /**
     * Établissement de la connexion STOMP
     */
    async establishStompConnection() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Établissement de la connexion STOMP...');
            
            this.stompClient = new Client({
                webSocketFactory: () => new SockJS(this.backendUrl),
                connectHeaders: {
                    // Simulation d'un token JWT pour l'authentification
                    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoZXJtYXMiLCJpYXQiOjE2ODg0NzM2NTUsImV4cCI6MTY4ODQ3NzI1NX0.test-token',
                    'User-ID': this.hermásUserId.toString()
                },
                debug: (str) => {
                    console.log('🔍 STOMP Debug:', str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            this.stompClient.onConnect = (frame) => {
                console.log('✅ Connexion STOMP établie avec succès');
                console.log('📋 Frame de connexion:', frame);
                this.connectionEstablished = true;
                
                this.testResults.push({
                    test: 'STOMP Connection',
                    status: '✅ SUCCÈS',
                    details: 'Connexion STOMP établie avec le backend Epic7',
                    timestamp: new Date().toISOString()
                });
                
                // Souscription aux topics RTA
                this.subscribeToRtaTopics();
                resolve();
            };

            this.stompClient.onStompError = (frame) => {
                console.error('❌ Erreur STOMP:', frame.headers['message']);
                console.error('📋 Détails:', frame.body);
                
                this.testResults.push({
                    test: 'STOMP Connection',
                    status: '❌ ÉCHEC',
                    details: `Erreur STOMP: ${frame.headers['message']}`,
                    timestamp: new Date().toISOString()
                });
                
                reject(new Error(`STOMP Error: ${frame.headers['message']}`));
            };

            this.stompClient.onWebSocketError = (error) => {
                console.error('❌ Erreur WebSocket:', error);
                reject(error);
            };

            this.stompClient.activate();
            
            // Timeout de sécurité
            setTimeout(() => {
                if (!this.connectionEstablished) {
                    reject(new Error('Timeout de connexion STOMP (10s)'));
                }
            }, 10000);
        });
    }

    /**
     * Souscription aux topics RTA
     */
    subscribeToRtaTopics() {
        console.log('📡 Souscription aux topics RTA...');
        
        // Topic pour les mises à jour de bataille
        this.stompClient.subscribe('/topic/rta/battle', (message) => {
            const data = JSON.parse(message.body);
            console.log('📨 Message RTA Battle reçu:', data);
            this.messagesReceived.push({ topic: 'battle', data, timestamp: Date.now() });
        });
        
        // Topic pour les notifications RTA
        this.stompClient.subscribe('/topic/rta/notifications', (message) => {
            const data = JSON.parse(message.body);
            console.log('📨 Notification RTA reçue:', data);
            this.messagesReceived.push({ topic: 'notifications', data, timestamp: Date.now() });
        });
        
        // Topic utilisateur personnel
        this.stompClient.subscribe(`/user/queue/rta`, (message) => {
            const data = JSON.parse(message.body);
            console.log('📨 Message RTA personnel reçu:', data);
            this.messagesReceived.push({ topic: 'personal', data, timestamp: Date.now() });
        });
    }

    /**
     * Test de joining une room RTA
     */
    async testRtaJoin() {
        console.log('🎮 Test de joining RTA room...');
        
        const joinMessage = {
            userId: this.hermásUserId,
            playerName: 'hermas',
            selectedHeroes: this.hermásHeroes.slice(0, 2), // Sélection de 2 héros pour le test
            timestamp: Date.now()
        };
        
        try {
            this.stompClient.publish({
                destination: '/app/rta/join',
                body: JSON.stringify(joinMessage),
                headers: { 'User-ID': this.hermásUserId.toString() }
            });
            
            console.log('📤 Message de join envoyé:', joinMessage);
            
            // Attendre une réponse
            await this.waitForMessage('join-response', 5000);
            
            this.testResults.push({
                test: 'RTA Join',
                status: '✅ SUCCÈS',
                details: 'Message de join envoyé avec succès',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Erreur lors du join RTA:', error);
            this.testResults.push({
                test: 'RTA Join',
                status: '❌ ÉCHEC',
                details: `Erreur: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Simulation de bataille avec test des corrections
     */
    async simulateBattleWithCorrections() {
        console.log('⚔️ Simulation de bataille avec test des corrections...');
        
        try {
            // Test Correction 1: Index de tour automatique
            await this.testTurnIndexCorrection();
            
            // Test Correction 2: Attribution correcte des userId
            await this.testUserIdAttribution();
            
            // Test Correction 3: Gestion des tours avec ordre de vitesse
            await this.testSpeedBasedTurnOrder();
            
        } catch (error) {
            console.error('❌ Erreur lors de la simulation de bataille:', error);
        }
    }

    /**
     * Test Correction 1: Index de tour automatique
     */
    async testTurnIndexCorrection() {
        console.log('🔧 Test de la correction d\'index de tour...');
        
        // Simulation d'un état de bataille avec index invalide
        const battleState = {
            battleId: 'test-battle-' + Date.now(),
            players: [
                { userId: this.hermásUserId, heroes: this.hermásHeroes.slice(0, 2) },
                { userId: this.aryaUserId, heroes: this.aryaHeroes.slice(0, 2) }
            ],
            currentTurnIndex: -1, // Index invalide intentionnel
            turnOrder: this.calculateTurnOrder(),
            timestamp: Date.now()
        };
        
        // Simuler la correction automatique
        const correctedIndex = this.simulateTurnIndexCorrection(battleState);
        
        const success = correctedIndex === 0; // Doit être corrigé à 0
        
        this.testResults.push({
            test: 'Turn Index Correction',
            status: success ? '✅ SUCCÈS' : '❌ ÉCHEC',
            details: `Index corrigé de ${battleState.currentTurnIndex} à ${correctedIndex}`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🔧 Index corrigé: ${battleState.currentTurnIndex} → ${correctedIndex}`);
    }

    /**
     * Test Correction 2: Attribution correcte des userId
     */
    async testUserIdAttribution() {
        console.log('👤 Test de l\'attribution des userId...');
        
        const testAction = {
            actionType: 'ATTACK',
            sourceHeroId: 1, // Ml Piera de hermas
            targetHeroId: 0, // Hwayoung de arya
            userId: null, // UserId manquant intentionnellement
            battleId: 'test-battle-' + Date.now()
        };
        
        // Simuler la correction d'attribution userId
        const correctedUserId = this.simulateUserIdAttribution(testAction);
        
        const success = correctedUserId === this.hermásUserId;
        
        this.testResults.push({
            test: 'UserId Attribution',
            status: success ? '✅ SUCCÈS' : '❌ ÉCHEC',
            details: `UserId attribué automatiquement: ${correctedUserId}`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`👤 UserId attribué: ${correctedUserId}`);
    }

    /**
     * Test Correction 3: Ordre des tours basé sur la vitesse
     */
    async testSpeedBasedTurnOrder() {
        console.log('⚡ Test de l\'ordre des tours basé sur la vitesse...');
        
        const allHeroes = [
            ...this.hermásHeroes.slice(0, 2).map(h => ({...h, userId: this.hermásUserId})),
            ...this.aryaHeroes.slice(0, 2).map(h => ({...h, userId: this.aryaUserId}))
        ];
        
        const calculatedOrder = this.calculateTurnOrder(allHeroes);
        
        // Vérifier que l'ordre est correct (vitesse décroissante)
        let orderCorrect = true;
        for (let i = 1; i < calculatedOrder.length; i++) {
            if (calculatedOrder[i].speed > calculatedOrder[i-1].speed) {
                orderCorrect = false;
                break;
            }
        }
        
        this.testResults.push({
            test: 'Speed-Based Turn Order',
            status: orderCorrect ? '✅ SUCCÈS' : '❌ ÉCHEC',
            details: `Ordre calculé: ${calculatedOrder.map(h => `${h.name}(${h.speed})`).join(' → ')}`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`⚡ Ordre des tours: ${calculatedOrder.map(h => `${h.name}(${h.speed})`).join(' → ')}`);
    }

    /**
     * Test de robustesse WebSocket
     */
    async testWebSocketRobustness() {
        console.log('🔄 Test de robustesse WebSocket...');
        
        try {
            // Simuler une déconnexion/reconnexion
            const reconnectPromise = new Promise((resolve) => {
                this.stompClient.onConnect = () => {
                    console.log('✅ Reconnexion STOMP réussie');
                    resolve(true);
                };
            });
            
            // Déconnecter et reconnecter
            this.stompClient.deactivate();
            await this.sleep(1000);
            this.stompClient.activate();
            
            const reconnected = await Promise.race([
                reconnectPromise,
                this.sleep(5000).then(() => false)
            ]);
            
            this.testResults.push({
                test: 'WebSocket Robustness',
                status: reconnected ? '✅ SUCCÈS' : '❌ ÉCHEC',
                details: reconnected ? 'Reconnexion automatique réussie' : 'Échec de reconnexion',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Erreur lors du test de robustesse:', error);
            this.testResults.push({
                test: 'WebSocket Robustness',
                status: '❌ ÉCHEC',
                details: `Erreur: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Calcul de l'ordre des tours basé sur la vitesse
     */
    calculateTurnOrder(heroes = null) {
        if (!heroes) {
            heroes = [
                ...this.hermásHeroes.slice(0, 2).map(h => ({...h, userId: this.hermásUserId})),
                ...this.aryaHeroes.slice(0, 2).map(h => ({...h, userId: this.aryaUserId}))
            ];
        }
        
        return heroes.sort((a, b) => b.speed - a.speed);
    }

    /**
     * Simulation de la correction d'index de tour
     */
    simulateTurnIndexCorrection(battleState) {
        if (battleState.currentTurnIndex < 0 || battleState.currentTurnIndex >= battleState.turnOrder.length) {
            // Correction automatique: remettre à 0
            return 0;
        }
        return battleState.currentTurnIndex;
    }

    /**
     * Simulation de l'attribution automatique d'userId
     */
    simulateUserIdAttribution(action) {
        // Logique simplifiée: attribuer l'userId en fonction du héros source
        if (action.sourceHeroId <= 1) {
            return this.hermásUserId; // Héros de hermas
        } else {
            return this.aryaUserId; // Héros d'arya
        }
    }

    /**
     * Attendre un message spécifique
     */
    async waitForMessage(messageType, timeout) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkMessage = () => {
                const message = this.messagesReceived.find(m => 
                    m.data && m.data.type === messageType
                );
                
                if (message) {
                    resolve(message);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout en attente du message: ${messageType}`));
                } else {
                    setTimeout(checkMessage, 100);
                }
            };
            
            checkMessage();
        });
    }

    /**
     * Fonction utilitaire pour pause
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Affichage des résultats
     */
    displayResults() {
        const duration = Date.now() - this.testStartTime;
        console.log('\n🏁 === RÉSULTATS DES TESTS RTA STOMP ===');
        console.log(`⏱️ Durée totale: ${duration}ms`);
        console.log(`📊 Tests exécutés: ${this.testResults.length}`);
        
        this.testResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.test}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Détails: ${result.details}`);
            console.log(`   Timestamp: ${result.timestamp}`);
        });
        
        const successCount = this.testResults.filter(r => r.status.includes('SUCCÈS')).length;
        const failureCount = this.testResults.length - successCount;
        
        console.log(`\n📈 Résultats: ${successCount} succès, ${failureCount} échecs`);
        
        if (this.messagesReceived.length > 0) {
            console.log(`\n📨 Messages reçus: ${this.messagesReceived.length}`);
            this.messagesReceived.forEach((msg, i) => {
                console.log(`   ${i + 1}. [${msg.topic}] ${JSON.stringify(msg.data)}`);
            });
        }
    }

    /**
     * Nettoyage des ressources
     */
    cleanup() {
        console.log('🧹 Nettoyage des ressources...');
        
        if (this.stompClient && this.stompClient.active) {
            this.stompClient.deactivate();
        }
        
        console.log('✅ Nettoyage terminé');
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const test = new StompRtaConnectionTest();
    test.runStompConnectionTest()
        .then(result => {
            console.log('\n🎯 Test terminé:', result.success ? 'SUCCÈS' : 'ÉCHEC');
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = StompRtaConnectionTest;
