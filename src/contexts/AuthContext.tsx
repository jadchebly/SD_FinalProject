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
  updateAvatar: (avatar: string) => Promise<void>;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  getFollowingList: () => string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

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
        localStorage.setItem('user', JSON.stringify(userData));
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
        localStorage.setItem('user', JSON.stringify(userData));
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
    // Clear session storage flags for suggested users modal
    // This ensures the modal will show again on next sign in
    if (user) {
      sessionStorage.removeItem(`suggestedUsersShown_${user.id}`);
    }
    setUser(null);
    localStorage.removeItem('user');
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

  const followUser = (userId: string) => {
    if (!user) return;
    
    const following = JSON.parse(localStorage.getItem('following') || '{}');
    if (!following[user.id]) {
      following[user.id] = [];
    }
    
    if (!following[user.id].includes(userId)) {
      following[user.id].push(userId);
      localStorage.setItem('following', JSON.stringify(following));
    }
    // Also notify backend (fire-and-forget). Backend will persist follow relationship.
    (async () => {
      try {
        await api.followUser(userId);
      } catch (err) {
        console.warn('Failed to notify backend of follow:', err);
      }
    })();
    // Notify app that following list changed so components (feed) can refresh
    try {
      window.dispatchEvent(new CustomEvent('followingChanged', { detail: { userId, action: 'follow' } }));
    } catch (e) {
      // ignore
    }
  };

  const unfollowUser = (userId: string) => {
    if (!user) return;
    
    const following = JSON.parse(localStorage.getItem('following') || '{}');
    if (following[user.id]) {
      following[user.id] = following[user.id].filter((id: string) => id !== userId);
      localStorage.setItem('following', JSON.stringify(following));
    }

    // Also notify backend (fire-and-forget)
    (async () => {
      try {
        await api.unfollowUser(userId);
      } catch (err) {
        console.warn('Failed to notify backend of unfollow:', err);
      }
    })();
    // Notify app that following list changed so components (feed) can refresh
    try {
      window.dispatchEvent(new CustomEvent('followingChanged', { detail: { userId, action: 'unfollow' } }));
    } catch (e) {
      // ignore
    }
  };

  const getFollowingList = (): string[] => {
    if (!user) return [];
    
    const following = JSON.parse(localStorage.getItem('following') || '{}');
    return following[user.id] || [];
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

