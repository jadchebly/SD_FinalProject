/**
 * Profile Component Tests
 * Tests for followers/following modals functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../Profile';
import { AuthProvider } from '../../contexts/AuthContext';
import * as api from '../../services/api';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: true,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    io: {
      engine: {
        transport: {
          name: 'websocket',
        },
      },
    },
  };
  
  return {
    default: {
      io: vi.fn(() => mockSocket),
    },
    io: vi.fn(() => mockSocket),
  };
});

// Mock the socket service
vi.mock('../../services/socket', () => {
  return {
    getSocket: vi.fn(() => ({
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    })),
  };
});

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getUserProfile: vi.fn(),
    getUserPosts: vi.fn(),
    getFollowers: vi.fn(),
    getUserFollowing: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getMe: vi.fn(),
    setAuthHeaderProvider: vi.fn(),
    setCurrentUserProvider: vi.fn(),
    getFollowing: vi.fn(),
  },
}));

// Mock window.scrollTo
global.window.scrollTo = vi.fn();

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  avatar: null,
};

// Mock AuthContext
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      logout: vi.fn(),
      updateAvatar: vi.fn(),
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
      getFollowingList: () => [],
    }),
  };
});

// Mock useParams to return no paramId (own profile)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({}), // No paramId means own profile
    useNavigate: () => vi.fn(),
  };
});

const renderProfile = async (profileOverrides?: {
  followerCount?: number;
  followingCount?: number;
}) => {
  // Mock getMe to prevent AuthProvider from trying to fetch user on mount
  vi.mocked(api.default.getMe).mockResolvedValue({ 
    success: true,
    user: mockUser,
  });

  // Mock getUserProfile to return profile info (use overrides if provided)
  vi.mocked(api.default.getUserProfile).mockResolvedValue({
    success: true,
    user: {
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      avatar_url: null,
      followerCount: profileOverrides?.followerCount ?? 5,
      followingCount: profileOverrides?.followingCount ?? 3,
    },
  });

  // Mock getUserPosts to return empty array
  vi.mocked(api.default.getUserPosts).mockResolvedValue({
    success: true,
    posts: [],
  });

  return render(
    <BrowserRouter>
      <AuthProvider>
        <Profile />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Profile Component - D. Followers/Following modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ Click followers count opens modal', () => {
    it('should open followers modal when followers count is clicked', async () => {
      const user = userEvent.setup();
      
      await renderProfile();

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText(/5 followers/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click on followers count
      const followersCount = screen.getByText(/5 followers/i);
      await user.click(followersCount);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Followers')).toBeInTheDocument();
        expect(document.querySelector('.post-modal-overlay')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify API was called
      expect(api.default.getFollowers).toHaveBeenCalledWith(mockUser.id);
    });

    it('should not open modal when followers count is 0', async () => {
      const user = userEvent.setup();
      
      // Render with 0 followers
      await renderProfile({ followerCount: 0, followingCount: 3 });

      // Wait for profile to load - check for 0 followers text
      await waitFor(() => {
        const followersText = screen.getByText(/0 followers/i);
        expect(followersText).toBeInTheDocument();
      }, { timeout: 5000 });

      // Find the followers count element
      const followersCount = screen.getByText(/0 followers/i);
      
      await user.click(followersCount);

      // Wait a bit to ensure modal doesn't open
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(screen.queryByText('Followers')).not.toBeInTheDocument();
      expect(api.default.getFollowers).not.toHaveBeenCalled();
    });
  });

  describe('✅ Click following count opens modal', () => {
    it('should open following modal when following count is clicked', async () => {
      const user = userEvent.setup();
      
      await renderProfile();

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText(/3 following/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click on following count
      const followingCount = screen.getByText(/3 following/i);
      await user.click(followingCount);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Following')).toBeInTheDocument();
        expect(document.querySelector('.post-modal-overlay')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify API was called
      expect(api.default.getUserFollowing).toHaveBeenCalledWith(mockUser.id);
    });

    it('should not open modal when following count is 0', async () => {
      const user = userEvent.setup();
      
      // Render with 0 following
      await renderProfile({ followerCount: 5, followingCount: 0 });

      // Wait for profile to load - check for 0 following text
      await waitFor(() => {
        const followingText = screen.getByText(/0 following/i);
        expect(followingText).toBeInTheDocument();
      }, { timeout: 5000 });

      // Find the following count element
      const followingCount = screen.getByText(/0 following/i);
      
      await user.click(followingCount);

      // Wait a bit to ensure modal doesn't open
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(screen.queryByText('Following')).not.toBeInTheDocument();
      expect(api.default.getUserFollowing).not.toHaveBeenCalled();
    });
  });

  describe('✅ Modal shows list of users', () => {
    it('should display list of followers in followers modal', async () => {
      const user = userEvent.setup();
      
      const mockFollowers = [
        {
          id: 'follower-1',
          username: 'follower1',
          email: 'follower1@example.com',
          avatar_url: null,
          isFollowing: false,
        },
        {
          id: 'follower-2',
          username: 'follower2',
          email: 'follower2@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
          isFollowing: true,
        },
      ];

      vi.mocked(api.default.getFollowers).mockResolvedValue({
        success: true,
        users: mockFollowers,
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/5 followers/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followersCount = screen.getByText(/5 followers/i);
      await user.click(followersCount);

      // Wait for modal to open and users to load
      await waitFor(() => {
        expect(screen.getByText('follower1')).toBeInTheDocument();
        expect(screen.getByText('follower2')).toBeInTheDocument();
        expect(screen.getByText('follower1@example.com')).toBeInTheDocument();
        expect(screen.getByText('follower2@example.com')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should display list of following users in following modal', async () => {
      const user = userEvent.setup();
      
      const mockFollowing = [
        {
          id: 'following-1',
          username: 'following1',
          email: 'following1@example.com',
          avatar_url: null,
          isFollowing: true,
        },
        {
          id: 'following-2',
          username: 'following2',
          email: 'following2@example.com',
          avatar_url: 'https://example.com/avatar2.jpg',
          isFollowing: true,
        },
      ];

      vi.mocked(api.default.getUserFollowing).mockResolvedValue({
        success: true,
        users: mockFollowing,
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/3 following/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingCount = screen.getByText(/3 following/i);
      await user.click(followingCount);

      // Wait for modal to open and users to load
      await waitFor(() => {
        expect(screen.getByText('following1')).toBeInTheDocument();
        expect(screen.getByText('following2')).toBeInTheDocument();
        expect(screen.getByText('following1@example.com')).toBeInTheDocument();
        expect(screen.getByText('following2@example.com')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show empty state when no followers', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.getFollowers).mockResolvedValue({
        success: true,
        users: [],
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/5 followers/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followersCount = screen.getByText(/5 followers/i);
      await user.click(followersCount);

      await waitFor(() => {
        expect(screen.getByText('No followers yet')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state when not following anyone', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.getUserFollowing).mockResolvedValue({
        success: true,
        users: [],
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/3 following/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingCount = screen.getByText(/3 following/i);
      await user.click(followingCount);

      await waitFor(() => {
        expect(screen.getByText('Not following anyone yet')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ Follow/unfollow in modal updates counts', () => {
    it('should update follow status when follow button is clicked in followers modal', async () => {
      const user = userEvent.setup();
      
      const mockFollowers = [
        {
          id: 'follower-1',
          username: 'follower1',
          email: 'follower1@example.com',
          avatar_url: null,
          isFollowing: false,
        },
      ];

      vi.mocked(api.default.getFollowers).mockResolvedValue({
        success: true,
        users: mockFollowers,
      });

      vi.mocked(api.default.followUser).mockResolvedValue({
        success: true,
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/5 followers/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followersCount = screen.getByText(/5 followers/i);
      await user.click(followersCount);

      await waitFor(() => {
        expect(screen.getByText('follower1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find and click the Follow button
      const followButton = screen.getByRole('button', { name: /^follow$/i });
      await user.click(followButton);

      // Verify API was called
      await waitFor(() => {
        expect(api.default.followUser).toHaveBeenCalledWith('follower-1');
      }, { timeout: 3000 });

      // Verify button text changes to "Following"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^following$/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should update follow status when unfollow button is clicked in following modal', async () => {
      const user = userEvent.setup();
      
      const mockFollowing = [
        {
          id: 'following-1',
          username: 'following1',
          email: 'following1@example.com',
          avatar_url: null,
          isFollowing: true,
        },
      ];

      vi.mocked(api.default.getUserFollowing).mockResolvedValue({
        success: true,
        users: mockFollowing,
      });

      vi.mocked(api.default.unfollowUser).mockResolvedValue({
        success: true,
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/3 following/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingCount = screen.getByText(/3 following/i);
      await user.click(followingCount);

      await waitFor(() => {
        expect(screen.getByText('following1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find and click the Following button (to unfollow)
      const followingButton = screen.getByRole('button', { name: /^following$/i });
      await user.click(followingButton);

      // Verify API was called
      await waitFor(() => {
        expect(api.default.unfollowUser).toHaveBeenCalledWith('following-1');
      }, { timeout: 3000 });

      // Verify button text changes to "Follow"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^follow$/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ Modal close reloads profile info', () => {
    it('should reload profile info when followers modal is closed', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.getFollowers).mockResolvedValue({
        success: true,
        users: [],
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/5 followers/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followersCount = screen.getByText(/5 followers/i);
      await user.click(followersCount);

      await waitFor(() => {
        expect(screen.getByText('Followers')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Clear previous calls
      vi.mocked(api.default.getUserProfile).mockClear();

      // Close modal by clicking overlay
      const overlay = document.querySelector('.post-modal-overlay');
      expect(overlay).toBeInTheDocument();
      
      if (overlay) {
        await user.click(overlay);
      }

      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByText('Followers')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify profile info was reloaded
      await waitFor(() => {
        expect(api.default.getUserProfile).toHaveBeenCalledWith(mockUser.id);
      }, { timeout: 3000 });
    });

    it('should reload profile info when following modal is closed', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.getUserFollowing).mockResolvedValue({
        success: true,
        users: [],
      });

      await renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/3 following/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingCount = screen.getByText(/3 following/i);
      await user.click(followingCount);

      await waitFor(() => {
        expect(screen.getByText('Following')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Clear previous calls
      vi.mocked(api.default.getUserProfile).mockClear();

      // Close modal by clicking overlay
      const overlay = document.querySelector('.post-modal-overlay');
      expect(overlay).toBeInTheDocument();
      
      if (overlay) {
        await user.click(overlay);
      }

      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByText('Following')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify profile info was reloaded
      await waitFor(() => {
        expect(api.default.getUserProfile).toHaveBeenCalledWith(mockUser.id);
      }, { timeout: 3000 });
    });
  });
});

