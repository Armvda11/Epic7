package com.epic7.backend.service.battle.simple;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.dto.simple.SimpleActionRequest;
import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.dto.simple.SimpleSkillActionRequest;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.User;
import com.epic7.backend.model.skill_kit.SkillAction;
import com.epic7.backend.model.skill_kit.SkillCategory;
import com.epic7.backend.repository.HeroRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.epic7.backend.service.*;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SimpleBattleService {

    private final PlayerHeroService playerHeroService;
    private final HeroRepository heroRepository;
    private final HeroService heroService;
    private final SkillService skillService;

    public SimpleBattleState useSkill(SimpleBattleState state, SimpleSkillActionRequest request) {
        if (state == null || state.isFinished())
            return state;

        // Trouver l’acteur
        PlayerHero playerHero = playerHeroService.findById(request.getPlayerHeroId());
        Hero hero = playerHero.getHero();

        Skill skill = skillService.getSkillById(request.getSkillId());

        // Vérifier que la compétence appartient bien à ce héros
        boolean belongsToHero = hero.getSkills().stream()
                .anyMatch(s -> s.getId().equals(skill.getId()));

        if (!belongsToHero) {
            state.getLogs().add("❌ Cette compétence n'appartient pas au héros sélectionné.");
            return state;
        }

        // Trouver le participant du combat correspondant au héros
        SimpleBattleParticipant actor = state.getParticipants().stream()
                .filter(p -> p.isPlayer() && p.getId().equals(request.getPlayerHeroId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Acteur non trouvé."));

        if (actor.getCurrentHp() <= 0)
            return nextTurn(state);

        // Trouver la cible
        SimpleBattleParticipant target = state.getParticipants().stream()
                .filter(p -> p.getId().equals(request.getTargetId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Cible non trouvée."));

        if (!skill.isActive()) {
            state.getLogs().add("❌ Cette compétence n'est pas active.");
            return state;
        }

        // Appliquer l'effet
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
                actor.setCurrentHp(Math.min(actor.getMaxHp(), actor.getCurrentHp() + healAmount));
                state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                        " et soigne " + healAmount + " points de vie.");
            }
            // TODO : gérer les autres effets plus tard
        }

        if (checkEnd(state)) {
            return state;
        }

        return processUntilNextPlayer(nextTurn(state));
    }

    public SimpleBattleState runFullAutoBattle(SimpleBattleState state, User user) {
        while (!state.isFinished()) {
            SimpleBattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());

            if (current.isPlayer()) {
                Long playerHeroId = current.getId();

                // 🔎 Récupération des compétences actives triées par priorité
                List<SkillDTO> activeSkills = skillService.getSkillDTOsForPlayerHeroByPlayerHeroId(playerHeroId)
                        .stream()
                        .filter(dto -> dto.getCategory().equals(SkillCategory.ACTIVE.name()))
                        .sorted(Comparator.comparingInt(SkillDTO::getPosition))
                        .toList();

                if (activeSkills.isEmpty()) {
                    state.getLogs().add("❌ " + current.getName() + " n’a aucune compétence active à utiliser.");
                    state = nextTurn(state);
                    continue;
                }

                // 🥇 Compétence prioritaire sélectionnée
                SkillDTO selectedSkill = activeSkills.get(0);

                // 🎯 Cibler le premier ennemi encore vivant
                List<SimpleBattleParticipant> targets = state.getParticipants().stream()
                        .filter(p -> !p.isPlayer() && p.getCurrentHp() > 0)
                        .toList();

                if (!targets.isEmpty()) {
                    Long targetId = targets.get(0).getId();
                    SimpleSkillActionRequest action = new SimpleSkillActionRequest(playerHeroId, selectedSkill.getId(),
                            targetId);
                    state = useSkill(state, action);
                } else {
                    // Tous les ennemis sont morts
                    break;
                }

            } else {
                // Tour du boss : traitement automatique
                state = processUntilNextPlayer(state);
            }
        }

        return state;
    }

    public SimpleBattleState autoPlayerTurn(SimpleBattleState state, Long playerHeroId) {
        SimpleBattleParticipant actor = state.getParticipants().stream()
                .filter(p -> Objects.equals(p.getId(), playerHeroId) && p.isPlayer())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Acteur introuvable"));

        PlayerHero playerHero = playerHeroService.findById(playerHeroId);
        List<Skill> skills = playerHero.getHero().getSkills().stream()
                .filter(skill -> skill.getCategory() == SkillCategory.ACTIVE)
                .sorted(Comparator.comparingInt(Skill::getPosition).reversed())
                .toList();

        for (Skill skill : skills) {
            // Ici tu pourras plus tard vérifier le cooldown si tu l’implémentes
            // Pour l’instant on les suppose toujours disponibles

            // Trouve une cible ennemie
            Optional<SimpleBattleParticipant> targetOpt = state.getParticipants().stream()
                    .filter(p -> !p.isPlayer() && p.getCurrentHp() > 0)
                    .findFirst();

            if (targetOpt.isPresent()) {
                SimpleSkillActionRequest req = new SimpleSkillActionRequest();
                req.setPlayerHeroId(playerHeroId);
                req.setSkillId(skill.getId());
                req.setTargetId(targetOpt.get().getId());

                return useSkill(state, req);
            }
        }

        state.getLogs().add(actor.getName() + " ne trouve pas de compétence active à utiliser.");
        return nextTurn(state);
    }

    public SimpleBattleState startBattle(User user, Long bossHeroId) {
        List<PlayerHero> allPlayerHeroes = playerHeroService.getAllByUser(user);

        List<PlayerHero> playerHeroes = allPlayerHeroes.stream()
                .sorted(Comparator.comparingInt(ph -> ph.getHero().getBaseSpeed()))
                .limit(4)
                .toList();

        Hero baseBossHero = heroRepository.findById(bossHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Boss introuvable: " + bossHeroId));

        // Ne modifie pas l'original, clone-le proprement :
        Hero bossHero = heroService.copyForBoss(baseBossHero);

        List<SimpleBattleParticipant> participants = new ArrayList<>();

        for (PlayerHero ph : playerHeroes) {
            Hero h = ph.getHero();
            participants.add(new SimpleBattleParticipant(
                    ph.getId(),
                    h.getName(),
                    h.getHealth(),
                    h.getHealth(),
                    h.getBaseAttack(),
                    h.getBaseDefense(),
                    h.getBaseSpeed(),
                    true));
        }

        participants.add(new SimpleBattleParticipant(
                -1L, // ou une valeur unique, genre -999
                bossHero.getName(),
                bossHero.getHealth(),
                bossHero.getHealth(),
                bossHero.getBaseAttack(),
                bossHero.getBaseDefense(),
                bossHero.getBaseSpeed(),
                false));

        participants.sort(Comparator.comparingInt(SimpleBattleParticipant::getSpeed).reversed());

        SimpleBattleState state = new SimpleBattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("Combat commencé contre " + bossHero.getName() + " !")));

        // Lancer l’IA immédiatement si le boss commence
        state = processUntilNextPlayer(state);

        return state;
    }

    public SimpleBattleState doTurn(SimpleBattleState state, SimpleActionRequest request) {
        if (state.isFinished())
            return state;

        SimpleBattleParticipant actor = state.getParticipants().get(state.getCurrentTurnIndex());

        // Vérifie que c’est bien au joueur d’agir
        if (!actor.isPlayer()) {
            state.getLogs().add("❌ Ce n’est pas au joueur de jouer.");
            return state;
        }

        Optional<SimpleBattleParticipant> targetOpt = state.getParticipants().stream()
                .filter(p -> Objects.equals(p.getId(), request.getTargetId()))
                .findFirst();

        if (targetOpt.isEmpty()) {
            state.getLogs().add("❌ Cible invalide.");
            return state;
        }

        SimpleBattleParticipant target = targetOpt.get();
        int damage = Math.max(1, actor.getAttack() - target.getDefense());
        target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));

        state.getLogs().add(actor.getName() + " attaque " + target.getName() + " et inflige " + damage + " dégâts.");

        // Check fin du combat
        if (checkEnd(state))
            return state;

        // Passer au tour suivant (et lancer IA si nécessaire)
        return processUntilNextPlayer(nextTurn(state));
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

    public SimpleBattleState processUntilNextPlayer(SimpleBattleState state) {
        while (!state.isFinished()) {
            SimpleBattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());

            if (current.isPlayer()) {
                break;
            }

            // IA du boss
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
                state.setCurrentTurnIndex(nextIndex);
                return state;
            }
        }

        state.setFinished(true);
        return state;
    }

    public SimpleBattleStateDTO convertToDTO(SimpleBattleState state) {
        return new SimpleBattleStateDTO(state);
    }
}
