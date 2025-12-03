import Navbar from "../components/Dashboard/Navbar/Navbar";
import "./CreatePost.css";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("blurb");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | Blob | null>(null); // Store original file/blob for upload
  const [videoLink, setVideoLink] = useState("");
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

    // Convert canvas to blob and store for later upload
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("Failed to create blob from canvas");
        const photo = canvas.toDataURL("image/png");
        const compressedPhoto = await compressImage(photo);
        setImage(compressedPhoto);
        setType("photo");
        stopCamera();
        return;
      }

      // Store blob for later upload
      setImageFile(blob);
      
      // Show preview (data URL)
      const photo = canvas.toDataURL("image/png");
      const compressedPhoto = await compressImage(photo);
      setImage(compressedPhoto);
      setType("photo");
      stopCamera();
    }, 'image/jpeg', 0.8);
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

    // Store file for later upload
    setImageFile(file);
    
    // Show preview (data URL)
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
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

    setUploading(true);
    let imageUrl = image; // Default to current image (might be data URL or already uploaded)

    try {
      // Step 1: Upload image if we have a file/blob to upload
      if (imageFile && image.startsWith('data:')) {
        // Convert blob to File if needed
        const file = imageFile instanceof File 
          ? imageFile 
          : new File([imageFile], 'image.jpg', { type: 'image/jpeg' });
        
        console.log('Uploading image to storage...');
        const uploadResult = await api.uploadImage(file);
        imageUrl = uploadResult.url;
        console.log('Image uploaded:', imageUrl);
      }

      // Step 2: Save post to database
      const postData = {
        title,
        content,
        type: type as string,
        image_url: imageUrl && !imageUrl.startsWith('data:') && imageUrl.trim() !== '' ? imageUrl : null,
        video_url: videoLink && videoLink.trim() !== '' ? videoLink : null,
        user_id: user.id,
        username: user.username,
      };

      console.log('Creating post in database...');
      const createResult = await api.createPost(postData);
      console.log('Post created successfully:', createResult.post?.id);

      // Reset form
      setTitle("");
      setContent("");
      setImage("");
      setImageFile(null);
      setVideoLink("");
      setRecordedVideo(null);
      setType("blurb");

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error creating post:", error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
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

    // clear image preview and file
    setImage("");
    setImageFile(null);
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
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Capture Photo"}
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
              className={`drop-zone ${dragActive ? "drag-active" : ""} ${uploading ? "uploading" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
            >
              <p style={{ margin: 0 }}>
                {uploading ? "Uploading image..." : "Drag & drop an image here, or click to select (optional)"}
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

          <button className="submit-btn" type="submit" disabled={uploading}>
            {uploading ? "Posting..." : "Post"}
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
