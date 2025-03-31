import React, { useEffect, useState } from 'react';
import { getMyHeroes, fetchHeroSkills } from '../services/heroService';
import HeroCard from '../components/hero/HeroCard';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';


/**
 * Pages des heros du joueur , on y affiche la liste de ses héros
 * et on peut les filtrer par élément et rareté
 * @returns
 */
const MyHeroes = () => {
  const [heroes, setHeroes] = useState([]); // Liste des héros
  const [selectedHero, setSelectedHero] = useState(null); // Héros sélectionné pour l'overlay
  const [error, setError] = useState(null); // Erreur de chargement
  const [filterElement, setFilterElement] = useState('ALL'); // Filtre par élément
  const [filterRarity, setFilterRarity] = useState('ALL'); // Filtre par rareté
  const navigate = useNavigate(); // Navigation vers d'autres pages
  const token = localStorage.getItem('token'); // Récupération du token d'authentification
  const { language, t } = useSettings(); // Langue et traductions

  const [skills, setSkills] = useState([]); // Liste des compétences des héros


  // Chargement des héros de l'utilisateur
  // On utilise le token pour récupérer les héros de l'utilisateur
  // On utilise le useEffect pour charger les héros au premier rendu
// 1️⃣ Charger les héros au chargement de la page
useEffect(() => {
  const fetchHeroes = async () => {
    try {
      const data = await getMyHeroes(token);
      setHeroes(data);
    } catch (err) {
      console.error("Erreur de chargement des héros :", err);
      setError(t("heroLoadError", language));
    }
  };
  fetchHeroes();
}, [token, language]);

// 2️⃣ Charger les compétences quand un héros est sélectionné
useEffect(() => {
  const loadSkills = async () => {
    const heroId =
      selectedHero?.hero?.id ?? // Cas PlayerHero
      selectedHero?.id ?? null; // Cas Hero directement

    if (heroId) {
      console.log("Hero ID pour fetch les skills:", heroId);
      const data = await fetchHeroSkills(heroId);
      console.log("Compétences récupérées :", data);
      setSkills(data);
    } else {
      console.log("Aucun hero ID trouvé pour fetch");
      setSkills([]);
    }
  };

  loadSkills();
}, [selectedHero]);


  const closeOverlay = () => setSelectedHero(null);
  const ELEMENTS = ['ALL', 'FIRE', 'ICE', 'EARTH', 'DARK', 'LIGHT'];
  const RARITIES = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

  // Filtrage des héros en fonction des filtres sélectionnés
  const filteredHeroes = heroes.filter((h) => {
    const element = h.element || h?.hero?.element;
    const rarity = h.rarity || h?.hero?.rarity;
    const matchElement = filterElement === 'ALL' || element === filterElement;
    const matchRarity = filterRarity === 'ALL' || rarity === filterRarity;
    return matchElement && matchRarity;
  });



  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
      {/* Header + Filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">{t("myHeroes", language)}</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterElement}
            onChange={(e) => setFilterElement(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded"
          >
            {ELEMENTS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded"
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {t("back", language)}
          </button>
        </div>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {/* Affichage des cartes héros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredHeroes.map((heroInstance) => (
          <HeroCard
            key={heroInstance.id}
            heroInstance={heroInstance}
            onSelect={setSelectedHero}
          />
        ))}
      </div>
      {/* Overlay détaillé */}
      <AnimatePresence>
        {selectedHero && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={closeOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 text-white p-6 rounded-2xl w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <button
                onClick={closeOverlay}
                className="absolute top-2 right-3 text-2xl hover:text-red-400"
              >
                ✖
              </button>

              <h2 className="text-2xl font-bold text-center mb-2">
                {selectedHero.name || selectedHero.hero?.name || 'Héros inconnu'}
              </h2>

              <div className="text-sm text-center mb-4">
                🌟 {selectedHero.rarity || selectedHero.hero?.rarity} | 🔮 {selectedHero.element || selectedHero.hero?.element}
              </div>

              <div className="w-full aspect-[4/5] overflow-hidden flex items-center justify-center bg-[#1a1a2e] rounded-xl mb-4">
                <img
                  src={`/epic7-Hero/sprite-hero/${selectedHero.name.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`}
                  alt={selectedHero.name}
                  className="w-full h-auto object-contain rounded-lg mb-4"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
                  }}
                />
              </div>


              <div className="space-y-1 text-sm mb-4">
                <p>⚔️ {t("attack", language)} : {selectedHero.totalAttack || selectedHero.hero?.baseAttack}</p>
                <p>🛡️ {t("defense", language)} : {selectedHero.totalDefense || selectedHero.hero?.baseDefense}</p>
                <p>💨 {t("speed", language)} : {selectedHero.totalSpeed || selectedHero.hero?.baseSpeed}</p>
                <p>❤️ {t("health", language)} : {selectedHero.totalHealth || selectedHero.hero?.health}</p>
              </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-center">Compétences</h3>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {skills.map((skill) => (
                      <div
                        key={skill.id}
                        className={`relative group p-2 ${skill.category === "PASSIVE" ? "rounded-full" : "rounded-md"
                          } bg-gray-700 hover:bg-gray-600 w-16 h-16 flex items-center justify-center cursor-pointer transition`}
                      >
                        <img
                          src="/epic7-Hero/avif/unknown.avif"
                          alt={skill.name}
                          className="w-10 h-10"
                        />
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-2 rounded-md w-64 z-10 text-left">
                          <p className="font-semibold">{skill.name}</p>
                          <p>{skill.description}</p>
                          {skill.action && (
                            <p className="mt-1">🎯 {skill.action} • {skill.targetCount} cible(s)</p>
                          )}
                          {skill.scalingStat && skill.scalingFactor && (
                            <p className="text-sm italic">⚔️ Scaling: {skill.scalingFactor} × {skill.scalingStat}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


              <button
                onClick={() => navigate(`/hero/${selectedHero.id}`)}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
              >
                Voir plus
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyHeroes;
