package com.epic7.backend.service.battle.rta;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.service.battle.engine.BattleEngine;
import com.epic7.backend.service.battle.engine.ParticipantFactory;
import com.epic7.backend.service.battle.engine.SkillEngine;
import com.epic7.backend.service.battle.manager.BattleManager;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RtaBattleServiceImpl implements BattleManager {
    private final ParticipantFactory participantFactory;
    private final BattleEngine battleEngine;
    private final SkillEngine skillEngine;
    private final PlayerHeroRepository playerHeroRepo;

    // Stockage en mémoire des sessions actives
    private final Map<String, BattleState> activeBattles = new ConcurrentHashMap<>();

    @Override
    public boolean startRtaBattle(String battleId,
                                  User player1, User player2,
                                  List<Long> player1HeroIds,
                                  List<Long> player2HeroIds) {
        // Construire les participants
        List<BattleParticipant> participants = new ArrayList<>();
        
        // Ajouter les héros du joueur 1 avec son ID
        String player1Id = player1.getId().toString();
        for (Long id : player1HeroIds) {
            PlayerHero ph = playerHeroRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            BattleParticipant participant = participantFactory.fromPlayerHeroWithUserId(ph, player1Id);
            participants.add(participant);
        }
        
        // Ajouter les héros du joueur 2 avec son ID
        String player2Id = player2.getId().toString();
        for (Long id : player2HeroIds) {
            PlayerHero ph = playerHeroRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            BattleParticipant participant = participantFactory.fromPlayerHeroWithUserId(ph, player2Id);
            participants.add(participant);
        }

        // Ordonner par vitesse et initialiser l'état
        battleEngine.sortParticipantsBySpeed(participants);
        BattleState state = new BattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setRoundCount(1);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("⚔️ Combat RTA démarré !")));
        
        // Stockage explicite des IDs des joueurs pour faciliter les vérifications côté client
        state.setPlayer1Id(player1Id);
        state.setPlayer2Id(player2Id);

        // Avancer jusqu'au premier tour joueur
        state = battleEngine.processUntilNextPlayer(state);

        // Stocker la session
        activeBattles.put(battleId, state);
        return true;
    }

    @Override
    public boolean applySkillAction(String battleId, Long skillId, Long targetId) {
        if (battleId == null || skillId == null || targetId == null) {
            throw new IllegalArgumentException("Paramètres invalides pour applySkillAction: " +
                "battleId=" + battleId + ", skillId=" + skillId + ", targetId=" + targetId);
        }
        
        BattleState state = getBattleState(battleId);
        if (state == null) {
            throw new IllegalStateException("Bataille introuvable: " + battleId);
        }
        
        // Vérifier si c'est bien au tour du joueur qui fait l'action
        if (state.getCurrentTurnIndex() >= state.getParticipants().size()) {
            state.getLogs().add("❌ Index de tour invalide: " + state.getCurrentTurnIndex());
            return false;
        }
        
        BattleParticipant currentParticipant = state.getParticipants().get(state.getCurrentTurnIndex());
        
        // Logging amélioré pour le débogage
        state.getLogs().add("ℹ️ Tentative d'utilisation de compétence " + skillId + " par " + 
            currentParticipant.getName() + " sur cible " + targetId);
        
        try {
            // Vérification plus robuste que la cible est valide
            BattleParticipant targetParticipant = null;
            
            for (BattleParticipant p : state.getParticipants()) {
                if (p != null && p.getId() != null && p.getId().equals(targetId)) {
                    targetParticipant = p;
                    break;
                }
            }
            
            if (targetParticipant == null) {
                state.getLogs().add("❌ Cible invalide: " + targetId);
                return false;
            }
            
            // Utiliser la compétence et obtenir le résultat
            skillEngine.useSkillWithResult(state, skillId, targetId);
        } catch (Exception e) {
            state.getLogs().add("❌ Erreur lors de l'utilisation de la compétence: " + e.getMessage());
            return false;
        }
        
        // Vérifier si combat terminé
        if (checkBattleEnd(state)) {
            state.setFinished(true);
            return true;
        }
        
        // Passer au joueur suivant
        battleEngine.nextTurn(state);
        
        return true;
    }
    
    /**
     * Vérifie si le combat est terminé (un camp a été éliminé).
     */
    private boolean checkBattleEnd(BattleState state) {
        // Récupérer tous les userId uniques des participants
        Set<String> userIds = state.getParticipants().stream()
            .map(BattleParticipant::getUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        
        if (userIds.size() != 2) {
            // Cas anormal: il devrait y avoir exactement 2 joueurs
            return false;
        }
        
        // Pour chaque joueur, vérifier s'il a encore des héros vivants
        Map<String, Boolean> playerAliveStatus = new HashMap<>();
        
        for (String userId : userIds) {
            boolean isAlive = state.getParticipants().stream()
                .filter(p -> userId.equals(p.getUserId()))
                .anyMatch(p -> p.getCurrentHp() > 0);
            
            playerAliveStatus.put(userId, isAlive);
        }
        
        // Vérifier si un des joueurs n'a plus de héros vivants
        if (playerAliveStatus.containsValue(false)) {
            // Trouver le perdant et le gagnant
            String loserId = null;
            String winnerId = null;
            
            for (Map.Entry<String, Boolean> entry : playerAliveStatus.entrySet()) {
                if (!entry.getValue()) {
                    loserId = entry.getKey();
                } else {
                    winnerId = entry.getKey();
                }
            }
            
            // Ajouter le résultat aux logs
            if (winnerId != null) {
                state.getLogs().add("Le joueur avec l'ID " + winnerId + " remporte la victoire!");
            }
            
            return true;
        }
        
        return false;
    }

    @Override
    public void endRtaBattle(String battleId, Long winnerId) {
        activeBattles.remove(battleId);
    }

    @Override
    public BattleState getBattleState(String battleId) {
        BattleState state = activeBattles.get(battleId);
        if (state == null) {
            throw new IllegalStateException("Session introuvable : " + battleId);
        }
        return state;
    }
}
