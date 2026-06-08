<template>
  <div style="width:300px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0;height:100vh;box-sizing:border-box">
    <h3 style="margin:0 0 12px">📡 设备列表</h3>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <span style="font-size:12px;padding:2px 8px;border-radius:12px;background:#e8f5e9">🟢 {{ store.onlineCount }} 在线</span>
      <span style="font-size:12px;padding:2px 8px;border-radius:12px;background:#ffebee">⚠️ {{ store.alertCount }} 告警</span>
    </div>
    <div v-for="d in store.devices" :key="d.id"
      @click="handleDeviceClick(d.id)"
      @mouseenter="handleHover(d.id)"
      @mouseleave="handleHover(null)"
      :style="{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', marginBottom:'8px',
        borderRadius:'8px', border:'2px solid ' + (store.highlightedDeviceId === d.id ? '#1976d2' : (d.status === 'alert' ? '#ffcc80' : '#e0e0e0')),
        background: store.highlightedDeviceId === d.id ? '#e3f2fd' : (d.status === 'alert' ? '#fff3e0' : '#fff'),
        cursor:'pointer', transition:'all 0.2s ease' }">
      <span :style="{ width:'10px', height:'10px', borderRadius:'50%',
        background: d.status === 'online' ? '#4caf50' : d.status === 'alert' ? '#ff9800' : '#9e9e9e',
        boxShadow: store.highlightedDeviceId === d.id ? '0 0 0 3px rgba(25,118,210,0.3)' : 'none' }"></span>
      <div style="flex:1">
        <div style="font-weight: store.highlightedDeviceId === d.id ? 700 : 500;font-size:13px;color:#333">{{ d.name }}</div>
        <div style="font-size:11px;color:#888">🔋 {{ d.battery }}% · 🌡 {{ d.temperature }}°C</div>
      </div>
      <span v-if="d.status === 'alert'" style="font-size:10px;color:#ff9800">⚠️</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIotStore } from '../stores/iot';
const store = useIotStore();

function handleDeviceClick(id: string) {
  store.setHighlightedDevice(id);
}

function handleHover(id: string | null) {
  if (!store.highlightedDeviceId) {
    store.setHighlightedDevice(id);
  }
}
</script>
