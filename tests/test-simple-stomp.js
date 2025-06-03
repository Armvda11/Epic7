#!/usr/bin/env node

/**
 * Test RTA simplifié avec authentification basique
 * Test de connexion WebSocket/STOMP avec gestion d'erreurs améliorée
 */

const SockJS = require('sockjs-client');
const { Client } = require('@stomp/stompjs');
global.WebSocket = require('ws');

class SimpleStompTest {
    constructor() {
        this.backendUrl = 'http://localhost:8080/ws';
        this.stompClient = null;
        this.testResults = [];
        this.connectionEstablished = false;
        this.messagesReceived = [];
        
        // Configuration des héros selon le seeder exact
        this.hermásUserId = 2;
        this.aryaUserId = 3;
        
        this.hermásHeroes = [
            { id: 0, name: 'Hwayoung', speed: 147, attack: 1228, defense: 592, health: 6266 },
            { id: 1, name: 'Ml Piera', speed: 160, attack: 1182, defense: 627, health: 5542 }
        ];
        
        this.aryaHeroes = [
            { id: 0, name: 'Hwayoung', speed: 142, attack: 1200, defense: 580, health: 6100 },
            { id: 3, name: 'Krau', speed: 135, attack: 740, defense: 1150, health: 7900 }
        ];
    }

    /**
     * Test de connexion simplifié
     */
    async runSimpleConnectionTest() {
        console.log('🚀 === TEST CONNEXION STOMP SIMPLIFIÉ ===');
        console.log(`📡 URL: ${this.backendUrl}`);
        
        try {
            // Test 1: Connexion basique
            await this.testBasicConnection();
            
            // Test 2: Test des corrections RTA (simulation)
            await this.testRtaCorrectionsSimulation();
            
            this.displayResults();
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erreur:', error.message);
            this.testResults.push({
                test: 'Simple Connection Test',
                status: '❌ ERREUR',
                details: error.message,
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        } finally {
            this.cleanup();
        }
    }

    /**
     * Test de connexion basique sans authentification
     */
    async testBasicConnection() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Test de connexion basique...');
            
            this.stompClient = new Client({
                webSocketFactory: () => new SockJS(this.backendUrl),
                connectHeaders: {
                    // Pas d'authentification pour ce test basique
                },
                debug: (str) => {
                    console.log('🔍 STOMP:', str.substring(0, 100) + (str.length > 100 ? '...' : ''));
                },
                reconnectDelay: 0, // Pas de reconnexion automatique
                heartbeatIncoming: 0,
                heartbeatOutgoing: 0,
            });

            let resolved = false;

            this.stompClient.onConnect = (frame) => {
                if (!resolved) {
                    resolved = true;
                    console.log('✅ Connexion STOMP réussie');
                    this.connectionEstablished = true;
                    
                    this.testResults.push({
                        test: 'Basic STOMP Connection',
                        status: '✅ SUCCÈS',
                        details: 'Connexion établie sans authentification',
                        timestamp: new Date().toISOString()
                    });
                    
                    resolve();
                }
            };

            this.stompClient.onStompError = (frame) => {
                if (!resolved) {
                    resolved = true;
                    const error = `STOMP Error: ${frame.headers['message'] || 'Unknown'} - ${frame.body || ''}`;
                    console.error('❌', error);
                    
                    this.testResults.push({
                        test: 'Basic STOMP Connection',
                        status: '❌ ÉCHEC',
                        details: error,
                        timestamp: new Date().toISOString()
                    });
                    
                    reject(new Error(error));
                }
            };

            this.stompClient.onWebSocketError = (error) => {
                if (!resolved) {
                    resolved = true;
                    console.error('❌ WebSocket Error:', error.message);
                    
                    this.testResults.push({
                        test: 'Basic STOMP Connection',
                        status: '❌ ÉCHEC',
                        details: `WebSocket Error: ${error.message}`,
                        timestamp: new Date().toISOString()
                    });
                    
                    reject(error);
                }
            };

            this.stompClient.onWebSocketClose = (event) => {
                console.log(`🔌 WebSocket fermé: Code ${event.code}, Raison: ${event.reason}`);
            };

            try {
                this.stompClient.activate();
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            }
            
            // Timeout de sécurité
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Timeout de connexion (8s)'));
                }
            }, 8000);
        });
    }

    /**
     * Test des corrections RTA par simulation
     */
    async testRtaCorrectionsSimulation() {
        console.log('⚔️ Test des corrections RTA par simulation...');
        
        // Test Correction 1: Index de tour automatique
        this.testTurnIndexCorrection();
        
        // Test Correction 2: Attribution userId
        this.testUserIdAttribution();
        
        // Test Correction 3: Ordre basé sur vitesse
        this.testSpeedBasedOrder();
    }

    /**
     * Test Correction 1: Index de tour automatique
     */
    testTurnIndexCorrection() {
        console.log('🔧 Test correction index de tour...');
        
        const battleState = {
            currentTurnIndex: -1, // Index invalide
            turnOrder: this.calculateTurnOrder(),
            players: [
                { userId: this.hermásUserId, heroes: this.hermásHeroes },
                { userId: this.aryaUserId, heroes: this.aryaHeroes }
            ]
        };
        
        // Simulation de la correction
        const correctedIndex = this.correctTurnIndex(battleState);
        const success = correctedIndex === 0;
        
        this.testResults.push({
            test: 'Turn Index Correction',
            status: success ? '✅ SUCCÈS' : '❌ ÉCHEC',
            details: `Index ${battleState.currentTurnIndex} → ${correctedIndex}`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🔧 Index corrigé: ${battleState.currentTurnIndex} → ${correctedIndex}`);
    }

    /**
     * Test Correction 2: Attribution userId
     */
    testUserIdAttribution() {
        console.log('👤 Test attribution userId...');
        
        const action = {
            actionType: 'ATTACK',
            sourceHeroId: 1, // Ml Piera (appartient à hermas)
            targetHeroId: 0, // Hwayoung (appartient à arya)
            userId: null // À déterminer automatiquement
        };
        
        // Simulation de l'attribution
        const attributedUserId = this.attributeUserId(action);
        const success = attributedUserId === this.hermásUserId;
        
        this.testResults.push({
            test: 'UserId Attribution',
            status: success ? '✅ SUCCÈS' : '❌ ÉCHEC',
            details: `UserId attribué: ${attributedUserId} (attendu: ${this.hermásUserId})`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`👤 UserId attribué: ${attributedUserId}`);
    }

    /**
     * Test Correction 3: Ordre basé sur vitesse
     */
    testSpeedBasedOrder() {
        console.log('⚡ Test ordre basé sur vitesse...');
        
        const allHeroes = [
            { ...this.hermásHeroes[0], userId: this.hermásUserId }, // Hwayoung 147
            { ...this.hermásHeroes[1], userId: this.hermásUserId }, // Ml Piera 160
            { ...this.aryaHeroes[0], userId: this.aryaUserId },     // Hwayoung 142
            { ...this.aryaHeroes[1], userId: this.aryaUserId }      // Krau 135
        ];
        
        const turnOrder = this.calculateTurnOrder(allHeroes);
        
        // Vérifier l'ordre correct: Ml Piera(160) → Hwayoung hermas(147) → Hwayoung arya(142) → Krau(135)
        const expectedOrder = ['Ml Piera', 'Hwayoung', 'Hwayoung', 'Krau'];
        const actualOrder = turnOrder.map(h => h.name);
        
        const orderCorrect = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
        
        this.testResults.push({
            test: 'Speed-Based Turn Order',
            status: orderCorrect ? '✅ SUCCÈS' : '❌ ÉCHEC',
            details: `Ordre: ${turnOrder.map(h => `${h.name}(${h.speed})`).join(' → ')}`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`⚡ Ordre calculé: ${turnOrder.map(h => `${h.name}(${h.speed})`).join(' → ')}`);
    }

    /**
     * Correction d'index de tour invalide
     */
    correctTurnIndex(battleState) {
        if (battleState.currentTurnIndex < 0 || 
            battleState.currentTurnIndex >= battleState.turnOrder.length) {
            return 0; // Corriger à 0
        }
        return battleState.currentTurnIndex;
    }

    /**
     * Attribution automatique d'userId basée sur le héros source
     */
    attributeUserId(action) {
        // Logique basée sur la possession des héros selon le seeder
        const hermásHeroIds = this.hermásHeroes.map(h => h.id);
        const aryaHeroIds = this.aryaHeroes.map(h => h.id);
        
        if (hermásHeroIds.includes(action.sourceHeroId)) {
            return this.hermásUserId;
        } else if (aryaHeroIds.includes(action.sourceHeroId)) {
            return this.aryaUserId;
        }
        
        // Par défaut, attribuer au premier joueur
        return this.hermásUserId;
    }

    /**
     * Calcul de l'ordre des tours basé sur la vitesse
     */
    calculateTurnOrder(heroes = null) {
        if (!heroes) {
            heroes = [
                { ...this.hermásHeroes[0], userId: this.hermásUserId },
                { ...this.hermásHeroes[1], userId: this.hermásUserId },
                { ...this.aryaHeroes[0], userId: this.aryaUserId },
                { ...this.aryaHeroes[1], userId: this.aryaUserId }
            ];
        }
        
        return heroes.sort((a, b) => b.speed - a.speed);
    }

    /**
     * Affichage des résultats
     */
    displayResults() {
        console.log('\n🏁 === RÉSULTATS DES TESTS ===');
        console.log(`📊 Tests exécutés: ${this.testResults.length}`);
        
        this.testResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.test}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Détails: ${result.details}`);
        });
        
        const successCount = this.testResults.filter(r => r.status.includes('SUCCÈS')).length;
        const failureCount = this.testResults.length - successCount;
        
        console.log(`\n📈 Bilan: ${successCount} succès, ${failureCount} échecs`);
        
        if (this.messagesReceived.length > 0) {
            console.log(`\n📨 Messages reçus: ${this.messagesReceived.length}`);
        }
    }

    /**
     * Nettoyage
     */
    cleanup() {
        console.log('🧹 Nettoyage...');
        
        if (this.stompClient && this.stompClient.active) {
            this.stompClient.deactivate();
        }
    }
}

// Exécution
if (require.main === module) {
    const test = new SimpleStompTest();
    test.runSimpleConnectionTest()
        .then(result => {
            console.log(`\n🎯 Test ${result.success ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Erreur fatale:', error.message);
            process.exit(1);
        });
}

module.exports = SimpleStompTest;
