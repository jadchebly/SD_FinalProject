import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Dashboard/Navbar/Navbar';
import { GiEgyptianProfile } from 'react-icons/gi';
import { useRef, useState, useEffect } from 'react';
import type { Post } from '../types/Post';
import { AiFillLike } from 'react-icons/ai';
import './Profile.css';

export default function Profile() {
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);

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

  // Load user's posts
  useEffect(() => {
    const loadUserPosts = () => {
      if (!user) return;
      
      const storedPosts = localStorage.getItem("posts");
      if (storedPosts) {
        try {
          const allPosts = JSON.parse(storedPosts);
          const filtered = allPosts.filter((post: Post) => post.user === user.username);
          setUserPosts(filtered);
        } catch (error) {
          console.error("Error parsing posts from localStorage:", error);
        }
      }
    };

    loadUserPosts();
    
    // Update posts every second to refresh time ago
    const interval = setInterval(loadUserPosts, 1000);
    
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

  const handlePostClick = () => {
    navigate('/dashboard');
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
                    onClick={handlePostClick}
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
                        <span>{post.likes || 0}</span>
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
    </div>
  );
}

