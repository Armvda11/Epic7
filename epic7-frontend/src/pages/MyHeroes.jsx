import React, { useEffect, useState } from 'react';
import { getMyHeroes } from '../services/heroService';
import HeroCard from '../components/hero/HeroCard';
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
        console.error("Erreur de chargement des héros :", err);
        setError(t("heroLoadError", language));
      }
    };

    fetchHeroes();
  }, [token, language]);

  const closeOverlay = () => setSelectedHero(null);

  const ELEMENTS = ['ALL', 'FIRE', 'ICE', 'EARTH', 'DARK', 'LIGHT'];
  const RARITIES = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

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
