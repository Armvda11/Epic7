// 📁 src/components/combat/HeroSprite.jsx

import React from "react";
import slugify from "slugify";
import clsx from "clsx";

export default function HeroSprite({ hero, isActive = false, isBoss = false }) {
  const slug = slugify(hero.name, { lower: true });
  const imgPath = `/epic7-Hero/sprite-hero/${slug}.png`;

  return (
    <div
      className={clsx(
        "relative w-28 h-28 overflow-hidden rounded-2xl border-2",
        isBoss ? "border-red-600" : isActive ? "border-yellow-400 animate-pulse" : "border-gray-600"
      )}
    >
      <img
        src={imgPath}
        alt={hero.name}
        className="object-contain w-full h-full bg-zinc-900"
        onError={(e) => (e.target.src = "/epic7-Hero/sprite-hero/unknown.png")}
      />
      <div className="absolute bottom-0 w-full text-center bg-black/70 text-xs text-white py-1">
        {hero.name}
      </div>
    </div>
  );
}
