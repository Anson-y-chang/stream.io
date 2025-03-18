"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { UserInfo } from "@/model/login";

export default function Login() {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    email: "",
    password: "",
  });
  const router = useRouter();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const login = () => {
    if (!userInfo.email) {
      alert("pls enter email");
      return;
    }

    if (!userInfo.password) {
      alert("pls enter password");
      return;
    }

    axios
      .post("/api/auth/login", userInfo, { withCredentials: true })
      .then((res) => {
        if (res.status == 200) {
          window.dispatchEvent(
            new CustomEvent("updateLoginStatus", { detail: true })
          );
          router.push("/");
        }
      })
      .catch((err) => {
        if (err.response.status == 302) {
          if (confirm(err.response.data.message)) {
            router.push("/sign-up");
          }
        } else {
          alert(err.response.data.message);
        }
      });
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-4 row-start-2 items-center sm:items-start">
        <div className="text-3xl px-6">Login</div>
        <div
          className="flex flex-col gap-4 p-6 justify-start rounded border border-gray-200"
          style={{
            boxShadow: "10px 15px 15px 2px oklch(0.707 0.022 261.325) ",
          }}
        >
          <div className="flex flex-col gap-2">
            <div>email</div>
            <input
              className="border border-gray-500 rounded px-1 outline-none"
              type="text"
              name="email"
              value={userInfo.email}
              onChange={handleInput}
            />
          </div>{" "}
          <div className="flex flex-col gap-2">
            <div>password</div>
            <input
              className="border border-gray-500 rounded px-1 outline-none"
              type="password"
              name="password"
              value={userInfo.password}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  login();
                }
              }}
            />
          </div>
          <button
            onClick={login}
            className="mt-4 bg-gray-300 w-20 rounded cursor-pointer hover:bg-gray-400"
          >
            login
          </button>
        </div>
      </main>
    </div>
  );
}
