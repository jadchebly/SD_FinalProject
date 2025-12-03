import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Dashboard/Navbar/Navbar';
import { GiEgyptianProfile } from 'react-icons/gi';
import { useRef, useState, useEffect, useMemo } from 'react';
import type { Post } from '../types/Post';
import { AiFillLike } from 'react-icons/ai';
import api from '../services/api';
import './Profile.css';
import '../components/Dashboard/Dashboard.css';

export default function Profile() {
  const { user, logout, updateAvatar, followUser, unfollowUser } = useAuth();
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [profileInfo, setProfileInfo] = useState<any | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", content: "" });
  const [showDeleteFromEditConfirm, setShowDeleteFromEditConfirm] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [modalFollowStatus, setModalFollowStatus] = useState<Record<string, boolean>>({});

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
      await updateAvatar(compressedImage);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Memoize profileId to ensure it's stable and always uses paramId when available
  const profileId = useMemo(() => {
    return paramId !== undefined ? paramId : (user?.id || '');
  }, [paramId, user?.id]);

  // Use ref to store current profileId for interval callback
  const profileIdRef = useRef<string>('');
  
  // Load user's posts from backend
  useEffect(() => {
    if (!profileId) return;
    
    // Update ref whenever profileId changes
    profileIdRef.current = profileId;

    const loadUserPosts = async () => {
      // Always use the latest profileId from ref
      const currentProfileId = profileIdRef.current;
      if (!currentProfileId) return;

      try {
        const response = await api.getUserPosts(currentProfileId);
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
            comments: [], // will load comments below
          }));
          
          setUserPosts(transformedPosts);

          // Load comments for each post in parallel and attach them to posts
          try {
            await Promise.all(transformedPosts.map(async (post) => {
              try {
                const cRes = await api.getComments(post.id);
                if (cRes && cRes.success && Array.isArray(cRes.comments)) {
                  const mapped = cRes.comments.map((c: any) => ({
                    id: c.id,
                    text: c.text,
                    user: (c.user && (c.user.username || c.user)) || c.user_id || 'Unknown',
                    userPhoto: c.user?.avatar_url || c.userPhoto || undefined,
                    createdAt: c.created_at || c.createdAt || new Date().toISOString(),
                  }));
                  setUserPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments: mapped } : p));
                }
              } catch (e) {
                console.warn('Failed to load comments for post', post.id, e);
              }
            }));
          } catch (e) {
            console.warn('Failed to load comments for posts', e);
          }
        } else {
          setUserPosts([]);
        }
      } catch (error) {
        console.error("Error loading user posts:", error);
        setUserPosts([]);
      }
    };

    loadUserPosts();
    
    // Refresh posts every 30 seconds - uses ref to get latest profileId
    const interval = setInterval(() => {
      loadUserPosts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [profileId]);

  // Load profile metadata (followers/following/isFollowing) when viewing someone else's profile
  useEffect(() => {
    if (!profileId) return;

    const loadProfile = async () => {
      try {
        const res = await api.getUserProfile(profileId);
        if (res && res.success) {
          setProfileInfo(res.user || res.profile || null);
        } else {
          setProfileInfo(null);
        }
      } catch (err) {
        console.error('Failed to load profile info:', err);
        setProfileInfo(null);
      }
    };

    loadProfile();
  }, [profileId]);

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

  const handleLikeToggle = async (post: Post) => {
    if (!user) return;
    const userId = user.id;
    const isLiked = post.likers?.includes(userId);
    try {
      if (isLiked) {
        await api.unlikePost(post.id);
        setUserPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likers: (p.likers || []).filter(id => id !== userId) } : p));
        if (selectedPost && selectedPost.id === post.id) {
          setSelectedPost({ ...selectedPost, likers: (selectedPost.likers || []).filter(id => id !== userId) });
        }
      } else {
        await api.likePost(post.id);
        setUserPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likers: [...(p.likers || []), userId] } : p));
        if (selectedPost && selectedPost.id === post.id) {
          setSelectedPost({ ...selectedPost, likers: [...(selectedPost.likers || []), userId] });
        }
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
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
      const res = await api.addComment(postId, commentText);
      if (res && res.success) {
        // Normalize backend comment to Comment shape
        const c = res.comment;
        const newComment = {
          id: c?.id ?? `c_${Date.now()}`,
          text: commentText,
          user: typeof c?.user === 'string' ? c.user : (c?.user?.username ?? user.username),
          userPhoto: c?.userPhoto ?? c?.user?.avatar_url ?? undefined,
          createdAt: c?.createdAt ?? c?.created_at ?? new Date().toISOString(),
        };
        setUserPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
          )
        );
        // keep selectedPost in sync if modal is open for this post
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({ ...selectedPost, comments: [...(selectedPost.comments || []), newComment] });
        }
      } else {
        // optimistic comment in correct shape
        const newComment = {
          id: `c_${Date.now()}`,
          text: commentText,
          user: user.username,
          userPhoto: user.avatar ?? undefined,
          createdAt: new Date().toISOString(),
        };
        setUserPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
          )
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({ ...selectedPost, comments: [...(selectedPost.comments || []), newComment] });
        }
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // Open a post in the modal and ensure comments are loaded for it
  const openPostModal = async (post: Post) => {
    try {
      const cRes = await api.getComments(post.id);
      let mapped: any[] = post.comments || [];
      if (cRes && cRes.success && Array.isArray(cRes.comments)) {
        mapped = cRes.comments.map((c: any) => ({
          id: c.id,
          text: c.text,
          user: (c.user && (c.user.username || c.user)) || c.user || 'Unknown',
          userPhoto: c.userPhoto || c.user?.avatar_url || undefined,
          createdAt: c.createdAt || c.created_at || new Date().toISOString(),
        }));
      }

      const updated = { ...post, comments: mapped } as Post;
      setUserPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      setSelectedPost(updated);
    } catch (e) {
      console.warn('Failed to load comments for post', post.id, e);
      setSelectedPost(post);
    }
  };

  const handleOpenFollowersModal = async () => {
    if (!user || !profileInfo) return;
    try {
      const res = await api.getFollowers(user.id);
      console.log('Followers modal response:', res);
      if (res && res.success) {
        const users = res.users || [];
        console.log('Followers users:', users);
        setFollowersList(users);
        const statusMap: Record<string, boolean> = {};
        users.forEach((u: any) => {
          statusMap[u.id] = u.isFollowing || false;
        });
        setModalFollowStatus(statusMap);
        setShowFollowersModal(true);
      } else {
        console.warn('Followers modal response missing success or users:', res);
        setFollowersList([]);
        setShowFollowersModal(true);
      }
    } catch (err) {
      console.error('Failed to load followers:', err);
      setFollowersList([]);
      setShowFollowersModal(true);
    }
  };

  const handleOpenFollowingModal = async () => {
    if (!user || !profileInfo) return;
    try {
      const res = await api.getUserFollowing(user.id);
      console.log('Following modal response:', res);
      if (res && res.success) {
        const users = res.users || [];
        console.log('Following users:', users);
        setFollowingList(users);
        const statusMap: Record<string, boolean> = {};
        users.forEach((u: any) => {
          statusMap[u.id] = u.isFollowing || false;
        });
        setModalFollowStatus(statusMap);
        setShowFollowingModal(true);
      } else {
        console.warn('Following modal response missing success or users:', res);
        setFollowingList([]);
        setShowFollowingModal(true);
      }
    } catch (err) {
      console.error('Failed to load following:', err);
      setFollowingList([]);
      setShowFollowingModal(true);
    }
  };

  const handleCloseFollowersModal = () => {
    setShowFollowersModal(false);
    // Reload profile info to update counts
    if (user) {
      const loadProfile = async () => {
        try {
          const res = await api.getUserProfile(user.id);
          if (res && res.success) {
            setProfileInfo(res.user || res.profile || null);
          }
        } catch (err) {
          console.error('Failed to reload profile info:', err);
        }
      };
      loadProfile();
    }
  };

  const handleCloseFollowingModal = () => {
    setShowFollowingModal(false);
    // Reload profile info to update counts
    if (user) {
      const loadProfile = async () => {
        try {
          const res = await api.getUserProfile(user.id);
          if (res && res.success) {
            setProfileInfo(res.user || res.profile || null);
          }
        } catch (err) {
          console.error('Failed to reload profile info:', err);
        }
      };
      loadProfile();
    }
  };

  const handleModalFollowToggle = async (userId: string) => {
    const isFollowing = modalFollowStatus[userId] || false;
    try {
      if (isFollowing) {
        await api.unfollowUser(userId);
        setModalFollowStatus((prev) => ({ ...prev, [userId]: false }));
      } else {
        await api.followUser(userId);
        setModalFollowStatus((prev) => ({ ...prev, [userId]: true }));
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  if (!user) {
    return <div>Please log in</div>;
  }

  // Use the memoized profileId (defined above)
  const isOwnProfile = !paramId || paramId === user.id;
  const displayUser = isOwnProfile ? user : (profileInfo ? {
    id: profileInfo.id,
    username: profileInfo.username,
    email: profileInfo.email,
    avatar: profileInfo.avatar_url || profileInfo.avatar || null
  } : { id: profileId, username: 'User', email: '' });

  const hasCustomAvatar = displayUser?.avatar && displayUser.avatar !== 'default';

  return (
    <div>
      <Navbar />
      <div className="profile-container">
        <div className="profile-card">
          <h1 className="profile-title">Profile</h1>
          
          <div className="profile-info">
            <div className="profile-avatar">
              {hasCustomAvatar ? (
                <img src={displayUser.avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                <GiEgyptianProfile size={64} />
              )}
            </div>
            
            <div className="profile-details">
              <h2>{displayUser.username}</h2>
              <p>{displayUser.email}</p>
              {profileInfo && (
                <div className="profile-follow-stats">
                  {!isOwnProfile && (
                    <button
                      className={`follow-button ${profileInfo.isFollowing ? 'following' : ''}`}
                      onClick={() => {
                        if (profileInfo.isFollowing) {
                          // unfollow: update UI and local state & backend
                          setProfileInfo({ ...profileInfo, isFollowing: false, followerCount: (profileInfo.followerCount || 1) - 1 });
                          try {
                            unfollowUser(profileId);
                          } catch (e) {
                            console.warn('unfollow error', e);
                          }
                        } else {
                          setProfileInfo({ ...profileInfo, isFollowing: true, followerCount: (profileInfo.followerCount || 0) + 1 });
                          try {
                            followUser(profileId);
                          } catch (e) {
                            console.warn('follow error', e);
                          }
                        }
                      }}
                    >
                      {profileInfo.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                  <div className={`follow-counts ${isOwnProfile ? 'own-profile' : ''}`}>
                    <span 
                      onClick={() => {
                        if (isOwnProfile && (profileInfo.followerCount || 0) > 0) {
                          handleOpenFollowersModal();
                        }
                      }}
                      style={isOwnProfile && (profileInfo.followerCount || 0) > 0 ? { cursor: 'pointer' } : {}}
                    >
                      {profileInfo.followerCount || 0} followers
                    </span>
                    <span 
                      onClick={() => {
                        if (isOwnProfile && (profileInfo.followingCount || 0) > 0) {
                          handleOpenFollowingModal();
                        }
                      }}
                      style={isOwnProfile && (profileInfo.followingCount || 0) > 0 ? { cursor: 'pointer' } : {}}
                    >
                      {profileInfo.followingCount || 0} following
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <>
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
            </>
          )}
        </div>

        {/* My Posts Section */}
        <div className="my-posts-section">
          <h2 className="my-posts-title">{isOwnProfile ? 'My Posts' : `${displayUser.username}'s Posts`}</h2>
          {userPosts.length === 0 ? (
            <p className="no-posts-message">{isOwnProfile ? 'No posts yet. Create your first post!' : `${displayUser.username} hasn't posted anything yet.`}</p>
          ) : (
            <div className="profile-posts-container">
                  {userPosts
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((post) => (
                  <div 
                    key={post.id} 
                    className={`profile-post-card ${isOwnProfile ? 'own-post' : 'other-post'}`}
                    onClick={() => { if (isOwnProfile) { handleEditClick(post); } else { openPostModal(post); } }}
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
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLikeToggle(post); }}
                          className={`profile-like-btn ${(post.likers && user && post.likers.includes(user.id)) ? 'liked' : ''}`}
                          aria-label="Like"
                        >
                          <AiFillLike className="profile-like-icon" />
                        </button>
                        <span>{post.likers?.length ?? post.likes ?? 0}</span>
                      </div>
                      <div className="profile-post-comments">
                        <span 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            openPostModal(post); 
                          }}
                        >
                          {post.comments?.length ? `${post.comments.length} comment${post.comments.length !== 1 ? 's' : ''}` : '0 comments'}
                        </span>
                      </div>
                    </div>
                    
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected post modal for viewing comments/likes */}
      {selectedPost && (
        <div className="post-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPost(null)}>×</button>
            <div className="modal-header">
              <h2 className="modal-title">{selectedPost.title}</h2>
              <p className="modal-meta">by: {selectedPost.user}, posted: {getTimeAgo(selectedPost.createdAt)}</p>
            </div>
            {getMediaElement(selectedPost) && (
              <div className="modal-media">{getMediaElement(selectedPost)}</div>
            )}
            <div className="modal-body">
              <p className="modal-content">{selectedPost.content}</p>
            </div>
            <div className="modal-footer">
              <button
                className={`like-button ${selectedPost.likers && user && selectedPost.likers.includes(user.id) ? 'liked' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleLikeToggle(selectedPost); }}
              >
                <AiFillLike className="profile-like-icon" />
                <span>{selectedPost.likers?.length ?? selectedPost.likes ?? 0}</span>
              </button>
            </div>
            <div className="modal-comments-section">
              {selectedPost.comments && selectedPost.comments.length > 0 && (
                <div className="comments-list">
                  {selectedPost.comments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-avatar">
                        {c.userPhoto ? <img src={c.userPhoto} alt={c.user} className="comment-photo" /> : <GiEgyptianProfile size={24} className="comment-icon" />}
                      </div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-username">{c.user}</span>
                          <span className="comment-time">{getTimeAgo(c.createdAt)}</span>
                        </div>
                        <p className="comment-text">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="post-modal-overlay" onClick={handleCloseFollowersModal}>
          <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title" style={{ marginBottom: '20px', marginTop: '20px' }}>Followers</h2>
            <div className="modal-comments-section" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {followersList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
                  No followers yet
                </div>
              ) : (
                followersList.map((follower) => {
                  const hasCustomAvatar = follower.avatar_url && follower.avatar_url !== 'default';
                  const isFollowing = modalFollowStatus[follower.id] || false;
                  return (
                    <div key={follower.id} className="people-search-row" style={{ marginBottom: '12px' }}>
                      <div className="people-search-left" onClick={() => {
                        handleCloseFollowersModal();
                        navigate(`/profile/${follower.id}`);
                      }}>
                        {hasCustomAvatar ? (
                          <img src={follower.avatar_url} alt={follower.username} className="people-search-avatar" />
                        ) : (
                          <GiEgyptianProfile size={20} />
                        )}
                        <div className="people-search-info">
                          <div className="people-search-name">{follower.username}</div>
                          <div className="people-search-email">{follower.email}</div>
                        </div>
                      </div>
                      <div className="people-search-action">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModalFollowToggle(follower.id);
                          }}
                          className={`search-follow-btn ${isFollowing ? 'following' : ''}`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="post-modal-overlay" onClick={handleCloseFollowingModal}>
          <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title" style={{ marginBottom: '20px', marginTop: '20px' }}>Following</h2>
            <div className="modal-comments-section" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {followingList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
                  Not following anyone yet
                </div>
              ) : (
                followingList.map((followingUser) => {
                  const hasCustomAvatar = followingUser.avatar_url && followingUser.avatar_url !== 'default';
                  const isFollowing = modalFollowStatus[followingUser.id] || false;
                  return (
                    <div key={followingUser.id} className="people-search-row" style={{ marginBottom: '12px' }}>
                      <div className="people-search-left" onClick={() => {
                        handleCloseFollowingModal();
                        navigate(`/profile/${followingUser.id}`);
                      }}>
                        {hasCustomAvatar ? (
                          <img src={followingUser.avatar_url} alt={followingUser.username} className="people-search-avatar" />
                        ) : (
                          <GiEgyptianProfile size={20} />
                        )}
                        <div className="people-search-info">
                          <div className="people-search-name">{followingUser.username}</div>
                          <div className="people-search-email">{followingUser.email}</div>
                        </div>
                      </div>
                      <div className="people-search-action">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModalFollowToggle(followingUser.id);
                          }}
                          className={`search-follow-btn ${isFollowing ? 'following' : ''}`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


