"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Upload() {
  const router = useRouter();
  interface VideoInfo {
    video: File;
    thumbnail: File;
    title: string;
    description: string;
  }
  const [videoInfo, setVideoInfo] = useState<VideoInfo>({
    video: new File([], ""), // 空的 File 物件
    thumbnail: new File([], ""),
    title: "",
    description: "",
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    setVideoInfo((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVideoInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const upload = () => {
    const formData = new FormData();
    formData.append("video", videoInfo.video);
    formData.append("thumbnail", videoInfo.thumbnail);
    formData.append("title", videoInfo.title);
    formData.append("description", videoInfo.description);

    axios
      .post("/api/videos/upload", formData)
      .then((res) => {
        if (res.status == 200) {
          alert("upload successful");
        }
      })
      .catch((err) => {
        console.log(err);
        if (err.response?.status === 401) {
          router.push(err.response.data.redirectUrl);
        }
        alert(err.response.data.message);
      });
  };

  return (
    <main className="px-40 py-16 flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Upload Video</h1>
      <div className="flex flex-col gap-4">
        <div>
          <div>Select video</div>
          <input
            className="file:mr-4 file:rounded file:bg-gray-200 file:px-4 file:py-2 file:text-sm hover:file:bg-gray-300 file:cursor-pointer cursor-pointer"
            type="file"
            name="video"
            accept="video/*"
            onChange={handleInput}
          />
        </div>
        <div>
          <div>Select thumbnail</div>
          <input
            className="file:mr-4 file:rounded file:bg-gray-200 file:px-4 file:py-2 file:text-sm hover:file:bg-gray-300 file:cursor-pointer cursor-pointer"
            type="file"
            name="thumbnail"
            accept="image/*"
            onChange={handleInput}
          />
        </div>
        <div>
          <div>Title</div>
          <input
            type="text"
            name="title"
            className="border border-gray-400 rounded outline-none px-1 w-1/2"
            onChange={handleInput}
          />
        </div>
        <div>
          <div>Description</div>
          <textarea
            className="border border-gray-400 rounded outline-none px-1 w-1/2"
            onChange={handleTextArea}
          />
        </div>
      </div>
      <button
        onClick={upload}
        className="mt-4 bg-gray-200 rounded px-2 py-1 w-max cursor-pointer hover:bg-gray-300 active:outline"
      >
        Upload
      </button>
    </main>
  );
}
