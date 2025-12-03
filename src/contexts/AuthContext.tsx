import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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
    // In a real app, this would call your backend API
    // For now, we'll simulate with localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData = { 
        id: foundUser.id, 
        username: foundUser.username, 
        email: foundUser.email,
        avatar: foundUser.avatar
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    // In a real app, this would call your backend API
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email already exists
    if (users.some((u: any) => u.email === email)) {
      return false;
    }

    // Create a default avatar (using a simple data URL for a default profile icon)
    // In a real app, you might use a default image URL
    const defaultAvatar = 'default'; // We'll use 'default' as a flag to show the icon

    const newUser = {
      id: crypto.randomUUID(),
      username,
      email,
      password, // In production, this should be hashed!
      avatar: defaultAvatar,
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    const userData = { id: newUser.id, username, email, avatar: defaultAvatar };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return true;
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

  const updateAvatar = (avatar: string) => {
    if (!user) return;
    
    const updatedUser = { ...user, avatar };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Also update in users array
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) => 
      u.id === user.id ? { ...u, avatar } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));
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
  };

  const unfollowUser = (userId: string) => {
    if (!user) return;
    
    const following = JSON.parse(localStorage.getItem('following') || '{}');
    if (following[user.id]) {
      following[user.id] = following[user.id].filter((id: string) => id !== userId);
      localStorage.setItem('following', JSON.stringify(following));
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

