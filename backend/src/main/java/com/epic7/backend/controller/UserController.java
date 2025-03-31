package com.epic7.backend.controller;

import com.epic7.backend.dto.UserProfileResponse;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.UserService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import com.epic7.backend.dto.FriendUserDTO;
import java.util.List;


@RestController
@RequestMapping("/api/user")
public class UserController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final UserService userService;

    public UserController(JwtUtil jwtUtil, AuthService authService, UserService userService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.userService = userService;
    }


    @GetMapping("/me")
    public UserProfileResponse getProfile(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        User user = authService.getUserByEmail(jwtUtil.extractEmail(token));

        userService.updateEnergy(user); // Mise à jour à la volée

        return new UserProfileResponse(
                user.getUsername(),
                user.getLevel(),
                user.getGold(),
                user.getDiamonds(),
                user.getEnergy());
    }

    @GetMapping("/friends")
    public List<FriendUserDTO> getFriends(HttpServletRequest request,
                                        @RequestParam(defaultValue = "0") Long userId,
                                        @RequestParam(defaultValue = "0") int premier,
                                        @RequestParam(defaultValue = "5") int dernier) {
        userService.getFriends(userId, premier, dernier);

        return userService.getFriends(userId, premier, dernier)
                .stream()
                .map(friend -> new FriendUserDTO(
                        friend.getId(),
                        friend.getUsername(),
                        friend.getLevel()))
                .toList();
    }
}