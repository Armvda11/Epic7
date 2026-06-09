# Epic7

Epic7 est une application web full-stack développée avec un backend Spring Boot et un frontend React.
Le projet met en œuvre une architecture applicative classique autour d’une API REST, d’une base PostgreSQL, d’un cache Redis et d’un environnement local conteneurisé avec Docker Compose.

L’objectif du projet est de construire une application structurée autour de la gestion d’utilisateurs, de héros, d’équipements et de mécaniques de combat, avec une séparation claire entre la logique backend, l’interface frontend et les services d’infrastructure.

---

## Stack technique

### Backend

* Java 17
* Spring Boot
* Maven
* Spring Data JPA
* PostgreSQL
* Redis
* JWT pour l’authentification
* API REST

### Frontend

* React
* Vite
* Tailwind CSS


### Environnement

* Docker
* Docker Compose
* Git

---

## Architecture du projet

```text
Epic7/
├── backend/
│   ├── docker-compose.yml
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/epic7/backend/
│   │   │   │   ├── controller/     # Contrôleurs REST
│   │   │   │   ├── service/        # Logique métier
│   │   │   │   ├── repository/     # Accès aux données via JPA
│   │   │   │   ├── model/          # Entités métier
│   │   │   │   ├── dto/            # Objets de transfert
│   │   │   │   ├── config/         # Configuration Spring
│   │   │   │   ├── security/       # Gestion de la sécurité et JWT
│   │   │   │   └── utils/          # Fonctions utilitaires
│   │   │   └── resources/
│   │   │       └── application.properties
│   └── pom.xml
│
└── epic7-frontend/
    ├── public/
    ├── src/
    │   ├── pages/                 # Pages principales
    │   ├── components/            # Composants réutilisables
    │   ├── context/               # Contextes React
    │   ├── services/              # Services d’appel API
    │   └── api/                   # Configuration Axios
    └── package.json
```

---

## Fonctionnalités principales

* Authentification des utilisateurs avec JWT
* Exposition d’une API REST côté backend
* Gestion des entités métier avec Spring Data JPA
* Persistance des données dans PostgreSQL
* Utilisation de Redis pour certains traitements applicatifs
* Interface utilisateur React consommant l’API backend
* Séparation entre contrôleurs, services, repositories, DTO et modèles
* Environnement local reproductible avec Docker Compose

---

## Installation

### Prérequis

Avant de lancer le projet, installer :

* Java 17 ou supérieur
* Maven
* Node.js LTS
* Docker
* Docker Compose

---

## Lancement du backend

Se placer dans le dossier backend :

```bash
cd backend
```

Créer un fichier `.env` à partir du modèle suivant :

```env
POSTGRES_DB=epic7
POSTGRES_USER=epic7_user
POSTGRES_PASSWORD=change_me_local_only
REDIS_HOST=redis
REDIS_PORT=6379
```

Lancer les services nécessaires au backend :

```bash
docker-compose up -d
```

Vérifier que PostgreSQL et Redis sont bien démarrés :

```bash
docker ps
```

Lancer l’application Spring Boot :

```bash
./mvnw spring-boot:run
```

L’API backend est disponible par défaut sur :

```text
http://localhost:8080
```

---

## Lancement du frontend

Se placer dans le dossier frontend :

```bash
cd epic7-frontend
```

Installer les dépendances :

```bash
npm install
```

Créer un fichier `.env` avec l’URL de l’API backend :

```env
VITE_API_URL=http://localhost:8080/api
```

Lancer le serveur de développement :

```bash
npm run dev
```

L’interface frontend est disponible par défaut sur :

```text
http://localhost:5173
```

---

## Services Docker

| Service     | Port | Rôle                               |
| ----------- | ---: | ---------------------------------- |
| PostgreSQL  | 5432 | Base de données relationnelle      |
| Redis       | 6379 | Cache / service applicatif         |
| Spring Boot | 8080 | API backend, lancée hors conteneur |

---

## Commandes utiles

Accéder à PostgreSQL :

```bash
docker exec -it epic7-postgres psql -U epic7_user -d epic7
```

Accéder à Redis :

```bash
docker exec -it epic7-redis redis-cli
```

Arrêter les services Docker :

```bash
docker-compose down
```

Supprimer les services et les volumes locaux :

```bash
docker-compose down -v
```

Afficher les logs des services :

```bash
docker-compose logs -f
```

---

## Vérifications

Compiler et tester le backend :

```bash
cd backend
./mvnw test
```

Compiler le frontend :

```bash
cd epic7-frontend
npm run build
```

---
