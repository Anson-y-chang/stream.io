import multer from "multer";
import path from "path";
import { getVideoDurationInSeconds } from "get-video-duration";
import { requireAuth } from "../middleware/auth.js";
import { ObjectId as ObjectID } from "mongodb";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import process from "process";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const processVideo = (inputPath) => {
  const outputDir = path.join(
    "uploads",
    "hls",
    path.basename(inputPath, path.extname(inputPath))
  );

  // 確保輸出目錄存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const qualities = [
    { name: "1080p", resolution: "1920x1080", bitrate: "4000k" },
    { name: "720p", resolution: "1280x720", bitrate: "2500k" },
    { name: "480p", resolution: "854x480", bitrate: "1500k" },
    { name: "360p", resolution: "640x360", bitrate: "800k" },
  ];

  return new Promise((resolve, reject) => {
    // 創建主要的 M3U8 播放列表
    const masterPlaylist = ["#EXTM3U", "#EXT-X-VERSION:3"];

    const transcodingPromises = qualities.map((quality) => {
      return new Promise((resolveQuality, rejectQuality) => {
        const qualityDir = path.join(outputDir, quality.name);
        if (!fs.existsSync(qualityDir)) {
          fs.mkdirSync(qualityDir, { recursive: true });
        }

        const playlistPath = path.join(qualityDir, "playlist.m3u8");

        ffmpeg(inputPath)
          .size(quality.resolution)
          .videoBitrate(quality.bitrate)
          .audioCodec("aac")
          .audioChannels(2)
          .audioFrequency(44100)
          .audioBitrate("128k")
          .outputOptions([
            "-hls_time 10", // 每個片段的時長（秒）
            "-hls_list_size 0", // 保留所有片段
            "-hls_segment_type mpegts", // 使用 MPEG-TS 格式
            "-hls_segment_filename",
            path.join(qualityDir, "segment%d.ts"),
            "-af",
            "loudnorm=I=-16:LRA=11:TP=-1.5", // 音訊標準化到 -16 LUFS
          ])
          .output(playlistPath)
          .on("end", () => {
            // 將此品質添加到主播放列表
            masterPlaylist.push(
              `#EXT-X-STREAM-INF:BANDWIDTH=${
                parseInt(quality.bitrate) * 1000
              },RESOLUTION=${quality.resolution}`,
              `${quality.name}/playlist.m3u8`
            );
            resolveQuality({
              quality: quality.name,
              playlistPath: path.relative("uploads", playlistPath),
              resolution: quality.resolution,
              bitrate: quality.bitrate,
            });
          })
          .on("error", (err) => rejectQuality(err))
          .run();
      });
    });

    Promise.all(transcodingPromises)
      .then((results) => {
        // 寫入主播放列表
        const masterPlaylistPath = path.join(outputDir, "master.m3u8");
        fs.writeFileSync(masterPlaylistPath, masterPlaylist.join("\n"));

        resolve({
          masterPlaylist: path.relative("uploads", masterPlaylistPath),
          qualities: results,
          outputDir: path.relative("uploads", outputDir),
        });
      })
      .catch(reject);
  });
};

export function uploadVideo(db) {
  const videosCollection = db.collection("videos");
  const usersCollection = db.collection("users");

  return [
    requireAuth,
    upload.fields([{ name: "video" }, { name: "thumbnail" }]),
    async (req, res) => {
      if (!req.files || !req.files.video) {
        return res.status(400).json({ message: "Missing video" });
      }

      try {
        const videoPath = req.files.video?.[0]?.path;
        const thumbnailPath = req.files.thumbnail?.[0]?.path;
        const { title, description } = req.body;

        const user = await usersCollection.findOne({
          _id: ObjectID.createFromHexString(req.session.user_id),
        });

        const duration = await getVideoDurationInSeconds(videoPath);
        const hours = Math.floor(duration / 60 / 60);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = Math.floor(duration % 60);

        // 創建初始視頻記錄
        const newVideo = {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
          },
          title,
          description,
          originalVideoPath: videoPath,
          thumbnailPath,
          uploadedAt: new Date().toISOString(),
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: [],
          hours,
          minutes,
          seconds,
          createdAt: new Date().toISOString(),
          processingStatus: "processing",
        };

        const result = await videosCollection.insertOne(newVideo);
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $push: {
              videos: {
                _id: result.insertedId,
                title,
                views: 0,
                thumbnailPath,
              },
            },
          }
        );

        // 立即返回成功響應
        res.status(201).json({
          message: "Video uploaded successfully",
          data: newVideo,
          processingMessage:
            "Video is being processed for HLS streaming. This may take a few minutes.",
        });

        // 在背景處理 HLS 轉換
        process.nextTick(async () => {
          try {
            const hlsResult = await processVideo(videoPath);

            // 更新視頻記錄
            await videosCollection.updateOne(
              { _id: result.insertedId },
              {
                $set: {
                  hlsManifest: hlsResult.masterPlaylist,
                  hlsQualities: hlsResult.qualities,
                  processingStatus: "completed",
                },
              }
            );
          } catch (err) {
            console.error("Error processing video:", err);
            await videosCollection.updateOne(
              { _id: result.insertedId },
              { $set: { processingStatus: "failed" } }
            );
          }
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  ];
}

export function getVideos(db) {
  const videosCollection = db.collection("videos");
  return async (req, res) => {
    const videos = await videosCollection
      .find({ processingStatus: "completed" })
      .sort({ uploadedAt: -1 })
      .toArray();
    res.status(200).json(videos);
  };
}

export function getVideoInfo(db) {
  const videosCollection = db.collection("videos");
  return async (req, res) => {
    const videoId = req.params.id;
    const video = await videosCollection.findOne({
      _id: ObjectID.createFromHexString(videoId),
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json(video);
  };
}

export function getVideoBinary(db) {
  const videosCollection = db.collection("videos");
  return async (req, res) => {
    const videoId = req.params.id;
    const quality = req.params.quality;
    const filename = req.params.filename;

    try {
      // 1. 獲取視頻信息
      const video = await videosCollection.findOne({
        _id: ObjectID.createFromHexString(videoId),
      });

      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // 2. 構建文件路徑
      let filePath;
      if (quality && filename) {
        // 請求特定畫質的文件
        filePath = path.join(
          "uploads",
          "hls",
          path.basename(
            video.originalVideoPath,
            path.extname(video.originalVideoPath)
          ),
          quality,
          filename
        );
      } else if (video.hlsManifest) {
        // 請求主播放列表
        filePath = path.join("uploads", video.hlsManifest);
      } else {
        return res.status(404).json({ message: "Video source not found" });
      }

      console.log("Requested file path:", filePath);

      // 3. 檢查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.log("File not found:", filePath);
        return res.status(404).json({ message: "File not found" });
      }

      // 4. 獲取文件信息
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      // 5. 設置正確的 Content-Type
      const contentType =
        path.extname(filePath) === ".m3u8"
          ? "application/vnd.apple.mpegurl"
          : "video/MP2T";

      // 6. 發送文件
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Error streaming video:", error);
      res.status(500).json({ message: "Error streaming video" });
    }
  };
}

export function getMyVideos(db) {
  const videosCollection = db.collection("videos");
  return async (req, res) => {
    if (!req.session.user_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const videos = await videosCollection
        .find({
          "user._id": ObjectID.createFromHexString(req.session.user_id),
        })
        .sort({ uploadedAt: -1 }) // 最新的影片優先
        .toArray();

      res.json(videos);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ message: "Error fetching videos" });
    }
  };
}

export function deleteVideo(db) {
  const videosCollection = db.collection("videos");
  const usersCollection = db.collection("users");

  return [
    requireAuth,
    async (req, res) => {
      const videoId = req.params.id;

      try {
        // 1. 獲取視頻信息
        const video = await videosCollection.findOne({
          _id: ObjectID.createFromHexString(videoId),
        });

        if (!video) {
          return res.status(404).json({ message: "Video not found" });
        }

        // 2. 確認是否為視頻擁有者
        if (video.user._id.toString() !== req.session.user_id) {
          return res
            .status(403)
            .json({ message: "Unauthorized to delete this video" });
        }

        // 3. 刪除相關文件
        // 刪除原始視頻
        if (fs.existsSync(video.originalVideoPath)) {
          fs.unlinkSync(video.originalVideoPath);
        }

        // 刪除縮圖
        if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
          fs.unlinkSync(video.thumbnailPath);
        }

        // 刪除 HLS 文件
        if (video.hlsManifest) {
          const hlsDir = path.join(
            "uploads",
            "hls",
            path.basename(
              video.originalVideoPath,
              path.extname(video.originalVideoPath)
            )
          );
          if (fs.existsSync(hlsDir)) {
            fs.rmSync(hlsDir, { recursive: true, force: true });
          }
        }

        // 4. 從數據庫中刪除視頻記錄
        await videosCollection.deleteOne({
          _id: ObjectID.createFromHexString(videoId),
        });

        // 5. 從用戶的視頻列表中移除
        await usersCollection.updateOne(
          { _id: ObjectID.createFromHexString(req.session.user_id) },
          {
            $pull: {
              videos: { _id: ObjectID.createFromHexString(videoId) },
            },
          }
        );

        res.status(200).json({ message: "Video deleted successfully" });
      } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({ message: "Error deleting video" });
      }
    },
  ];
}
