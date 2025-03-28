import React from 'react';

const HeroImage = ({ heroCode, alt }) => {
  const fileName = `${heroCode.toLowerCase()}`; // exemple : "conqueror-lilias"

  return (
    <picture>
      <source srcSet={`/epic7-Hero/avif/${fileName}.avif`} type="image/avif" />
      <source srcSet={`/epic7-Hero/webp/${fileName}.webp`} type="image/webp" />
      <img
        src={`/epic7-Hero/sprite-hero/${fileName}.png`}
        alt={alt}
        className="w-full h-auto rounded-lg object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
        }}
      />
    </picture>
  );
};

export default HeroImage;
