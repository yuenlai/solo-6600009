<template>
  <div style="width:320px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0;display:flex;flex-direction:column;height:100vh;box-sizing:border-box">
    <h3 style="margin:0 0 12px;display:flex;align-items:center;gap:8px">
      🗺️ 围栏工作台
    </h3>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button @click="startDrawCircle"
        :style="{ flex:1, padding:'8px 12px', borderRadius:'6px', border:'1px solid ' + (store.editMode === 'draw-circle' ? '#1976d2' : '#ccc'),
          background: store.editMode === 'draw-circle' ? '#e3f2fd' : '#fff', color: store.editMode === 'draw-circle' ? '#1976d2' : '#333',
          cursor:'pointer', fontSize:'12px' }">
        ⭕ 画圆形
      </button>
      <button @click="startDrawPolygon"
        :style="{ flex:1, padding:'8px 12px', borderRadius:'6px', border:'1px solid ' + (store.editMode === 'draw-polygon' ? '#1976d2' : '#ccc'),
          background: store.editMode === 'draw-polygon' ? '#e3f2fd' : '#fff', color: store.editMode === 'draw-polygon' ? '#1976d2' : '#333',
          cursor:'pointer', fontSize:'12px' }">
        📐 画多边形
      </button>
    </div>

    <div v-if="drawingHint" style="padding:8px 12px;background:#fff3e0;border-radius:6px;margin-bottom:12px;font-size:12px;color:#e65100">
      {{ drawingHint }}
      <button @click="cancelDraw" style="margin-left:8px;padding:2px 8px;border-radius:4px;border:1px solid #e65100;background:transparent;color:#e65100;cursor:pointer;font-size:11px">取消</button>
    </div>

    <div v-if="store.selectedFence" style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:12px">
      <div style="font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        ✏️ 编辑围栏
        <button @click="cancelEdit" style="padding:2px 8px;border-radius:4px;border:1px solid #999;background:#fff;color:#666;cursor:pointer;font-size:11px">完成</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <label style="font-size:12px;color:#666">
          围栏名称
          <input v-model="editingFence.name"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;margin-top:4px;font-size:12px;box-sizing:border-box">
        </label>

        <label style="font-size:12px;color:#666">
          颜色
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
            <button v-for="c in colorOptions" :key="c" @click="editingFence.color = c"
              :style="{ width:'24px', height:'24px', borderRadius:'50%', border:'2px solid ' + (editingFence.color === c ? '#333' : 'transparent'),
                background:c, cursor:'pointer', padding:0 }"></button>
          </div>
        </label>

        <div style="font-size:12px;color:#666;margin-top:4px">
          <div style="font-weight:500;margin-bottom:4px">触发规则</div>
          <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;cursor:pointer">
            <input type="checkbox" v-model="editingFence.alertOnEnter" style="cursor:pointer">
            进入围栏时告警
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" v-model="editingFence.alertOnExit" style="cursor:pointer">
            离开围栏时告警
          </label>
        </div>

        <div v-if="editingFence.type === 'circle'" style="font-size:12px;color:#666">
          半径: {{ editingFence.radius }} 米
        </div>

        <div v-if="editingFence.type === 'polygon'" style="font-size:12px;color:#666">
          顶点数: {{ editingFence.paths?.length || 0 }}
        </div>

        <div style="display:flex;gap:8px;margin-top:8px">
          <button @click="saveFence"
            style="flex:1;padding:8px;background:#1976d2;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">
            💾 保存
          </button>
          <button @click="deleteCurrentFence"
            style="padding:8px 16px;background:#e53935;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div style="margin-top:auto">
      <h4 style="margin:16px 0 8px;font-size:13px;color:#333">现有围栏 ({{ store.fences.length }})</h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div v-for="f in store.fences" :key="f.id"
          @click="selectFence(f.id)"
          :style="{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', borderRadius:'6px',
            border:'1px solid ' + (store.selectedFenceId === f.id ? f.color : '#e0e0e0'),
            background: store.selectedFenceId === f.id ? f.color + '15' : '#fff',
            cursor:'pointer', fontSize:'12px' }">
          <span :style="{ width:'12px', height:'12px', borderRadius: f.type === 'circle' ? '50%' : '2px', background: f.color }"></span>
          <div style="flex:1">
            <div style="font-weight:500">{{ f.name }}</div>
            <div style="font-size:10px;color:#888">
              {{ f.type === 'circle' ? '圆形 · ' + f.radius + 'm' : '多边形 · ' + (f.paths?.length || 0) + '点' }}
              <span v-if="f.alertOnEnter" style="margin-left:4px">📍入</span>
              <span v-if="f.alertOnExit" style="margin-left:4px">📍出</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useIotStore } from '../stores/iot';
import type { Geofence } from '../types';

const store = useIotStore();

const colorOptions = ['#4caf50', '#e53935', '#1976d2', '#ff9800', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

const editingFence = ref<Partial<Geofence>>({});

const drawingHint = computed(() => {
  if (store.editMode === 'draw-circle') return '点击地图设置圆心，拖动调整半径';
  if (store.editMode === 'draw-polygon') return '点击地图添加顶点，双击完成绘制';
  return '';
});

watch(() => store.selectedFence, (fence) => {
  if (fence) {
    editingFence.value = { ...fence };
  }
}, { immediate: true });

function startDrawCircle() {
  store.setEditMode('draw-circle');
}

function startDrawPolygon() {
  store.setEditMode('draw-polygon');
}

function cancelDraw() {
  store.setEditMode('none');
}

function cancelEdit() {
  store.setEditMode('none');
  editingFence.value = {};
}

function selectFence(id: string) {
  store.selectFence(id);
}

function saveFence() {
  if (store.selectedFenceId && editingFence.value) {
    store.updateFence(store.selectedFenceId, editingFence.value);
  }
}

function deleteCurrentFence() {
  if (store.selectedFenceId && confirm('确定要删除该围栏吗？')) {
    store.deleteFence(store.selectedFenceId);
    editingFence.value = {};
  }
}
</script>
