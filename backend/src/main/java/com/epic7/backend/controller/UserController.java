package com.epic7.backend.controller;

import com.epic7.backend.dto.UserProfileResponse;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.UserService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import com.epic7.backend.dto.OtherUserDTO;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;import java.util.Map;


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
    public List<OtherUserDTO> getFriends(HttpServletRequest request,
                                        @RequestParam(defaultValue = "0") Long userId,
                                        @RequestParam(defaultValue = "0") int premier,
                                        @RequestParam(defaultValue = "100") int dernier) {
        try {
            // Simplify the token extraction logic to match other endpoints
            String token = jwtUtil.extractTokenFromHeader(request);
            User currentUser = authService.getUserByEmail(jwtUtil.extractEmail(token));
            
            // If userId is negative, use the current user's ID
            if (userId < 0) {
                userId = currentUser.getId();
            }
            
            System.out.println("Fetching friends for user ID: " + userId);
            
            // Get friends with more robust error handling
            List<User> friendsList = userService.getFriends(userId, premier, dernier);
            
            // Map to DTOs
            return friendsList.stream()
                    .map(friend -> new OtherUserDTO(
                            friend.getId(),
                            friend.getUsername(),
                            friend.getLevel(),
                            "ACCEPTED"))
                    .toList();
        } catch (Exception e) {
            System.err.println("Error in /friends endpoint: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    @GetMapping("/send-friend-requests")
    public boolean sendFriendRequest(HttpServletRequest request,
                                    @RequestParam Long userId) {
        String token = jwtUtil.extractTokenFromHeader(request);
        User user = authService.getUserByEmail(jwtUtil.extractEmail(token));
        try {
            return userService.sendFriendRequest(user, userId);
        } catch (Exception e) {
            System.err.println("Error in /send-friend-requests endpoint: " + e.getMessage());
            return false;
        }
        
    }

    @GetMapping("/accept-friend")
    public boolean addFriend(HttpServletRequest request,
                                    @RequestParam Long userId) {
        String token = jwtUtil.extractTokenFromHeader(request);
        User user = authService.getUserByEmail(jwtUtil.extractEmail(token));

        return userService.acceptFriendRequest(user, userId);
    }

    @GetMapping("/decline-friend")
    public boolean declineFriendRequest(HttpServletRequest request,
                                    @RequestParam Long userId) {
        String token = jwtUtil.extractTokenFromHeader(request);
        User user = authService.getUserByEmail(jwtUtil.extractEmail(token));

        return userService.refuseFriendRequest(user, userId);
    }

    @GetMapping("/remove-friend")
    public boolean removeFriend(HttpServletRequest request,
                                    @RequestParam Long userId) {
        String token = jwtUtil.extractTokenFromHeader(request);
        User user = authService.getUserByEmail(jwtUtil.extractEmail(token));

        return userService.removeFriend(user, userId);
    }

    @GetMapping("/search")
    public List<OtherUserDTO> searchUsers(HttpServletRequest request,
                                        @RequestParam String query) {
        try {
            // Extraire le token et l'utilisateur courant pour journalisation/traçage
            String token = jwtUtil.extractTokenFromHeader(request);
            User currentUser = authService.getUserByEmail(jwtUtil.extractEmail(token));
            
            System.out.println("User " + currentUser.getUsername() + " is searching for: " + query);
            
            // Rechercher les utilisateurs correspondant au terme de recherche
            List<User> foundUsers = userService.searchUsersByUsername(query);
            
            // Convertir les utilisateurs en DTOs
            return foundUsers.stream()
                    .map(user -> new OtherUserDTO(
                            user.getId(),
                            user.getUsername(),
                            user.getLevel(),
                            // Déterminer si l'utilisateur est un ami de l'utilisateur courant
                            currentUser.getFriends() != null && currentUser.getFriends().contains(user) ? "ACCEPTED" : "NONE"))
                    .toList();
        } catch (Exception e) {
            System.err.println("Error in /search endpoint: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    @GetMapping("/profile/{userId}")
    public UserProfileResponse getUserProfileById(HttpServletRequest request, 
                                                @PathVariable Long userId) {
        try {
            // Extraction du token pour la journalisation (optionnel)
            String token = jwtUtil.extractTokenFromHeader(request);
            User currentUser = authService.getUserByEmail(jwtUtil.extractEmail(token));
            
            System.out.println("User " + currentUser.getUsername() + " is viewing profile of user ID: " + userId);
            
            // Récupération du profil demandé
            User targetUser = userService.getUserById(userId);
            
            // Déterminer le statut d'amitié entre l'utilisateur actuel et le profil cible
            String friendshipStatus = "NONE";
            
            // Si c'est le profil de l'utilisateur actuel
            if (currentUser.getId().equals(targetUser.getId())) {
                friendshipStatus = "SELF";
            }
            // Si l'utilisateur cible est un ami
            else if (userService.isFriend(currentUser, targetUser)) {
                friendshipStatus = "ACCEPTED";
            }
            // Si l'utilisateur actuel a envoyé une demande d'ami à l'utilisateur cible
            else if (currentUser.getPendingFriendRequests() != null && 
                    currentUser.getPendingFriendRequests().contains(targetUser.getId())) {
                friendshipStatus = "REQUESTED";
            }
            // Si l'utilisateur cible a envoyé une demande d'ami à l'utilisateur actuel
            else if (targetUser.getPendingFriendRequests() != null && 
                    targetUser.getPendingFriendRequests().contains(currentUser.getId())) {
                friendshipStatus = "PENDING";
            }
            
            return new UserProfileResponse(
                    targetUser.getUsername(),
                    targetUser.getLevel(),
                    targetUser.getGold(),
                    targetUser.getDiamonds(),
                    targetUser.getEnergy(),
                    friendshipStatus);
        } catch (Exception e) {
            System.err.println("Error in /profile/{userId} endpoint: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}