"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "@/utils/axios";
import { Video } from "@/model/video";
import Hls from "hls.js";

export default function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuality, setCurrentQuality] = useState<string>("720p");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  useEffect(() => {
    axios
      .get(`/api/videos/${id}`)
      .then((res) => {
        setVideo(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading video:", err);
        alert(err.response?.data?.message || "Error loading video");
      });
  }, [id]);

  // 監聽 videoRef.current 的變化
  useEffect(() => {
    if (!videoRef.current) return;

    // 使用主播放列表 URL
    const manifestUrl = `http://localhost:${process.env.NEXT_PUBLIC_PORT}/api/videos/${id}/stream`;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        debug: true,
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 10000,
            maxLoadTimeMs: 20000,
            timeoutRetry: {
              maxNumRetry: 3,
              retryDelayMs: 0,
              maxRetryDelayMs: 0,
            },
            errorRetry: {
              maxNumRetry: 3,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
            },
          },
        },
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 10000,
            maxLoadTimeMs: 120000,
            timeoutRetry: {
              maxNumRetry: 3,
              retryDelayMs: 0,
              maxRetryDelayMs: 0,
            },
            errorRetry: {
              maxNumRetry: 3,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
            },
          },
        },
      });

      hlsRef.current = hls;
      hls.loadSource(manifestUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest parsed, available levels:", hls.levels);
        if (videoRef.current) {
          videoRef.current.play().catch((error) => {
            console.log("Autoplay prevented:", error);
          });
        }
      });

      hls.on(
        Hls.Events.LEVEL_SWITCHED,
        (_event: any, data: { level: number }) => {
          console.log(
            "Quality level switched to:",
            hls.levels[data.level]?.height + "p"
          );
        }
      );

      hls.on(
        Hls.Events.ERROR,
        (
          _event: any,
          data: {
            type: (typeof Hls.ErrorTypes)[keyof typeof Hls.ErrorTypes];
            fatal: boolean;
          }
        ) => {
          console.log("HLS error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log(
                  "Fatal network error encountered, trying to recover"
                );
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Fatal media error encountered, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                console.log("Fatal error, cannot recover");
                hls.destroy();
                break;
            }
          }
        }
      );
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // 對於 Safari，使用原生 HLS 支援
      videoRef.current.src = manifestUrl;
    }

    // 清理函數
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video]); // 依賴 videoRef.current 和 id

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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && !isDragging) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / progressBar.offsetWidth;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const handleProgressDragStart = () => {
    setIsDragging(true);
  };

  const handleProgressDragEnd = () => {
    setIsDragging(false);
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && videoRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / progressBar.offsetWidth;
      videoRef.current.currentTime = pos * duration;
    }
  };

  return (
    <div className="p-4">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        video && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <div className="relative group w-1/2" onMouseMove={handleMouseMove}>
              <video
                ref={videoRef}
                className="w-full"
                controls={false}
                onTimeUpdate={(e) =>
                  setCurrentTime(e.currentTarget.currentTime)
                }
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />

              {/* Custom Controls */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-transparent bg-opacity-70 text-white p-4 transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-100"
                }`}
              >
                {/* Progress Bar */}
                <div
                  className="relative w-full h-1 bg-gray-700 rounded-full cursor-pointer group"
                  onClick={handleProgressClick}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const time = percentage * (videoRef.current?.duration || 0);
                    setHoverTime(time);
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                >
                  {/* 已加載的緩衝區 */}
                  <div
                    className="absolute h-full bg-gray-500 rounded-full"
                    style={{
                      width: `${
                        (videoRef.current?.buffered.length
                          ? videoRef.current.buffered.end(
                              videoRef.current.buffered.length - 1
                            ) / videoRef.current.duration
                          : 0) * 100
                      }%`,
                    }}
                  />
                  {/* 播放進度 */}
                  <div
                    className="absolute h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${
                        ((videoRef.current?.currentTime || 0) /
                          (videoRef.current?.duration || 1)) *
                        100
                      }%`,
                    }}
                  />
                  {/* 進度條懸停提示 */}
                  {hoverTime !== null && (
                    <div
                      className="absolute -top-8 bg-black/75 text-white px-2 py-1 rounded text-sm"
                      style={{
                        left: `${
                          (hoverTime / (videoRef.current?.duration || 1)) * 100
                        }%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {formatTime(hoverTime)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  {/* Play/Pause Button */}
                  <button onClick={togglePlay} className="hover:text-gray-300">
                    {isPlaying ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Time Display */}
                  <span className="text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="hover:text-gray-300"
                    >
                      {isMuted ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>

                  {/* Quality Selection */}
                  <select
                    value={currentQuality}
                    onChange={(e) => handleQualityChange(e.target.value)}
                    className="bg-transparent outline-none text-sm"
                  >
                    {["1080p", "720p", "480p", "360p"].map((quality) => (
                      <option
                        key={quality}
                        value={quality}
                        className="bg-black"
                      >
                        {quality}
                      </option>
                    ))}
                  </select>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="ml-auto hover:text-gray-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                      />
                    </svg>
                  </button>
                </div>
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
