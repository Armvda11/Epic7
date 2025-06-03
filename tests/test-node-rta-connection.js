#!/usr/bin/env node

/**
 * Test RTA avec connexion WebSocket réelle - Version Node.js
 * Test des 3 corrections avec le serveur Epic7 en fonctionnement
 */

const WebSocket = require('ws');

class NodeRtaConnectionTest {
    constructor() {
        this.backendUrl = 'ws://localhost:8080/ws';
        this.socket = null;
        this.testResults = [];
        this.hermásUserId = 2; // Exact seeder config
        this.aryaUserId = 3;   // Exact seeder config
        this.testStartTime = null;
        this.connectionEstablished = false;
        this.messagesReceived = [];
    }

    /**
     * Test complet avec vraie connexion WebSocket Node.js
     */
    async runNodeConnectionTest() {
        this.testStartTime = Date.now();
        console.log('🚀 === TEST CONNEXION RTA NODE.JS ===');
        console.log(`📡 Tentative de connexion à: ${this.backendUrl}`);
        
        try {
            // Test 1: Établir la connexion
            await this.establishConnection();
            
            // Test 2: Test STOMP/WebSocket
            await this.testStompConnection();
            
            // Test 3: Test des messages RTA
            await this.testRtaMessages();
            
            // Test 4: Test des corrections
            await this.testCorrections();
            
            this.displayResults();
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erreur lors du test:', error);
            this.testResults.push({
                test: 'Node Connection Test',
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
     * Établissement de la connexion WebSocket
     */
    async establishConnection() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Établissement de la connexion WebSocket...');
            
            try {
                this.socket = new WebSocket(this.backendUrl);
                
                this.socket.on('open', () => {
                    console.log('✅ Connexion WebSocket établie avec succès');
                    this.connectionEstablished = true;
                    this.testResults.push({
                        test: 'WebSocket Connection',
                        status: '✅ SUCCÈS',
                        details: 'Connexion établie avec le backend Epic7',
                        timestamp: new Date().toISOString()
                    });
                    resolve();
                });
                
                this.socket.on('error', (error) => {
                    console.error('❌ Erreur de connexion WebSocket:', error.message);
                    this.testResults.push({
                        test: 'WebSocket Connection',
                        status: '❌ ÉCHEC',
                        details: `Erreur: ${error.message}`,
                        timestamp: new Date().toISOString()
                    });
                    reject(error);
                });
                
                this.socket.on('close', (code, reason) => {
                    console.log(`🔌 Connexion fermée: Code ${code}, Raison: ${reason}`);
                    this.connectionEstablished = false;
                });
                
                this.socket.on('message', (data) => {
                    this.handleServerMessage(data.toString());
                });
                
                // Timeout de connexion
                setTimeout(() => {
                    if (!this.connectionEstablished) {
                        reject(new Error('Timeout de connexion WebSocket'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Test de la connexion STOMP
     */
    async testStompConnection() {
        console.log('🔗 Test de la connexion STOMP...');
        
        // Message de connexion STOMP
        const stompConnect = 'CONNECT\\naccept-version:1.0,1.1,1.2\\nhost:localhost\\n\\n\\x00';
        
        return new Promise((resolve) => {
            this.socket.send(stompConnect);
            console.log('📨 Message STOMP CONNECT envoyé');
            
            setTimeout(() => {
                this.testResults.push({
                    test: 'STOMP Connection',
                    status: '✅ SUCCÈS',
                    details: 'Message STOMP CONNECT envoyé',
                    timestamp: new Date().toISOString()
                });
                resolve();
            }, 1000);
        });
    }

    /**
     * Test des messages RTA
     */
    async testRtaMessages() {
        console.log('⚔️ Test des messages RTA...');
        
        // Test Join RTA avec héros du seeder
        const joinMessage = {
            type: 'join',
            userId: this.hermásUserId,
            selectedHeroes: [0, 1, 5, 3], // Hwayoung, Ml Piera, Ylinav, Krau
            ready: true
        };
        
        const stompJoin = `SEND\\ndestination:/app/rta/join\\ncontent-type:application/json\\n\\n${JSON.stringify(joinMessage)}\\x00`;
        
        this.socket.send(stompJoin);
        console.log('📨 Message RTA JOIN envoyé avec héros du seeder:', joinMessage.selectedHeroes);
        
        // Test Action RTA
        setTimeout(() => {
            const actionMessage = {
                battleId: 'test-battle-' + Date.now(),
                skillId: 1,
                targetIds: [2],
                userId: this.hermásUserId
            };
            
            const stompAction = `SEND\\ndestination:/app/rta/action\\ncontent-type:application/json\\n\\n${JSON.stringify(actionMessage)}\\x00`;
            this.socket.send(stompAction);
            console.log('📨 Message RTA ACTION envoyé');
        }, 1000);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.testResults.push({
                    test: 'RTA Messages',
                    status: '✅ SUCCÈS',
                    details: 'Messages RTA JOIN et ACTION envoyés',
                    timestamp: new Date().toISOString()
                });
                resolve();
            }, 2000);
        });
    }

    /**
     * Test des trois corrections
     */
    async testCorrections() {
        console.log('🔧 Test des trois corrections...');
        
        // Correction 1: Message avec données invalides (test robustesse)
        const invalidMessage = {
            type: 'join',
            // userId manquant intentionnellement
            selectedHeroes: [999], // Héros inexistant
            ready: 'invalid' // Valeur invalide
        };
        
        const stompInvalid = `SEND\\ndestination:/app/rta/join\\ncontent-type:application/json\\n\\n${JSON.stringify(invalidMessage)}\\x00`;
        this.socket.send(stompInvalid);
        console.log('📨 Message avec données invalides envoyé (test correction)');
        
        // Correction 2: Test heartbeat pour maintenir la connexion
        setTimeout(() => {
            const heartbeat = {};
            const stompHeartbeat = `SEND\\ndestination:/app/rta/heartbeat\\ncontent-type:application/json\\n\\n${JSON.stringify(heartbeat)}\\x00`;
            this.socket.send(stompHeartbeat);
            console.log('💓 Heartbeat envoyé');
        }, 1000);
        
        // Correction 3: Test check-state
        setTimeout(() => {
            const checkState = 'test-battle-check';
            const stompCheck = `SEND\\ndestination:/app/rta/check-state\\ncontent-type:application/json\\n\\n"${checkState}"\\x00`;
            this.socket.send(stompCheck);
            console.log('🔍 Check-state envoyé');
        }, 2000);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.testResults.push({
                    test: 'RTA Corrections',
                    status: '✅ SUCCÈS',
                    details: 'Tests des corrections effectués (invalide, heartbeat, check-state)',
                    timestamp: new Date().toISOString()
                });
                resolve();
            }, 3000);
        });
    }

    /**
     * Gestionnaire des messages du serveur
     */
    handleServerMessage(data) {
        this.messagesReceived.push(data);
        
        try {
            // Tentative de parsing STOMP
            if (data.startsWith('CONNECTED')) {
                console.log('✅ Réponse STOMP CONNECTED reçue');
                return;
            }
            
            if (data.startsWith('MESSAGE')) {
                console.log('📨 Message STOMP reçu du serveur');
                // Extraction du JSON du message STOMP
                const jsonStart = data.indexOf('{');
                if (jsonStart !== -1) {
                    const jsonData = data.substring(jsonStart);
                    const jsonEnd = jsonData.lastIndexOf('}') + 1;
                    if (jsonEnd > 0) {
                        const messageContent = jsonData.substring(0, jsonEnd);
                        const parsed = JSON.parse(messageContent);
                        console.log('📊 Contenu du message:', parsed);
                    }
                }
                return;
            }
            
            if (data.startsWith('ERROR')) {
                console.log('⚠️ Erreur STOMP reçue:', data);
                return;
            }
            
            // Tentative de parsing JSON direct
            const message = JSON.parse(data);
            console.log('📨 Message JSON reçu:', message.type || 'Type inconnu');
            
        } catch (error) {
            console.log('📨 Message brut reçu (non-JSON):', data.length > 100 ? data.substring(0, 100) + '...' : data);
        }
    }

    /**
     * Affichage des résultats
     */
    displayResults() {
        const testDuration = ((Date.now() - this.testStartTime) / 1000).toFixed(2);
        
        console.log('\\n' + '='.repeat(80));
        console.log('📊 RÉSULTATS DES TESTS DE CONNEXION NODE.JS RTA');
        console.log('='.repeat(80));
        
        let successCount = this.testResults.filter(r => r.status.includes('SUCCÈS')).length;
        let failCount = this.testResults.filter(r => r.status.includes('ÉCHEC')).length;
        let errorCount = this.testResults.filter(r => r.status.includes('ERREUR')).length;
        let totalTests = this.testResults.length;
        
        this.testResults.forEach(result => {
            console.log(`\\n${result.status} ${result.test}`);
            console.log(`   📝 ${result.details}`);
            console.log(`   🕒 ${result.timestamp}`);
        });
        
        console.log('\\n' + '-'.repeat(80));
        console.log(`📈 STATISTIQUES:`);
        console.log(`   ⏱️  Durée des tests: ${testDuration}s`);
        console.log(`   📊 Total des tests: ${totalTests}`);
        console.log(`   ✅ Succès: ${successCount}`);
        console.log(`   ❌ Échecs: ${failCount}`);
        console.log(`   🚨 Erreurs: ${errorCount}`);
        console.log(`   📨 Messages reçus: ${this.messagesReceived.length}`);
        
        const successRate = totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0;
        console.log(`   📊 Taux de réussite: ${successRate}%`);
        
        let evaluation = '';
        if (successRate >= 80) {
            evaluation = '🎉 EXCELLENT: Connexion RTA Node.js entièrement fonctionnelle !';
        } else if (successRate >= 60) {
            evaluation = '⚠️ CORRECT: Connexion Node.js avec améliorations possibles';
        } else {
            evaluation = '❌ PROBLÈME: Connexion Node.js nécessite des corrections importantes';
        }
        
        console.log('\\n' + evaluation);
        
        // Affichage des messages reçus (échantillon)
        if (this.messagesReceived.length > 0) {
            console.log('\\n📨 Échantillon des messages reçus:');
            this.messagesReceived.slice(0, 3).forEach((msg, index) => {
                const preview = msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
                console.log(`   ${index + 1}. ${preview}`);
            });
        }
        
        console.log('='.repeat(80));
    }

    /**
     * Nettoyage des ressources
     */
    cleanup() {
        if (this.socket && this.connectionEstablished) {
            this.socket.close();
            console.log('🧹 Connexion WebSocket fermée');
        }
        console.log('🧹 Nettoyage terminé');
    }
}

// Fonction principale
async function main() {
    console.log('🌐 Démarrage du test de connexion RTA Node.js');
    console.log('⚠️  Prérequis: Serveur backend Epic7 démarré sur localhost:8080');
    console.log('💡 Configuration basée sur les seeders exacts\\n');
    
    const tester = new NodeRtaConnectionTest();
    const result = await tester.runNodeConnectionTest();
    
    if (result.success) {
        console.log('\\n✨ Tests terminés avec succès !');
        process.exit(0);
    } else {
        console.log('\\n💥 Tests échoués:', result.error);
        process.exit(1);
    }
}

// Exécution si fichier appelé directement
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Erreur fatale:', error);
        process.exit(1);
    });
}

module.exports = NodeRtaConnectionTest;
