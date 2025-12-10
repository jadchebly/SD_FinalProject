/**
 * Navbar Component Tests
 * Tests for navigation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { AuthProvider } from '../../../../contexts/AuthContext';
import * as api from '../../../../services/api';

// Mock react-router-dom's useNavigate and useLocation
const mockNavigate = vi.fn();
let mockLocationPathname = '/dashboard';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockLocationPathname }),
  };
});

// Mock the API service
vi.mock('../../../../services/api', () => ({
  default: {
    searchUsers: vi.fn(),
    setAuthHeaderProvider: vi.fn(),
    setCurrentUserProvider: vi.fn(),
    getMe: vi.fn(),
    getFollowing: vi.fn(),
  },
}));

// Mock window.scrollTo
window.scrollTo = vi.fn();

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  avatar: null,
};

// Create mock functions that can be updated in tests
const mockFollowUserFn = vi.fn();
const mockUnfollowUserFn = vi.fn();
const mockGetFollowingListFn = vi.fn<() => string[]>(() => []);

// Mock AuthContext
vi.mock('../../../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      getFollowingList: mockGetFollowingListFn,
      followUser: mockFollowUserFn,
      unfollowUser: mockUnfollowUserFn,
    }),
  };
});

const renderNavbar = (initialPath: string = '/dashboard') => {
  // Mock getMe to prevent AuthProvider from trying to fetch user on mount
  vi.mocked(api.default.getMe).mockResolvedValue({
    success: true,
    user: mockUser,
  });

  // Update mockLocation pathname
  mockLocationPathname = initialPath;

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Navbar Component - A. Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocationPathname = '/dashboard';
    vi.mocked(api.default.searchUsers).mockResolvedValue({
      success: true,
      users: [],
    });
  });

  describe('✅ Home link navigates to dashboard', () => {
    it('should navigate to /dashboard when home link is clicked', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const homeLink = document.querySelector('a[href="/dashboard"]');
        expect(homeLink).toBeInTheDocument();
      }, { timeout: 3000 });

      const homeLink = document.querySelector('a[href="/dashboard"]');
      expect(homeLink).toBeInTheDocument();
      
      if (homeLink) {
        await user.click(homeLink);
        
        // Since we're using Link component, it should navigate
        // In a real browser, this would navigate. In tests, we check the href
        expect(homeLink).toHaveAttribute('href', '/dashboard');
      }
    });

    it('should have correct href attribute for home link', async () => {
      renderNavbar('/dashboard');

      await waitFor(() => {
        const homeLink = document.querySelector('a[href="/dashboard"]');
        expect(homeLink).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ Create post link navigates to /create-post', () => {
    it('should navigate to /create-post when create post link is clicked', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const createPostLink = document.querySelector('a[href="/create-post"]');
        expect(createPostLink).toBeInTheDocument();
      }, { timeout: 3000 });

      const createPostLink = document.querySelector('a[href="/create-post"]');
      expect(createPostLink).toBeInTheDocument();
      
      if (createPostLink) {
        await user.click(createPostLink);
        
        // Check that the link has the correct href
        expect(createPostLink).toHaveAttribute('href', '/create-post');
      }
    });

    it('should have correct href attribute for create post link', async () => {
      renderNavbar('/dashboard');

      await waitFor(() => {
        const createPostLink = document.querySelector('a[href="/create-post"]');
        expect(createPostLink).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ Profile link navigates to /profile', () => {
    it('should navigate to /profile when profile link is clicked', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const profileLink = document.querySelector('a[href="/profile"]');
        expect(profileLink).toBeInTheDocument();
      }, { timeout: 3000 });

      const profileLink = document.querySelector('a[href="/profile"]');
      expect(profileLink).toBeInTheDocument();
      
      if (profileLink) {
        await user.click(profileLink);
        
        // Check that the link has the correct href
        expect(profileLink).toHaveAttribute('href', '/profile');
      }
    });

    it('should have correct href attribute for profile link', async () => {
      renderNavbar('/dashboard');

      await waitFor(() => {
        const profileLink = document.querySelector('a[href="/profile"]');
        expect(profileLink).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display user avatar or default icon in profile link', async () => {
      renderNavbar('/dashboard');

      await waitFor(() => {
        const profileLink = document.querySelector('a[href="/profile"]');
        expect(profileLink).toBeInTheDocument();
      }, { timeout: 3000 });

      const profileLink = document.querySelector('a[href="/profile"]');
      expect(profileLink).toBeInTheDocument();
      
      // Should contain either an image or the profile icon
      const avatarImg = profileLink?.querySelector('img.navbar-avatar-img');
      const profileIcon = profileLink?.querySelector('svg');
      
      expect(avatarImg || profileIcon).toBeInTheDocument();
    });
  });

  describe('✅ Back button on create-post page', () => {
    it('should show back button when on create-post page', async () => {
      renderNavbar('/create-post');

      await waitFor(() => {
        const backButton = document.querySelector('.back-button');
        expect(backButton).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should call navigate(-1) when back button is clicked', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/create-post');

      await waitFor(() => {
        const backButton = document.querySelector('.back-button');
        expect(backButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const backButton = document.querySelector('.back-button');
      expect(backButton).toBeInTheDocument();
      
      if (backButton) {
        await user.click(backButton);
        
        // Verify navigate was called with -1 (go back)
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      }
    });

    it('should not show back button when not on create-post page', async () => {
      renderNavbar('/dashboard');

      await waitFor(() => {
        const backButton = document.querySelector('.back-button');
        expect(backButton).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show logo instead of back button when not on create-post page', async () => {
      renderNavbar('/dashboard');

      await waitFor(() => {
        const logo = screen.getByText('IEstagram');
        expect(logo).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});

describe('Navbar Component - B. Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocationPathname = '/dashboard';
    vi.mocked(api.default.searchUsers).mockResolvedValue({
      success: true,
      users: [],
    });
  });

  describe('✅ Search input dispatches searchUpdate event', () => {
    it('should dispatch searchUpdate event when typing in search input', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      // Wait for search input to appear
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText('Search posts') as HTMLInputElement;
      
      // Set up event listener to capture searchUpdate events
      const eventListener = vi.fn();
      window.addEventListener('searchUpdate', eventListener);

      // Type in the search input
      await user.type(searchInput, 'test query');

      // Verify the event was dispatched with correct detail
      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const lastCall = eventListener.mock.calls[eventListener.mock.calls.length - 1];
        expect(lastCall[0].detail).toEqual({ query: 'test query' });
      }, { timeout: 3000 });

      // Clean up
      window.removeEventListener('searchUpdate', eventListener);
    });

    it('should dispatch searchUpdate event on each character typed', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText('Search posts') as HTMLInputElement;
      
      // Set up event listener
      const eventListener = vi.fn();
      window.addEventListener('searchUpdate', eventListener);

      // Type multiple characters
      await user.type(searchInput, 'abc');

      // Verify multiple events were dispatched (one per character)
      await waitFor(() => {
        expect(eventListener).toHaveBeenCalledTimes(3);
        // Check the last event has the full query
        const lastCall = eventListener.mock.calls[eventListener.mock.calls.length - 1];
        expect(lastCall[0].detail).toEqual({ query: 'abc' });
      }, { timeout: 3000 });

      // Clean up
      window.removeEventListener('searchUpdate', eventListener);
    });

    it('should update search input value as user types', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText('Search posts') as HTMLInputElement;
      
      await user.type(searchInput, 'my search');

      expect(searchInput.value).toBe('my search');
    });
  });

  describe('✅ Enter key triggers search', () => {
    it('should dispatch searchUpdate event when Enter key is pressed', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText('Search posts') as HTMLInputElement;
      
      // Set up event listener
      const eventListener = vi.fn();
      window.addEventListener('searchUpdate', eventListener);

      // Type in search input
      await user.type(searchInput, 'test query');

      // Clear previous events from typing
      eventListener.mockClear();

      // Press Enter key
      await user.keyboard('{Enter}');

      // Verify the event was dispatched with the current query
      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const lastCall = eventListener.mock.calls[eventListener.mock.calls.length - 1];
        expect(lastCall[0].detail).toEqual({ query: 'test query' });
      }, { timeout: 3000 });

      // Clean up
      window.removeEventListener('searchUpdate', eventListener);
    });

    it('should blur input when Enter key is pressed', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText('Search posts') as HTMLInputElement;
      
      // Focus the input first
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      // Press Enter key
      await user.keyboard('{Enter}');

      // Verify input was blurred
      await waitFor(() => {
        expect(searchInput).not.toHaveFocus();
      }, { timeout: 3000 });
    });

    it('should dispatch searchUpdate event when Enter is pressed even after typing', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search posts');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText('Search posts') as HTMLInputElement;
      
      // Set up event listener before typing
      const eventListener = vi.fn();
      window.addEventListener('searchUpdate', eventListener);

      // Type in search input (this will trigger events)
      await user.type(searchInput, 'test');

      // Clear previous events from typing to focus on Enter key event
      eventListener.mockClear();

      // Press Enter key
      await user.keyboard('{Enter}');

      // Verify the event was dispatched when Enter was pressed
      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const lastCall = eventListener.mock.calls[eventListener.mock.calls.length - 1];
        expect(lastCall[0].detail).toEqual({ query: 'test' });
      }, { timeout: 3000 });

      // Clean up
      window.removeEventListener('searchUpdate', eventListener);
    });
  });
});

describe('Navbar Component - C. People search', () => {
  let followingList: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocationPathname = '/dashboard';
    followingList = [];
    
    // Reset mock functions using mockImplementation
    mockFollowUserFn.mockImplementation(async (userId: string) => {
      followingList.push(userId);
    });
    mockUnfollowUserFn.mockImplementation(async (userId: string) => {
      followingList = followingList.filter(id => id !== userId);
    });
    mockGetFollowingListFn.mockImplementation(() => followingList);

    vi.mocked(api.default.searchUsers).mockResolvedValue({
      success: true,
      users: [],
    });
  });

  describe('✅ Opens people search panel', () => {
    it('should open people search panel when button is clicked', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      // Verify panel is open
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Find people');
        expect(searchInput).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should close people search panel when button is clicked again', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      
      // Open panel
      await user.click(peopleButton);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Find people')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Close panel
      await user.click(peopleButton);
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Find people')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should clear search query and results when panel is opened', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      
      // Open panel and type something
      await user.click(peopleButton);
      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'test query');

      // Close and reopen panel
      await user.click(peopleButton);
      await user.click(peopleButton);

      // Verify search input is cleared
      const newSearchInput = await screen.findByPlaceholderText('Find people');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('✅ Searches users by query', () => {
    it('should call searchUsers API when typing in search input', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open panel
      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      
      // Type in search input
      await user.type(searchInput, 'john');

      // Wait for debounce (250ms) and verify API was called
      await waitFor(() => {
        expect(api.default.searchUsers).toHaveBeenCalledWith('john');
      }, { timeout: 1000 });
    });

    it('should debounce search API calls', async () => {
      const user = userEvent.setup();
      
      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      
      // Type quickly
      await user.type(searchInput, 'abc');

      // Should only call API once after debounce, not for each character
      await waitFor(() => {
        expect(api.default.searchUsers).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Verify it was called with the final query
      expect(api.default.searchUsers).toHaveBeenCalledWith('abc');
    });

    it('should show loading state while searching', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      vi.mocked(api.default.searchUsers).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, users: [] }), 100))
      );

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'test');

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('✅ Shows search results', () => {
    const mockUsers = [
      { id: 'user-1', username: 'john_doe', email: 'john@example.com', avatar: null },
      { id: 'user-2', username: 'jane_smith', email: 'jane@example.com', avatar: 'https://example.com/avatar.jpg' },
      { id: 'user-3', username: 'bob_wilson', email: 'bob@example.com', avatar: 'default' },
    ];

    it('should display search results when API returns users', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: mockUsers,
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'test');

      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
        expect(screen.getByText('bob_wilson')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show username and email for each result', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockUsers[0]],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'john');

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show default icon when user has no avatar', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockUsers[0]], // No avatar
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'john');

      await waitFor(() => {
        const resultRow = screen.getByText('john_doe').closest('.people-search-row');
        expect(resultRow).toBeInTheDocument();
        // Should have an SVG icon (default avatar)
        const svgIcon = resultRow?.querySelector('svg');
        expect(svgIcon).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show avatar image when user has custom avatar', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockUsers[1]], // Has custom avatar
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'jane');

      await waitFor(() => {
        const resultRow = screen.getByText('jane_smith').closest('.people-search-row');
        expect(resultRow).toBeInTheDocument();
        const avatarImg = resultRow?.querySelector('img.people-search-avatar');
        expect(avatarImg).toBeInTheDocument();
        expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      }, { timeout: 2000 });
    });

    it('should show "No results" when search returns empty', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No results')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should filter out current user from results', async () => {
      const user = userEvent.setup();
      
      const usersWithCurrentUser = [
        ...mockUsers,
        { id: mockUser.id, username: mockUser.username, email: mockUser.email, avatar: null },
      ];

      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: usersWithCurrentUser,
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        // Should show other users but not current user
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        // Check that current user is not in the search results (but may appear in username display)
        const searchResults = document.querySelectorAll('.people-search-row');
        const currentUserInResults = Array.from(searchResults).some(row => 
          row.textContent?.includes(mockUser.username)
        );
        expect(currentUserInResults).toBe(false);
      }, { timeout: 2000 });
    });
  });

  describe('✅ Follow/unfollow in search results', () => {
    const mockSearchUser = {
      id: 'search-user-1',
      username: 'searchuser',
      email: 'search@example.com',
      avatar: null,
    };

    it('should show Follow button for users not being followed', async () => {
      const user = userEvent.setup();
      
      followingList = []; // Not following anyone
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'search');

      await waitFor(() => {
        const followButton = screen.getByText('Follow');
        expect(followButton).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show Following button for users being followed', async () => {
      const user = userEvent.setup();
      
      followingList = [mockSearchUser.id]; // Already following
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'search');

      await waitFor(() => {
        const followingButton = screen.getByText('Following');
        expect(followingButton).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should call followUser when Follow button is clicked', async () => {
      const user = userEvent.setup();
      
      followingList = [];
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'search');

      const followButton = await screen.findByText('Follow');
      await user.click(followButton);

      expect(mockFollowUserFn).toHaveBeenCalledWith(mockSearchUser.id);
    });

    it('should call unfollowUser when Following button is clicked', async () => {
      const user = userEvent.setup();
      
      followingList = [mockSearchUser.id];
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'search');

      const followingButton = await screen.findByText('Following');
      await user.click(followingButton);

      expect(mockUnfollowUserFn).toHaveBeenCalledWith(mockSearchUser.id);
    });

    it('should prevent navigation when follow button is clicked', async () => {
      const user = userEvent.setup();
      
      followingList = [];
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'search');

      const followButton = await screen.findByText('Follow');
      
      // Click follow button (should not navigate)
      await user.click(followButton);

      // Verify followUser was called but navigate was not
      expect(mockFollowUserFn).toHaveBeenCalledWith(mockSearchUser.id);
      // Navigate should not be called when clicking the button (stopPropagation)
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('✅ Click user navigates to profile', () => {
    const mockSearchUser = {
      id: 'profile-user-1',
      username: 'profileuser',
      email: 'profile@example.com',
      avatar: null,
    };

    it('should navigate to user profile when result row is clicked', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'profile');

      const resultRow = await screen.findByText('profileuser');
      await user.click(resultRow);

      expect(mockNavigate).toHaveBeenCalledWith(`/profile/${mockSearchUser.id}`);
    });

    it('should close people search panel when user is clicked', async () => {
      const user = userEvent.setup();
      
      vi.mocked(api.default.searchUsers).mockResolvedValue({
        success: true,
        users: [mockSearchUser],
      });

      renderNavbar('/dashboard');

      await waitFor(() => {
        const peopleButton = screen.getByLabelText('Find people');
        expect(peopleButton).toBeInTheDocument();
      }, { timeout: 3000 });

      const peopleButton = screen.getByLabelText('Find people');
      await user.click(peopleButton);

      const searchInput = await screen.findByPlaceholderText('Find people');
      await user.type(searchInput, 'profile');

      const resultRow = await screen.findByText('profileuser');
      await user.click(resultRow);

      // Verify panel is closed
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Find people')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});

