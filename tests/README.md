# 🎮 Epic7 RTA Test Suite

[![Tests](https://img.shields.io/badge/Tests-6%2F6%20Passing-brightgreen.svg)](./rapport-final-tests-rta.md)
[![STOMP](https://img.shields.io/badge/WebSocket-STOMP%20Compatible-blue.svg)](#)
[![Seeder](https://img.shields.io/badge/Config-Seeder%20Exact-orange.svg)](./configuration-seeder.md)

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Test recommandé (connexion + corrections)
npm run test-simple

# Démonstration complète
npm run demo
```

## 📊 Résultats

✅ **Connexion WebSocket/STOMP** - Opérationnelle  
✅ **Correction Index de Tour** - Validée  
✅ **Attribution UserId** - Validée  
✅ **Ordre Basé sur Vitesse** - Validé  
✅ **Simulation de Bataille** - Fonctionnelle  
✅ **Configuration Seeder** - 100% Exacte  

## 🎯 Tests Disponibles

| Script | Description | Statut |
|--------|-------------|--------|
| `npm run test-simple` | Test STOMP + Corrections | ✅ 100% |
| `npm run demo` | Démonstration complète | ✅ 100% |
| `npm run test` | Simulation basique | ✅ 100% |
| `npm run test-stomp` | STOMP avancé | ⚠️ Auth |
| `npm run test-connection` | WebSocket natif | ❌ Protocole |

## 📋 Configuration

**Joueurs testés**: hermas (ID: 2) vs arya (ID: 3)  
**Héros**: Configuration exacte du seeder Epic7  
**Backend**: localhost:8080 (STOMP WebSocket)  

## 📚 Documentation

- [📊 Rapport Final](./rapport-final-tests-rta.md) - Résultats complets
- [📖 Guide d'Utilisation](./guide-utilisation.md) - Instructions détaillées  
- [⚙️ Configuration Seeder](./configuration-seeder.md) - Données exactes

---

**Status**: ✅ Mission Accomplie - Système RTA opérationnel avec toutes les corrections validées
