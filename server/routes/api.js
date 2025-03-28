import express from "express";
import { login, signup, logout } from "./auth.js";
import {
  getVideos,
  uploadVideo,
  getVideoBinary,
  getVideoInfo,
  getMyVideos,
  deleteVideo,
} from "./video.js";

export default function setupRoutes(db) {
  const router = express.Router();

  // Authentication Routes
  router.post("/auth/login", login(db));
  router.post("/auth/sign-up", signup(db));
  router.post("/auth/logout", logout());

  // Video Routes
  router.get("/videos", getVideos(db));
  router.get("/videos/my", getMyVideos(db));
  router.post("/videos/upload", ...uploadVideo(db));
  router.get("/videos/:id", getVideoInfo(db));
  router.delete("/videos/:id", ...deleteVideo(db));

  // HLS streaming routes
  router.get("/videos/:id/stream", getVideoBinary(db)); // 主播放列表
  // router.get("/videos/:id/:quality/:filename", getVideoBinary(db)); // 片段文件

  return router;
}
