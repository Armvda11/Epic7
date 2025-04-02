// 📁 src/components/combat/SkillIcon.jsx

import React from "react";
import slugify from "slugify";

export default function SkillIcon({ skill, onClick }) {
  const heroSlug = slugify(skill.name.split(":")[0] || skill.name, { lower: true });
  const skillIndex = skill.position ?? 1;
  const iconPath = `/icons/${heroSlug}_skill/${heroSlug}_skill_${skillIndex}.webp`;

  return (
    <button
      onClick={onClick}
      className="w-16 h-16 rounded-full border-2 border-blue-500 hover:border-white focus:outline-none hover:scale-105 transition"
      title={skill.name}
    >
      <img
        src={iconPath}
        alt={skill.name}
        className="object-cover w-full h-full rounded-full"
        onError={(e) => (e.target.src = "/icons/ml-piera_skill/ml-piera_skill_1.webp")}
      />
    </button>
  );
}
