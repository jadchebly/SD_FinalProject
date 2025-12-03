import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiFillPlusCircle } from "react-icons/ai";
import { IoHome } from "react-icons/io5";
import { IoArrowBack } from "react-icons/io5";
import { GiEgyptianProfile } from "react-icons/gi";
import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import "./Navbar.css"; 

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCreatePost = location.pathname === "/create-post";
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Dispatch custom event with query data
    window.dispatchEvent(new CustomEvent("searchUpdate", { detail: { query } }));
  };

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
            <input 
              type="text" 
              className="form-control search-input" 
              placeholder="Search" 
              value={searchQuery}
              onChange={handleSearchChange}
            />
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
              {user && user.avatar && user.avatar !== 'default' ? (
                <img src={user.avatar} alt="Profile" className="navbar-avatar-img" />
              ) : (
                <GiEgyptianProfile size={24} />
              )}
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

