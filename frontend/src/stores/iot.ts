import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Device, Geofence, Alert, AlertType, AlertSeverity, DeviceGroup, DeviceThresholds, TrackData, TrackPoint, StayPoint, TrackSegment } from '../types';

function generateId(prefix: string) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

export const useIotStore = defineStore('iot', () => {
  const devices = ref<Device[]>([
    { id: 'd1', name: '传感器-A01', lat: 39.9042, lng: 116.4074, status: 'online', lastSeen: new Date().toISOString(), battery: 85, temperature: 24.5 },
    { id: 'd2', name: '传感器-B02', lat: 39.9142, lng: 116.3974, status: 'alert', lastSeen: new Date().toISOString(), battery: 12, temperature: 38.2 },
    { id: 'd3', name: '追踪器-C03', lat: 39.8942, lng: 116.4174, status: 'offline', lastSeen: new Date(Date.now() - 3600000).toISOString(), battery: 0, temperature: 0 },
    { id: 'd4', name: '传感器-D04', lat: 39.9082, lng: 116.4024, status: 'online', lastSeen: new Date().toISOString(), battery: 45, temperature: 26.1 },
    { id: 'd5', name: '追踪器-E05', lat: 39.8992, lng: 116.4104, status: 'online', lastSeen: new Date().toISOString(), battery: 92, temperature: 23.8 },
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
  const alerts = ref<Alert[]>([
    {
      id: generateId('a'),
      deviceId: 'd2',
      type: 'low_battery',
      severity: 'warning',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      message: '设备电量过低，请及时充电',
      acknowledged: false
    },
    {
      id: generateId('a'),
      deviceId: 'd3',
      type: 'offline',
      severity: 'critical',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      message: '设备离线超过1小时',
      acknowledged: false
    },
    {
      id: generateId('a'),
      deviceId: 'd2',
      fenceId: 'f2',
      type: 'enter',
      severity: 'critical',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      message: '设备进入危险区域',
      acknowledged: false
    }
  ]);
  const selectedFenceId = ref<string | null>(null);
  const editMode = ref<'none' | 'draw-circle' | 'draw-polygon' | 'edit'>('none');
  const highlightedDeviceId = ref<string | null>(null);
  const isRegisteringDevice = ref(false);
  const registrationLocation = ref<{ lat: number; lng: number } | null>(null);

  const trackPlaybackEnabled = ref(false);
  const trackData = ref<TrackData | null>(null);
  const playbackDeviceId = ref<string | null>(null);
  const playbackStartTime = ref<string>('');
  const playbackEndTime = ref<string>('');
  const playbackCurrentIndex = ref(0);
  const isPlaying = ref(false);
  const playbackSpeed = ref(1);
  const showTrack = ref(true);
  const showStayPoints = ref(true);
  const showBreachEvents = ref(true);
  const playbackInterval = ref<number | null>(null);

  const groups = ref<DeviceGroup[]>([
    { id: 'g1', name: '生产车间', color: '#1976d2', description: '生产线设备' },
    { id: 'g2', name: '仓储区域', color: '#388e3c', description: '仓库监控设备' },
    { id: 'g3', name: '办公区域', color: '#f57c00', description: '办公环境监测' },
    { id: 'g4', name: '室外设施', color: '#7b1fa2', description: '户外设备' },
  ]);

  const onlineCount = computed(() => devices.value.filter(d => d.status === 'online').length);
  const offlineCount = computed(() => devices.value.filter(d => d.status === 'offline').length);
  const alertDeviceCount = computed(() => devices.value.filter(d => d.status === 'alert').length);
  const deviceCount = computed(() => devices.value.length);
  const fenceCount = computed(() => fences.value.length);
  const alertCount = computed(() => alerts.value.filter(a => !a.acknowledged).length);
  const selectedFence = computed(() => fences.value.find(f => f.id === selectedFenceId.value) || null);

  const avgBattery = computed(() => {
    const onlineDevices = devices.value.filter(d => d.status !== 'offline');
    if (onlineDevices.length === 0) return 0;
    return Math.round(onlineDevices.reduce((sum, d) => sum + d.battery, 0) / onlineDevices.length);
  });

  const avgTemperature = computed(() => {
    const onlineDevices = devices.value.filter(d => d.status !== 'offline');
    if (onlineDevices.length === 0) return 0;
    return Number((onlineDevices.reduce((sum, d) => sum + d.temperature, 0) / onlineDevices.length).toFixed(1));
  });

  const lowBatteryCount = computed(() => devices.value.filter(d => d.battery < 20 && d.status !== 'offline').length);

  const devicesRanked = computed(() => {
    return [...devices.value].sort((a, b) => {
      const statusOrder = { alert: 0, offline: 1, online: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.battery - a.battery;
    });
  });

  const recentAlerts = computed(() => {
    return [...alerts.value]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  });

  const unacknowledgedAlerts = computed(() => alerts.value.filter(a => !a.acknowledged));

  const criticalAlerts = computed(() => unacknowledgedAlerts.value.filter(a => a.severity === 'critical'));
  const warningAlerts = computed(() => unacknowledgedAlerts.value.filter(a => a.severity === 'warning'));
  const infoAlerts = computed(() => unacknowledgedAlerts.value.filter(a => a.severity === 'info'));

  const criticalCount = computed(() => criticalAlerts.value.length);
  const warningCount = computed(() => warningAlerts.value.length);
  const infoCount = computed(() => infoAlerts.value.length);

  const playbackCurrentPoint = computed(() => {
    if (!trackData.value || playbackCurrentIndex.value < 0 || playbackCurrentIndex.value >= trackData.value.points.length) {
      return null;
    }
    return trackData.value.points[playbackCurrentIndex.value];
  });

  const playbackProgress = computed(() => {
    if (!trackData.value || trackData.value.points.length === 0) return 0;
    return (playbackCurrentIndex.value / (trackData.value.points.length - 1)) * 100;
  });

  const playbackCurrentTime = computed(() => {
    return playbackCurrentPoint.value?.timestamp || '';
  });

  function getDeviceById(id: string) {
    return devices.value.find(d => d.id === id);
  }

  function getFenceById(id: string) {
    return fences.value.find(f => f.id === id);
  }

  function acknowledgeAlert(id: string) {
    const a = alerts.value.find(a => a.id === id);
    if (a) a.acknowledged = true;
  }

  function batchAcknowledgeAlerts(ids: string[]) {
    ids.forEach(id => {
      const a = alerts.value.find(a => a.id === id);
      if (a) a.acknowledged = true;
    });
  }

  function acknowledgeAllAlerts() {
    alerts.value.forEach(a => {
      a.acknowledged = true;
    });
  }

  function setHighlightedDevice(id: string | null) {
    highlightedDeviceId.value = id;
  }

  function addAlert(alert: Omit<Alert, 'id' | 'acknowledged'>) {
    const newAlert: Alert = {
      ...alert,
      id: generateId('a'),
      acknowledged: false
    };
    alerts.value.unshift(newAlert);
    if (alerts.value.length > 200) {
      alerts.value = alerts.value.slice(0, 200);
    }
    return newAlert.id;
  }

  function generateMockAlert() {
    const alertTypes: Array<{ type: AlertType; severity: AlertSeverity; weight: number }> = [
      { type: 'enter', severity: 'critical', weight: 2 },
      { type: 'exit', severity: 'warning', weight: 2 },
      { type: 'low_battery', severity: 'warning', weight: 3 },
      { type: 'offline', severity: 'critical', weight: 1 },
    ];

    const totalWeight = alertTypes.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = alertTypes[0];
    for (const t of alertTypes) {
      random -= t.weight;
      if (random <= 0) {
        selectedType = t;
        break;
      }
    }

    const randomDevice = devices.value[Math.floor(Math.random() * devices.value.length)];
    const randomFence = fences.value[Math.floor(Math.random() * fences.value.length)];

    let message = '';
    let fenceId: string | undefined = undefined;

    switch (selectedType.type) {
      case 'enter':
        fenceId = randomFence.id;
        message = `${randomDevice.name} 进入 ${randomFence.name}`;
        break;
      case 'exit':
        fenceId = randomFence.id;
        message = `${randomDevice.name} 离开 ${randomFence.name}`;
        break;
      case 'low_battery':
        message = `${randomDevice.name} 电量过低 (${Math.floor(Math.random() * 15)}%)`;
        break;
      case 'offline':
        message = `${randomDevice.name} 设备离线`;
        break;
    }

    addAlert({
      deviceId: randomDevice.id,
      fenceId,
      type: selectedType.type,
      severity: selectedType.severity,
      timestamp: new Date().toISOString(),
      message
    });
  }

  let mockAlertInterval: number | null = null;

  function startMockAlertStream() {
    if (mockAlertInterval) return;
    mockAlertInterval = window.setInterval(() => {
      if (Math.random() < 0.3) {
        generateMockAlert();
      }
    }, 5000);
  }

  function stopMockAlertStream() {
    if (mockAlertInterval) {
      clearInterval(mockAlertInterval);
      mockAlertInterval = null;
    }
  }

  function addFence(fence: Omit<Geofence, 'id'>) {
    const id = 'f' + Date.now();
    fences.value.push({ ...fence, id });
    return id;
  }

  function addDevice(device: Omit<Device, 'id' | 'status' | 'lastSeen'>) {
    const id = generateId('d');
    const newDevice: Device = {
      ...device,
      id,
      status: 'online',
      lastSeen: new Date().toISOString()
    };
    devices.value.push(newDevice);
    return id;
  }

  function getGroupById(id: string) {
    return groups.value.find(g => g.id === id);
  }

  function startDeviceRegistration() {
    isRegisteringDevice.value = true;
    registrationLocation.value = null;
  }

  function cancelDeviceRegistration() {
    isRegisteringDevice.value = false;
    registrationLocation.value = null;
  }

  function setRegistrationLocation(lat: number, lng: number) {
    registrationLocation.value = { lat, lng };
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

  function generateMockTrackData(deviceId: string, startTime: string, endTime: string): TrackData {
    const device = getDeviceById(deviceId);
    if (!device) {
      return {
        deviceId,
        deviceName: '未知设备',
        startTime,
        endTime,
        points: [],
        segments: [],
        stayPoints: [],
        breachEvents: [],
        totalDistance: 0,
        totalDuration: 0
      };
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const interval = 30000;
    const points: TrackPoint[] = [];

    let currentLat = device.lat;
    let currentLng = device.lng;

    const routePatterns = [
      { lat: 39.9042, lng: 116.4074 },
      { lat: 39.9082, lng: 116.4024 },
      { lat: 39.9142, lng: 116.3974 },
      { lat: 39.9102, lng: 116.4104 },
      { lat: 39.8992, lng: 116.4124 },
      { lat: 39.8942, lng: 116.4174 },
      { lat: 39.9012, lng: 116.4094 },
    ];

    let patternIndex = 0;
    let stayCounter = 0;
    let breachCounter = 0;

    for (let time = start; time <= end; time += interval) {
      const target = routePatterns[patternIndex % routePatterns.length];
      const latDiff = target.lat - currentLat;
      const lngDiff = target.lng - currentLng;
      const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (dist < 0.001) {
        patternIndex++;
        stayCounter = 6;
      }

      let isAbnormal = false;
      let abnormalType: TrackPoint['abnormalType'] = undefined;
      let abnormalMessage = '';

      if (stayCounter > 0) {
        stayCounter--;
      } else {
        currentLat += latDiff * 0.1 + (Math.random() - 0.5) * 0.0005;
        currentLng += lngDiff * 0.1 + (Math.random() - 0.5) * 0.0005;
      }

      breachCounter++;
      if (breachCounter > 40 && Math.random() < 0.15) {
        isAbnormal = true;
        abnormalType = 'fence_breach';
        abnormalMessage = '越界告警：进入危险区域';
        breachCounter = 0;
      }

      const battery = Math.max(5, device.battery - Math.floor((time - start) / 3600000) * 5);
      const temperature = device.temperature + (Math.random() - 0.5) * 3;
      const speed = stayCounter > 0 ? 0 : Math.random() * 20 + 5;

      points.push({
        lat: currentLat,
        lng: currentLng,
        timestamp: new Date(time).toISOString(),
        speed,
        battery,
        temperature,
        isAbnormal,
        abnormalType,
        abnormalMessage
      });
    }

    const segments: TrackSegment[] = [];
    let currentSegment: TrackPoint[] = [];
    let currentIsNormal = true;

    points.forEach((point, idx) => {
      const isNormal = !point.isAbnormal;
      if (idx === 0) {
        currentSegment = [point];
        currentIsNormal = isNormal;
      } else if (isNormal !== currentIsNormal) {
        segments.push({
          points: currentSegment,
          isNormal: currentIsNormal,
          abnormalType: currentSegment[0].abnormalType,
          startTime: currentSegment[0].timestamp,
          endTime: currentSegment[currentSegment.length - 1].timestamp
        });
        currentSegment = [point];
        currentIsNormal = isNormal;
      } else {
        currentSegment.push(point);
      }
    });

    if (currentSegment.length > 0) {
      segments.push({
        points: currentSegment,
        isNormal: currentIsNormal,
        abnormalType: currentSegment[0].abnormalType,
        startTime: currentSegment[0].timestamp,
        endTime: currentSegment[currentSegment.length - 1].timestamp
      });
    }

    const stayPoints: StayPoint[] = [];
    let stayStart: TrackPoint | null = null;
    let stayDuration = 0;

    points.forEach((point, idx) => {
      if (point.speed !== undefined && point.speed < 1) {
        if (!stayStart) {
          stayStart = point;
          stayDuration = 0;
        } else {
          stayDuration += 30;
        }
      } else {
        if (stayStart && stayDuration >= 120) {
          stayPoints.push({
            lat: stayStart.lat,
            lng: stayStart.lng,
            startTime: stayStart.timestamp,
            endTime: point.timestamp,
            duration: stayDuration,
            name: `停留点 ${stayPoints.length + 1}`
          });
        }
        stayStart = null;
        stayDuration = 0;
      }
    });

    const breachEvents = points.filter(p => p.isAbnormal && p.abnormalType === 'fence_breach');

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const R = 6371000;
      const rad = Math.PI / 180;
      const dLat = (points[i].lat - points[i - 1].lat) * rad;
      const dLng = (points[i].lng - points[i - 1].lng) * rad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(points[i - 1].lat * rad) * Math.cos(points[i].lat * rad) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      totalDistance += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return {
      deviceId,
      deviceName: device.name,
      startTime,
      endTime,
      points,
      segments,
      stayPoints,
      breachEvents,
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.floor((end - start) / 1000)
    };
  }

  function loadTrackData(deviceId: string, startTime: string, endTime: string) {
    playbackDeviceId.value = deviceId;
    playbackStartTime.value = startTime;
    playbackEndTime.value = endTime;
    trackData.value = generateMockTrackData(deviceId, startTime, endTime);
    playbackCurrentIndex.value = 0;
    stopPlayback();
  }

  function startPlayback() {
    if (!trackData.value || trackData.value.points.length === 0) return;

    if (playbackCurrentIndex.value >= trackData.value.points.length - 1) {
      playbackCurrentIndex.value = 0;
    }

    isPlaying.value = true;
    const baseInterval = 200;

    if (playbackInterval.value) {
      clearInterval(playbackInterval.value);
    }

    playbackInterval.value = window.setInterval(() => {
      if (playbackCurrentIndex.value < trackData.value!.points.length - 1) {
        playbackCurrentIndex.value += playbackSpeed.value;
        if (playbackCurrentIndex.value >= trackData.value!.points.length - 1) {
          playbackCurrentIndex.value = trackData.value!.points.length - 1;
          stopPlayback();
        }
      } else {
        stopPlayback();
      }
    }, baseInterval);
  }

  function pausePlayback() {
    isPlaying.value = false;
    if (playbackInterval.value) {
      clearInterval(playbackInterval.value);
      playbackInterval.value = null;
    }
  }

  function stopPlayback() {
    isPlaying.value = false;
    if (playbackInterval.value) {
      clearInterval(playbackInterval.value);
      playbackInterval.value = null;
    }
  }

  function seekToIndex(index: number) {
    if (!trackData.value) return;
    playbackCurrentIndex.value = Math.max(0, Math.min(index, trackData.value.points.length - 1));
  }

  function seekToProgress(progress: number) {
    if (!trackData.value || trackData.value.points.length === 0) return;
    const index = Math.floor(progress * (trackData.value.points.length - 1) / 100);
    seekToIndex(index);
  }

  function setPlaybackSpeed(speed: number) {
    playbackSpeed.value = speed;
    if (isPlaying.value) {
      pausePlayback();
      startPlayback();
    }
  }

  function jumpToStayPoint(stayPoint: StayPoint) {
    if (!trackData.value) return;
    const idx = trackData.value.points.findIndex(p => p.timestamp >= stayPoint.startTime);
    if (idx !== -1) {
      seekToIndex(idx);
    }
  }

  function jumpToBreachEvent(breachPoint: TrackPoint) {
    if (!trackData.value) return;
    const idx = trackData.value.points.findIndex(p => p.timestamp === breachPoint.timestamp);
    if (idx !== -1) {
      seekToIndex(idx);
    }
  }

  function enableTrackPlayback() {
    trackPlaybackEnabled.value = true;
  }

  function disableTrackPlayback() {
    trackPlaybackEnabled.value = false;
    stopPlayback();
    trackData.value = null;
    playbackDeviceId.value = null;
    playbackCurrentIndex.value = 0;
  }

  function toggleTrackVisibility() {
    showTrack.value = !showTrack.value;
  }

  function toggleStayPointsVisibility() {
    showStayPoints.value = !showStayPoints.value;
  }

  function toggleBreachEventsVisibility() {
    showBreachEvents.value = !showBreachEvents.value;
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}小时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(2) + ' 公里';
    }
    return meters + ' 米';
  }

  return {
    devices, fences, alerts, selectedFenceId, editMode, highlightedDeviceId,
    isRegisteringDevice, registrationLocation, groups,
    onlineCount, offlineCount, alertDeviceCount, deviceCount, fenceCount, alertCount, selectedFence,
    avgBattery, avgTemperature, lowBatteryCount, devicesRanked, recentAlerts,
    unacknowledgedAlerts, criticalAlerts, warningAlerts, infoAlerts,
    criticalCount, warningCount, infoCount,
    trackPlaybackEnabled, trackData, playbackDeviceId,
    playbackStartTime, playbackEndTime, playbackCurrentIndex,
    isPlaying, playbackSpeed, showTrack, showStayPoints, showBreachEvents,
    playbackCurrentPoint, playbackProgress, playbackCurrentTime,
    getDeviceById, getFenceById, getGroupById,
    acknowledgeAlert, batchAcknowledgeAlerts, acknowledgeAllAlerts,
    setHighlightedDevice, addAlert, generateMockAlert,
    startMockAlertStream, stopMockAlertStream,
    addFence, updateFence, deleteFence, selectFence, setEditMode,
    addDevice, startDeviceRegistration, cancelDeviceRegistration, setRegistrationLocation,
    loadTrackData, startPlayback, pausePlayback, stopPlayback,
    seekToIndex, seekToProgress, setPlaybackSpeed,
    jumpToStayPoint, jumpToBreachEvent,
    enableTrackPlayback, disableTrackPlayback,
    toggleTrackVisibility, toggleStayPointsVisibility, toggleBreachEventsVisibility,
    formatDuration, formatDistance
  };
});
