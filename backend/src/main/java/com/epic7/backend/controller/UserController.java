package com.epic7.backend.controller;

import com.epic7.backend.dto.UserProfileResponse;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthService authService;

    @GetMapping("/me")
    public UserProfileResponse getUserProfile(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);

        User user = authService.getUserByEmail(email);

        return new UserProfileResponse(
                user.getUsername(),
                user.getLevel(),
                user.getGold(),
                user.getDiamonds()
        );
    }
}
