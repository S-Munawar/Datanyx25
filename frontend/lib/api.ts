import axios from 'axios';
import type { ApiResponse, PaginatedResponse, User, HealthRecord, License } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance with defaults
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<{ success: boolean; message: string; accessToken: string; refreshToken: string; user: User }>('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { email: string; password: string; firstName: string; lastName: string; role: string; licenseNumber?: string }) => {
    const response = await api.post<{ success: boolean; message: string; accessToken: string; refreshToken: string; user: User }>('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post<ApiResponse<null>>('/auth/logout', { refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<{ success: boolean; user: User; profile: any }>('/auth/me');
    return response.data;
  },

  googleAuth: () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },

  verifyEmail: async (token: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/verify-email', { token });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    const response = await api.get<{ success: boolean; user: User; profile: any }>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await api.patch<{ success: boolean; user: User }>('/users/profile', data);
    return response.data;
  },

  updatePreferences: async (preferences: any) => {
    const response = await api.patch('/users/preferences', { preferences });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post<ApiResponse<null>>('/users/change-password', { currentPassword, newPassword });
    return response.data;
  },

  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const response = await api.post('/users/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Health Records API (Patient routes)
export const healthRecordApi = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get<{ success: boolean; records: HealthRecord[]; pagination: any }>('/patient/health-records', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; record: HealthRecord }>(`/patient/health-records/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<{ success: boolean; healthRecord: HealthRecord }>('/patient/health-records', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put<{ success: boolean; record: HealthRecord }>(`/patient/health-records/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/patient/health-records/${id}`);
    return response.data;
  },

  uploadGeneFile: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('geneFile', file);
    const response = await api.post(`/patient/health-records/${id}/gene-file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getGeneFileDownloadUrl: async (id: string) => {
    const response = await api.get(`/patient/health-records/${id}/gene-file/download`);
    return response.data;
  },

  shareRecord: async (id: string, userId: string, accessLevel: string = 'view', expiresInDays?: number) => {
    const response = await api.post(`/patient/health-records/${id}/share`, { userId, accessLevel, expiresInDays });
    return response.data;
  },

  requestPrediction: async (id: string) => {
    const response = await api.post<{ success: boolean; status: string }>(`/patient/health-records/${id}/predict`);
    return response.data;
  },
};

// Counselor API
export const counselorApi = {
  getAssignedPatients: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<{ success: boolean; patients: any[]; pagination: any }>('/counselor/patients', { params });
    return response.data;
  },

  getAvailablePatients: async (params?: { search?: string; page?: number; limit?: number }) => {
    const response = await api.get<{ success: boolean; patients: any[]; pagination: any }>('/counselor/patients/available', { params });
    return response.data;
  },

  getPatientRecords: async (patientId: string) => {
    const response = await api.get(`/counselor/patients/${patientId}/records`);
    return response.data;
  },

  getPatientHistory: async (patientId: string) => {
    const response = await api.get(`/counselor/patients/${patientId}/history`);
    return response.data;
  },

  addPatientNotes: async (patientId: string, notes: string) => {
    const response = await api.post(`/counselor/patients/${patientId}/notes`, { notes });
    return response.data;
  },

  getPendingReviews: async (params?: { page?: number; limit?: number; riskLevel?: string }) => {
    const response = await api.get<{ success: boolean; reviews: any[]; pagination: any }>('/counselor/reviews/pending', { params });
    return response.data;
  },

  submitReview: async (recordId: string, review: any) => {
    const response = await api.post(`/counselor/records/${recordId}/review`, review);
    return response.data;
  },

  getRecordById: async (recordId: string) => {
    const response = await api.get<{ success: boolean; record: HealthRecord }>(`/counselor/records/${recordId}`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/counselor/analytics');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get<{ success: boolean; stats: any }>('/counselor/dashboard');
    return response.data;
  },

  // Assessment methods
  getAssessments: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get<{ success: boolean; assessments: any[]; pagination: any }>('/counselor/assessments', { params });
    return response.data;
  },

  createAssessment: async (data: { patientId: string; patientData: any; runPrediction?: boolean }) => {
    const response = await api.post<{ success: boolean; assessment: any; warning?: string }>('/counselor/assessments', data);
    return response.data;
  },

  getAssessment: async (id: string) => {
    const response = await api.get<{ success: boolean; assessment: any }>(`/counselor/assessments/${id}`);
    return response.data;
  },

  requestAssessmentPrediction: async (id: string) => {
    const response = await api.post<{ success: boolean; status: string; prediction?: any }>(`/counselor/assessments/${id}/predict`);
    return response.data;
  },

  getMLStatus: async () => {
    const response = await api.get<{ success: boolean; mlService: { available: boolean; message: string } }>('/counselor/ml-status');
    return response.data;
  },
};

// Admin API
export const adminApi = {
  getUsers: async (params?: { page?: number; limit?: number; role?: string; status?: string }) => {
    const response = await api.get<{ success: boolean; users: User[]; pagination: any }>('/admin/users', { params });
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await api.get<{ success: boolean; user: User }>(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId: string, status: string) => {
    const response = await api.patch<{ success: boolean; user: User }>(`/admin/users/${userId}/status`, { status });
    return response.data;
  },

  deactivateUser: async (userId: string) => {
    const response = await api.post(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  getLicenses: async (params?: { page?: number; limit?: number; status?: string; type?: string }) => {
    const response = await api.get<{ success: boolean; licenses: License[]; pagination: any }>('/admin/licenses', { params });
    return response.data;
  },

  createLicense: async (data: { licenseNumber: string; type: string; expiresAt?: string }) => {
    const response = await api.post('/admin/licenses', data);
    return response.data;
  },

  bulkCreateLicenses: async (data: { type: string; count: number; prefix?: string; expiresAt?: string }) => {
    const response = await api.post('/admin/licenses/bulk', data);
    return response.data;
  },

  revokeLicense: async (licenseId: string, reason: string) => {
    const response = await api.put(`/admin/licenses/${licenseId}/revoke`, { reason });
    return response.data;
  },

  getExpiringLicenses: async () => {
    const response = await api.get('/admin/licenses/expiring-soon');
    return response.data;
  },

  assignCounselor: async (patientId: string, counselorId: string) => {
    const response = await api.post('/admin/assign-counselor', { patientId, counselorId });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get<{ success: boolean; stats: any }>('/admin/dashboard');
    return response.data;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number; action?: string; userId?: string }) => {
    const response = await api.get<{ success: boolean; logs: any[]; pagination: any }>('/admin/audit-logs', { params });
    return response.data;
  },

  getSecurityStats: async () => {
    const response = await api.get('/admin/security-stats');
    return response.data;
  },

  getSystemHealth: async () => {
    const response = await api.get('/admin/system-health');
    return response.data;
  },

  getSystemSettings: async () => {
    const response = await api.get<{ success: boolean; settings: any }>('/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (settings: any) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },
};

// License API
export const licenseApi = {
  getMyLicenses: async () => {
    const response = await api.get<ApiResponse<License[]>>('/licenses/my');
    return response.data;
  },

  submit: async (data: FormData) => {
    const response = await api.post<ApiResponse<License>>('/licenses', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<License>>(`/licenses/${id}`);
    return response.data;
  },
};

// Researcher API
export const researcherApi = {
  getDashboardStats: async () => {
    const response = await api.get<{ success: boolean; stats: any }>('/researcher/dashboard');
    return response.data;
  },

  getDatasets: async () => {
    const response = await api.get<{ success: boolean; datasets: any[] }>('/researcher/datasets');
    return response.data;
  },

  getDatasetDetails: async (type: string) => {
    const response = await api.get(`/researcher/datasets/${type}`);
    return response.data;
  },

  runAnalysis: async (data: any) => {
    const response = await api.post('/researcher/analysis', data);
    return response.data;
  },

  getAnalyses: async () => {
    const response = await api.get<{ success: boolean; analyses: any[] }>('/researcher/analyses');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/researcher/analytics');
    return response.data;
  },

  exportDataset: async (data: { type: string; format: string }) => {
    const response = await api.post('/researcher/export', data);
    return response.data;
  },

  // Assessment methods
  getAvailablePatients: async (params?: { search?: string; page?: number; limit?: number }) => {
    const response = await api.get<{ success: boolean; patients: any[]; pagination: any }>('/researcher/patients/available', { params });
    return response.data;
  },

  getAssessments: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get<{ success: boolean; assessments: any[]; pagination: any }>('/researcher/assessments', { params });
    return response.data;
  },

  createAssessment: async (data: { patientId: string; patientData: any; runPrediction?: boolean }) => {
    const response = await api.post<{ success: boolean; assessment: any; warning?: string }>('/researcher/assessments', data);
    return response.data;
  },

  getAssessment: async (id: string) => {
    const response = await api.get<{ success: boolean; assessment: any }>(`/researcher/assessments/${id}`);
    return response.data;
  },

  requestAssessmentPrediction: async (id: string) => {
    const response = await api.post<{ success: boolean; status: string; prediction?: any }>(`/researcher/assessments/${id}/predict`);
    return response.data;
  },

  getMLStatus: async () => {
    const response = await api.get<{ success: boolean; mlService: { available: boolean; message: string } }>('/researcher/ml-status');
    return response.data;
  },
};

export default api;
