<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ipApi, type IPRecord, getTimeRemaining, isIPExpired } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog.vue';

// 响应式数据
const ipList = ref<IPRecord[]>([]);
const loading = ref(false);
const newIP = ref('');
const currentTimeout = ref(3600);
const newTimeout = ref(3600);
const addingIP = ref(false);
const settingTimeout = ref(false);
const currentPage = ref(1);
const pageSize = ref(50);
const searchQuery = ref('');
const message = ref('');
const messageType = ref<'success' | 'error' | 'warning'>('success');
const showMessage = ref(false);
const cleanupCountdown = ref(0);
const cleanupTimer = ref<NodeJS.Timeout | null>(null);
const autoCleanupInterval = ref(300); // 默认5分钟
const settingAutoCleanup = ref(false);

// 计算属性
const ipListWithStatus = computed(() => {
  if (!Array.isArray(ipList.value)) {
    return [];
  }
  return ipList.value.map((item, index) => {
    if (!item) return null;
    
    // 直接在这里转换时间，+8小时显示
     const formatLocalDateTime = (dateString: string): string => {
       const date = new Date(dateString);
       // 加8小时
       date.setHours(date.getHours() + 8);
       return date.toLocaleString();
     };
    
    return {
      ...item,
      index: index + 1,
      formattedCreatedAt: item.created_at ? formatLocalDateTime(item.created_at) : '',
      formattedExpiresAt: item.expires_at ? formatLocalDateTime(item.expires_at) : '',
      timeRemaining: item.expires_at ? getTimeRemaining(item.expires_at) : '',
      expired: item.expires_at ? isIPExpired(item.expires_at) : false,
    };
  }).filter(Boolean);
});

// 过滤后的IP列表（搜索功能）
const filteredIPList = computed(() => {
  if (!searchQuery.value.trim()) {
    return ipListWithStatus.value;
  }
  return ipListWithStatus.value.filter(item => 
    item.ip.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// 分页相关计算属性
const totalPages = computed(() => {
  return Math.ceil(filteredIPList.value.length / pageSize.value);
});

const paginatedIPList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredIPList.value.slice(start, end).map((item, index) => ({
    ...item,
    index: start + index + 1
  }));
});

// 消息提示
const showMsg = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
  message.value = msg;
  messageType.value = type;
  showMessage.value = true;
  setTimeout(() => {
    showMessage.value = false;
  }, 3000);
};

// 确认对话框
const confirmDialog = ref({
  visible: false,
  message: '',
  resolve: null as ((value: boolean) => void) | null
});

const confirm = (msg: string): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmDialog.value = {
      visible: true,
      message: msg,
      resolve
    };
  });
};

const handleConfirm = () => {
  if (confirmDialog.value.resolve) {
    confirmDialog.value.resolve(true);
  }
  confirmDialog.value.visible = false;
};

const handleCancel = () => {
  if (confirmDialog.value.resolve) {
    confirmDialog.value.resolve(false);
  }
  confirmDialog.value.visible = false;
};

// 加载IP列表
const loadIPList = async (silent = false) => {
  try {
    if (!silent) {
      loading.value = true;
    }
    const response = await ipApi.getIPList();
    const newData = Array.isArray(response?.data) ? response.data : [];
    // 直接更新数据，确保页面能正确显示
    ipList.value = newData;
    console.log('Loaded IP list:', newData.length, 'records');
  } catch (error) {
    console.error('Load IP list error:', error);
    if (!silent) {
      showMsg('加载IP列表失败: ' + (error as Error).message, 'error');
    }
    ipList.value = [];
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
};

// 加载超时配置
const loadTimeout = async () => {
  try {
    const response = await ipApi.getTimeout();
    currentTimeout.value = response.timeout || 3600;
    newTimeout.value = response.timeout || 3600; // 将当前配置显示在输入框中
  } catch (error) {
    console.error('Load timeout error:', error);
    showMsg('加载超时配置失败: ' + (error as Error).message, 'error');
  }
};

// 添加IP
const addIP = async () => {
  if (!newIP.value.trim()) {
    showMsg('请输入IP地址', 'warning');
    return;
  }

  try {
    addingIP.value = true;
    const response = await ipApi.addIP(newIP.value.trim());
    if (response.success) {
      showMsg(response.message || 'IP添加成功', 'success');
      newIP.value = '';
      // 延迟加载避免抖动
      setTimeout(() => loadIPList(true), 100);
    } else {
      showMsg(response.message || 'IP添加失败', 'error');
    }
  } catch (error) {
    showMsg('添加IP失败: ' + (error as Error).message, 'error');
  } finally {
    addingIP.value = false;
  }
};

// 删除IP
const deleteIP = async (id: number, ip: string) => {
  try {
    const confirmed = await confirm(`确定要删除IP地址 ${ip} 吗？`);
    if (!confirmed) return;

    const response = await ipApi.deleteIP(id);
    if (response.success) {
      showMsg(response.message || 'IP删除成功', 'success');
      // 延迟加载避免抖动
      setTimeout(() => loadIPList(true), 100);
    } else {
      showMsg(response.message || 'IP删除失败', 'error');
    }
  } catch (error) {
    showMsg('删除IP失败: ' + (error as Error).message, 'error');
  }
};

// 清空所有IP
const clearAllIPs = async () => {
  try {
    const confirmed = await confirm('确定要清空所有IP记录吗？此操作不可恢复！');
    if (!confirmed) return;

    const response = await ipApi.clearAllIPs();
    if (response.success) {
      showMsg(response.message || '清空成功', 'success');
      // 延迟加载避免抖动
      setTimeout(() => loadIPList(true), 100);
    } else {
      showMsg(response.message || '清空失败', 'error');
    }
  } catch (error) {
    showMsg('清空失败: ' + (error as Error).message, 'error');
  }
};

// 设置超时配置
const setTimeoutConfig = async () => {
  if (newTimeout.value <= 0) {
    showMsg('超时时间必须大于0', 'warning');
    return;
  }

  try {
    settingTimeout.value = true;
    const response = await ipApi.setTimeout(newTimeout.value);
    if (response.success) {
      showMsg(response.message || '超时配置更新成功', 'success');
      currentTimeout.value = newTimeout.value;
      // 延迟加载避免抖动
      setTimeout(() => loadIPList(true), 100);
    } else {
      showMsg(response.message || '超时配置更新失败', 'error');
    }
  } catch (error) {
    showMsg('设置超时失败: ' + (error as Error).message, 'error');
  } finally {
    settingTimeout.value = false;
  }
};

// 分页相关方法
const handlePageChange = (page: number) => {
  currentPage.value = page;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const handlePageSizeChange = (size: string | number) => {
  pageSize.value = Number(size);
  currentPage.value = 1; // 重置到第一页
};

// 刷新数据
const refreshData = async () => {
  await loadIPList();
  showMsg('数据已刷新', 'success');
};

// 加载自动清理配置
const loadAutoCleanup = async () => {
  try {
    const response = await ipApi.getAutoCleanup();
    autoCleanupInterval.value = response.data?.interval || 300;
  } catch (error) {
    console.error('Load auto cleanup config error:', error);
    showMsg('加载自动清理配置失败: ' + (error as Error).message, 'error');
  }
};

// 设置自动清理
const setAutoCleanup = async () => {
  if (autoCleanupInterval.value < 30) {
    showMsg('清理间隔必须大于等于30秒', 'warning');
    return;
  }

  try {
    settingAutoCleanup.value = true;
    const response = await ipApi.setAutoCleanup(true, autoCleanupInterval.value);
    if (response.success) {
      showMsg(response.message || '自动清理设置成功', 'success');
      // 重新加载下次清理时间
      await loadNextCleanupTime();
    } else {
      showMsg(response.message || '自动清理设置失败', 'error');
    }
  } catch (error) {
    showMsg('设置自动清理失败: ' + (error as Error).message, 'error');
  } finally {
    settingAutoCleanup.value = false;
  }
};



// 搜索功能
const handleSearch = () => {
  currentPage.value = 1; // 搜索时重置到第一页
};

const clearSearch = () => {
  searchQuery.value = '';
  currentPage.value = 1;
};

// 加载下次清理时间并启动倒计时
const loadNextCleanupTime = async () => {
  try {
    const response = await ipApi.getNextCleanupTime();
    if (response.success && response.remainingSeconds !== undefined) {
      cleanupCountdown.value = Math.max(0, response.remainingSeconds);
      startCleanupCountdown();
    }
  } catch (error) {
    console.error('Load next cleanup time error:', error);
  }
};

// 启动清理倒计时
const startCleanupCountdown = () => {
  if (cleanupTimer.value) {
    clearInterval(cleanupTimer.value);
  }
  
  if (cleanupCountdown.value > 0) {
    cleanupTimer.value = setInterval(() => {
      cleanupCountdown.value = Math.max(0, cleanupCountdown.value - 1);
      
      if (cleanupCountdown.value <= 0) {
        // 倒计时结束，重新加载下次清理时间
        loadNextCleanupTime();
        // 同时刷新IP列表
        loadIPList(true);
      }
    }, 1000);
  }
};

// 格式化倒计时显示
const formatCountdown = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  } else {
    return `${secs}秒`;
  }
};

// 组件挂载时加载数据
onMounted(async () => {
  await loadIPList();
  await loadTimeout();
  await loadAutoCleanup();
  await loadNextCleanupTime();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (cleanupTimer.value) {
    clearInterval(cleanupTimer.value);
  }
});
</script>

<template>
  <div class="container">
    <!-- 消息提示 -->
    <div v-if="showMessage" :class="['message', messageType]">
      {{ message }}
    </div>

    <!-- 搜索和分页大小控制 -->
     <div class="search-controls">
       <div class="search-group">
         <input 
           v-model="searchQuery" 
           type="text" 
           placeholder="搜索IP地址" 
           @keyup.enter="handleSearch"
           class="search-input"
         />
         <button class="btn btn-primary" @click="handleSearch">
           搜索
         </button>
         <button class="btn btn-secondary" @click="clearSearch" v-if="searchQuery">
           清除
         </button>
       </div>
       
       <!-- 清理倒计时显示 -->
       <div class="countdown-display">
         <span class="countdown-label">下次清理过期数据：{{ formatCountdown(cleanupCountdown) }}</span>
       </div>
       
       <div class="pagesize-group">
         <label>每页显示：</label>
         <select v-model="pageSize" @change="handlePageSizeChange(($event.target as HTMLSelectElement).value)" class="pagesize-select">
           <option :value="50">50</option>
           <option :value="100">100</option>
           <option :value="200">200</option>
           <option :value="500">500</option>
         </select>
         <button class="btn btn-primary refresh-btn" @click="refreshData" :disabled="loading">
           {{ loading ? '刷新中...' : '刷新' }}
         </button>
       </div>
     </div>

     <!-- IP列表表格 -->
     <div class="table-container">
       <table class="ip-table">
         <thead>
           <tr>
             <th>序号</th>
             <th>IP地址</th>
             <th>提交时间</th>
             <th>到期时间</th>
             <th>操作</th>
           </tr>
         </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="loading">加载中...</td>
          </tr>
          <tr v-else-if="paginatedIPList.length === 0">
            <td colspan="5" class="empty">暂无IP记录</td>
          </tr>
          <tr v-else v-for="item in paginatedIPList" :key="item.id">
            <td>{{ item.index }}</td>
            <td class="ip-cell">{{ item.ip }}</td>
            <td>{{ item.formattedCreatedAt }}</td>
            <td>{{ item.formattedExpiresAt }}</td>
            <td>
              <button 
                class="btn btn-danger" 
                @click="deleteIP(item.id, item.ip)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页和操作区域 -->
     <div class="controls">
       <!-- 左侧：清空数据库按钮 -->
       <button class="btn btn-danger" @click="clearAllIPs">
         清空数据库
       </button>

       <!-- 中间：分页 -->
       <div class="pagination">
         <button 
           class="btn btn-secondary" 
           @click="prevPage" 
           :disabled="currentPage <= 1"
         >
           上一页
         </button>
         <span v-for="page in Math.min(totalPages, 10)" :key="page">
           <button 
             :class="['btn', page === currentPage ? 'btn-primary' : 'btn-secondary']" 
             @click="handlePageChange(page)"
           >
             {{ page }}
           </button>
         </span>
         <span v-if="totalPages > 10" class="pagination-ellipsis">...</span>
         <button 
           class="btn btn-secondary" 
           @click="nextPage" 
           :disabled="currentPage >= totalPages"
         >
           下一页
         </button>
       </div>

       <!-- 右侧：分页信息 -->
       <div class="pagination-info">
         第 {{ currentPage }} 页，共 {{ totalPages }} 页
       </div>
     </div>

    <!-- 底部操作区域 -->
    <div class="bottom-controls">
      <!-- 添加IP -->
      <div class="input-group">
        <input 
          v-model="newIP" 
          type="text" 
          placeholder="请输入IP地址" 
          @keyup.enter="addIP"
          class="input ip-input-narrow"
        />
        <button 
          class="btn btn-primary" 
          :disabled="addingIP" 
          @click="addIP"
        >
          {{ addingIP ? '添加中...' : '添加IP地址' }}
        </button>
      </div>

      <!-- 自动清理设置 -->
      <div class="input-group">
        <span class="cleanup-label">自动清理间隔(秒)</span>
        <input 
          v-model="autoCleanupInterval" 
          type="number" 
          placeholder="清理间隔(秒)" 
          min="30" 
          class="input cleanup-input-narrow"
        />
        <button 
          class="btn btn-info" 
          :disabled="settingAutoCleanup" 
          @click="setAutoCleanup"
        >
          {{ settingAutoCleanup ? '设置中...' : '设置' }}
        </button>
      </div>

      <!-- 设置超时 -->
      <div class="input-group">
          <span class="timeout-label">IP过期时间(秒)：</span>
          <input 
            v-model="newTimeout" 
            type="number" 
            placeholder="超时时间(秒)" 
            min="1" 
            class="input timeout-input-narrow"
          />
          <button 
            class="btn btn-warning" 
            :disabled="settingTimeout" 
            @click="setTimeoutConfig"
          >
            {{ settingTimeout ? '设置中...' : '设置' }}
          </button>
        </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog 
      v-model:visible="confirmDialog.visible"
      :message="confirmDialog.message"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
  background: white;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 消息提示 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.message.success {
  background-color: #67c23a;
}

.message.error {
  background-color: #f56c6c;
}

.message.warning {
  background-color: #e6a23c;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 表格样式 */
.table-container {
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
  height: 60vh; /* 浏览器高度的3/5 */
  overflow-y: auto; /* 垂直滚动条 */
  position: relative;
}

.ip-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  display: table;
}

.ip-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
}

.ip-table th {
  background-color: #f5f5f5;
  font-weight: bold;
  position: sticky;
  top: 0;
  padding: 12px;
  text-align: center;
  border-bottom: 2px solid #333;
  border-right: 1px solid #ddd;
}

.ip-table th:last-child {
  border-right: none;
}

.ip-table td {
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid #ddd;
  border-right: 1px solid #ddd;
}

.ip-table td:last-child {
  border-right: none;
}

.ip-table tbody tr:last-child td {
  border-bottom: none;
}

.ip-table tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

.ip-cell {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.loading, .empty {
  color: #999;
  font-style: italic;
}

/* 搜索控制区域 */
.search-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.search-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #409eff;
}

.countdown-display {
  flex: 1;
  text-align: center;
}

.countdown-label {
  background: #e3f2fd;
  color: #1976d2;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #bbdefb;
}

.pagesize-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagesize-group label {
  font-size: 14px;
  color: #606266;
}

.pagesize-select {
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.pagesize-select:focus {
  outline: none;
  border-color: #409eff;
}

.refresh-btn {
  margin-left: 8px;
  padding: 6px 12px;
  font-size: 14px;
}

/* 自动清理样式 */
.cleanup-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
  margin-right: 8px;
}

.cleanup-input-narrow {
  width: 93px; /* 原140px的2/3 */
}

/* 控制区域 */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.pagination {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination-ellipsis {
  padding: 8px 4px;
  color: #909399;
}

.pagination-info {
  font-size: 14px;
  color: #606266;
}

/* 底部操作区域 */
.bottom-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
}

.input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 按钮样式 */
.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  height: 32px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #337ecc;
}

.btn-danger {
  background-color: #f56c6c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dd6161;
}

.btn-warning {
  background-color: #e6a23c;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #cf9236;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background-color: #138496;
}

.btn-secondary {
  background-color: #909399;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #82848a;
}

/* 输入框样式 */
.input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
  height: 32px;
  box-sizing: border-box;
}

.ip-input-narrow {
  flex: 0.67; /* 原flex: 1的2/3 */
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
  height: 32px;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #409eff;
}

.timeout-input-narrow {
  max-width: 100px; /* 原150px的2/3 */
}

.timeout-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
  margin-right: 8px;
}

.current-timeout-label {
  font-size: 14px;
  color: #606266;
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .controls {
    flex-direction: column;
    gap: 12px;
  }
  
  .bottom-controls {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .ip-table th,
  .ip-table td {
    padding: 8px;
    font-size: 12px;
  }
}
</style>
