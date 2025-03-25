package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;



@Entity
@Table(name = "summons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Summon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "hero_id")
    private Hero hero;

    @Column(name = "summon_date")
    private Instant summonDate = Instant.now();

    private boolean success = true;
}
