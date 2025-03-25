package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "equipped_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EquippedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "equipment_id", unique = true)
    private Equipment equipment;

    @ManyToOne(optional = false)
    @JoinColumn(name = "player_hero_id")
    private PlayerHero playerHero;
}
