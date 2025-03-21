# **README - Installation et Configuration du Projet Epic7**

## 📌 **Prérequis**
Avant de commencer, assurez-vous d’avoir installé :
- [Node.js (LTS recommandé)](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/download/)
- [Maven](https://maven.apache.org/download.cgi)
- [Java 17+](https://adoptium.net/)

---

## 🛠 **Installation Backend**
### **1️⃣ Cloner le projet**
```sh
git clone https://github.com/Armvda11/Epic7.git
cd epic7/backend
```

### **2️⃣ Configurer PostgreSQL**
#### ✅ **Sur Mac**
```sh
brew install postgresql@14
brew services start postgresql
```

#### ✅ **Sur Linux (Debian/Ubuntu)**
```sh
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### ✅ **Sur Windows**
- Télécharger PostgreSQL depuis : [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
- Lancer **pgAdmin** pour configurer la base de données.

### **3️⃣ Créer la base de données et l'utilisateur**
Dans le terminal PostgreSQL (`psql`), exécuter :
```sql
CREATE DATABASE epic7;
CREATE USER epic7_user WITH ENCRYPTED PASSWORD 'password';
ALTER ROLE epic7_user SET client_encoding TO 'utf8';
ALTER ROLE epic7_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE epic7_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE epic7 TO epic7_user;

\c epic7  -- Se connecter à la base epic7

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO epic7_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO epic7_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO epic7_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epic7_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epic7_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO epic7_user;
```

### **4️⃣ Configurer le backend**
Modifier `src/main/resources/application.properties` :
```
spring.datasource.url=jdbc:postgresql://localhost:5432/epic7
spring.datasource.username=epic7_user
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
```

### **5️⃣ Lancer le backend**
```sh
mvn spring-boot:run
```
Le backend doit être accessible sur **http://localhost:8080**.

---

## 🎨 **Installation Frontend**
### **1️⃣ Installer les dépendances**
```sh
cd ../frontend
npm install
```

### **2️⃣ Configurer le frontend**
Si nécessaire, modifier `src/config.js` pour pointer vers l'API backend :
```js
export const API_BASE_URL = "http://localhost:8080/api";
```

### **3️⃣ Démarrer le frontend**
```sh
npm run dev
```
Accédez à **http://localhost:5173**.

---

## 🔄 **Arrêter les services**
| Service | Mac | Linux | Windows |
|---------|-----|-------|---------|
| PostgreSQL | `brew services stop postgresql` | `sudo systemctl stop postgresql` | Arrêter via pgAdmin ou le gestionnaire de services |
| Backend | `Ctrl + C` | `Ctrl + C` | `Ctrl + C` |
| Frontend | `Ctrl + C` | `Ctrl + C` | `Ctrl + C` |

---

## 📂 **Structure du projet**
```
epic7
│── backend  # Serveur Spring Boot
│   ├── src/main/java/com/epic7/backend
│   ├── pom.xml
│   └── ...
│
│── frontend  # Interface React
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
│
└── README.md
```

---

## ❓ **Dépannage**
### **Problèmes avec PostgreSQL ?**
- Vérifier si PostgreSQL fonctionne :
  ```sh
  sudo systemctl status postgresql  # Linux
  brew services list  # Mac
  ```
- Vérifier si l'utilisateur `epic7_user` a bien les permissions :
  ```sql
  SELECT * FROM pg_roles WHERE rolname = 'epic7_user';
  ```

### **Problèmes avec le backend ?**
- Vérifier les logs avec :
  ```sh
  mvn spring-boot:run
  ```
- Vérifier si la base est bien configurée avec `pgAdmin` ou `psql`.

### **Problèmes avec le frontend ?**
- Vider le cache et réinstaller :
  ```sh
  rm -rf node_modules package-lock.json
  npm install
  ```

---

Si vous avez des **problèmes**, ouvrez une **issue** ou contactez l'équipe. 🚀
Mais je conseil en cas d'Urgence de contacter les autorités compétentes
**GoatHagimont**  - **GrandChefBoris**
