import express from "express";
import { login, signup, logout } from "./auth.js";
import { getVideos, uploadVideo } from "./video.js";

export default function setupRoutes(db) {
  const router = express.Router();

  // Authentication Routes
  router.post("/auth/login", login(db));
  router.post("/auth/sign-up", signup(db));
  router.post("/auth/logout", logout());

  // Video Routes
  router.get("/videos", getVideos(db));
  router.post("/videos/upload", ...uploadVideo(db));

  return router;
}
