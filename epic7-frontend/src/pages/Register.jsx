import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/authService";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { motion } from "framer-motion";

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await register(email, password);
      localStorage.setItem("token", response.token);
      setMessage("Inscription réussie !");
      navigate("/dashboard");
    } catch (error) {
      setMessage("Erreur : cet email est déjà utilisé.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

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
        className={`w-80 p-8 rounded-xl bg-white/10 backdrop-blur-md shadow-2xl text-white ${
          shake ? "animate-shake" : ""
        }`}
        aria-label="Formulaire d'inscription"
      >
        <h2 className="text-3xl font-bold text-center mb-6">Créer un compte</h2>

        {/* Email */}
        <label className="block mb-4 text-sm">
          <span className="text-gray-300">Adresse e-mail</span>
          <div className="relative mt-1">
            <FaEnvelope className="absolute top-3 left-3 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full pl-10 pr-4 py-2 rounded-md text-black bg-white/90 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </label>

        {/* Password */}
        <label className="block mb-4 text-sm">
          <span className="text-gray-300">Mot de passe</span>
          <div className="relative mt-1">
            <FaLock className="absolute top-3 left-3 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="6 caractères minimum"
              className="w-full pl-10 pr-4 py-2 rounded-md text-black bg-white/90 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </label>

        {/* Message de retour */}
        {message && (
          <p
            className={`text-sm font-semibold text-center mb-4 ${
              message.includes("réussie") ? "text-green-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-2 rounded-md font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition"
        >
          S'inscrire
        </button>

        {/* Link */}
        <p className="text-sm mt-4 text-center">
          Déjà inscrit ?{" "}
          <Link
            to="/"
            className="underline text-purple-300 hover:text-purple-400"
          >
            Se connecter
          </Link>
        </p>
      </motion.form>
    </main>
  );
}

export default Register;
