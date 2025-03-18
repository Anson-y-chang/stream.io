import multer from "multer";
import path from "path";
import { getVideoDurationInSeconds } from "get-video-duration";
import { requireAuth } from "../middleware/auth.js";
import { ObjectId as ObjectID } from "mongodb";

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

        const newVideo = {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
          },
          title,
          description,
          videoPath,
          thumbnailPath,
          uploadedAt: new Date().toISOString(),
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: [],
          hours,
          minutes,
          seconds,
        };

        await videosCollection.insertOne(newVideo);
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $push: {
              videos: {
                _id: newVideo._id,
                title,
                views: 0,
                thumbnailPath,
              },
            },
          }
        );

        res
          .status(201)
          .json({ message: "Video uploaded successfully", data: newVideo });
      } catch (err) {
        console.error("Error in video upload:", err);
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
