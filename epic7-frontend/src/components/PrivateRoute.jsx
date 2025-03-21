import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../services/authService";

const PrivateRoute = () => {
  const isAuthenticated = !!getToken();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
