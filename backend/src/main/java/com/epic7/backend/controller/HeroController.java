package com.epic7.backend.controller;

import com.epic7.backend.dto.HeroViewDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.service.HeroService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur pour accéder aux héros de base disponibles dans le jeu.
 */
@RestController
@RequestMapping("/api/hero")
@RequiredArgsConstructor
public class HeroController {

   private final HeroRepository heroRepository;
    private final HeroService heroService;


    /**
     * Liste tous les héros existants.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Hero>> getAllHeroes() {
        return ResponseEntity.ok(heroRepository.findAll());
    }

    /**
     * Récupère un héros par son nom.
     * 
     * @param name
     * @return
     */
    @GetMapping("/search")
    public ResponseEntity<Hero> findByName(@RequestParam String name) {
        return heroRepository.findByName(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    /**
     * Récupère un héros par son ID.
     * @param id
     * @return
     */
     public ResponseEntity<HeroViewDTO> getHeroById(@PathVariable Long id) {
        Hero hero = heroRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Héros introuvable"));
        return ResponseEntity.ok(heroService.toViewDTO(hero));
    }

    /**
 * Liste tous les héros avec leurs compétences (DTO enrichi).
 */
@GetMapping("/all/view")
public ResponseEntity<List<HeroViewDTO>> getAllHeroesView() {
    List<Hero> heroes = heroRepository.findAll();
    List<HeroViewDTO> result = heroes.stream()
            .map(heroService::toViewDTO)
            .toList();
    return ResponseEntity.ok(result);
}


}
