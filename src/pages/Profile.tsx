import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Dashboard/Navbar/Navbar';
import { GiEgyptianProfile } from 'react-icons/gi';
import { useRef, useState, useEffect } from 'react';
import type { Post } from '../types/Post';
import { AiFillLike } from 'react-icons/ai';
import api from '../services/api';
import './Profile.css';
import '../components/Dashboard/Dashboard.css';

export default function Profile() {
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", content: "" });
  const [showDeleteFromEditConfirm, setShowDeleteFromEditConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const compressImage = (dataUrl: string, maxWidth: number = 400, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      // Compress the image
      const compressedImage = await compressImage(dataUrl, 400, 0.8);
      updateAvatar(compressedImage);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Load user's posts from backend
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!user || !user.id) return;
      
      try {
        const response = await api.getUserPosts(user.id);
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
            comments: [], // Comments can be loaded separately if needed
          }));
          
          setUserPosts(transformedPosts);
        } else {
          setUserPosts([]);
        }
      } catch (error) {
        console.error("Error loading user posts:", error);
        setUserPosts([]);
      }
    };

    loadUserPosts();
    
    // Refresh posts every 30 seconds
    const interval = setInterval(loadUserPosts, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

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

  const getMediaElement = (post: Post) => {
    if (post.image && post.type === "photo") {
      return <img src={post.image} alt={post.title} className="profile-post-media-image" />;
    } else if (post.recordedVideo) {
      return (
        <video src={post.recordedVideo} controls className="profile-post-media-video">
          Your browser does not support the video tag.
        </video>
      );
    } else if (post.image) {
      return <img src={post.image} alt={post.title} className="profile-post-media-image" />;
    } else if (post.videoLink) {
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
            className="profile-post-media-youtube"
          />
        );
      }
    }
    return null;
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
        setUserPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === editingPost.id
              ? { ...post, title: trimmedTitle, content: trimmedContent }
              : post
          )
        );

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
      setUserPosts((prevPosts) => {
        const updated = prevPosts.filter((post) => post.id !== editingPost.id);
        return updated;
      });

      // Close modals
      setShowDeleteFromEditConfirm(false);
      handleEditCancel();
    } catch (error: any) {
      console.error("Error deleting post:", error);
      alert(`Failed to delete post: ${error?.message || "Unknown error"}`);
      // Don't close modals on error - let user try again or cancel
    }
  };

  if (!user) {
    return <div>Please log in</div>;
  }

  const hasCustomAvatar = user.avatar && user.avatar !== 'default';

  return (
    <div>
      <Navbar />
      <div className="profile-container">
        <div className="profile-card">
          <h1 className="profile-title">Profile</h1>
          
          <div className="profile-info">
            <div className="profile-avatar">
              {hasCustomAvatar ? (
                <img src={user.avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                <GiEgyptianProfile size={64} />
              )}
            </div>
            
            <div className="profile-details">
              <h2>{user.username}</h2>
              <p>{user.email}</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <button onClick={handleChangePhotoClick} className="change-photo-btn">
            Change profile photo
          </button>

          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        {/* My Posts Section */}
        <div className="my-posts-section">
          <h2 className="my-posts-title">My Posts</h2>
          {userPosts.length === 0 ? (
            <p className="no-posts-message">No posts yet. Create your first post!</p>
          ) : (
            <div className="profile-posts-container">
              {userPosts
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((post) => (
                  <div 
                    key={post.id} 
                    className="profile-post-card"
                    onClick={() => handleEditClick(post)}
                  >
                    <div className="profile-post-header">
                      <h3 className="profile-post-title">{post.title}</h3>
                      <p className="profile-post-meta">
                        posted: {getTimeAgo(post.createdAt)}
                      </p>
                    </div>
                    
                    {getMediaElement(post) && (
                      <div className="profile-post-media">
                        {getMediaElement(post)}
                      </div>
                    )}
                    
                    <div className="profile-post-content">
                      <p>{post.content}</p>
                    </div>
                    
                    <div className="profile-post-footer">
                      <div className="profile-post-likes">
                        <AiFillLike className="profile-like-icon" />
                        <span>{post.likers?.length ?? post.likes ?? 0}</span>
                      </div>
                      {post.comments && post.comments.length > 0 && (
                        <div className="profile-post-comments">
                          <span>{post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

