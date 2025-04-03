package com.epic7.backend.service.battle.simple;

import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.dto.simple.SimpleSkillActionRequest;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.User;

import com.epic7.backend.model.skill_kit.TargetGroup;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.service.HeroService;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SimpleBattleService {

    private final PlayerHeroService playerHeroService;
    private final HeroRepository heroRepository;
    private final HeroService heroService;
    private final SkillService skillService;

    public SimpleBattleState initBattle(User user, Long bossHeroId) {
        List<PlayerHero> allPlayerHeroes = playerHeroService.getAllByUser(user);
        List<PlayerHero> playerHeroes = allPlayerHeroes.stream()
                .sorted(Comparator.comparingInt(ph -> ph.getHero().getBaseSpeed()))
                .limit(4)
                .toList();

        Hero baseBossHero = heroRepository.findById(bossHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Boss introuvable: " + bossHeroId));
        Hero bossHero = heroService.copyForBoss(baseBossHero);

        List<SimpleBattleParticipant> participants = new ArrayList<>();
        for (PlayerHero ph : playerHeroes) {
            Hero h = ph.getHero();
            participants.add(new SimpleBattleParticipant(
                    ph.getId(), h.getName(), h.getHealth(), h.getHealth(),
                    h.getBaseAttack(), h.getBaseDefense(), h.getBaseSpeed(), true));
        }

        participants.add(new SimpleBattleParticipant(
                -1L, bossHero.getName(), bossHero.getHealth(), bossHero.getHealth(),
                bossHero.getBaseAttack(), bossHero.getBaseDefense(), bossHero.getBaseSpeed(), false));

        participants.sort(Comparator.comparingInt(SimpleBattleParticipant::getSpeed).reversed());

        SimpleBattleState state = new SimpleBattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("Combat commencé contre " + bossHero.getName() + " !")));

        return processUntilNextPlayer(state);
    }

    public SimpleBattleState useSkill(SimpleBattleState state, SimpleSkillActionRequest request) {
        if (state == null || state.isFinished()) return state;

        PlayerHero playerHero = playerHeroService.findById(request.getPlayerHeroId());
        Hero hero = playerHero.getHero();
        Skill skill = skillService.getSkillById(request.getSkillId());

        boolean belongsToHero = hero.getSkills().stream()
                .anyMatch(s -> s.getId().equals(skill.getId()));
        if (!belongsToHero) {
            state.getLogs().add("❌ Cette compétence n'appartient pas au héros sélectionné.");
            return state;
        }

        SimpleBattleParticipant actor = state.getParticipants().stream()
                .filter(p -> p.isPlayer() && p.getId().equals(request.getPlayerHeroId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Acteur non trouvé."));

        if (actor.getCurrentHp() <= 0) return nextTurn(state);

        if (state.isSkillOnCooldown(actor.getId(), skill.getId())) {
            state.getLogs().add("⏳ Compétence en recharge !");
            return state;
        }

        SimpleBattleParticipant target = state.getParticipants().stream()
                .filter(p -> p.getId().equals(request.getTargetId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Cible non trouvée."));

        if (!skill.isActive()) {
            state.getLogs().add("❌ Cette compétence n'est pas active.");
            return state;
        }

        switch (skill.getAction()) {
            case DAMAGE -> {
                int damage = (int) (skill.getScalingFactor() * actor.getAttack() - target.getDefense());
                damage = Math.max(1, damage);
                target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));
                state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                        " sur " + target.getName() + " et inflige " + damage + " dégâts.");
            }
            case HEAL -> {
                int healAmount = (int) (skill.getScalingFactor() * actor.getMaxHp());
                if (skill.getTargetGroup() == TargetGroup.ALL_ALLIES) {
                    state.getParticipants().stream()
                            .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                            .forEach(p -> p.setCurrentHp(Math.min(p.getMaxHp(), p.getCurrentHp() + healAmount)));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                            " et soigne tous les alliés de " + healAmount + " points de vie.");
                } else {
                    actor.setCurrentHp(Math.min(actor.getMaxHp(), actor.getCurrentHp() + healAmount));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                            " et se soigne de " + healAmount + " points de vie.");
                }
            }
        }

        if (skill.getCooldown() > 0) {
            state.putCooldown(actor.getId(), skill.getId(), skill.getCooldown());
        }

        if (checkEnd(state)) return state;

        return processUntilNextPlayer(nextTurn(state));
    }

    public SimpleBattleState processUntilNextPlayer(SimpleBattleState state) {
        while (!state.isFinished()) {
            SimpleBattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());
            if (current.isPlayer()) break;

            List<SimpleBattleParticipant> targets = state.getParticipants().stream()
                    .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                    .toList();

            if (targets.isEmpty()) {
                state.getLogs().add("❌ Tous les héros sont morts.");
                state.setFinished(true);
                return state;
            }

            SimpleBattleParticipant target = targets.get(new Random().nextInt(targets.size()));
            int damage = Math.max(1, current.getAttack() - target.getDefense());
            target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));

            state.getLogs().add(current.getName() + " (Boss) attaque " + target.getName() + " et inflige " + damage + " dégâts.");

            if (checkEnd(state)) return state;

            state = nextTurn(state);
        }
        return state;
    }

    private SimpleBattleState nextTurn(SimpleBattleState state) {
        int size = state.getParticipants().size();
        for (int i = 1; i <= size; i++) {
            int nextIndex = (state.getCurrentTurnIndex() + i) % size;
            if (state.getParticipants().get(nextIndex).getCurrentHp() > 0) {
                Long nextHeroId = state.getParticipants().get(nextIndex).getId();
                state.reduceCooldownsForHero(nextHeroId);
                state.setCurrentTurnIndex(nextIndex);
                return state;
            }
        }
        state.setFinished(true);
        return state;
    }

    private boolean checkEnd(SimpleBattleState state) {
        boolean allPlayersDead = state.getParticipants().stream().noneMatch(p -> p.isPlayer() && p.getCurrentHp() > 0);
        boolean bossDead = state.getParticipants().stream().noneMatch(p -> !p.isPlayer() && p.getCurrentHp() > 0);

        if (allPlayersDead) {
            state.getLogs().add("❌ Tous vos héros sont morts. Défaite.");
            state.setFinished(true);
            return true;
        }
        if (bossDead) {
            state.getLogs().add("🎉 Le boss est vaincu. Victoire !");
            state.setFinished(true);
            return true;
        }
        return false;
    }

    public SimpleBattleStateDTO convertToDTO(SimpleBattleState state) {
        return new SimpleBattleStateDTO(state);
    }
}
