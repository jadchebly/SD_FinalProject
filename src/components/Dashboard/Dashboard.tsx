import Navbar from "./Navbar/Navbar";
import "./Dashboard.css";
import { useState, useEffect } from "react";
import type { Post, Comment } from "../../types/Post";
import { AiFillLike } from "react-icons/ai";
import { GiEgyptianProfile } from "react-icons/gi";
import { useAuth } from "../../contexts/AuthContext";
import { FaEdit, FaComment } from "react-icons/fa";
import api from "../../services/api";
import SuggestedUsersModal from "../SuggestedUsersModal";

export default function Dashboard() {
  const { user, getFollowingList } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", content: "" });
  const [showSuggestedUsers, setShowSuggestedUsers] = useState(false);

  // Load posts from API feed
  useEffect(() => {
    const loadPosts = async () => {
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
          }));
          
          setPosts(transformedPosts);
        }
      } catch (error) {
        console.error('Failed to load feed:', error);
        // Show error message to user
        setPosts([]);
      }
    };

    loadPosts();
  }, [user]);

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
      // Check if we've already shown the modal in this session
      const hasShownModal = sessionStorage.getItem(`suggestedUsersShown_${user.id}`);
      
      if (!hasShownModal) {
        const followingList = getFollowingList();
        // Show modal if user follows 0 users
        if (followingList.length === 0) {
          // Small delay to ensure dashboard is rendered
          setTimeout(() => {
            setShowSuggestedUsers(true);
            // Mark that we've shown the modal for this user in this session
            sessionStorage.setItem(`suggestedUsersShown_${user.id}`, 'true');
          }, 500);
        }
      }
    }
  }, [user, getFollowingList]);

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
          const formattedComments: Comment[] = response.comments.map((c: any) => ({
            id: c.id,
            text: c.text,
            user: c.user,
            userPhoto: c.userPhoto || undefined,
            createdAt: c.createdAt,
          }));
          
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

      // Update local state
      setPosts((prevPosts) => {
        const updatedPosts = prevPosts.map((post) => {
          if (post.id !== postId) return post;

          const likers = post.likers ? [...post.likers] : [];
          const nextLikers = hasLiked 
            ? likers.filter(id => id !== user.id)
            : [...likers, user.id];

          return {
            ...post,
            likers: nextLikers,
            likes: nextLikers.length,
          };
        });

        // Update selectedPost if it's the same post
        if (selectedPost && selectedPost.id === postId) {
          const updatedPost = updatedPosts.find(p => p.id === postId);
          if (updatedPost) {
            setSelectedPost(updatedPost);
          }
        }

        return updatedPosts;
      });
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
    }
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

      // Close confirmation modal and reset state
      setShowDeletePostConfirm(false);
      setPostToDelete(null);
      
      // If the deleted post was selected, close the detail view
      if (selectedPost && selectedPost.id === postToDelete.id) {
        setSelectedPost(null);
      }

      console.log('✅ Delete process completed successfully!');
      // Show success modal instead of alert
      setShowDeleteSuccess(true);
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
        }
      }
    };

    if (selectedPost || showDeletePostConfirm) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (!selectedPost && !showDeletePostConfirm) {
        document.body.style.overflow = "unset";
      }
    };
  }, [selectedPost, showDeletePostConfirm]);

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
                          // TODO: Implement comments
                        }}
                        aria-label="Comment on post"
                        title="Comment"
                      >
                        <FaComment className="comment-icon" />
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
        {editingPost && (
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
                  className="edit-save-btn" 
                  onClick={handleSaveChanges}
                >
                  Save Changes
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