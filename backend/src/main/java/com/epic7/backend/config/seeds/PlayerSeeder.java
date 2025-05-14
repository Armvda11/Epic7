package com.epic7.backend.config.seeds;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.EquipmentRepository;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.PlayerEquipmentRepository;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PlayerSeeder {
    private final PlayerHeroRepository playerHeroRepo;
    private final PlayerEquipmentRepository playerEquipRepo;
    private final UserRepository userRepo;
    private final HeroRepository heroRepo;
    private final EquipmentRepository equipRepo;

    public void seedPlayerHeroes() {
        if (playerHeroRepo.count() == 0) {
            Optional<User> u1 = userRepo.findByEmail("hermas@example.com");
            Optional<User> u2 = userRepo.findByEmail("arya@example.com");
            Optional<User> u3 = userRepo.findByEmail("corentin@example.com");
            List<Hero> heroes = heroRepo.findAll();

            if (u1.isPresent() && u2.isPresent() && heroes.size() >= 3) {
                playerHeroRepo.saveAll(List.of(
                    new PlayerHero(u1.get(), heroes.get(0)),
                    new PlayerHero(u1.get(), heroes.get(1)),
                    new PlayerHero(u1.get(), heroes.get(5)),
                    new PlayerHero(u1.get(), heroes.get(3)),
                    new PlayerHero(u2.get(), heroes.get(0)),,
                    new PlayerHero(u2.get(), heroes.get(1)),
                    new PlayerHero(u2.get(), heroes.get(5)),
                    new PlayerHero(u2.get(), heroes.get(3))
                    new PlayerHero(u3.get(), heroes.get(0)),
                    new PlayerHero(u3.get(), heroes.get(1)),
                    new PlayerHero(u3.get(), heroes.get(5)),
                    new PlayerHero(u3.get(), heroes.get(2)),
                    new PlayerHero(u3.get(), heroes.get(4)),
                    new PlayerHero(u3.get(), heroes.get(3))
                ));
                System.out.println("✅ Héros joueurs ajoutés.");
            }
        }
    }

    public void seedPlayerEquipment() {
        if (playerEquipRepo.count() == 0) {
            List<PlayerHero> playerHeroes = playerHeroRepo.findAll();
            List<Equipment> equipments = equipRepo.findAll();
            Optional<User> u1 = userRepo.findByEmail("hermas@example.com");

            if (u1.isPresent() && equipments.size() >= 3 && playerHeroes.size() >= 3) {
                playerEquipRepo.saveAll(List.of(
                    playerEquip(u1.get(), equipments.get(0), playerHeroes.get(0)),
                    playerEquip(u1.get(), equipments.get(1), null)
                ));
                System.out.println("✅ Équipements joueurs ajoutés.");
            }
        }
    }

    private PlayerEquipment playerEquip(User u, Equipment e, PlayerHero hero) {
        return PlayerEquipment.builder().user(u).equipment(e).playerHero(hero).level(1).experience(0).build();
    }
}
