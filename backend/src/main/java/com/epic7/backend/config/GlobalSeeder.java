package com.epic7.backend.config;

import com.epic7.backend.config.seeds.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GlobalSeeder {
    private final UserSeeder userSeeder;
    private final HeroSeeder heroSeeder;
    private final EquipmentSeeder equipmentSeeder;
    private final PlayerSeeder playerSeeder;
    private final MessageSeeder messageSeeder;
    private final ShopSeeder shopSeeder;
    private final SummonSeeder summonSeeder;

    @PostConstruct
    public void seed() {
        userSeeder.seedUsers();
        System.out.println("✅ Utilisateurs créés.");
        heroSeeder.seedHeroesAndSkills();
        System.out.println("✅ Héros et compétences créés.");
        equipmentSeeder.seedEquipment();
        System.out.println("✅ Équipements créés.");
        playerSeeder.seedPlayerHeroes();
        System.out.println("✅ Héros joueurs ajoutés.");
        playerSeeder.seedPlayerEquipment();
        System.out.println("✅ Équipements joueurs ajoutés.");
        messageSeeder.seedMessages();
        System.out.println("✅ Messages créés.");
        shopSeeder.seedShopItems();
        System.out.println("✅ Articles de la boutique créés.");
        summonSeeder.seedSummons();
        System.out.println("✅ Invocations prêtes.");
        
        System.out.println("✅ Base de données initialisée.");
    }
}
