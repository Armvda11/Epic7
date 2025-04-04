
# 🚀 Installation de la base de données PostgreSQL pour Epic7

Ce guide permet d'initialiser localement la base de données **`epic7`**, avec l'utilisateur **`epic7_user`**, et de créer la structure minimale pour démarrer le backend (avant exécution de Flyway).

---

## ✅ Prérequis

- PostgreSQL installé et fonctionnel (`psql --version`)
- Compte PostgreSQL administrateur (ex. : `postgres`)

---

## 📁 1. Télécharger ou copier le script

Nom du fichier : `prepare_epic7_env.sql`

> Ce script :
> - Crée la base `epic7` si elle n'existe pas
> - Crée l'utilisateur `epic7_user` avec mot de passe `password`
> - Crée une table `users` minimale
> - Donne les bons droits
> - Insère un utilisateur de test `hermas@example.com`

---

## 🧪 2. Lancer le script

Ouvre un terminal et exécute :

```bash
psql -U postgres -d postgres -f prepare_epic7_env.sql
```

> Si ton mot de passe te le demande, entre celui du compte `postgres`.

---

## 🔍 3. Vérifier l’état de la base

Ensuite, connecte-toi à la base :

```bash
psql -U postgres -d epic7
```

Et exécute les commandes suivantes :

### Lister les tables :

```sql
\dt
```

**Résultat attendu :**
```
       List of relations
 Schema | Name  | Type  |  Owner   
--------+-------+-------+----------
 public | users | table | postgres
```

---

### Voir la structure de la table `users` :

```sql
\d users
```

**Résultat attendu :**
```
                                   Table "public.users"
 Column  |          Type          | Modifiers 
---------+------------------------+-----------
 id      | integer                | not null default nextval('users_id_seq'::regclass)
 email   | character varying(255) | not null
 password| character varying(255) | not null
Indexes:
    "users_pkey" PRIMARY KEY (id)
    "users_email_key" UNIQUE (email)
```

---

### Voir les utilisateurs enregistrés :

```sql
SELECT * FROM users;
```

**Résultat attendu :**
```
 id |       email         |        password         
----+---------------------+--------------------------
 1  | hermas@example.com  | dummyhashedpassword
```

---

## 🏁 Prochaine étape

Dans le projet Spring Boot :

```properties
# application.properties
spring.datasource.url=jdbc:postgresql://localhost:5432/epic7
spring.datasource.username=epic7_user
spring.datasource.password=password
```

Ensuite, tu peux lancer le backend avec :

```bash
mvn spring-boot:run
```

---

## ❓ Besoin d’aide ?

> Si vous rencontrez un problème, contactez l’administrateur du projet (Hermas) ou vérifiez que PostgreSQL est bien démarré localement.

