// Fonction pour obtenir l'URL d'une image webp d'un héros
export const heroImg = (name) => 
    `/epic7-Hero/webp/${name.toLowerCase().replace(/ /g, '-')}.webp`;

// Fonction pour obtenir l'URL d'une image avif d'un héros
export const heroImgAvif = (name) => 
    `/epic7-Hero/avif/${name.toLowerCase().replace(/ /g, '-')}.avif`;

// Fonction pour obtenir l'URL d'une image sprite d'un héros
export const heroImgSprite = (name) => 
    `/epic7-Hero/sprite-hero/${name.toLowerCase().replace(/ /g, '-')}.png`;

// Fonction pour normaliser le nom du héros (utilisée par les fonctions ci-dessus)
export const normalizeHeroName = (name) =>
    name.toLowerCase().replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");


// Fonction pour obtenir l'URL de l'unknown.png
export const heroImgUnknown = () => 
    `/epic7-Hero/sprite-hero/unknown.png`;


// fonction pour obtenir l'url de l'icone du skill d'un hero et utilise la position pour prendre le bon skill
export const skillIcon = (heroName, skillIndex) => {

    // mettre le nom du héros en minuscules et remplacer les espaces par des tirets
    const normalizedHeroName = heroName.toLowerCase().replace(/ /g, '-');

    
    return `/icons/${normalizedHeroName}_skill/${normalizedHeroName}_skill_${skillIndex + 1}.webp`;
}
