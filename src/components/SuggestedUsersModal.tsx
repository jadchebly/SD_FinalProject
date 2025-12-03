import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { GiEgyptianProfile } from 'react-icons/gi';
import './SuggestedUsersModal.css';

interface SuggestedUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface SuggestedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuggestedUsersModal({ isOpen, onClose }: SuggestedUsersModalProps) {
  const { user, followUser, unfollowUser, getFollowingList } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // Always attempt to load suggestions from backend when modal opens.
      // If user is logged out, backend will still return a random set.
      loadSuggestedUsers();
      loadFollowingList();
    }
  }, [isOpen, user]);

  const loadFollowingList = () => {
    if (!user) return;
    const followingList = getFollowingList();
    setFollowing(new Set(followingList));
  };

  const loadSuggestedUsers = async () => {
    if (!user) return;

    try {
      const res = await api.getSuggestedUsers();
      console.debug('SuggestedUsersModal: API response', res);
      if (res && res.success && Array.isArray(res.users) && res.users.length > 0) {
        setSuggestedUsers(res.users.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email || '',
          avatar: u.avatar || undefined,
        })));
        return;
      }
    } catch (e) {
      console.warn('Failed to load suggested users from API, falling back to localStorage', e);
    }

    // Fallback: use localStorage (existing behavior)
    try {
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const followingList = getFollowingList();
      const availableUsers = allUsers.filter((u: any) => u.id !== user.id && !followingList.includes(u.id));
      const shuffled = [...availableUsers].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);
      setSuggestedUsers(selected.map((u: any) => ({ id: u.id, username: u.username, email: u.email, avatar: u.avatar })));
    } catch (e) {
      console.error('Failed to load fallback suggested users', e);
      setSuggestedUsers([]);
    }
  };

  const handleFollow = async (userId: string) => {
    await followUser(userId);
    setFollowing(prev => new Set([...prev, userId]));
  };

  const handleUnfollow = async (userId: string) => {
    await unfollowUser(userId);
    setFollowing(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="suggested-users-overlay" onClick={onClose}>
      <div className="suggested-users-modal" onClick={(e) => e.stopPropagation()}>
        <button className="suggested-users-close" onClick={onClose} aria-label="Close modal">
          ×
        </button>
        
        <div className="suggested-users-header">
          <h2 className="suggested-users-title">Suggested People to Follow</h2>
          <p className="suggested-users-subtitle">Discover and connect with other users</p>
        </div>

        <div className="suggested-users-list">
          {suggestedUsers.length === 0 ? (
            <p className="no-suggestions">No suggestions available at the moment.</p>
          ) : (
            suggestedUsers.map((suggestedUser) => {
              const isFollowing = following.has(suggestedUser.id);
              const hasCustomAvatar = suggestedUser.avatar && suggestedUser.avatar !== 'default';

              return (
                <div key={suggestedUser.id} className="suggested-user-item">
                  <div className="suggested-user-avatar">
                    {hasCustomAvatar ? (
                      <img 
                        src={suggestedUser.avatar} 
                        alt={suggestedUser.username} 
                        className="suggested-user-avatar-img" 
                      />
                    ) : (
                      <GiEgyptianProfile size={40} className="suggested-user-icon" />
                    )}
                  </div>
                  
                  <div className="suggested-user-info">
                    <h3 className="suggested-user-username">{suggestedUser.username}</h3>
                    <p className="suggested-user-email">{suggestedUser.email}</p>
                  </div>

                  <button
                    className={`follow-button ${isFollowing ? 'following' : ''}`}
                    onClick={() => {
                      if (isFollowing) {
                        handleUnfollow(suggestedUser.id);
                      } else {
                        handleFollow(suggestedUser.id);
                      }
                    }}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="suggested-users-footer">
          <button className="skip-button" onClick={handleSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

