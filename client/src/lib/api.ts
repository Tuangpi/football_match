import axios from 'axios';

export const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Optionally redirect to login
    }
    return Promise.reject(err);
  }
);

export default api;

export interface SuggestItem {
  id: string;
  [key: string]: unknown;
}

export async function suggestCourts(q: string) {
  const res = await api.get('/courts/suggest', { params: { q } });
  return res.data;
}

export async function suggestEvents(q: string) {
  const res = await api.get('/events/suggest', { params: { q } });
  return res.data;
}

export async function suggestPlayers(q: string) {
  const res = await api.get('/players/suggest', { params: { q } });
  return res.data;
}