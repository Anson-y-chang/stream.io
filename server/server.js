import express from "express";
import session from "express-session";
import { MongoClient, ServerApiVersion } from "mongodb";
import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import next from "next";
import setupRoutes from "./routes/api.js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// export const app = next({ dev: false, dir: path.join(__dirname, "../client") });
// const handle = app.getRequestHandler();

const server = express();

server.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

server.use(express.json());
server.use(
  session({
    key: "user_id",
    secret: "User secret Object Id",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if using https
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

const client = new MongoClient(
  "mongodb+srv://zhangshangdong888855:jdYRZxE2TF5DcXSh@cluster0.m2uwv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }
);

// Serve static files from the uploads directory
server.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount all API routes
const streamDB = client.db("stream");
server.use("/api", setupRoutes(streamDB));

// Handle all other routes with Next.js
// server.all("*", (req, res) => {
//   return handle(req, res);
// });

// app.prepare().then(async () => {
server.listen(2222, async () => {
  console.log("Server is running on http://localhost:2222");
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
});
// });

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
