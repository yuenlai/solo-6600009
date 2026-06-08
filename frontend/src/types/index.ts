export interface Device {
  id: string; name: string; lat: number; lng: number;
  status: 'online' | 'offline' | 'alert'; lastSeen: string;
  battery: number; temperature: number;
  groupId?: string;
  thresholds?: DeviceThresholds;
}

export interface DeviceThresholds {
  lowBattery: number;
  highTemperature: number;
  offlineTimeout: number;
}

export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface DeviceRegistrationForm {
  name: string;
  lat: number;
  lng: number;
  battery: number;
  temperature: number;
  groupId?: string;
  thresholds: DeviceThresholds;
}

export interface Geofence {
  id: string; name: string;
  center: { lat: number; lng: number };
  radius: number; type: 'circle' | 'polygon';
  paths?: Array<{ lat: number; lng: number }>;
  alertOnEnter: boolean; alertOnExit: boolean; color: string;
}

export type AlertType = 'enter' | 'exit' | 'low_battery' | 'offline';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  deviceId: string;
  fenceId?: string;
  type: AlertType;
  severity: AlertSeverity;
  timestamp: string;
  message: string;
  acknowledged: boolean;
}

export interface MqttMessage {
  topic: string; payload: string; timestamp: string;
}
