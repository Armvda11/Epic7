// 📦 Tous les seeders regroupés dans le package config.seed
package com.epic7.backend.config;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.*;
import com.epic7.backend.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GlobalSeeder {

    private final UserRepository userRepo;
    private final HeroRepository heroRepo;
    private final EquipmentRepository equipRepo;
    private final PlayerHeroRepository playerHeroRepo;
    private final PlayerEquipmentRepository playerEquipRepo;
    private final GuildRepository guildRepo;
    private final GuildMembershipRepository membershipRepo;
    private final PasswordEncoder passwordEncoder;

    public GlobalSeeder(UserRepository userRepo, HeroRepository heroRepo,
                        EquipmentRepository equipRepo, PlayerHeroRepository playerHeroRepo,
                        PlayerEquipmentRepository playerEquipRepo, GuildRepository guildRepo,
                        GuildMembershipRepository membershipRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.heroRepo = heroRepo;
        this.equipRepo = equipRepo;
        this.playerHeroRepo = playerHeroRepo;
        this.playerEquipRepo = playerEquipRepo;
        this.guildRepo = guildRepo;
        this.membershipRepo = membershipRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void seed() {
        // Seed déjà effectué ? Vérification sur un email unique suffit
        if (userRepo.findByEmail("hermas@example.com").isPresent()) return;
    
        // 1. Utilisateurs
        User u1 = createUser("hermas@example.com", "hermas", "toi", 5000, 100);
        User u2 = createUser("arya@example.com", "arya", "secret", 3000, 50);
        userRepo.saveAll(List.of(u1, u2));
    
        // 2. Héros
        if (heroRepo.count() == 0) {
            heroRepo.saveAll(List.of(
                    hero("Armin", Element.EARTH, Rarity.RARE),
                    hero("Luna", Element.ICE, Rarity.EPIC),
                    hero("Krau", Element.LIGHT, Rarity.NORMAL)
            ));
        }
    
        // 3. Équipements
        if (equipRepo.count() == 0) {
            equipRepo.saveAll(List.of(
                    equipment("Épée de feu", EquipmentType.WEAPON, "RARE", 150, 0, 0, 0),
                    equipment("Armure lourde", EquipmentType.ARMOR, "NORMAL", 0, 120, 0, 50),
                    equipment("Bottes agiles", EquipmentType.BOOTS, "EPIC", 0, 0, 60, 0)
            ));
        }
    
        // 4. Héros possédés
        if (playerHeroRepo.count() == 0) {
            List<Hero> heroes = heroRepo.findAll();
            playerHeroRepo.saveAll(List.of(
                    new PlayerHero(u1, heroes.get(0)),
                    new PlayerHero(u1, heroes.get(1)),
                    new PlayerHero(u2, heroes.get(2))
            ));
        }
    
        // 5. Équipements joueurs
        if (playerEquipRepo.count() == 0) {
            List<Equipment> equipments = equipRepo.findAll();
            List<PlayerHero> playerHeroes = playerHeroRepo.findAll();
            playerEquipRepo.saveAll(List.of(
                    playerEquip(u1, equipments.get(0), playerHeroes.get(0)),
                    playerEquip(u1, equipments.get(1), null),
                    playerEquip(u2, equipments.get(2), playerHeroes.get(2))
            ));
        }
    
        // 6. Guilde + adhésion
        if (guildRepo.findByName("Chevaliers de l'Aube").isEmpty()) {
            Guild g1 = new Guild();
            g1.setName("Chevaliers de l'Aube");
            g1.setDescription("Guild RP active");
            guildRepo.save(g1);
    
            membershipRepo.saveAll(List.of(
                    new GuildMembership(null, u1, g1, "leader", null),
                    new GuildMembership(null, u2, g1, "member", null)
            ));
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
}
