import axios from 'axios';
import type { RouteScoringDetails } from './types';

// Set base URL from environment variable for cross-domain production environments.
// For local development, if VITE_API_URL is undefined, it uses relative paths which Vite proxies!
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

// Let's create an interface to type our API responses
export const api = {
  uploadGpx: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post('/api/gpx/uploadAnon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getHomepageData: async (): Promise<RouteScoringDetails> => {
    const response = await axios.get('/api/homepage');
    return response.data;
  },
};
