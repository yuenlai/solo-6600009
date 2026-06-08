<template>
  <div style="width:340px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0;display:flex;flex-direction:column;height:100vh;box-sizing:border-box;background:#fafafa">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h3 style="margin:0;display:flex;align-items:center;gap:8px">
        🎥 轨迹回放
      </h3>
      <button @click="handleClose"
        style="padding:4px 10px;border-radius:4px;border:1px solid #ccc;background:#fff;color:#666;cursor:pointer;font-size:12px">
        ✕
      </button>
    </div>

    <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px">
      <label style="font-size:12px;color:#666;display:block;margin-bottom:6px">选择设备</label>
      <select v-model="selectedDeviceId"
        style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;margin-bottom:10px;box-sizing:border-box">
        <option value="">-- 请选择设备 --</option>
        <option v-for="d in store.devices" :key="d.id" :value="d.id">
          {{ d.name }} ({{ d.status === 'online' ? '在线' : d.status === 'alert' ? '告警' : '离线' }})
        </option>
      </select>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <label style="font-size:12px;color:#666">
          开始时间
          <input type="datetime-local" v-model="startTimeStr"
            style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:11px;margin-top:4px;box-sizing:border-box">
        </label>
        <label style="font-size:12px;color:#666">
          结束时间
          <input type="datetime-local" v-model="endTimeStr"
            style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:11px;margin-top:4px;box-sizing:border-box">
        </label>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button v-for="p in quickPeriods" :key="p.label" @click="setQuickPeriod(p.hours)"
          :style="{ flex:1, padding:'6px 4px', borderRadius:'4px', border:'1px solid ' + (isQuickPeriodActive(p.hours) ? '#1976d2' : '#ddd'),
            background: isQuickPeriodActive(p.hours) ? '#e3f2fd' : '#fff', color: isQuickPeriodActive(p.hours) ? '#1976d2' : '#666',
            cursor:'pointer', fontSize:'11px' }">
          {{ p.label }}
        </button>
      </div>

      <button @click="handleLoadTrack" :disabled="!selectedDeviceId"
        :style="{ width:'100%', padding:'10px', borderRadius:'6px', border:'none',
          background: selectedDeviceId ? '#1976d2' : '#ccc', color:'#fff',
          cursor: selectedDeviceId ? 'pointer' : 'not-allowed', fontSize:'13px', fontWeight:500 }">
        🔍 查询轨迹
      </button>
    </div>

    <div v-if="store.trackData" style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f0f0f0">
        <span style="color:#666">设备:</span>
        <span style="font-weight:500">{{ store.trackData.deviceName }}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888">总距离</span>
          <span style="font-weight:500">{{ store.formatDistance(store.trackData.totalDistance) }}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888">总时长</span>
          <span style="font-weight:500">{{ store.formatDuration(store.trackData.totalDuration) }}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888">轨迹点</span>
          <span style="font-weight:500">{{ store.trackData.points.length }}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888">停留点</span>
          <span style="font-weight:500;color:#ff9800">{{ store.trackData.stayPoints.length }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;grid-column:span 2">
          <span style="color:#888">越界事件</span>
          <span style="font-weight:500;color:#e53935">{{ store.trackData.breachEvents.length }}</span>
        </div>
      </div>
    </div>

    <div v-if="store.trackData" style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:11px;color:#666">播放控制</span>
        <span style="font-size:11px;color:#1976d2;font-weight:500">
          {{ formatTime(store.playbackCurrentTime) || '--:--:--' }}
        </span>
      </div>

      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
        <button @click="handleSkipBack"
          style="width:36px;height:36px;border-radius:50%;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px">
          ⏮
        </button>
        <button @click="togglePlay"
          :style="{ width:'44px', height:'44px', borderRadius:'50%', border:'none',
            background:'#1976d2', color:'#fff', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }">
          {{ store.isPlaying ? '⏸' : '▶' }}
        </button>
        <button @click="handleSkipForward"
          style="width:36px;height:36px;border-radius:50%;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px">
          ⏭
        </button>
        <button @click="handleStop"
          style="width:36px;height:36px;border-radius:50%;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px">
          ⏹
        </button>
        <div style="flex:1"></div>
        <select v-model="speedValue" @change="handleSpeedChange"
          style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:11px">
          <option :value="0.5">0.5x</option>
          <option :value="1">1x</option>
          <option :value="2">2x</option>
          <option :value="4">4x</option>
          <option :value="8">8x</option>
        </select>
      </div>

      <div style="position:relative">
        <input type="range" min="0" max="100" :value="store.playbackProgress" @input="handleProgressChange"
          style="width:100%;height:6px;-webkit-appearance:none;background:#e0e0e0;border-radius:3px;outline:none;cursor:pointer">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#999;margin-top:4px">
          <span>{{ formatTime(store.trackData.startTime) }}</span>
          <span>{{ formatTime(store.trackData.endTime) }}</span>
        </div>
      </div>
    </div>

    <div v-if="store.trackData" style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px">
      <div style="font-size:12px;font-weight:500;margin-bottom:8px;color:#333">图层显示</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px">
          <input type="checkbox" :checked="store.showTrack" @change="store.toggleTrackVisibility" style="cursor:pointer">
          <span>📍 行驶轨迹</span>
          <span style="margin-left:auto;display:flex;gap:4px">
            <span style="width:20px;height:3px;background:#4caf50;border-radius:2px"></span>
            <span style="width:20px;height:3px;background:#e53935;border-radius:2px"></span>
          </span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px">
          <input type="checkbox" :checked="store.showStayPoints" @change="store.toggleStayPointsVisibility" style="cursor:pointer">
          <span>⏸️ 停留点 ({{ store.trackData.stayPoints.length }})</span>
          <span style="margin-left:auto;width:12px;height:12px;background:#ff9800;border-radius:50%"></span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px">
          <input type="checkbox" :checked="store.showBreachEvents" @change="store.toggleBreachEventsVisibility" style="cursor:pointer">
          <span>🚨 越界事件 ({{ store.trackData.breachEvents.length }})</span>
          <span style="margin-left:auto;width:12px;height:12px;background:#e53935;border-radius:50%"></span>
        </label>
      </div>
    </div>

    <div v-if="store.trackData && store.trackData.stayPoints.length > 0"
      style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px;flex:1;overflow:auto;min-height:0">
      <div style="font-size:12px;font-weight:500;margin-bottom:8px;color:#333;display:flex;justify-content:space-between;align-items:center">
        <span>⏸️ 停留点记录</span>
        <span style="font-size:10px;color:#ff9800">{{ store.trackData.stayPoints.length }} 处</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div v-for="(sp, idx) in store.trackData.stayPoints" :key="idx"
          @click="store.jumpToStayPoint(sp)"
          class="stay-point-item"
          :style="{ padding:'8px 10px', borderRadius:'6px', border:'1px solid #ffe0b2',
            background:'#fff3e0', cursor:'pointer', fontSize:'11px',
            transition:'all 0.2s' }">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-weight:500;color:#e65100">{{ sp.name }}</span>
            <span style="color:#ff9800">⏱ {{ formatDuration(sp.duration) }}</span>
          </div>
          <div style="color:#888;font-size:10px">
            {{ formatTime(sp.startTime) }} - {{ formatTime(sp.endTime) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.trackData && store.trackData.breachEvents.length > 0"
      style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px;flex:1;overflow:auto;min-height:0">
      <div style="font-size:12px;font-weight:500;margin-bottom:8px;color:#333;display:flex;justify-content:space-between;align-items:center">
        <span>🚨 越界事件</span>
        <span style="font-size:10px;color:#e53935">{{ store.trackData.breachEvents.length }} 次</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div v-for="(be, idx) in store.trackData.breachEvents" :key="idx"
          @click="store.jumpToBreachEvent(be)"
          :style="{ padding:'8px 10px', borderRadius:'6px', border:'1px solid #ffcdd2',
            background:'#ffebee', cursor:'pointer', fontSize:'11px' }">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-weight:500;color:#c62828">{{ be.abnormalMessage || '越界告警' }}</span>
            <span style="color:#e53935">🚨</span>
          </div>
          <div style="color:#888;font-size:10px">
            {{ formatTime(be.timestamp) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.playbackCurrentPoint" style="background:#fff;padding:12px;border-radius:8px;border:1px solid #1976d2">
      <div style="font-size:12px;font-weight:500;margin-bottom:8px;color:#1976d2">📍 当前位置</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
        <div>
          <span style="color:#888">速度</span>
          <div style="font-weight:500">{{ store.playbackCurrentPoint.speed?.toFixed(1) || '0' }} km/h</div>
        </div>
        <div>
          <span style="color:#888">电量</span>
          <div :style="{ fontWeight:500, color: (store.playbackCurrentPoint.battery ?? 100) < 20 ? '#e53935' : '#333' }">
            {{ store.playbackCurrentPoint.battery ?? '--' }}%
          </div>
        </div>
        <div>
          <span style="color:#888">温度</span>
          <div style="font-weight:500">{{ store.playbackCurrentPoint.temperature?.toFixed(1) || '--' }}°C</div>
        </div>
        <div>
          <span style="color:#888">状态</span>
          <div :style="{ fontWeight:500, color: store.playbackCurrentPoint.isAbnormal ? '#e53935' : '#4caf50' }">
            {{ store.playbackCurrentPoint.isAbnormal ? '异常' : '正常' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="!store.trackData" style="textAlign:center;padding:40px 20px;color:#999;fontSize:13px">
      <div style="fontSize:40px;marginBottom:8px">📊</div>
      <div>选择设备和时间范围</div>
      <div style="fontSize:11px;marginTop:4px">查询历史轨迹数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useIotStore } from '../stores/iot';

const store = useIotStore();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const selectedDeviceId = ref<string>('');
const startTimeStr = ref<string>('');
const endTimeStr = ref<string>('');
const speedValue = ref<number>(1);

const quickPeriods = [
  { label: '1小时', hours: 1 },
  { label: '6小时', hours: 6 },
  { label: '12小时', hours: 12 },
  { label: '24小时', hours: 24 },
];

const selectedQuickPeriod = ref<number | null>(null);

function isQuickPeriodActive(hours: number): boolean {
  return selectedQuickPeriod.value === hours;
}

function setQuickPeriod(hours: number) {
  selectedQuickPeriod.value = hours;
  const now = new Date();
  const start = new Date(now.getTime() - hours * 3600000);
  startTimeStr.value = formatDateTimeLocal(start);
  endTimeStr.value = formatDateTimeLocal(now);
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分`;
  } else if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  }
  return `${seconds}秒`;
}

function handleLoadTrack() {
  if (!selectedDeviceId.value || !startTimeStr.value || !endTimeStr.value) return;
  const start = new Date(startTimeStr.value).toISOString();
  const end = new Date(endTimeStr.value).toISOString();
  store.loadTrackData(selectedDeviceId.value, start, end);
}

function togglePlay() {
  if (store.isPlaying) {
    store.pausePlayback();
  } else {
    store.startPlayback();
  }
}

function handleStop() {
  store.stopPlayback();
  store.seekToIndex(0);
}

function handleSkipBack() {
  const step = Math.max(1, Math.floor((store.trackData?.points.length || 0) / 20));
  store.seekToIndex(store.playbackCurrentIndex - step);
}

function handleSkipForward() {
  const step = Math.max(1, Math.floor((store.trackData?.points.length || 0) / 20));
  store.seekToIndex(store.playbackCurrentIndex + step);
}

function handleProgressChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const progress = parseFloat(target.value);
  store.seekToProgress(progress);
}

function handleSpeedChange() {
  store.setPlaybackSpeed(speedValue.value);
}

function handleClose() {
  store.disableTrackPlayback();
  emit('close');
}

watch(() => store.playbackSpeed, (speed) => {
  speedValue.value = speed;
});

setQuickPeriod(1);
</script>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1976d2;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1976d2;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.stay-point-item:hover {
  background: #ffe0b2 !important;
}
</style>
