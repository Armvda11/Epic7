import { useState } from 'react';
import API from '../api/axiosInstance';

const elements = ['DARK', 'ICE', 'FIRE', 'LIGHT', 'WIND'];
const rarities = ['LEGENDAIRE', 'EPIC', 'RARE', 'COMMON'];

function CreateHeroForm() {
  const initialState = {
    name: '',
    element: 'DARK',
    rarity: 'LEGENDAIRE',
    baseAttack: 0,
    baseDefense: 0,
    baseSpeed: 0,
    health: 0,
  };

  const [formData, setFormData] = useState(initialState);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['baseAttack', 'baseDefense', 'baseSpeed', 'health'].includes(name)
        ? parseInt(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/heroes', formData);
      setMessage('✅ Héros créé avec succès');
      setFormData(initialState);
    } catch (err) {
      console.error(err);
      setMessage('❌ Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Créer un Héros</h2>

      {message && (
        <div className="mb-4 text-center font-semibold text-blue-600">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Nom du héros"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 p-2 rounded"
        />

        <select
          name="element"
          value={formData.element}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2 rounded"
        >
          {elements.map((el) => (
            <option key={el} value={el}>{el}</option>
          ))}
        </select>

        <select
          name="rarity"
          value={formData.rarity}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2 rounded"
        >
          {rarities.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            name="baseAttack"
            placeholder="Attaque"
            value={formData.baseAttack}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded"
          />
          <input
            type="number"
            name="baseDefense"
            placeholder="Défense"
            value={formData.baseDefense}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded"
          />
          <input
            type="number"
            name="baseSpeed"
            placeholder="Vitesse"
            value={formData.baseSpeed}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded"
          />
          <input
            type="number"
            name="health"
            placeholder="HP"
            value={formData.health}
            onChange={handleChange}
            className="border border-gray-300 p-2 rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
          disabled={!formData.name}
        >
          Créer
        </button>
      </form>
    </div>
  );
}

export default CreateHeroForm;
