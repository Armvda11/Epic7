package com.epic7.backend.controller;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.Skill;
import com.epic7.backend.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST pour gérer les compétences (skills) liées aux héros.
 * Expose les endpoints permettant d’afficher, ajouter et gérer les compétences.
 * 
 * @author hermas
 */
@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    /**
     * Récupère les compétences (au format DTO) d’un héros donné.
     *
     * @param heroId ID du héros
     * @return Liste des SkillDTO
     */
    @GetMapping("/hero/{heroId}")
    public ResponseEntity<List<SkillDTO>> getSkillsByHero(@PathVariable Long heroId) {
        List<SkillDTO> skills = skillService.getSkillDTOsByHero(heroId);
        return ResponseEntity.ok(skills);
    }

    /**
     * Ajoute une compétence à un héros.
     *
     * @param heroId ID du héros
     * @param skill Compétence à ajouter (reçue en JSON)
     * @return Compétence ajoutée (au format DTO)
     */
    @PostMapping("/hero/{heroId}")
    public ResponseEntity<SkillDTO> addSkillToHero(
            @PathVariable Long heroId,
            @RequestBody Skill skill
    ) {
        Skill savedSkill = skillService.addSkillToHero(heroId, skill);
        SkillDTO dto = skillService.toDTO(savedSkill);
        return ResponseEntity.ok(dto);
    }

    /**
     * Supprime une compétence par son ID.
     *
     * @param skillId ID de la compétence à supprimer
     * @return 204 No Content si suppression réussie
     */
    @DeleteMapping("/{skillId}")
    public ResponseEntity<Void> deleteSkill(@PathVariable Long skillId) {
        skillService.deleteSkill(skillId);
        return ResponseEntity.noContent().build();
    }
}
