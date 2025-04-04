package com.epic7.backend.service;


import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;


/**
 * Service de gestion des services utilisateurs.
 *
 * Ce service gère les opérations liées aux utilisateurs,
 * y compris la récupération des informations utilisateur,
 * la gestion de l'énergie, l'ajout et la suppression d'amis,
 * @author hermas corentin
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MessageService messageService;

    // -------------------------------------------------
    // Méthodes de gestion des utilisateurs
    // -------------------------------------------------
    /**
     * Récupère un utilisateur par son identifiant.
     * 
     * @param id L'identifiant de l'utilisateur à récupérer.
     * @return L'utilisateur correspondant à l'identifiant.
     */
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
    }

    // -------------------------------------------------
    // Méthodes de gestion de l'énergie des utilisateurs
    // -------------------------------------------------

    /**
     * Met à jour l'énergie de l'utilisateur en fonction du temps écoulé depuis
     * la dernière mise à jour.
     * 
     * @param user L'utilisateur dont l'énergie doit être mise à jour.
     */
    @Transactional
    public void updateEnergy(User user) {
        // Vérifie si l'utilisateur a déjà 100 d'énergie
        if (user.getEnergy() >= 100) return;


        Instant now = Instant.now();
        Instant lastUpdate = user.getLastEnergyUpdate();
        
        long minutes = Duration.between(lastUpdate, now).toMinutes();
        if (minutes < 5) return;
        // Calcule le nombre de points d'énergie à régénérer
        long pointsToRegen = minutes / 5;
        int newEnergy = Math.min(100, user.getEnergy() + (int) pointsToRegen);
        user.setEnergy(newEnergy);
        user.setLastEnergyUpdate(now);
        // Enregistre les modifications de l'énergie de l'utilisateur
        userRepository.save(user);
    }

    /**
     * Vérifie si l'utilisateur a suffisamment d'énergie pour effectuer une action.
     * 
     * @param user L'utilisateur à vérifier.
     * @param cost Le coût en énergie de l'action.
     * @return true si l'utilisateur a suffisamment d'énergie, false sinon.
     */
    public boolean hasEnoughEnergy(User user, int cost) {
        updateEnergy(user);
        return user.getEnergy() >= cost;
    }

    /**
     * Utilise une certaine quantité d'énergie de l'utilisateur.
     * 
     * @param user L'utilisateur dont l'énergie doit être utilisée.
     * @param cost La quantité d'énergie à utiliser.
     */
    @Transactional
    public void useEnergy(User user, int cost) {
        updateEnergy(user);
        if (user.getEnergy() < cost) {
            throw new IllegalStateException("Pas assez d'énergie.");
        }
        user.setEnergy(user.getEnergy() - cost);
        userRepository.save(user);
    }

    /**
     * Ajoute de l'énergie à l'utilisateur.
     * 
     * @param user L'utilisateur à qui ajouter de l'énergie.
     * @param amount La quantité d'énergie à ajouter.
     */
    @Transactional
    public void addEnergy(User user, int amount) {
        updateEnergy(user);
        user.setEnergy(Math.min(100, user.getEnergy() + amount));
        userRepository.save(user);
    }

    // -------------------------------------------------
    // Gestion des amis
    // -------------------------------------------------
    
    /**
     * Ajoute un ami à l'utilisateur.
     * 
     * @param user L'utilisateur à qui ajouter un ami.
     * @param friend L'ami à ajouter.
     */
    @Transactional
    public void makeFriends(User askUser, User friendUser) {
        if (askUser.getFriends() == null) {
            askUser.setFriends(new ArrayList<>());
        }
        if (friendUser.getFriends() == null) {
            friendUser.setFriends(new ArrayList<>());
        }

        // On vérifie qu'ils ne soient pas déjà amis
        if (askUser.getFriends().contains(friendUser)) {
            throw new IllegalArgumentException("Vous êtes déjà amis avec cet utilisateur.");
        }

        // On ajoute l'ami à la liste de l'autre ami
        askUser.getFriends().add(friendUser);
        friendUser.getFriends().add(askUser);
        // On enlève la demande d'ami de l'utilisateur
        if (askUser.getPendingFriendRequests() != null && askUser.getPendingFriendRequests().contains(friendUser.getId())) {
            // On enlève la demande d'ami de l'utilisateur
            askUser.getPendingFriendRequests().remove(friendUser.getId());
        }

        // On enregistre les modifications des amis
        userRepository.save(askUser);
        userRepository.save(friendUser);
    }

    /**
     * Envoyer une demande d'ami à un autre utilisateur.
     *
     * @param user L'utilisateur qui envoie la demande.
     * @param friend L'utilisateur à qui la demande est envoyée.
     * @return true si la demande a été envoyée avec succès, false sinon.
     */
    @Transactional
    public boolean sendFriendRequest(User user, Long friendId) {
        // Ajoute l'ami à la liste des amis en attente de l'utilisateur
        if (user.getPendingFriendRequests() == null) {
            user.setPendingFriendRequests(new ArrayList<>());
        }
        // On interdit d'envoyer une demande d'ami à soi-même
        if (user.getId().equals(friendId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas vous envoyer une demande d'ami à vous-même.");
        }
        // On vérifie si l'utilisateur a déjà envoyé une demande d'ami à l'autre utilisateur
        if (user.getPendingFriendRequests().contains(friendId)) {
            throw new IllegalArgumentException("Vous avez déjà envoyé une demande d'ami à cet utilisateur.");
        }
        // On vérifie si l'utilisateur a déjà accepté une demande d'ami de l'autre utilisateur
        User friend = userRepository.findById(friendId)
                .orElseThrow(() -> new IllegalArgumentException("Ami introuvable"));
        if (friend.getFriends() != null && friend.getFriends().contains(user)) {
            throw new IllegalArgumentException("Vous êtes déjà amis avec cet utilisateur.");
        }
        
        user.getPendingFriendRequests().add(friendId);
        userRepository.save(user);
        // Envoie un message de demande d'ami à l'utilisateur cible
        this.messageService.sendFriendRequest(user, friendId);

        return true;
        }
    
    @Transactional
    public boolean acceptFriendRequest(User user, Long AskerfriendId) {

        if (user.getId().equals(AskerfriendId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas vous avoir en ami.");
        }
        
        // Ajoute l'ami à la liste des amis de l'utilisateur
        User friend = userRepository.findById(AskerfriendId)
        .orElseThrow(() -> new IllegalArgumentException("Ami introuvable"));
        
        makeFriends(user, friend);
        return true;
    }

    @Transactional
    public boolean refuseFriendRequest(User AnswererUser, Long AskerfriendId) {
        User askerFriendUser = userRepository.findById(AskerfriendId)
                .orElseThrow(() -> new IllegalArgumentException("Ami introuvable"));
        // On vérifie si l'utilisateur est déjà ami
        if (askerFriendUser.getFriends() != null && askerFriendUser.getFriends().contains(AnswererUser)) {
            throw new IllegalArgumentException("Vous êtes déjà amis avec cet utilisateur mais vous pouvez le supprimer dans la gestion de vos amis.");
        }
        // Enlève l'ami de la liste des amis en attente de l'utilisateur
        if (askerFriendUser.getPendingFriendRequests() != null && askerFriendUser.getPendingFriendRequests().contains(AnswererUser.getId())) {
            askerFriendUser.getPendingFriendRequests().remove(AnswererUser.getId());
        }
        userRepository.save(askerFriendUser);
        return true;
    }
    
    /**
     * Supprime un ami de l'utilisateur.
     * 
     * @param user L'utilisateur dont l'ami doit être supprimé.
     * @param friend L'ami à supprimer.
     */
    @Transactional
    public boolean removeFriend(User user, Long friendId) {
        User friend = userRepository.findById(friendId)
                .orElseThrow(() -> new IllegalArgumentException("Ami introuvable"));
        // Supprime l'ami de la liste des amis de l'utilisateur
        if (user.getFriends() != null) {
            user.getFriends().remove(friend);
        }
        // Supprime l'utilisateur de la liste des amis de l'ami
        if (friend.getFriends() != null) {
            friend.getFriends().remove(user);
        }
        userRepository.save(user);
        // Supprime l'utilisateur de la liste des amis de l'ami
        return true;
    }

    /**
     * Vérifie si l'utilisateur est ami avec un autre utilisateur.
     * 
     * @param user L'utilisateur à vérifier.
     * @param friend L'ami à vérifier.
     * @return true si l'utilisateur est ami avec l'autre utilisateur, false sinon.
     */
    public boolean isFriend(User user, User friend) {
        return user.getFriends() != null && user.getFriends().contains(friend);
    }

    /** Renvoie la liste des amis de l'utilistateur de A à B 
     * 
     * @param user L'utilisateur dont on veut récupérer la liste d'amis.
     * @param a Le début de la plage d'amis à récupérer.
     * @param b La fin de la plage d'amis à récupérer.
     * @return La liste des amis de l'utilisateur dans la plage spécifiée.
     */
    public ArrayList<User> getFriends(User user, int a, int b) {
        if (user.getFriends() == null) {
            return new ArrayList<>();
        }
        if (b < 0 || a < 0 || a > b) {
            throw new IllegalArgumentException("Les indices de la plage d'amis sont invalides");
        }
        return new ArrayList<>(user.getFriends().subList(a, Math.min(b, user.getFriends().size())));
    }

    /**
     * Récupère la liste des amis de l'utilisateur.
     *
     * @param user L'utilisateur dont on veut récupérer la liste d'amis.
     * @return La liste des amis de l'utilisateur.
     */
    public ArrayList<User> getFriends(User user) {
        return getFriends(user, 0, user.getFriends().size());
    }

    /**
     * Récupère la liste des amis de l'utilisateur.
     *
     * @param Long L'id de l'utilisateur dont on veut récupérer la liste d'amis.
     * @return La liste des amis de l'utilisateur.
     */
    public ArrayList<User> getFriends(Long userId, int a, int b) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        return getFriends(user, a, b);
    }

    /**
     * Recherche des utilisateurs par leur nom d'utilisateur.
     *
     * @param searchTerm Le terme de recherche à utiliser.
     * @return Une liste d'utilisateurs correspondant au terme de recherche.
     */
    public List<User> searchUsersByUsername(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return Collections.emptyList();
        }
        
        // Recherche par correspondance partielle du nom d'utilisateur (contient le terme)
        // Conversion en minuscules pour une recherche insensible à la casse
        String searchPattern = "%" + searchTerm.toLowerCase() + "%";
        return userRepository.findByUsernameLikeIgnoreCase(searchPattern);
    }
}
