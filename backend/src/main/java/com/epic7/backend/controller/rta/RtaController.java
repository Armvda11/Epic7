package com.epic7.backend.controller.rta;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.epic7.backend.dto.rta.RtaRankingDTO;
import com.epic7.backend.dto.rta.RtaTierInfoDTO;
import com.epic7.backend.repository.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.rta.RtaRankingService;
import com.epic7.backend.utils.JwtUtil;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Contrôleur REST pour les fonctionnalités RTA (Real Time Arena)
 * Gère le classement, les statistiques et les informations de rang
 * @author hermas
 */
@RestController
@RequestMapping("/api/rta")
@RequiredArgsConstructor
@Slf4j
public class RtaController {
    
    private final RtaRankingService rtaRankingService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    /**
     * Récupère le leaderboard RTA
     * @param limit nombre maximum d'entrées à retourner (défaut: 50)
     * @return liste des joueurs classés par points RTA
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<RtaRankingDTO>> getLeaderboard(
            @RequestParam(defaultValue = "50") int limit) {
        try {
            List<RtaRankingDTO> leaderboard = rtaRankingService.getLeaderboard(limit);
            return ResponseEntity.ok(leaderboard);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération du leaderboard RTA", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Récupère les informations de rang RTA pour l'utilisateur connecté
     * @param request requête HTTP pour extraire le token
     * @return informations détaillées sur le rang RTA
     */
    @GetMapping("/my-rank")
    public ResponseEntity<RtaTierInfoDTO> getMyRankInfo(HttpServletRequest request) {
        try {
            String token = jwtUtil.extractTokenFromHeader(request);
            User user = authService.getUserByEmail(jwtUtil.extractEmail(token));
            
            RtaTierInfoDTO tierInfo = rtaRankingService.getTierInfo(user.getRtaPoints(), user.getRtaTier());
            return ResponseEntity.ok(tierInfo);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des informations de rang RTA", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Récupère le classement d'un utilisateur spécifique
     * @param request requête HTTP pour extraire le token
     * @return position dans le classement global
     */
    @GetMapping("/my-position")
    public ResponseEntity<Integer> getMyPosition(HttpServletRequest request) {
        try {
            String token = jwtUtil.extractTokenFromHeader(request);
            User user = authService.getUserByEmail(jwtUtil.extractEmail(token));
            
            int position = rtaRankingService.getUserPosition(user.getRtaPoints());
            return ResponseEntity.ok(position);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de la position RTA", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Récupère les statistiques générales RTA
     * @return statistiques sur la distribution des rangs
     */
    @GetMapping("/stats")
    public ResponseEntity<Object> getRtaStats() {
        try {
            // Vous pouvez implémenter des statistiques générales ici
            // Par exemple: nombre de joueurs par tier, distribution des points, etc.
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des statistiques RTA", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
