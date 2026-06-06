<template>
  <div style="display:flex;height:100vh;font-family:sans-serif">
    <nav style="width:60px;background:#1b5e20;display:flex;flex-direction:column;align-items:center;padding-top:16px;gap:16px">
      <div style="color:#fff;font-size:20px">📡</div>
      <div style="color:#fff;font-size:10px;text-align:center">IoT<br/>Monitor</div>
    </nav>
    <MapView />
    <DevicePanel />
  </div>
</template>

<script setup lang="ts">
import MapView from './components/MapView.vue';
import DevicePanel from './components/DevicePanel.vue';
</script>
