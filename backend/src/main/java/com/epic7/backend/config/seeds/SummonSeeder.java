package com.epic7.backend.config.seeds;

import com.epic7.backend.model.Banner;
import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.Hero;
import com.epic7.backend.repository.BannerRepository;
import com.epic7.backend.repository.EquipmentRepository;
import com.epic7.backend.repository.HeroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SummonSeeder {

    private final HeroRepository heroRepository;
    private final EquipmentRepository equipmentRepository;
    private final BannerRepository bannerRepository;

    public void seedSummons() {
        if (bannerRepository.count() == 0) {
            List<Hero> allHeroes = heroRepository.findAll();
            List<Equipment> allEquipments = equipmentRepository.findAll();
            if (allHeroes.size() >= 3) {

                Banner banner1 = new Banner();
                banner1.setName("Summon Banner 1");
                banner1.setCreatedAt(Instant.now().minus(1, ChronoUnit.DAYS)); // Date de création
                banner1.setStartsAt(Instant.now()); //Start date
                banner1.setEndsAt(Instant.now().plus(5, ChronoUnit.MINUTES)); //End date
                banner1.setFeaturedHeroes(List.of(allHeroes.get(0)));
                banner1.setFeaturedEquipments(null);
                banner1.setCout(50);
                bannerRepository.save(banner1);
                Banner banner2 = new Banner();
                banner2.setName("Summon Banner 2");
                banner2.setCreatedAt(Instant.now().minus(1, ChronoUnit.DAYS)); 
                banner2.setStartsAt(Instant.now()); //Start date
                banner2.setEndsAt(Instant.now().plus(1, ChronoUnit.DAYS)); //End date
                banner2.setFeaturedHeroes(List.of(allHeroes.get(1), allHeroes.get(2)));
                banner2.setFeaturedEquipments(allEquipments);
                banner2.setCout(100);
                bannerRepository.save(banner2);
            }
        } else {
            System.out.println("⚠️ Banners already exist in the database.");
        }
    }
}