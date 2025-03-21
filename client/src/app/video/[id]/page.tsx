"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "@/utils/axios";
import { Video } from "@/model/video";

export default function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuality, setCurrentQuality] = useState<string>("720p");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    axios
      .get(`/api/videos/${id}`)
      .then((res) => {
        setVideo(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        alert(err.response.data.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleQualityChange = (quality: string) => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setCurrentQuality(quality);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentQuality]);

  return (
    <div className="p-4">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        video && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <div className="relative">
              <video
                ref={videoRef}
                src={`http://localhost:${process.env.NEXT_PUBLIC_PORT}/${
                  video.videoSources.find((s) => s.quality === currentQuality)
                    ?.path
                }`}
                controls
                className="w-full max-w-4xl"
              />
              <div className="absolute bottom-16 right-4 bg-black bg-opacity-70 text-white p-2 rounded">
                <select
                  value={currentQuality}
                  onChange={(e) => handleQualityChange(e.target.value)}
                  className="bg-transparent outline-none"
                >
                  {video.videoSources.map((source) => (
                    <option key={source.quality} value={source.quality}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <div>{video.views} views</div>
              <div>
                Uploaded on {new Date(video.uploadedAt).toLocaleDateString()}
              </div>
            </div>
            <p className="mt-4">{video.description}</p>
          </div>
        )
      )}
    </div>
  );
}
