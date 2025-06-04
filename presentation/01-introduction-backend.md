# Introduction au Backend Epic7

## Présentation Générale

Le backend d'Epic7 est une application Java robuste basée sur le framework Spring Boot, conçue pour soutenir un jeu de type RPG multijoueur. Cette architecture backend fournit une API RESTful complète qui permet au frontend de communiquer efficacement avec la base de données et les services métier.

## Architecture Globale

L'architecture du backend suit le modèle MVC (Modèle-Vue-Contrôleur) adapté aux API REST, où :

- **Modèle** : Représente les entités métier comme `User`, `Hero`, `Guild`, etc.
- **Contrôleur** : Gère les requêtes HTTP entrantes et renvoie les réponses appropriées
- **Service** : Contient la logique métier, effectue les opérations CRUD et implémente les règles du jeu

En plus de cela, l'application utilise :

- **Repositories** : Interfaces pour l'accès aux données via Spring Data JPA
- **DTO (Data Transfer Objects)** : Objets utilisés pour transférer des données entre les couches
- **Configuration** : Classes pour configurer Spring Security, WebSocket, etc.
- **Exception** : Gestion des erreurs personnalisées
- **Utilitaires** : Classes utilitaires pour diverses fonctionnalités (JWT, etc.)

## Technologies Principales

Le backend Epic7 est construit avec les technologies suivantes :

- **Java** : Langage de programmation principal
- **Spring Boot** : Framework pour le développement rapide d'applications Java
- **Spring Security** : Pour l'authentification et l'autorisation
- **Spring Data JPA** : Pour la persistance des données
- **Hibernate** : ORM (Object-Relational Mapping)
- **WebSocket** : Pour les communications en temps réel (chat, combat RTA)
- **JWT (JSON Web Tokens)** : Pour l'authentification sans état
- **Base de données** : PostgreSQL (via Docker)

## Points Forts du Backend

1. **Sécurité Robuste** : Authentification JWT, protection contre les attaques CSRF, validation des entrées
2. **Architecture Modulaire** : Organisation claire des composants pour une maintenance facilitée
3. **Extensibilité** : Conçue pour faciliter l'ajout de nouvelles fonctionnalités
4. **Communication en Temps Réel** : WebSockets pour les fonctionnalités comme le chat et les combats RTA
5. **Documentation** : Code bien documenté avec des commentaires clairs et javadoc

Dans les sections suivantes, nous explorerons en détail chaque aspect du backend, en expliquant les choix de conception, les relations entre les entités et les fonctionnalités implémentées.
