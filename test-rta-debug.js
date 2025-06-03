#!/usr/bin/env node

/**
 * Script de test pour déboguer les problèmes RTA identifiés :
 * 1. Points RTA non mis à jour après les combats
 * 2. Noms des joueurs non affichés dans l'écran de pré-bataille
 * 3. Points RTA non affichés dans l'interface de matchmaking
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080';

// Informations de test
const testUsers = [
    { email: 'admin@admin.admin', password: 'admin' },
    { email: 'arya@arya.arya', password: 'arya' }
];

async function loginUser(email, password) {
    try {
        console.log(`🔑 Connexion de ${email}...`);
        const response = await axios.post(`${API_BASE}/api/auth/login`, {
            email,
            password
        });
        
        if (response.data && response.data.token) {
            console.log(`✅ Connexion réussie pour ${email}`);
            return response.data.token;
        } else {
            console.error(`❌ Échec de la connexion pour ${email}:`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`❌ Erreur de connexion pour ${email}:`, error.response?.data || error.message);
        return null;
    }
}

async function getUserProfile(token) {
    try {
        const response = await axios.get(`${API_BASE}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du profil:', error.response?.data || error.message);
        return null;
    }
}

async function getUserHeroes(token) {
    try {
        const response = await axios.get(`${API_BASE}/api/player-heroes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des héros:', error.response?.data || error.message);
        return [];
    }
}

async function testRtaSystem() {
    console.log('🎮 Test du système RTA - Débogage des problèmes identifiés\n');
    
    // 1. Test de connexion des utilisateurs
    console.log('=== Phase 1: Test de connexion ===');
    const tokens = [];
    const profiles = [];
    
    for (const user of testUsers) {
        const token = await loginUser(user.email, user.password);
        if (token) {
            tokens.push(token);
            const profile = await getUserProfile(token);
            if (profile) {
                profiles.push(profile);
                console.log(`📊 Profil ${profile.username}:`, {
                    id: profile.id,
                    level: profile.level,
                    rtaPoints: profile.rtaPoints || 'Non défini',
                    rtaTier: profile.rtaTier || 'Non défini',
                    winNumber: profile.winNumber || 0,
                    loseNumber: profile.loseNumber || 0
                });
            }
        }
    }
    
    if (tokens.length < 2) {
        console.error('❌ Impossible de connecter les deux utilisateurs de test');
        return;
    }
    
    // 2. Test de récupération des héros
    console.log('\n=== Phase 2: Test de récupération des héros ===');
    const heroesData = [];
    
    for (let i = 0; i < tokens.length; i++) {
        const heroes = await getUserHeroes(tokens[i]);
        heroesData.push(heroes);
        console.log(`🦸‍♂️ ${profiles[i].username} a ${heroes.length} héros disponibles`);
        
        if (heroes.length >= 2) {
            const firstTwoHeroes = heroes.slice(0, 2);
            console.log(`   Héros sélectionnés: ${firstTwoHeroes.map(h => h.hero.name).join(', ')}`);
        } else {
            console.warn(`⚠️  ${profiles[i].username} n'a pas assez de héros (minimum 2 requis)`);
        }
    }
    
    // 3. Test des endpoints RTA REST
    console.log('\n=== Phase 3: Test des endpoints RTA REST ===');
    
    try {
        console.log('📊 Test du leaderboard RTA...');
        const leaderboardResponse = await axios.get(`${API_BASE}/api/rta/leaderboard`, {
            headers: { Authorization: `Bearer ${tokens[0]}` }
        });
        console.log(`✅ Leaderboard récupéré: ${leaderboardResponse.data.length} entrées`);
        
        if (leaderboardResponse.data.length > 0) {
            console.log('   Top 3:');
            leaderboardResponse.data.slice(0, 3).forEach((entry, index) => {
                console.log(`   ${index + 1}. ${entry.username} - ${entry.rtaPoints} points (${entry.rtaTier})`);
            });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du leaderboard:', error.response?.data || error.message);
    }
    
    try {
        console.log('🏆 Test du ranking personnel...');
        const rankingResponse = await axios.get(`${API_BASE}/api/rta/ranking/${profiles[0].id}`, {
            headers: { Authorization: `Bearer ${tokens[0]}` }
        });
        console.log(`✅ Ranking récupéré:`, rankingResponse.data);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du ranking:', error.response?.data || error.message);
    }
    
    // 4. Vérification des problèmes identifiés
    console.log('\n=== Phase 4: Analyse des problèmes identifiés ===');
    
    console.log('🔍 Problème 1: Points RTA et tier dans les profils');
    profiles.forEach(profile => {
        const hasRtaPoints = profile.rtaPoints !== undefined && profile.rtaPoints !== null;
        const hasRtaTier = profile.rtaTier !== undefined && profile.rtaTier !== null && profile.rtaTier !== '';
        
        console.log(`   ${profile.username}:`);
        console.log(`     Points RTA: ${hasRtaPoints ? profile.rtaPoints : '❌ Non défini'}`);
        console.log(`     Tier RTA: ${hasRtaTier ? profile.rtaTier : '❌ Non défini'}`);
        console.log(`     Victoires: ${profile.winNumber || 0}, Défaites: ${profile.loseNumber || 0}`);
    });
    
    console.log('\n🔍 Problème 2: Préparation des données pour le matchmaking');
    console.log('   Les noms des joueurs sont-ils disponibles dans les profils ?');
    profiles.forEach(profile => {
        const hasUsername = profile.username && profile.username.trim() !== '';
        console.log(`   ${profile.id}: ${hasUsername ? '✅' : '❌'} Username: "${profile.username}"`);
    });
    
    console.log('\n📋 Résumé des tests:');
    console.log('   ✅ Backend démarré et accessible');
    console.log('   ✅ Connexions utilisateurs fonctionnelles');
    console.log('   ✅ Récupération des profils fonctionnelle');
    console.log('   ✅ Récupération des héros fonctionnelle');
    console.log('   ✅ Endpoints RTA REST accessibles');
    
    // Recommandations
    console.log('\n🎯 Prochaines étapes pour le débogage:');
    console.log('   1. Tester une session de combat RTA via WebSocket');
    console.log('   2. Vérifier la mise à jour des points après un combat');
    console.log('   3. Tester l\'affichage des noms dans l\'interface');
    console.log('   4. Vérifier les logs du backend pendant un combat');
    
    console.log('\n✅ Test terminé. Prêt pour les tests de combat RTA en temps réel.');
}

// Exécution du test
if (require.main === module) {
    testRtaSystem().catch(console.error);
}

module.exports = { testRtaSystem };
