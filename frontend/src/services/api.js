/**
 * API Service Layer
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
  // Check backend health
  async checkHealth() {
    const res = await axios.get(`${API_BASE}/health`);
    return res.data;
  },

  // Upload report file (PDF, JPG, PNG)
  async uploadReport(file, onProgress) {
    const formData = new FormData();
    formData.append('report', file);

    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return res.data;
  },

  // Send message to chatbot (supports multilingual & simple explanation mode)
  async sendChatMessage(conversationId, reportId, message, language = 'en', simpleMode = false) {
    const res = await axios.post(`${API_BASE}/chat`, {
      conversation_id: conversationId,
      report_id: reportId,
      message,
      language,
      simple_mode: simpleMode
    });
    return res.data;
  },

  // Get concise spoken summary for Read Report Aloud
  async getSpokenSummary(reportId, language = 'en', simpleMode = true) {
    const res = await axios.get(`${API_BASE}/reports/${reportId}/spoken-summary`, {
      params: { language, simple_mode: simpleMode }
    });
    return res.data;
  },

  // Get all reports
  async getReports() {
    const res = await axios.get(`${API_BASE}/reports`);
    return res.data;
  },

  // Get report details by ID
  async getReportById(id) {
    const res = await axios.get(`${API_BASE}/reports/${id}`);
    return res.data;
  },

  // Delete report
  async deleteReport(id) {
    const res = await axios.delete(`${API_BASE}/reports/${id}`);
    return res.data;
  },

  // Get conversations
  async getConversations() {
    const res = await axios.get(`${API_BASE}/conversations`);
    return res.data;
  },

  // Get messages for conversation
  async getMessages(conversationId) {
    const res = await axios.get(`${API_BASE}/conversations/${conversationId}/messages`);
    return res.data;
  },

  // Get research evaluation benchmark
  async getEvaluations() {
    const res = await axios.get(`${API_BASE}/evaluations`);
    return res.data;
  }
};
