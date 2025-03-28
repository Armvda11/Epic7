
// MyHeroes.jsx
import React, { useEffect, useState } from 'react';
import { getMyHeroes } from '../services/heroService';
import HeroCard from '../components/HeroCard';
import { useNavigate } from 'react-router-dom';

const MyHeroes = () => {
  const [heroes, setHeroes] = useState([]);
  const [selectedHero, setSelectedHero] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const data = await getMyHeroes(token);
        setHeroes(data);
      } catch (err) {
        setError('Impossible de charger les héros.');
      }
    };

    fetchHeroes();
  }, [token]);

  const closeOverlay = () => setSelectedHero(null);

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Mes Héros</h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Retour au Dashboard
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {heroes.map((heroInstance) => (
          <HeroCard
            key={heroInstance.id}
            heroInstance={heroInstance}
            onSelect={setSelectedHero}
          />
        ))}
      </div>

      {selectedHero && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={closeOverlay}
        >
          <div
            className="bg-gray-900 p-6 rounded-xl text-white w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeOverlay}
              className="absolute top-2 right-2 text-white text-xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-2">{selectedHero.hero.name}</h2>
            <p>Élément : {selectedHero.hero.element}</p>
            <p>Rareté : {selectedHero.hero.rarity}</p>
            <p>Attaque : {selectedHero.hero.baseAttack}</p>
            <p>Défense : {selectedHero.hero.baseDefense}</p>
            <p>Vitesse : {selectedHero.hero.baseSpeed}</p>
            <p>PV : {selectedHero.hero.health}</p>
            <img
              src={`/epic7-Hero/sprite-hero/${selectedHero.hero.code.toLowerCase()}.png`}
              alt={selectedHero.hero.name}
              className="mt-4 w-full h-auto rounded-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyHeroes;
