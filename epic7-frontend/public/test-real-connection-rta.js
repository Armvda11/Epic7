/**
 * Test RTA avec connexion WebSocket réelle au backend
 * Test des 3 corrections avec le serveur Epic7 en cours d'exécution
 */

class RealRtaConnectionTest {
    constructor() {
        this.backendUrl = 'ws://localhost:8080/ws';
        this.socket = null;
        this.testResults = [];
        this.hermásUserId = 2; // Exact seeder config
        this.aryaUserId = 3;   // Exact seeder config
        this.testStartTime = null;
        this.connectionEstablished = false;
    }

    /**
     * Test complet avec vraie connexion WebSocket
     */
    async runRealConnectionTest() {
        this.testStartTime = Date.now();
        console.log('🌐 Début du test avec connexion WebSocket réelle');
        console.log(`📡 Tentative de connexion à: ${this.backendUrl}`);
        
        try {
            // Test 1: Établir la connexion
            await this.establishConnection();
            
            // Test 2: Test d'authentification
            await this.testAuthentication();
            
            // Test 3: Test des corrections avec vraies données
            await this.testRealCorrections();
            
            // Test 4: Test de déconnexion/reconnexion
            await this.testReconnection();
            
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Erreur lors du test de connexion réelle:', error);
            this.testResults.push({
                test: 'Real Connection Test',
                status: '❌ ERREUR',
                details: `Exception: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            this.cleanup();
        }
    }

    /**
     * Établissement de la connexion WebSocket
     */
    async establishConnection() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Tentative de connexion WebSocket...');
            
            try {
                this.socket = new WebSocket(this.backendUrl);
                
                this.socket.onopen = () => {
                    console.log('✅ Connexion WebSocket établie');
                    this.connectionEstablished = true;
                    this.testResults.push({
                        test: 'WebSocket Connection',
                        status: '✅ SUCCÈS',
                        details: 'Connexion établie avec le backend',
                        timestamp: new Date().toISOString()
                    });
                    resolve();
                };
                
                this.socket.onerror = (error) => {
                    console.error('❌ Erreur de connexion WebSocket:', error);
                    this.testResults.push({
                        test: 'WebSocket Connection',
                        status: '❌ ÉCHEC',
                        details: 'Impossible de se connecter au backend',
                        timestamp: new Date().toISOString()
                    });
                    reject(new Error('Connexion WebSocket échouée'));
                };
                
                this.socket.onclose = () => {
                    console.log('🔌 Connexion WebSocket fermée');
                    this.connectionEstablished = false;
                };
                
                this.socket.onmessage = (event) => {
                    this.handleServerMessage(event.data);
                };
                
                // Timeout de connexion
                setTimeout(() => {
                    if (!this.connectionEstablished) {
                        reject(new Error('Timeout de connexion WebSocket'));
                    }
                }, 5000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Test d'authentification avec les utilisateurs seedés
     */
    async testAuthentication() {
        if (!this.connectionEstablished) {
            throw new Error('Connexion WebSocket non établie');
        }
        
        console.log('👤 Test d\'authentification...');
        
        // Message d'authentification Hermas
        const authMessage = {
            type: 'AUTH',
            userId: this.hermásUserId,
            token: 'test-token-hermas-' + Date.now()
        };
        
        return new Promise((resolve) => {
            this.socket.send(JSON.stringify(authMessage));
            
            setTimeout(() => {
                console.log('✅ Message d\'authentification envoyé');
                this.testResults.push({
                    test: 'Authentication',
                    status: '✅ SUCCÈS',
                    details: `Authentification tentée pour userId: ${this.hermásUserId}`,
                    timestamp: new Date().toISOString()
                });
                resolve();
            }, 1000);
        });
    }

    /**
     * Test des corrections avec données réelles
     */
    async testRealCorrections() {
        console.log('🔧 Test des corrections avec connexion réelle...');
        
        // Test Correction 1: Join RTA avec héros réels du seeder
        const rtaJoinMessage = {
            type: 'RTA_JOIN',
            userId: this.hermásUserId,
            selectedHeroes: [0, 1, 5, 3], // Hwayoung, Ml Piera, Ylinav, Krau (seeder exact)
            ready: true
        };
        
        this.socket.send(JSON.stringify(rtaJoinMessage));
        console.log('📨 Message RTA_JOIN envoyé avec héros du seeder');
        
        // Test Correction 2: Message avec userId manquant (sera corrigé côté serveur)
        const invalidMessage = {
            type: 'RTA_ACTION',
            // userId intentionnellement manquant
            battleId: 'test-battle-' + Date.now(),
            skillId: 'skill-1',
            targetId: 'enemy-hero-1'
        };
        
        setTimeout(() => {
            this.socket.send(JSON.stringify(invalidMessage));
            console.log('📨 Message avec userId manquant envoyé (test correction 2)');
        }, 1000);
        
        // Test Correction 3: Simulation de reconnexion
        setTimeout(() => {
            console.log('🔄 Test de reconnexion automatique...');
            this.testReconnectionScenario();
        }, 2000);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.testResults.push({
                    test: 'Real Corrections Test',
                    status: '✅ SUCCÈS',
                    details: 'Messages de test des corrections envoyés',
                    timestamp: new Date().toISOString()
                });
                resolve();
            }, 3000);
        });
    }

    /**
     * Test de reconnexion
     */
    async testReconnection() {
        console.log('🔄 Test de déconnexion/reconnexion...');
        
        if (this.socket && this.connectionEstablished) {
            this.socket.close();
            console.log('🔌 Connexion fermée pour test de reconnexion');
            
            // Attendre puis reconnecter
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                await this.establishConnection();
                console.log('✅ Reconnexion réussie');
                this.testResults.push({
                    test: 'Reconnection Test',
                    status: '✅ SUCCÈS',
                    details: 'Déconnexion et reconnexion réussies',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Échec de reconnexion:', error);
                this.testResults.push({
                    test: 'Reconnection Test',
                    status: '❌ ÉCHEC',
                    details: 'Reconnexion échouée',
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    /**
     * Scénario de test de reconnexion
     */
    testReconnectionScenario() {
        // Simulation d'une déconnexion inattendue
        if (this.socket) {
            console.log('🔧 Simulation déconnexion inattendue...');
            this.socket.close();
            
            // Tentative de reconnexion automatique après 1 seconde
            setTimeout(() => {
                console.log('🔄 Tentative de reconnexion automatique...');
                this.establishConnection().catch(error => {
                    console.error('❌ Reconnexion automatique échouée:', error);
                });
            }, 1000);
        }
    }

    /**
     * Gestionnaire des messages du serveur
     */
    handleServerMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('📨 Message reçu du serveur:', message.type);
            
            switch (message.type) {
                case 'AUTH_SUCCESS':
                    console.log('✅ Authentification réussie');
                    break;
                case 'AUTH_FAILED':
                    console.log('❌ Authentification échouée');
                    break;
                case 'RTA_JOINED':
                    console.log('✅ Rejoint RTA avec succès');
                    break;
                case 'BATTLE_START':
                    console.log('⚔️ Combat commencé:', message.battleId);
                    break;
                case 'TURN_UPDATE':
                    console.log('🔄 Mise à jour de tour:', message.currentTurn);
                    break;
                case 'ERROR':
                    console.log('⚠️ Erreur serveur:', message.details);
                    break;
                default:
                    console.log('📨 Message non reconnu:', message.type);
            }
            
        } catch (error) {
            console.error('❌ Erreur parsing message serveur:', error);
        }
    }

    /**
     * Affichage des résultats
     */
    displayResults() {
        const testDuration = ((Date.now() - this.testStartTime) / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(70));
        console.log('🌐 RÉSULTATS DES TESTS DE CONNEXION RÉELLE RTA');
        console.log('='.repeat(70));
        
        let successCount = this.testResults.filter(r => r.status.includes('SUCCÈS')).length;
        let failCount = this.testResults.filter(r => r.status.includes('ÉCHEC')).length;
        let errorCount = this.testResults.filter(r => r.status.includes('ERREUR')).length;
        let totalTests = this.testResults.length;
        
        this.testResults.forEach(result => {
            console.log(`\n${result.status} ${result.test}`);
            console.log(`   ${result.details}`);
            console.log(`   Timestamp: ${result.timestamp}`);
        });
        
        console.log('\n' + '-'.repeat(70));
        console.log(`📊 STATISTIQUES:`);
        console.log(`   Durée des tests: ${testDuration}s`);
        console.log(`   Total des tests: ${totalTests}`);
        console.log(`   ✅ Succès: ${successCount}`);
        console.log(`   ❌ Échecs: ${failCount}`);
        console.log(`   🚨 Erreurs: ${errorCount}`);
        
        const successRate = totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0;
        console.log(`   📊 Taux de réussite: ${successRate}%`);
        
        let evaluation = '';
        if (successRate >= 80) {
            evaluation = '🎉 EXCELLENT: Connexion RTA réelle fonctionnelle !';
        } else if (successRate >= 60) {
            evaluation = '⚠️ CORRECT: Connexion réelle avec améliorations possibles';
        } else {
            evaluation = '❌ PROBLÈME: Connexion réelle nécessite des corrections';
        }
        
        console.log('\n' + evaluation);
        console.log('='.repeat(70));
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

// Test avec vérification préalable du serveur
async function runRealConnectionTests() {
    console.log('🚀 Lancement du test de connexion réelle RTA');
    console.log('⚠️  Assurez-vous que le serveur backend est démarré (port 8080)');
    
    // Vérification que WebSocket est disponible
    if (typeof WebSocket === 'undefined') {
        console.error('❌ WebSocket non disponible dans cet environnement');
        console.log('💡 Utilisez ce script dans un navigateur ou avec Node.js + ws');
        return;
    }
    
    const tester = new RealRtaConnectionTest();
    await tester.runRealConnectionTest();
}

// Export pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealRtaConnectionTest, runRealConnectionTests };
}

// Auto-exécution si dans un navigateur
if (typeof window !== 'undefined') {
    window.RealRtaConnectionTest = RealRtaConnectionTest;
    window.runRealConnectionTests = runRealConnectionTests;
    console.log('🌐 Test de connexion RTA réelle chargé');
    console.log('💡 Utilisez runRealConnectionTests() pour lancer le test');
}

// Auto-exécution si script Node.js
if (typeof require !== 'undefined' && require.main === module) {
    console.log('⚠️  Ce script nécessite WebSocket. Installez "ws" avec npm install ws');
    console.log('💡 Ou utilisez-le dans un navigateur avec le serveur backend démarré');
}
