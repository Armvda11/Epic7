    // Debug script pour vérifier les données de matchData dans RTA
console.log("=== SCRIPT DE DEBUG RTA USERNAMES ===");

// Simuler des données de matchData comme elles pourraient arriver du backend
const mockMatchData = {
  player1: {
    id: "1",
    username: undefined, // Peut être undefined
    level: 99,
    heroes: []
  },
  player2: {
    id: "2", 
    username: null, // Peut être null
    level: 99,
    heroes: []
  },
  player1Name: "Hermas", // Les vrais noms
  player2Name: "TestPlayer"
};

console.log("Données mockées:", JSON.stringify(mockMatchData, null, 2));

// Test de la logique actuelle du composant
console.log("\n=== LOGIQUE ACTUELLE ===");
const currentLogic1 = mockMatchData?.player1?.username || mockMatchData?.player1Name || "Joueur 1";
const currentLogic2 = mockMatchData?.player2?.username || mockMatchData?.player2Name || "Joueur 2";

console.log("Player1 (logique actuelle):", currentLogic1);
console.log("Player2 (logique actuelle):", currentLogic2);

// Test de la logique corrigée
console.log("\n=== LOGIQUE CORRIGÉE ===");
const correctedLogic1 = (mockMatchData?.player1?.username && mockMatchData.player1.username.trim() !== "") 
  ? mockMatchData.player1.username 
  : (mockMatchData?.player1Name || "Joueur 1");

const correctedLogic2 = (mockMatchData?.player2?.username && mockMatchData.player2.username.trim() !== "") 
  ? mockMatchData.player2.username 
  : (mockMatchData?.player2Name || "Joueur 2");

console.log("Player1 (logique corrigée):", correctedLogic1);
console.log("Player2 (logique corrigée):", correctedLogic2);

// Test avec différents scénarios
console.log("\n=== TESTS AVANCÉS ===");

const testCases = [
  { desc: "username undefined", username: undefined, name: "TestUser" },
  { desc: "username null", username: null, name: "TestUser" },
  { desc: "username string vide", username: "", name: "TestUser" },
  { desc: "username espace", username: "   ", name: "TestUser" },
  { desc: "username valide", username: "RealUser", name: "TestUser" }
];

testCases.forEach(test => {
  const result1 = test.username || test.name || "Joueur";
  const result2 = (test.username && test.username.trim() !== "") ? test.username : (test.name || "Joueur");
  
  console.log(`${test.desc}:`);
  console.log(`  Logique actuelle: "${result1}"`);
  console.log(`  Logique corrigée: "${result2}"`);
});
