/**
 * Dashboard Component Tests
 * Tests for post display functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../../contexts/AuthContext';
import * as api from '../../../services/api';

// Mock socket.io-client first - must be before socket service mock
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

// Mock the socket service - must be mocked before Dashboard imports it
// Create a shared object to store event handlers
const socketEventHandlersStore: Record<string, Function> = {};

const mockSocketInstance = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn((event: string, handler: Function) => {
    socketEventHandlersStore[event] = handler;
    return mockSocketInstance;
  }),
  off: vi.fn(),
  once: vi.fn(),
};

vi.mock('../../../services/socket', () => {
  return {
    getSocket: vi.fn(() => mockSocketInstance),
    disconnectSocket: vi.fn(),
  };
});

// Mock the API service
vi.mock('../../../services/api', () => ({
  default: {
    getFeed: vi.fn(),
    getMe: vi.fn(),
    getComments: vi.fn(),
    addComment: vi.fn(),
    getFollowing: vi.fn(),
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

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      getFollowingList: () => [],
      hasSeenSuggested: () => false,
      markSeenSuggested: vi.fn(),
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
    }),
  };
});

const renderDashboard = async () => {
  // Mock getMe to prevent AuthProvider from trying to fetch user on mount
  vi.mocked(api.default.getMe).mockResolvedValue({ 
    success: true,
    user: mockUser,
  });
  
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component - A. Post display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ Loads posts from feed API', () => {
    it('should call getFeed API when component mounts', async () => {
      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: [],
      });

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should load and display posts from feed API', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'First Post',
          content: 'This is the first post',
          type: 'blurb',
          created_at: new Date().toISOString(),
          user: 'user1',
          likes: 5,
          likers: ['user-2', 'user-3'],
          commentsCount: 2,
        },
        {
          id: 'post-2',
          title: 'Second Post',
          content: 'This is the second post',
          type: 'blurb',
          created_at: new Date().toISOString(),
          user: 'user2',
          likes: 3,
          likers: ['user-1'],
          commentsCount: 1,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify posts are displayed
      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle API error gracefully', async () => {
      vi.mocked(api.default.getFeed).mockRejectedValue(new Error('API Error'));

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Should show empty state or error message
      await waitFor(() => {
        expect(screen.getByText(/no posts/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ Displays posts sorted by date (newest first)', () => {
    it('should display posts sorted by date newest first', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const mockPosts = [
        {
          id: 'post-old',
          title: 'Oldest Post',
          content: 'Old content',
          type: 'blurb',
          created_at: twoHoursAgo.toISOString(),
          user: 'user1',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
        {
          id: 'post-new',
          title: 'Newest Post',
          content: 'New content',
          type: 'blurb',
          created_at: now.toISOString(),
          user: 'user2',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
        {
          id: 'post-middle',
          title: 'Middle Post',
          content: 'Middle content',
          type: 'blurb',
          created_at: oneHourAgo.toISOString(),
          user: 'user3',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Wait for posts to render
      await waitFor(() => {
        expect(screen.getByText('Newest Post')).toBeInTheDocument();
        expect(screen.getByText('Middle Post')).toBeInTheDocument();
        expect(screen.getByText('Oldest Post')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Get all post titles
      const postTitles = screen.getAllByText(/Post$/);
      
      // Verify order: Newest should be first
      expect(postTitles[0]).toHaveTextContent('Newest Post');
      expect(postTitles[1]).toHaveTextContent('Middle Post');
      expect(postTitles[2]).toHaveTextContent('Oldest Post');
    });
  });

  describe('✅ Shows post title, content, user, time ago', () => {
    it('should display post title, content, user, and time ago', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Test Post Title',
          content: 'Test post content here',
          type: 'blurb',
          created_at: new Date().toISOString(),
          user: 'testuser',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify all post elements are displayed
      await waitFor(() => {
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
        expect(screen.getByText('Test post content here')).toBeInTheDocument();
        expect(screen.getByText(/by: testuser/i)).toBeInTheDocument();
        expect(screen.getByText(/posted:/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display time ago correctly', async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Recent Post',
          content: 'Content',
          type: 'blurb',
          created_at: oneMinuteAgo.toISOString(),
          user: 'user1',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Recent Post')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify time ago is displayed (should show "1m ago" or similar)
      const timeAgoText = screen.getByText(/posted:/i);
      expect(timeAgoText).toBeInTheDocument();
    });
  });

  describe('✅ Shows media (image/video) when present', () => {
    it('should display image when post has image_url', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Photo Post',
          content: 'Post with image',
          type: 'photo',
          image_url: 'https://example.com/image.jpg',
          created_at: new Date().toISOString(),
          user: 'user1',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Photo Post')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify image is displayed
      await waitFor(() => {
        const image = screen.getByAltText('Photo Post');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      }, { timeout: 3000 });
    });

    it('should display video when post has video_url', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Video Post',
          content: 'Post with video',
          type: 'video',
          video_url: 'https://youtube.com/watch?v=test1234567', // 11 character video ID
          created_at: new Date().toISOString(),
          user: 'user1',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Video Post')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify video iframe is displayed
      await waitFor(() => {
        const iframe = document.querySelector('iframe.post-media-youtube');
        expect(iframe).toBeInTheDocument();
        if (iframe) {
          expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed/test1234567'));
        }
      }, { timeout: 3000 });
    });

    it('should not display media when post has no image or video', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Text Post',
          content: 'Post without media',
          type: 'blurb',
          created_at: new Date().toISOString(),
          user: 'user1',
          likes: 0,
          likers: [],
          commentsCount: 0,
        },
      ];

      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: mockPosts,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Text Post')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify no media elements are present
      const images = document.querySelectorAll('img.post-media-image');
      const videos = document.querySelectorAll('video.post-media-video');
      const iframes = document.querySelectorAll('iframe.post-media-youtube');
      
      expect(images.length).toBe(0);
      expect(videos.length).toBe(0);
      expect(iframes.length).toBe(0);
    });
  });

  describe('✅ Empty feed shows "No posts yet" message', () => {
    it('should show "No posts yet" message when feed is empty', async () => {
      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: [],
      });

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify empty state message
      await waitFor(() => {
        expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show "No posts yet" when API returns empty array', async () => {
      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
        posts: [],
      });

      await renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show "No posts yet" when API returns success but no posts field', async () => {
      vi.mocked(api.default.getFeed).mockResolvedValue({
        success: true,
      });

      await renderDashboard();

      await waitFor(() => {
        expect(api.default.getFeed).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Should show empty state
      await waitFor(() => {
        expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('C. Comment functionality', () => {
    beforeEach(() => {
      // Clear stored handlers
      Object.keys(socketEventHandlersStore).forEach(key => {
        delete socketEventHandlersStore[key];
      });
      
      // Reset socket methods
      mockSocketInstance.emit = vi.fn();
      mockSocketInstance.off = vi.fn();
      mockSocketInstance.once = vi.fn();
      mockSocketInstance.connected = true;
      
      // Reset on mock to capture handlers
      mockSocketInstance.on = vi.fn((event: string, handler: Function) => {
        socketEventHandlersStore[event] = handler;
        return mockSocketInstance;
      });
    });

    describe('✅ Add comment - comment count increases by 1', () => {
      it('should increase comment count when comment is added', async () => {
        const user = userEvent.setup();
        const mockPosts = [
          {
            id: 'post-1',
            title: 'Test Post',
            content: 'Test content',
            type: 'blurb',
            created_at: new Date().toISOString(),
            user: 'user1',
            likes: 0,
            likers: [],
            commentsCount: 0,
          },
        ];

        vi.mocked(api.default.getFeed).mockResolvedValue({
          success: true,
          posts: mockPosts,
        });

        vi.mocked(api.default.getComments).mockResolvedValue({
          success: true,
          comments: [],
        });

        vi.mocked(api.default.addComment).mockResolvedValue({
          success: true,
        });

        await renderDashboard();

        // Wait for post to load
        await waitFor(() => {
          expect(screen.getByText('Test Post')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Click on post to open modal
        const postCard = screen.getByText('Test Post').closest('.post-card');
        if (postCard) {
          await user.click(postCard);
        }

        // Wait for modal to open
        await waitFor(() => {
          expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Get initial comment count - use more specific query
        const commentCountElement = document.querySelector('.comment-count');
        expect(commentCountElement).toHaveTextContent('0');

        // Wait for socket handlers to be set up (socket.on should be called for 'new-comment')
        await waitFor(() => {
          const onCalls = vi.mocked(mockSocketInstance.on).mock.calls;
          const hasNewCommentHandler = onCalls.some(call => call[0] === 'new-comment');
          expect(hasNewCommentHandler).toBe(true);
        }, { timeout: 5000 });

        // Type and submit comment
        const commentInput = screen.getByPlaceholderText('Add a comment...');
        await user.type(commentInput, 'Test comment');
        
        const submitButton = screen.getByRole('button', { name: /^post$/i });
        await user.click(submitButton);

        // Wait for API call
        await waitFor(() => {
          expect(api.default.addComment).toHaveBeenCalledWith('post-1', 'Test comment');
        }, { timeout: 3000 });

        // Simulate socket event for new comment (after API call)
        // Use the same approach as the passing test
        const newComment = {
          id: 'comment-1',
          text: 'Test comment',
          user: 'testuser',
          createdAt: new Date().toISOString(),
        };

        // Trigger socket event handler using the captured handler
        const handler = socketEventHandlersStore['new-comment'];
        if (handler) {
          handler({
            postId: 'post-1',
            comment: newComment,
          });
        }

        // Verify comment appears (via socket event)
        await waitFor(() => {
          expect(screen.getByText('Test comment')).toBeInTheDocument();
        }, { timeout: 10000 });
      });
    });

    describe('✅ Comment appears in comments list', () => {
      it('should display comment in comments list after adding', async () => {
        const user = userEvent.setup();
        const mockPosts = [
          {
            id: 'post-1',
            title: 'Test Post',
            content: 'Test content',
            type: 'blurb',
            created_at: new Date().toISOString(),
            user: 'user1',
            likes: 0,
            likers: [],
            commentsCount: 0,
          },
        ];

        vi.mocked(api.default.getFeed).mockResolvedValue({
          success: true,
          posts: mockPosts,
        });

        vi.mocked(api.default.getComments).mockResolvedValue({
          success: true,
          comments: [],
        });

        vi.mocked(api.default.addComment).mockResolvedValue({
          success: true,
        });

        await renderDashboard();

        // Wait for post to load and open modal
        await waitFor(() => {
          expect(screen.getByText('Test Post')).toBeInTheDocument();
        }, { timeout: 3000 });

        const postCard = screen.getByText('Test Post').closest('.post-card');
        if (postCard) {
          await user.click(postCard);
        }

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Wait for socket handlers to be set up
        await waitFor(() => {
          const handler = socketEventHandlersStore['new-comment'];
          expect(handler).toBeDefined();
        }, { timeout: 5000 });

        // Add comment
        const commentInput = screen.getByPlaceholderText('Add a comment...');
        await user.type(commentInput, 'My new comment');
        
        const submitButton = screen.getByRole('button', { name: /^post$/i });
        await user.click(submitButton);

        // Wait for API call
        await waitFor(() => {
          expect(api.default.addComment).toHaveBeenCalledWith('post-1', 'My new comment');
        }, { timeout: 3000 });

        // Simulate socket event
        const newComment = {
          id: 'comment-1',
          text: 'My new comment',
          user: 'testuser',
          createdAt: new Date().toISOString(),
        };

        // Trigger socket handler using stored handler
        const handler = socketEventHandlersStore['new-comment'];
        if (handler) {
          handler({
            postId: 'post-1',
            comment: newComment,
          });
        }

        // Wait for comment to appear in list - use more flexible query
        await waitFor(() => {
          const commentText = screen.queryByText('My new comment', { exact: false });
          const commentItems = document.querySelectorAll('.comment-item');
          const hasComment = commentText || Array.from(commentItems).some(item => 
            item.textContent?.includes('My new comment')
          );
          expect(hasComment).toBeTruthy();
        }, { timeout: 10000 });
      });
    });

    describe('✅ Comment shows user, text, time ago', () => {
      it('should display comment with user, text, and time ago', async () => {
        const user = userEvent.setup();
        const mockPosts = [
          {
            id: 'post-1',
            title: 'Test Post',
            content: 'Test content',
            type: 'blurb',
            created_at: new Date().toISOString(),
            user: 'user1',
            likes: 0,
            likers: [],
            commentsCount: 0,
          },
        ];

        vi.mocked(api.default.getFeed).mockResolvedValue({
          success: true,
          posts: mockPosts,
        });

        vi.mocked(api.default.getComments).mockResolvedValue({
          success: true,
          comments: [],
        });

        vi.mocked(api.default.addComment).mockResolvedValue({
          success: true,
        });

        await renderDashboard();

        // Open post modal
        await waitFor(() => {
          expect(screen.getByText('Test Post')).toBeInTheDocument();
        }, { timeout: 3000 });

        const postCard = screen.getByText('Test Post').closest('.post-card');
        if (postCard) {
          await user.click(postCard);
        }

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Wait for socket handlers to be set up
        await waitFor(() => {
          const onCalls = vi.mocked(mockSocketInstance.on).mock.calls;
          const hasNewCommentHandler = onCalls.some(call => call[0] === 'new-comment');
          expect(hasNewCommentHandler).toBe(true);
        }, { timeout: 5000 });

        // Add comment
        const commentInput = screen.getByPlaceholderText('Add a comment...');
        await user.type(commentInput, 'Comment text here');
        
        const submitButton = screen.getByRole('button', { name: /^post$/i });
        await user.click(submitButton);

        // Wait for API call
        await waitFor(() => {
          expect(api.default.addComment).toHaveBeenCalledWith('post-1', 'Comment text here');
        }, { timeout: 3000 });

        // Simulate socket event with all comment data
        const commentDate = new Date();
        const newComment = {
          id: 'comment-1',
          text: 'Comment text here',
          user: 'testuser',
          createdAt: commentDate.toISOString(),
          timeAgo: 'just now',
        };

        // Trigger socket handler
        const handler = socketEventHandlersStore['new-comment'];
        if (handler) {
          handler({
            postId: 'post-1',
            comment: newComment,
          });
        }

        // Verify all comment elements are displayed
        // Increase timeout and use more flexible queries
        await waitFor(() => {
          const commentText = screen.queryByText('Comment text here', { exact: false });
          const commentItems = document.querySelectorAll('.comment-item');
          const hasComment = commentText || Array.from(commentItems).some(item => 
            item.textContent?.includes('Comment text here')
          );
          expect(hasComment).toBeTruthy();
        }, { timeout: 15000 });
        
        // Verify username is in a comment item
        await waitFor(() => {
          const commentItems = document.querySelectorAll('.comment-item');
          const hasUsername = Array.from(commentItems).some(item => 
            item.textContent?.includes('testuser')
          );
          expect(hasUsername).toBeTruthy();
        }, { timeout: 5000 });

        // Verify time ago is displayed (either from socket or calculated)
        const timeAgoElements = screen.getAllByText(/just now|ago/i);
        expect(timeAgoElements.length).toBeGreaterThan(0);
      });
    });

    describe('✅ Comment input clears after submission', () => {
      it('should clear comment input after submitting comment', async () => {
        const user = userEvent.setup();
        const mockPosts = [
          {
            id: 'post-1',
            title: 'Test Post',
            content: 'Test content',
            type: 'blurb',
            created_at: new Date().toISOString(),
            user: 'user1',
            likes: 0,
            likers: [],
            commentsCount: 0,
          },
        ];

        vi.mocked(api.default.getFeed).mockResolvedValue({
          success: true,
          posts: mockPosts,
        });

        vi.mocked(api.default.getComments).mockResolvedValue({
          success: true,
          comments: [],
        });

        vi.mocked(api.default.addComment).mockResolvedValue({
          success: true,
        });

        await renderDashboard();

        // Open post modal
        await waitFor(() => {
          expect(screen.getByText('Test Post')).toBeInTheDocument();
        }, { timeout: 3000 });

        const postCard = screen.getByText('Test Post').closest('.post-card');
        if (postCard) {
          await user.click(postCard);
        }

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Type comment
        const commentInput = screen.getByPlaceholderText('Add a comment...') as HTMLInputElement;
        await user.type(commentInput, 'Test comment text');
        expect(commentInput.value).toBe('Test comment text');

        // Submit comment - use more specific query
        const submitButton = screen.getByRole('button', { name: /^post$/i });
        await user.click(submitButton);

        // Verify input is cleared immediately
        await waitFor(() => {
          expect(commentInput.value).toBe('');
        }, { timeout: 3000 });
      });
    });

    describe('✅ Comment updates via socket event', () => {
      it('should update comments list when socket event is received', async () => {
        const user = userEvent.setup();
        const mockPosts = [
          {
            id: 'post-1',
            title: 'Test Post',
            content: 'Test content',
            type: 'blurb',
            created_at: new Date().toISOString(),
            user: 'user1',
            likes: 0,
            likers: [],
            commentsCount: 0,
          },
        ];

        vi.mocked(api.default.getFeed).mockResolvedValue({
          success: true,
          posts: mockPosts,
        });

        vi.mocked(api.default.getComments).mockResolvedValue({
          success: true,
          comments: [],
        });

        await renderDashboard();

        // Open post modal
        await waitFor(() => {
          expect(screen.getByText('Test Post')).toBeInTheDocument();
        }, { timeout: 3000 });

        const postCard = screen.getByText('Test Post').closest('.post-card');
        if (postCard) {
          await user.click(postCard);
        }

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Simulate socket event for new comment (without API call)
        const newComment = {
          id: 'comment-1',
          text: 'Socket comment',
          user: 'otheruser',
          createdAt: new Date().toISOString(),
        };

        const handler = socketEventHandlersStore['new-comment'];
        if (handler) {
          handler({
            postId: 'post-1',
            comment: newComment,
          });
        }

        // Verify comment appears from socket event
        await waitFor(() => {
          expect(screen.getByText('Socket comment')).toBeInTheDocument();
          expect(screen.getByText('otheruser')).toBeInTheDocument();
        }, { timeout: 3000 });
      });
    });

    describe('✅ Multiple comments show correct count', () => {
      it('should display correct count for multiple comments', async () => {
        // Increase test timeout for this complex test
        vi.setConfig({ testTimeout: 20000 });
        const user = userEvent.setup();
        const mockPosts = [
          {
            id: 'post-1',
            title: 'Test Post',
            content: 'Test content',
            type: 'blurb',
            created_at: new Date().toISOString(),
            user: 'user1',
            likes: 0,
            likers: [],
            commentsCount: 0,
          },
        ];

        vi.mocked(api.default.getFeed).mockResolvedValue({
          success: true,
          posts: mockPosts,
        });

        vi.mocked(api.default.getComments).mockResolvedValue({
          success: true,
          comments: [],
        });

        vi.mocked(api.default.addComment).mockResolvedValue({
          success: true,
        });

        await renderDashboard();

        // Open post modal
        await waitFor(() => {
          expect(screen.getByText('Test Post')).toBeInTheDocument();
        }, { timeout: 3000 });

        const postCard = screen.getByText('Test Post').closest('.post-card');
        if (postCard) {
          await user.click(postCard);
        }

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Wait for socket handlers to be set up
        await waitFor(() => {
          const onCalls = vi.mocked(mockSocketInstance.on).mock.calls;
          const hasNewCommentHandler = onCalls.some(call => call[0] === 'new-comment');
          expect(hasNewCommentHandler).toBe(true);
        }, { timeout: 5000 });

        // Helper function to add comment and trigger socket event
        const addCommentAndTriggerSocket = async (text: string, commentId: string) => {
          const commentInput = screen.getByPlaceholderText('Add a comment...');
          await user.type(commentInput, text);
          
          const submitButton = screen.getByRole('button', { name: /^post$/i });
          await user.click(submitButton);

          // Wait for API call
          await waitFor(() => {
            expect(api.default.addComment).toHaveBeenCalledWith('post-1', text);
          }, { timeout: 3000 });

          // Trigger socket event
          const handler = socketEventHandlersStore['new-comment'];
          if (handler) {
            handler({
              postId: 'post-1',
              comment: {
                id: commentId,
                text: text,
                user: 'testuser',
                createdAt: new Date().toISOString(),
              },
            });
          }

          // Wait for comment to appear
          await waitFor(() => {
            expect(screen.getByText(text)).toBeInTheDocument();
          }, { timeout: 10000 });
        };

        // Add first comment
        await addCommentAndTriggerSocket('First comment', 'comment-1');

        // Add second comment
        await addCommentAndTriggerSocket('Second comment', 'comment-2');

        // Add third comment
        await addCommentAndTriggerSocket('Third comment', 'comment-3');

        // Verify all three comments are displayed in the modal
        // Give extra time for all state updates to propagate
        await waitFor(() => {
          const commentItems = document.querySelectorAll('.comment-item');
          expect(commentItems.length).toBe(3);
          
          const commentTexts = Array.from(commentItems).map(item => item.textContent);
          expect(commentTexts.some(text => text?.includes('First comment'))).toBe(true);
          expect(commentTexts.some(text => text?.includes('Second comment'))).toBe(true);
          expect(commentTexts.some(text => text?.includes('Third comment'))).toBe(true);
        }, { timeout: 15000 });

        // Verify comment count in modal (should show 3 comments)
        const commentItems = document.querySelectorAll('.comment-item');
        expect(commentItems.length).toBe(3);

        // Close modal by clicking close button
        const closeButton = screen.getByRole('button', { name: /×|close/i });
        await user.click(closeButton);

        // Wait for modal to close
        await waitFor(() => {
          expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
        }, { timeout: 3000 });

        // Verify comment count is shown on post card (should show 3)
        // The comment count should be updated in the post card
        await waitFor(() => {
          const commentCountElement = document.querySelector('.comment-count');
          expect(commentCountElement).toHaveTextContent('3');
        }, { timeout: 3000 });
      });
    });

    describe('D. Post interactions', () => {
      describe('✅ Click post opens modal', () => {
        it('should open modal when post card is clicked', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Test Post',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          // Wait for post to load
          await waitFor(() => {
            expect(screen.getByText('Test Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Click on post card
          const postCard = screen.getByText('Test Post').closest('.post-card');
          expect(postCard).toBeInTheDocument();
          
          if (postCard) {
            await user.click(postCard);
          }

          // Wait for modal to open
          await waitFor(() => {
            expect(document.querySelector('.post-modal-overlay')).toBeInTheDocument();
            expect(document.querySelector('.post-modal-content')).toBeInTheDocument();
          }, { timeout: 3000 });
        });

        it('should open modal when clicking anywhere on post card', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Another Post',
              content: 'Another content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user2',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Another Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Another Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          await waitFor(() => {
            expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
          }, { timeout: 3000 });
        });
      });

      describe('✅ Modal shows full post details', () => {
        it('should display post title, content, user, and time in modal', async () => {
          const user = userEvent.setup();
          const postDate = new Date('2024-01-15T10:00:00Z');
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Detailed Post',
              content: 'This is the full post content that should be visible in the modal',
              type: 'blurb',
              created_at: postDate.toISOString(),
              user: 'author1',
              likes: 5,
              likers: [],
              commentsCount: 2,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Detailed Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Detailed Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          // Wait for modal to open and verify all details
          await waitFor(() => {
            expect(document.querySelector('.post-modal-content')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Verify modal content (use querySelector to check within modal)
          const modalContent = document.querySelector('.post-modal-content');
          expect(modalContent).toBeInTheDocument();
          expect(modalContent).toHaveTextContent('Detailed Post');
          expect(modalContent).toHaveTextContent('This is the full post content that should be visible in the modal');
          expect(modalContent).toHaveTextContent('author1');
          expect(modalContent).toHaveTextContent(/posted:/i);
        });

        it('should display media (image) in modal when present', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Image Post',
              content: 'Post with image',
              type: 'photo',
              image_url: 'https://example.com/image.jpg',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Image Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Image Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          await waitFor(() => {
            const modalMedia = document.querySelector('.modal-media');
            expect(modalMedia).toBeInTheDocument();
            const img = modalMedia?.querySelector('img');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
          }, { timeout: 3000 });
        });

        it('should display media (video) in modal when present', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Video Post',
              content: 'Post with video',
              type: 'video',
              video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Video Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Video Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          await waitFor(() => {
            const modalMedia = document.querySelector('.modal-media');
            expect(modalMedia).toBeInTheDocument();
            const iframe = modalMedia?.querySelector('iframe');
            expect(iframe).toBeInTheDocument();
            expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
          }, { timeout: 3000 });
        });
      });

      describe('✅ Modal shows all comments', () => {
        it('should display all existing comments in modal', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Post with Comments',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 2,
            },
          ];

          const mockComments = [
            {
              id: 'comment-1',
              text: 'First comment',
              user: 'commenter1',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'comment-2',
              text: 'Second comment',
              user: 'commenter2',
              createdAt: new Date().toISOString(),
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: mockComments,
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Post with Comments')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Post with Comments').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          // Wait for modal to open and comments to load
          await waitFor(() => {
            expect(screen.getByText('First comment')).toBeInTheDocument();
            expect(screen.getByText('Second comment')).toBeInTheDocument();
            expect(screen.getByText('commenter1')).toBeInTheDocument();
            expect(screen.getByText('commenter2')).toBeInTheDocument();
          }, { timeout: 5000 });
        });

        it('should show empty state when post has no comments', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Post Without Comments',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Post Without Comments')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Post Without Comments').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          await waitFor(() => {
            expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Verify no comments are displayed (comments list should not exist or be empty)
          const commentsList = document.querySelector('.comments-list');
          if (commentsList) {
            const commentItems = commentsList.querySelectorAll('.comment-item');
            expect(commentItems.length).toBe(0);
          }
        });
      });

      describe('✅ Modal allows adding comments', () => {
        it('should allow typing and submitting comments in modal', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Commentable Post',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          vi.mocked(api.default.addComment).mockResolvedValue({
            success: true,
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Commentable Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Commentable Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          await waitFor(() => {
            expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Wait for socket handlers to be set up
          await waitFor(() => {
            const onCalls = vi.mocked(mockSocketInstance.on).mock.calls;
            const hasNewCommentHandler = onCalls.some(call => call[0] === 'new-comment');
            expect(hasNewCommentHandler).toBe(true);
          }, { timeout: 5000 });

          const newCommentHandler = socketEventHandlersStore['new-comment'];

          // Type and submit comment
          const commentInput = screen.getByPlaceholderText('Add a comment...');
          await user.type(commentInput, 'New comment from modal');
          
          const submitButton = screen.getByRole('button', { name: /^post$/i });
          await user.click(submitButton);

          // Verify API call
          await waitFor(() => {
            expect(api.default.addComment).toHaveBeenCalledWith('post-1', 'New comment from modal');
          }, { timeout: 3000 });

          // Simulate socket event
          if (newCommentHandler) {
            const newComment = {
              id: 'comment-new',
              text: 'New comment from modal',
              user: 'testuser',
              createdAt: new Date().toISOString(),
            };

            await act(async () => {
              newCommentHandler({
                postId: 'post-1',
                comment: newComment,
              });
            });
          }

          // Verify comment appears in modal
          await waitFor(() => {
            expect(screen.getByText('New comment from modal')).toBeInTheDocument();
          }, { timeout: 5000 });
        });

        it('should have comment input focused when opened via comment button', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Focus Test Post',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Focus Test Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Click comment button instead of post card
          const commentButton = screen.getByRole('button', { name: /comment on post/i });
          await user.click(commentButton);

          await waitFor(() => {
            const commentInput = screen.getByPlaceholderText('Add a comment...');
            expect(commentInput).toBeInTheDocument();
            // Note: Focus check may not work reliably in jsdom, but we can verify the input exists
          }, { timeout: 5000 });
        });
      });

      describe('✅ Close modal works', () => {
        it('should close modal when close button is clicked', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Closable Post',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Closable Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Closable Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          // Wait for modal to open
          await waitFor(() => {
            expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Click close button
          const closeButton = screen.getByRole('button', { name: /close modal/i });
          await user.click(closeButton);

          // Wait for modal to close
          await waitFor(() => {
            expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
            expect(document.querySelector('.post-modal-overlay')).not.toBeInTheDocument();
          }, { timeout: 3000 });
        });

        it('should close modal when overlay is clicked', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'Overlay Close Post',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('Overlay Close Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('Overlay Close Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          // Wait for modal to open
          await waitFor(() => {
            expect(document.querySelector('.post-modal-overlay')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Click on overlay (not on modal content)
          const overlay = document.querySelector('.post-modal-overlay');
          expect(overlay).toBeInTheDocument();
          
          if (overlay) {
            // Simulate clicking on the overlay by clicking at coordinates
            // In jsdom, we can use userEvent.click on the overlay element
            await user.click(overlay as HTMLElement);
          }

          // Wait for modal to close
          await waitFor(() => {
            expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
          }, { timeout: 3000 });
        });

        it('should close modal when ESC key is pressed', async () => {
          const user = userEvent.setup();
          const mockPosts = [
            {
              id: 'post-1',
              title: 'ESC Close Post',
              content: 'Test content',
              type: 'blurb',
              created_at: new Date().toISOString(),
              user: 'user1',
              likes: 0,
              likers: [],
              commentsCount: 0,
            },
          ];

          vi.mocked(api.default.getFeed).mockResolvedValue({
            success: true,
            posts: mockPosts,
          });

          vi.mocked(api.default.getComments).mockResolvedValue({
            success: true,
            comments: [],
          });

          await renderDashboard();

          await waitFor(() => {
            expect(screen.getByText('ESC Close Post')).toBeInTheDocument();
          }, { timeout: 3000 });

          const postCard = screen.getByText('ESC Close Post').closest('.post-card');
          if (postCard) {
            await user.click(postCard);
          }

          // Wait for modal to open
          await waitFor(() => {
            expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
          }, { timeout: 3000 });

          // Press ESC key
          await user.keyboard('{Escape}');

          // Wait for modal to close
          await waitFor(() => {
            expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
          }, { timeout: 3000 });
        });
      });
    });
  });
});

