package com.epic7.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Représente un utilisateur du jeu.
 * Contient des informations sur le compte, les héros possédés, etc.
 */
@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @NotBlank
    @Email
    private String email;

    @Column(nullable = false)
    @NotBlank
    private String password;

    @Column(nullable = false, unique = true)
    private String username;

    @Column
    private String avatarUrl; // Added avatar URL field

    @Column(nullable = false)
    private int level = 1; // Niveau de l'utilisateur (ex. 1, 2, 3, etc.)

    @Column(nullable = false)
    private int gold = 0; // Quantité d'or possédée par l'utilisateur (ex. 0, 100, 1000, etc.)

    @Column(nullable = false)
    private int diamonds = 0; // Quantité de diamants possédée par l'utilisateur (ex. 0, 100, 1000, etc.)
    //( diamants utiliesés pour acheter des objets dans la boutique, et invoquer des héros)

    @Column(nullable = false)
    private Integer energy = 100; // Quantité d'énergie possédée par l'utilisateur (ex. 0, 100, 1000, etc.)
    //( énergie utilisée pour faire des combats, et des quêtes)
    //( l'énergie se régénère automatiquement au fil du temps, et peut être achetée dans la boutique)


    @Column(name = "last_energy_update")
    private Instant lastEnergyUpdate = Instant.now(); // Date de la dernière mise à jour de l'énergie
    // (a modifier lorsque l'énergie est utilisée , achetée, ou régénérée)

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlayerHero> ownedHeroes = new ArrayList<>(); // Liste des héros possédés par l'utilisateur

    @OneToOne
    @JoinColumn(name = "guild_membership_id")
    private GuildMembership guildMembership = null; // La guilde à laquelle l'utilisateur appartient

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlayerEquipment> equipments = new ArrayList<>(); // Liste des équipements possédés par l'utilisateur

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(name = "user_friends",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "friend_id"))
    private List<User> friends; // Liste des amis de l'utilisateur
    // (a modifier lorsque l'utilisateur ajoute ou supprime un ami)
    
    
    @ElementCollection
    @CollectionTable(
        name = "user_pending_friend_requests",
        joinColumns = @JoinColumn(name = "user_id")
    )
    @Column(name = "pending_friend")
    private List<Long> pendingFriendRequests = new ArrayList<>(); // Liste des demandes d'amis en attente (id des utilisateurs)
    // (a modifier lorsque l'utilisateur envoie ou reçoit une demande d'ami)

    @Column(name = "last_login")
    private Instant lastLogin = Instant.now(); // Date de la dernière connexion de l'utilisateur
    // (a modifier lorsque l'utilisateur se connecte, ou se déconnecte)
    
    @Column(name = "register_date")
    private Instant registerDate = Instant.now(); // Date d'inscription de l'utilisateur
    
    @Column(nullable = false)
    private int rank = 0; // Classement du joueur
    
    @Column(nullable = false)
    private String arenaTier = "Unranked"; // Niveau dans l'arène (ex: Bronze, Silver, Gold, etc.)
    
    @Column(nullable = false)
    private int winNumber = 0; // Nombre de victoires
    
    @Column(nullable = false)
    private int loseNumber = 0; // Nombre de défaites
    
    @Column(nullable = false)
    private int rtaPoints = 1000; // Points RTA (commence à 1000)
    
    @Column(nullable = false)
    private String rtaTier = "Bronze"; // Tier RTA basé sur les points

    /**
     * Ajoute un héros à la liste des héros possédés par l'utilisateur.
     * @param playerHero Le héros à ajouter.
     */
    public void addHero(PlayerHero playerHero) {
        ownedHeroes.add(playerHero);
        playerHero.setUser(this);
    }

    public void addFriend(User friend) {
        if (friends == null) {
            friends = new ArrayList<>();
        }
        friends.add(friend);
    }
    public void removeFriend(User friend) {
        if (friends != null) {
            friends.remove(friend);
        }
    }
    
    /**
     * Obtient le nombre de héros possédés par l'utilisateur.
     * @return Le nombre de héros.
     */
    public int getHeroesNumber() {
        return ownedHeroes != null ? ownedHeroes.size() : 0;
    }
    
    /**
     * Obtient la date de la dernière connexion de l'utilisateur formatée.
     * @return La date formatée.
     */
    public String getLastLoginDateString() {
        return formatInstant(lastLogin);
    }
    
    /**
     * Obtient la date d'inscription de l'utilisateur formatée.
     * @return La date formatée.
     */
    public String getRegisterDateString() {
        return formatInstant(registerDate);
    }
    
    /**
     * Obtient le nom de la guilde de l'utilisateur.
     * @return Le nom de la guilde ou null si l'utilisateur n'est pas dans une guilde.
     */
    public String getGuildName() {
        return guildMembership != null ? guildMembership.getGuild().getName() : "None";
    }
    
    /**
     * Formate un Instant en chaîne de caractères lisible.
     * @param instant L'instant à formater.
     * @return La chaîne formatée.
     */
    private String formatInstant(Instant instant) {
        if (instant == null) return null;
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(instant);
    }

    public void addEquipment(Equipment equipment, int quantity) {
        if (equipments == null) {
            equipments = new ArrayList<>();
        }
        for (int i = 0; i < quantity; i++) {
            PlayerEquipment playerEquipment = new PlayerEquipment();
            playerEquipment.setEquipment(equipment);
            playerEquipment.setUser(this);

            equipments.add(playerEquipment);
        }
    }

    public void addHeros(Hero hero, int quantity) {
        if (ownedHeroes == null) {
            ownedHeroes = new ArrayList<>();
        }

        // Vérifier si le héros existe déjà dans la liste
        // et mettre à jour son niveau d'éveil
        // sinon, créer un nouveau PlayerHero
        PlayerHero existingHero = ownedHeroes.stream()
                .filter(playerHero -> playerHero.getHero().getId().equals(hero.getId()))
                .findFirst()
                .orElse(null);
        // Si le héros existe déjà, on met à jour son niveau d'éveil
        if (existingHero != null) {
            existingHero.setAwakeningLevel(existingHero.getAwakeningLevel() + quantity);
        // Sinon, on crée un nouveau PlayerHero
        } else {
            PlayerHero playerHero = new PlayerHero();
            playerHero.setHero(hero);
            playerHero.setUser(this);
            // On initialise le niveau d'éveil à 0
            playerHero.setAwakeningLevel(quantity - 1);

            ownedHeroes.add(playerHero);
        }
    }
}
