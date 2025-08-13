import { db } from './init.js';

// IP记录接口
export interface IPRecord {
  id: number;
  ip: string;
  created_at: string;
}

// 配置接口
export interface Config {
  key: string;
  value: string;
}

// IP记录数据访问对象
export class IPRecordDAO {
  // 添加IP记录
  static addIP(ip: string): Promise<IPRecord> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO ip_records (ip) VALUES (?)';
      db.run(sql, [ip], function(err) {
        if (err) {
          reject(err);
        } else {
          // 获取刚插入的记录
          IPRecordDAO.getIPById(this.lastID).then(resolve).catch(reject);
        }
      });
    });
  }

  // 根据ID获取IP记录
  static getIPById(id: number): Promise<IPRecord> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM ip_records WHERE id = ?';
      db.get(sql, [id], (err, row: IPRecord) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(row);
        } else {
          reject(new Error('IP record not found'));
        }
      });
    });
  }

  // 根据IP地址检查是否存在
  static checkIPExists(ip: string): Promise<IPRecord | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM ip_records WHERE ip = ?';
      db.get(sql, [ip], (err, row: IPRecord) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  // 获取所有IP记录
  static getAllIPs(): Promise<IPRecord[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM ip_records ORDER BY created_at DESC';
      db.all(sql, [], (err, rows: IPRecord[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // 删除IP记录
  static deleteIP(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM ip_records WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // 清空所有IP记录
  static clearAllIPs(): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM ip_records';
      db.run(sql, [], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
}

// 配置数据访问对象
export class ConfigDAO {
  // 获取配置值
  static getConfig(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT value FROM config WHERE key = ?';
      db.get(sql, [key], (err, row: { value: string }) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.value : null);
        }
      });
    });
  }

  // 设置配置值
  static setConfig(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)';
      db.run(sql, [key, value], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // 获取超时配置
  static getTimeout(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const timeoutStr = await this.getConfig('timeout');
        const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 3600;
        resolve(timeout);
      } catch (err) {
        reject(err);
      }
    });
  }

  // 设置超时配置
  static setTimeout(seconds: number): Promise<void> {
    return this.setConfig('timeout', seconds.toString());
  }
}