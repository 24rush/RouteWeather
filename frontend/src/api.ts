import axios from 'axios';
import type { RouteScoringDetails } from './types';

// Set base URL from environment variable for cross-domain production environments.
// For local development, if VITE_API_URL is undefined, it uses relative paths which Vite proxies!
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
} else {
  // Hardcoded for testing the production API from local UI
  const goProd = false;
  axios.defaults.baseURL = goProd ? "https://routeweather-api.politecoast-991ad491.centralus.azurecontainerapps.io" :
    "http://localhost:5194";
}

// Let's create an interface to type our API responses
export const api = {
  uploadGpx: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`/api/gpx/uploadAnon`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const data = response.data;
    if (data && typeof data.physics === 'string') {
      try {
        data.physics = JSON.parse(data.physics);
      } catch (e) {
        console.error("Failed to parse physics JSON", e);
      }
    }
    return data;
  },

  getHomepageData: async (id: string, date?: string): Promise<RouteScoringDetails> => {
    let url = `/api/homepage?id=${id}`;
    if (date) url += `&date=${encodeURIComponent(date)}`;
    const response = await axios.get(url);
    const data = response.data;
    if (data && typeof data.physics === 'string') {
      try {
        data.physics = JSON.parse(data.physics);
      } catch (e) {
        console.error("Failed to parse physics JSON", e);
      }
    }
    return data;
  },

  getOwnerRoutes: async (owner: string): Promise<any[]> => {
    const response = await axios.get(`/api/gpx/${owner}`);
    return response.data;
  },
};
