import React, { useEffect, useState } from 'react';
import { getMyHeroes, fetchHeroSkills } from '../services/heroService';
import HeroCard from '../components/hero/HeroCard';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import SkillCard from '../components/hero/SkillCard';
import { heroImg, heroImgUnknown } from '../components/heroUtils';
import { ModernPageLayout, ModernCard, ModernButton, ModernSearchBar, ModernModal, MusicController } from '../components/ui';
import { FaUser, FaFilter, FaBolt, FaHeart, FaStar, FaEye, FaTools } from 'react-icons/fa';
import { GiSwordWound, GiShield, GiArmorUpgrade } from 'react-icons/gi'; // Icônes de jeu



const MyHeroes = () => {
  const [heroes, setHeroes] = useState([]);
  const [selectedHero, setSelectedHero] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterElement, setFilterElement] = useState('ALL');
  const [filterRarity, setFilterRarity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { language, t, theme } = useSettings();
  const { preloadMusic, playDashboardMusic } = useMusic();

  // 1️⃣ Charger les héros au montage et démarrer la musique
  useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
    
    (async () => {
      try {
        const data = await getMyHeroes(token);
        setHeroes(data);
      } catch (err) {
        console.error("Erreur de chargement des héros :", err);
        setError(t('heroLoadError', language) || "Erreur lors du chargement des héros");
      } finally {
        setLoading(false);
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

  const ELEMENTS = ['ALL', 'FIRE', 'ICE', 'EARTH', 'DARK', 'LIGHT'];
  const RARITIES = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

  const getElementIcon = (element) => {
    const icons = {
      FIRE: '🔥',
      ICE: '❄️',
      EARTH: '🌍',
      DARK: '🌙',
      LIGHT: '☀️'
    };
    return icons[element] || '⚡';
  };

  const getRarityColor = (rarity) => {
    const colors = {
      COMMON: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
      RARE: 'text-blue-500 bg-blue-100 dark:bg-blue-900',
      EPIC: 'text-purple-500 bg-purple-100 dark:bg-purple-900',
      LEGENDARY: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900'
    };
    return colors[rarity] || 'text-gray-500 bg-gray-100 dark:bg-gray-800';
  };

  const getElementColor = (element) => {
    const colors = {
      FIRE: 'text-red-500 bg-red-100 dark:bg-red-900',
      ICE: 'text-blue-400 bg-blue-100 dark:bg-blue-900',
      EARTH: 'text-green-500 bg-green-100 dark:bg-green-900',
      DARK: 'text-purple-600 bg-purple-100 dark:bg-purple-900',
      LIGHT: 'text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
    };
    return colors[element] || 'text-gray-500 bg-gray-100 dark:bg-gray-800';
  };

  const filteredHeroes = heroes.filter(h => {
    const element = h.element || h.hero?.element;
    const rarity = h.rarity || h.hero?.rarity;
    const name = h.name || h.hero?.name || '';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesElement = filterElement === 'ALL' || element === filterElement;
    const matchesRarity = filterRarity === 'ALL' || rarity === filterRarity;
    
    return matchesSearch && matchesElement && matchesRarity;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  if (loading) {
    return (
      <ModernPageLayout 
        title={t("myHeroes", language)} 
        subtitle="Chargement de votre collection..."
        showBackButton={false}
      >
        <div className="flex items-center justify-center min-h-64">
          <motion.div
            className={`p-8 rounded-2xl backdrop-blur-sm ${
              theme === 'dark' 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/80 border-white/40'
            } border`}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <FaUser className="w-8 h-8 text-purple-500" />
          </motion.div>
        </div>
      </ModernPageLayout>
    );
  }

  if (error) {
    return (
      <ModernPageLayout 
        title={t("myHeroes", language)} 
        subtitle="Erreur de chargement"
        showBackButton={false}
      >
        <ModernCard className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <ModernButton 
            variant="primary" 
            onClick={() => window.location.reload()}
          >
            Réessayer
          </ModernButton>
        </ModernCard>
      </ModernPageLayout>
    );
  }

  const headerActions = (
    <div className="flex items-center space-x-2">
      <select
        value={filterElement}
        onChange={e => setFilterElement(e.target.value)}
        className={`px-3 py-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-white/10 border-white/20 text-white' 
            : 'bg-white/60 border-white/40 text-gray-800'
        }`}
      >
        {ELEMENTS.map(e => (
          <option key={e} value={e}>
            {e === 'ALL' ? t("all", language) || "Tous" : `${getElementIcon(e)} ${t(e.toLowerCase(), language) || e}`}
          </option>
        ))}
      </select>
      <select
        value={filterRarity}
        onChange={e => setFilterRarity(e.target.value)}
        className={`px-3 py-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-white/10 border-white/20 text-white' 
            : 'bg-white/60 border-white/40 text-gray-800'
        }`}
      >
        {RARITIES.map(r => (
          <option key={r} value={r}>
            {r === 'ALL' ? t("all", language) || "Tous" : t(r.toLowerCase(), language) || r}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <ModernPageLayout 
      title={t("myHeroes", language)}
      subtitle={`${filteredHeroes.length} héros dans votre collection`}
      headerActions={headerActions}
    >
      {/* Barre de recherche moderne */}
      <ModernSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={t("searchHero", language) || "Rechercher un héros..."}
        className="mb-8 max-w-2xl mx-auto"
      />

      {/* Grille de héros */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredHeroes.map(hero => (
          <motion.div key={hero.id} variants={itemVariants}>
            <ModernCard 
              className="h-full cursor-pointer group hover:scale-105 transition-transform duration-300 backdrop-blur-sm border border-white/20 dark:border-indigo-700/30"
              onClick={() => setSelectedHero(hero)}
            >
              <div className="text-center">
                <div className="relative mb-4">
                  <img
                    src={heroImg(hero.name || hero.hero?.name)}
                    alt={hero.name || hero.hero?.name}
                    className="w-24 h-24 mx-auto rounded-lg object-cover"
                    onError={e => e.target.src = heroImgUnknown}
                  />
                  <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded">
                    Lv.{hero.level || 1}
                  </div>
                </div>
                
                <h3 className={`font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-800'
                }`}>
                  {hero.name || hero.hero?.name}
                </h3>
                
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    getElementColor(hero.element || hero.hero?.element)
                  }`}>
                    {t((hero.element || hero.hero?.element)?.toLowerCase(), language) || (hero.element || hero.hero?.element)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    getRarityColor(hero.rarity || hero.hero?.rarity)
                  }`}>
                    {t((hero.rarity || hero.hero?.rarity)?.toLowerCase(), language) || (hero.rarity || hero.hero?.rarity)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <GiSwordWound className="text-red-500" />
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>
                      {hero.totalAttack || hero.hero?.baseAttack || 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GiShield className="text-blue-500" />
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>
                      {hero.totalDefense || hero.hero?.baseDefense || 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FaBolt className="text-yellow-500" />
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>
                      {hero.totalSpeed || hero.hero?.baseSpeed || 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FaHeart className="text-pink-500" />
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>
                      {hero.totalHealth || hero.hero?.health || 0}
                    </span>
                  </div>
                </div>
              </div>
            </ModernCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Message si aucun héros */}
      {filteredHeroes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <ModernCard className="max-w-md mx-auto">
            <FaUser className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <h3 className={`text-xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-800'
            }`}>
              Aucun héros trouvé
            </h3>
            <p className={`${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Essayez de modifier votre recherche ou vos filtres
            </p>
          </ModernCard>
        </motion.div>
      )}

      {/* Modal détaillé */}
      <ModernModal
        isOpen={!!selectedHero}
        onClose={() => setSelectedHero(null)}
        title={selectedHero?.name || selectedHero?.hero?.name}
      >
        {selectedHero && (
          <div className={`space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  getElementColor(selectedHero.element || selectedHero.hero?.element)
                }`}>
                  {t((selectedHero.element || selectedHero.hero?.element)?.toLowerCase(), language) || (selectedHero.element || selectedHero.hero?.element)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  getRarityColor(selectedHero.rarity || selectedHero.hero?.rarity)
                }`}>
                  {t((selectedHero.rarity || selectedHero.hero?.rarity)?.toLowerCase(), language) || (selectedHero.rarity || selectedHero.hero?.rarity)}
                </span>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  Niveau {selectedHero.level || 1}
                </span>
              </div>

              <img
                src={heroImg(selectedHero.name || selectedHero.hero?.name)}
                alt={selectedHero.name || selectedHero.hero?.name}
                className="w-74 h-74 mx-auto rounded-lg object-cover mb-4"
                onError={e => e.target.src = heroImgUnknown}
              />
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  <GiSwordWound className="text-red-500" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t("attack", language) || "Attaque"}</span>
                </div>
                <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedHero.totalAttack || selectedHero.hero?.baseAttack || 0}
                </span>
              </div>
              
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  <GiShield className="text-blue-500" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t("defense", language) || "Défense"}</span>
                </div>
                <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedHero.totalDefense || selectedHero.hero?.baseDefense || 0}
                </span>
              </div>
              
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  <FaBolt className="text-yellow-500" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t("speed", language) || "Vitesse"}</span>
                </div>
                <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedHero.totalSpeed || selectedHero.hero?.baseSpeed || 0}
                </span>
              </div>
              
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  <FaHeart className="text-pink-500" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t("health", language) || "Santé"}</span>
                </div>
                <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedHero.totalHealth || selectedHero.hero?.health || 0}
                </span>
              </div>
            </div>

            {/* Section équipement - AJOUTÉE */}
            <div className="mt-4 mb-4">
              <h3 className="text-lg font-semibold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t("equipment", language) || "Équipement"}
              </h3>
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
              }`}>
                <p className={`text-center mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {t("equipmentDescription", language) || "Améliorez votre héros en lui équipant des objets puissants"}
                </p>
                <div className="flex justify-center">
                  <ModernButton
                    variant="primary"
                    onClick={() => navigate(`/hero/${selectedHero.id}`)}
                    icon={<FaEye />}
                    className="w-full"
                  >
                    {t("viewHeroDetails", language) || "Voir les détails du héros"}
                  </ModernButton>
                </div>
              </div>
            </div>

            {/* Compétences */}
            {skills.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t("skills", language) || "Capacités"}
                </h3>
                <div>
                  <div className="grid grid-cols-1 gap-3">
                    {skills.map(skill => (
                      <div key={skill.id} className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
                      }`}>
                        <SkillCard
                          skill={skill}
                          heroName={selectedHero.name || selectedHero.hero?.name}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions en bas de modal */}
            {/* La section d'actions a été intégrée dans la section équipement */}
          </div>
        )}
      </ModernModal>
      
      {/* Contrôleur de musique */}
      <MusicController />
    </ModernPageLayout>
  );
};

export default MyHeroes;
