# Fonctionnalités du Jeu et Leur Implémentation

## Vue d'Ensemble

Le backend Epic7 implémente diverses fonctionnalités de jeu qui correspondent aux mécaniques classiques des RPG gacha. Ces fonctionnalités sont organisées en services spécialisés, chacun gérant un aspect spécifique du jeu.

## Système d'Invocation (Summon)

### Concept

Le système d'invocation permet aux joueurs de dépenser des ressources (généralement des diamants) pour obtenir aléatoirement des héros et des équipements. Ce système est au cœur du modèle gacha du jeu.

### Implémentation

```java
@Service
public class SummonService {
    
    private final BannerRepository bannerRepository;
    private final UserRepository userRepository;
    private final HeroRepository heroRepository;
    private final EquipmentRepository equipmentRepository;
    private final Random random = new Random();
    
    // Effectuer une invocation sur une bannière
    public SummonResult summon(Long userId, Long bannerId) {
        // Récupérer l'utilisateur et la bannière
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Banner banner = bannerRepository.findById(bannerId)
            .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));
        
        // Vérifier si l'utilisateur a assez de diamants
        if (user.getDiamonds() < banner.getCost()) {
            throw new InsufficientResourcesException("Not enough diamonds to summon");
        }
        
        // Déduire le coût
        user.setDiamonds(user.getDiamonds() - banner.getCost());
        userRepository.save(user);
        
        // Déterminer le résultat de l'invocation basé sur les taux
        double roll = random.nextDouble() * 100;
        double currentProbability = 0;
        
        // Vérifier si c'est un héros 5*
        currentProbability += banner.getFiveStarHeroRate();
        if (roll < currentProbability) {
            // Obtenir un héros 5* aléatoire de la bannière
            List<Hero> fiveStarHeroes = banner.getHeroes().stream()
                .filter(h -> h.getRarity() == Rarity.FIVE_STAR)
                .collect(Collectors.toList());
            
            if (!fiveStarHeroes.isEmpty()) {
                Hero hero = fiveStarHeroes.get(random.nextInt(fiveStarHeroes.size()));
                user.addHeros(hero, 1);
                userRepository.save(user);
                return new SummonResult(hero, null, "Congratulations! You got a 5* hero!");
            }
        }
        
        // Continuer avec les autres catégories...
        
        // Par défaut, donner un équipement commun
        List<Equipment> commonEquipments = equipmentRepository.findByRarity(Rarity.ONE_STAR);
        Equipment equipment = commonEquipments.get(random.nextInt(commonEquipments.size()));
        user.addEquipment(equipment, 1);
        userRepository.save(user);
        
        return new SummonResult(null, equipment, "You got a 1* equipment.");
    }
}
```

Le contrôleur correspondant expose les endpoints pour interagir avec ce service :

```java
@RestController
@RequestMapping("/api/summon")
public class SummonController {
    
    private final SummonService summonService;
    private final JwtUtil jwtUtil;
    
    @PostMapping("/{bannerId}")
    public ResponseEntity<SummonResult> summon(
            @PathVariable Long bannerId,
            @RequestHeader("Authorization") String token) {
        
        String email = jwtUtil.extractUsername(token.substring(7));
        User user = userService.findByEmail(email);
        
        SummonResult result = summonService.summon(user.getId(), bannerId);
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/banners")
    public ResponseEntity<List<Banner>> getAllBanners() {
        return ResponseEntity.ok(summonService.getAllBanners());
    }
}
```

## Système de Combat

### Concept

Le système de combat permet aux joueurs d'affronter soit l'IA (PvE) soit d'autres joueurs (PvP). Il gère les tours, les dégâts, les effets et détermine le vainqueur.

### Implémentation

```java
@Service
public class Battle {
    
    // Simuler un combat PvE entre l'équipe du joueur et une équipe d'IA
    public BattleResult simulatePveBattle(List<PlayerHero> playerTeam, List<Hero> enemyTeam) {
        // Initialiser les statistiques de combat pour chaque héros
        List<BattleHeroStats> playerStats = playerTeam.stream()
            .map(this::initializePlayerHeroStats)
            .collect(Collectors.toList());
        
        List<BattleHeroStats> enemyStats = enemyTeam.stream()
            .map(this::initializeEnemyHeroStats)
            .collect(Collectors.toList());
        
        // Déterminer l'ordre des tours basé sur la vitesse
        List<BattleHeroStats> turnOrder = new ArrayList<>();
        turnOrder.addAll(playerStats);
        turnOrder.addAll(enemyStats);
        turnOrder.sort(Comparator.comparing(BattleHeroStats::getSpeed).reversed());
        
        // Journal de combat
        List<BattleAction> battleLog = new ArrayList<>();
        int maxTurns = 50; // Éviter les combats infinis
        
        // Simuler les tours jusqu'à ce qu'une équipe soit vaincue
        for (int turn = 0; turn < maxTurns; turn++) {
            for (BattleHeroStats attacker : turnOrder) {
                // Vérifier si le héros est vivant
                if (attacker.getCurrentHp() <= 0) continue;
                
                // Sélectionner une cible
                BattleHeroStats target;
                if (attacker.isPlayerHero()) {
                    // Les héros du joueur ciblent les ennemis
                    Optional<BattleHeroStats> aliveEnemy = enemyStats.stream()
                        .filter(e -> e.getCurrentHp() > 0)
                        .findFirst();
                    
                    if (!aliveEnemy.isPresent()) {
                        // Tous les ennemis sont vaincus, le joueur gagne
                        return new BattleResult(true, battleLog, calculateRewards(enemyTeam));
                    }
                    
                    target = aliveEnemy.get();
                } else {
                    // Les ennemis ciblent les héros du joueur
                    Optional<BattleHeroStats> alivePlayerHero = playerStats.stream()
                        .filter(p -> p.getCurrentHp() > 0)
                        .findFirst();
                    
                    if (!alivePlayerHero.isPresent()) {
                        // Tous les héros du joueur sont vaincus, le joueur perd
                        return new BattleResult(false, battleLog, null);
                    }
                    
                    target = alivePlayerHero.get();
                }
                
                // Effectuer une attaque
                BattleAction action = performAttack(attacker, target);
                battleLog.add(action);
                
                // Vérifier si la cible est morte
                if (target.getCurrentHp() <= 0) {
                    battleLog.add(new BattleAction(
                        target.getName(),
                        "died",
                        null,
                        0,
                        target.getCurrentHp()
                    ));
                }
            }
        }
        
        // Si on atteint le nombre maximum de tours, c'est un match nul (défaite du joueur)
        return new BattleResult(false, battleLog, null);
    }
    
    // Initialiser les statistiques d'un héros du joueur pour le combat
    private BattleHeroStats initializePlayerHeroStats(PlayerHero playerHero) {
        Hero hero = playerHero.getHero();
        
        // Calculer les statistiques en fonction du niveau et des équipements
        int attack = calculateAttack(hero, playerHero);
        int defense = calculateDefense(hero, playerHero);
        int hp = calculateHp(hero, playerHero);
        int speed = calculateSpeed(hero, playerHero);
        
        return new BattleHeroStats(
            playerHero.getId(),
            hero.getName(),
            true,
            attack,
            defense,
            hp,
            hp, // currentHp = maxHp au début
            speed,
            hero.getElement(),
            getHeroSkills(hero)
        );
    }
    
    // Effectuer une attaque
    private BattleAction performAttack(BattleHeroStats attacker, BattleHeroStats defender) {
        // Sélectionner une compétence (pour simplifier, utilisons toujours la première)
        Skill skill = attacker.getSkills().get(0);
        
        // Calculer les dégâts
        int damage = calculateDamage(attacker, defender, skill);
        
        // Appliquer les dégâts
        defender.setCurrentHp(Math.max(0, defender.getCurrentHp() - damage));
        
        return new BattleAction(
            attacker.getName(),
            "used " + skill.getName(),
            defender.getName(),
            damage,
            defender.getCurrentHp()
        );
    }
    
    // Calculer les dégâts en fonction des statistiques et des éléments
    private int calculateDamage(BattleHeroStats attacker, BattleHeroStats defender, Skill skill) {
        // Multiplicateur de compétence
        double skillMultiplier = skill.getDamageMultiplier();
        
        // Bonus/malus élémentaire
        double elementalBonus = calculateElementalBonus(attacker.getElement(), defender.getElement());
        
        // Formule de dégâts de base
        double rawDamage = attacker.getAttack() * skillMultiplier * elementalBonus;
        
        // Réduction des dégâts par la défense
        double damageReduction = defender.getDefense() / (defender.getDefense() + 300.0);
        double finalDamage = rawDamage * (1 - damageReduction);
        
        // Ajouter un peu de hasard (±10%)
        double randomFactor = 0.9 + Math.random() * 0.2;
        finalDamage *= randomFactor;
        
        return (int) Math.max(1, finalDamage);
    }
    
    // Calculer les récompenses pour une victoire
    private Map<String, Integer> calculateRewards(List<Hero> enemyTeam) {
        Map<String, Integer> rewards = new HashMap<>();
        
        // Calculer l'or en fonction de la difficulté des ennemis
        int goldReward = enemyTeam.stream()
            .mapToInt(h -> h.getRarity().getStars() * 100)
            .sum();
        
        // Calculer l'XP
        int xpReward = enemyTeam.stream()
            .mapToInt(h -> h.getRarity().getStars() * 50)
            .sum();
        
        rewards.put("gold", goldReward);
        rewards.put("xp", xpReward);
        
        return rewards;
    }
}
```

## Système de Guilde

### Concept

Les guildes permettent aux joueurs de se regrouper, de communiquer et de bénéficier d'avantages collectifs.

### Implémentation

```java
@Service
public class GuildService {
    
    private final GuildRepository guildRepository;
    private final UserRepository userRepository;
    private final GuildMembershipRepository membershipRepository;
    
    // Créer une nouvelle guilde
    public Guild createGuild(String name, String description, Long founderId) {
        // Vérifier si le nom est déjà pris
        if (guildRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("Guild name already taken");
        }
        
        // Vérifier si l'utilisateur existe
        User founder = userRepository.findById(founderId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Vérifier si l'utilisateur est déjà dans une guilde
        if (founder.getGuildMembership() != null) {
            throw new IllegalStateException("User is already in a guild");
        }
        
        // Créer la guilde
        Guild guild = new Guild();
        guild.setName(name);
        guild.setDescription(description);
        guild.setLevel(1);
        guild.setCreationDate(Instant.now());
        guild = guildRepository.save(guild);
        
        // Créer l'adhésion du fondateur comme chef
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(founder);
        membership.setRole("LEADER");
        membership.setJoinDate(Instant.now());
        membershipRepository.save(membership);
        
        // Mettre à jour l'utilisateur
        founder.setGuildMembership(membership);
        userRepository.save(founder);
        
        return guild;
    }
    
    // Rejoindre une guilde
    public void joinGuild(Long userId, Long guildId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Guild guild = guildRepository.findById(guildId)
            .orElseThrow(() -> new ResourceNotFoundException("Guild not found"));
        
        // Vérifier si l'utilisateur est déjà dans une guilde
        if (user.getGuildMembership() != null) {
            throw new IllegalStateException("User is already in a guild");
        }
        
        // Créer l'adhésion
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole("MEMBER");
        membership.setJoinDate(Instant.now());
        membershipRepository.save(membership);
        
        // Mettre à jour l'utilisateur
        user.setGuildMembership(membership);
        userRepository.save(user);
    }
    
    // Quitter une guilde
    public void leaveGuild(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        GuildMembership membership = user.getGuildMembership();
        if (membership == null) {
            throw new IllegalStateException("User is not in a guild");
        }
        
        // Vérifier si l'utilisateur est le chef
        if ("LEADER".equals(membership.getRole())) {
            // Trouver un nouveau chef ou dissoudre la guilde
            Guild guild = membership.getGuild();
            List<GuildMembership> members = membershipRepository.findByGuildAndRoleNot(guild, "LEADER");
            
            if (members.isEmpty()) {
                // Dissoudre la guilde
                guildRepository.delete(guild);
            } else {
                // Promouvoir le membre le plus ancien
                GuildMembership newLeader = members.stream()
                    .min(Comparator.comparing(GuildMembership::getJoinDate))
                    .orElseThrow();
                
                newLeader.setRole("LEADER");
                membershipRepository.save(newLeader);
            }
        }
        
        // Supprimer l'adhésion
        user.setGuildMembership(null);
        userRepository.save(user);
        membershipRepository.delete(membership);
    }
    
    // Autres méthodes pour gérer les guildes...
}
```

## Système de Chat

### Concept

Le système de chat permet aux joueurs de communiquer entre eux, soit dans des canaux globaux, soit dans des canaux de guilde, soit en privé.

### Implémentation

```java
@Service
public class ChatService {
    
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    
    // Envoyer un message global
    public Message sendGlobalMessage(Long userId, String content) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Message message = new Message();
        message.setSender(user);
        message.setContent(content);
        message.setChannel("GLOBAL");
        message.setTimestamp(Instant.now());
        
        message = messageRepository.save(message);
        
        // Diffuser le message via WebSocket
        messagingTemplate.convertAndSend("/topic/chat/global", mapToMessageDTO(message));
        
        return message;
    }
    
    // Envoyer un message de guilde
    public Message sendGuildMessage(Long userId, String content) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (user.getGuildMembership() == null) {
            throw new IllegalStateException("User is not in a guild");
        }
        
        Guild guild = user.getGuildMembership().getGuild();
        
        Message message = new Message();
        message.setSender(user);
        message.setContent(content);
        message.setChannel("GUILD:" + guild.getId());
        message.setTimestamp(Instant.now());
        
        message = messageRepository.save(message);
        
        // Diffuser le message via WebSocket
        messagingTemplate.convertAndSend("/topic/chat/guild/" + guild.getId(), mapToMessageDTO(message));
        
        return message;
    }
    
    // Envoyer un message privé
    public Message sendPrivateMessage(Long senderId, Long receiverId, String content) {
        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));
        
        User receiver = userRepository.findById(receiverId)
            .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));
        
        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        message.setChannel("PRIVATE");
        message.setTimestamp(Instant.now());
        
        message = messageRepository.save(message);
        
        // Diffuser le message via WebSocket aux deux utilisateurs
        messagingTemplate.convertAndSendToUser(
            sender.getUsername(),
            "/queue/messages",
            mapToMessageDTO(message)
        );
        
        messagingTemplate.convertAndSendToUser(
            receiver.getUsername(),
            "/queue/messages",
            mapToMessageDTO(message)
        );
        
        return message;
    }
    
    // Récupérer les messages globaux récents
    public List<MessageDTO> getRecentGlobalMessages(int limit) {
        return messageRepository.findByChannelOrderByTimestampDesc("GLOBAL", PageRequest.of(0, limit))
            .stream()
            .map(this::mapToMessageDTO)
            .collect(Collectors.toList());
    }
    
    // Récupérer les messages de guilde récents
    public List<MessageDTO> getRecentGuildMessages(Long guildId, int limit) {
        return messageRepository.findByChannelOrderByTimestampDesc("GUILD:" + guildId, PageRequest.of(0, limit))
            .stream()
            .map(this::mapToMessageDTO)
            .collect(Collectors.toList());
    }
    
    // Mapper Message à MessageDTO pour l'API
    private MessageDTO mapToMessageDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderName(message.getSender().getUsername());
        dto.setSenderAvatar(message.getSender().getAvatarUrl());
        
        if (message.getReceiver() != null) {
            dto.setReceiverId(message.getReceiver().getId());
            dto.setReceiverName(message.getReceiver().getUsername());
        }
        
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp().toString());
        dto.setChannel(message.getChannel());
        
        return dto;
    }
}
```

## Système d'Équipement

### Concept

Le système d'équipement permet aux joueurs de gérer les équipements de leurs héros, d'améliorer ces équipements et de les échanger.

### Implémentation

```java
@Service
public class EquipmentService {
    
    private final EquipmentRepository equipmentRepository;
    private final PlayerEquipmentRepository playerEquipmentRepository;
    private final PlayerHeroRepository playerHeroRepository;
    private final UserRepository userRepository;
    
    // Équiper un objet sur un héros
    public void equipItem(Long userId, Long playerEquipmentId, Long playerHeroId) {
        // Vérifier si l'utilisateur existe
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Vérifier si l'équipement existe et appartient à l'utilisateur
        PlayerEquipment playerEquipment = playerEquipmentRepository.findById(playerEquipmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));
        
        if (!playerEquipment.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("This equipment does not belong to the user");
        }
        
        // Vérifier si le héros existe et appartient à l'utilisateur
        PlayerHero playerHero = playerHeroRepository.findById(playerHeroId)
            .orElseThrow(() -> new ResourceNotFoundException("Hero not found"));
        
        if (!playerHero.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("This hero does not belong to the user");
        }
        
        // Vérifier si le héros a déjà un équipement du même type
        Equipment.Type equipmentType = playerEquipment.getEquipment().getType();
        
        playerHero.getEquipments().stream()
            .filter(e -> e.getEquipment().getType() == equipmentType)
            .findFirst()
            .ifPresent(e -> {
                // Déséquiper l'ancien équipement
                e.setPlayerHero(null);
                playerEquipmentRepository.save(e);
            });
        
        // Équiper le nouvel équipement
        playerEquipment.setPlayerHero(playerHero);
        playerEquipmentRepository.save(playerEquipment);
    }
    
    // Améliorer un équipement
    public PlayerEquipment enhanceEquipment(Long userId, Long playerEquipmentId, List<Long> sacrificeEquipmentIds) {
        // Vérifier si l'utilisateur existe
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Vérifier si l'équipement principal existe et appartient à l'utilisateur
        PlayerEquipment mainEquipment = playerEquipmentRepository.findById(playerEquipmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Main equipment not found"));
        
        if (!mainEquipment.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("This equipment does not belong to the user");
        }
        
        // Vérifier si les équipements sacrifiés existent et appartiennent à l'utilisateur
        List<PlayerEquipment> sacrificeEquipments = playerEquipmentRepository.findAllById(sacrificeEquipmentIds);
        
        if (sacrificeEquipments.size() != sacrificeEquipmentIds.size()) {
            throw new ResourceNotFoundException("Some sacrifice equipments not found");
        }
        
        for (PlayerEquipment equipment : sacrificeEquipments) {
            if (!equipment.getUser().getId().equals(userId)) {
                throw new UnauthorizedException("Some sacrifice equipments do not belong to the user");
            }
            
            if (equipment.getId().equals(playerEquipmentId)) {
                throw new IllegalArgumentException("Cannot sacrifice the main equipment");
            }
            
            if (equipment.getPlayerHero() != null) {
                throw new IllegalStateException("Cannot sacrifice equipped items");
            }
        }
        
        // Calculer l'expérience gagnée
        int expGained = sacrificeEquipments.stream()
            .mapToInt(e -> calculateSacrificeExp(e))
            .sum();
        
        // Mettre à jour le niveau et les statistiques
        mainEquipment.setExperience(mainEquipment.getExperience() + expGained);
        updateEquipmentLevel(mainEquipment);
        
        // Supprimer les équipements sacrifiés
        playerEquipmentRepository.deleteAll(sacrificeEquipments);
        
        // Sauvegarder et retourner l'équipement amélioré
        return playerEquipmentRepository.save(mainEquipment);
    }
    
    // Calculer l'expérience obtenue par le sacrifice d'un équipement
    private int calculateSacrificeExp(PlayerEquipment equipment) {
        // Base XP en fonction de la rareté
        int baseXp = equipment.getEquipment().getRarity().getStars() * 100;
        
        // Bonus pour le niveau
        int levelBonus = equipment.getLevel() * 50;
        
        return baseXp + levelBonus;
    }
    
    // Mettre à jour le niveau d'un équipement en fonction de son expérience
    private void updateEquipmentLevel(PlayerEquipment equipment) {
        int currentExp = equipment.getExperience();
        int currentLevel = equipment.getLevel();
        
        // Expérience requise pour chaque niveau
        int[] expRequirements = {
            0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500
        };
        
        // Trouver le niveau correspondant à l'expérience actuelle
        int newLevel = 0;
        for (int i = 0; i < expRequirements.length; i++) {
            if (currentExp >= expRequirements[i]) {
                newLevel = i;
            } else {
                break;
            }
        }
        
        // Mettre à jour le niveau si nécessaire
        if (newLevel != currentLevel) {
            equipment.setLevel(newLevel);
            
            // Recalculer les statistiques
            updateEquipmentStats(equipment);
        }
    }
    
    // Mettre à jour les statistiques d'un équipement en fonction de son niveau
    private void updateEquipmentStats(PlayerEquipment equipment) {
        Equipment baseEquipment = equipment.getEquipment();
        int level = equipment.getLevel();
        double levelMultiplier = 1.0 + (level * 0.1); // +10% par niveau
        
        // Mettre à jour les statistiques
        equipment.setAttackBonus((int)(baseEquipment.getBaseAttackBonus() * levelMultiplier));
        equipment.setDefenseBonus((int)(baseEquipment.getBaseDefenseBonus() * levelMultiplier));
        equipment.setHpBonus((int)(baseEquipment.getBaseHpBonus() * levelMultiplier));
        equipment.setSpeedBonus((int)(baseEquipment.getBaseSpeedBonus() * levelMultiplier));
    }
}
```

## Autres Systèmes Notables

### Système de Progression des Héros

```java
@Service
public class PlayerHeroService {
    // Méthodes pour la progression des héros (niveau, éveil, etc.)
}
```

### Système de Boutique

```java
@Service
public class ShopService {
    // Méthodes pour acheter des objets, des héros, etc.
}
```

### Système d'Arène et de RTA (Real-Time Arena)

```java
@Service
public class RtaService {
    // Méthodes pour les combats en temps réel entre joueurs
}
```

## Conclusion

Les fonctionnalités du jeu Epic7 sont implémentées de manière robuste et modulaire, chaque aspect étant géré par un service spécialisé. Cette architecture permet une maintenance facile et une extension des fonctionnalités sans affecter les systèmes existants.

Les principaux systèmes (invocation, combat, guildes, chat, équipement) sont construits pour offrir une expérience de jeu complète et cohérente, avec une attention particulière à l'équilibre du gameplay et à la progression des joueurs.

Chaque système est également conçu pour interagir avec les autres de manière fluide, créant ainsi un écosystème de jeu cohérent où les actions dans un domaine peuvent avoir des répercussions dans d'autres.
