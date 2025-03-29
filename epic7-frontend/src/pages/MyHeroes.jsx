import React, { useEffect, useState } from 'react';
import { getMyHeroes } from '../services/heroService';
import HeroCard from '../components/HeroCard';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

const MyHeroes = () => {
  const [heroes, setHeroes] = useState([]);
  const [selectedHero, setSelectedHero] = useState(null);
  const [error, setError] = useState(null);
  const [filterElement, setFilterElement] = useState('ALL');
  const [filterRarity, setFilterRarity] = useState('ALL');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const { language, t } = useSettings();

  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const data = await getMyHeroes(token);
        setHeroes(data);
      } catch (err) {
        setError(t("heroLoadError", language));
      }
    };

    fetchHeroes();
  }, [token, language]);

  const closeOverlay = () => setSelectedHero(null);

  const filteredHeroes = heroes.filter(({ hero }) => {
    const matchElement = filterElement === 'ALL' || hero.element === filterElement;
    const matchRarity = filterRarity === 'ALL' || hero.rarity === filterRarity;
    return matchElement && matchRarity;
  });

  const ELEMENTS = ['ALL', 'FIRE', 'ICE', 'EARTH', 'DARK', 'LIGHT'];
  const RARITIES = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredHeroes.map((heroInstance) => (
          <HeroCard
            key={heroInstance.id}
            heroInstance={heroInstance}
            onSelect={setSelectedHero}
          />
        ))}
      </div>

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
                {selectedHero.hero.name}
              </h2>
              <div className="text-sm text-center mb-4">
                🌟 {selectedHero.hero.rarity} | 🔮 {selectedHero.hero.element}
              </div>

              <img
                src={`/epic7-Hero/sprite-hero/${selectedHero.hero.code.toLowerCase()}.png`}
                alt={selectedHero.hero.name}
                className="w-full h-auto object-contain rounded-lg mb-4"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
                }}
              />

              <div className="space-y-1 text-sm">
                <p>⚔️ {t("attack", language)} : {selectedHero.hero.baseAttack}</p>
                <p>🛡️ {t("defense", language)} : {selectedHero.hero.baseDefense}</p>
                <p>💨 {t("speed", language)} : {selectedHero.hero.baseSpeed}</p>
                <p>❤️ {t("health", language)} : {selectedHero.hero.health}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyHeroes;
