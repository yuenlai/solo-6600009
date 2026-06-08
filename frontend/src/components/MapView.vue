<template>
  <div style="flex:1;height:100%;position:relative">
    <div id="map" style="width:100%;height:100%"></div>
    <div v-if="store.editMode !== 'none'" :style="{ position:'absolute', top:'12px', left:'50%', transform:'translateX(-50%)',
      padding:'8px 16px', background:'#1976d2', color:'#fff', borderRadius:'20px', fontSize:'12px', zIndex:1000, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }">
      {{ modeHint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import L from 'leaflet';
import type { LatLng, LeafletMouseEvent, LeafletEvent, Marker } from 'leaflet';
import { useIotStore } from '../stores/iot';
import type { Geofence } from '../types';

const store = useIotStore();

const map = ref<any>(null);
const fenceLayers = ref<Map<string, any>>(new Map());
const markerLayers = ref<Map<string, any>>(new Map());
const deviceLayers = ref<Map<string, any>>(new Map());

const drawingTempCircle = ref<any>(null);
const drawingTempPolygon = ref<any>(null);
const drawingTempMarkers = ref<any[]>([]);
const drawingPoints = ref<{ lat: number; lng: number }[]>([]);
const drawingCircleCenter = ref<{ lat: number; lng: number } | null>(null);
const isDrawingCircleSecondClick = ref(false);
const isDragging = ref(false);
const pendingFenceUpdate = ref<{ id: string; updates: Partial<Geofence> } | null>(null);

const modeHint = computed(() => {
  if (store.editMode === 'draw-circle') {
    if (isDrawingCircleSecondClick.value) return '⭕ 移动鼠标调整半径，再次点击确认';
    return '⭕ 点击地图放置圆心';
  }
  if (store.editMode === 'draw-polygon') return `📐 点击添加顶点 (${drawingPoints.value.length})，双击完成绘制`;
  if (store.editMode === 'edit') return '✏️ 拖动围栏或顶点调整位置，在右侧编辑属性';
  return '';
});

const tempIcon = L.divIcon({
  className: 'custom-div-icon',
  html: '<div style="width:12px;height:12px;background:#1976d2;border:2px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const vertexIcon = L.divIcon({
  className: 'vertex-div-icon',
  html: '<div style="width:10px;height:10px;background:#fff;border:2px solid #1976d2;border-radius:50%"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

function renderFence(fence: Geofence) {
  clearFenceLayer(fence.id);

  const isSelected = store.selectedFenceId === fence.id;
  const weight = isSelected ? 3 : 2;
  const dashArray = undefined;
  const fillOpacity = isSelected ? 0.2 : 0.1;

  if (fence.type === 'circle') {
    const circle = L.circle([fence.center.lat, fence.center.lng], {
      radius: fence.radius,
      color: fence.color,
      fillColor: fence.color,
      fillOpacity,
      weight,
      dashArray
    });
    circle.bindPopup(`<b>${fence.name}</b><br>圆形 · ${fence.radius}m<br>${fence.alertOnEnter ? '进入告警 ' : ''}${fence.alertOnExit ? '离开告警' : ''}`);
    circle.on('click', () => {
      if (store.editMode === 'none' || store.editMode === 'edit') {
        store.selectFence(fence.id);
      }
    });
    circle.on('mousedown', (e: LeafletMouseEvent) => {
      if (store.editMode === 'edit' && isSelected) {
        handleFenceDragStart(e, fence);
      }
    });

    if (isSelected) {
      addEditHandlers(fence, circle);
    }

    circle.addTo(map.value!);
    fenceLayers.value.set(fence.id, circle);
  } else if (fence.type === 'polygon' && fence.paths && fence.paths.length >= 3) {
    const latlngs = fence.paths.map(p => [p.lat, p.lng] as [number, number]);
    const polygon = L.polygon(latlngs, {
      color: fence.color,
      fillColor: fence.color,
      fillOpacity,
      weight,
      dashArray
    });
    polygon.bindPopup(`<b>${fence.name}</b><br>多边形 · ${fence.paths.length}点<br>${fence.alertOnEnter ? '进入告警 ' : ''}${fence.alertOnExit ? '离开告警' : ''}`);
    polygon.on('click', () => {
      if (store.editMode === 'none' || store.editMode === 'edit') {
        store.selectFence(fence.id);
      }
    });
    polygon.on('mousedown', (e: LeafletMouseEvent) => {
      if (store.editMode === 'edit' && isSelected) {
        handleFenceDragStart(e, fence);
      }
    });

    if (isSelected) {
      addEditHandlers(fence, polygon);
    }

    polygon.addTo(map.value!);
    fenceLayers.value.set(fence.id, polygon);
  }
}

function clearFenceLayer(id: string) {
  const layer = fenceLayers.value.get(id);
  if (layer) {
    map.value!.removeLayer(layer);
    fenceLayers.value.delete(id);
  }
  markerLayers.value.forEach((marker, key) => {
    if (key.startsWith(id + '-')) {
      map.value!.removeLayer(marker);
      markerLayers.value.delete(key);
    }
  });
}

function clearAllFenceLayers() {
  fenceLayers.value.forEach((_, id) => clearFenceLayer(id));
}

function clearAllMarkerLayers() {
  markerLayers.value.forEach((marker) => {
    map.value!.removeLayer(marker);
  });
  markerLayers.value.clear();
}

function addEditHandlers(fence: Geofence, layer: any) {
  clearAllMarkerLayers();

  let currentCenter = { lat: fence.center.lat, lng: fence.center.lng };
  let currentRadius = fence.radius;
  let currentPaths = fence.paths ? [...fence.paths] : [];

  if (fence.type === 'circle') {
    const edgePoint = destinationPoint(currentCenter, 90, currentRadius);
    const radiusMarker = L.marker([edgePoint.lat, edgePoint.lng], {
      icon: vertexIcon,
      draggable: true
    });
    radiusMarker.addTo(map.value!);
    markerLayers.value.set(fence.id + '-radius', radiusMarker);

    const centerMarker = L.marker([currentCenter.lat, currentCenter.lng], {
      icon: tempIcon,
      draggable: true
    });
    centerMarker.addTo(map.value!);
    markerLayers.value.set(fence.id + '-center', centerMarker);

    centerMarker.on('dragstart', () => {
      isDragging.value = true;
    });

    centerMarker.on('drag', (e: LeafletEvent) => {
      const latlng = (e.target as Marker).getLatLng();
      currentCenter = { lat: latlng.lat, lng: latlng.lng };
      const newEdgePoint = destinationPoint(currentCenter, 90, currentRadius);

      layer.setLatLng([currentCenter.lat, currentCenter.lng]);
      radiusMarker.setLatLng([newEdgePoint.lat, newEdgePoint.lng]);

      pendingFenceUpdate.value = {
        id: fence.id,
        updates: { center: currentCenter }
      };
    });

    centerMarker.on('dragend', () => {
      isDragging.value = false;
      if (pendingFenceUpdate.value) {
        store.updateFence(pendingFenceUpdate.value.id, pendingFenceUpdate.value.updates);
        pendingFenceUpdate.value = null;
      }
    });

    radiusMarker.on('dragstart', () => {
      isDragging.value = true;
    });

    radiusMarker.on('drag', (e: LeafletEvent) => {
      const latlng = (e.target as Marker).getLatLng();
      const center = L.latLng(currentCenter.lat, currentCenter.lng);
      const radius = map.value!.distance(center, latlng);
      currentRadius = Math.max(10, radius);

      layer.setRadius(currentRadius);

      pendingFenceUpdate.value = {
        id: fence.id,
        updates: { radius: currentRadius }
      };
    });

    radiusMarker.on('dragend', () => {
      isDragging.value = false;
      if (pendingFenceUpdate.value) {
        store.updateFence(pendingFenceUpdate.value.id, pendingFenceUpdate.value.updates);
        pendingFenceUpdate.value = null;
      }
    });
  } else if (fence.type === 'polygon' && fence.paths) {
    const vertexMarkers: any[] = [];

    currentPaths.forEach((point, idx) => {
      const vertexMarker = L.marker([point.lat, point.lng], {
        icon: vertexIcon,
        draggable: true
      });
      vertexMarker.addTo(map.value!);
      markerLayers.value.set(fence.id + '-v' + idx, vertexMarker);
      vertexMarkers.push(vertexMarker);

      vertexMarker.on('dragstart', () => {
        isDragging.value = true;
      });

      vertexMarker.on('drag', (e: LeafletEvent) => {
        const latlng = (e.target as Marker).getLatLng();
        currentPaths[idx] = { lat: latlng.lat, lng: latlng.lng };
        const latlngs = currentPaths.map(p => [p.lat, p.lng] as [number, number]);
        layer.setLatLngs(latlngs);

        const center = calculatePolygonCenter(currentPaths);
        pendingFenceUpdate.value = {
          id: fence.id,
          updates: { paths: [...currentPaths], center }
        };
      });

      vertexMarker.on('dragend', () => {
        isDragging.value = false;
        if (pendingFenceUpdate.value) {
          store.updateFence(pendingFenceUpdate.value.id, pendingFenceUpdate.value.updates);
          pendingFenceUpdate.value = null;
        }
      });
    });
  }
}

function calculatePolygonCenter(paths: { lat: number; lng: number }[]) {
  let sumLat = 0, sumLng = 0;
  paths.forEach(p => { sumLat += p.lat; sumLng += p.lng; });
  return { lat: sumLat / paths.length, lng: sumLng / paths.length };
}

function destinationPoint(start: { lat: number; lng: number }, bearing: number, distance: number) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const phi1 = start.lat * rad;
  const lambda1 = start.lng * rad;
  const brng = bearing * rad;
  const dr = distance / R;
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(dr) + Math.cos(phi1) * Math.sin(dr) * Math.cos(brng));
  const lambda2 = lambda1 + Math.atan2(Math.sin(brng) * Math.sin(dr) * Math.cos(phi1), Math.cos(dr) - Math.sin(phi1) * Math.sin(phi2));
  return { lat: phi2 * deg, lng: lambda2 * deg };
}

let dragStartLatLng: any = null;
let dragFence: Geofence | null = null;
let dragCurrentCenter: { lat: number; lng: number } | null = null;
let dragCurrentPaths: { lat: number; lng: number }[] | null = null;
let dragPendingUpdates: { center?: { lat: number; lng: number }; paths?: { lat: number; lng: number }[] } | null = null;

function handleFenceDragStart(e: any, fence: Geofence) {
  if (store.editMode !== 'edit') return;
  dragStartLatLng = e.latlng;
  dragFence = fence;
  dragCurrentCenter = { lat: fence.center.lat, lng: fence.center.lng };
  dragCurrentPaths = fence.paths ? [...fence.paths] : null;
  isDragging.value = true;
  dragPendingUpdates = null;
  L.DomEvent.stopPropagation(e);
}

function handleMapMouseMove(e: LeafletMouseEvent) {
  if (isDrawingCircleSecondClick.value && drawingCircleCenter.value && drawingTempCircle.value) {
    const center = L.latLng(drawingCircleCenter.value.lat, drawingCircleCenter.value.lng);
    const radius = map.value!.distance(center, e.latlng);
    drawingTempCircle.value.setRadius(Math.max(10, radius));
    return;
  }

  if (!dragFence || !dragStartLatLng || !dragCurrentCenter) return;

  const dLat = e.latlng.lat - dragStartLatLng.lat;
  const dLng = e.latlng.lng - dragStartLatLng.lng;

  const layer = fenceLayers.value.get(dragFence.id);
  if (!layer) return;

  if (dragFence.type === 'circle') {
    dragCurrentCenter = {
      lat: dragCurrentCenter.lat + dLat,
      lng: dragCurrentCenter.lng + dLng
    };

    layer.setLatLng([dragCurrentCenter.lat, dragCurrentCenter.lng]);

    const centerMarker = markerLayers.value.get(dragFence.id + '-center');
    const radiusMarker = markerLayers.value.get(dragFence.id + '-radius');
    if (centerMarker) {
      centerMarker.setLatLng([dragCurrentCenter.lat, dragCurrentCenter.lng]);
    }
    if (radiusMarker) {
      const newEdgePoint = destinationPoint(dragCurrentCenter, 90, dragFence.radius);
      radiusMarker.setLatLng([newEdgePoint.lat, newEdgePoint.lng]);
    }

    dragPendingUpdates = { center: dragCurrentCenter };
  } else if (dragFence.type === 'polygon' && dragCurrentPaths) {
    const fenceId = dragFence.id;
    dragCurrentPaths = dragCurrentPaths.map(p => ({
      lat: p.lat + dLat,
      lng: p.lng + dLng
    }));
    const latlngs = dragCurrentPaths.map(p => [p.lat, p.lng] as [number, number]);
    layer.setLatLngs(latlngs);

    const paths = dragCurrentPaths;
    paths.forEach((_, idx) => {
      const vertexMarker = markerLayers.value.get(fenceId + '-v' + idx);
      if (vertexMarker) {
        vertexMarker.setLatLng([paths[idx].lat, paths[idx].lng]);
      }
    });

    const center = calculatePolygonCenter(dragCurrentPaths);
    dragCurrentCenter = center;
    dragPendingUpdates = { paths: [...dragCurrentPaths], center };
  }

  dragStartLatLng = e.latlng;
}

function handleMapMouseUp() {
  dragStartLatLng = null;
  const fenceId = dragFence?.id;
  const updates = dragPendingUpdates;
  dragFence = null;
  dragCurrentCenter = null;
  dragCurrentPaths = null;
  dragPendingUpdates = null;
  isDragging.value = false;

  if (fenceId && updates) {
    store.updateFence(fenceId, updates);
  }
}

function handleMapClick(e: LeafletMouseEvent) {
  if (store.editMode === 'draw-circle') {
    if (!isDrawingCircleSecondClick.value) {
      drawingCircleCenter.value = { lat: e.latlng.lat, lng: e.latlng.lng };
      drawingTempCircle.value = L.circle([e.latlng.lat, e.latlng.lng], {
        radius: 10,
        color: '#1976d2',
        fillColor: '#1976d2',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5,5'
      }).addTo(map.value!);

      const centerMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: tempIcon
      }).addTo(map.value!);
      drawingTempMarkers.value.push(centerMarker);

      isDrawingCircleSecondClick.value = true;
    } else {
      finishCircleDrawing();
    }
  } else if (store.editMode === 'draw-polygon') {
    drawingPoints.value.push({ lat: e.latlng.lat, lng: e.latlng.lng });
    updateTempPolygon();

    const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: tempIcon }).addTo(map.value!);
    drawingTempMarkers.value.push(marker);
  }
}

function handleMapDblClick() {
  if (store.editMode === 'draw-polygon' && drawingPoints.value.length >= 3) {
    finishPolygonDrawing();
  }
}

function updateTempPolygon() {
  if (drawingTempPolygon.value) {
    map.value!.removeLayer(drawingTempPolygon.value);
  }
  if (drawingPoints.value.length >= 2) {
    const latlngs = drawingPoints.value.map(p => [p.lat, p.lng] as [number, number]);
    drawingTempPolygon.value = L.polygon(latlngs, {
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5,5'
    }).addTo(map.value!);
  }
}

function finishCircleDrawing() {
  if (!drawingTempCircle.value || !drawingCircleCenter.value) return;

  const radius = drawingTempCircle.value.getRadius();
  const newId = store.addFence({
    name: '新围栏 ' + (store.fences.length + 1),
    center: { lat: drawingCircleCenter.value.lat, lng: drawingCircleCenter.value.lng },
    radius,
    type: 'circle',
    alertOnEnter: true,
    alertOnExit: false,
    color: '#1976d2'
  });

  clearDrawingTemp();
  store.selectFence(newId);
}

function finishPolygonDrawing() {
  if (drawingPoints.value.length < 3) return;

  const center = calculatePolygonCenter(drawingPoints.value);
  const newId = store.addFence({
    name: '新围栏 ' + (store.fences.length + 1),
    center,
    radius: 0,
    type: 'polygon',
    paths: [...drawingPoints.value],
    alertOnEnter: true,
    alertOnExit: false,
    color: '#1976d2'
  });

  clearDrawingTemp();
  store.selectFence(newId);
}

function clearDrawingTemp() {
  if (drawingTempCircle.value) {
    map.value!.removeLayer(drawingTempCircle.value);
    drawingTempCircle.value = null;
  }
  if (drawingTempPolygon.value) {
    map.value!.removeLayer(drawingTempPolygon.value);
    drawingTempPolygon.value = null;
  }
  drawingTempMarkers.value.forEach((m: any) => map.value!.removeLayer(m));
  drawingTempMarkers.value = [];
  drawingPoints.value = [];
  drawingCircleCenter.value = null;
  isDrawingCircleSecondClick.value = false;
}

function renderAllFences() {
  clearAllFenceLayers();
  clearAllMarkerLayers();
  store.fences.forEach(f => renderFence(f));
}

function renderAllDevices() {
  deviceLayers.value.forEach(d => map.value!.removeLayer(d));
  deviceLayers.value.clear();

  store.devices.forEach(d => {
    const isHighlighted = store.highlightedDeviceId === d.id;
    const color = d.status === 'online' ? '#4caf50' : d.status === 'alert' ? '#e53935' : '#9e9e9e';
    const baseRadius = 8;
    const radius = isHighlighted ? baseRadius + 6 : baseRadius;
    const weight = isHighlighted ? 4 : 2;

    if (isHighlighted) {
      const pulseMarker = L.circleMarker([d.lat, d.lng], {
        radius: radius + 8,
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5,5'
      }).addTo(map.value!);
      deviceLayers.value.set(d.id + '-pulse', pulseMarker);
    }

    const marker = L.circleMarker([d.lat, d.lng], {
      radius,
      color,
      fillColor: color,
      fillOpacity: isHighlighted ? 1 : 0.8,
      weight
    })
      .addTo(map.value!)
      .bindPopup(`<b>${d.name}</b><br>状态: ${d.status === 'online' ? '在线' : d.status === 'alert' ? '告警' : '离线'}<br>电量: ${d.battery}%<br>温度: ${d.temperature}°C`);

    if (isHighlighted) {
      marker.openPopup();
    }

    deviceLayers.value.set(d.id, marker);
  });
}

function panToDevice(deviceId: string) {
  const device = store.getDeviceById(deviceId);
  if (device && map.value) {
    map.value.panTo([device.lat, device.lng], { animate: true, duration: 0.5 });
  }
}

watch(() => store.fences, () => {
  if (isDragging.value) return;
  renderAllFences();
}, { deep: true });

watch(() => store.selectedFenceId, () => {
  renderAllFences();
});

watch(() => store.editMode, (newMode) => {
  if (newMode === 'none') {
    clearDrawingTemp();
  }
  renderAllFences();
});

watch(() => store.devices, () => {
  renderAllDevices();
}, { deep: true });

watch(() => store.highlightedDeviceId, (newId, oldId) => {
  renderAllDevices();
  if (newId && newId !== oldId) {
    panToDevice(newId);
  }
});

onMounted(() => {
  map.value = L.map('map').setView([39.9042, 116.4074], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map.value);

  map.value.on('click', handleMapClick);
  map.value.on('dblclick', handleMapDblClick);
  map.value.on('mousemove', handleMapMouseMove);
  map.value.on('mouseup', handleMapMouseUp);

  renderAllFences();
  renderAllDevices();
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
  }
});
</script>
