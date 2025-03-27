package com.epic7.backend.controller;

import com.epic7.backend.dto.UserProfileResponse;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.UserEnergyService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final UserEnergyService energyService;

    public UserController(JwtUtil jwtUtil, AuthService authService, UserEnergyService energyService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.energyService = energyService;
    }

    @GetMapping("/me")
    public UserProfileResponse getProfile(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        User user = authService.getUserByEmail(jwtUtil.extractEmail(token));

        energyService.updateEnergy(user); // Mise à jour à la volée

        return new UserProfileResponse(
                user.getUsername(),
                user.getLevel(),
                user.getGold(),
                user.getDiamonds()
        );
    }
}
