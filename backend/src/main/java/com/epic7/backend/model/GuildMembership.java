package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "guild_membership", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "guild_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GuildMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnore 
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "guild_id")
    @JsonIgnore     
    private Guild guild;

    @Column(nullable = false)
    private String role; // leader, officer, member

    @Column(name = "join_date")
    private Instant joinDate = Instant.now();
}
