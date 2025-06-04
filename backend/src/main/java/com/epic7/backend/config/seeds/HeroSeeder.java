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
       // Hero belian           = createHero("Belian", Element.EARTH,      Rarity.EPIC,      950, 600, 110, 6300);
        Hero krau             = createHero("Krau",   Element.LIGHT,      Rarity.LEGENDARY,1200,700, 100,7000);
    
        Hero harsetti         = createHero("Harsetti",Element.ICE,       Rarity.RARE,      800, 550,115,6000);
        Hero ylinav           = createHero("Ylinav", Element.DARK,       Rarity.LEGENDARY,1100,650,105,6700);
        Hero archidemon       = createHero("Archidemon",Element.DARK,    Rarity.LEGENDARY,1300,800, 90,8000);
        Hero yufine   = createHero("Yufine",Element.DARK,Rarity.LEGENDARY,1150,580,125,6400);
        Hero frida          = createHero("Frida",Element.LIGHT,     Rarity.LEGENDARY, 850,700,100,7500);
        Hero seasideBellona   = createHero("Bellona",Element.FIRE,Rarity.EPIC,      870,630,120,6100);
        Hero specterTenebria  = createHero("Tenebria",Element.DARK,Rarity.LEGENDARY,1200,650,115,6800);



        heroRepo.saveAll(List.of(hwayoung, mlPiera, mavuika, krau, harsetti, ylinav,
        archidemon, yufine, frida,
        seasideBellona, specterTenebria));
        System.out.println("✅ Héros créés.");
        }

        if (skillRepo.count() == 0) {
        heroRepo.findByName("Hwayoung").ifPresent(this::seedSkillsForHwayoung);
        heroRepo.findByName("Ml Piera").ifPresent(this::seedSkillsForMlPiera);

            heroRepo.findByName("Krau").ifPresent(this::seedSkillsForKrau);

            heroRepo.findByName("Harsetti").ifPresent(this::seedSkillsForHarsetti);
            heroRepo.findByName("Ylinav").ifPresent(this::seedSkillsForYlinav);
            heroRepo.findByName("Archidemon").ifPresent(this::seedSkillsForArchidemon);
            heroRepo.findByName("Arbiter Vildred").ifPresent(this::seedSkillsForYufine);
            heroRepo.findByName("Frida").ifPresent(this::seedSkillsForFrida);
            heroRepo.findByName("Seaside Bellona").ifPresent(this::seedSkillsForSeasideBellona);
            heroRepo.findByName("Specter Tenebria").ifPresent(this::seedSkillsForSpecterTenebria);
            System.out.println("✅ Compétences des nouveaux héros créées.");

        
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
    
    private void seedSkillsForKrau(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Light Slash")
                .description("Strikes a single enemy with holy light.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.4)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Guardian Aura")
                .description("On battle start, increases all allies' Defense by 20%.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.DEFENSE_UP)
                .bonusValue(20.0)
                .applyToAllies(true)
                .triggerCondition(TriggerCondition.ON_BATTLE_START)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Divine Heal")
                .description("Heals all allies for 20% of Krau's max HP.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.HEAL)
                .targetGroup(TargetGroup.ALL_ALLIES)
                .targetCount(4)
                .scalingStat(StatScaling.HEALTH)
                .scalingFactor(0.2)
                .cooldown(3)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
  
   

    private void seedSkillsForHarsetti(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Ice Lance")
                .description("Pierces a single enemy with an icy spear.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.3)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Frost Armor")
                .description("At turn start, increases own Defense by 15%.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.DEFENSE_UP)
                .bonusValue(15.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_TURN_START)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Blizzard")
                .description("Deals ice damage to all enemies.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.ALL_ENEMIES)
                .targetCount(5)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.5)
                .cooldown(4)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
    private void seedSkillsForYlinav(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Drain Touch")
                .description("Steals HP from a single enemy.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.HEAL)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.HEALTH)
                .scalingFactor(0.2)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Shadow Veil")
                .description("On battle start, reduces incoming damage by 10%.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.HEAL_REDUCTION)
                .bonusValue(10.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_BATTLE_START)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Dark Pulse")
                .description("Deals dark damage to all enemies.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.ALL_ENEMIES)
                .targetCount(5)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.7)
                .cooldown(3)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
    private void seedSkillsForArchidemon(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Hell Claw")
                .description("Strikes a single enemy with demonic power.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.6)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Infernal Rage")
                .description("When below 50% HP, increases own Attack by 30%.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.ATTACK_UP)
                .bonusValue(30.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_LOW_HEALTH)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Demon’s Wrath")
                .description("Deals massive fire damage to all enemies.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.ALL_ENEMIES)
                .targetCount(5)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(2.0)
                .cooldown(5)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
    private void seedSkillsForYufine(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Judgment Strike")
                .description("Deals precise damage to a single enemy.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.4)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Soul Bond")
                .description("On kill, restores 30% of own max HP.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(null)
                .bonusValue(30.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_KILL)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Nightmare Requiem")
                .description("Deals shadow damage to all enemies.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.ALL_ENEMIES)
                .targetCount(5)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.8)
                .cooldown(4)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
    private void seedSkillsForFrida(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Light Heal")
                .description("Heals a single ally for 30% of Frida's max HP.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.HEAL)
                .targetGroup(TargetGroup.SINGLE_ALLY)
                .targetCount(1)
                .scalingStat(StatScaling.HEALTH)
                .scalingFactor(0.3)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Compassion")
                .description("At turn start, heals self for 10% max HP.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(null)
                .bonusValue(10.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_TURN_START)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Radiant Wave")
                .description("Heals all allies for 20% of Frida's max HP.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.HEAL)
                .targetGroup(TargetGroup.ALL_ALLIES)
                .targetCount(4)
                .scalingStat(StatScaling.HEALTH)
                .scalingFactor(0.2)
                .cooldown(3)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
    private void seedSkillsForSeasideBellona(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Tidal Strike")
                .description("Strikes a single enemy with tidal force.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.4)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Ocean’s Blessing")
                .description("On battle start, increases all allies' Attack by 15%.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.ATTACK_UP)
                .bonusValue(15.0)
                .applyToAllies(true)
                .triggerCondition(TriggerCondition.ON_BATTLE_START)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Tsunami")
                .description("Deals water damage to all enemies.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.ALL_ENEMIES)
                .targetCount(5)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.8)
                .cooldown(4)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
   
    private void seedSkillsForSpecterTenebria(Hero h) {
        skillRepo.saveAll(List.of(
            Skill.builder()
                .name("Phantom Slash")
                .description("Cuts a single enemy with ghostly power.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.SINGLE_ENEMY)
                .targetCount(1)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.5)
                .cooldown(0)
                .position(0)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Eerie Veil")
                .description("When below 50% HP, gains 20% Defense.")
                .category(SkillCategory.PASSIVE)
                .passiveBonus(PassiveBonusType.DEFENSE_UP)
                .bonusValue(20.0)
                .applyToAllies(false)
                .triggerCondition(TriggerCondition.ON_LOW_HEALTH)
                .cooldown(0)
                .position(1)
                .hero(h)
                .build(),
    
            Skill.builder()
                .name("Shadow Storm")
                .description("Deals shadow damage to all enemies.")
                .category(SkillCategory.ACTIVE)
                .action(SkillAction.DAMAGE)
                .targetGroup(TargetGroup.ALL_ENEMIES)
                .targetCount(5)
                .scalingStat(StatScaling.ATTACK)
                .scalingFactor(1.9)
                .cooldown(5)
                .position(2)
                .hero(h)
                .build()
        ));
    }
    
}

