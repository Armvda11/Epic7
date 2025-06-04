import { Routes, Route, Outlet } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyHeroes from "./pages/MyHeroes";
import Inventory from "./pages/Inventory";
import HeroView from "./pages/HeroView";
import PrivateRoute from "./components/PrivateRoute";
import FriendsPage from "./pages/FriendsPage";
import Shop from "./pages/Shop";
import Battle from "./pages/Battle";
import SummonPage from "./pages/SummonPage";
import UserProfile from './pages/UserProfile';
import GuildsPage from "./pages/GuildsPage";
import RtaBattlePage from './pages/RtaBattlePage';
import RtaLeaderboard from './pages/RtaLeaderboard';
import GlobalChatPage from './pages/GlobalChatPage';
import GuildChatPage from './pages/GuildChatPage';
import { ChatProvider } from './context/ChatContext';
import { MailboxProvider } from './context/MailboxContext';


function App() {
  return (
    <MailboxProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
          
        {/* Protected routes - ChatProvider only wraps authenticated routes */}
        <Route element={<PrivateRoute />}>
          <Route element={
            <ChatProvider>
              <Outlet />
            </ChatProvider>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/my-heroes" element={<MyHeroes />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/guilds" element={<GuildsPage />} />
            <Route path="/summons" element={<SummonPage />} />
            <Route path="/rta" element={<RtaBattlePage />} />
            <Route path="/rta-leaderboard" element={<RtaLeaderboard />} />
            <Route path="/hero/:heroId" element={<HeroView />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/global-chat" element={<GlobalChatPage />} />
            <Route path="/guild/:guildId/chat" element={<GuildChatPage />} />
          </Route>
        </Route>
      </Routes>
      
      {/* Toast Container pour les notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastStyle={{
          fontSize: '14px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}
      />
    </MailboxProvider>
  );
}

export default App;
