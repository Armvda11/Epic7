# 🚀 Epic7 - Guide de Déploiement et Architecture

---

## 📦 Prérequis

Avant de commencer, installez :

- [Java 17+](https://adoptium.net/)
- [Maven](https://maven.apache.org/)
- [Docker + Docker Compose](https://www.docker.com/)
- [Node.js (LTS)](https://nodejs.org/)

---

## 🧱 Architecture Générale

```
Epic7/
├── backend/               # Serveur Spring Boot
│   ├── docker-compose.yml
│   ├── .env               # Variables d'environnement (non versionnées)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/epic7/backend/
│   │   │   │   ├── controller/         # Contrôleurs REST (API)
│   │   │   │   ├── service/            # Logique métier (Combat, Guildes, RTA)
│   │   │   │   ├── repository/         # Interfaces JPA vers PostgreSQL
│   │   │   │   ├── model/              # Entités (Hero, Equipment, Guild, etc.)
│   │   │   │   ├── config/             # Configuration Spring, JWT, Seeds
│   │   │   │   ├── dto/                # Objets de transfert (DTO)
│   │   │   │   ├── security/           # Filtre JWT
│   │   │   │   └── utils/              # Aides diverses (JWT, Mapper)
│   │   │   └── resources/
│   │   │       └── application.properties
│   └── pom.xml
│
├── epic7-frontend/        # Frontend React + Vite + Tailwind
│   ├── public/            # Images, icônes, sprites des héros
│   ├── src/
│   │   ├── pages/         # Pages principales (Login, Dashboard, Battle...)
│   │   ├── components/    # Composants réutilisables (Battle, Héros, Equip...)
│   │   ├── context/       # Contexte global (Settings, Battle...)
│   │   ├── services/      # Appels API (heroService, userService...)
│   │   └── api/           # Axios instance configurée
│   └── package.json
```

---

## ⚙️ Installation Backend

### 1. Cloner le projet
```bash
git clone https://github.com/Armvda11/Epic7.git
cd Epic7/backend
```

### 2. Créer le fichier `.env`
```env
POSTGRES_DB=epic7
POSTGRES_USER=epic7_user
POSTGRES_PASSWORD=password
REDIS_HOST=redis
REDIS_PORT=6379
```

### 3. Lancer les services Docker
```bash
docker-compose up -d
```

Vérifie que les services tournent :
```bash
docker ps
```

### 4. Lancer le backend
```bash
./mvnw spring-boot:run
```

📍 Accessible à : `http://localhost:8080`

---

## 🎨 Installation Frontend

### 1. Aller dans le dossier frontend
```bash
cd ../epic7-frontend
npm install
```

### 2. Configurer l'URL de l'API

Dans `.env` :
```env
VITE_API_URL=http://localhost:8080/api
```

### 3. Démarrer le frontend
```bash
npm run dev
```

🌐 Interface sur : `http://localhost:5173`

---

## 🛠️ Services Docker

| Service     | Port | Description                 |
|-------------|------|-----------------------------|
| PostgreSQL  | 5432 | Base de données             |
| Redis       | 6379 | File matchmaking / combat   |
| Spring Boot | 8080 | Serveur API (hors conteneur) |

### Accès rapide :
```bash
# Accès PostgreSQL :
docker exec -it epic7-postgres psql -U epic7_user -d epic7

# Accès Redis :
docker exec -it epic7-redis redis-cli
> ping
```

---

## 🧪 Débogage

- Logs backend : `./mvnw spring-boot:run`
- Rebuild Node : `rm -rf node_modules && npm install`
- Vérifier PostgreSQL : `docker logs epic7-postgres`
- Vérifier Redis : `docker logs epic7-redis`

---

## 🐳 Gestion des conteneurs Docker

### Commandes de base
```bash
# Vérifier les conteneurs en cours d'exécution
docker ps

# Vérifier tous les conteneurs (même arrêtés)
docker ps -a

# Arrêter les conteneurs
docker-compose down

# Redémarrer les conteneurs
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Arrêter et supprimer les conteneurs (garde les volumes)
docker-compose down

# Arrêter et supprimer les conteneurs ET les volumes (⚠️ perte de données)
docker-compose down -v

# Supprimer toutes les images, conteneurs, volumes et réseaux inutilisés
docker system prune -a --volumes

# Supprimer un conteneur spécifique
docker rm epic7-postgres
docker rm epic7-redis

# Redémarrage complet (arrêt, suppression et recréation)
docker-compose down && docker-compose up -d
```

---

## 🤝 Aide & Maintenance

> Si un bug étrange surgit, invoquez les forces anciennes :
> - `git reset --hard`
> - `docker system prune`
> - `rm -rf target/`

Et si tout échoue…  
C'est la faute de **Wilkens**


> NB : Si il n'y a que des meufs comme personnages dans le projet n'oubliez pas que **Wilkens** est un membre du groupe

Aussi n'oubliez pas :
> Celui qui pousse du code qui ne marche que chez lui... sera maudit à jamais.

---

Bon développement à toute l'équipe