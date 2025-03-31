package com.epic7.backend.service;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.SkillCategory;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service métier pour la gestion des compétences (skills) des héros.
 * Règles métier :
 * - Maximum 3 compétences par héros
 * - Une seule compétence passive, obligatoirement en 2e position
 */
@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final HeroRepository heroRepository;
    private final PlayerHeroRepository playerHeroRepository;

    /**
     * Récupère toutes les compétences associées à un héros (entité Hero).
     */
    public List<Skill> getSkillsByHeroId(Long heroId) {
        return skillRepository.findByHeroId(heroId);
    }

    /**
     * Récupère les compétences d’un héros sous forme de DTO.
     */
    public List<SkillDTO> getSkillDTOsByHero(Long heroId) {
        return getSkillsByHeroId(heroId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Ajoute une compétence à un héros.
     * Vérifie les règles métier : Avec validationSkillAddition
     * @param heroId    
     * @param skill
     * @return
     */
    public Skill addSkillToHero(Long heroId, Skill skill) {
        // Vérifie si le héros existe
        Hero hero = heroRepository.findById(heroId)
                .orElseThrow(() -> new RuntimeException("Héros introuvable"));

        // Vérifie si la compétence existe déjà
        List<Skill> existingSkills = skillRepository.findByHero(hero);

        
        validateSkillAddition(existingSkills, skill); // Vérification des règles métier


        skill.setHero(hero); // Associe la compétence au héros
        return skillRepository.save(skill); // Enregistre la compétence
    }

    /**
     * Vérifie si l'ajout d'une compétence respecte les règles métier.
     * - Maximum 3 compétences
     * - Une seule compétence passive, obligatoirement en 2e position
     * @param existingSkills
     * @param skill
     */
    private void validateSkillAddition(List<Skill> existingSkills, Skill skill) {
        if (existingSkills.size() >= 3) {
            throw new IllegalStateException("Un héros ne peut pas avoir plus de 3 compétences.");
        }

        if (skill.getCategory() == SkillCategory.PASSIVE) {
            boolean hasPassive = existingSkills.stream()
                    .anyMatch(s -> s.getCategory() == SkillCategory.PASSIVE);
            if (hasPassive) {
                throw new IllegalArgumentException("Un héros ne peut avoir qu'une seule compétence passive.");
            }
            if (existingSkills.size() != 1) {
                throw new IllegalArgumentException("La compétence passive doit être en 2e position.");
            }
        }
    }

    /**
     * Supprime une compétence par son ID.
     */
    public void deleteSkill(Long skillId) {
        skillRepository.deleteById(skillId);
    }

    /**
     * Vérifie la position de la compétence passive.
     * La compétence passive doit être en 2e position (index 1).
     * @param heroId    
     */
    public void validatePassiveSkillPosition(Long heroId) {
        List<Skill> skills = skillRepository.findByHeroId(heroId);
        for (int i = 0; i < skills.size(); i++) {
            Skill skill = skills.get(i);
            if (skill.getCategory() == SkillCategory.PASSIVE && i != 1) {
                throw new IllegalStateException("La compétence passive doit être en 2e position.");
            }
        }
    }

    /**
     * Retourne les compétences liées à un PlayerHero, après vérification d'appartenance.
     */
    public List<Skill> getSkillsForPlayerHeroByPlayerHeroId(Long playerHeroId, User user) {
        PlayerHero playerHero = playerHeroRepository.findById(playerHeroId)
                .orElseThrow(() -> new RuntimeException("Héros introuvable"));

        if (!playerHero.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Ce héros ne vous appartient pas.");
        }

        return skillRepository.findByHero(playerHero.getHero());
    }

    /**
     * Récupère une compétence par son ID.
     */
    public Skill getSkillById(Long skillId) {
        return skillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Compétence introuvable"));
    }

    /**
     * Met à jour une compétence existante.
     */
    public Skill updateSkill(Long skillId, Skill updated) {
        Skill existing = getSkillById(skillId);

        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setAction(updated.getAction());
        existing.setTargetGroup(updated.getTargetGroup());
        existing.setTargetCount(updated.getTargetCount());
        existing.setScalingStat(updated.getScalingStat());
        existing.setScalingFactor(updated.getScalingFactor());
        existing.setCooldown(updated.getCooldown());
        existing.setPassiveBonus(updated.getPassiveBonus());
        existing.setBonusValue(updated.getBonusValue());
        existing.setApplyToAllies(updated.getApplyToAllies());
        existing.setTriggerCondition(updated.getTriggerCondition());

        return skillRepository.save(existing);
    }

    /**
     * Convertit une entité Skill en DTO (Data Transfer Object).
     */
    public SkillDTO toDTO(Skill skill) {
        SkillDTO dto = new SkillDTO();
        dto.setId(skill.getId());
        dto.setName(skill.getName());
        dto.setDescription(skill.getDescription());
        dto.setCategory(skill.getCategory() != null ? skill.getCategory().name() : null);
        dto.setAction(skill.getAction() != null ? skill.getAction().name() : null);
        dto.setTargetGroup(skill.getTargetGroup() != null ? skill.getTargetGroup().name() : null);
        dto.setTargetCount(skill.getTargetCount());
        dto.setScalingStat(skill.getScalingStat() != null ? skill.getScalingStat().name() : null);
        dto.setScalingFactor(skill.getScalingFactor());
        dto.setCooldown(skill.getCooldown());
        dto.setPassiveBonus(skill.getPassiveBonus() != null ? skill.getPassiveBonus().name() : null);
        dto.setBonusValue(skill.getBonusValue());
        dto.setApplyToAllies(skill.getApplyToAllies());
        dto.setTriggerCondition(skill.getTriggerCondition() != null ? skill.getTriggerCondition().name() : null);
        return dto;
    }
}
