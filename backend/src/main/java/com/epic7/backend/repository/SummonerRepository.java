package com.epic7.backend.repository;

import com.epic7.backend.model.Summoner;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SummonerRepository extends JpaRepository<Summoner, Long> {
    List<Summoner> findByUser(User user);
}
