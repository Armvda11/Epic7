package com.epic7.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;

    @Column(nullable = false)
    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;

    public User(String email, String password) {
        this.email = email;
        this.password = password;
    }

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private int gold = 0;

    @Column(nullable = false)
    private int diamonds = 0;




    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public int getGold() {
        return gold;
    }


    public void setGold(int gold) {
        this.gold = gold;
    }


    public int getDiamonds() {
        return diamonds;
    }


    public void setDiamonds(int diamonds) {
        this.diamonds = diamonds;
    }




}
