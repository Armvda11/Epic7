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

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BattleService {

    private final SkillService skillService;
    private final SkillEngine skillEngine;

    public BattleState startBattle(List<PlayerHero> playerTeam, Hero boss) {
        BattleState state = new BattleState();

        for (PlayerHero ph : playerTeam) {
            state.getParticipants().add(buildParticipantFromPlayerHero(ph));
        }

        BattleParticipant bossParticipant = buildParticipantFromHero(boss);
        state.getParticipants().add(bossParticipant);

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

    public BattleState performTurn(BattleState state, BattleParticipant actor, Skill skill, List<BattleParticipant> initialTargets) {
        actor.resetActionGauge();
        actor.reduceCooldowns();
        List<CombatLogDTO> turnLogs = new ArrayList<>();

        for (Skill s : actor.getSkills()) {
            if (s.getCategory() == SkillCategory.PASSIVE && s.getTriggerCondition() == TriggerCondition.ON_TURN_START) {
                skillEngine.applyPassive(actor, s, null);
            }
        }

        List<BattleParticipant> actualTargets = resolveTargets(state, actor, skill, initialTargets);

        for (BattleParticipant target : actualTargets) {
            int beforeHp = target.getCurrentHp();
            skillEngine.applySkill(actor, skill, List.of(target));
            int afterHp = target.getCurrentHp();
            boolean isHeal = afterHp > beforeHp;
            int value = Math.abs(afterHp - beforeHp);

            turnLogs.add(new CombatLogDTO(
                actor.getName(),
                skill.getName(),
                target.getName(),
                value,
                isHeal
            ));
        }

        if (state.isCombatOver()) {
            turnLogs.add(new CombatLogDTO("Système", "Fin du combat", "Camp vainqueur : " + state.getWinnerSide(), 0, false));
        }

        state.getLogs().clear();
        state.getLogs().addAll(turnLogs);
        state.setTurnNumber(state.getTurnNumber() + 1);
        return state;
    }

    public BattleState performAITurn(BattleState state) {
        BattleParticipant boss = state.getParticipants().stream()
            .filter(p -> (p.getSide().equals("BOSS") || p.getSide().equals("ENEMY")) && p.isAlive() && p.isReady())
            .findFirst()
            .orElse(null);

        if (boss == null) return state;

        Skill skill = boss.getSkills().stream()
            .filter(s -> s.getCategory() == SkillCategory.ACTIVE)
            .filter(s -> boss.getCooldowns().getOrDefault(s.getId(), 0) == 0)
            .max(Comparator.comparing(Skill::getScalingFactor))
            .orElse(null);

        if (skill == null) return state;

        List<BattleParticipant> targets = state.getAliveAlliesOf("ENEMY");
        if (targets.isEmpty()) return state;

        BattleParticipant target = targets.get(0);
        return performTurn(state, boss, skill, List.of(target));
    }

    public BattleState processNextReadyTurn(BattleState state) {
        state.advanceTimeToNextTurn();
        BattleParticipant actor = state.getReadyParticipant().orElse(null);
        if (actor == null) return state;

        if (actor.getSide().equals("BOSS") || actor.getSide().equals("ENEMY")) {
            return performAITurn(state);
        }

        return state;
    }

    public BattleState runFullBattleCycle(BattleState state) {
        while (!state.isCombatOver()) {
            state.advanceTimeToNextTurn();
            BattleParticipant actor = state.getReadyParticipant().orElse(null);
            if (actor == null) return state;
            if (actor.getSide().equals("PLAYER")) return state;
            state = performAITurn(state);
        }
        return state;
    }

    private List<BattleParticipant> resolveTargets(BattleState state, BattleParticipant actor, Skill skill, List<BattleParticipant> providedTargets) {
        return switch (skill.getTargetGroup()) {
            case ALL_ALLIES -> state.getParticipants().stream()
                .filter(p -> p.getSide().equals(actor.getSide()) && p.isAlive())
                .toList();
            case ALL_ENEMIES -> state.getParticipants().stream()
                .filter(p -> !p.getSide().equals(actor.getSide()) && p.isAlive())
                .toList();
            case SINGLE_ENEMY, SINGLE_ALLY, SELF -> providedTargets;
            default -> throw new IllegalArgumentException("TargetGroup non géré : " + skill.getTargetGroup());
        };
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

        p.setSkills(skillService.getSkillsByHeroId(h.getId()));
        return p;
    }

    private BattleParticipant buildParticipantFromHero(Hero h) {
        BattleParticipant p = new BattleParticipant();
        p.setBaseHero(h);
        p.setSide("BOSS");
        p.setCurrentHp(h.getHealth());
        p.setTotalAttack(h.getBaseAttack());
        p.setTotalDefense(h.getBaseDefense());
        p.setTotalSpeed(h.getBaseSpeed());
        p.setSkills(skillService.getSkillsByHeroId(h.getId()));
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
            pDto.setSkills(p.getSkills().stream().map(skillService::toDTO).collect(Collectors.toList()));
            return pDto;
        }).toList();

        dto.setParticipants(participantsDTO);
        return dto;
    }
}