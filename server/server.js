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

server.use(cors());
server.use(express.json());
server.use(
  session({
    key: "user_id",
    secret: "User secret Object Id",
    resave: "true",
    saveUninitialized: "false",
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
const streamDB = client.db("stream");

// Mount all API routes
server.use("/api", setupRoutes(streamDB));

// Handle all other routes with Next.js
server.all("*", (req, res) => {
  return handle(req, res);
});

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
