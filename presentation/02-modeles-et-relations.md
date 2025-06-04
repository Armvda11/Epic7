# Modèles et Relations du Backend Epic7

## Vue d'Ensemble des Entités

Le backend d'Epic7 est construit autour d'un ensemble d'entités (modèles) qui représentent les concepts fondamentaux du jeu. Ces entités sont reliées entre elles par diverses relations (one-to-many, many-to-one, many-to-many, one-to-one) qui modélisent la structure du jeu.

## Entités Principales

### User (Utilisateur)

L'entité `User` est au cœur du système. Elle représente un joueur avec ses attributs et ressources :

```java
@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
```

**Attributs clés** :
- Informations de compte (email, mot de passe, nom d'utilisateur)
- Ressources (or, diamants, énergie)
- Statistiques de jeu (niveau, rang, victoires/défaites)
- Classements (arène, RTA)
- Dates importantes (inscription, dernière connexion)

**Relations** :
- `@OneToMany` avec `PlayerHero` : Les héros possédés par l'utilisateur
- `@OneToMany` avec `PlayerEquipment` : Les équipements possédés
- `@OneToOne` avec `GuildMembership` : L'appartenance à une guilde
- `@ManyToMany` avec `User` : Les amis de l'utilisateur

Le modèle User possède également des méthodes utilitaires pour gérer ses relations et attributs :
- `addHero()`, `addEquipment()`, `addFriend()`, etc.
- `getHeroesNumber()`, `getGuildName()`, etc.

### Hero & PlayerHero

Le système utilise une séparation intelligente entre :

1. **Hero** : Modèle de référence qui définit un héros générique
   ```java
   @Entity
   @Table(name = "heroes")
   ```
   - Contient les attributs de base (nom, élément, rareté, statistiques de base)
   - Lié à `Skill` pour les compétences disponibles
   - Peut apparaître dans plusieurs bannières d'invocation

2. **PlayerHero** : Instance spécifique d'un héros possédé par un joueur
   ```java
   @Entity
   @Table(name = "player_heroes")
   ```
   - Référence à la fois le `User` (propriétaire) et le `Hero` (modèle)
   - Contient les attributs spécifiques à l'instance (niveau, expérience, étoiles)
   - Peut avoir des équipements attachés

Cette séparation permet d'avoir une seule définition de référence pour chaque héros, tout en permettant à chaque joueur d'avoir sa propre version avec des statistiques uniques.

### Guild & GuildMembership

Comme pour les héros, une séparation est faite entre :

1. **Guild** : Définit une guilde avec ses attributs
   ```java
   @Entity
   @Table(name = "guilds")
   ```
   - Attributs de base (nom, niveau, description)
   - Lié à `GuildMembership` pour gérer les membres

2. **GuildMembership** : Représente l'appartenance d'un utilisateur à une guilde
   ```java
   @Entity
   @Table(name = "guild_memberships")
   ```
   - Joue le rôle de table de jointure avec des attributs
   - Stocke le rôle de l'utilisateur dans la guilde (chef, officier, membre)
   - Gère la date d'adhésion

Cette conception permet de gérer proprement les rôles dans les guildes et d'ajouter facilement des attributs à la relation membre-guilde.

### Equipment & PlayerEquipment

Même principe que pour les héros :

1. **Equipment** : Définition générique d'un équipement
   - Type, statistiques de base, rareté

2. **PlayerEquipment** : Instance spécifique possédée par un joueur
   - Référence à `User` et `Equipment`
   - Peut être équipé par un `PlayerHero`
   - Possède des statistiques uniques (niveau, améliorations)

### Autres Entités Importantes

- **Banner** : Représente une bannière d'invocation avec ses taux et héros disponibles
- **Skill** : Définit une compétence de héros avec ses effets et multiplicateurs
- **Message** : Gère les messages entre utilisateurs
- **ShopItem** & **ShopPurchase** : Gèrent les articles de la boutique et les achats

## Relations Complexes

### Système d'Amis

Le système d'amis utilise une relation auto-référentielle Many-to-Many sur `User` :

```java
@ManyToMany(cascade = CascadeType.ALL)
@JoinTable(name = "user_friends",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "friend_id"))
private List<User> friends;
```

De plus, les demandes d'amis en attente sont gérées par :

```java
@ElementCollection
@CollectionTable(
    name = "user_pending_friend_requests",
    joinColumns = @JoinColumn(name = "user_id")
)
@Column(name = "pending_friend")
private List<Long> pendingFriendRequests = new ArrayList<>();
```

### Équipement des Héros

La relation entre `PlayerHero` et `PlayerEquipment` est modélisée pour permettre à un héros d'avoir plusieurs équipements, mais chaque équipement ne peut être utilisé que par un seul héros à la fois.

## Utilisation de Lombok

Pour réduire le code boilerplate, les annotations Lombok sont utilisées :

```java
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder // Pour certaines entités
```

Ces annotations génèrent automatiquement les getters, setters, constructeurs et méthodes builder, rendant le code plus propre et plus facile à maintenir.

## Validation des Données

Jakarta Validation est utilisé pour la validation des données :

```java
@NotBlank
@Email
@Min(0)
```

Ces annotations garantissent l'intégrité des données avant leur persistance en base de données.

## Conclusion

L'architecture des entités et de leurs relations dans Epic7 est conçue pour être à la fois flexible et robuste. La séparation entre les définitions génériques (Hero, Equipment) et les instances spécifiques aux joueurs (PlayerHero, PlayerEquipment) permet une grande flexibilité tout en maintenant l'intégrité des données. Les relations entre entités modélisent fidèlement les concepts du jeu, facilitant ainsi l'implémentation des fonctionnalités métier.
