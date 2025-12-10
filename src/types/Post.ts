export type Comment = {
  id: string;
  text: string;
  user: string;
  userPhoto?: string;
  createdAt: string; // ISO string for localStorage
  timeAgo?: string; // Pre-calculated time ago string from backend
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
  likers?: string[]; // user IDs or usernames who liked the post
  comments?: Comment[]; // Array of comments
};
