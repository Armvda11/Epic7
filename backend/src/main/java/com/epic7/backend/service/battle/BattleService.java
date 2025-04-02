package com.epic7.backend.service.battle;

import com.epic7.backend.dto.battleDTO.BattleParticipantDTO;
import com.epic7.backend.dto.battleDTO.BattleStateDTO;
import com.epic7.backend.dto.battleDTO.CombatLogDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.skill_kit.SkillCategory;
import com.epic7.backend.model.skill_kit.TriggerCondition;
import com.epic7.backend.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Service de gestion des combats.
 * Contient la logique de démarrage, de tour par tour et d'application des
 * compétences.
 * Utilise le moteur de compétences pour appliquer les effets.
 */
@Service
@RequiredArgsConstructor
public class BattleService {

    private final SkillService skillService; // Service pour récupérer les compétences
    private final SkillEngine skillEngine; // Moteur de compétences

    /**
     * Démarre un combat avec une équipe de joueurs et un boss.
     * Initialise l'état du combat avec les participants, leurs statistiques et
     * compétences.
     * 
     * @param playerTeam equipe de joueurs
     * @param boss       boss
     * @return état du combat
     */
    public BattleState startBattle(List<PlayerHero> playerTeam, Hero boss) {
        BattleState state = new BattleState();

        for (PlayerHero ph : playerTeam) {
            state.getParticipants().add(buildParticipantFromPlayerHero(ph));
        }

        BattleParticipant bossParticipant = buildParticipantFromHero(boss);
        state.getParticipants().add(bossParticipant);

        // 🔥 Application des passifs ON_BATTLE_START
        for (BattleParticipant p : state.getParticipants()) {
            for (Skill s : p.getSkills()) {
                if (s.getCategory() == SkillCategory.PASSIVE &&
                        s.getTriggerCondition() == TriggerCondition.ON_BATTLE_START) {
                    skillEngine.applyPassive(p, s, null);
                }
            }
        }

        return state;
    }

    public BattleState performTurn(BattleState state, BattleParticipant actor, Skill skill, List<BattleParticipant> targets) {
        actor.resetActionGauge();
        actor.reduceCooldowns();
    
        // ✅ log actions
        List<CombatLogDTO> turnLogs = new ArrayList<>();
    
        // Appliquer passifs ON_TURN_START
        for (Skill s : actor.getSkills()) {
            if (s.getCategory() == SkillCategory.PASSIVE &&
                    s.getTriggerCondition() == TriggerCondition.ON_TURN_START) {
                skillEngine.applyPassive(actor, s, null);
            }
        }
    
        // Appliquer compétence principale
        for (BattleParticipant target : targets) {
            int beforeHp = target.getCurrentHp();
    
            skillEngine.applySkill(actor, skill, List.of(target)); // une cible à la fois
    
            int afterHp = target.getCurrentHp();
            int value = Math.abs(afterHp - beforeHp);
            boolean isHeal = afterHp > beforeHp;
    
            turnLogs.add(new CombatLogDTO(
                    actor.getName(),
                    skill.getName(),
                    target.getName(),
                    value,
                    isHeal
            ));
        }
        if (state.isCombatOver()) {
            state.getLogs().add(new CombatLogDTO("Système", "Fin du combat", "Camp vainqueur : " + state.getWinnerSide(), 0, false));
        }
        
    
        state.getLogs().clear(); // ou conserver un historique si tu veux
        state.getLogs().addAll(turnLogs);
    
        state.setTurnNumber(state.getTurnNumber() + 1);
        return state;
    }


    public BattleState performAITurn(BattleState state) {
        BattleParticipant boss = state.getParticipants().stream()
            .filter(p -> p.getSide().equals("BOSS") && p.isAlive() && p.isReady())
            .findFirst()
            .orElse(null);
    
        if (boss == null) return state;
    
        Skill skill = boss.getSkills().stream()
            .filter(s -> s.getCategory() == SkillCategory.ACTIVE)
            .filter(s -> boss.getCooldowns().getOrDefault(s.getId(), 0) == 0)
            .max(Comparator.comparing(Skill::getScalingFactor))
            .orElse(null);
    
        if (skill == null) return state;
    
        List<BattleParticipant> targets = state.getAliveAlliesOf("ENEMY"); // donc camp PLAYER
        if (targets.isEmpty()) return state;
    
        BattleParticipant target = targets.get(0); // premier en vie (simpliste)
    
        return performTurn(state, boss, skill, List.of(target));
    }
    
    

    private BattleParticipant buildParticipantFromHero(Hero h) {
        BattleParticipant p = new BattleParticipant();
        p.setBaseHero(h);
        p.setSide("BOSS"); // Le boss est du côté opposé
        p.setCurrentHp(h.getHealth());
        p.setTotalAttack(h.getBaseAttack());
        p.setTotalDefense(h.getBaseDefense());
        p.setTotalSpeed(h.getBaseSpeed());

        List<Skill> skills = skillService.getSkillsByHeroId(h.getId());
        p.setSkills(skills);

        return p;
    }

    private BattleParticipant buildParticipantFromPlayerHero(PlayerHero ph) {
        Hero h = ph.getHero();
        BattleParticipant p = new BattleParticipant();
        p.setPlayerHeroId(ph.getId());
        p.setBaseHero(h);
        p.setSide("PLAYER");
        p.setCurrentHp(h.getHealth());
        p.setTotalAttack(h.getBaseAttack());
        p.setTotalDefense(h.getBaseDefense());
        p.setTotalSpeed(h.getBaseSpeed());

        for (PlayerEquipment eq : ph.getOwnedEquipments()) {
            if (eq.isEquipped()) {
                p.setTotalAttack(p.getTotalAttack() + eq.getEquipment().getAttackBonus());
                p.setTotalDefense(p.getTotalDefense() + eq.getEquipment().getDefenseBonus());
                p.setTotalSpeed(p.getTotalSpeed() + eq.getEquipment().getSpeedBonus());
                p.setCurrentHp(p.getCurrentHp() + eq.getEquipment().getHealthBonus());
            }
        }

        List<Skill> skills = skillService.getSkillsByHeroId(h.getId());
        p.setSkills(skills);

        return p;
    }


public BattleStateDTO toDTO(BattleState state) {
    BattleStateDTO dto = new BattleStateDTO();
    dto.setTurnNumber(state.getTurnNumber());
    dto.setLogs(state.getLogs());

    List<BattleParticipantDTO> participantsDTO = state.getParticipants().stream().map(p -> {
        BattleParticipantDTO pDto = new BattleParticipantDTO();
        pDto.setName(p.getName());
        pDto.setSide(p.getSide());
        pDto.setCurrentHp(p.getCurrentHp());
        pDto.setTotalAttack(p.getTotalAttack());
        pDto.setTotalDefense(p.getTotalDefense());
        pDto.setTotalSpeed(p.getTotalSpeed());
        pDto.setActionGauge(p.getActionGauge());
        pDto.setCooldowns(p.getCooldowns());
        pDto.setSkills(p.getSkills().stream().map(skillService::toDTO).toList());

        return pDto;
    }).toList();

    dto.setParticipants(participantsDTO);
    return dto;
}

}