import { useState, useEffect } from 'react';
import { getHeroes } from '../services/adminHeroService';

function AdminHeroesList() {
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const data = await getHeroes();
        setHeroes(data);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des héros');
        setLoading(false);
      }
    };

    fetchHeroes();
  }, []);

  if (loading) return <div className="text-center p-4">Chargement...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-blue-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Liste des Héros</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {heroes.map((hero) => (
          <div key={hero.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">{hero.name}</h2>
            <p className="text-gray-600">Élément: {hero.element}</p>
            <p className="text-gray-600">Rareté: {hero.rarity}</p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">ATK: {hero.baseAttack}</p>
              <p className="text-sm text-gray-600">DEF: {hero.baseDefense}</p>
              <p className="text-sm text-gray-600">VIT: {hero.baseSpeed}</p>
              <p className="text-sm text-gray-600">PV: {hero.health}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminHeroesList;
