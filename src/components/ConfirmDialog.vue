<template>
  <div v-if="visible" class="confirm-overlay" @click="handleOverlayClick">
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-header">
        <h3 class="confirm-title">确认操作</h3>
      </div>
      <div class="confirm-body">
        <p class="confirm-message">{{ message }}</p>
      </div>
      <div class="confirm-footer">
        <button class="confirm-btn confirm-btn-cancel" @click="handleCancel">
          取消
        </button>
        <button class="confirm-btn confirm-btn-confirm" @click="handleConfirm">
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  visible: boolean;
  message: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleConfirm = () => {
  emit('confirm');
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};

const handleOverlayClick = () => {
  handleCancel();
};

// 监听ESC键
watch(() => props.visible, (newVal) => {
  if (newVal) {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
});
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.confirm-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  min-width: 320px;
  max-width: 500px;
  margin: 20px;
  animation: confirmFadeIn 0.2s ease-out;
}

@keyframes confirmFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.confirm-header {
  padding: 20px 20px 0 20px;
  border-bottom: 1px solid #e5e7eb;
}

.confirm-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.confirm-body {
  padding: 20px;
}

.confirm-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
}

.confirm-footer {
  padding: 0 20px 20px 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  min-width: 80px;
}

.confirm-btn-cancel {
  background: white;
  color: #6b7280;
  border-color: #d1d5db;
}

.confirm-btn-cancel:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.confirm-btn-confirm {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}

.confirm-btn-confirm:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .confirm-dialog {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .confirm-header {
    border-bottom-color: #374151;
  }
  
  .confirm-title {
    color: #f9fafb;
  }
  
  .confirm-message {
    color: #d1d5db;
  }
  
  .confirm-btn-cancel {
    background: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }
  
  .confirm-btn-cancel:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
}
</style>