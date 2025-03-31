package com.epic7.backend.service;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.SkillCategory;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service pour gérer les compétences des héros.
 * Règles :
 * - Maximum 3 compétences par héros
 * - Une seule compétence passive autorisée, à la 2e position
 * 
 * @author hermas
 */
@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final HeroRepository heroRepository;

    /**
     * Récupère les compétences d’un héros.
     */
    public List<Skill> getSkillsByHeroId(Long heroId) {
        return skillRepository.findByHeroId(heroId);
    }

    /**
     * Récupère les compétences d’un héros au format DTO.
     */
    public List<SkillDTO> getSkillDTOsByHero(Long heroId) {
        return skillRepository.findByHeroId(heroId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Ajoute une compétence à un héros avec validation métier.
     */
    public Skill addSkillToHero(Long heroId, Skill skill) {
        Hero hero = heroRepository.findById(heroId)
                .orElseThrow(() -> new RuntimeException("Héros introuvable"));

        List<Skill> skills = skillRepository.findByHero(hero);

        if (skills.size() >= 3) {
            throw new IllegalStateException("Un héros ne peut pas avoir plus de 3 compétences.");
        }

        if (skill.getCategory() == SkillCategory.PASSIVE) {
            boolean alreadyHasPassive = skills.stream()
                    .anyMatch(s -> s.getCategory() == SkillCategory.PASSIVE);

            if (alreadyHasPassive) {
                throw new IllegalArgumentException("Un héros ne peut avoir qu'une seule compétence passive.");
            }

            if (skills.size() != 1) {
                throw new IllegalArgumentException("La compétence passive doit être en 2e position.");
            }
        }

        skill.setHero(hero);
        return skillRepository.save(skill);
    }

    /**
     * Supprime une compétence.
     */
    public void deleteSkill(Long skillId) {
        skillRepository.deleteById(skillId);
    }

    /**
     * Vérifie la position de la compétence passive.
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
     * Retourne les compétences d’un héros pour un utilisateur (authentification future).
     */
    public List<Skill> getSkillsForPlayerHero(Long heroId, User user) {
        return getSkillsByHeroId(heroId);
    }

    /**
     * Récupère une compétence par son ID.
     */
    public Skill getSkillById(Long skillId) {
        return skillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Compétence introuvable"));
    }

    /**
     * Convertit une entité Skill en DTO.
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
