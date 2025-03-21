import axios from "axios";

const api = axios.create({
  baseURL: `http://localhost:${process.env.NEXT_PUBLIC_PORT}`,
  withCredentials: true,
});

export default api;
