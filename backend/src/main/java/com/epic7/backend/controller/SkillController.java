package com.epic7.backend.controller;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.Skill;
import com.epic7.backend.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST pour gérer les compétences (skills) des héros.
 * 
 * Ce contrôleur fournit des endpoints pour récupérer, ajouter, mettre à jour et
 * supprimer des compétences.
 * @author hermas
 */
@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    /**
     * Récupère toutes les compétences d'un héros par son ID.
     * 
     * @param heroId ID du héros
     * @return Liste de compétences associées au héros
     */
    @GetMapping("/hero/{heroId}")
    public ResponseEntity<List<SkillDTO>> getSkillsByHero(@PathVariable Long heroId) {
        List<SkillDTO> skills = skillService.getSkillDTOsByHero(heroId);
        return ResponseEntity.ok(skills);
    }

    /**
     * Ajoute une compétence à un héros.
     * @param heroId
     * @param skill
     * @return
     */
    @PostMapping("/hero/{heroId}")
    public ResponseEntity<SkillDTO> addSkillToHero(
            @PathVariable Long heroId,
            @RequestBody Skill skill) {
        Skill savedSkill = skillService.addSkillToHero(heroId, skill);
        SkillDTO dto = skillService.toDTO(savedSkill);
        return ResponseEntity.ok(dto);
    }

    /**
     * Supprime une compétence par son ID.
     * @param skillId
     * @return
     */
    @DeleteMapping("/{skillId}")
    public ResponseEntity<Void> deleteSkill(@PathVariable Long skillId) {
        skillService.deleteSkill(skillId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Récupère une compétence par son ID.
     * @param skillId
     * @return
     */
    @GetMapping("/{skillId}")
    public ResponseEntity<SkillDTO> getSkillById(@PathVariable Long skillId) {
        Skill skill = skillService.getSkillById(skillId);
        return ResponseEntity.ok(skillService.toDTO(skill));
    }

    /**
     * Met à jour une compétence par son ID.
     * @param skillId
     * @param skill
     * @return
     */
    @PutMapping("/{skillId}")
    public ResponseEntity<SkillDTO> updateSkill(@PathVariable Long skillId, @RequestBody Skill skill) {
        Skill updated = skillService.updateSkill(skillId, skill);
        return ResponseEntity.ok(skillService.toDTO(updated));
    }
}
