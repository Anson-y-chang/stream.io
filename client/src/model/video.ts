export interface Video {
  user: {
    _id: string;
    email: string;
    name: string;
  };
  _id: string;
  title: string;
  description: string;
  videoSources: {
    quality: string;
    path: string;
    label: string;
  }[];
  thumbnailPath: string;
  uploadedAt: string;
  views: number;
  likes: number;
  dislikes: number;
  comments: Comment[];
  hours: number;
  minutes: number;
  seconds: number;
  createdAt: string;
}
