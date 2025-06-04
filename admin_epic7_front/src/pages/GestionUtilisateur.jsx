import { useState, useEffect } from 'react';
import { getUsers } from '../services/adminUserService';
import { FaUser, FaEnvelope, FaLevelUpAlt, FaCrown, FaCalendarAlt } from 'react-icons/fa';

function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des utilisateurs');
        setLoading(false);
        }
    };

    fetchUsers();
  }, []);

  if (loading) return <div className="text-center p-4">Chargement...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-blue-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Utilisateurs</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <div className="mb-2 text-xl font-semibold text-gray-800 flex items-center">
              <FaUser className="mr-2 text-blue-500" />
              {user.username}
            </div>

            <p className="text-gray-600 text-sm mb-1">
              <strong>ID:</strong> {user.id}
            </p>

            <p className="text-gray-600 text-sm flex items-center mb-1">
              <FaEnvelope className="mr-2" />
              {user.email}
            </p>

            <p className="text-gray-600 text-sm flex items-center mb-1">
              <FaLevelUpAlt className="mr-2" />
              Niveau: {user.level}
            </p>

            <p className="text-gray-600 text-sm flex items-center mb-1">
              <FaCrown className="mr-2" />
              Rang: {user.rank}
            </p>

            <p className="text-gray-600 text-sm flex items-center">
              <FaCalendarAlt className="mr-2" />
              Inscrit le: {user.registerDate}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminUsersList;
