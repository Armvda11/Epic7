package com.epic7.backend.service;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service métier pour la lecture des compétences (skills).
 * Les compétences sont liées aux héros dans la base de données
 * et exposées sous forme de DTO.
 */
@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;

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
                .toList();
    }

    /**
     * Récupère les compétences d’un héros joueur (PlayerHero).
     */
    public List<SkillDTO> getSkillDTOsForPlayerHeroByPlayerHeroId(Long playerHeroId) {
        PlayerHero playerHero = playerHeroRepository.findById(playerHeroId)
                .orElseThrow(() -> new RuntimeException("Héros joueur introuvable"));
        return skillRepository.findByHero(playerHero.getHero())
                .stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Récupère une compétence par son ID.
     */
    public Skill getSkillById(Long skillId) {
        return skillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Compétence introuvable"));
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
        dto.setPosition(skill.getPosition());
        dto.setIcon(skill.getIcon());
        dto.setAnimation(skill.getAnimation());
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
