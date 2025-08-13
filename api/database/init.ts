import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'iplog.db');

// 确保数据目录存在
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// 初始化数据库表
export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 创建IP记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS ip_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip VARCHAR(45) NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating ip_records table:', err.message);
          reject(err);
          return;
        }
        console.log('IP records table created or already exists.');
      });

      // 创建配置表
      db.run(`
        CREATE TABLE IF NOT EXISTS config (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating config table:', err.message);
          reject(err);
          return;
        }
        console.log('Config table created or already exists.');
      });

      // 创建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_ip_records_ip ON ip_records(ip)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_ip_records_created_at ON ip_records(created_at)`);

      // 插入默认配置（如果不存在）
      db.run(`
        INSERT OR IGNORE INTO config (key, value) 
        VALUES 
          ('timeout', '3600'),
          ('auto_cleanup_enabled', 'true'),
          ('auto_cleanup_interval', '300')
      `, (err) => {
        if (err) {
          console.error('Error inserting default config:', err.message);
          reject(err);
          return;
        }
        console.log('Default configurations initialized.');
        resolve();
      });
    });
  });
};

// 关闭数据库连接
export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
      } else {
        console.log('Database connection closed.');
        resolve();
      }
    });
  });
};

// 清理过期IP记录
export const cleanupExpiredIPs = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const sql = `
      DELETE FROM ip_records 
      WHERE datetime(created_at, '+' || (SELECT value FROM config WHERE key = 'timeout') || ' seconds') < datetime('now')
    `;
    
    db.run(sql, function(err) {
      if (err) {
        console.error('Error cleaning up expired IPs:', err.message);
        reject(err);
      } else {
        console.log(`Cleaned up ${this.changes} expired IP records.`);
        resolve(this.changes);
      }
    });
  });
};