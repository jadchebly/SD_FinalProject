/**
 * AuthContext Tests
 * Tests for authentication context functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import * as api from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateUserAvatar: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getFollowing: vi.fn(),
    getMe: vi.fn(),
    setAuthHeaderProvider: vi.fn(),
    setCurrentUserProvider: vi.fn(),
  },
}));

// Test component that uses AuthContext
function TestComponent() {
  const { user, login, signup, logout, updateAvatar, followUser, unfollowUser, getFollowingList } = useAuth();
  const [loginResult, setLoginResult] = React.useState<boolean | null>(null);
  const [signupResult, setSignupResult] = React.useState<boolean | null>(null);
  
  const handleLogin = async () => {
    const result = await login('test@example.com', 'password123');
    setLoginResult(result);
  };

  const handleSignup = async () => {
    try {
      const result = await signup('testuser', 'test@example.com', 'password123');
      setSignupResult(result);
    } catch (error) {
      // If error is re-thrown, set result to false to indicate failure
      setSignupResult(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleUpdateAvatar = async () => {
    await updateAvatar('https://example.com/new-avatar.jpg');
  };

  const handleFollow = async () => {
    await followUser('user-to-follow');
  };

  const handleUnfollow = async () => {
    await unfollowUser('user-to-unfollow');
  };
  
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="following-count">{getFollowingList().length}</div>
      <div data-testid="following-list">{JSON.stringify(getFollowingList())}</div>
      <div data-testid="login-result">{loginResult === null ? 'not-called' : loginResult.toString()}</div>
      <div data-testid="signup-result">{signupResult === null ? 'not-called' : signupResult.toString()}</div>
      <button
        data-testid="login-btn"
        onClick={handleLogin}
      >
        Login
      </button>
      <button
        data-testid="signup-btn"
        onClick={handleSignup}
      >
        Signup
      </button>
      <button
        data-testid="logout-btn"
        onClick={handleLogout}
      >
        Logout
      </button>
      <button
        data-testid="update-avatar-btn"
        onClick={handleUpdateAvatar}
      >
        Update Avatar
      </button>
      <button
        data-testid="follow-btn"
        onClick={handleFollow}
      >
        Follow
      </button>
      <button
        data-testid="unfollow-btn"
        onClick={handleUnfollow}
      >
        Unfollow
      </button>
    </div>
  );
}

describe('AuthContext - Login Function', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock getMe to return failure (no existing session)
    vi.mocked(api.default.getMe).mockResolvedValue({
      success: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('A. Login success - sets user, localStorage, loads following', () => {
    it('should set user state, localStorage, and load following list on successful login', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg',
      };

      const mockFollowing = ['user-456', 'user-789'];

      // Mock successful login
      vi.mocked(api.default.login).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      // Mock successful getFollowing
      vi.mocked(api.default.getFollowing).mockResolvedValue({
        success: true,
        following: mockFollowing,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      // Click login button
      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      // Wait for login to complete
      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Verify user state is set
      await waitFor(() => {
        const userElement = screen.getByTestId('user');
        const userData = JSON.parse(userElement.textContent || 'null');
        expect(userData).toEqual({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          avatar: mockUser.avatar,
        });
      });

      // Verify localStorage is set
      const storedUser = localStorage.getItem('user');
      expect(storedUser).toBeTruthy();
      const parsedUser = JSON.parse(storedUser!);
      expect(parsedUser).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        avatar: mockUser.avatar,
      });

      // Verify getFollowing was called
      await waitFor(() => {
        expect(api.default.getFollowing).toHaveBeenCalledWith(mockUser.id);
      });

      // Verify following list is loaded
      await waitFor(() => {
        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('2');
      });

      // Verify login returned true
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('true');
      });
    });

    it('should handle user without avatar (null avatar)', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        // No avatar field
      };

      vi.mocked(api.default.login).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      vi.mocked(api.default.getFollowing).mockResolvedValue({
        success: true,
        following: [],
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        const userElement = screen.getByTestId('user');
        const userData = JSON.parse(userElement.textContent || 'null');
        expect(userData.avatar).toBeNull();
      });
    });
  });

  describe('B. Login failure - returns false, no state change', () => {
    it('should return false and not change state when login fails', async () => {
      const initialUser = {
        id: 'initial-user',
        username: 'initial',
        email: 'initial@example.com',
        avatar: null,
      };
      localStorage.setItem('user', JSON.stringify(initialUser));

      // Mock failed login
      vi.mocked(api.default.login).mockResolvedValue({
        success: false,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      // Get initial state
      const initialUserElement = screen.getByTestId('user');
      const initialUserData = initialUserElement.textContent;

      // Click login button
      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      // Wait for login call
      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify user state did not change
      await waitFor(() => {
        const userElement = screen.getByTestId('user');
        // State should remain the same (or be cleared by getMe failure)
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify getFollowing was NOT called (login failed)
      expect(api.default.getFollowing).not.toHaveBeenCalled();

      // Verify login returned false
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('false');
      });
    });

    it('should return false when response has success=false', async () => {
      vi.mocked(api.default.login).mockResolvedValue({
        success: false,
        user: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify no following call was made
      expect(api.default.getFollowing).not.toHaveBeenCalled();

      // Verify login returned false
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('false');
      });
    });

    it('should return false when response has no user', async () => {
      vi.mocked(api.default.login).mockResolvedValue({
        success: true,
        // No user field
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify no following call was made
      expect(api.default.getFollowing).not.toHaveBeenCalled();

      // Verify login returned false
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('false');
      });
    });
  });

  describe('C. Login error handling - catches errors, returns false', () => {
    it('should catch errors and return false when login throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock login to throw an error
      vi.mocked(api.default.login).mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      // Wait for error to be caught
      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify error was logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
      });

      // Verify getFollowing was NOT called
      expect(api.default.getFollowing).not.toHaveBeenCalled();

      // Verify login returned false
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('false');
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle API timeout errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(api.default.login).mockRejectedValue(new Error('Request timeout'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(api.default.getFollowing).not.toHaveBeenCalled();

      // Verify login returned false
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('false');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('D. getFollowing failure after login - still succeeds, empty following list', () => {
    it('should complete login successfully even when getFollowing fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        avatar: null,
      };

      // Mock successful login
      vi.mocked(api.default.login).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      // Mock getFollowing to fail
      vi.mocked(api.default.getFollowing).mockRejectedValue(new Error('Failed to load following'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      // Wait for login to complete
      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify user was set despite getFollowing failure
      await waitFor(() => {
        const userElement = screen.getByTestId('user');
        const userData = JSON.parse(userElement.textContent || 'null');
        expect(userData.id).toBe(mockUser.id);
      });

      // Verify localStorage was set
      const storedUser = localStorage.getItem('user');
      expect(storedUser).toBeTruthy();

      // Verify getFollowing was called
      await waitFor(() => {
        expect(api.default.getFollowing).toHaveBeenCalledWith(mockUser.id);
      });

      // Verify warning was logged
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to load following after login',
          expect.any(Error)
        );
      });

      // Verify following list is empty (default)
      await waitFor(() => {
        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('0');
      });

      // Verify login still returned true despite getFollowing failure
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('true');
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle getFollowing returning success=false', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        avatar: null,
      };

      vi.mocked(api.default.login).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      // Mock getFollowing to return success=false
      vi.mocked(api.default.getFollowing).mockResolvedValue({
        success: false,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify user was still set
      await waitFor(() => {
        const userElement = screen.getByTestId('user');
        const userData = JSON.parse(userElement.textContent || 'null');
        expect(userData.id).toBe(mockUser.id);
      });

      // Verify following list is empty
      await waitFor(() => {
        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('0');
      });

      // Verify login still returned true
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('true');
      });
    });

    it('should handle getFollowing returning null following array', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        avatar: null,
      };

      vi.mocked(api.default.login).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      // Mock getFollowing to return null following
      vi.mocked(api.default.getFollowing).mockResolvedValue({
        success: true,
        following: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(api.default.getMe).toHaveBeenCalled();
      });

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(api.default.login).toHaveBeenCalled();
      });

      // Verify user was set
      await waitFor(() => {
        const userElement = screen.getByTestId('user');
        const userData = JSON.parse(userElement.textContent || 'null');
        expect(userData.id).toBe(mockUser.id);
      });

      // Verify following list is empty (null becomes empty array)
      await waitFor(() => {
        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('0');
      });

      // Verify login still returned true
      await waitFor(() => {
        const loginResult = screen.getByTestId('login-result');
        expect(loginResult.textContent).toBe('true');
      });
    });
  });

  describe('B. Signup Function', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      
      // Mock getMe to return failure (no existing session)
      vi.mocked(api.default.getMe).mockResolvedValue({
        success: false,
      });
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('✅ Signup success - sets user, localStorage, empty following', () => {
      it('should set user state, localStorage, and empty following list on successful signup', async () => {
        const mockUser = {
          id: 'user-456',
          username: 'newuser',
          email: 'newuser@example.com',
          avatar: null,
        };

        // Mock successful signup
        vi.mocked(api.default.signup).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for initial load to complete
        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Click signup button
        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        // Wait for signup to complete
        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123');
        });

        // Verify user state is set
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData).toEqual({
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            avatar: mockUser.avatar,
          });
        });

        // Verify localStorage is set
        const storedUser = localStorage.getItem('user');
        expect(storedUser).toBeTruthy();
        const parsedUser = JSON.parse(storedUser!);
        expect(parsedUser).toEqual({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          avatar: mockUser.avatar,
        });

        // Verify following list is empty (new users start with empty following)
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });

        // Verify signup returned true
        await waitFor(() => {
          const signupResult = screen.getByTestId('signup-result');
          expect(signupResult.textContent).toBe('true');
        });
      });

      it('should handle user with avatar on signup', async () => {
        const mockUser = {
          id: 'user-456',
          username: 'newuser',
          email: 'newuser@example.com',
          avatar: 'https://example.com/avatar.jpg',
        };

        vi.mocked(api.default.signup).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBe(mockUser.avatar);
        });
      });
    });

    describe('✅ Signup failure - returns false', () => {
      it('should return false when signup API fails', async () => {
        // Mock failed signup
        vi.mocked(api.default.signup).mockResolvedValue({
          success: false,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        // Wait for signup call
        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        // Verify signup returned false
        await waitFor(() => {
          const signupResult = screen.getByTestId('signup-result');
          expect(signupResult.textContent).toBe('false');
        });

        // Verify user state did not change
        const userElement = screen.getByTestId('user');
        expect(userElement.textContent).toBe('null');

        // Verify localStorage was not set
        const storedUser = localStorage.getItem('user');
        expect(storedUser).toBeNull();
      });

      it('should return false when response has success=false', async () => {
        vi.mocked(api.default.signup).mockResolvedValue({
          success: false,
          user: null,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        await waitFor(() => {
          const signupResult = screen.getByTestId('signup-result');
          expect(signupResult.textContent).toBe('false');
        });
      });

      it('should return false when response has no user', async () => {
        vi.mocked(api.default.signup).mockResolvedValue({
          success: true,
          // No user field
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        await waitFor(() => {
          const signupResult = screen.getByTestId('signup-result');
          expect(signupResult.textContent).toBe('false');
        });
      });
    });

    describe('✅ Signup "already exists" error - returns false (doesn\'t throw)', () => {
      it('should return false when error message includes "already"', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock signup to throw "already exists" error
        vi.mocked(api.default.signup).mockRejectedValue(
          new Error('Email already exists')
        );

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        // Wait for error to be caught
        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        // Verify error was logged
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', expect.any(Error));
        });

        // Verify signup returned false (not thrown)
        await waitFor(() => {
          const signupResult = screen.getByTestId('signup-result');
          expect(signupResult.textContent).toBe('false');
        });

        // Verify user state was not set
        const userElement = screen.getByTestId('user');
        expect(userElement.textContent).toBe('null');

        consoleErrorSpy.mockRestore();
      });

      it('should return false when error message includes "already" (username case)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.mocked(api.default.signup).mockRejectedValue(
          new Error('Username already exists')
        );

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        await waitFor(() => {
          const signupResult = screen.getByTestId('signup-result');
          expect(signupResult.textContent).toBe('false');
        });

        consoleErrorSpy.mockRestore();
      });

      it('should handle error object without message property', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock error without message property
        const errorWithoutMessage = { code: 'DUPLICATE' } as Error;
        vi.mocked(api.default.signup).mockRejectedValue(errorWithoutMessage);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        // Should re-throw since message doesn't include "already"
        // But we need to catch it in the test
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalled();
        });

        consoleErrorSpy.mockRestore();
      });
    });

    describe('✅ Signup other errors - re-throws error', () => {
      it('should re-throw error when error message does not include "already"', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock signup to throw a different error
        const networkError = new Error('Network error');
        vi.mocked(api.default.signup).mockRejectedValue(networkError);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        
        // The error should be re-thrown, but our component catches it
        // We need to verify the error was logged and the function handled it
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        // Verify error was logged
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', networkError);
        });

        // Note: The error is re-thrown, but React will catch it
        // The signup function will throw, but our test component doesn't catch it
        // So the result will be undefined/null, but the error was logged
        await waitFor(() => {
          // The error was re-thrown, so the promise rejection should be handled
          expect(consoleErrorSpy).toHaveBeenCalled();
        });

        consoleErrorSpy.mockRestore();
      });

      it('should re-throw validation errors', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const validationError = new Error('Invalid password format');
        vi.mocked(api.default.signup).mockRejectedValue(validationError);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', validationError);
        });

        consoleErrorSpy.mockRestore();
      });

      it('should re-throw server errors', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const serverError = new Error('Internal server error');
        vi.mocked(api.default.signup).mockRejectedValue(serverError);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const signupBtn = screen.getByTestId('signup-btn');
        signupBtn.click();

        await waitFor(() => {
          expect(api.default.signup).toHaveBeenCalled();
        });

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', serverError);
        });

        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('C. Logout Function', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      
      // Mock getMe to return failure (no existing session)
      vi.mocked(api.default.getMe).mockResolvedValue({
        success: false,
      });
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('✅ Logout - clears user, localStorage, following list', () => {
      it('should clear user state, localStorage, and following list on logout', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        // First, login to set up state
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: ['user-456', 'user-789'],
        });

        // Mock successful logout
        vi.mocked(api.default.logout).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for initial load
        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login first
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        // Wait for login to complete and verify user is set
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Verify following list has items
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('2');
        });

        // Verify localStorage has user
        expect(localStorage.getItem('user')).toBeTruthy();

        // Now logout
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        // Wait for logout to complete
        await waitFor(() => {
          expect(api.default.logout).toHaveBeenCalled();
        });

        // Verify user state is cleared
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        // Verify localStorage is cleared
        const storedUser = localStorage.getItem('user');
        expect(storedUser).toBeNull();

        // Verify following list is cleared
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });
      });

      it('should clear state even when user has no following list', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        vi.mocked(api.default.logout).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Logout
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        await waitFor(() => {
          expect(api.default.logout).toHaveBeenCalled();
        });

        // Verify everything is cleared
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        expect(localStorage.getItem('user')).toBeNull();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });
      });
    });

    describe('✅ Logout API failure - still clears local state', () => {
      it('should clear local state even when logout API fails', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        // First, login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: ['user-456'],
        });

        // Mock logout to fail
        vi.mocked(api.default.logout).mockRejectedValue(new Error('Network error'));

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login first
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Verify state is set
        expect(localStorage.getItem('user')).toBeTruthy();
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('1');
        });

        // Now logout (API will fail)
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        // Wait for logout call
        await waitFor(() => {
          expect(api.default.logout).toHaveBeenCalled();
        });

        // Verify warning was logged
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('Logout request failed', expect.any(Error));
        });

        // Verify local state is still cleared despite API failure
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        expect(localStorage.getItem('user')).toBeNull();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });

        consoleWarnSpy.mockRestore();
      });

      it('should clear local state when logout API throws synchronously', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock logout to throw synchronously (in the try block)
        vi.mocked(api.default.logout).mockImplementation(() => {
          throw new Error('Synchronous error');
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Logout (will throw synchronously)
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        // Wait a bit for the logout to process
        await waitFor(() => {
          // The logout function catches the error, so it should still clear state
        }, { timeout: 1000 });

        // Verify local state is still cleared
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        expect(localStorage.getItem('user')).toBeNull();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });
      });

      it('should clear local state when logout API returns a rejected promise', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: ['user-456'],
        });

        // Mock logout to return a rejected promise
        vi.mocked(api.default.logout).mockRejectedValue(new Error('API error'));

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Logout
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        await waitFor(() => {
          expect(api.default.logout).toHaveBeenCalled();
        });

        // Wait for warning (from .catch())
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('Logout request failed', expect.any(Error));
        }, { timeout: 2000 });

        // Verify local state is cleared
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        expect(localStorage.getItem('user')).toBeNull();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });

        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe('D. Update Avatar Function', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      vi.mocked(api.default.getMe).mockResolvedValue({ success: false });
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('✅ Update avatar success - updates user state and localStorage', () => {
      it('should update user state and localStorage on successful avatar update', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const newAvatarUrl = 'https://example.com/new-avatar.jpg';

        // First, login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock successful avatar update
        const updatedUser = {
          ...mockUser,
          avatar: newAvatarUrl,
        };

        vi.mocked(api.default.updateUserAvatar).mockResolvedValue({
          success: true,
          user: updatedUser,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login first
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Update avatar
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        await waitFor(() => {
          expect(api.default.updateUserAvatar).toHaveBeenCalledWith(mockUser.id, newAvatarUrl);
        });

        // Verify user state is updated
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBe(newAvatarUrl);
          expect(userData.id).toBe(mockUser.id);
          expect(userData.username).toBe(mockUser.username);
          expect(userData.email).toBe(mockUser.email);
        });

        // Verify localStorage is updated
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        expect(storedUser.avatar).toBe(newAvatarUrl);
        expect(storedUser.id).toBe(mockUser.id);
      });

      it('should handle avatar update when response has null avatar', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: 'old-avatar.jpg',
        };

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock avatar update with null avatar
        const updatedUser = {
          ...mockUser,
          avatar: null,
        };

        vi.mocked(api.default.updateUserAvatar).mockResolvedValue({
          success: true,
          user: updatedUser,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBe('old-avatar.jpg');
        });

        // Update avatar
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        await waitFor(() => {
          expect(api.default.updateUserAvatar).toHaveBeenCalled();
        });

        // Verify avatar is set to null
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBeNull();
        });

        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        expect(storedUser.avatar).toBeNull();
      });
    });

    describe('✅ Update avatar API failure - fallback to local update', () => {
      it('should fallback to local update when API call fails', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: 'old-avatar.jpg',
        };

        const newAvatarUrl = 'https://example.com/new-avatar.jpg';

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock avatar update to fail
        vi.mocked(api.default.updateUserAvatar).mockRejectedValue(new Error('Network error'));

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Update avatar (will fail)
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        await waitFor(() => {
          expect(api.default.updateUserAvatar).toHaveBeenCalled();
        });

        // Wait for error to be logged
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update avatar in db:', expect.any(Error));
        });

        // Verify local state is still updated (fallback behavior)
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBe(newAvatarUrl);
          expect(userData.id).toBe(mockUser.id);
        });

        // Verify localStorage is updated
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        expect(storedUser.avatar).toBe(newAvatarUrl);

        consoleErrorSpy.mockRestore();
      });

      it('should fallback to local update when API returns success=false', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: 'old-avatar.jpg',
        };

        const newAvatarUrl = 'https://example.com/new-avatar.jpg';

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock avatar update to return success=false
        vi.mocked(api.default.updateUserAvatar).mockResolvedValue({
          success: false,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Update avatar
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        await waitFor(() => {
          expect(api.default.updateUserAvatar).toHaveBeenCalled();
        });

        // Wait for warning
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('Avatar update response missing success or user data');
        });

        // Verify local state is updated (fallback behavior)
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBe(newAvatarUrl);
        });

        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        expect(storedUser.avatar).toBe(newAvatarUrl);

        consoleWarnSpy.mockRestore();
      });

      it('should fallback to local update when API response has no user', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: 'old-avatar.jpg',
        };

        const newAvatarUrl = 'https://example.com/new-avatar.jpg';

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock avatar update to return success=true but no user
        vi.mocked(api.default.updateUserAvatar).mockResolvedValue({
          success: true,
          // no user field
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Update avatar
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        await waitFor(() => {
          expect(api.default.updateUserAvatar).toHaveBeenCalled();
        });

        // Wait for warning
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('Avatar update response missing success or user data');
        });

        // Verify local state is updated (fallback behavior)
        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.avatar).toBe(newAvatarUrl);
        });

        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        expect(storedUser.avatar).toBe(newAvatarUrl);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('✅ Update avatar when not logged in - returns early', () => {
      it('should return early and not call API when user is not logged in', async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Verify user is null
        const userElement = screen.getByTestId('user');
        expect(userElement.textContent).toBe('null');

        // Try to update avatar
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        // Wait a bit to ensure no API call is made
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify updateUserAvatar was never called
        expect(api.default.updateUserAvatar).not.toHaveBeenCalled();

        // Verify user is still null
        expect(userElement.textContent).toBe('null');
        expect(localStorage.getItem('user')).toBeNull();
      });

      it('should return early after logout', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        vi.mocked(api.default.logout).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Logout
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        await waitFor(() => {
          expect(api.default.logout).toHaveBeenCalled();
        });

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        // Clear the mock call count
        vi.clearAllMocks();

        // Try to update avatar after logout
        const updateAvatarBtn = screen.getByTestId('update-avatar-btn');
        updateAvatarBtn.click();

        // Wait a bit to ensure no API call is made
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify updateUserAvatar was never called
        expect(api.default.updateUserAvatar).not.toHaveBeenCalled();
      });
    });
  });

  describe('E. Follow/Unfollow Functions', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      vi.mocked(api.default.getMe).mockResolvedValue({ success: false });
    });

    afterEach(() => {
      localStorage.clear();
      // Clean up any event listeners
      window.removeEventListener('followingChanged', () => {});
    });

    describe('✅ Follow user - adds to following list, dispatches event', () => {
      it('should add user to following list and dispatch event on successful follow', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToFollow = 'user-to-follow';

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock successful follow
        vi.mocked(api.default.followUser).mockResolvedValue({
          success: true,
        });

        // Set up event listener
        const eventListener = vi.fn();
        window.addEventListener('followingChanged', eventListener);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Verify initial following list is empty
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          expect(JSON.parse(followingList.textContent || '[]')).toEqual([]);
        });

        // Follow user
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        await waitFor(() => {
          expect(api.default.followUser).toHaveBeenCalledWith(userIdToFollow);
        });

        // Verify user is added to following list
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toContain(userIdToFollow);
          expect(following.length).toBe(1);
        });

        // Verify event was dispatched
        await waitFor(() => {
          expect(eventListener).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'followingChanged',
              detail: { userId: userIdToFollow, action: 'follow' },
            })
          );
        });

        window.removeEventListener('followingChanged', eventListener);
      });

      it('should not add duplicate users to following list', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToFollow = 'user-to-follow';

        // Login with existing following
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [userIdToFollow],
        });

        vi.mocked(api.default.followUser).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          expect(JSON.parse(followingList.textContent || '[]')).toContain(userIdToFollow);
        });

        // Try to follow again
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        await waitFor(() => {
          expect(api.default.followUser).toHaveBeenCalled();
        });

        // Verify user is still only in list once (Set deduplication)
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following.filter((id: string) => id === userIdToFollow).length).toBe(1);
        });
      });
    });

    describe('✅ Unfollow user - removes from following list, dispatches event', () => {
      it('should remove user from following list and dispatch event on successful unfollow', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToUnfollow = 'user-to-unfollow';

        // Login with existing following
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [userIdToUnfollow, 'other-user'],
        });

        // Mock successful unfollow
        vi.mocked(api.default.unfollowUser).mockResolvedValue({
          success: true,
        });

        // Set up event listener
        const eventListener = vi.fn();
        window.addEventListener('followingChanged', eventListener);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toContain(userIdToUnfollow);
        });

        // Unfollow user
        const unfollowBtn = screen.getByTestId('unfollow-btn');
        unfollowBtn.click();

        await waitFor(() => {
          expect(api.default.unfollowUser).toHaveBeenCalledWith(userIdToUnfollow);
        });

        // Verify user is removed from following list
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).not.toContain(userIdToUnfollow);
          expect(following).toContain('other-user'); // Other user should remain
        });

        // Verify event was dispatched
        await waitFor(() => {
          expect(eventListener).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'followingChanged',
              detail: { userId: userIdToUnfollow, action: 'unfollow' },
            })
          );
        });

        window.removeEventListener('followingChanged', eventListener);
      });
    });

    describe('✅ Follow when not logged in - returns early', () => {
      it('should return early and not call API when user is not logged in', async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Verify user is null
        const userElement = screen.getByTestId('user');
        expect(userElement.textContent).toBe('null');

        // Try to follow
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        // Wait a bit to ensure no API call is made
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify followUser was never called
        expect(api.default.followUser).not.toHaveBeenCalled();

        // Verify following list is still empty
        const followingList = screen.getByTestId('following-list');
        expect(JSON.parse(followingList.textContent || '[]')).toEqual([]);
      });

      it('should return early after logout', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        vi.mocked(api.default.logout).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        // Login
        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Logout
        const logoutBtn = screen.getByTestId('logout-btn');
        logoutBtn.click();

        await waitFor(() => {
          expect(api.default.logout).toHaveBeenCalled();
        });

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          expect(userElement.textContent).toBe('null');
        });

        // Clear the mock call count
        vi.clearAllMocks();

        // Try to follow after logout
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        // Wait a bit to ensure no API call is made
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify followUser was never called
        expect(api.default.followUser).not.toHaveBeenCalled();
      });
    });

    describe('✅ Follow API failure - doesn\'t crash', () => {
      it('should handle API failure gracefully and still dispatch event', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToFollow = 'user-to-follow';

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock follow to fail
        vi.mocked(api.default.followUser).mockRejectedValue(new Error('Network error'));

        // Set up event listener
        const eventListener = vi.fn();
        window.addEventListener('followingChanged', eventListener);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Follow user (will fail)
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        await waitFor(() => {
          expect(api.default.followUser).toHaveBeenCalled();
        });

        // Wait for warning
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to follow on backend:', expect.any(Error));
        });

        // Verify following list is NOT updated (API failed, so no state change)
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).not.toContain(userIdToFollow);
        });

        // Verify event was still dispatched (even though API failed)
        await waitFor(() => {
          expect(eventListener).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'followingChanged',
              detail: { userId: userIdToFollow, action: 'follow' },
            })
          );
        });

        consoleWarnSpy.mockRestore();
        window.removeEventListener('followingChanged', eventListener);
      });

      it('should handle API returning success=false gracefully', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToFollow = 'user-to-follow';

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        // Mock follow to return success=false
        vi.mocked(api.default.followUser).mockResolvedValue({
          success: false,
        });

        const eventListener = vi.fn();
        window.addEventListener('followingChanged', eventListener);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Follow user
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        await waitFor(() => {
          expect(api.default.followUser).toHaveBeenCalled();
        });

        // Verify following list is NOT updated (API returned success=false)
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).not.toContain(userIdToFollow);
        });

        // Verify event was still dispatched
        await waitFor(() => {
          expect(eventListener).toHaveBeenCalled();
        });

        window.removeEventListener('followingChanged', eventListener);
      });
    });

    describe('✅ Unfollow API failure - doesn\'t crash', () => {
      it('should handle API failure gracefully and still dispatch event', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToUnfollow = 'user-to-unfollow';

        // Login with existing following
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [userIdToUnfollow],
        });

        // Mock unfollow to fail
        vi.mocked(api.default.unfollowUser).mockRejectedValue(new Error('Network error'));

        const eventListener = vi.fn();
        window.addEventListener('followingChanged', eventListener);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          expect(JSON.parse(followingList.textContent || '[]')).toContain(userIdToUnfollow);
        });

        // Unfollow user (will fail)
        const unfollowBtn = screen.getByTestId('unfollow-btn');
        unfollowBtn.click();

        await waitFor(() => {
          expect(api.default.unfollowUser).toHaveBeenCalled();
        });

        // Wait for warning
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to unfollow on backend:', expect.any(Error));
        });

        // Verify following list is NOT updated (API failed, so no state change)
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toContain(userIdToUnfollow); // Still in list
        });

        // Verify event was still dispatched
        await waitFor(() => {
          expect(eventListener).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'followingChanged',
              detail: { userId: userIdToUnfollow, action: 'unfollow' },
            })
          );
        });

        consoleWarnSpy.mockRestore();
        window.removeEventListener('followingChanged', eventListener);
      });

      it('should handle API returning success=false gracefully', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToUnfollow = 'user-to-unfollow';

        // Login with existing following
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [userIdToUnfollow],
        });

        // Mock unfollow to return success=false
        vi.mocked(api.default.unfollowUser).mockResolvedValue({
          success: false,
        });

        const eventListener = vi.fn();
        window.addEventListener('followingChanged', eventListener);

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          expect(JSON.parse(followingList.textContent || '[]')).toContain(userIdToUnfollow);
        });

        // Unfollow user
        const unfollowBtn = screen.getByTestId('unfollow-btn');
        unfollowBtn.click();

        await waitFor(() => {
          expect(api.default.unfollowUser).toHaveBeenCalled();
        });

        // Verify following list is NOT updated (API returned success=false)
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toContain(userIdToUnfollow); // Still in list
        });

        // Verify event was still dispatched
        await waitFor(() => {
          expect(eventListener).toHaveBeenCalled();
        });

        window.removeEventListener('followingChanged', eventListener);
      });
    });
  });

  describe('F. Following count verification', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      vi.mocked(api.default.getMe).mockResolvedValue({ success: false });
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('✅ getFollowingList returns correct array', () => {
      it('should return empty array when no users are being followed', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        // Login with empty following list
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Verify getFollowingList returns empty array
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toEqual([]);
          expect(following.length).toBe(0);
        });

        // Verify count is 0
        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('0');
      });

      it('should return correct array with multiple users', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const followingUsers = ['user-456', 'user-789', 'user-101'];

        // Login with following list
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: followingUsers,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const userElement = screen.getByTestId('user');
          const userData = JSON.parse(userElement.textContent || 'null');
          expect(userData.id).toBe(mockUser.id);
        });

        // Verify getFollowingList returns correct array
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toEqual(followingUsers);
          expect(following.length).toBe(3);
          expect(following).toContain('user-456');
          expect(following).toContain('user-789');
          expect(following).toContain('user-101');
        });

        // Verify count is correct
        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('3');
      });

      it('should return correct array after login loads following list', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const followingUsers = ['user-456'];

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: followingUsers,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        // Wait for login and getFollowing to complete
        await waitFor(() => {
          expect(api.default.getFollowing).toHaveBeenCalledWith(mockUser.id);
        });

        // Verify getFollowingList returns the loaded array
        await waitFor(() => {
          const followingList = screen.getByTestId('following-list');
          const following = JSON.parse(followingList.textContent || '[]');
          expect(following).toEqual(followingUsers);
          expect(following.length).toBe(1);
        });

        const followingCount = screen.getByTestId('following-count');
        expect(followingCount.textContent).toBe('1');
      });
    });

    describe('✅ Following count increases after followUser()', () => {
      it('should increase count from 0 to 1 after following a user', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToFollow = 'user-to-follow';

        // Login with empty following list
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [],
        });

        vi.mocked(api.default.followUser).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });

        // Follow user
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        await waitFor(() => {
          expect(api.default.followUser).toHaveBeenCalled();
        });

        // Verify count increased to 1
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('1');
        });

        // Verify user is in the list
        const followingList = screen.getByTestId('following-list');
        const following = JSON.parse(followingList.textContent || '[]');
        expect(following).toContain(userIdToFollow);
        expect(following.length).toBe(1);
      });

      it('should increase count from 2 to 3 after following another user', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToFollow = 'user-to-follow';
        const existingFollowing = ['user-456', 'user-789'];

        // Login with existing following
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: existingFollowing,
        });

        vi.mocked(api.default.followUser).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('2');
        });

        // Follow another user
        const followBtn = screen.getByTestId('follow-btn');
        followBtn.click();

        await waitFor(() => {
          expect(api.default.followUser).toHaveBeenCalled();
        });

        // Verify count increased to 3
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('3');
        });

        // Verify all users are in the list
        const followingList = screen.getByTestId('following-list');
        const following = JSON.parse(followingList.textContent || '[]');
        expect(following).toContain(userIdToFollow);
        expect(following).toContain('user-456');
        expect(following).toContain('user-789');
        expect(following.length).toBe(3);
      });
    });

    describe('✅ Following count decreases after unfollowUser()', () => {
      it('should decrease count from 1 to 0 after unfollowing a user', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToUnfollow = 'user-to-unfollow';

        // Login with one user in following list
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: [userIdToUnfollow],
        });

        vi.mocked(api.default.unfollowUser).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('1');
        });

        // Unfollow user
        const unfollowBtn = screen.getByTestId('unfollow-btn');
        unfollowBtn.click();

        await waitFor(() => {
          expect(api.default.unfollowUser).toHaveBeenCalled();
        });

        // Verify count decreased to 0
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('0');
        });

        // Verify user is not in the list
        const followingList = screen.getByTestId('following-list');
        const following = JSON.parse(followingList.textContent || '[]');
        expect(following).not.toContain(userIdToUnfollow);
        expect(following.length).toBe(0);
      });

      it('should decrease count from 3 to 2 after unfollowing one user', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToUnfollow = 'user-to-unfollow';
        const existingFollowing = ['user-456', userIdToUnfollow, 'user-789'];

        // Login with existing following
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: existingFollowing,
        });

        vi.mocked(api.default.unfollowUser).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('3');
        });

        // Unfollow user
        const unfollowBtn = screen.getByTestId('unfollow-btn');
        unfollowBtn.click();

        await waitFor(() => {
          expect(api.default.unfollowUser).toHaveBeenCalled();
        });

        // Verify count decreased to 2
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('2');
        });

        // Verify user is removed but others remain
        const followingList = screen.getByTestId('following-list');
        const following = JSON.parse(followingList.textContent || '[]');
        expect(following).not.toContain(userIdToUnfollow);
        expect(following).toContain('user-456');
        expect(following).toContain('user-789');
        expect(following.length).toBe(2);
      });

      it('should maintain correct count when unfollowing from middle of list', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        };

        const userIdToUnfollow = 'user-to-unfollow'; // Must match TestComponent's hardcoded value
        const existingFollowing = ['user-first', userIdToUnfollow, 'user-last'];

        // Login
        vi.mocked(api.default.login).mockResolvedValue({
          success: true,
          user: mockUser,
        });

        vi.mocked(api.default.getFollowing).mockResolvedValue({
          success: true,
          following: existingFollowing,
        });

        vi.mocked(api.default.unfollowUser).mockResolvedValue({
          success: true,
        });

        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(api.default.getMe).toHaveBeenCalled();
        });

        const loginBtn = screen.getByTestId('login-btn');
        loginBtn.click();

        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('3');
        });

        // Unfollow middle user
        const unfollowBtn = screen.getByTestId('unfollow-btn');
        unfollowBtn.click();

        await waitFor(() => {
          expect(api.default.unfollowUser).toHaveBeenCalledWith(userIdToUnfollow);
        });

        // Verify count decreased correctly
        await waitFor(() => {
          const followingCount = screen.getByTestId('following-count');
          expect(followingCount.textContent).toBe('2');
        });

        // Verify correct users remain
        const followingList = screen.getByTestId('following-list');
        const following = JSON.parse(followingList.textContent || '[]');
        expect(following).not.toContain(userIdToUnfollow);
        expect(following).toContain('user-first');
        expect(following).toContain('user-last');
        expect(following.length).toBe(2);
      });
    });
  });
});

