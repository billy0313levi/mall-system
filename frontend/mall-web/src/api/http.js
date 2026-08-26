import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000
});

// 请求拦截器：内部动态导入pinia，规避顶层循环依赖
http.interceptors.request.use(async (config) => {
  // 函数内动态引入，不会启动时报路径/实例未创建错误
  const { useAuthStore } = await import('@/stores/auth');
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

// 响应拦截器
http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // 401 令牌过期处理
    if (error.response?.status === 401) {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      authStore.clearLocalAuth();
      // 跳转登录页
      location.replace('/login');
    }
    const message = error.response?.data?.message || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export default http;