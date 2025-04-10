package com.epic7.backend.config.seeds;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Element;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.model.skill_kit.*;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.SkillRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class HeroSeeder {

private final HeroRepository heroRepo;
private final SkillRepository skillRepo;

@PostConstruct
public void seedHeroesAndSkills() {
        if (heroRepo.count() == 0) {
        Hero hwayoung = createHero("Hwayoung", Element.DARK, Rarity.LEGENDARY, 1208, 616, 102, 6488);
        Hero mlPiera = createHero("Ml Piera", Element.DARK, Rarity.EPIC, 885, 613, 115, 6149);
        Hero mavuika = createHero("Mavuika", Element.ICE, Rarity.EPIC, 100, 100, 100, 1000);
        Hero krau = createHero("Krau", Element.LIGHT, Rarity.NORMAL, 100, 100, 100, 1000);

        heroRepo.saveAll(List.of(hwayoung, mlPiera, mavuika, krau));
        System.out.println("✅ Héros créés.");
        }

        if (skillRepo.count() == 0) {
        heroRepo.findByName("Hwayoung").ifPresent(this::seedSkillsForHwayoung);
        heroRepo.findByName("Ml Piera").ifPresent(this::seedSkillsForMlPiera);
        }
}

private Hero createHero(String name, Element el, Rarity rarity, int atk, int def, int spd, int hp) {
        return Hero.builder()
                .name(name)
                .element(el)
                .rarity(rarity)
                .baseAttack(atk)
                .baseDefense(def)
                .baseSpeed(spd)
                .health(hp)
                .build();
}

private void seedSkillsForHwayoung(Hero hwayoung) {
        skillRepo.saveAll(List.of(
                Skill.builder()
                        .name("Infernal Strike")
                        .description("Attacks the enemy with kicks, and increases speed of the master.")
                        .category(SkillCategory.ACTIVE)
                        .action(SkillAction.DAMAGE)
                        .targetGroup(TargetGroup.SINGLE_ENEMY)
                        .targetCount(1)
                        .scalingStat(StatScaling.ATTACK)
                        .scalingFactor(1.4)
                        .cooldown(0)
                        .position(0)
                        .hero(hwayoung)
                        .build(),

                Skill.builder()
                        .name("Divine Vessel")
                        .description(
                                "At the start of the first battle, increases Defense proportional to Attack. When an ally dies, activates bystandar ( super strong atk).")
                        .category(SkillCategory.PASSIVE)
                        .passiveBonus(PassiveBonusType.DEFENSE_UP)
                        .bonusValue(30.0)
                        .applyToAllies(false)
                        .triggerCondition(TriggerCondition.ON_ALLY_DEATH)
                        .position(1)
                        .hero(hwayoung)
                        .build(),

                Skill.builder()
                        .name("Sura: Reave the Skies")
                        .description(
                                "Attacks the enemy with a rage-filled strike. Ignores damage reduction and sharing. Bonus damage vs Light.")
                        .category(SkillCategory.ACTIVE)
                        .action(SkillAction.DAMAGE)
                        .targetGroup(TargetGroup.SINGLE_ENEMY)
                        .targetCount(1)
                        .scalingStat(StatScaling.ATTACK)
                        .scalingFactor(2.0)
                        .cooldown(4)
                        .position(2)
                        .hero(hwayoung)
                        .build()));
        System.out.println("✅ Compétences de Hwayoung créées.");
}

private void seedSkillsForMlPiera(Hero mlPiera) {
        skillRepo.saveAll(List.of(
                Skill.builder()
                        .name("Bash")
                        .description("Attack the enemy, with a chance to decrease Defense.")
                        .category(SkillCategory.ACTIVE)
                        .action(SkillAction.DAMAGE)
                        .targetGroup(TargetGroup.SINGLE_ENEMY)
                        .targetCount(1)
                        .scalingStat(StatScaling.ATTACK)
                        .scalingFactor(1.0)
                        .cooldown(0)
                        .position(0)
                        .hero(mlPiera)
                        .build(),

                Skill.builder()
                        .name("Time to Rampage")
                        .description("At the start of the turn, increases Attack by 20%.")
                        .category(SkillCategory.PASSIVE)
                        .passiveBonus(PassiveBonusType.ATTACK_UP)
                        .bonusValue(20.0)
                        .applyToAllies(false)
                        .triggerCondition(TriggerCondition.ON_TURN_START)
                        .position(1)
                        .hero(mlPiera)
                        .build(),

                Skill.builder()
                        .name("Hound the Indolent")
                        .description("Heals all allies based on caster's health.")
                        .category(SkillCategory.ACTIVE)
                        .action(SkillAction.HEAL)
                        .scalingStat(StatScaling.HEALTH) // ⚠️ C'est ça qui manquait
                        .scalingFactor(0.5) // Exemple : soigne 50% du HP de Ml Piera
                        .targetGroup(TargetGroup.ALL_ALLIES)
                        .targetCount(4)
                        .cooldown(3)
                        .position(2)
                        .hero(mlPiera)
                        .build()

        ));
        System.out.println("✅ Compétences de Ml Piera créées.");
}
}
