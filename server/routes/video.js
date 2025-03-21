import multer from "multer";
import path from "path";
import { getVideoDurationInSeconds } from "get-video-duration";
import { requireAuth } from "../middleware/auth.js";
import { ObjectId as ObjectID } from "mongodb";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import process from "process";

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

const processVideo = (inputPath, quality) => {
  const outputPath = inputPath.replace(
    path.extname(inputPath),
    `-${quality}${path.extname(inputPath)}`
  );

  return new Promise((resolve, reject) => {
    let resolution;
    switch (quality) {
      case "1080p":
        resolution = "1920x1080";
        break;
      case "720p":
        resolution = "1280x720";
        break;
      case "480p":
        resolution = "854x480";
        break;
      case "360p":
        resolution = "640x360";
        break;
      default:
        resolution = "1280x720";
    }

    ffmpeg(inputPath)
      .size(resolution)
      .videoBitrate(
        quality === "1080p"
          ? "4000k"
          : quality === "720p"
          ? "2500k"
          : quality === "480p"
          ? "1500k"
          : "800k"
      )
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .run();
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

        // 先創建一個只有原始視頻的記錄
        const newVideo = {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
          },
          title,
          description,
          videoSources: [
            {
              quality: "original",
              path: videoPath,
              label: "Original",
            },
          ],
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
          processingStatus: "processing", // 添加處理狀態
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
            "Video is being processed for different qualities. This may take a few minutes.",
        });

        // 在背景處理不同畫質的轉換
        process.nextTick(async () => {
          try {
            const qualities = ["1080p", "720p", "480p", "360p"];
            const processedSources = await Promise.all(
              qualities.map(async (quality) => {
                try {
                  const processedPath = await processVideo(videoPath, quality);
                  return {
                    quality,
                    path: processedPath,
                    label: `${quality} (${
                      quality === "1080p"
                        ? "Full HD"
                        : quality === "720p"
                        ? "HD"
                        : quality === "480p"
                        ? "SD"
                        : "Low"
                    })`,
                  };
                } catch (err) {
                  console.error(`Error processing ${quality}:`, err);
                  return null;
                }
              })
            );

            // 過濾掉失敗的轉換
            const validSources = processedSources.filter(
              (source) => source !== null
            );

            // 更新視頻記錄，添加所有成功處理的畫質
            await videosCollection.updateOne(
              { _id: result.insertedId },
              {
                $set: {
                  videoSources: [
                    {
                      quality: "original",
                      path: videoPath,
                      label: "Original",
                    },
                    ...validSources,
                  ],
                  processingStatus: "completed",
                },
              }
            );
          } catch (err) {
            // 更新處理狀態為失敗
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
    const videos = await videosCollection.find({}).toArray();
    res.status(200).json(videos);
  };
}

export function getVideo(db) {
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
