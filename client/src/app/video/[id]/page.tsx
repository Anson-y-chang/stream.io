"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "@/utils/axios";
import { Video } from "@/model/video";
import Hls from "hls.js";
import "./style.css";

export default function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuality, setCurrentQuality] = useState<string>("720p");
  const videoRef = useRef<HTMLVideoElement>(null);
  const playIcon = useRef<SVGSVGElement | null>(null);
  const pauseIcon = useRef<SVGSVGElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging] = useState(false);
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
        debug: false,
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
        /* eslint-disable @typescript-eslint/no-explicit-any */
        (_event: any, data: { level: number }) => {
          console.log(
            "Quality level switched to:",
            hls.levels[data.level]?.height + "p"
          );
        }
      );

      hls.on(
        Hls.Events.ERROR,
        /* eslint-disable @typescript-eslint/no-explicit-any */
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

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video, id]); 

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault(); // 避免按下空白鍵導致頁面滾動
        togglePlay();
        toggleIcon();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleQualityChange = (quality: string) => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setCurrentQuality(quality);
    }
  };

  // 切換畫質後維持時間
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentQuality]);

  const togglePlay = () => {
    if (videoRef.current) {
      // console.log(videoRef.current.paused);
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleIcon = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        // show play icon
        if (playIcon.current) {
          playIcon.current.classList.remove("grow-and-fadeOut");
          void playIcon.current.getBoundingClientRect(); // 強制重繪
          playIcon.current.classList.add("grow-and-fadeOut");
        }
      } else {
        // show pause icon
        if (pauseIcon.current) {
          pauseIcon.current.classList.remove("grow-and-fadeOut"); // 先移除
          void pauseIcon.current.getBoundingClientRect(); // 強制重繪
          pauseIcon.current.classList.add("grow-and-fadeOut"); // 再新增
        }
      }
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && !isDragging) {
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
              <div
                className="absolute top-0 bottom-0 left-0 right-0 bg-transparent flex justify-center items-center"
                onClick={() => {
                  togglePlay();
                  toggleIcon();
                }}
              >
                {isPlaying ? (
                  <svg
                    className="w-10 opacity-0"
                    ref={playIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                  >
                    <path
                      fill="white"
                      d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-10 opacity-0"
                    ref={pauseIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                  >
                    <path
                      fill="white"
                      d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM224 192l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32s32 14.3 32 32zm128 0l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32s32 14.3 32 32z"
                    />
                  </svg>
                )}
              </div>
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
                  <button
                    onClick={togglePlay}
                    className="hover:text-gray-300 cursor-pointer"
                  >
                    {isPlaying ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 320 512"
                      >
                        <path
                          fill="white"
                          d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 384 512"
                      >
                        <path
                          fill="white"
                          d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Time Display */}
                  <div className="">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>

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
