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
    </nav>
    <MapView />
    <DevicePanel v-if="activePanel === 'devices'" />
    <FenceEditor v-if="activePanel === 'fences'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MapView from './components/MapView.vue';
import DevicePanel from './components/DevicePanel.vue';
import FenceEditor from './components/FenceEditor.vue';

const activePanel = ref<'devices' | 'fences'>('fences');
</script>
