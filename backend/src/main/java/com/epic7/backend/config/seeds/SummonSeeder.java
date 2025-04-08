package com.epic7.backend.config.seeds;

import com.epic7.backend.model.Banner;
import com.epic7.backend.model.Hero;
import com.epic7.backend.repository.BannerRepository;
import com.epic7.backend.repository.HeroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SummonSeeder {

    private final HeroRepository heroRepository;
    private final BannerRepository bannerRepository;

    public void seedSummons() {
        if (bannerRepository.count() == 0) {
            List<Hero> allHeroes = heroRepository.findAll();

            if (allHeroes.size() >= 3) {

                Banner banner1 = new Banner();
                banner1.setName("Summon Banner 1");
                banner1.setCreatedAt(LocalDateTime.now().minusDays(1));
                banner1.setStartsAt(LocalDateTime.now()); //Start date
                banner1.setEndsAt(LocalDateTime.now().plusMinutes(5)); //End date
                banner1.setFeaturedHeroes(List.of(allHeroes.get(0)));

                bannerRepository.save(banner1);
                Banner banner2 = new Banner();
                banner2.setName("Summon Banner 2");
                banner2.setCreatedAt(LocalDateTime.now().minusDays(1)); 
                banner2.setStartsAt(LocalDateTime.now()); //Start date
                banner2.setEndsAt(LocalDateTime.now().plusDays(1)); //End date
                banner2.setFeaturedHeroes(List.of(allHeroes.get(1), allHeroes.get(2)));
                bannerRepository.save(banner2);
            }
        } else {
            System.out.println("⚠️ Banners already exist in the database.");
        }
    }
}