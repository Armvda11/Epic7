# Architecture des Services et Contrôleurs

## Vue d'Ensemble

L'architecture backend d'Epic7 suit le modèle en couches typique d'une application Spring Boot, avec une séparation claire des responsabilités. Cette organisation améliore la maintenabilité, la testabilité et l'évolutivité du code.

## Structure en Couches

L'application est structurée en plusieurs couches distinctes :

1. **Couche Contrôleur** : Point d'entrée des requêtes HTTP, gère le routage et la validation des entrées
2. **Couche Service** : Contient la logique métier et les règles du jeu
3. **Couche Repository** : Interface avec la base de données via Spring Data JPA
4. **Couche Modèle** : Définit les entités et leurs relations

Cette séparation garantit que chaque couche a une responsabilité unique et bien définie.

## Couche Contrôleur

### Principe et Rôle

Les contrôleurs sont responsables de :
- Recevoir les requêtes HTTP
- Valider les données d'entrée
- Déléguer le traitement aux services
- Formater et renvoyer les réponses

### Structure Type d'un Contrôleur

```java
@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    // Injection de dépendances par constructeur
    public UserController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String token) {
        try {
            // Extraire les informations du token
            String jwt = token.substring(7);
            String userEmail = jwtUtil.extractUsername(jwt);
            
            // Déléguer la logique au service
            User user = userService.findByEmail(userEmail);
            UserProfileResponse profile = userService.createUserProfile(user);
            
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
        }
    }

    @PostMapping("/friends/add/{friendId}")
    public ResponseEntity<?> addFriend(
            @PathVariable Long friendId,
            @RequestHeader("Authorization") String token) {
        try {
            String jwt = token.substring(7);
            String userEmail = jwtUtil.extractUsername(jwt);
            User user = userService.findByEmail(userEmail);
            
            userService.sendFriendRequest(user.getId(), friendId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Autres endpoints...
}
```

### Bonnes Pratiques Appliquées

1. **Injection de Dépendances par Constructeur** : Plutôt que d'utiliser `@Autowired` sur les champs, l'injection se fait par constructeur, ce qui facilite les tests et améliore la lisibilité.

2. **Validation des Entrées** : Utilisation d'annotations comme `@Valid` et de classes DTO pour valider les données entrantes.

3. **Gestion des Exceptions** : Utilisation de blocs try-catch pour capturer et traiter les exceptions de manière appropriée.

4. **Réponses HTTP Appropriées** : Utilisation de `ResponseEntity` pour contrôler précisément le statut HTTP et le corps de la réponse.

## Couche Service

### Principe et Rôle

Les services contiennent la logique métier et sont responsables de :
- Implémenter les règles du jeu
- Coordonner les opérations sur plusieurs entités
- Effectuer des validations complexes
- Gérer les transactions

### Structure Type d'un Service

```java
@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final GuildMembershipRepository membershipRepository;
    private final MessageService messageService;

    // Injection de dépendances par constructeur
    public UserService(
            UserRepository userRepository,
            GuildMembershipRepository membershipRepository,
            MessageService messageService) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.messageService = messageService;
    }

    /**
     * Trouve un utilisateur par email.
     */
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    /**
     * Envoie une demande d'ami à un autre utilisateur.
     */
    public void sendFriendRequest(Long userId, Long friendId) {
        // Vérifier que les utilisateurs existent
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User friend = userRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend not found"));
        
        // Vérifier si l'ami est déjà dans la liste d'amis
        if (user.getFriends() != null && user.getFriends().contains(friend)) {
            throw new IllegalStateException("Already friends with this user");
        }
        
        // Vérifier si une demande est déjà en attente
        if (friend.getPendingFriendRequests().contains(userId)) {
            throw new IllegalStateException("Friend request already pending");
        }
        
        // Ajouter la demande d'ami
        friend.getPendingFriendRequests().add(userId);
        userRepository.save(friend);
        
        // Envoyer une notification
        messageService.sendSystemMessage(
            friend.getId(), 
            "Vous avez reçu une demande d'ami de " + user.getUsername()
        );
    }

    /**
     * Accepte une demande d'ami.
     */
    public void acceptFriendRequest(Long userId, Long friendId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User friend = userRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend not found"));
        
        // Vérifier si une demande est en attente
        if (!user.getPendingFriendRequests().contains(friendId)) {
            throw new IllegalStateException("No pending friend request from this user");
        }
        
        // Supprimer la demande en attente
        user.getPendingFriendRequests().remove(friendId);
        
        // Ajouter l'ami à la liste d'amis des deux utilisateurs
        user.addFriend(friend);
        friend.addFriend(user);
        
        // Sauvegarder les changements
        userRepository.save(user);
        userRepository.save(friend);
        
        // Envoyer des notifications
        messageService.sendSystemMessage(
            userId, 
            "Vous êtes maintenant ami avec " + friend.getUsername()
        );
        messageService.sendSystemMessage(
            friendId, 
            "Vous êtes maintenant ami avec " + user.getUsername()
        );
    }

    // Autres méthodes...
}
```

### Bonnes Pratiques Appliquées

1. **Documentation JavaDoc** : Chaque méthode est documentée avec une description claire.

2. **Validation des Paramètres** : Vérification de l'existence des entités et validation des conditions métier.

3. **Gestion des Transactions** : Utilisation de `@Transactional` pour garantir l'intégrité des données.

4. **Séparation des Préoccupations** : Chaque méthode a une responsabilité unique et bien définie.

5. **Encapsulation** : Les détails d'implémentation sont cachés, seules les opérations nécessaires sont exposées.

## Couche Repository

### Principe et Rôle

Les repositories fournissent une abstraction de l'accès aux données et sont responsables de :
- Effectuer des opérations CRUD sur les entités
- Définir des requêtes personnalisées
- Gérer la pagination et le tri

### Structure Type d'un Repository

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Méthodes dérivées (Spring Data JPA génère automatiquement l'implémentation)
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);
    
    // Requêtes personnalisées avec @Query
    @Query("SELECT u FROM User u WHERE u.level >= :minLevel AND u.level <= :maxLevel")
    List<User> findByLevelRange(@Param("minLevel") int minLevel, @Param("maxLevel") int maxLevel);
    
    @Query("SELECT u FROM User u WHERE u.lastLogin > :date")
    List<User> findActiveUsers(@Param("date") Instant date);
    
    // Requêtes avec pagination
    Page<User> findByOrderByRankAsc(Pageable pageable);
    
    // Requête native (SQL) si nécessaire
    @Query(value = "SELECT * FROM users WHERE rtaPoints > :points", nativeQuery = true)
    List<User> findTopRtaPlayers(@Param("points") int points);
}
```

### Bonnes Pratiques Appliquées

1. **Interfaces** : Utilisation d'interfaces plutôt que de classes concrètes, ce qui facilite les tests avec des mocks.

2. **Méthodes Dérivées** : Utilisation de la convention de nommage de Spring Data JPA pour générer automatiquement les requêtes.

3. **Requêtes Personnalisées** : Utilisation de `@Query` pour des requêtes plus complexes.

4. **Pagination** : Support de la pagination pour les requêtes qui peuvent retourner de grandes quantités de données.

## Coordination Entre les Couches

### Flux de Données Typique

1. **Requête HTTP** → Le contrôleur reçoit la requête et extrait les paramètres.
2. **Validation** → Le contrôleur valide les données d'entrée.
3. **Appel Service** → Le contrôleur délègue le traitement au service approprié.
4. **Logique Métier** → Le service exécute la logique métier.
5. **Accès Données** → Le service utilise les repositories pour accéder aux données.
6. **Persistance** → Les repositories interagissent avec la base de données.
7. **Réponse** → Le résultat remonte la chaîne et le contrôleur formate la réponse HTTP.

### Exemple de Flux Complet

Pour l'ajout d'un équipement à un héros :

1. **Contrôleur** : Reçoit la requête avec les IDs de l'équipement et du héros.
```java
@PostMapping("/equip")
public ResponseEntity<?> equipItem(
        @RequestBody EquipItemRequest request,
        @RequestHeader("Authorization") String token) {
    String userEmail = jwtUtil.extractUsername(token.substring(7));
    User user = userService.findByEmail(userEmail);
    
    equipmentService.equipItem(user.getId(), request.getEquipmentId(), request.getHeroId());
    return ResponseEntity.ok().build();
}
```

2. **Service** : Valide et exécute l'opération.
```java
@Transactional
public void equipItem(Long userId, Long equipmentId, Long heroId) {
    // Récupérer les entités
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    
    PlayerEquipment equipment = playerEquipmentRepository.findById(equipmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));
    
    PlayerHero hero = playerHeroRepository.findById(heroId)
            .orElseThrow(() -> new ResourceNotFoundException("Hero not found"));
    
    // Vérifier les propriétés
    if (!equipment.getUser().getId().equals(userId)) {
        throw new UnauthorizedException("This equipment doesn't belong to you");
    }
    
    if (!hero.getUser().getId().equals(userId)) {
        throw new UnauthorizedException("This hero doesn't belong to you");
    }
    
    // Exécuter l'opération
    Equipment.Type type = equipment.getEquipment().getType();
    
    // Déséquiper l'équipement existant du même type
    hero.getEquipments().stream()
            .filter(e -> e.getEquipment().getType() == type)
            .findFirst()
            .ifPresent(e -> {
                e.setPlayerHero(null);
                playerEquipmentRepository.save(e);
            });
    
    // Équiper le nouvel équipement
    equipment.setPlayerHero(hero);
    playerEquipmentRepository.save(equipment);
}
```

3. **Repository** : Persiste les changements.
```java
// Les méthodes save(), findById(), etc. sont héritées de JpaRepository
```

## Stratégies Avancées

### Encapsulation des Opérations Complexes

Pour les opérations qui impliquent plusieurs entités ou étapes, des services dédiés sont créés :

```java
@Service
public class BattleService {
    // Gère les combats, qui impliquent des héros, des compétences, etc.
}

@Service
public class SummonService {
    // Gère les invocations, qui impliquent des bannières, des héros, etc.
}
```

### Séparation des Préoccupations

Chaque service est conçu pour gérer un aspect spécifique du jeu :

- `UserService` : Gestion des utilisateurs
- `HeroService` : Gestion des héros
- `GuildService` : Gestion des guildes
- `EquipmentService` : Gestion des équipements
- etc.

### Utilisation des DTO

Des objets de transfert de données (DTO) sont utilisés pour séparer les entités de la base de données des objets exposés par l'API :

```java
// DTO pour les profils utilisateur
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String avatarUrl;
    private int level;
    private int gold;
    private int diamonds;
    private int energy;
    private int heroesNumber;
    private String guildName;
    private String lastLoginDate;
    private String registerDate;
    // Getters et setters...
}

// Mappage d'une entité User vers un DTO
public UserProfileResponse createUserProfile(User user) {
    UserProfileResponse profile = new UserProfileResponse();
    profile.setId(user.getId());
    profile.setUsername(user.getUsername());
    profile.setEmail(user.getEmail());
    profile.setAvatarUrl(user.getAvatarUrl());
    profile.setLevel(user.getLevel());
    profile.setGold(user.getGold());
    profile.setDiamonds(user.getDiamonds());
    profile.setEnergy(user.getEnergy());
    profile.setHeroesNumber(user.getHeroesNumber());
    profile.setGuildName(user.getGuildName());
    profile.setLastLoginDate(user.getLastLoginDateString());
    profile.setRegisterDate(user.getRegisterDateString());
    return profile;
}
```

## Conclusion

L'architecture des services et des contrôleurs d'Epic7 suit les meilleures pratiques de développement Spring Boot, avec une séparation claire des responsabilités et une organisation en couches bien définie.

Cette architecture offre plusieurs avantages :

1. **Maintenabilité** : Le code est organisé de manière logique et cohérente.
2. **Testabilité** : Chaque couche peut être testée indépendamment.
3. **Évolutivité** : De nouvelles fonctionnalités peuvent être ajoutées sans modifier le code existant.
4. **Réutilisabilité** : Les services peuvent être utilisés par différents contrôleurs.
5. **Lisibilité** : Le code est bien documenté et suit des conventions cohérentes.

L'application de ces principes architecturaux a permis de créer un backend robuste et évolutif, capable de supporter l'ensemble des fonctionnalités du jeu Epic7 tout en restant facile à maintenir et à faire évoluer.
