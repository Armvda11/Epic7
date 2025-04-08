import React, { useState } from "react";
import { performSummon } from "../services/summonService";

export default function SummonPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSummon = async () => {
    setResult(null);
    setLoading(true);
    try {
      const summonResult = await performSummon();
      setResult(summonResult); // Affiche le résultat si l'invocation réussit
    } catch (error) {
      // Vérifie si le backend a retourné un message d'erreur
      if (error.response && error.response.data && error.response.data.message) {
        setResult({ error: true, message: error.response.data.message }); // Affiche le message d'erreur du backend
      } else {
        setResult({ error: true, message: "❌ Une erreur inattendue s'est produite." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-900 to-black text-white">
      <h1 className="text-4xl font-bold mb-6">⚔️ Invocation ⚔️</h1>
      <button
        onClick={handleSummon}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-xl font-bold shadow-lg"
      >
        {loading ? "Invocation en cours..." : "Invoquer un héros"}
      </button>
      {result && (
        <div className="mt-6 text-center">
          {result.error ? ( // Vérifie si le résultat contient une erreur
            <p className="text-xl text-red-500">{result.message}</p>
          ) : (
            <>
              <h2 className="text-3xl font-bold">Héros invoqué :</h2>
              <p className="text-xl">Nom : {result.heroName}</p>
              <p className="text-xl">Rareté : {result.rarity}</p>
              <p className="text-xl">Élément : {result.element}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}