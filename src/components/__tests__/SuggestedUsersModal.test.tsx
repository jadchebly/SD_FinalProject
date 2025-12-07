/**
 * SuggestedUsersModal Component Tests
 * Tests for modal display functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuggestedUsersModal from '../SuggestedUsersModal';
import * as api from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getSuggestedUsers: vi.fn(),
    setAuthHeaderProvider: vi.fn(),
    setCurrentUserProvider: vi.fn(),
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

const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();
const mockGetFollowingList = vi.fn(() => []);

// Mock AuthContext
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      getFollowingList: mockGetFollowingList,
      followUser: mockFollowUser,
      unfollowUser: mockUnfollowUser,
    }),
  };
});

const mockOnClose = vi.fn();

const renderSuggestedUsersModal = (isOpen: boolean = true) => {
  return render(
    <SuggestedUsersModal isOpen={isOpen} onClose={mockOnClose} />
  );
};

describe('SuggestedUsersModal Component - A. Modal display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose.mockClear();
    mockFollowUser.mockClear();
    mockUnfollowUser.mockClear();
    mockGetFollowingList.mockReturnValue([]);
    vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
      success: true,
      users: [],
    });
  });

  describe('✅ Modal opens when isOpen=true', () => {
    it('should render modal when isOpen is true', async () => {
      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('Suggested People to Follow')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(document.querySelector('.suggested-users-overlay')).toBeInTheDocument();
      expect(document.querySelector('.suggested-users-modal')).toBeInTheDocument();
    });

    it('should show modal header when open', async () => {
      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('Suggested People to Follow')).toBeInTheDocument();
        expect(screen.getByText('Discover and connect with other users')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show close button when open', async () => {
      renderSuggestedUsersModal(true);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i });
        expect(closeButton).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ Modal closes when isOpen=false', () => {
    it('should not render modal when isOpen is false', () => {
      renderSuggestedUsersModal(false);

      expect(screen.queryByText('Suggested People to Follow')).not.toBeInTheDocument();
      expect(document.querySelector('.suggested-users-overlay')).not.toBeInTheDocument();
      expect(document.querySelector('.suggested-users-modal')).not.toBeInTheDocument();
    });

    it('should return null when isOpen is false', () => {
      const { container } = renderSuggestedUsersModal(false);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('✅ Shows list of suggested users', () => {
    it('should display list of suggested users when API returns users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          avatar: null,
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(document.querySelectorAll('.suggested-user-item').length).toBe(2);
    });

    it('should call getSuggestedUsers API when modal opens', async () => {
      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(api.default.getSuggestedUsers).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should display multiple users in the list', async () => {
      const mockUsers = [
        { id: 'user-1', username: 'alice', email: 'alice@example.com', avatar: null },
        { id: 'user-2', username: 'bob', email: 'bob@example.com', avatar: null },
        { id: 'user-3', username: 'charlie', email: 'charlie@example.com', avatar: null },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
        expect(screen.getByText('charlie')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(document.querySelectorAll('.suggested-user-item').length).toBe(3);
    });
  });

  describe('✅ Shows username, email, avatar', () => {
    it('should display username for each suggested user', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'johndoe',
          email: 'john@example.com',
          avatar: null,
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display email for each suggested user', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'johndoe',
          email: 'john@example.com',
          avatar: null,
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display custom avatar image when avatar is provided', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'johndoe',
          email: 'john@example.com',
          avatar: 'https://example.com/avatar.jpg',
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        const avatarImg = document.querySelector('.suggested-user-avatar-img') as HTMLImageElement;
        expect(avatarImg).toBeInTheDocument();
        expect(avatarImg.src).toBe('https://example.com/avatar.jpg');
        expect(avatarImg.alt).toBe('johndoe');
      }, { timeout: 3000 });
    });

    it('should display default icon when avatar is not provided', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'johndoe',
          email: 'john@example.com',
          avatar: null,
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check that default icon is shown (no img with custom avatar)
      const avatarImg = document.querySelector('.suggested-user-avatar-img');
      expect(avatarImg).not.toBeInTheDocument();
    });

    it('should display default icon when avatar is "default"', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'johndoe',
          email: 'john@example.com',
          avatar: 'default',
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check that default icon is shown (no img with custom avatar)
      const avatarImg = document.querySelector('.suggested-user-avatar-img');
      expect(avatarImg).not.toBeInTheDocument();
    });

    it('should display all user information (username, email, avatar) together', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'johndoe',
          email: 'john@example.com',
          avatar: 'https://example.com/avatar.jpg',
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        const avatarImg = document.querySelector('.suggested-user-avatar-img') as HTMLImageElement;
        expect(avatarImg).toBeInTheDocument();
        expect(avatarImg.src).toBe('https://example.com/avatar.jpg');
      }, { timeout: 3000 });
    });
  });

  describe('✅ Empty state shows "No suggestions"', () => {
    it('should show empty state message when no users are returned', async () => {
      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: [],
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('No suggestions available at the moment.')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state when API returns empty array', async () => {
      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: [],
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('No suggestions available at the moment.')).toBeInTheDocument();
        expect(document.querySelectorAll('.suggested-user-item').length).toBe(0);
      }, { timeout: 3000 });
    });

    it('should show empty state when API returns success but no users field', async () => {
      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('No suggestions available at the moment.')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state when API call fails', async () => {
      vi.mocked(api.default.getSuggestedUsers).mockRejectedValue(new Error('API Error'));

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('No suggestions available at the moment.')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});

describe('SuggestedUsersModal Component - B. Follow functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose.mockClear();
    mockFollowUser.mockClear();
    mockUnfollowUser.mockClear();
    mockGetFollowingList.mockReturnValue([]);
    vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
      success: true,
      users: [],
    });
  });

  describe('✅ Follow button on suggested user', () => {
    it('should display Follow button for each suggested user', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followButtons = screen.getAllByRole('button', { name: /^follow$/i });
      expect(followButtons.length).toBeGreaterThan(0);
    });

    it('should display Follow button for users not in following list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockGetFollowingList.mockReturnValue([]); // User is not following anyone

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followButton = screen.getByRole('button', { name: /^follow$/i });
      expect(followButton).toBeInTheDocument();
      expect(followButton.textContent).toBe('Follow');
    });
  });

  describe('✅ Follow adds user to following list', () => {
    it('should call followUser when Follow button is clicked', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followButton = screen.getByRole('button', { name: /^follow$/i });
      await user.click(followButton);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalledWith('user-1');
      }, { timeout: 3000 });
    });

    it('should call followUser with correct user ID', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-123',
          username: 'alice',
          email: 'alice@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followButton = screen.getByRole('button', { name: /^follow$/i });
      await user.click(followButton);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalledWith('user-123');
      }, { timeout: 3000 });
    });
  });

  describe('✅ Follow button changes to "Following"', () => {
    it('should change button text to "Following" after follow', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followButton = screen.getByRole('button', { name: /^follow$/i });
      expect(followButton.textContent).toBe('Follow');

      await user.click(followButton);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalled();
      }, { timeout: 3000 });

      // After follow, button should change to "Following"
      await waitFor(() => {
        const followingButton = screen.getByRole('button', { name: /^following$/i });
        expect(followingButton).toBeInTheDocument();
        expect(followingButton.textContent).toBe('Following');
      }, { timeout: 3000 });
    });

    it('should show "Following" button for users already in following list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      // User is already following user-1
      mockGetFollowingList.mockReturnValue(['user-1']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingButton = screen.getByRole('button', { name: /^following$/i });
      expect(followingButton).toBeInTheDocument();
      expect(followingButton.textContent).toBe('Following');
    });
  });

  describe('✅ Follow updates following Set state', () => {
    it('should update following state after follow action', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially should show "Follow"
      expect(screen.getByRole('button', { name: /^follow$/i })).toBeInTheDocument();

      const followButton = screen.getByRole('button', { name: /^follow$/i });
      await user.click(followButton);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalled();
      }, { timeout: 3000 });

      // After clicking, button should change to "Following"
      await waitFor(() => {
        const followingButton = screen.getByRole('button', { name: /^following$/i });
        expect(followingButton).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle multiple follows correctly', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followButtons = screen.getAllByRole('button', { name: /^follow$/i });
      expect(followButtons.length).toBe(2);

      // Follow first user
      await user.click(followButtons[0]);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalledWith('user-1');
      }, { timeout: 3000 });

      // First button should change to "Following"
      await waitFor(() => {
        const followingButtons = screen.getAllByRole('button', { name: /^following$/i });
        expect(followingButtons.length).toBe(1);
      }, { timeout: 3000 });
    });
  });

  describe('✅ Unfollow removes from following list', () => {
    it('should call unfollowUser when Following button is clicked', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockUnfollowUser.mockResolvedValue(undefined);
      // User is already following user-1
      mockGetFollowingList.mockReturnValue(['user-1']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingButton = screen.getByRole('button', { name: /^following$/i });
      await user.click(followingButton);

      await waitFor(() => {
        expect(mockUnfollowUser).toHaveBeenCalledWith('user-1');
      }, { timeout: 3000 });
    });

    it('should change button back to "Follow" after unfollow', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockUnfollowUser.mockResolvedValue(undefined);
      // User is already following user-1
      mockGetFollowingList.mockReturnValue(['user-1']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially should show "Following"
      const followingButton = screen.getByRole('button', { name: /^following$/i });
      expect(followingButton.textContent).toBe('Following');

      await user.click(followingButton);

      await waitFor(() => {
        expect(mockUnfollowUser).toHaveBeenCalled();
      }, { timeout: 3000 });

      // After unfollow, button should change back to "Follow"
      await waitFor(() => {
        const followButton = screen.getByRole('button', { name: /^follow$/i });
        expect(followButton).toBeInTheDocument();
        expect(followButton.textContent).toBe('Follow');
      }, { timeout: 3000 });
    });

    it('should call unfollowUser with correct user ID', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-456',
          username: 'bob',
          email: 'bob@example.com',
          avatar: null,
        },
      ];

      mockUnfollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue(['user-456']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('bob')).toBeInTheDocument();
      }, { timeout: 3000 });

      const followingButton = screen.getByRole('button', { name: /^following$/i });
      await user.click(followingButton);

      await waitFor(() => {
        expect(mockUnfollowUser).toHaveBeenCalledWith('user-456');
      }, { timeout: 3000 });
    });
  });
});

describe('SuggestedUsersModal Component - C. Following count verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose.mockClear();
    mockFollowUser.mockClear();
    mockUnfollowUser.mockClear();
    mockGetFollowingList.mockReturnValue([]);
    vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
      success: true,
      users: [],
    });
  });

  describe('✅ Following count increases after follow', () => {
    it('should call getFollowingList when modal opens', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(mockGetFollowingList).toHaveBeenCalled();
    });

    it('should update following state after follow action', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially not following
      expect(screen.getByRole('button', { name: /^follow$/i })).toBeInTheDocument();

      const followButton = screen.getByRole('button', { name: /^follow$/i });
      await user.click(followButton);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalled();
      }, { timeout: 3000 });

      // After follow, button should change to "Following" indicating user is in following list
      await waitFor(() => {
        const followingButton = screen.getByRole('button', { name: /^following$/i });
        expect(followingButton).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should reflect increased following count in button state', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          avatar: null,
        },
      ];

      mockFollowUser.mockResolvedValue(undefined);
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially both should show "Follow"
      const followButtons = screen.getAllByRole('button', { name: /^follow$/i });
      expect(followButtons.length).toBe(2);

      // Follow first user
      await user.click(followButtons[0]);

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalledWith('user-1');
      }, { timeout: 3000 });

      // After follow, one button should be "Following"
      await waitFor(() => {
        const followingButtons = screen.getAllByRole('button', { name: /^following$/i });
        expect(followingButtons.length).toBe(1);
        const followButtonsAfter = screen.getAllByRole('button', { name: /^follow$/i });
        expect(followButtonsAfter.length).toBe(1);
      }, { timeout: 3000 });
    });
  });

  describe('✅ Following count decreases after unfollow', () => {
    it('should update following state after unfollow action', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      mockUnfollowUser.mockResolvedValue(undefined);
      // User is already following user-1
      mockGetFollowingList.mockReturnValue(['user-1']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially following
      expect(screen.getByRole('button', { name: /^following$/i })).toBeInTheDocument();

      const followingButton = screen.getByRole('button', { name: /^following$/i });
      await user.click(followingButton);

      await waitFor(() => {
        expect(mockUnfollowUser).toHaveBeenCalled();
      }, { timeout: 3000 });

      // After unfollow, button should change to "Follow" indicating user is not in following list
      await waitFor(() => {
        const followButton = screen.getByRole('button', { name: /^follow$/i });
        expect(followButton).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should reflect decreased following count in button state', async () => {
      const user = userEvent.setup();
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          avatar: null,
        },
      ];

      mockUnfollowUser.mockResolvedValue(undefined);
      // User is following both users initially
      mockGetFollowingList.mockReturnValue(['user-1', 'user-2']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially both should show "Following"
      const followingButtons = screen.getAllByRole('button', { name: /^following$/i });
      expect(followingButtons.length).toBe(2);

      // Unfollow first user
      await user.click(followingButtons[0]);

      await waitFor(() => {
        expect(mockUnfollowUser).toHaveBeenCalledWith('user-1');
      }, { timeout: 3000 });

      // After unfollow, one button should be "Follow"
      await waitFor(() => {
        const followingButtonsAfter = screen.getAllByRole('button', { name: /^following$/i });
        expect(followingButtonsAfter.length).toBe(1);
        const followButtonsAfter = screen.getAllByRole('button', { name: /^follow$/i });
        expect(followButtonsAfter.length).toBe(1);
      }, { timeout: 3000 });
    });
  });

  describe('✅ getFollowingList includes followed user', () => {
    it('should initialize following state from getFollowingList', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      // User is already following user-1
      mockGetFollowingList.mockReturnValue(['user-1']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify getFollowingList was called
      expect(mockGetFollowingList).toHaveBeenCalled();

      // Verify button shows "Following" because user is in the list
      const followingButton = screen.getByRole('button', { name: /^following$/i });
      expect(followingButton).toBeInTheDocument();
    });

    it('should use getFollowingList result to determine button state', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          avatar: null,
        },
      ];

      // User is following user-1 but not user-2
      mockGetFollowingList.mockReturnValue(['user-1']);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify getFollowingList was called
      expect(mockGetFollowingList).toHaveBeenCalled();

      // user-1 should show "Following", user-2 should show "Follow"
      const followingButtons = screen.getAllByRole('button', { name: /^following$/i });
      const followButtons = screen.getAllByRole('button', { name: /^follow$/i });
      
      expect(followingButtons.length).toBe(1);
      expect(followButtons.length).toBe(1);
    });

    it('should correctly handle empty following list from getFollowingList', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          avatar: null,
        },
      ];

      // User is not following anyone
      mockGetFollowingList.mockReturnValue([]);

      vi.mocked(api.default.getSuggestedUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderSuggestedUsersModal(true);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify getFollowingList was called
      expect(mockGetFollowingList).toHaveBeenCalled();

      // All buttons should show "Follow" when following list is empty
      const followButtons = screen.getAllByRole('button', { name: /^follow$/i });
      expect(followButtons.length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: /^following$/i })).not.toBeInTheDocument();
    });
  });
});

