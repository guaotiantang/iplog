// API基础配置
const API_BASE_URL = '/api';

// IP记录接口
export interface IPRecord {
  id: number;
  ip: string;
  created_at: string;
  expires_at?: string;
}

// API响应接口
export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  exists?: boolean;
  timeout?: number;
  deletedCount?: number;
  nextCleanupTime?: number;
  remainingSeconds?: number;
}

// HTTP请求工具函数
const request = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '网络错误' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// IP管理API
export const ipApi = {
  // 添加IP
  async addIP(ip: string): Promise<ApiResponse<IPRecord>> {
    return request(`/ip/add?ip=${encodeURIComponent(ip)}`);
  },

  // 检查IP是否存在
  async checkIP(ip: string): Promise<ApiResponse<IPRecord>> {
    return request(`/ip/check?ip=${encodeURIComponent(ip)}`);
  },

  // 获取IP列表
  async getIPList(): Promise<ApiResponse<IPRecord[]>> {
    return request('/ip/list');
  },

  // 删除IP
  async deleteIP(id: number): Promise<ApiResponse> {
    return request(`/ip/delete/${id}`, {
      method: 'DELETE',
    });
  },

  // 清空所有IP
  async clearAllIPs(): Promise<ApiResponse> {
    return request('/ip/clear', {
      method: 'DELETE',
    });
  },

  // 获取超时配置
  async getTimeout(): Promise<ApiResponse> {
    return request('/ip/timeout');
  },

  // 设置超时配置
  async setTimeout(seconds: number): Promise<ApiResponse> {
    return request(`/ip/set?timeout=${seconds}`);
  },

  // 获取自动清理配置
  async getAutoCleanup(): Promise<ApiResponse<{enabled: boolean; interval: number}>> {
    return request('/ip/auto-cleanup');
  },

  // 设置自动清理配置
  async setAutoCleanup(enabled: boolean, interval: number): Promise<ApiResponse> {
    return request('/ip/auto-cleanup', {
      method: 'POST',
      body: JSON.stringify({ enabled, interval }),
    });
  },

  // 获取下次清理时间
  async getNextCleanupTime(): Promise<ApiResponse<{nextCleanupTime: number; remainingSeconds: number}>> {
    return request('/ip/next-cleanup');
  },
};

// 格式化时间（转换为中国时间）
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  // 直接使用中国时区格式化
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai'
  });
};

// 检查IP是否过期
export const isIPExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

// 计算剩余时间
export const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) {
    return '已过期';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
};