package com.epic7.backend.service;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;

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
    public void addFriend(User user, User friend) {
        if (user.getFriends() == null) {
            user.setFriends(new ArrayList<>());
        }
        user.getFriends().add(friend);
        userRepository.save(user);
    }
    /**
     * Supprime un ami de l'utilisateur.
     * 
     * @param user L'utilisateur dont l'ami doit être supprimé.
     * @param friend L'ami à supprimer.
     */
    @Transactional
    public void removeFriend(User user, User friend) {
        if (user.getFriends() != null) {
            user.getFriends().remove(friend);
        }
        userRepository.save(user);
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
     * Envoyer une demande d'ami à un autre utilisateur.
     *
     * @param user L'utilisateur qui envoie la demande.
     * @param friend L'utilisateur à qui la demande est envoyée.
     * @return true si la demande a été envoyée avec succès, false sinon.
     */
    @Transactional
    public void sendFriendRequest(User user, Long friendId) {
        this.messageService.sendFriendRequest(user, friendId);
        }
}
