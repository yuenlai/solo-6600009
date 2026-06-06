<template>
  <div style="width:300px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0">
    <h3 style="margin:0 0 12px">📡 设备列表</h3>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <span style="font-size:12px;padding:2px 8px;border-radius:12px;background:#e8f5e9">🟢 {{ store.onlineCount }} 在线</span>
      <span style="font-size:12px;padding:2px 8px;border-radius:12px;background:#ffebee">⚠️ {{ store.alertCount }} 告警</span>
    </div>
    <div v-for="d in store.devices" :key="d.id"
      :style="{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', marginBottom:'8px',
        borderRadius:'8px', border:'1px solid #e0e0e0', background: d.status === 'alert' ? '#fff3e0' : '#fff' }">
      <span :style="{ width:'10px', height:'10px', borderRadius:'50%',
        background: d.status === 'online' ? '#4caf50' : d.status === 'alert' ? '#ff9800' : '#9e9e9e' }"></span>
      <div style="flex:1">
        <div style="font-weight:500;font-size:13px">{{ d.name }}</div>
        <div style="font-size:11px;color:#888">🔋 {{ d.battery }}% · 🌡 {{ d.temperature }}°C</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIotStore } from '../stores/iot';
const store = useIotStore();
</script>
