export interface Video {
  user: {
    _id: string;
    email: string;
    name: string;
  };
  _id: string;
  title: string;
  description: string;
  originalVideoPath: string;
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
  hlsManifest?: string;
  hlsQualities?: {
    quality: string;
    playlistPath: string;
    resolution: string;
    bitrate: string;
  }[];
  processingStatus: "processing" | "completed" | "failed";
}
