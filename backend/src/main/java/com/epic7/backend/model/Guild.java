package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "guilds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Guild {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @OneToMany(mappedBy = "guild", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GuildMembership> members;
}
