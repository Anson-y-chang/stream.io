"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Video } from "@/model/video";
import axios from "axios";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    axios
      .get(`http://localhost:${process.env.NEXT_PUBLIC_PORT}/api/videos`)
      .then((res) => {
        setVideos(new Array(10).fill(res.data));
      })
      .catch((err) => {
        alert("Error fetching videos");
      });
  }, []);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        {videos.map((video) => (
          <div key={Math.random()}>
            <h2>{video.title}</h2>
            <Image
              src={video.thumbnailPath}
              alt={video.title}
              width={300}
              height={300}
            />
            <p>{video.description}</p>
            <p>{video.uploadedAt}</p>
          </div>
        ))}
        There is no any content uploaded now.
      </main>
    </div>
  );
}
