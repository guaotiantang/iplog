import { IPRecordDAO, ConfigDAO, type IPRecord } from '../database/models.js';
import { cleanupExpiredIPs } from '../database/init.js';

// IP记录扩展接口，包含到期时间
export interface IPRecordWithExpiry extends IPRecord {
  expires_at: string;
}

// IP服务类
export class IPService {
  // 添加IP记录
  static async addIP(ip: string): Promise<{ success: boolean; message: string; data?: IPRecord }> {
    try {
      // 验证IP地址格式
      if (!this.isValidIP(ip)) {
        return {
          success: false,
          message: 'IP地址格式无效'
        };
      }

      // 检查IP是否已存在
      const existingIP = await IPRecordDAO.checkIPExists(ip);
      if (existingIP) {
        return {
          success: true,
          message: 'IP地址已存在',
          data: existingIP
        };
      }

      // 添加新IP记录
      const newRecord = await IPRecordDAO.addIP(ip);
      return {
        success: true,
        message: 'IP添加成功',
        data: newRecord
      };
    } catch (error) {
      console.error('IPService.addIP error:', error);
      return {
        success: false,
        message: '添加IP失败'
      };
    }
  }

  // 检查IP是否存在
  static async checkIP(ip: string): Promise<{ exists: boolean; data?: IPRecord }> {
    try {
      const record = await IPRecordDAO.checkIPExists(ip);
      return {
        exists: !!record,
        data: record || undefined
      };
    } catch (error) {
      console.error('IPService.checkIP error:', error);
      return {
        exists: false
      };
    }
  }

  // 获取IP列表（包含到期时间）
  static async getIPList(): Promise<IPRecordWithExpiry[]> {
    try {
      // 先清理过期记录
      await cleanupExpiredIPs();
      
      const records = await IPRecordDAO.getAllIPs();
      const timeout = await ConfigDAO.getTimeout();
      
      // 计算到期时间
      return records.map(record => ({
        ...record,
        expires_at: this.calculateExpiryTime(record.created_at, timeout)
      }));
    } catch (error) {
      console.error('IPService.getIPList error:', error);
      return [];
    }
  }

  // 删除IP记录
  static async deleteIP(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const deleted = await IPRecordDAO.deleteIP(id);
      if (deleted) {
        return {
          success: true,
          message: 'IP记录删除成功'
        };
      } else {
        return {
          success: false,
          message: 'IP记录不存在'
        };
      }
    } catch (error) {
      console.error('IPService.deleteIP error:', error);
      return {
        success: false,
        message: '删除IP失败'
      };
    }
  }

  // 清空所有IP记录
  static async clearAllIPs(): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    try {
      const deletedCount = await IPRecordDAO.clearAllIPs();
      return {
        success: true,
        message: `已清空 ${deletedCount} 条IP记录`,
        deletedCount
      };
    } catch (error) {
      console.error('IPService.clearAllIPs error:', error);
      return {
        success: false,
        message: '清空IP记录失败'
      };
    }
  }

  // 验证IP地址格式
  private static isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  // 计算到期时间
  private static calculateExpiryTime(createdAt: string, timeoutSeconds: number): string {
    const createdDate = new Date(createdAt);
    const expiryDate = new Date(createdDate.getTime() + timeoutSeconds * 1000);
    // 返回ISO格式的时间字符串
    return expiryDate.toISOString();
  }
}

// 配置服务类
export class ConfigService {
  // 获取超时配置
  static async getTimeout(): Promise<number> {
    try {
      return await ConfigDAO.getTimeout();
    } catch (error) {
      console.error('ConfigService.getTimeout error:', error);
      return 3600; // 默认1小时
    }
  }

  // 设置超时配置
  static async setTimeout(seconds: number): Promise<{ success: boolean; message: string; timeout?: number }> {
    try {
      if (!this.isValidTimeout(seconds)) {
        return {
          success: false,
          message: '超时参数必须是正整数'
        };
      }

      await ConfigDAO.setTimeout(seconds);
      return {
        success: true,
        message: '超时配置更新成功',
        timeout: seconds
      };
    } catch (error) {
      console.error('ConfigService.setTimeout error:', error);
      return {
        success: false,
        message: '设置超时配置失败'
      };
    }
  }

  // 验证超时参数
  private static isValidTimeout(seconds: number): boolean {
    return Number.isInteger(seconds) && seconds > 0;
  }

  // 获取自动清理配置
  static async getAutoCleanup(): Promise<{ enabled: boolean; interval: number }> {
    try {
      const enabled = await ConfigDAO.getConfig('auto_cleanup_enabled');
      const interval = await ConfigDAO.getConfig('auto_cleanup_interval');
      return {
        enabled: enabled === 'true',
        interval: parseInt(interval || '300', 10)
      };
    } catch (error) {
      console.error('ConfigService.getAutoCleanup error:', error);
      return {
        enabled: true,
        interval: 300
      };
    }
  }

  // 设置自动清理配置
  static async setAutoCleanup(enabled: boolean, interval: number): Promise<{ success: boolean; message: string }> {
    try {
      if (!Number.isInteger(interval) || interval < 30) {
        return {
          success: false,
          message: '清理间隔必须是大于等于30秒的整数'
        };
      }

      await ConfigDAO.setConfig('auto_cleanup_enabled', enabled.toString());
      await ConfigDAO.setConfig('auto_cleanup_interval', interval.toString());
      
      return {
        success: true,
        message: '自动清理配置更新成功'
      };
    } catch (error) {
      console.error('ConfigService.setAutoCleanup error:', error);
      return {
        success: false,
        message: '设置自动清理配置失败'
      };
    }
  }
}