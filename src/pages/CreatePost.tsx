import Navbar from "../components/Dashboard/Navbar/Navbar";
import "./CreatePost.css";
import { useState, useRef, useEffect } from "react";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("blurb");

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
     CAPTURE PHOTO
  ------------------------------------ */
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = canvas.toDataURL("image/png");
    setImage(photo);

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
  const handleFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only image files are supported for upload.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPost = {
      id: crypto.randomUUID(),
      title,
      content,
      type,
      image: image || null,
      videoLink: recordedVideo || videoLink || null,
      createdAt: new Date(),
    };

    console.log(newPost);
    alert("Post submitted! (Check console)");
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
                  <button
                    type="button"
                    className="capture-btn"
                    onClick={capturePhoto}
                  >
                    Capture Photo
                  </button>

                  {!recording && (
                    <button
                      type="button"
                      className="camera-btn"
                      onClick={startRecording}
                    >
                      Start Recording
                    </button>
                  )}

                  {recording && (
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
              <video src={recordedVideo} controls className="video-preview" />
            </div>
          ) : image ? (
            <div className="preview-box">
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
    </div>
  );
}
