package com.epic7.backend.config.seeds;

import com.epic7.backend.repository.BannerRepository;
import com.epic7.backend.repository.EquipmentRepository;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.model.Banner;
import com.epic7.backend.repository.model.Equipment;
import com.epic7.backend.repository.model.Hero;

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
            if (allHeroes.size() >= 5 & allEquipments.size() >= 1) {

                Banner banner1 = new Banner();
                banner1.setName("Summon Banner 1");
                banner1.setCreatedAt(Instant.now().minus(1, ChronoUnit.DAYS)); // Date de création
                banner1.setStartsAt(Instant.now()); //Start date
                banner1.setEndsAt(Instant.now().plus(12, ChronoUnit.HOURS)); //End date
                banner1.setFeaturedHeroes(List.of(allHeroes.get(0)));
                banner1.setFeaturedEquipments(null);
                banner1.setCout(50);
                bannerRepository.save(banner1);
                Banner banner2 = new Banner();
                banner2.setName("Summon Banner 2");
                banner2.setCreatedAt(Instant.now().minus(1, ChronoUnit.DAYS)); 
                banner2.setStartsAt(Instant.now()); //Start date
                banner2.setEndsAt(Instant.now().plus(1, ChronoUnit.DAYS)); //End date
                banner2.setFeaturedHeroes(allHeroes.subList(1,4));
                banner2.setFeaturedEquipments(allEquipments);
                banner2.setCout(100);
                bannerRepository.save(banner2);

                Banner banner3 = new Banner();
                banner3.setName("Summon Banner 3");
                banner3.setCreatedAt(Instant.now().minus(1, ChronoUnit.DAYS)); 
                banner3.setStartsAt(Instant.now()); //Start date
                banner3.setEndsAt(Instant.now().plus(1, ChronoUnit.DAYS)); //End date
                banner3.setFeaturedHeroes(allHeroes.subList(3,6));
                banner3.setFeaturedEquipments(List.of(allEquipments.get(0)));
                banner3.setCout(125);
                bannerRepository.save(banner3);
            }
        } else {
            System.out.println("⚠️ Banners already exist in the database.");
        }
    }
}