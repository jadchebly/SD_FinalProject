import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateAvatar: (avatar: string) => void;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  getFollowingList: () => string[];
  hasSeenSuggested: (userId: string) => boolean;
  markSeenSuggested: (userId: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [seenSuggested, setSeenSuggested] = useState<Set<string>>(new Set());

  // Rehydrate user from backend on mount (DB-backed session)
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await api.getMe();
        if (!mounted) return;
        if (res && res.success && res.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }

        if (res && res.success && res.user) {
          try {
            const f = await api.getFollowing();
            if (f && f.success) setFollowingList(f.following || []);
          } catch (e) {
            console.warn('Failed to load following list', e);
            setFollowingList([]);
          }
        }
      } catch (e) {
        console.error('Failed to rehydrate user:', e);
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => { mounted = false; };
  }, []);

    // Register providers with ApiService so it no longer reads localStorage
    useEffect(() => {
      api.setAuthHeaderProvider(() => {
        // If you later switch to HttpOnly cookies, return {} here.
        return { ...(user && user.id ? { 'x-user-id': user.id } : {}) };
      });

      api.setCurrentUserProvider(() => user);
    }, [user]);

    const hasSeenSuggested = (userId: string) => {
      return seenSuggested.has(userId);
    };

    const markSeenSuggested = (userId: string) => {
      setSeenSuggested(prev => new Set(prev).add(userId));
    };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.login(email, password);
      if (response.success && response.user) {
        const userData = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          avatar: response.user.avatar || null,
        };
        setUser(userData);

        // Refresh following list for the authenticated user
        try {
          const f = await api.getFollowing();
          if (f && f.success) setFollowingList(f.following || []);
        } catch (e) {
          console.warn('Failed to load following after login', e);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.signup(username, email, password);
      if (response.success && response.user) {
        const userData = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          avatar: response.user.avatar || null,
        };
        setUser(userData);

        // new users start with empty following
        setFollowingList([]);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Signup error:', error);
      // Check if it's an email/username already exists error
      if (error.message?.includes('already')) {
        return false;
      }
      throw error; // Re-throw other errors
    }
  };

  const logout = () => {
    // Clear in-memory state. If you later implement server sessions/cookies,
    // call /api/logout to clear them server-side.
    // Attempt to notify backend to clear session cookie
    try {
      api.logout().catch((e) => console.warn('Logout request failed', e));
    } catch (e) {
      // ignore
    }

    setUser(null);
    setFollowingList([]);
  };

  const updateAvatar = async (avatar: string) => {
    if (!user) return;
    
    try {
      console.log('Updating avatar for user:', user.id);
      // Update avatar in Supabase
      const response = await api.updateUserAvatar(user.id, avatar);
      console.log('Avatar update response:', response);
      
      if (response && response.success && response.user) {
        const updatedUser = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          avatar: response.user.avatar || null,
        };
        console.log('Avatar updated successfully, new avatar:', updatedUser.avatar ? 'present' : 'null');
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        console.warn('Avatar update response missing success or user data');
        // Fallback: update local state even if API call fails
        const updatedUser = { ...user, avatar };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to update avatar in Supabase:', error);
      // Fallback: update local state even if API call fails
      const updatedUser = { ...user, avatar };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const followUser = async (userId: string) => {
    if (!user) return;

    try {
      const res = await api.followUser(userId);
      if (res && res.success) {
        setFollowingList(prev => Array.from(new Set([...prev, userId])));
      }
    } catch (err) {
      console.warn('Failed to follow on backend:', err);
    }

    try {
      window.dispatchEvent(new CustomEvent('followingChanged', { detail: { userId, action: 'follow' } }));
    } catch (e) {
      // ignore
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return;

    try {
      const res = await api.unfollowUser(userId);
      if (res && res.success) {
        setFollowingList(prev => prev.filter(id => id !== userId));
      }
    } catch (err) {
      console.warn('Failed to unfollow on backend:', err);
    }

    try {
      window.dispatchEvent(new CustomEvent('followingChanged', { detail: { userId, action: 'unfollow' } }));
    } catch (e) {
      // ignore
    }
  };

  const getFollowingList = (): string[] => {
    return followingList || [];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      updateAvatar,
      followUser,
      unfollowUser,
      getFollowingList,
      hasSeenSuggested,
      markSeenSuggested,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

