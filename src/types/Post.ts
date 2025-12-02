export type Post = {
  id: string;
  title: string;
  content: string;
  image?: string;
  videoLink?: string;
  type: "blurb" | "photo" | "video";
  createdAt: Date;
};
