
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
     * Invoque un héros spécifique via son code.
     */
    @PostMapping("/random")
    public ResponseEntity<String> summon(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        Optional<PlayerHero> result = summonService.performSummon(user);

        return result.isPresent()
                ? ResponseEntity.ok("✅ Héros invoqué !")
                : ResponseEntity.ok("❌ Invocation échouée");
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
