import Navbar from "./Navbar/Navbar";
import "./Dashboard.css";
import { useState, useEffect } from "react";
import type { Post, Comment } from "../../types/Post";
import { AiFillLike } from "react-icons/ai";
import { GiEgyptianProfile } from "react-icons/gi";
import { useAuth } from "../../contexts/AuthContext";
import { FiEdit2 } from "react-icons/fi";
import SuggestedUsersModal from "../SuggestedUsersModal";

export default function Dashboard() {
  const { user, getFollowingList } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", content: "", videoLink: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showSuggestedUsers, setShowSuggestedUsers] = useState(false);

  // Filter posts based on current user and search query
  useEffect(() => {
    const filterPosts = () => {
      if (!user) {
        setFilteredPosts([]);
        return;
      }

      // First filter by current user
      let userPosts = posts.filter((post) => post.user === user.username);
      
      // Then filter by search query if present
      const query = localStorage.getItem("searchQuery") || "";
      setSearchQuery(query);
      
      if (!query.trim()) {
        setFilteredPosts(userPosts);
      } else {
        const filtered = userPosts.filter((post) =>
          post.title.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredPosts(filtered);
      }
    };

    filterPosts();
  }, [posts, user]);

  // Listen for search updates from Navbar
  useEffect(() => {
    const handleSearchUpdate = () => {
      if (!user) {
        setFilteredPosts([]);
        return;
      }

      // First filter by current user
      let userPosts = posts.filter((post) => post.user === user.username);
      
      const query = localStorage.getItem("searchQuery") || "";
      setSearchQuery(query);
      
      if (!query.trim()) {
        setFilteredPosts(userPosts);
      } else {
        const filtered = userPosts.filter((post) =>
          post.title.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredPosts(filtered);
      }
    };

    window.addEventListener("searchUpdate", handleSearchUpdate);
    return () => window.removeEventListener("searchUpdate", handleSearchUpdate);
  }, [posts, user]);

  // Show suggested users modal when dashboard loads if user follows 0 users
  useEffect(() => {
    if (user) {
      const checkFollowingCount = () => {
        const followingList = getFollowingList();
        // Show modal if user follows 0 users
        if (followingList.length === 0) {
          setShowSuggestedUsers(true);
        } else {
          setShowSuggestedUsers(false);
        }
      };
      
      // Check immediately
      checkFollowingCount();
      
      // Also check periodically to catch changes from other tabs/components
      const interval = setInterval(checkFollowingCount, 1000);
      
      return () => clearInterval(interval);
    }
  }, [user, getFollowingList]);

  // for now, use local storage until we have a backend
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadPosts = () => {
      const storedPosts = localStorage.getItem("posts");
      if (storedPosts) {
        try {
          const parsedPosts = JSON.parse(storedPosts) as Post[];
          // Ensure `likers` exists for backward compatibility
          const normalized = parsedPosts.map(p => ({ ...p, likers: p.likers ?? [] }));
          setPosts(normalized);
        } catch (error) {
          console.error("Error parsing posts from localStorage:", error);
        }
      }
    };

    loadPosts();
    
    // Update posts every second to refresh time ago
    const interval = setInterval(loadPosts, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const postDate = new Date(createdAt);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
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
  };

  const handleLike = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation(); // Prevent opening modal when clicking like
    if (!user) return; // posts are only accessible to signed-in users, so silently return

    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id !== postId) return post;

        const likers = post.likers ? [...post.likers] : [];
        const hasLiked = likers.includes(user.username);

        const nextLikers = hasLiked ? likers.filter(u => u !== user.username) : [...likers, user.username];

        // Keep the legacy `likes` count for compatibility but derive from likers when present
        const likesCount = nextLikers.length;

        return {
          ...post,
          likers: nextLikers,
          likes: likesCount,
        };
      });

      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.id === postId) {
        const updatedPost = updatedPosts.find(p => p.id === postId);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }

      localStorage.setItem("posts", JSON.stringify(updatedPosts));
      return updatedPosts;
    });
  };

  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    if (!user) {
      console.error("User not authenticated");
      return;
    }

    const newComment: Comment = {
      id: crypto.randomUUID(),
      text: commentText,
      user: user.username,
      userPhoto: user.avatar && user.avatar !== 'default' ? user.avatar : undefined,
      createdAt: new Date().toISOString(),
    };

    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), newComment],
          };
        }
        return post;
      });

      // Update localStorage
      localStorage.setItem("posts", JSON.stringify(updatedPosts));

      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.id === postId) {
        const updatedPost = updatedPosts.find(p => p.id === postId);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }

      return updatedPosts;
    });
    
    // Clear comment input
    setCommentInputs({ ...commentInputs, [postId]: "" });
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

  const handleEditClick = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation(); // Prevent opening modal when clicking edit
    setEditingPost(post);
    setEditFormData({
      title: post.title,
      content: post.content,
      videoLink: post.videoLink || "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id === editingPost.id) {
          return {
            ...post,
            title: editFormData.title,
            content: editFormData.content,
            videoLink: editFormData.videoLink || undefined,
          };
        }
        return post;
      });

      // Update localStorage
      localStorage.setItem("posts", JSON.stringify(updatedPosts));

      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.id === editingPost.id) {
        const updatedPost = updatedPosts.find(p => p.id === editingPost.id);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }

      return updatedPosts;
    });

    setEditingPost(null);
    setEditFormData({ title: "", content: "", videoLink: "" });
  };

  const handleEditCancel = () => {
    setEditingPost(null);
    setEditFormData({ title: "", content: "", videoLink: "" });
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = (confirmed: boolean) => {
    if (confirmed && editingPost) {
      // Delete the post
      setPosts((prevPosts) => {
        const updatedPosts = prevPosts.filter((post) => post.id !== editingPost.id);
        localStorage.setItem("posts", JSON.stringify(updatedPosts));
        return updatedPosts;
      });

      // Close modals and show success
      setEditingPost(null);
      setShowDeleteConfirm(false);
      setShowDeleteSuccess(true);
    } else {
      // User clicked No, just close the confirmation modal
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteSuccessOk = () => {
    setShowDeleteSuccess(false);
    setSelectedPost(null);
    // Posts are already updated in state, so the dashboard will automatically refresh
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
        if (showDeleteConfirm) {
          handleDeleteConfirm(false);
        } else if (showDeleteSuccess) {
          handleDeleteSuccessOk();
        } else if (editingPost) {
          handleEditCancel();
        } else if (selectedPost) {
          setSelectedPost(null);
        }
      }
    };

    if (selectedPost || editingPost || showDeleteConfirm || showDeleteSuccess) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (!selectedPost && !editingPost && !showDeleteConfirm && !showDeleteSuccess) {
        document.body.style.overflow = "unset";
      }
    };
  }, [selectedPost, editingPost, showDeleteConfirm, showDeleteSuccess]);

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
                    {(() => {
                      const hasLiked = !!(user && post.likers?.includes(user.username));
                      let tooltip = "";
                      if (post.likers && post.likers.length > 0) {
                        if (user && post.likers.includes(user.username)) {
                          tooltip = post.likers.length > 1 ? `You and ${post.likers.length - 1} others` : "You";
                        } else {
                          tooltip = post.likers.join(", ");
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
                    {user && post.user === user.username && (
                      <button
                        className="edit-button"
                        onClick={(e) => handleEditClick(e, post)}
                        aria-label="Edit post"
                      >
                        <FiEdit2 className="edit-icon" />
                        Edit
                      </button>
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
                  const hasLiked = !!(user && selectedPost.likers?.includes(user.username));
                  let tooltip = "";
                  if (selectedPost.likers && selectedPost.likers.length > 0) {
                    if (user && selectedPost.likers.includes(user.username)) {
                      tooltip = selectedPost.likers.length > 1 ? `You and ${selectedPost.likers.length - 1} others` : "You";
                    } else {
                      tooltip = selectedPost.likers.join(", ");
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
                {user && selectedPost.user === user.username && (
                  <button
                    className="edit-button"
                    onClick={(e) => handleEditClick(e, selectedPost)}
                    aria-label="Edit post"
                  >
                    <FiEdit2 className="edit-icon" />
                    Edit
                  </button>
                )}
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
                              <span className="comment-time">{getTimeAgo(comment.createdAt)}</span>
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

        {/* Edit Post Modal */}
        {editingPost && (
          <div 
            className="post-modal-overlay"
            onClick={handleEditCancel}
          >
            <div 
              className="edit-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="modal-close"
                onClick={handleEditCancel}
                aria-label="Close edit modal"
              >
                ×
              </button>
              
              <h2 className="edit-modal-title">Edit Post</h2>
              
              <form onSubmit={handleEditSubmit} className="edit-form">
                <div className="edit-form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    required
                    className="edit-input"
                  />
                </div>
                
                <div className="edit-form-group">
                  <label>Content</label>
                  <textarea
                    value={editFormData.content}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    required
                    rows={6}
                    className="edit-textarea"
                  />
                </div>
                
                {editingPost.type === "video" && (
                  <div className="edit-form-group">
                    <label>YouTube Link (Optional)</label>
                    <input
                      type="text"
                      value={editFormData.videoLink}
                      onChange={(e) => setEditFormData({ ...editFormData, videoLink: e.target.value })}
                      placeholder="https://youtube.com/..."
                      className="edit-input"
                    />
                  </div>
                )}
                
                <div className="edit-form-actions">
                  <button type="button" className="edit-cancel-btn" onClick={handleEditCancel}>
                    Cancel
                  </button>
                  <button type="button" className="edit-delete-btn" onClick={handleDeleteClick}>
                    Delete
                  </button>
                  <button type="submit" className="edit-save-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && editingPost && (
          <div 
            className="post-modal-overlay"
            onClick={() => handleDeleteConfirm(false)}
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
                  onClick={() => handleDeleteConfirm(false)}
                >
                  No
                </button>
                <button 
                  type="button" 
                  className="delete-confirm-yes-btn" 
                  onClick={() => handleDeleteConfirm(true)}
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

        {/* Suggested Users Modal */}
        <SuggestedUsersModal 
          isOpen={showSuggestedUsers} 
          onClose={() => setShowSuggestedUsers(false)}
        />
      </div>
    </div>
  );
}