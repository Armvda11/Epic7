import React, { useEffect, useState } from 'react';
import { getMyHeroes, fetchHeroSkills } from '../services/heroService';
import HeroCard from '../components/hero/HeroCard';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import SkillCard from '../components/hero/SkillCard';
import { heroImg, heroImgUnknown } from '../components/heroUtils';

const MyHeroes = () => {
  const [heroes, setHeroes] = useState([]);
  const [selectedHero, setSelectedHero] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState(null);
  const [filterElement, setFilterElement] = useState('ALL');
  const [filterRarity, setFilterRarity] = useState('ALL');

  const navigate = useNavigate();
  const token    = localStorage.getItem('token');
  const { language, t } = useSettings();

  // 1️⃣ Charger les héros au montage
  useEffect(() => {
    (async () => {
      try {
        const data = await getMyHeroes(token);
        setHeroes(data);
      } catch (err) {
        console.error("Erreur de chargement des héros :", err);
        setError(t('heroLoadError', language));
      }
    })();
  }, [token, language]);

  // 2️⃣ Charger les compétences à chaque fois qu’on change de héros sélectionné
  useEffect(() => {
    (async () => {
      // On récupère l’ID du PlayerHero, pas de l’entité Hero générique
      const playerHeroId = selectedHero?.id;
      if (playerHeroId) {
        try {
          console.log("Hero ID pour fetch les skills:", playerHeroId);
          const data = await fetchHeroSkills(playerHeroId);
          console.log("Compétences récupérées :", data);
          setSkills(data);
        } catch (err) {
          console.error("Erreur fetchHeroSkills :", err);
          setSkills([]);
        }
      } else {
        setSkills([]);
      }
    })();
  }, [selectedHero]);

  const closeOverlay = () => setSelectedHero(null);

  const ELEMENTS  = ['ALL','FIRE','ICE','EARTH','DARK','LIGHT'];
  const RARITIES  = ['ALL','COMMON','RARE','EPIC','LEGENDARY'];

  const filteredHeroes = heroes.filter(h => {
    const element = h.element || h.hero?.element;
    const rarity  = h.rarity  || h.hero?.rarity;
    return (filterElement==='ALL' || element===filterElement)
        && (filterRarity==='ALL'  || rarity===filterRarity);
  });

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white relative">
      {/* Header + filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">{t("myHeroes", language)}</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterElement}
            onChange={e => setFilterElement(e.target.value)}
            className="bg-white dark:bg-[#2f2b50] p-2 rounded border"
          >
            {ELEMENTS.map(e => <option key={e} value={e}>{t(e.toLowerCase(), language)}</option>)}
          </select>
          <select
            value={filterRarity}
            onChange={e => setFilterRarity(e.target.value)}
            className="bg-white dark:bg-[#2f2b50] p-2 rounded border"
          >
            {RARITIES.map(r => <option key={r} value={r}>{t(r.toLowerCase(), language)}</option>)}
          </select>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            {t("back", language)}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 bg-red-100 p-3 rounded-lg">{error}</div>}

      {/* Cartes héros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredHeroes.map(hero => (
          <HeroCard
            key={hero.id}
            heroInstance={hero}
            onSelect={setSelectedHero}
          />
        ))}
      </div>

      {/* Overlay détail */}
      <AnimatePresence>
        {selectedHero && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            >
              <button
                onClick={closeOverlay}
                className="absolute top-2 right-3 text-2xl hover:text-red-400"
              >✖</button>

              <h2 className="text-2xl font-bold mb-2 text-center">
                {selectedHero.name || selectedHero.hero?.name}
              </h2>
              <div className="text-center mb-4">
                🌟 {selectedHero.rarity || selectedHero.hero?.rarity} | 🔮 {selectedHero.element || selectedHero.hero?.element}
              </div>

              <div className="w-full max-w-[300px] aspect-[4/5] mx-auto mb-4 bg-gray-100 dark:bg-[#1a1a2e] rounded-xl flex items-center justify-center">
                <img
                  src={heroImg(selectedHero.name || selectedHero.hero?.name)}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                  onError={e => e.target.src = heroImgUnknown}
                />
              </div>

              <div className="space-y-2 mb-4 bg-gray-100 dark:bg-[#2a2a40] p-3 rounded-lg text-sm">
                <p>⚔️ {t("attack", language)}: <strong>{selectedHero.totalAttack || selectedHero.hero?.baseAttack}</strong></p>
                <p>🛡️ {t("defense", language)}: <strong>{selectedHero.totalDefense || selectedHero.hero?.baseDefense}</strong></p>
                <p>💨 {t("speed", language)}: <strong>{selectedHero.totalSpeed || selectedHero.hero?.baseSpeed}</strong></p>
                <p>❤️ {t("health", language)}: <strong>{selectedHero.totalHealth || selectedHero.hero?.health}</strong></p>
              </div>

              {skills.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-2 text-center">{t("skills", language)}</h3>
                  <div className="flex justify-center gap-3 flex-wrap mb-4">
                    {skills.map(s => (
                      <SkillCard
                        key={s.id}
                        skill={s}
                        heroName={selectedHero.name || selectedHero.hero?.name}
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => navigate(`/hero/${selectedHero.id}`)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
              >
                {t("seeMore", language)}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyHeroes;
