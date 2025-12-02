import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Dashboard/Navbar/Navbar';
import { GiEgyptianProfile } from 'react-icons/gi';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="profile-container">
        <div className="profile-card">
          <h1 className="profile-title">Profile</h1>
          
          <div className="profile-info">
            <div className="profile-avatar">
              <GiEgyptianProfile size={64} />
            </div>
            
            <div className="profile-details">
              <h2>{user.username}</h2>
              <p>{user.email}</p>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

