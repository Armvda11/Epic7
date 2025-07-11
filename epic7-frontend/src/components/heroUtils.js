// Fonction pour obtenir l'URL d'une image webp d'un héros
export const heroImg = (name) => {
    // Vérifier si le nom commence par "boss" (insensible à la casse)
    if (name.toLowerCase().startsWith("boss")) {
        return `/epic7-Hero/webp/boss.webp`;
    }
    // Comportement original pour les autres noms
    return `/epic7-Hero/webp/${name.toLowerCase().replace(/ /g, '-')}.webp`;
};

// Fonction pour obtenir l'URL d'une image sprite d'un héros pour les combats
export const heroImgBattle = (name) => {
    // Vérifier si le nom commence par "boss" (insensible à la casse)
    if (name.toLowerCase().startsWith("boss")) {
        return `/epic7-Hero/webp/boss.webp`;
    }
    // Utiliser les sprites pour les combats
    return `/epic7-Hero/sprite-hero/${name.toLowerCase().replace(/ /g, '-')}.png`;
};

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

// Fonction pour obtenir l'URL de l'image par défaut pour les erreurs de chargement en combat
export const heroImgUnknownBattle = () => 
    `/epic7-Hero/sprite-hero/unknown.png`;


// fonction pour obtenir l'url de l'icone du skill d'un hero et utilise la position pour prendre le bon skill
export const skillIcon = (heroName, skillIndex) => {

    // mettre le nom du héros en minuscules et remplacer les espaces par des tirets
    const normalizedHeroName = heroName.toLowerCase().replace(/ /g, '-');

    
    return `/icons/${normalizedHeroName}_skill/${normalizedHeroName}_skill_${skillIndex + 1}.webp`;
}
