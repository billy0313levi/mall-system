import { defineStore } from 'pinia';
import http from '../api/http';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === 'admin'
  },
  actions: {
    setAuth(payload) {
      this.token = payload.token;
      this.user = payload.user;
    },
    async fetchProfile() {
      const response = await http.get('/users/me');
      this.user = response.data;
      return response.data;
    },
    async logoutRequest() {
      try {
        if (this.token) {
          await http.post('/users/logout');
        }
      } catch (_error) {
      } finally {
        this.clearLocalAuth();
      }
    },
    clearLocalAuth() {
      this.token = '';
      this.user = null;
    }
  },
  // 开启持久化，默认用localStorage存储整个auth仓库
  persist: true
});