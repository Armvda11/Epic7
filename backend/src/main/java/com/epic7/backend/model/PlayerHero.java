package com.epic7.backend.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "player_heroes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlayerHero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "hero_id")
    private Hero hero;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private int experience = 0;

    @Column(nullable = false)
    private boolean isLocked = false;

    @OneToMany(mappedBy = "player_heroes", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Equipment> ownerdEquipements = new ArrayList<>();

    public PlayerHero(User user, Hero hero) {
        this.user = user;
        this.hero = hero;
    }
}
