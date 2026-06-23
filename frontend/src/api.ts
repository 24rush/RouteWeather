import axios from 'axios';
import type { RouteScoringDetails } from './types';

// Set base URL directly since CORS is enabled on the .NET API
axios.defaults.baseURL = 'http://localhost:5194';

// Let's create an interface to type our API responses
export const api = {
  uploadGpx: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post('/api/gpx/upload', formData, {
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
