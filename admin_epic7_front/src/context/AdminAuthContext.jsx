/* import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyAdminToken, adminLogout } from '../services/adminAuthService';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
};

export const AdminAuthProvider = ({ children }) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [adminUser, setAdminUser] = useState(null);

    useEffect(() => {
        // Vérifier le token admin au chargement
        const verifyAuth = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                if (token) {
                    const userData = await verifyAdminToken();
                    setAdminUser(userData);
                    setIsAdminAuthenticated(true);
                }
            } catch (error) {
                console.error('Admin token verification failed:', error);
                adminLogout();
                setIsAdminAuthenticated(false);
                setAdminUser(null);
            }
            setLoading(false);
        };

        verifyAuth();
    }, []);

    const logout = () => {
        adminLogout();
        setIsAdminAuthenticated(false);
        setAdminUser(null);
    };

    const value = {
        isAdminAuthenticated,
        loading,
        adminUser,
        setIsAdminAuthenticated,
        setAdminUser,
        logout
    };

    return (
        <AdminAuthContext.Provider value={value}>
            {!loading && children}
        </AdminAuthContext.Provider>
    );
};
 */