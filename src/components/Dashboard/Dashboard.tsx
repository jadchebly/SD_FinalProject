import Navbar from "./Navbar/Navbar";
import "./Dashboard.css";
import { useState, useEffect } from "react";
import type { Post, Comment } from "../../types/Post";
import { AiFillLike } from "react-icons/ai";
import { GiEgyptianProfile } from "react-icons/gi";

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  // for now, use local storage until we have a backend
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadPosts = () => {
      const storedPosts = localStorage.getItem("posts");
      if (storedPosts) {
        try {
          const parsedPosts = JSON.parse(storedPosts);
          setPosts(parsedPosts);
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
    
    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            likes: (post.likes || 0) + 1,
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

      localStorage.setItem("posts", JSON.stringify(updatedPosts));
      return updatedPosts;
    });
  };

  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      text: commentText,
      user: "user", // TODO: Replace with actual user from auth, using username
      userPhoto: undefined, // TODO: Add user photo, using profile picture
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
        setSelectedPost(null);
      }
    };

    if (selectedPost) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [selectedPost]);

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h1 className="dashboard-title">Dashboard</h1>
        
        {posts.length === 0 ? (
          <p className="no-posts">No posts yet. Create your first post!</p>
        ) : (
          <div className="posts-container">
            {posts
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
                    <button
                      className="like-button"
                      onClick={(e) => handleLike(e, post.id)}
                      aria-label="Like post"
                    >
                      <AiFillLike className="like-icon" />
                      <span className="like-count">{post.likes || 0}</span>
                    </button>
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
                <button
                  className="like-button"
                  onClick={(e) => handleLike(e, selectedPost.id)}
                  aria-label="Like post"
                >
                  <AiFillLike className="like-icon" />
                  <span className="like-count">{selectedPost.likes || 0}</span>
                </button>
              </div>

              {/* Comments Section in Modal */}
              <div className="modal-comments-section">
                {/* Display Comments */}
                {selectedPost.comments && selectedPost.comments.length > 0 && (
                  <div className="comments-list">
                    {selectedPost.comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-avatar">
                          {comment.userPhoto ? (
                            <img src={comment.userPhoto} alt={comment.user} className="comment-photo" />
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
                    ))}
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
      </div>
    </div>
  );
}