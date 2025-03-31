package com.epic7.backend.controller;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST pour la lecture des compétences des héros.
 * Toutes les compétences sont ajoutées via le backend (seeder),
 * ce contrôleur est en lecture seule.
 * @author hermas
 */
@RestController
@RequestMapping("/api/skill")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    /**
     * Récupère les compétences d’un héros (entité Hero).
     * Utilisé par les administrateurs ou encyclopédies.
     */
    @GetMapping("/hero/{heroId}")
    public ResponseEntity<List<SkillDTO>> getSkillsByHero(@PathVariable Long heroId) {
        return ResponseEntity.ok(skillService.getSkillDTOsByHero(heroId));
    }

    /**
     * Récupère les compétences du héros possédé (PlayerHero).
     * Utilisé pour l’affichage in-game ou les combats.
     */
    @GetMapping("/player-hero/{playerHeroId}/skills")
    public ResponseEntity<List<SkillDTO>> getSkillsByPlayerHeroId(@PathVariable Long playerHeroId) {
        return ResponseEntity.ok(skillService.getSkillDTOsForPlayerHeroByPlayerHeroId(playerHeroId));
    }

    /**
     * Récupère une compétence spécifique par son ID.
     * Utile pour le debug ou des effets de combat.
     */
    @GetMapping("/{skillId}")
    public ResponseEntity<SkillDTO> getSkillById(@PathVariable Long skillId) {
        return ResponseEntity.ok(skillService.toDTO(skillService.getSkillById(skillId)));
    }
}
