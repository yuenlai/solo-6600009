<template>
  <div style="display:flex;height:100vh;font-family:sans-serif">
    <nav style="width:60px;background:#1b5e20;display:flex;flex-direction:column;align-items:center;padding-top:16px;gap:8px">
      <div style="color:#fff;font-size:20px">📡</div>
      <div style="color:#fff;font-size:10px;text-align:center">IoT<br/>Monitor</div>
      <hr style="width:36px;border-color:rgba(255,255,255,0.2);margin:8px 0"/>
      <button @click="activePanel = 'devices'"
        :style="{ width:'44px', height:'44px', borderRadius:'8px', border:'none', cursor:'pointer',
          background: activePanel === 'devices' ? '#fff' : 'transparent',
          color: activePanel === 'devices' ? '#1b5e20' : '#fff',
          fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }"
        title="设备监控">
        📱
      </button>
      <button @click="activePanel = 'fences'"
        :style="{ width:'44px', height:'44px', borderRadius:'8px', border:'none', cursor:'pointer',
          background: activePanel === 'fences' ? '#fff' : 'transparent',
          color: activePanel === 'fences' ? '#1b5e20' : '#fff',
          fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }"
        title="围栏工作台">
        🗺️
      </button>
      <div style="position:relative">
        <button @click="activePanel = 'alarms'"
          :style="{ width:'44px', height:'44px', borderRadius:'8px', border:'none', cursor:'pointer',
            background: activePanel === 'alarms' ? '#fff' : 'transparent',
            color: activePanel === 'alarms' ? '#1b5e20' : '#fff',
            fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }"
          title="告警中心">
          🔔
        </button>
        <span v-if="store.alertCount > 0"
          :style="{ position:'absolute', top:'2px', right:'2px', minWidth:'16px', height:'16px',
            borderRadius:'8px', background:'#e53935', color:'#fff', fontSize:'10px',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600,
            padding:'0 4px', lineHeight:'1' }">
          {{ store.alertCount > 99 ? '99+' : store.alertCount }}
        </span>
      </div>
    </nav>
    <MapView />
    <DevicePanel v-if="activePanel === 'devices'" />
    <FenceEditor v-if="activePanel === 'fences'" />
    <AlarmCenter v-if="activePanel === 'alarms'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MapView from './components/MapView.vue';
import DevicePanel from './components/DevicePanel.vue';
import FenceEditor from './components/FenceEditor.vue';
import AlarmCenter from './components/AlarmCenter.vue';
import { useIotStore } from './stores/iot';

const store = useIotStore();
const activePanel = ref<'devices' | 'fences' | 'alarms'>('alarms');
</script>
