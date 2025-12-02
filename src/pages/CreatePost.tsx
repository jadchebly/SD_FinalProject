import Navbar from "../components/Dashboard/Navbar/Navbar";
import "./CreatePost.css";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "../types/Post";
import { useAuth } from "../contexts/AuthContext";

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("blurb");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [image, setImage] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);

  // recording state
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // file upload / drag-drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ------------------------------------
     START CAMERA (Safari + Chrome FIX)
  ------------------------------------ */
    const startCamera = async () => {
      try {
        // Request both video and audio so recordings include microphone audio.
        // This will prompt the user for microphone permission as well.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });

        // store the stream so capture/stop handlers can access it
        streamRef.current = stream;

        // Set camera active so the <video> element mounts. We attach the
        // stream to the element in a useEffect after the element is in the DOM.
        setCameraActive(true);
      } catch (err) {
        console.error(err);
        alert("Camera access blocked. Allow it in browser settings.");
      }
    };

    // When cameraActive becomes true and the video element is mounted,
    // attach the stream and start playback. We do this in an effect because
    // the video element is conditionally rendered (only when cameraActive).
    useEffect(() => {
      const attachStream = async () => {
        const video = videoRef.current;
        const stream = streamRef.current;
        if (!cameraActive || !video || !stream) return;

        try {
          video.srcObject = stream;
          // Chrome + Safari hints
          video.muted = true;
          video.playsInline = true;
          await video.play();
        } catch (err) {
          console.error("Error playing video:", err);
        }
      };

      attachStream();
      // When cameraActive is turned off, don't leave srcObject attached.
      if (!cameraActive && videoRef.current) {
        try {
          // detach stream from element
          (videoRef.current as HTMLVideoElement).srcObject = null;
        } catch {}
      }
    }, [cameraActive]);


  /* ------------------------------------
     COMPRESS IMAGE
  ------------------------------------ */
  const compressImage = (dataUrl: string, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
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

  /* ------------------------------------
     CAPTURE PHOTO
  ------------------------------------ */
  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = canvas.toDataURL("image/png");
    // Compress the image
    const compressedPhoto = await compressImage(photo);
    setImage(compressedPhoto);

    stopCamera();
  };

  /* ------------------------------------
     RECORD VIDEO
  ------------------------------------ */
  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) {
      alert("Camera not started.");
      return;
    }

    // clear previous recordings
    recordedChunksRef.current = [];
    setRecordedVideo(null);

    try {
      const options: MediaRecorderOptions = {};
      // prefer webm if available
      if ((MediaRecorder as any).isTypeSupported && (MediaRecorder as any).isTypeSupported("video/webm;codecs=vp9")) {
        options.mimeType = "video/webm;codecs=vp9";
      } else if ((MediaRecorder as any).isTypeSupported && (MediaRecorder as any).isTypeSupported("video/webm;codecs=vp8")) {
        options.mimeType = "video/webm;codecs=vp8";
      }

      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recordedChunksRef.current[0]?.type || "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        setType("video");
        // stop camera to release resources and show recorded preview
        stopCamera();
      };

      mr.start();
      setRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Unable to start recording on this browser.");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      mr.stop();
    } catch (err) {
      console.error(err);
    }
    setRecording(false);
  };

  // revoke recorded video URL when it changes or on unmount to avoid leaks
  useEffect(() => {
    return () => {
      if (recordedVideo) {
        try {
          URL.revokeObjectURL(recordedVideo);
        } catch {}
      }
    };
  }, [recordedVideo]);

  /* ------------------------------------
     FILE UPLOAD / DRAG & DROP
  ------------------------------------ */
  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only image files are supported for upload.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      // Compress the uploaded image
      const compressedImage = await compressImage(dataUrl);
      setImage(compressedImage);
      setType("photo");
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) handleFile(files[0]);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) handleFile(files[0]);
  };

  /* ------------------------------------
     STOP CAMERA
  ------------------------------------ */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  /* ------------------------------------
     SUBMIT POST
  ------------------------------------ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("You must be logged in to create a post.");
      return;
    }

    const newPost: Post = {
      id: crypto.randomUUID(),
      title,
      content,
      type: type as "blurb" | "photo" | "video",
      image: image || undefined,
      videoLink: videoLink || undefined,
      recordedVideo: recordedVideo || undefined,
      createdAt: new Date().toISOString(),
      user: user.username,
    };

    // Get existing posts from localStorage
    const existingPosts = localStorage.getItem("posts");
    let posts: Post[] = existingPosts ? JSON.parse(existingPosts) : [];
    
    // Compress image if present
    let finalPost = { ...newPost };
    if (finalPost.image) {
      try {
        finalPost.image = await compressImage(finalPost.image, 1920, 0.7);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
    
    // Add new post
    posts.push(finalPost);
    
    // Keep only the most recent 50 posts to prevent quota exceeded
    if (posts.length > 50) {
      posts = posts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);
    }
    
    // Save back to localStorage with error handling
    try {
      const postsJson = JSON.stringify(posts);
      // Check if data is too large (rough estimate: 4MB limit for safety)
      if (postsJson.length > 4 * 1024 * 1024) {
        // If too large, remove oldest posts
        const sortedPosts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        let reducedPosts = sortedPosts;
        while (JSON.stringify(reducedPosts).length > 3 * 1024 * 1024 && reducedPosts.length > 1) {
          reducedPosts = reducedPosts.slice(0, -1);
        }
        localStorage.setItem("posts", JSON.stringify(reducedPosts));
        alert("Storage limit reached. Some older posts were removed to make space.");
      } else {
        localStorage.setItem("posts", postsJson);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        // Remove oldest posts and try again
        const sortedPosts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        let reducedPosts = sortedPosts.slice(0, Math.floor(sortedPosts.length * 0.8));
        try {
          localStorage.setItem("posts", JSON.stringify(reducedPosts));
          alert("Storage limit reached. Some older posts were removed. Please try submitting again.");
        } catch (retryError) {
          alert("Storage is full. Please clear some posts or use a different browser.");
          return;
        }
      } else {
        console.error("Error saving post:", error);
        alert("Error saving post. Please try again.");
        return;
      }
    }

    // Reset form
    setTitle("");
    setContent("");
    setImage("");
    setVideoLink("");
    setRecordedVideo(null);
    setType("blurb");

    // Show success modal
    setShowSuccessModal(true);
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    navigate("/dashboard");
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removePreview = () => {
    // revoke object URL if recorded video
    if (recordedVideo) {
      try {
        URL.revokeObjectURL(recordedVideo);
      } catch {}
      setRecordedVideo(null);
    }

    // clear image preview
    setImage("");
    // reset type to default
    setType("blurb");
  };

  return (
    <div>
      <Navbar />

      <div className="createpost-container fade-in">
        <h1 className="createpost-title">Create a Post</h1>

        <form className="createpost-form" onSubmit={handleSubmit}>
          {/* TITLE */}
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Enter a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* CONTENT */}
          <div className="form-group">
            <label>Content</label>
            <textarea
              placeholder="Write something..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* TYPE */}
          <div className="form-group">
            <label>Type of Post</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="blurb">Blurb</option>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
            </select>
          </div>

          {/* CAMERA */}
          <div className="form-group">
            <label>Take Photo (Camera)</label>

            {!cameraActive && (
              <button
                type="button"
                className="camera-btn"
                onClick={startCamera}
              >
                Open Camera
              </button>
            )}

            {cameraActive && (
              <div className="camera-wrapper">
                <video
                  ref={videoRef}
                  className="camera-preview"
                  autoPlay
                  playsInline
                  muted
                />

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {type !== "video" && (
                    <button
                      type="button"
                      className="capture-btn"
                      onClick={capturePhoto}
                    >
                      Capture Photo
                    </button>
                  )}

                  {type !== "photo" && !recording && (
                    <button
                      type="button"
                      className="camera-btn"
                      onClick={startRecording}
                    >
                      Start Recording
                    </button>
                  )}

                  {type !== "photo" && recording && (
                    <button
                      type="button"
                      className="stop-camera-btn"
                      onClick={stopRecording}
                    >
                      Stop Recording
                    </button>
                  )}

                  <button
                    type="button"
                    className="stop-camera-btn"
                    onClick={stopCamera}
                  >
                    Close Camera
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PREVIEW (image or recorded video) */}
          {recordedVideo ? (
            <div className="preview-box">
              <button 
                type="button"
                className="preview-close" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removePreview();
                }} 
                aria-label="Remove preview"
              >
                ×
              </button>
              <video src={recordedVideo} controls className="video-preview" />
            </div>
          ) : image ? (
            <div className="preview-box">
              <button 
                type="button"
                className="preview-close" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removePreview();
                }} 
                aria-label="Remove preview"
              >
                ×
              </button>
              <img src={image} alt="Captured" className="preview-image" />
            </div>
          ) : null}

          {/* UPLOAD / DRAG & DROP (optional) */}
          <div className="form-group">
            <label>Upload Photo (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              style={{ display: "none" }}
            />

            <div
              className={`drop-zone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p style={{ margin: 0 }}>
                Drag & drop an image here, or click to select (optional)
              </p>
            </div>
          </div>

          {/* VIDEO LINK */}
          <div className="form-group">
            <label>YouTube Link (Optional)</label>
            <input
              type="text"
              placeholder="https://youtube.com/..."
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
            />
          </div>

          <button className="submit-btn" type="submit">
            Post
          </button>
        </form>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay" onClick={handleSuccessOk}>
          <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-body">
              <h2 className="success-modal-title">Post Successful</h2>
              <p className="success-modal-message">Your post has been created successfully!</p>
            </div>
            <div className="success-modal-footer">
              <button className="success-modal-btn" onClick={handleSuccessOk}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
