export type Comment = {
  id: string;
  text: string;
  user: string;
  userPhoto?: string;
  createdAt: string; // ISO string for localStorage
};

export type Post = {
  id: string;
  title: string;
  content: string;
  image?: string;
  videoLink?: string;
  recordedVideo?: string;
  type: "blurb" | "photo" | "video";
  createdAt: string; // ISO string for localStorage
  user: string;
  likes?: number; // Number of likes
  comments?: Comment[]; // Array of comments
};
