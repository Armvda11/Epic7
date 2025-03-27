package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
@JoinColumn(name = "user_id", nullable = false)
@JsonIgnore
private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "hero_id", nullable = false)
    private Hero hero;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private int experience = 0;

    @Column(nullable = false)
    private boolean isLocked = false;

    @OneToMany(mappedBy = "playerHero", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlayerEquipment> ownedEquipments = new ArrayList<>();
    

    @Column(name = "obtained_at", nullable = false, updatable = false)
    private Instant obtainedAt = Instant.now();

    public PlayerHero(User user, Hero hero) {
        this.user = user;
        this.hero = hero;
    }

    @PreRemove
    private void detachEquipmentsBeforeDeletion() {
        for (PlayerEquipment eq : ownedEquipments) {
            eq.setPlayerHero(null);
        }
    }

}
