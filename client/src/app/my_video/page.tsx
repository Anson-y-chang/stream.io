"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Video } from "@/model/video";
import axios from "@/utils/axios";
import { useRouter } from "next/navigation";

export default function MyVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();

  const fetchVideos = () => {
    axios
      .get("/api/videos/my")
      .then((res) => {
        setVideos(res.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          router.push("/login");
        } else {
          alert(err.response?.data?.message || "Error loading videos");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchVideos();
  }, [router]);

  const handleDelete = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發卡片的點擊事件

    if (!confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      setIsDeleting(videoId);
      await axios.delete(`/api/videos/${videoId}`);
      // 重新獲取視頻列表
      fetchVideos();
    } catch (error: any) {
      alert(error.response?.data?.message || "Error deleting video");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-2xl font-bold mb-8">My Videos</h1>
      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <p>Loading...</p>
        ) : videos.length === 0 ? (
          <div className="col-span-full text-center">
            <p className="text-gray-500 mb-4">
              You haven't uploaded any videos yet.
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Upload Your First Video
            </button>
          </div>
        ) : (
          videos.map((video) => (
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
                {/* 刪除按鈕 */}
                <button
                  onClick={(e) => handleDelete(video._id, e)}
                  disabled={isDeleting === video._id}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                >
                  {isDeleting === video._id ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
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
          ))
        )}
      </main>
    </div>
  );
}
