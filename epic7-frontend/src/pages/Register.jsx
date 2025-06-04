import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/authService";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { motion } from "framer-motion";
import { useMusic } from "../context/MusicContext";
import { useSettings } from "../context/SettingsContext";

/**
 * Page d'inscription  
 */
function Register() {

  const navigate = useNavigate(); // Redirection après l'inscription
  const [email, setEmail] = useState(""); // État pour l'email
  const [password, setPassword] = useState(""); // État pour le mot de passe
  const [message, setMessage] = useState(""); // État pour le message de retour
  const [shake, setShake] = useState(false); // État pour l'animation de secousse (juste pour le fun )
  const { preloadMusic, playConnectionMusic, stopCurrentMusic } = useMusic(); // Hook de musique
  const { language, t } = useSettings(); // Hook pour les traductions

  // Effet pour désactiver le défilement de la page (scroll) lors de l'affichage du formulaire
  // et démarrer la musique de connexion
  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    // Précharger et démarrer la musique de connexion
    preloadMusic();
    // Arrêter toute musique en cours avant de jouer la musique de connexion
    stopCurrentMusic(500);
    
    // Démarrer la musique de connexion après un court délai pour assurer la transition
    const timer = setTimeout(() => {
      playConnectionMusic();
      console.log("Musique de connexion démarrée sur la page d'inscription");
    }, 600);
    
    return () => {
      document.body.style.overflow = "auto";
      clearTimeout(timer);
    };
  }, [preloadMusic, playConnectionMusic, stopCurrentMusic]);

  // Fonction pour gérer l'inscription
  // Elle est appelée lors de la soumission du formulaire
  const handleRegister = async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    try {
      const response = await register(email, password); // Envoi de la requête d'inscription
      localStorage.setItem("token", response.token); // Stockage du token dans le localStorage
      setMessage(t("registrationSuccessful", language));
      navigate("/dashboard");
    } catch (error) {
      setMessage("Erreur : cet email est déjà utilisé.");
      setShake(true); // on va bouger un peu 🤏🏾
      setTimeout(() => setShake(false), 600);
    }
  };

  // Le rendu HTML de la page d'inscription
  // On utilise Tailwind CSS pour le style
  // et Framer Motion pour les animations   (merci Framer) 
  return (
    <main className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-backgroundZoom -z-10"
        style={{ backgroundImage: "url('/splashArt.jpeg')" }}
        aria-hidden="true"
      />

      {/* Form */}
      <motion.form
        onSubmit={handleRegister}
        className={`w-80 p-8 rounded-xl bg-white/10 backdrop-blur-md shadow-2xl text-white ${shake ? "animate-shake" : ""
          }`}
        aria-label="Formulaire d'inscription"
      >
        <h2 className="text-3xl font-bold text-center mb-6">Créer un compte</h2>

        {/* Email */}
        <label className="block mb-4 text-sm">
          <span className="text-gray-300">{t("emailAddress", language)}</span>
          <div className="relative mt-1">
            <FaEnvelope className="absolute top-3 left-3 text-gray-500" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full pl-10 pr-4 py-2 rounded-md text-black bg-white/90 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </label>

        {/* Password */}
        <label className="block mb-4 text-sm">
          <span className="text-gray-300">{t("password", language)}</span>
          <div className="relative mt-1">
            <FaLock className="absolute top-3 left-3 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t("passwordPlaceholder6Chars", language)}
              className="w-full pl-10 pr-4 py-2 rounded-md text-black bg-white/90 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </label>

        {/* Message de retour */}
        {message && (
          <p className={`text-sm font-semibold text-center mb-4 ${message.includes(t("registrationSuccessful", language)) ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}

        {/* Submit */}
        <button type="submit" className="w-full py-2 rounded-md font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition">
          {t("registerButton", language)}
        </button>

        {/* Link */}
        <p className="text-sm mt-4 text-center">
          {t("alreadyRegistered", language)}{" "}
          <Link to="/" className="underline text-purple-300 hover:text-purple-400">
            {t("loginLink", language)}
          </Link>
        </p>
      </motion.form>
    </main>
  );
}

export default Register;
