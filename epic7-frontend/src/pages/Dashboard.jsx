import { useNavigate } from "react-router-dom";
import { logout, getToken } from "../services/authService";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <h1>Bienvenue dans ton Dashboard Epic7</h1>
      <p>Voici ton token JWT :</p>
      <pre className="token">{token}</pre>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
}

export default Dashboard;
