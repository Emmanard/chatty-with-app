import axios from 'axios';

// Use your local IP if in development
const BASE_URL = __DEV__ ? 'http://10.196.53.134:5001/api' : '/api';


export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
