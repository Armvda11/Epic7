package com.epic7.backend.service.battle.simple;

import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.dto.simple.SimpleSkillActionRequest;
import com.epic7.backend.dto.simple.SkillActionResultDTO;
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
            if (state == null || state.isFinished())
                return state;

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

            if (actor.getCurrentHp() <= 0)
                return nextTurn(state);

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

            int[] amountHolder = new int[1]; // Tableau mutable pour encapsuler la valeur

            switch (skill.getAction()) {
                case DAMAGE -> {
                    amountHolder[0] = (int) (skill.getScalingFactor() * actor.getAttack() - target.getDefense());
                    amountHolder[0] = Math.max(1, amountHolder[0]);
                    target.setCurrentHp(Math.max(0, target.getCurrentHp() - amountHolder[0]));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                            " sur " + target.getName() + " et inflige " + amountHolder[0] + " dégâts.");
                }
                case HEAL -> {
                    amountHolder[0] = (int) (skill.getScalingFactor() * actor.getMaxHp());
                    if (skill.getTargetGroup() == TargetGroup.ALL_ALLIES) {
                        state.getParticipants().stream()
                                .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                                .forEach(p -> p.setCurrentHp(Math.min(p.getMaxHp(), p.getCurrentHp() + amountHolder[0])));
                        state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                                " et soigne tous les alliés de " + amountHolder[0] + " points de vie.");
                    } else {
                        actor.setCurrentHp(Math.min(actor.getMaxHp(), actor.getCurrentHp() + amountHolder[0]));
                        state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                                " et se soigne de " + amountHolder[0] + " points de vie.");
                    }
                }
            }

            // Utilisez amountHolder[0] comme la valeur finale de amount
            int amount = amountHolder[0];

            if (skill.getCooldown() > 0) {
                state.putCooldown(actor.getId(), skill.getId(), skill.getCooldown());
            }

            if (checkEnd(state))
                return state;

            return processUntilNextPlayer(nextTurn(state));
        }

    public SimpleBattleState processUntilNextPlayer(SimpleBattleState state) {
        while (!state.isFinished()) {
            SimpleBattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());
            if (current.isPlayer())
                break;

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

            state.getLogs().add(
                    current.getName() + " (Boss) attaque " + target.getName() + " et inflige " + damage + " dégâts.");

            if (checkEnd(state))
                return state;

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
    public SkillActionResultDTO useSkillWithResult(SimpleBattleState state, SimpleSkillActionRequest request) {
        if (state == null || state.isFinished()) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }
    
        // 👇 Héros courant (acteur)
        SimpleBattleParticipant actor = state.getParticipants().get(state.getCurrentTurnIndex());
        Skill skill = skillService.getSkillById(request.getSkillId());
    
        // ✅ Vérifier que le skill appartient bien au héros du joueur (si c'est un joueur)
        if (actor.isPlayer()) {
            try {
                PlayerHero playerHero = playerHeroService.findById(actor.getId()); // actor.getId() = playerHeroId
                Hero hero = playerHero.getHero();
    
                boolean belongsToHero = hero.getSkills().stream()
                    .anyMatch(s -> s.getId().equals(skill.getId()));
    
                if (!belongsToHero) {
                    state.getLogs().add("❌ Cette compétence n'appartient pas au héros sélectionné.");
                    return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
                }
            } catch (Exception e) {
                state.getLogs().add("❌ Erreur lors de la vérification du héros joueur.");
                return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
            }
        }
    
        if (!skill.isActive()) {
            state.getLogs().add("❌ Cette compétence n'est pas active.");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }
    
        if (actor.getCurrentHp() <= 0) {
            SimpleBattleState updated = processUntilNextPlayer(nextTurn(state));
            return new SkillActionResultDTO(new SimpleBattleStateDTO(updated), 0, null, "NONE");
        }
    
        if (state.isSkillOnCooldown(actor.getId(), skill.getId())) {
            state.getLogs().add("⏳ Compétence en recharge !");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }
    
        SimpleBattleParticipant target = state.getParticipants().stream()
            .filter(p -> p.getId().equals(request.getTargetId()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("❌ Cible non trouvée."));
    
        int[] amountHolder = new int[1];
    
        switch (skill.getAction()) {
            case DAMAGE -> {
                amountHolder[0] = (int) (skill.getScalingFactor() * actor.getAttack() - target.getDefense());
                amountHolder[0] = Math.max(1, amountHolder[0]);
                target.setCurrentHp(Math.max(0, target.getCurrentHp() - amountHolder[0]));
                state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                    " sur " + target.getName() + " et inflige " + amountHolder[0] + " dégâts.");
            }
            case HEAL -> {
                amountHolder[0] = (int) (skill.getScalingFactor() * actor.getMaxHp());
                if (skill.getTargetGroup() == TargetGroup.ALL_ALLIES) {
                    state.getParticipants().stream()
                        .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                        .forEach(p -> p.setCurrentHp(Math.min(p.getMaxHp(), p.getCurrentHp() + amountHolder[0])));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                        " et soigne tous les alliés de " + amountHolder[0] + " points de vie.");
                } else {
                    actor.setCurrentHp(Math.min(actor.getMaxHp(), actor.getCurrentHp() + amountHolder[0]));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                        " et se soigne de " + amountHolder[0] + " points de vie.");
                }
            }
        }
    
        int amount = amountHolder[0];
    
        if (skill.getCooldown() > 0) {
            state.putCooldown(actor.getId(), skill.getId(), skill.getCooldown());
        }
    
        if (checkEnd(state)) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), amount, target.getId(), skill.getAction().name());
        }
    
        SimpleBattleState updated = processUntilNextPlayer(nextTurn(state));
        return new SkillActionResultDTO(new SimpleBattleStateDTO(updated), amount, target.getId(), skill.getAction().name());
    }
    
}
