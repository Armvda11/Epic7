package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

/**
 * Représente une guilde dans le jeu.
 * Contient des informations sur le nom, la description et les membres de la guilde.
 * @author hermas
 */
// TODO : Ajouter une image pour la guilde
// TODO : Ajouter un système de niveau de guilde
// TODO : Ajouter un système de points de guilde
// TODO : Ajouter un système de rangs de guilde
// TODO : Ajouter un système de guerre de guilde
// TODO : Ajouter un système de don de ressources
// TODO : Ajouter un système de chat de guilde
// TODO : Ajouter un système de quêtes de guilde
// TODO : Ajouter un système de gestion de guilde
// TODO : Ajouter un système de recrutement de guilde
@Entity
@Table(name = "guilds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Guild {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Identifiant unique de la guilde

    @Column(nullable = false, unique = true)
    private String name; // Nom de la guilde (ex. "Fairy tail ", "TFC gang", etc.)

    private String description; // Description de la guilde (ex. "raconter de la merde pour décrire ca guilde", etc.)

    @OneToMany(mappedBy = "guild", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GuildMembership> members; // Liste des membres de la guilde

}
