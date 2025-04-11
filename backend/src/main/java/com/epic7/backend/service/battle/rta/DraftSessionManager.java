package com.epic7.backend.service.battle.rta;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.User;

import lombok.Getter;

@Service
public class DraftSessionManager {

    private final Map<String, DraftSession> draftSessions = new ConcurrentHashMap<>();

    public DraftSession createDraftSession( User player1, User player2) {
        String sessionId = player1.getId() + "-" + player2.getId();
        DraftSession session = new DraftSession(sessionId, player1, player2);
        draftSessions.put(sessionId, session);
        return session;
    }

    public DraftSession getDraftSession(String sessionId) {
        return draftSessions.get(sessionId);
    }
    public void removeDraftSession(String sessionId) {
        draftSessions.remove(sessionId);
    }



    @Getter
    public class DraftSession {
        private final String sessionId;
        private final User player1;
        private final User player2;

        private final List<Long> picksPlayer1 = new ArrayList<>();
        private final List<Long> picksPlayer2 = new ArrayList<>();

        private int turn = 0;

        public DraftSession(String sessionId, User p1, User p2) {
            this.sessionId = sessionId;
            this.player1 = p1;
            this.player2 = p2;
        }

        public boolean isPlayerTurn(User user) {
            return (turn % 2 == 0 && user.getId().equals(player1.getId())) ||
                    (turn % 2 == 1 && user.getId().equals(player2.getId()));
        }

        public boolean pickHero(User user, Long heroId) {
            if (!isPlayerTurn(user))
                return false;
            if (turn >= 8)
                return false;

            if (turn % 2 == 0) {
                picksPlayer1.add(heroId);
            } else {
                picksPlayer2.add(heroId);
            }
            turn++;
            return true;
        }

        public boolean isComplete() {
            return turn >= 8;
        }
    }

}
