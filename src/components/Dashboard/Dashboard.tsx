import Navbar from "./Navbar/Navbar";
import "./Dashboard.css";
import { useState, useEffect, useRef } from "react";
import type { Post, Comment } from "../../types/Post";
import { AiFillLike } from "react-icons/ai";
import { GiEgyptianProfile } from "react-icons/gi";
import { useAuth } from "../../contexts/AuthContext";
import { FaEdit, FaComment } from "react-icons/fa";
import api from "../../services/api";
import { getSocket } from "../../services/socket";
import SuggestedUsersModal from "../SuggestedUsersModal";
import TimeAgo from "timeago-react";

export default function Dashboard() {
  const { user, getFollowingList, hasSeenSuggested, markSeenSuggested } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", content: "" });
  const [showDeleteFromEditConfirm, setShowDeleteFromEditConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showSuggestedUsers, setShowSuggestedUsers] = useState(false);
  const [shouldFocusComment, setShouldFocusComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Initialize socket connection on mount and join rooms for feed updates
  useEffect(() => {
    const socket = getSocket();
    
    // Join user-specific room and feed room for real-time post updates
    const setupFeedRooms = () => {
      if (socket.connected && user) {
        // Join user-specific room to receive posts from people we follow
        socket.emit('join-user', user.id);
        // Join general feed room
        socket.emit('join-feed');
        console.log('Joined feed rooms for user:', user.id);
      }
    };

    // Join rooms for all posts in the feed so we can receive updates even when modal isn't open
    const joinAllPostRooms = () => {
      if (socket.connected && posts.length > 0) {
        posts.forEach(post => {
          socket.emit('join-post', post.id);
        });
      }
    };

    if (socket.connected) {
      setupFeedRooms();
      joinAllPostRooms();
    } else {
      socket.once('connect', () => {
        setupFeedRooms();
        joinAllPostRooms();
      });
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [posts, user]);

  // Load posts from API feed
  const fetchFeed = async () => {
    if (!user) {
      setPosts([]);
      setFilteredPosts([]);
      return;
    }

    try {
      const response = await api.getFeed();
      if (response.success && response.posts) {
        // Transform API posts to match Post type
        const transformedPosts: Post[] = response.posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          type: p.type,
          image: p.image_url || undefined,
          videoLink: p.video_url || undefined,
          createdAt: p.created_at,
          user: p.user || p.users?.username || 'Unknown',
          likes: p.likes || 0,
          likers: p.likers || [],
          comments: [], // Will be loaded separately if needed
          // Store initial comment count for display
          _initialCommentCount: p.commentsCount || 0,
        }));
        setPosts(transformedPosts);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
      // Show error message to user
      setPosts([]);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [user]);

  // Refresh feed when following list changes
  useEffect(() => {
    if (!user) return;
    
    const handler = () => {
      console.log('Following changed event received, refreshing feed...');
      fetchFeed();
    };
    
    window.addEventListener('followingChanged', handler as EventListener);
    return () => window.removeEventListener('followingChanged', handler as EventListener);
  }, [user]);

  // Open suggested users modal when Navbar requests it
  // Suggested users modal is opened automatically when the dashboard loads
  // (see effect below that shows modal if the user follows 0 users). We
  // previously supported opening it via a custom event; that behavior has
  // been removed to avoid manual triggering.

  // Filter posts based on search query
  useEffect(() => {
    if (!user) {
      setFilteredPosts([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter((post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  }, [posts, user, searchQuery]);

  // Listen for search updates from Navbar
  useEffect(() => {
    const handleSearchUpdate = (e: CustomEvent) => {
      const query = e.detail?.query || "";
      setSearchQuery(query);
    };

    window.addEventListener("searchUpdate", handleSearchUpdate as EventListener);
    return () => window.removeEventListener("searchUpdate", handleSearchUpdate as EventListener);
  }, []);

  // Scroll to top when component mounts
  // Show suggested users modal once when dashboard loads if user follows 0 users
  useEffect(() => {
    if (user) {
      const alreadySeen = hasSeenSuggested(user.id);
      const followingList = getFollowingList();

      if (!alreadySeen && followingList.length === 0) {
        // Small delay to ensure dashboard is rendered
        setTimeout(() => {
          setShowSuggestedUsers(true);
          markSeenSuggested(user.id);
        }, 500);
      }
    }
  }, [user, getFollowingList, hasSeenSuggested, markSeenSuggested]);

  // for now, use local storage until we have a backend
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load comments when post is selected
  useEffect(() => {
    if (!selectedPost) return;

    const loadComments = async () => {
      try {
        const response = await api.getComments(selectedPost.id);
        if (response.success && response.comments) {
          const formattedComments: Comment[] = response.comments.map((c: any) => {
            // Ensure createdAt is properly formatted
            let createdAtValue = c.createdAt || c.created_at;
            if (!createdAtValue) {
              createdAtValue = new Date().toISOString();
            } else if (typeof createdAtValue === 'string') {
              // If no timezone info, assume UTC and append 'Z'
              if (!createdAtValue.includes('Z') && !createdAtValue.match(/[+-]\d{2}:\d{2}$/)) {
                createdAtValue = createdAtValue.replace(' ', 'T') + 'Z';
              }
            } else {
              createdAtValue = new Date(createdAtValue).toISOString();
            }

            return {
              id: c.id,
              text: c.text || '',
              user: c.user || 'Unknown',
              userPhoto: c.userPhoto || undefined,
              createdAt: createdAtValue,
              timeAgo: c.timeAgo, // Use backend-calculated timeAgo if available
            };
          });
          
          setPosts((prevPosts) => {
            return prevPosts.map((post) => {
              if (post.id === selectedPost.id) {
                return { ...post, comments: formattedComments };
              }
              return post;
            });
          });
          
          setSelectedPost((prev) => {
            if (prev && prev.id === selectedPost.id) {
              return { ...prev, comments: formattedComments };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Failed to load comments:', error);
      }
    };
    
    loadComments();
  }, [selectedPost?.id]);

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();

    // Wait for connection before joining rooms
    const setupSocket = () => {
      const joinRoom = () => {
        if (selectedPost && socket.connected) {
          socket.emit('join-post', selectedPost.id);
          console.log('Joined post room:', selectedPost.id);
        }
      };

      if (socket.connected) {
        joinRoom();
      } else {
        socket.once('connect', joinRoom);
        // Also try after a short delay in case connection is in progress
        setTimeout(() => {
          if (socket.connected) {
            joinRoom();
          }
        }, 100);
      }
    };

    setupSocket();

    // Listen for new comments
    const handleNewComment = (data: { postId: string; comment: Comment | any }) => {
      console.log('Received new-comment event:', data);
      
      // Validate data structure
      if (!data || !data.comment) {
        console.error('Invalid comment data received - missing comment object:', data);
        return;
      }

      const commentData = data.comment;
      
      // Log what we received for debugging
      console.log('Comment data received:', {
        hasId: !!commentData.id,
        hasText: !!commentData.text,
        hasUser: !!commentData.user,
        keys: Object.keys(commentData),
        fullData: commentData,
      });
      
      // If we're completely missing the comment object, skip it
      if (!commentData || (typeof commentData !== 'object')) {
        console.error('Invalid comment data received - not an object:', commentData);
        return;
      }
      
      // Format the comment date - ensure it's a valid ISO string
      let createdAtValue = commentData.createdAt;
      if (!createdAtValue) {
        createdAtValue = new Date().toISOString();
      } else if (typeof createdAtValue === 'string') {
        // If no timezone info, assume UTC and append 'Z'
        if (!createdAtValue.includes('Z') && !createdAtValue.match(/[+-]\d{2}:\d{2}$/)) {
          createdAtValue = createdAtValue.replace(' ', 'T') + 'Z';
        }
      } else {
        // If it's not a string, convert to ISO string
        createdAtValue = new Date(createdAtValue).toISOString();
      }

      // Create formatted comment with fallbacks for missing fields
      const formattedComment: Comment = {
        id: commentData.id || `temp-${Date.now()}`, // Fallback ID if missing
        text: commentData.text || '', // Fallback to empty string if missing
        user: commentData.user || 'Unknown',
        userPhoto: commentData.userPhoto || undefined,
        createdAt: createdAtValue,
      };

      // If we're missing critical fields, log warning but still try to use it
      if (!commentData.id || !commentData.text) {
        console.warn('Comment missing some fields, using fallbacks:', {
          received: commentData,
          formatted: formattedComment,
        });
      }

      console.log('Formatted comment:', formattedComment);

      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.id === data.postId) {
        setSelectedPost((prev) => {
          if (!prev || prev.id !== data.postId) return prev;
          // Check if comment already exists (avoid duplicates)
          const exists = prev.comments?.some(c => c.id === formattedComment.id);
          if (exists) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), formattedComment],
          };
        });
      }

      // Update posts array (always update if post exists in feed)
      setPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post.id === data.postId) {
            const exists = post.comments?.some(c => c.id === formattedComment.id);
            if (exists) return post;
            // If comments array was empty, initialize it
            const currentComments = post.comments || [];
            return {
              ...post,
              comments: [...currentComments, formattedComment],
            };
          }
          return post;
        });
      });
    };

    // Listen for like updates
    const handleLikeUpdate = (data: { postId: string; likes: number; likers: string[]; action: string; userId: string }) => {
      console.log('Received like-updated event:', data);
      
      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.id === data.postId) {
        setSelectedPost((prev) => {
          if (!prev || prev.id !== data.postId) return prev;
          return {
            ...prev,
            likes: data.likes,
            likers: data.likers,
          };
        });
      }

      // Update posts array (always update if post exists in feed)
      setPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post.id === data.postId) {
            return {
              ...post,
              likes: data.likes,
              likers: data.likers,
            };
          }
          return post;
        });
      });
    };

    // Listen for new posts from people we follow
    const handleNewPost = (data: { post: any }) => {
      console.log('Received new-post event:', data);
      
      if (!data || !data.post) {
        console.error('Invalid new-post data:', data);
        return;
      }

      const newPost = data.post;
      
      // Transform the post to match Post type
      const transformedPost: Post = {
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        type: newPost.type,
        image: newPost.image_url || undefined,
        videoLink: newPost.video_url || undefined,
        createdAt: newPost.created_at || newPost.createdAt,
        user: newPost.user || 'Unknown',
        likes: newPost.likes || 0,
        likers: newPost.likers || [],
        comments: [], // Comments will be loaded when post is opened
      };

      // Check if post already exists (avoid duplicates)
      setPosts((prevPosts) => {
        const exists = prevPosts.some(p => p.id === transformedPost.id);
        if (exists) {
          console.log('Post already exists in feed, skipping:', transformedPost.id);
          return prevPosts;
        }
        
        // Add new post to the beginning of the feed
        console.log('Adding new post to feed:', transformedPost.id);
        return [transformedPost, ...prevPosts];
      });
    };

    socket.on('new-comment', handleNewComment);
    socket.on('like-updated', handleLikeUpdate);
    socket.on('new-post', handleNewPost);

    // Handle reconnection - rejoin rooms when reconnected
    const handleReconnect = () => {
      console.log('Socket reconnected, rejoining rooms');
      
      // Rejoin user and feed rooms
      if (user) {
        socket.emit('join-user', user.id);
        socket.emit('join-feed');
      }
      
      // Rejoin post-specific rooms
      if (selectedPost) {
        socket.emit('join-post', selectedPost.id);
      }
      // Rejoin all post rooms
      posts.forEach(post => {
        socket.emit('join-post', post.id);
      });
    };

    socket.on('reconnect', handleReconnect);

    // Cleanup
    return () => {
      // Don't leave rooms on cleanup - keep them joined for real-time updates
      socket.off('new-comment', handleNewComment);
      socket.off('like-updated', handleLikeUpdate);
      socket.off('new-post', handleNewPost);
      socket.off('reconnect', handleReconnect);
    };
  }, [selectedPost, posts]);

  const getTimeAgo = (createdAt: string | Date | undefined): string => {
    if (!createdAt) return 'just now';
    
    try {
      const now = new Date();
      let postDate: Date;
      
      // Handle different input types
      if (createdAt instanceof Date) {
        postDate = createdAt;
      } else if (typeof createdAt === 'string') {
        // Ensure the string is a valid ISO date
        let dateString = createdAt;
        
        // If it's not already in ISO format, try to convert it
        if (!dateString.includes('T') && !dateString.includes('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
          // Try to parse as a date string and convert to ISO
          const tempDate = new Date(dateString);
          if (!isNaN(tempDate.getTime())) {
            dateString = tempDate.toISOString();
          }
        }
        
        postDate = new Date(dateString);
      } else {
        return 'just now';
      }
      
      // Check if date is valid
      if (isNaN(postDate.getTime())) {
        console.warn('Invalid date in getTimeAgo:', createdAt);
        return 'just now';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
      
      // Handle negative differences (future dates) - return "just now" for very recent or future dates
      if (diffInSeconds < 0) {
        return 'just now';
      }

      if (diffInSeconds < 10) {
        return 'just now';
      } else if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
      }
    } catch (error) {
      console.warn('Error in getTimeAgo:', error, 'for date:', createdAt);
      return 'just now';
    }
  };

  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      const hasLiked = post?.likers?.includes(user.id) || false;

      if (hasLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }

      // Don't do optimistic update - let the socket event handle the update
      // This ensures we always have the correct count from the backend database
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // Clear input immediately for snappy UX
    setCommentInputs({ ...commentInputs, [postId]: "" });

    try {
      await api.addComment(postId, commentText);
      // Don't do optimistic update - let the socket event handle the update
      // This ensures we always have the correct comment data (user, date, etc.) from the backend
    } catch (error) {
      console.error('Failed to add comment via API:', error);
      // Restore input on error
      setCommentInputs({ ...commentInputs, [postId]: commentText });
    }
  };

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs({ ...commentInputs, [postId]: value });
  };

  // Get the avatar for a comment - use current user's avatar if it's their comment
  const getCommentAvatar = (comment: Comment) => {
    // If the comment is from the current user, use their current avatar
    if (user && comment.user === user.username) {
      if (user.avatar && user.avatar !== 'default') {
        return user.avatar;
      }
      return null; // Return null to show default icon
    }
    // Otherwise, use the stored avatar from the comment
    return comment.userPhoto;
  };

  const handleDeletePostConfirm = async (confirmed: boolean) => {
    if (!confirmed || !postToDelete) {
      setShowDeletePostConfirm(false);
      setPostToDelete(null);
      return;
    }

    console.log('🗑️ Starting delete process for post:', postToDelete.id);
    console.log('Post details:', { id: postToDelete.id, title: postToDelete.title, user: postToDelete.user });
    console.log('Current user:', user);

    try {
      // Delete from database (this will cascade to comments and likes)
      console.log('Calling API to delete post...');
      const result = await api.deletePost(postToDelete.id);
      console.log('✅ Delete API call successful:', result);

      // Remove from local state
      setPosts((prevPosts) => {
        const updated = prevPosts.filter((post) => post.id !== postToDelete.id);
        console.log(`✅ Post removed from local state. Posts before: ${prevPosts.length}, after: ${updated.length}`);
        return updated;
      });

      // Close modal and reset state
      setShowDeletePostConfirm(false);
      setPostToDelete(null);
      
      // If the deleted post was selected, close the detail view
      if (selectedPost && selectedPost.id === postToDelete.id) {
        setSelectedPost(null);
      }

      console.log('✅ Delete process completed successfully!');
      alert('Post deleted successfully!');
    } catch (error: any) {
      console.error('❌ Error deleting post:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
      });
      alert(`Failed to delete post: ${error?.message || 'Unknown error'}. Check console for details.`);
      setShowDeletePostConfirm(false);
      setPostToDelete(null);
    }
  };

  const handleDeleteSuccessOk = () => {
    setShowDeleteSuccess(false);
  };

  const handleEditClick = (post: Post) => {
    setEditingPost(post);
    setEditFormData({
      title: post.title,
      content: post.content,
    });
  };

  const handleEditCancel = () => {
    setEditingPost(null);
    setEditFormData({ title: "", content: "" });
  };

  const handleSaveChanges = async () => {
    if (!editingPost) return;

    const trimmedTitle = editFormData.title.trim();
    const trimmedContent = editFormData.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      alert("Title and content cannot be empty");
      return;
    }

    try {
      const result = await api.updatePost(editingPost.id, trimmedTitle, trimmedContent);
      
      if (result.success) {
        // Update the post in local state
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === editingPost.id
              ? { ...post, title: trimmedTitle, content: trimmedContent }
              : post
          )
        );

        // Update selectedPost if it's the same post
        if (selectedPost && selectedPost.id === editingPost.id) {
          setSelectedPost({
            ...selectedPost,
            title: trimmedTitle,
            content: trimmedContent,
          });
        }

        // Close edit modal
        handleEditCancel();
      }
    } catch (error: any) {
      console.error("Error updating post:", error);
      alert(`Failed to update post: ${error?.message || "Unknown error"}`);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editingPost) return;

    try {
      await api.deletePost(editingPost.id);
      
      // Remove from local state
      setPosts((prevPosts) => {
        const updated = prevPosts.filter((post) => post.id !== editingPost.id);
        return updated;
      });

      // Close modals
      setShowDeleteFromEditConfirm(false);
      handleEditCancel();
      
      // If the deleted post was selected, close the detail view
      if (selectedPost && selectedPost.id === editingPost.id) {
        setSelectedPost(null);
      }

      // Show success message
      setShowDeleteSuccess(true);
    } catch (error: any) {
      console.error("Error deleting post:", error);
      alert(`Failed to delete post: ${error?.message || "Unknown error"}`);
      // Don't close modals on error - let user try again or cancel
    }
  };

  const getMediaElement = (post: Post, isModal: boolean = false) => {
    // Priority: photo capture > video capture > uploaded file > YouTube link
    if (post.image && post.type === "photo") {
      // Photo capture
      return <img src={post.image} alt={post.title} className={isModal ? "modal-media-image" : "post-media-image"} />;
    } else if (post.recordedVideo) {
      // Video capture preview
      return (
        <video src={post.recordedVideo} controls className={isModal ? "modal-media-video" : "post-media-video"}>
          Your browser does not support the video tag.
        </video>
      );
    } else if (post.image) {
      // Uploaded file (image)
      return <img src={post.image} alt={post.title} className={isModal ? "modal-media-image" : "post-media-image"} />;
    } else if (post.videoLink) {
      // YouTube link - extract video ID and create embed
      const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
      };

      const videoId = getYouTubeId(post.videoLink);
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={isModal ? "modal-media-youtube" : "post-media-youtube"}
          />
        );
      }
    }
    return null;
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeletePostConfirm) {
          handleDeletePostConfirm(false);
        } else if (selectedPost) {
          setSelectedPost(null);
          setShouldFocusComment(false);
        }
      }
    };

    if (selectedPost || showDeletePostConfirm) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      // Always restore body overflow when the effect cleans up to avoid leaving
      // the document unscrollable if the effect's captured values prevented
      // the previous cleanup from unsetting it.
      document.body.style.overflow = "unset";
    };
  }, [selectedPost, showDeletePostConfirm]);

  // Focus comment input when modal opens via comment button
  useEffect(() => {
    if (selectedPost && shouldFocusComment && commentInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        commentInputRef.current?.focus();
        setShouldFocusComment(false);
      }, 100);
    }
  }, [selectedPost, shouldFocusComment]);

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h1 className="dashboard-title">Dashboard</h1>
  {/* authMessage removed: posts require sign-in so unauthenticated likes shouldn't occur */}
        
        {!user ? (
          <p className="no-posts">Please log in to view your posts.</p>
        ) : filteredPosts.length === 0 && searchQuery ? (
          <p className="no-posts">No posts found matching "{searchQuery}"</p>
        ) : filteredPosts.length === 0 ? (
          <p className="no-posts">No posts yet. Create your first post!</p>
        ) : (
          <div className="posts-container">
            {filteredPosts
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((post) => (
                <div 
                  key={post.id} 
                  className="post-card"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="post-header">
                    <h2 className="post-title">{post.title}</h2>
                    <p className="post-meta">
                      by: {post.user}, posted: {getTimeAgo(post.createdAt)}
                    </p>
                  </div>
                  
                  <div className="post-body">
                    {getMediaElement(post) && (
                      <div className="post-media">
                        {getMediaElement(post)}
                      </div>
                    )}
                    <div className="post-content">
                      <p>{post.content}</p>
                    </div>
                  </div>
                  
                  <div className="post-footer">
                    <div className="post-actions-left">
                      {(() => {
                        const hasLiked = !!(user && post.likers?.includes(user.id));
                        let tooltip = "";
                        if (post.likers && post.likers.length > 0) {
                          if (user && post.likers.includes(user.id)) {
                            tooltip = post.likers.length > 1 ? `You and ${post.likers.length - 1} others` : "You";
                          } else {
                            tooltip = `${post.likers.length} like${post.likers.length !== 1 ? 's' : ''}`;
                          }
                        }

                        return (
                          <button
                            className={`like-button ${hasLiked ? 'liked' : ''}`}
                            onClick={(e) => handleLike(e, post.id)}
                            aria-label="Like post"
                            aria-pressed={hasLiked}
                            title={tooltip}
                          >
                            <AiFillLike className="like-icon" />
                            <span className="like-count">{post.likers?.length ?? post.likes ?? 0}</span>
                          </button>
                        );
                      })()}
                      <button
                        className="comment-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShouldFocusComment(true);
                          setSelectedPost(post);
                        }}
                        aria-label="Comment on post"
                        title={`${post.comments?.length || 0} comment${(post.comments?.length || 0) !== 1 ? 's' : ''}`}
                      >
                        <FaComment className="comment-icon" />
                        <span className="comment-count">
                          {post.comments && post.comments.length > 0 
                            ? post.comments.length 
                            : (post as any)._initialCommentCount || 0}
                        </span>
                      </button>
                    </div>
                    {user && post.user === user.username && (
                      <div className="post-actions-right">
                        <button
                          className="edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(post);
                          }}
                          aria-label="Edit post"
                        >
                          <FaEdit className="edit-icon" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
        
        {/* Modal/Lightbox */}
        {selectedPost && (
          <div 
            className="post-modal-overlay"
            onClick={() => setSelectedPost(null)}
          >
            <div 
              className="post-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="modal-close"
                onClick={() => setSelectedPost(null)}
                aria-label="Close modal"
              >
                ×
              </button>
              
              <div className="modal-header">
                <h2 className="modal-title">{selectedPost.title}</h2>
                <p className="modal-meta">
                  by: {selectedPost.user}, posted: {getTimeAgo(selectedPost.createdAt)}
                </p>
              </div>

              {getMediaElement(selectedPost, true) && (
                <div className="modal-media">
                  {getMediaElement(selectedPost, true)}
                </div>
              )}

              <div className="modal-body">
                <p className="modal-content">{selectedPost.content}</p>
              </div>

              <div className="modal-footer">
                {(() => {
                  const hasLiked = !!(user && selectedPost.likers?.includes(user.id));
                  let tooltip = "";
                  if (selectedPost.likers && selectedPost.likers.length > 0) {
                    if (user && selectedPost.likers.includes(user.id)) {
                      tooltip = selectedPost.likers.length > 1 ? `You and ${selectedPost.likers.length - 1} others` : "You";
                    } else {
                      tooltip = `${selectedPost.likers.length} like${selectedPost.likers.length !== 1 ? 's' : ''}`;
                    }
                  }

                  return (
                    <button
                      className={`like-button ${hasLiked ? 'liked' : ''}`}
                      onClick={(e) => handleLike(e, selectedPost.id)}
                      aria-label="Like post"
                      aria-pressed={hasLiked}
                      title={tooltip}
                    >
                      <AiFillLike className="like-icon" />
                      <span className="like-count">{selectedPost.likers?.length ?? selectedPost.likes ?? 0}</span>
                    </button>
                  );
                })()}
              </div>

              {/* Comments Section in Modal */}
              <div className="modal-comments-section">
                {/* Display Comments */}
                {selectedPost.comments && selectedPost.comments.length > 0 && (
                  <div className="comments-list">
                    {selectedPost.comments.map((comment) => {
                      const avatar = getCommentAvatar(comment);
                      return (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-avatar">
                            {avatar ? (
                              <img src={avatar} alt={comment.user} className="comment-photo" />
                            ) : (
                              <GiEgyptianProfile size={24} className="comment-icon" />
                            )}
                          </div>
                          <div className="comment-content">
                            <div className="comment-header">
                              <span className="comment-username">{comment.user}</span>
                              <span className="comment-time">
                              <TimeAgo datetime={comment.createdAt} live={true} locale="en_US"/>
                              </span>
                            </div>
                            <p className="comment-text">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment Input */}
                <form 
                  className="comment-form"
                  onSubmit={(e) => handleCommentSubmit(e, selectedPost.id)}
                >
                  <input
                    ref={commentInputRef}
                    type="text"
                    placeholder="Add a comment..."
                    value={commentInputs[selectedPost.id] || ""}
                    onChange={(e) => handleCommentInputChange(selectedPost.id, e.target.value)}
                    className="comment-input"
                  />
                  <button type="submit" className="comment-submit-btn">
                    Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
          </div>
        )}

        {/* Delete Post Confirmation Modal (from trash icon) */}
        {showDeletePostConfirm && postToDelete && (
          <div 
            className="post-modal-overlay"
            onClick={() => handleDeletePostConfirm(false)}
          >
            <div 
              className="delete-confirm-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="delete-confirm-title">Are you sure?</h3>
              <p className="delete-confirm-message">This action cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button 
                  type="button" 
                  className="delete-confirm-no-btn" 
                  onClick={() => handleDeletePostConfirm(false)}
                >
                  No
                </button>
                <button 
                  type="button" 
                  className="delete-confirm-yes-btn" 
                  onClick={() => handleDeletePostConfirm(true)}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Success Modal */}
        {showDeleteSuccess && (
          <div 
            className="post-modal-overlay"
            onClick={handleDeleteSuccessOk}
          >
            <div 
              className="delete-success-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="delete-success-title">Post deleted</h3>
              <div className="delete-success-actions">
                <button 
                  type="button" 
                  className="delete-success-ok-btn" 
                  onClick={handleDeleteSuccessOk}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Post Modal */}
        {editingPost && !showDeleteFromEditConfirm && (
          <div 
            className="post-modal-overlay"
            onClick={handleEditCancel}
          >
            <div 
              className="edit-post-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="edit-post-title">Edit Post</h3>
              <div className="edit-post-form">
                <div className="edit-form-group">
                  <label htmlFor="edit-title">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    className="edit-form-input"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    placeholder="Enter post title"
                  />
                </div>
                <div className="edit-form-group">
                  <label htmlFor="edit-content">Content</label>
                  <textarea
                    id="edit-content"
                    className="edit-form-textarea"
                    value={editFormData.content}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    placeholder="Enter post content"
                    rows={6}
                  />
                </div>
              </div>
              <div className="edit-post-actions">
                <button 
                  type="button" 
                  className="edit-cancel-btn" 
                  onClick={handleEditCancel}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="edit-delete-btn" 
                  onClick={() => setShowDeleteFromEditConfirm(true)}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  className="edit-save-btn" 
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal from Edit */}
        {showDeleteFromEditConfirm && editingPost && (
          <div 
            className="post-modal-overlay"
            onClick={() => setShowDeleteFromEditConfirm(false)}
          >
            <div 
              className="delete-confirm-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="delete-confirm-title">Are you sure?</h3>
              <p className="delete-confirm-message">This action cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button 
                  type="button" 
                  className="delete-confirm-no-btn" 
                  onClick={() => setShowDeleteFromEditConfirm(false)}
                >
                  No
                </button>
                <button 
                  type="button" 
                  className="delete-confirm-yes-btn" 
                  onClick={handleDeleteFromEdit}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Users Modal */}
        <SuggestedUsersModal 
          isOpen={showSuggestedUsers} 
          onClose={() => setShowSuggestedUsers(false)}
        />
      </div>
    </div>
  );
}