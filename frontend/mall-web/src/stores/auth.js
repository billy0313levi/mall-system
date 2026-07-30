import { defineStore } from 'pinia';
import http from '../api/http';

const userStorageKey = 'mall_user';
const tokenStorageKey = 'mall_token';

function readStoredUser() {
  const value = localStorage.getItem(userStorageKey);
  return value ? JSON.parse(value) : null;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(tokenStorageKey) || '',
    user: readStoredUser()
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === 'admin'
  },
  actions: {
    setAuth(payload) {
      this.token = payload.token;
      this.user = payload.user;
      localStorage.setItem(tokenStorageKey, payload.token);
      localStorage.setItem(userStorageKey, JSON.stringify(payload.user));
    },
    async fetchProfile() {
      const response = await http.get('/users/me');
      this.user = response.data;
      localStorage.setItem(userStorageKey, JSON.stringify(response.data));
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
      localStorage.removeItem(tokenStorageKey);
      localStorage.removeItem(userStorageKey);
    }
  }
});
