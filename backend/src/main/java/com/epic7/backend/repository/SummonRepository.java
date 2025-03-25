package com.epic7.backend.repository;

import com.epic7.backend.model.Summon;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SummonRepository extends JpaRepository<Summon, Long> {
    List<Summon> findByUser(User user);
}
