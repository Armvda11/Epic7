package com.epic7.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.epic7.backend.repository.model.Hero;
import com.epic7.backend.repository.model.Skill;

/**
 * SkillRepository est une interface qui étend JpaRepository pour gérer les opérations CRUD sur l'entité Skill.
 */
@Repository
public interface SkillRepository extends JpaRepository<Skill, Long> {
   // Récupère toutes les compétences d’un héros
   List<Skill> findByHero(Hero hero);

   // Récupère toutes les compétences par ID de héros
   List<Skill> findByHeroId(Long heroId);

   // Récupère uniquement d'une héros par ID de héros et par catégorie
   List<Skill> findByHeroAndCategory(Hero hero, com.epic7.backend.repository.model.skill_kit.SkillCategory category);

   //  Récupère une compétence par nom (utile en debug / dev)
   Optional<Skill> findByName(String name);

}

