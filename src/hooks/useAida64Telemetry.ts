import { useEffect, useMemo, useState, useCallback } from 'react';
import { Aida64HardwareDevice } from '../types';

export interface Aida64SensorReading {
  id: string;
  label: string;
  value: number;
  rawValue: string;
  unit: string;
  kind: string;
  updatedAt: string;
}

export interface Aida64TelemetrySnapshot {
  connected: boolean;
  source: 'shared-memory' | 'registry' | 'wmi' | 'system-fallback' | 'simulated' | 'none';
  timestamp: string;
  updateRateHz: number;
  sensorCount: number;
  latencyMs: number;
  sensors: Aida64SensorReading[];
  hardware?: Aida64HardwareDevice[];
  error?: string;
  lastScanned?: string;
}

export interface Aida64SensorBinding {
  sensorId: string;
  label: string;
  min: number;
  max: number;
  warning?: number;
  critical?: number;
  smoothingMs: number;
  peakHold: boolean;
  peakDecayMs: number;
  normalisation: 'linear' | 'inverse';
  staleTimeoutMs: number;
}

export const defaultAida64Binding = (sensor?: Aida64SensorReading): Aida64SensorBinding => ({
  sensorId: sensor?.id || '',
  label: sensor?.label || '',
  min: 0,
  max: sensor?.unit === '%' ? 100 : 100,
  warning: undefined,
  critical: undefined,
  smoothingMs: 150,
  peakHold: false,
  peakDecayMs: 2000,
  normalisation: 'linear',
  staleTimeoutMs: 2000
});

export function normaliseAida64Value(value: number, binding: Aida64SensorBinding) {
  const span = Math.max(0.000001, binding.max - binding.min);
  const t = Math.max(0, Math.min(1, (value - binding.min) / span));
  return Math.round((binding.normalisation === 'inverse' ? 1 - t : t) * 1000) / 10;
}

export function useAida64Telemetry(intervalMs = 1000) {
  const [snapshot, setSnapshot] = useState<Aida64TelemetrySnapshot>({
    connected: false,
    source: 'none',
    timestamp: new Date(0).toISOString(),
    updateRateHz: 0,
    sensorCount: 0,
    latencyMs: 0,
    sensors: [],
    hardware: [],
    error: 'Waiting for AIDA64 telemetry bridge…'
  });
  const [isScanning, setIsScanning] = useState(false);

  const poll = useCallback(async () => {
    try {
      const response = await fetch('/api/aida64/telemetry', { cache: 'no-store', headers: { Accept: 'application/json' } });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) throw new Error(`Telemetry API returned HTTP ${response.status}.`);
      if (!contentType.toLowerCase().includes('application/json')) {
        const body = await response.text();
        const hint = body.trimStart().startsWith('<')
          ? "The request reached an HTML/Vite page instead of Gina's API. Open Gina on port 3200 or restart Start_Factory.bat."
          : 'The telemetry endpoint did not return JSON.';
        throw new Error(hint);
      }
      const data = await response.json();
      if (data) setSnapshot(data);
      return data;
    } catch (error: any) {
      setSnapshot(prev => ({ ...prev, connected: false, source: 'none', error: error?.message || 'Telemetry bridge unavailable.' }));
      return null;
    }
  }, []);

  const scanAndRefresh = useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/aida64/telemetry/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`Scan request failed with HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.snapshot) {
        setSnapshot(data.snapshot);
        return data.snapshot;
      }
      // Fallback to regular poll if response format differs
      return await poll();
    } catch (err: any) {
      console.warn('Scan and refresh error, falling back to restart endpoint:', err);
      try {
        const restartRes = await fetch('/api/aida64/telemetry/restart', { method: 'POST' });
        const restartData = await restartRes.json();
        if (restartData && restartData.snapshot) {
          setSnapshot(restartData.snapshot);
          return restartData.snapshot;
        }
      } catch {}
      return await poll();
    } finally {
      setIsScanning(false);
    }
  }, [poll]);

  useEffect(() => {
    let alive = true;
    const runner = async () => {
      if (!alive) return;
      await poll();
    };
    runner();
    const id = window.setInterval(runner, Math.max(100, intervalMs));
    return () => { alive = false; window.clearInterval(id); };
  }, [intervalMs, poll]);

  const byId = useMemo(() => new Map(snapshot.sensors.map(sensor => [sensor.id, sensor])), [snapshot.sensors]);
  const hardware = useMemo(() => snapshot.hardware || [], [snapshot.hardware]);

  return {
    snapshot,
    sensors: snapshot.sensors,
    hardware,
    byId,
    isScanning,
    scanAndRefresh
  };
}

