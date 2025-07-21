import axios from 'axios';

const BASE_URL = 'https://chatty-with-app.onrender.com/api'


export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
