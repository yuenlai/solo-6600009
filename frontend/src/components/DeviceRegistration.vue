<template>
  <div style="width:340px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0;height:100vh;box-sizing:border-box">
    <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
      ➕ 注册新设备
    </h3>

    <div style="padding:8px 12px;background:#e3f2fd;border-radius:6px;margin-bottom:16px;font-size:12px;color:#1565c0">
      {{ locationHint }}
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label style="font-size:12px;color:#666;font-weight:500">设备名称 *</label>
        <input v-model="form.name" placeholder="请输入设备名称"
          style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;margin-top:4px;font-size:13px;box-sizing:border-box" />
      </div>

      <div>
        <label style="font-size:12px;color:#666;font-weight:500">初始位置 *</label>
        <div style="display:flex;gap:8px;margin-top:4px">
          <div style="flex:1">
            <div style="font-size:11px;color:#888;margin-bottom:2px">纬度</div>
            <input v-model.number="form.lat" type="number" step="0.0001"
              :style="{ width:'100%', padding:'6px 8px', border:'1px solid ' + (locationPicked ? '#4caf50' : '#ddd'), borderRadius:'4px', fontSize:'12px', boxSizing:'border-box' }" />
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:#888;margin-bottom:2px">经度</div>
            <input v-model.number="form.lng" type="number" step="0.0001"
              :style="{ width:'100%', padding:'6px 8px', border:'1px solid ' + (locationPicked ? '#4caf50' : '#ddd'), borderRadius:'4px', fontSize:'12px', boxSizing:'border-box' }" />
          </div>
        </div>
        <div v-if="locationPicked" style="font-size:11px;color:#4caf50;margin-top:4px">✓ 已从地图选择位置</div>
      </div>

      <div style="display:flex;gap:8px">
        <div style="flex:1">
          <label style="font-size:12px;color:#666;font-weight:500">初始电量 (%)</label>
          <input v-model.number="form.battery" type="number" min="0" max="100"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;margin-top:4px;font-size:12px;box-sizing:border-box" />
        </div>
        <div style="flex:1">
          <label style="font-size:12px;color:#666;font-weight:500">初始温度 (°C)</label>
          <input v-model.number="form.temperature" type="number" step="0.1"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;margin-top:4px;font-size:12px;box-sizing:border-box" />
        </div>
      </div>

      <div>
        <label style="font-size:12px;color:#666;font-weight:500">所属分组</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          <button v-for="g in store.groups" :key="g.id" @click="form.groupId = form.groupId === g.id ? undefined : g.id"
            :style="{ padding:'6px 12px', borderRadius:'16px', border:'2px solid ' + (form.groupId === g.id ? g.color : '#e0e0e0'),
              background: form.groupId === g.id ? g.color + '20' : '#fff', color: form.groupId === g.id ? g.color : '#666',
              cursor:'pointer', fontSize:'12px', fontWeight: form.groupId === g.id ? 600 : 400 }">
            {{ g.name }}
          </button>
        </div>
      </div>

      <div style="border-top:1px solid #eee;padding-top:12px">
        <label style="font-size:13px;color:#333;font-weight:600">告警阈值设置</label>
        
        <div style="margin-top:10px">
          <label style="font-size:12px;color:#666;display:flex;justify-content:space-between">
            <span>🔋 低电量告警阈值</span>
            <span style="color:#f57c00;font-weight:500">{{ form.thresholds.lowBattery }}%</span>
          </label>
          <input v-model.number="form.thresholds.lowBattery" type="range" min="0" max="50"
            style="width:100%;margin-top:4px" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#999">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        <div style="margin-top:12px">
          <label style="font-size:12px;color:#666;display:flex;justify-content:space-between">
            <span>🌡 高温告警阈值</span>
            <span style="color:#e53935;font-weight:500">{{ form.thresholds.highTemperature }}°C</span>
          </label>
          <input v-model.number="form.thresholds.highTemperature" type="range" min="30" max="80"
            style="width:100%;margin-top:4px" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#999">
            <span>30°C</span>
            <span>80°C</span>
          </div>
        </div>

        <div style="margin-top:12px">
          <label style="font-size:12px;color:#666;display:flex;justify-content:space-between">
            <span>⏱ 离线超时阈值</span>
            <span style="color:#7b1fa2;font-weight:500">{{ form.thresholds.offlineTimeout }} 分钟</span>
          </label>
          <input v-model.number="form.thresholds.offlineTimeout" type="range" min="1" max="120"
            style="width:100%;margin-top:4px" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#999">
            <span>1分钟</span>
            <span>120分钟</span>
          </div>
        </div>
      </div>

      <div v-if="!isFormValid" style="padding:8px 12px;background:#ffebee;border-radius:6px;font-size:12px;color:#c62828">
        ⚠️ {{ errorMessage }}
      </div>

      <div style="display:flex;gap:8px;margin-top:8px">
        <button @click="handleCancel"
          style="flex:1;padding:10px;background:#f5f5f5;color:#666;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500">
          取消
        </button>
        <button @click="handleSubmit" :disabled="!isFormValid"
          :style="{ flex:1, padding:'10px', background: isFormValid ? '#1b5e20' : '#bdbdbd', color:'#fff', border:'none', borderRadius:'6px', cursor: isFormValid ? 'pointer' : 'not-allowed', fontSize:'13px', fontWeight:500 }">
          ✓ 完成注册
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useIotStore } from '../stores/iot';
import type { DeviceRegistrationForm } from '../types';

const store = useIotStore();

const emit = defineEmits<{
  (e: 'registered', deviceId: string): void;
  (e: 'cancel'): void;
}>();

const form = ref<DeviceRegistrationForm>({
  name: '',
  lat: 39.9042,
  lng: 116.4074,
  battery: 100,
  temperature: 25,
  groupId: undefined,
  thresholds: {
    lowBattery: 20,
    highTemperature: 50,
    offlineTimeout: 30
  }
});

const locationPicked = computed(() => store.registrationLocation !== null);

const locationHint = computed(() => {
  if (locationPicked.value) {
    return `📍 已选择位置: ${form.value.lat.toFixed(4)}, ${form.value.lng.toFixed(4)}`;
  }
  return '📍 点击地图选择设备初始位置，或手动输入经纬度';
});

const isFormValid = computed(() => {
  if (!form.value.name.trim()) return false;
  if (form.value.lat < -90 || form.value.lat > 90) return false;
  if (form.value.lng < -180 || form.value.lng > 180) return false;
  if (form.value.battery < 0 || form.value.battery > 100) return false;
  if (form.value.thresholds.lowBattery < 0 || form.value.thresholds.lowBattery > 50) return false;
  if (form.value.thresholds.highTemperature < 30 || form.value.thresholds.highTemperature > 80) return false;
  if (form.value.thresholds.offlineTimeout < 1 || form.value.thresholds.offlineTimeout > 120) return false;
  return true;
});

const errorMessage = computed(() => {
  if (!form.value.name.trim()) return '请输入设备名称';
  if (form.value.lat < -90 || form.value.lat > 90) return '纬度范围应为 -90 到 90';
  if (form.value.lng < -180 || form.value.lng > 180) return '经度范围应为 -180 到 180';
  if (form.value.battery < 0 || form.value.battery > 100) return '电量范围应为 0 到 100';
  return '请检查表单数据';
});

watch(() => store.registrationLocation, (loc) => {
  if (loc) {
    form.value.lat = loc.lat;
    form.value.lng = loc.lng;
  }
}, { immediate: true });

function handleCancel() {
  store.cancelDeviceRegistration();
  emit('cancel');
}

function handleSubmit() {
  if (!isFormValid.value) return;

  const deviceId = store.addDevice({
    name: form.value.name.trim(),
    lat: form.value.lat,
    lng: form.value.lng,
    battery: form.value.battery,
    temperature: form.value.temperature,
    groupId: form.value.groupId,
    thresholds: { ...form.value.thresholds }
  });

  store.cancelDeviceRegistration();
  store.setHighlightedDevice(deviceId);
  emit('registered', deviceId);
}
</script>
