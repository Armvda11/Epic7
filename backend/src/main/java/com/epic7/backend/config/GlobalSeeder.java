package com.epic7.backend.config;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.*;
import com.epic7.backend.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

/**
 * Classe de configuration pour la création de données initiales dans la base de données.
 * Cette classe est exécutée au démarrage de l'application pour peupler la base de données avec des données de test.
 * @authors hermas corentin
 */
@Component
public class GlobalSeeder {

    private final UserRepository userRepo;
    private final HeroRepository heroRepo;
    private final EquipmentRepository equipRepo;
    private final PlayerHeroRepository playerHeroRepo;
    private final PlayerEquipmentRepository playerEquipRepo;
    private final GuildRepository guildRepo;
    private final GuildMembershipRepository membershipRepo;
    private final BannerRepository bannerRepo;
    private final ShopItemRepository shopItemRepo;
    private final PasswordEncoder passwordEncoder;
    private final MessageRepository messageRepo;
    private final SkillRepository skillRepo;

    public GlobalSeeder(UserRepository userRepo,
                        HeroRepository heroRepo,
                        EquipmentRepository equipRepo,
                        PlayerHeroRepository playerHeroRepo,
                        PlayerEquipmentRepository playerEquipRepo,
                        GuildRepository guildRepo,
                        GuildMembershipRepository membershipRepo,
                        PasswordEncoder passwordEncoder,
                        ShopItemRepository shopItemRepo,
                        BannerRepository bannerRepo,
                        MessageRepository messageRepo,
                        SkillRepository skillRepo) {

                        this.shopItemRepo = shopItemRepo;
        this.userRepo = userRepo;
        this.heroRepo = heroRepo;
        this.equipRepo = equipRepo;
        this.playerHeroRepo = playerHeroRepo;
        this.playerEquipRepo = playerEquipRepo;
        this.guildRepo = guildRepo;
        this.membershipRepo = membershipRepo;
        this.passwordEncoder = passwordEncoder;
        this.bannerRepo = bannerRepo;
        this.messageRepo = messageRepo;
        this.skillRepo = skillRepo;
    }

    @PostConstruct
    public void seed() {
        seedUsers();
        seedHeroes();
        seedEquipment();
        seedPlayerHeroes();
        seedPlayerEquipment();
        seedBanner();
        seedShop();
        seedMessages();

        seedGuilds(); // ← Ajo
        seedSkills(); // ✅
    }
    private void seedSkills() {
        Optional<Hero> hwayoungOpt = heroRepo.findByName("Hwayoung");
    
        if (hwayoungOpt.isPresent() && skillRepo.count() == 0) {
            Hero hwayoung = hwayoungOpt.get();
    
            Skill skill1 = Skill.builder()
                .name("Infernal Strike")
                .description("Attacks the enemy with kicks, and increases speed of the master.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.4)
                .cooldown(2)
                .position(0)
                .hero(hwayoung)
                .build();
    
            Skill skill2 = Skill.builder()
                .name("Divine Vessel")
                .description("At the start of the first battle, increases Defense proportional to Attack. When an ally dies, activates Bystander against a random enemy.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.DEFENSE_UP)
                .bonusValue(30.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_ALLY_DEATH)
                .position(1)
                .hero(hwayoung)
                .build();
    
            Skill skill3 = Skill.builder()
                .name("Sura: Reave the Skies")
                .description("Attacks the enemy with a rage-filled strike. Ignores damage reduction and sharing. Bonus damage vs Light.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(2.0)
                .cooldown(4)
                .position(2)
                .hero(hwayoung)
                .build();
    
            skillRepo.saveAll(List.of(skill1, skill2, skill3));
            System.out.println("✅ Compétences de Hwayoung créées.");
        }
    }
    

    private void seedGuilds() {
        if (guildRepo.count() == 0 && membershipRepo.count() == 0) {
            Optional<User> u1 = userRepo.findByEmail("hermas@example.com");
            Optional<User> u2 = userRepo.findByEmail("arya@example.com");
    
            if (u1.isPresent() && u2.isPresent()) {
                Guild guild = new Guild();
                guild.setName("Chevaliers de l'Aube");
                guild.setDescription("Guild RP active");
                guild.setLevel(1);
                guild.setGold(500);
                guild.setGuildPoints(100);
                guild.setRank(GuildRank.BRONZE);
                guild.setRanking(10);
    
                guildRepo.save(guild);
    
                GuildMembership leader = new GuildMembership();
                leader.setUser(u1.get());
                leader.setGuild(guild);
                leader.setRole("leader");
    
                GuildMembership member = new GuildMembership();
                member.setUser(u2.get());
                member.setGuild(guild);
                member.setRole("member");
    
                membershipRepo.saveAll(List.of(leader, member));
    
                System.out.println("✅ Guilde et membres créés.");
            } else {
                System.out.println("❌ Impossible de créer la guilde : utilisateurs non trouvés.");
            }
        }
    }
    

    private void seedUsers() {
        if (userRepo.findByEmail("hermas@example.com").isEmpty()) {
            User u0 = createUser("admin@epic7.com", "Admin", "password", 0, 0);
            User u1 = createUser("hermas@example.com", "hermas", "toi", 5000, 100);
            User u2 = createUser("arya@example.com", "arya", "secret", 3000, 50);
            User u3 = createUser("corentin@example.com", "Kaldah", "test", 9999999, 9999999);
            userRepo.saveAll(List.of(u0,u1, u2,u3));
            System.out.println("✅ Utilisateurs créés.");
        }
    }

    private void seedHeroes() {
        if (heroRepo.count() == 0) {
            heroRepo.saveAll(List.of(
                hero("Hwayoung", Element.DARK, Rarity.LEGENDARY),
                hero("Ml Piera", Element.DARK, Rarity.EPIC),
                hero("Mavuika", Element.ICE, Rarity.EPIC),
                hero("Krau", Element.LIGHT, Rarity.NORMAL)
            ));
            System.out.println("✅ Héros créés.");
        }
    }

    private void seedEquipment() {
        if (equipRepo.count() == 0) {
            equipRepo.saveAll(List.of(
                equipment("Épée de feu", EquipmentType.WEAPON, "RARE", 150, 0, 0, 0),
                equipment("Armure lourde", EquipmentType.ARMOR, "NORMAL", 0, 120, 0, 50),
                equipment("Bottes agiles", EquipmentType.BOOTS, "EPIC", 0, 0, 60, 0)
            ));
            System.out.println("✅ Équipements créés.");
        }
    }

    private void seedPlayerHeroes() {
        if (playerHeroRepo.count() == 0) {
            Optional<User> u1 = userRepo.findByEmail("hermas@example.com");
            Optional<User> u2 = userRepo.findByEmail("arya@example.com");
            List<Hero> heroes = heroRepo.findAll();

            if (u1.isPresent() && u2.isPresent() && heroes.size() >= 3) {
                playerHeroRepo.saveAll(List.of(
                    new PlayerHero(u1.get(), heroes.get(0)),
                    new PlayerHero(u1.get(), heroes.get(1)),
                    new PlayerHero(u2.get(), heroes.get(2))
                ));
                System.out.println("✅ Héros joueurs ajoutés.");
            }
        }
    }

    private void seedPlayerEquipment() {
        if (playerEquipRepo.count() == 0) {
            Optional<User> u1 = userRepo.findByEmail("hermas@example.com");
            Optional<User> u2 = userRepo.findByEmail("arya@example.com");

            List<Equipment> equipments = equipRepo.findAll();
            List<PlayerHero> playerHeroes = playerHeroRepo.findAll();

            if (u1.isPresent() && u2.isPresent() && equipments.size() >= 3 && playerHeroes.size() >= 3) {
                playerEquipRepo.saveAll(List.of(
                    playerEquip(u1.get(), equipments.get(0), playerHeroes.get(0)),
                    playerEquip(u1.get(), equipments.get(1), null),
                    playerEquip(u2.get(), equipments.get(2), playerHeroes.get(2))
                ));
                System.out.println("✅ Équipements joueurs ajoutés.");
            }
        }
    }

    private void seedBanner() {
    if (bannerRepo.count() == 0) {
        List<Hero> heroes = heroRepo.findAll();
        if (heroes.size() >= 2) {
            Banner banner = Banner.builder()
                    .name("Bannière de lancement")
                    .startsAt(LocalDateTime.now().minusDays(1))
                    .endsAt(LocalDateTime.now().plusDays(30))
                    .featuredHeroes(List.of(heroes.get(0), heroes.get(1)))
                    .build();
            bannerRepo.save(banner);
            System.out.println("✅ Bannière d'invocation créée.");
        } else {
            System.out.println("❌ Pas assez de héros pour la bannière.");
        }
    }
    }

    private User createUser(String email, String username, String rawPwd, int gold, int diamonds) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPwd));
        user.setGold(gold);
        user.setDiamonds(diamonds);
        return user;
    }

    private Hero hero(String name, Element el, Rarity r) {
        return Hero.builder()
                .name(name)
                .element(el)
                .rarity(r)
                .baseAttack(100)
                .baseDefense(100)
                .baseSpeed(100)
                .health(1000)
                .build();
    }

    private Equipment equipment(String name, EquipmentType type, String rarity, int atk, int def, int spd, int hp) {
        Equipment e = new Equipment();
        e.setName(name);
        e.setType(type);
        e.setRarity(rarity);
        e.setAttackBonus(atk);
        e.setDefenseBonus(def);
        e.setSpeedBonus(spd);
        e.setHealthBonus(hp);
        e.setLevel(1);
        e.setExperience(0);
        return e;
    }

    private PlayerEquipment playerEquip(User u, Equipment e, PlayerHero hero) {
        return PlayerEquipment.builder()
                .user(u)
                .equipment(e)
                .playerHero(hero)
                .level(1)
                .experience(0)
                .bonusAttack(0)
                .bonusDefense(0)
                .bonusHealth(0)
                .bonusSpeed(0)
                .build();
    }

    private void seedMessages(){
        if (messageRepo.count() == 0) {
            List<User> users = userRepo.findAll();
            
            if (users.size() >= 2) {
                for (int i = 0; i < users.size(); i++) {
                    Message message = new Message();
                    message.setSender(users.get(0));
                    message.setRecipient(users.get(1));
                    message.setSubject("Bienvenue dans le jeu !");
                    message.setMessage("Salut ! Bienvenue dans le jeu " + users.get(i).getUsername() + " !");
                    message.setCreatedAt(Instant.now());
                    message.setValidUntil(Instant.now().plusSeconds(7 * 24 * 60 * 60)); // 7 jours après la création
                    messageRepo.save(message);
                }
                
                System.out.println("✅ Messages de test ajoutés.");
            }
        }
    }

    private void seedShop() {
        if (shopItemRepo.count() == 0) {
            List<Hero> heroes = heroRepo.findAll();
            List<Equipment> equipments = equipRepo.findAll();
            LocalDateTime now = LocalDateTime.now();

            List<ShopItem> items = new ArrayList<>();

            items.add(ShopItem.builder()
                    .name("Pack de Diamants")
                    .description("Ajoute 100 diamants")
                    .type(ShopItemType.DIAMOND)
                    .priceInGold(0)
                    .priceInDiamonds(50)
                    .limitedTime(false)
                    .startAt(now.minusDays(1))
                    .endAt(now.plusDays(30))
                    .maxPurchasePerUser(3)
                    .build());

            items.add(ShopItem.builder()
                    .name("Pack d'Or")
                    .description("Ajoute 1000 gold")
                    .type(ShopItemType.GOLD)
                    .priceInGold(0)
                    .priceInDiamonds(20)
                    .limitedTime(false)
                    .startAt(now.minusDays(1))
                    .endAt(now.plusDays(30))
                    .build());

            if (!heroes.isEmpty()) {
                items.add(ShopItem.builder()
                        .name("Héros exclusif : " + heroes.get(0).getName())
                        .description("Ajoutez ce héros à votre collection")
                        .type(ShopItemType.HERO)
                        .targetId(heroes.get(0).getId())
                        .priceInGold(0)
                        .priceInDiamonds(80)
                        .limitedTime(true)
                        .startAt(now.minusDays(1))
                        .endAt(now.plusDays(7))
                        .maxPurchasePerUser(1)
                        .build());
            }

            if (!equipments.isEmpty()) {
                items.add(ShopItem.builder()
                        .name("Équipement rare : " + equipments.get(0).getName())
                        .description("Recevez cet équipement directement dans votre inventaire")
                        .type(ShopItemType.EQUIPMENT)
                        .targetId(equipments.get(0).getId())
                        .priceInGold(1000)
                        .priceInDiamonds(0)
                        .limitedTime(false)
                        .startAt(now.minusDays(1))
                        .endAt(now.plusDays(15))
                        .build());
            }

            shopItemRepo.saveAll(items);
            System.out.println("✅ Articles du shop ajoutés.");
        }
    }
    
}
