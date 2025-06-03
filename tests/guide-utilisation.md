# 🎮 GUIDE D'UTILISATION - Tests RTA Epic7

## 📋 Vue d'Ensemble

Ce dossier contient une suite complète de tests pour le système RTA (Real-Time Arena) d'Epic7, basés sur la configuration exacte des seeders du backend.

## 🚀 Scripts Disponibles

### 📦 Installation
```bash
npm install
```

### 🧪 Tests Disponibles

#### 1. **Test Simple Basique** 
```bash
npm run test
```
- **Fichier**: `test-rta-simple.js`
- **Description**: Test de simulation RTA sans connexion réseau
- **Fonctionnalités**: Calculs de combat, ordre des tours, logique de base

#### 2. **Test Connexion WebSocket Native**
```bash
npm run test-connection  
```
- **Fichier**: `test-node-rta-connection.js`
- **Description**: Test de connexion WebSocket directe (échoue volontairement - mauvais protocole)
- **Objectif**: Démontrer pourquoi STOMP est nécessaire

#### 3. **Test Connexion STOMP Avancée**
```bash
npm run test-stomp
```
- **Fichier**: `test-stomp-rta-connection.js`
- **Description**: Test STOMP complet avec authentification
- **Statut**: Peut timeout si authentification JWT manquante

#### 4. **Test STOMP Simplifié** ⭐ **RECOMMANDÉ**
```bash
npm run test-simple
```
- **Fichier**: `test-simple-stomp.js`
- **Description**: Test STOMP fonctionnel sans authentification
- **Résultat**: ✅ 100% de réussite
- **Validations**: Les 3 corrections principales + connexion

#### 5. **Démonstration Complète** 🎯 **SHOWCASE**
```bash
npm run demo
```
- **Fichier**: `demo-rta-integration.js`
- **Description**: Démonstration interactive complète du système RTA
- **Fonctionnalités**: 
  - Connexion serveur
  - Simulation de bataille 2v2 (hermas vs arya)
  - Validation des 3 corrections
  - Combat tour par tour avec dégâts réalistes

## 🛠️ Corrections Testées

### 1. **Correction Index de Tour Automatique**
- **Problème**: Index de tour invalide (-1, hors limites)
- **Solution**: Réinitialisation automatique à 0
- **Test**: ✅ Validé dans tous les scripts

### 2. **Attribution UserId Automatique**
- **Problème**: Actions sans userId spécifié
- **Solution**: Attribution basée sur la possession des héros
- **Test**: ✅ Validé dans tous les scripts

### 3. **Ordre des Tours Basé sur Vitesse**
- **Problème**: Gestion robuste de l'ordre des tours
- **Solution**: Tri par vitesse décroissante avec bouclage automatique
- **Test**: ✅ Validé avec données réelles du seeder

## 📊 Configuration du Seeder

### 👥 Joueurs
- **hermas** (ID: 2) - Joueur principal
- **arya** (ID: 3) - Joueur secondaire

### 🦸 Héros Possédés (les deux joueurs)
- **Hwayoung** (ID: 0) - Vitesse: 147/142
- **Ml Piera** (ID: 1) - Vitesse: 160/155  
- **Ylinav** (ID: 5) - Vitesse: 142/138
- **Krau** (ID: 3) - Vitesse: 140/135

### ⚡ Ordre de Tour Calculé (Exemple)
1. **Ml Piera** (hermas) - 160 vitesse
2. **Hwayoung** (hermas) - 147 vitesse
3. **Hwayoung** (arya) - 142 vitesse
4. **Krau** (arya) - 135 vitesse

## 🔧 Prérequis

### ✅ Serveur Backend
- **Epic7 Backend** doit être démarré sur `localhost:8080`
- **WebSocket/STOMP** accessible sur `/ws`
- **Seeders** doivent être initialisés

### 📦 Dépendances Node.js
- `ws` - WebSocket client
- `sockjs-client` - SockJS client  
- `@stomp/stompjs` - STOMP protocol client

## 📈 Résultats Attendus

### ✅ Test Simple STOMP (`npm run test-simple`)
```
📊 Tests exécutés: 4
📈 Bilan: 4 succès, 0 échecs

1. Basic STOMP Connection ✅ SUCCÈS
2. Turn Index Correction ✅ SUCCÈS  
3. UserId Attribution ✅ SUCCÈS
4. Speed-Based Turn Order ✅ SUCCÈS
```

### 🎯 Démonstration Complète (`npm run demo`)
```
📈 Taux de Réussite: 6/6 (100%)

🎉 DÉMONSTRATION COMPLÈTEMENT RÉUSSIE!
✅ Système RTA opérationnel avec toutes les corrections
```

## 📁 Structure des Fichiers

```
tests/
├── package.json              # Configuration npm
├── configuration-seeder.md   # Documentation du seeder  
├── rapport-final-tests-rta.md # Rapport complet
├── guide-utilisation.md      # Ce fichier
├── test-rta-simple.js        # Test simulation basique
├── test-node-rta-connection.js # Test WebSocket natif
├── test-stomp-rta-connection.js # Test STOMP avancé
├── test-simple-stomp.js      # Test STOMP simplifié ⭐
└── demo-rta-integration.js   # Démonstration complète 🎯
```

## 🎯 Recommandations

### 🥇 Pour Débuter
1. Exécuter `npm run test-simple` pour valider les corrections
2. Exécuter `npm run demo` pour voir le système en action

### 🔧 Pour le Développement  
1. Utiliser `test-simple-stomp.js` comme base pour nouveaux tests
2. S'assurer que le backend Epic7 est démarré avant les tests
3. Adapter l'authentification JWT si nécessaire

### 🚀 Pour la Production
1. Implémenter l'authentification JWT complète
2. Ajouter des tests de charge avec plusieurs connexions
3. Surveiller les métriques WebSocket en temps réel

---

*Guide généré le 3 juin 2025 - Epic7 RTA Test Suite*
