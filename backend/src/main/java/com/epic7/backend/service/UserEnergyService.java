package com.epic7.backend.service;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class UserEnergyService {

    private final UserRepository userRepository;

    public UserEnergyService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public void updateEnergy(User user) {
        if (user.getEnergy() >= 100) return;

        Instant now = Instant.now();
        Instant lastUpdate = user.getLastEnergyUpdate();

        long minutes = Duration.between(lastUpdate, now).toMinutes();
        if (minutes < 5) return;

        long pointsToRegen = minutes / 5;
        int newEnergy = Math.min(100, user.getEnergy() + (int) pointsToRegen);
        user.setEnergy(newEnergy);
        user.setLastEnergyUpdate(now);

        userRepository.save(user);
    }
}
