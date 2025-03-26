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
      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading && <p>Loading...</p>}
        {videos.map((video) => (
          <div
            key={video._id}
            className={`cursor-pointer flex flex-col gap-2 group relative ${
              video.processingStatus === "processing" ? "opacity-50" : ""
            }`}
            onClick={() => {
              if (video.processingStatus === "processing") return;
              router.push(`/video/${video._id}`);
            }}
          >
            {/* 16:9 容器 */}
            <div className="relative w-full pt-[56.25%] overflow-hidden">
              <Image
                src={`http://localhost:${process.env.NEXT_PUBLIC_PORT}/${video.thumbnailPath}`}
                alt={video.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="absolute top-0 left-0 w-full h-full object-cover rounded-lg transition-transform group-hover:scale-105"
                priority
              />
              {video.processingStatus === "processing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Processing...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-medium line-clamp-2">
                {video.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{video.views} views</span>
                <span>•</span>
                <span>{new Date(video.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && videos.length === 0 && (
          <p>There is no any content uploaded now.</p>
        )}
      </main>
    </div>
  );
}
