package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime startsAt;
    private LocalDateTime endsAt;

    @ManyToMany
    @JoinTable(
        name = "banner_heroes",
        joinColumns = @JoinColumn(name = "banner_id"),
        inverseJoinColumns = @JoinColumn(name = "hero_id")
    )
    private List<Hero> featuredHeroes;

    public boolean isActive() {
        LocalDateTime now = LocalDateTime.now();
        return (startsAt == null || startsAt.isBefore(now)) &&
               (endsAt == null || endsAt.isAfter(now));
    }
}
