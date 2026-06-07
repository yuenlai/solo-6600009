import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Device, Geofence, Alert } from '../types';

export const useIotStore = defineStore('iot', () => {
  const devices = ref<Device[]>([
    { id: 'd1', name: '传感器-A01', lat: 39.9042, lng: 116.4074, status: 'online', lastSeen: new Date().toISOString(), battery: 85, temperature: 24.5 },
    { id: 'd2', name: '传感器-B02', lat: 39.9142, lng: 116.3974, status: 'alert', lastSeen: new Date().toISOString(), battery: 12, temperature: 38.2 },
    { id: 'd3', name: '追踪器-C03', lat: 39.8942, lng: 116.4174, status: 'offline', lastSeen: new Date(Date.now() - 3600000).toISOString(), battery: 0, temperature: 0 },
  ]);
  const fences = ref<Geofence[]>([
    { id: 'f1', name: '办公区域', center: { lat: 39.9042, lng: 116.4074 }, radius: 500, type: 'circle', alertOnEnter: false, alertOnExit: true, color: '#4caf50' },
    { id: 'f2', name: '危险区域', center: { lat: 39.9142, lng: 116.3974 }, radius: 200, type: 'circle', alertOnEnter: true, alertOnExit: false, color: '#e53935' },
    { id: 'f3', name: '仓库区域', center: { lat: 39.8992, lng: 116.4124 }, radius: 0, type: 'polygon',
      paths: [
        { lat: 39.9012, lng: 116.4094 },
        { lat: 39.9012, lng: 116.4154 },
        { lat: 39.8972, lng: 116.4154 },
        { lat: 39.8972, lng: 116.4094 },
      ], alertOnEnter: true, alertOnExit: true, color: '#1976d2' },
  ]);
  const alerts = ref<Alert[]>([]);
  const selectedFenceId = ref<string | null>(null);
  const editMode = ref<'none' | 'draw-circle' | 'draw-polygon' | 'edit'>('none');

  const onlineCount = computed(() => devices.value.filter(d => d.status === 'online').length);
  const alertCount = computed(() => alerts.value.filter(a => !a.acknowledged).length);
  const selectedFence = computed(() => fences.value.find(f => f.id === selectedFenceId.value) || null);

  function acknowledgeAlert(id: string) {
    const a = alerts.value.find(a => a.id === id);
    if (a) a.acknowledged = true;
  }

  function addFence(fence: Omit<Geofence, 'id'>) {
    const id = 'f' + Date.now();
    fences.value.push({ ...fence, id });
    return id;
  }

  function updateFence(id: string, updates: Partial<Geofence>) {
    const idx = fences.value.findIndex(f => f.id === id);
    if (idx !== -1) {
      fences.value[idx] = { ...fences.value[idx], ...updates };
    }
  }

  function deleteFence(id: string) {
    const idx = fences.value.findIndex(f => f.id === id);
    if (idx !== -1) {
      fences.value.splice(idx, 1);
      if (selectedFenceId.value === id) {
        selectedFenceId.value = null;
        editMode.value = 'none';
      }
    }
  }

  function selectFence(id: string | null) {
    selectedFenceId.value = id;
    if (id) {
      editMode.value = 'edit';
    }
  }

  function setEditMode(mode: 'none' | 'draw-circle' | 'draw-polygon' | 'edit') {
    editMode.value = mode;
    if (mode === 'none') {
      selectedFenceId.value = null;
    }
  }

  return {
    devices, fences, alerts, selectedFenceId, editMode,
    onlineCount, alertCount, selectedFence,
    acknowledgeAlert, addFence, updateFence, deleteFence, selectFence, setEditMode
  };
});
