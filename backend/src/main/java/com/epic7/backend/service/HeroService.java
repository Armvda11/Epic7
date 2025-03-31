package com.epic7.backend.service;

import com.epic7.backend.dto.HeroViewDTO;
import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.Skill;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HeroService {

    public HeroViewDTO toViewDTO(Hero hero) {
        HeroViewDTO dto = new HeroViewDTO();
        dto.setId(hero.getId());
        dto.setName(hero.getName());
        dto.setElement(hero.getElement().name());
        dto.setRarity(hero.getRarity().name());
        dto.setBaseAttack(hero.getBaseAttack());
        dto.setBaseDefense(hero.getBaseDefense());
        dto.setBaseSpeed(hero.getBaseSpeed());
        dto.setHealth(hero.getHealth());
        dto.setCode(hero.getCode());

        List<SkillDTO> skills = hero.getSkills().stream()
                .map(this::toSkillDTO)
                .toList();
        dto.setSkills(skills);

        return dto;
    }

    private SkillDTO toSkillDTO(Skill skill) {
        SkillDTO dto = new SkillDTO();
        dto.setId(skill.getId());
        dto.setName(skill.getName());
        dto.setDescription(skill.getDescription());
        dto.setCategory(skill.getCategory() != null ? skill.getCategory().name() : null);
        dto.setPosition(skill.getPosition());
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
