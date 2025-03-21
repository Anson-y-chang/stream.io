"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Video } from "@/model/video";
import axios from "@/utils/axios";
import { useRouter } from "next/navigation";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    axios
      .get("/api/videos")
      .then((res) => {
        if (res.data.length > 0) {
          setVideos(res.data);
        }
      })
      .catch((err) => {
        alert(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="items-center justify-start items-center p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex gap-8">
        {isLoading && <p>Loading...</p>}
        {videos.map((video) => (
          <div
            key={Math.random()}
            className="cursor-pointer"
            onClick={() => {
              router.push(`/video/${video._id}`);
            }}
          >
            <Image
              src={`http://localhost:2222/${video.thumbnailPath}`}
              alt={video.title}
              width={300}
              height={300}
            />
            <h2>{video.title}</h2>
          </div>
        ))}
        {!isLoading && videos.length === 0 && (
          <p>There is no any content uploaded now.</p>
        )}
      </main>
    </div>
  );
}
