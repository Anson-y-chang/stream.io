"use client"; // 確保在瀏覽器端執行

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/utils/axios";

export default function Navbar() {
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    const handleUpdateLoginStatus = (event: Event) => {
      setIsLogin((event as CustomEvent).detail);
    };

    window.addEventListener("updateLoginStatus", handleUpdateLoginStatus);

    return () => {
      window.removeEventListener("updateLoginStatus", handleUpdateLoginStatus);
    };
  }, []);

  const router = useRouter();

  const logOut = () => {
    axios
      .post("/api/auth/logout")
      .then((res) => {
        if (res.status == 200) {
          window.dispatchEvent(
            new CustomEvent("updateLoginStatus", { detail: false })
          );
          router.push("/");
          alert(res.data.message);
        }
      })
      .catch((err) => {
        alert(err.response.data.message);
      });
  };

  return (
    <nav className="px-4 h-20 flex gap-4 items-center bg-gray-800 text-white text-xl">
      <Link href="/">Home</Link>
      <Link href="/my_video">My video</Link>
      {isLogin ? (
        <>
          <Link href={"/upload"} className="ml-auto">
            Upload file
          </Link>
          <button className="cursor-pointer" onClick={logOut}>
            Log out
          </button>
        </>
      ) : (
        <>
          <Link href={"/login"} className="ml-auto">
            Login
          </Link>
          <Link href={"/sign-up"}>Sign up</Link>
        </>
      )}
    </nav>
  );
}
