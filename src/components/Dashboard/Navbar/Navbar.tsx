import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiFillPlusCircle } from "react-icons/ai";
import { IoHome } from "react-icons/io5";
import { IoArrowBack } from "react-icons/io5";
import { GiEgyptianProfile } from "react-icons/gi";
import { useAuth } from "../../../contexts/AuthContext";
import "./Navbar.css"; 

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCreatePost = location.pathname === "/create-post";

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div>
      <div className="top-navbar">
        {isCreatePost ? (
          <button onClick={handleBack} className="back-button">
            <IoArrowBack size={24} />
          </button>
        ) : (
          <div className="top-navbar-logo">IEstagram</div>
        )}
        
        {!isCreatePost && (
          <div className="search-container">
            <input type="text" className="form-control search-input" placeholder="Search" />
          </div>
        )}
        
        <div className="top-navbar-links">
          {!isCreatePost && (
            <>
              <Link className="link" to="/dashboard">
                <IoHome size={24} />
              </Link>
              <Link className="link" to="/create-post">
                <AiFillPlusCircle className="text-blue-500" size={24} />
              </Link>
            </>
          )}
          <div
            tabIndex={0}
            role="button"
            className="avatar"
          >
            <Link className="link" to="/profile">
              <GiEgyptianProfile size={24} />
            </Link>
          </div>
          {user && (
            <span className="username-display">{user.username}</span>
          )}
        </div>
      </div>
    </div>  
  );
}

