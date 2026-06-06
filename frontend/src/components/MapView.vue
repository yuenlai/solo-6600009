<template>
  <div style="flex:1;height:100%;position:relative">
    <div id="map" style="width:100%;height:100%"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import L from 'leaflet';
import { useIotStore } from '../stores/iot';

const store = useIotStore();

onMounted(() => {
  const map = L.map('map').setView([39.9042, 116.4074], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Draw fences
  store.fences.forEach(f => {
    L.circle([f.center.lat, f.center.lng], {
      radius: f.radius, color: f.color, fillOpacity: 0.1
    }).addTo(map).bindPopup(f.name);
  });

  // Draw devices
  store.devices.forEach(d => {
    const color = d.status === 'online' ? '#4caf50' : d.status === 'alert' ? '#e53935' : '#9e9e9e';
    L.circleMarker([d.lat, d.lng], { radius: 8, color, fillColor: color, fillOpacity: 0.8 })
      .addTo(map).bindPopup(`<b>${d.name}</b><br>Status: ${d.status}<br>Battery: ${d.temperature}°C`);
  });
});
</script>
