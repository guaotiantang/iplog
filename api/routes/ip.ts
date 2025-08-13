import express from 'express';
import { IPService, ConfigService } from '../services/ipService';
import { restartAutoCleanup, getNextCleanupTime } from '../app';

const router = express.Router();

// 添加IP记录
router.get('/add', async (req, res) => {
  try {
    const { ip } = req.query;
    
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'IP地址参数缺失或无效'
      });
    }

    const result = await IPService.addIP(ip);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error adding IP:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 检查IP是否存在
router.get('/check', async (req, res) => {
  try {
    const { ip } = req.query;
    
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({
        exists: false,
        message: 'IP地址参数缺失或无效'
      });
    }

    const result = await IPService.checkIP(ip);
    res.json(result);
  } catch (error) {
    console.error('Error checking IP:', error);
    res.status(500).json({
      exists: false,
      message: '服务器内部错误'
    });
  }
});

// 设置超时配置
router.get('/set', async (req, res) => {
  try {
    const { timeout } = req.query;
    
    if (!timeout) {
      return res.status(400).json({
        success: false,
        message: '超时参数缺失'
      });
    }

    const timeoutSeconds = parseInt(timeout as string, 10);
    if (isNaN(timeoutSeconds)) {
      return res.status(400).json({
        success: false,
        message: '超时参数必须是数字'
      });
    }

    const result = await ConfigService.setTimeout(timeoutSeconds);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error setting timeout:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取当前超时配置
router.get('/timeout', async (req, res) => {
  try {
    const timeout = await ConfigService.getTimeout();
    res.json({
      timeout
    });
  } catch (error) {
    console.error('Error getting timeout:', error);
    res.status(500).json({
      timeout: 3600,
      message: '获取配置失败，返回默认值'
    });
  }
});

// 获取IP列表
router.get('/list', async (req, res) => {
  try {
    const records = await IPService.getIPList();
    res.json({
      data: records
    });
  } catch (error) {
    console.error('Error getting IP list:', error);
    res.status(500).json({
      data: [],
      message: '服务器内部错误'
    });
  }
});

// 删除IP记录
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recordId = parseInt(id, 10);
    
    if (isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        message: 'ID参数无效'
      });
    }

    const result = await IPService.deleteIP(recordId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error deleting IP:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 清空所有IP记录
router.delete('/clear', async (req, res) => {
  try {
    const result = await IPService.clearAllIPs();
    res.json(result);
  } catch (error) {
    console.error('Error clearing IPs:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取自动清理配置
router.get('/auto-cleanup', async (req, res) => {
  try {
    const config = await ConfigService.getAutoCleanup();
    res.json(config);
  } catch (error) {
    console.error('Error getting auto cleanup config:', error);
    res.status(500).json({
      enabled: true,
      interval: 300,
      message: '获取自动清理配置失败，返回默认值'
    });
  }
});

// 获取下次清理时间
router.get('/next-cleanup', async (req, res) => {
  try {
    const nextCleanupTime = getNextCleanupTime();
    res.json({
      success: true,
      nextCleanupTime,
      remainingSeconds: Math.max(0, Math.floor((nextCleanupTime - Date.now()) / 1000))
    });
  } catch (error) {
    console.error('Error getting next cleanup time:', error);
    res.status(500).json({
      success: false,
      message: '获取下次清理时间失败'
    });
  }
});

// 设置自动清理配置
router.post('/auto-cleanup', async (req, res) => {
  try {
    const { enabled, interval } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '启用状态参数无效'
      });
    }
    
    if (typeof interval !== 'number') {
      return res.status(400).json({
        success: false,
        message: '清理间隔参数无效'
      });
    }

    const result = await ConfigService.setAutoCleanup(enabled, interval);
    if (result.success) {
      // 重启自动清理任务以应用新配置
      await restartAutoCleanup();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error setting auto cleanup config:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;