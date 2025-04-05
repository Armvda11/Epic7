package com.epic7.backend.controller;

import com.epic7.backend.model.Banner;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.SummonService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/summons")
public class SummonController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final SummonService summonService;

    public SummonController(JwtUtil jwtUtil, AuthService authService, SummonService summonService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.summonService = summonService;
    }

    /**
     * Invoque un héros aléatoire.
     */
    @PostMapping("/random")
    public ResponseEntity<String> summonRandomHero(HttpServletRequest request) {
        // Extraire l'utilisateur à partir du token JWT
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        // Appeler le service pour effectuer une invocation aléatoire
        Optional<PlayerHero> result = summonService.performRandomSummon(user);
        if (user.getDiamonds() < SummonService.SUMMON_COST) {
            return ResponseEntity.badRequest().body("❌ Vous n'avez pas assez de gemmes pour invoquer !");
        }

        // Retourner la réponse en fonction du résultat
        return result.isPresent()
                ? ResponseEntity.ok("✅ Héros invoqué : " + result.get().getHero().getName())
                : ResponseEntity.badRequest().body("❌ Invocation échouée ou pas assez de gemmes !");
    }

    /**
     * Récupère la bannière d'invocation actuelle avec les héros mis en avant.
     */
    @GetMapping("/banner")
    public ResponseEntity<?> getCurrentBanner(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        System.out.println("✅ Utilisateur authentifié : " + user.getUsername());

        Optional<Banner> bannerOpt = summonService.getActiveBanner();
        if (bannerOpt.isEmpty()) {
            System.out.println("⚠️ Aucune bannière active trouvée.");
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(bannerOpt.get().getFeaturedHeroes());
    }
}
