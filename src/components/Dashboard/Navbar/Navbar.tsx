import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiFillPlusCircle } from "react-icons/ai";
import { IoHome } from "react-icons/io5";
import { IoArrowBack } from "react-icons/io5";
import { IoPersonAdd } from 'react-icons/io5';
import { GiEgyptianProfile } from "react-icons/gi";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import "./Navbar.css"; 
import api from '../../../services/api';

// Simple dropdown search in the navbar

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCreatePost = location.pathname === "/create-post";
  const [searchQuery, setSearchQuery] = useState("");
  // Navbar search now only emits events to filter the feed; user lookup moved
  // to the dedicated people-search panel (opened via the add-friend button).
  const { followUser, unfollowUser, getFollowingList } = useAuth();
  // People search (separate UI triggered by the add-friend button)
  const [showPeopleSearch, setShowPeopleSearch] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const peopleRef = useRef<HTMLDivElement | null>(null);

  // Navbar search will no longer perform user lookup here. The input still
  // dispatches a `searchUpdate` CustomEvent which the feed listens to and
  // filters posts accordingly.

  // no dropdown to close here (people search has its own outside-click handler)

  // close people search panel on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!peopleRef.current) return;
      if (!peopleRef.current.contains(e.target as Node)) {
        setShowPeopleSearch(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Dispatch custom event with query data
    window.dispatchEvent(new CustomEvent("searchUpdate", { detail: { query } }));
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // For navbar search we simply emit the searchUpdate event (already
      // dispatched on change). The feed component will handle filtering.
      window.dispatchEvent(new CustomEvent("searchUpdate", { detail: { query: searchQuery } }));
      // Optionally blur the input
      (e.target as HTMLInputElement).blur();
    }
  };

  // People search debounce
  useEffect(() => {
    if (!showPeopleSearch) return;
    if (!peopleQuery || peopleQuery.trim().length === 0) {
      setPeopleResults([]);
      setPeopleLoading(false);
      return;
    }
    setPeopleLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.searchUsers(peopleQuery.trim());
        if (res && res.success) setPeopleResults(res.users || []);
        else setPeopleResults(res.users || []);
      } catch (err) {
        console.error('People search failed:', err);
        setPeopleResults([]);
      } finally {
        setPeopleLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [peopleQuery, showPeopleSearch]);

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
                placeholder="Search posts"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
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
              {/* Add friend button - opens a dedicated people search panel */}
              <div className="people-search-wrapper" ref={peopleRef}>
                <button
                  className="people-search-button"
                  onClick={() => { setShowPeopleSearch((s) => !s); setPeopleQuery(''); setPeopleResults([]); }}
                  aria-label="Find people"
                >
                  <IoPersonAdd size={22} />
                </button>
                {showPeopleSearch && (
                  <div className="people-search-panel">
                    <input
                      className="people-search-input"
                      placeholder="Find people"
                      value={peopleQuery}
                      onChange={(e) => setPeopleQuery(e.target.value)}
                      autoFocus
                    />
                    <div className="people-search-list">
                      {peopleLoading ? (
                        <div className="people-search-empty">Searching...</div>
                      ) : (() => {
                        const filtered = peopleResults.filter((u) => !(user && u.id === user.id));
                        if (filtered.length === 0) return <div className="people-search-empty">No results</div>;
                        return filtered.map((u) => {
                          const isFollowing = getFollowingList ? getFollowingList().includes(u.id) : false;
                          const hasCustomAvatar = u.avatar && u.avatar !== 'default';
                          return (
                            <div key={u.id} className="people-search-row" onClick={() => { navigate(`/profile/${u.id}`); setShowPeopleSearch(false); }}>
                              <div className="people-search-left">
                                {hasCustomAvatar ? <img src={u.avatar} alt={u.username} className="people-search-avatar" /> : <GiEgyptianProfile size={20} />}
                                <div className="people-search-info">
                                  <div className="people-search-name">{u.username}</div>
                                  <div className="people-search-email">{u.email}</div>
                                </div>
                              </div>
                              <div className="people-search-action">
                                {user && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (isFollowing) { unfollowUser(u.id); } else { followUser(u.id); } }}
                                    className={`search-follow-btn ${isFollowing ? 'following' : ''}`}
                                  >
                                    {isFollowing ? 'Following' : 'Follow'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
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

