import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyHeroes from "./pages/MyHeroes";
import Inventory from "./pages/Inventory";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeroView from "./pages/HeroView";
import PrivateRoute from "./components/PrivateRoute";
import FriendsPage from "./pages/FriendsPage";
import Shop from "./pages/Shop";
import Battle from "./pages/Battle";
import SummonPage from "./pages/SummonPage";
import UserProfile from './pages/UserProfile';
import GuildsPage from "./pages/GuildsPage";
import RtaBattlePage from './pages/RtaBattlePage';
import GlobalChatPage from './pages/GlobalChatPage';
import GuildChatPage from './pages/GuildChatPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/my-heroes" element={<MyHeroes />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/guilds" element={<GuildsPage />} />
          <Route path="/summons" element={<SummonPage />} />
          <Route path="/rta" element={<RtaBattlePage />} />
          <Route path="/hero/:heroId" element={<HeroView />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile/:userId" element={<UserProfile />} />
          <Route path="/global-chat" element={<GlobalChatPage />} />
          <Route path="/guild/:guildId/chat" element={<GuildChatPage />} />
        </Route>
      </Routes>

      {/* Global Toast container */}
      <ToastContainer 
        position="top-center" 
        autoClose={5000}
        closeOnClick={true}
        draggable={true}
        pauseOnHover={true}
        className="overlay-toast"
        style={{
          width: "auto",
          maxWidth: "500px"
        }}
      />
    </>
  );
}

export default App;
