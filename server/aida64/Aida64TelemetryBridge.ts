import { spawn, ChildProcessWithoutNullStreams, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface Aida64SensorReading {
  id: string;
  label: string;
  value: number;
  rawValue: string;
  unit: string;
  kind: string;
  updatedAt: string;
}

export interface Aida64HardwareDevice {
  id: string;
  name: string;
  category: 'GPU' | 'CPU' | 'MEMORY' | 'MOTHERBOARD' | 'STORAGE' | 'COOLING' | 'NETWORK' | 'SYSTEM' | 'OTHER';
  sensorCount: number;
  sensors: Aida64SensorReading[];
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

export interface Aida64TelemetryConfig {
  enabled: boolean;
  intervalMs: number;
}

const clampInterval = (value: number) => Math.max(50, Math.min(5000, Math.round(value || 1000)));

function categorizeSensor(sensor: Aida64SensorReading): { category: Aida64HardwareDevice['category']; deviceName: string } {
  const label = (sensor.label || '').toLowerCase();
  const id = (sensor.id || '').toLowerCase();
  const kind = (sensor.kind || '').toLowerCase();

  if (label.includes('gpu') || label.includes('geforce') || label.includes('radeon') || label.includes('graphics') || id.startsWith('tgpu') || id.startsWith('fgpu') || id.startsWith('vgpu') || id.startsWith('pgpu')) {
    return { category: 'GPU', deviceName: 'Graphics Card (GPU)' };
  }
  if (label.includes('cpu') || label.includes('ryzen') || label.includes('core') || label.includes('processor') || id.startsWith('tcpu') || id.startsWith('fcpu') || id.startsWith('vcpu') || id.startsWith('pcpu') || id.includes('scpu')) {
    return { category: 'CPU', deviceName: 'Processor (CPU)' };
  }
  if (label.includes('memory') || label.includes('ram') || label.includes('vram') || label.includes('pagefile') || id.startsWith('smem') || id.startsWith('svram') || id.startsWith('m')) {
    return { category: 'MEMORY', deviceName: 'System & Video Memory' };
  }
  if (label.includes('fan') || label.includes('pump') || label.includes('rpm') || label.includes('water') || id.startsWith('f')) {
    return { category: 'COOLING', deviceName: 'Cooling & Fan Channels' };
  }
  if (label.includes('drive') || label.includes('disk') || label.includes('ssd') || label.includes('nvme') || label.includes('hdd') || label.match(/\b[c-z]:/) || id.startsWith('thdd') || id.startsWith('sdisk')) {
    return { category: 'STORAGE', deviceName: 'Storage Drives' };
  }
  if (label.includes('network') || label.includes('download') || label.includes('upload') || label.includes('nic') || label.includes('ethernet') || label.includes('wi-fi') || id.startsWith('snet')) {
    return { category: 'NETWORK', deviceName: 'Network Interface' };
  }
  if (label.includes('motherboard') || label.includes('vcore') || label.includes('vbat') || label.includes('+12v') || label.includes('+5v') || label.includes('+3.3v') || label.includes('vdimm') || id.startsWith('tmob') || id.startsWith('v')) {
    return { category: 'MOTHERBOARD', deviceName: 'Motherboard & Power Rails' };
  }
  if (label.includes('date') || label.includes('time') || label.includes('year') || label.includes('month') || label.includes('day') || label.includes('uptime') || label.includes('os') || id.startsWith('s')) {
    return { category: 'SYSTEM', deviceName: 'System & OS Status' };
  }
  return { category: 'OTHER', deviceName: 'Auxiliary Sensors' };
}

export function groupSensorsIntoHardware(sensors: Aida64SensorReading[]): Aida64HardwareDevice[] {
  const map = new Map<string, { id: string; name: string; category: Aida64HardwareDevice['category']; sensors: Aida64SensorReading[] }>();

  for (const s of sensors) {
    const { category, deviceName } = categorizeSensor(s);
    const key = `${category}:${deviceName}`;
    if (!map.has(key)) {
      map.set(key, { id: key.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: deviceName, category, sensors: [] });
    }
    map.get(key)!.sensors.push(s);
  }

  return Array.from(map.values()).map(dev => ({
    ...dev,
    sensorCount: dev.sensors.length
  }));
}

export class Aida64TelemetryBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private retryTimer: NodeJS.Timeout | null = null;
  private config: Aida64TelemetryConfig = { enabled: true, intervalMs: 1000 };
  private snapshot: Aida64TelemetrySnapshot = {
    connected: false,
    source: 'none',
    timestamp: new Date(0).toISOString(),
    updateRateHz: 0,
    sensorCount: 0,
    latencyMs: 0,
    sensors: [],
    hardware: [],
    error: 'AIDA64 telemetry bridge initializing…'
  };

  start() {
    try {
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      if (process.platform !== 'win32') {
        this.snapshot = {
          ...this.snapshot,
          connected: false,
          source: 'none',
          error: 'AIDA64 shared-memory telemetry requires Windows.'
        };
        return;
      }

      // Proactively check registry immediately to have zero-delay readings
      this.readWindowsRegistryDirect().then(regSensors => {
        if (regSensors.length > 0 && !this.snapshot.connected) {
          const now = new Date().toISOString();
          const hardware = groupSensorsIntoHardware(regSensors);
          this.snapshot = {
            connected: true,
            source: 'registry',
            timestamp: now,
            updateRateHz: 10,
            sensorCount: regSensors.length,
            latencyMs: 1,
            sensors: regSensors,
            hardware,
            lastScanned: now,
            error: undefined
          };
        }
      }).catch(() => {});

      if (this.child) return;

      const candidatePaths = [
        path.join(process.cwd(), 'scripts', 'aida64_shared_memory.ps1'),
        path.resolve(__dirname, '..', '..', 'scripts', 'aida64_shared_memory.ps1'),
        path.resolve(__dirname, 'scripts', 'aida64_shared_memory.ps1'),
        'C:\\Gina_AI\\scripts\\aida64_shared_memory.ps1'
      ];
      const script = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];

      this.child = spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script,
        '-IntervalMs', String(this.config.intervalMs)
      ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

      let stderrAcc = '';
      this.child.stdout.setEncoding('utf8');
      this.child.stdout.on('data', (chunk: string) => this.consume(chunk));
      this.child.stderr.setEncoding('utf8');
      this.child.stderr.on('data', (chunk: string) => {
        stderrAcc += chunk;
        const message = stderrAcc.trim();
        if (message) this.snapshot = { ...this.snapshot, error: message };
      });
      this.child.on('close', (code) => {
        this.child = null;
        if (this.config.enabled) {
          // Check registry fallback if child closed
          this.readWindowsRegistryDirect().then(regSensors => {
            if (regSensors.length > 0) {
              const now = new Date().toISOString();
              this.snapshot = {
                connected: true,
                source: 'registry',
                timestamp: now,
                updateRateHz: 10,
                sensorCount: regSensors.length,
                latencyMs: 1,
                sensors: regSensors,
                hardware: groupSensorsIntoHardware(regSensors),
                lastScanned: now,
                error: undefined
              };
            } else {
              const detail = stderrAcc.trim() ? `: ${stderrAcc.trim()}` : '';
              this.snapshot = {
                ...this.snapshot,
                connected: false,
                source: 'none',
                error: `AIDA64 reader stopped (code ${code ?? 'unknown'})${detail}. Ensure AIDA64 is running with Preferences → External Applications → Shared Memory & Registry enabled.`
              };
            }
          }).catch(() => {});

          // Auto-reconnect retry after 4 seconds
          if (!this.retryTimer && process.platform === 'win32') {
            this.retryTimer = setTimeout(() => {
              this.retryTimer = null;
              if (this.config.enabled && !this.child) {
                this.start();
              }
            }, 4000);
          }
        }
      });
      this.child.on('error', (error) => {
        this.snapshot = { ...this.snapshot, connected: false, source: 'none', error: error.message };
        this.child = null;
      });
    } catch (err: any) {
      this.snapshot = { ...this.snapshot, connected: false, source: 'none', error: err?.message || String(err) };
      this.child = null;
    }
  }

  stop() {
    try {
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      if (this.child) {
        this.child.kill();
        this.child = null;
      }
    } catch {
      this.child = null;
    }
  }

  restart() {
    try {
      this.stop();
      if (this.config.enabled) this.start();
    } catch (err: any) {
      this.snapshot = { ...this.snapshot, connected: false, source: 'none', error: err?.message || String(err) };
    }
  }

  /**
   * Direct Windows Registry Reader Fallback
   * Queries HKCU\Software\FinalWire\AIDA64\SensorValues and parses Value.* and Label.* keys
   */
  async readWindowsRegistryDirect(): Promise<Aida64SensorReading[]> {
    if (process.platform !== 'win32') return [];
    const keys = ['HKCU\\Software\\FinalWire\\AIDA64\\SensorValues', 'HKLM\\SOFTWARE\\FinalWire\\AIDA64\\SensorValues'];
    for (const key of keys) {
      try {
        const { stdout } = await execFileAsync('reg.exe', ['query', key], { windowsHide: true, timeout: 3000 });
        if (!stdout || !stdout.includes('REG_SZ')) continue;

        const lines = stdout.split(/\r?\n/);
        const values = new Map<string, string>();
        const labels = new Map<string, string>();

        for (const line of lines) {
          const match = line.trim().match(/^([^\s]+)\s+REG_SZ\s*(.*)$/i);
          if (!match) continue;
          const propName = match[1];
          const propValue = match[2] || '';

          if (propName.startsWith('Value.')) {
            values.set(propName.slice(6), propValue);
          } else if (propName.startsWith('Label.')) {
            labels.set(propName.slice(6), propValue);
          }
        }

        if (values.size > 0) {
          const now = new Date().toISOString();
          const parsed: Aida64SensorReading[] = [];
          for (const [id, rawVal] of values.entries()) {
            const label = labels.get(id) || id;
            const numMatch = rawVal.replace(/,/g, '.').match(/[-+]?[0-9]*\.?[0-9]+/);
            const numVal = numMatch ? parseFloat(numMatch[0]) : 0;
            const idLower = id.toLowerCase();
            const labelLower = label.toLowerCase();

            let unit = '';
            let kind = 'sensor';
            if (idLower.startsWith('t') || labelLower.includes('temp') || labelLower.includes('°c')) { unit = '°C'; kind = 'temp'; }
            else if (idLower.startsWith('f') || labelLower.includes('fan') || labelLower.includes('rpm')) { unit = 'RPM'; kind = 'fan'; }
            else if (idLower.startsWith('v') || labelLower.includes('volt') || labelLower.includes('vcore')) { unit = 'V'; kind = 'volt'; }
            else if (idLower.startsWith('p') || labelLower.includes('watt') || labelLower.includes('power')) { unit = 'W'; kind = 'pwr'; }
            else if (idLower.startsWith('i') || labelLower.includes('current') || labelLower.includes('amp')) { unit = 'A'; kind = 'curr'; }
            else if (idLower.includes('uti') || labelLower.includes('%') || labelLower.includes('usage') || labelLower.includes('load')) { unit = '%'; kind = 'util'; }
            else if (idLower.startsWith('c') || labelLower.includes('clock') || labelLower.includes('mhz')) { unit = 'MHz'; kind = 'clock'; }
            else if (idLower.startsWith('m') || labelLower.includes('ram') || labelLower.includes('vram') || labelLower.includes('memory')) { unit = 'MB'; kind = 'mem'; }
            else if (idLower.startsWith('n') || labelLower.includes('download') || labelLower.includes('upload') || labelLower.includes('rate')) { unit = 'KB/s'; kind = 'net'; }
            else if (idLower.startsWith('s') || labelLower.includes('date') || labelLower.includes('time') || labelLower.includes('uptime')) { unit = ''; kind = 'sys'; }

            parsed.push({
              id,
              label,
              value: Number.isFinite(numVal) ? numVal : 0,
              rawValue: rawVal,
              unit,
              kind,
              updatedAt: now
            });
          }
          return parsed;
        }
      } catch {
        // Continue to next key
      }
    }
    return [];
  }

  /**
   * Re-enumerates connected AIDA64 sensors, queries all available channels,
   * updates the local snapshot state, and returns the detected hardware list.
   */
  async scanSensors(): Promise<{ snapshot: Aida64TelemetrySnapshot; hardware: Aida64HardwareDevice[] }> {
    const started = Date.now();
    let sensors: Aida64SensorReading[] = [];
    let source: Aida64TelemetrySnapshot['source'] = 'none';

    // 1. If active background bridge has readings, use them
    if (this.snapshot.connected && this.snapshot.sensors.length > 0) {
      sensors = [...this.snapshot.sensors];
      source = this.snapshot.source;
    }

    // 2. Otherwise attempt direct registry scan
    if (sensors.length === 0 && process.platform === 'win32') {
      const regSensors = await this.readWindowsRegistryDirect();
      if (regSensors.length > 0) {
        sensors = regSensors;
        source = 'registry';
      }
    }

    // 3. If child is dead on Windows, attempt restart
    if (!this.child && this.config.enabled && process.platform === 'win32') {
      this.start();
    }

    const latencyMs = Date.now() - started;
    const hardware = groupSensorsIntoHardware(sensors);
    const now = new Date().toISOString();

    if (sensors.length > 0) {
      this.snapshot = {
        connected: true,
        source,
        timestamp: now,
        updateRateHz: this.snapshot.updateRateHz || 10,
        sensorCount: sensors.length,
        latencyMs,
        sensors,
        hardware,
        lastScanned: now,
        error: undefined
      };
    } else {
      this.snapshot = {
        ...this.snapshot,
        connected: false,
        source: 'none',
        timestamp: now,
        sensorCount: 0,
        latencyMs,
        hardware: [],
        lastScanned: now,
        error: this.snapshot.error || 'No active AIDA64 sensors detected. Ensure AIDA64 is running with External Applications enabled.'
      };
    }

    return { snapshot: this.snapshot, hardware };
  }

  setConfig(patch: Partial<Aida64TelemetryConfig>) {
    this.config = {
      enabled: patch.enabled ?? this.config.enabled,
      intervalMs: clampInterval(patch.intervalMs ?? this.config.intervalMs)
    };
    this.restart();
    return this.config;
  }

  getConfig() { return this.config; }
  getSnapshot(): Aida64TelemetrySnapshot {
    if (this.snapshot.sensors.length > 0 && (!this.snapshot.hardware || this.snapshot.hardware.length === 0)) {
      this.snapshot.hardware = groupSensorsIntoHardware(this.snapshot.sensors);
    }
    return this.snapshot;
  }

  private consume(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as Aida64TelemetrySnapshot;
        if (parsed && Array.isArray(parsed.sensors)) {
          parsed.hardware = groupSensorsIntoHardware(parsed.sensors);
          this.snapshot = parsed;
        }
      } catch {
        // Ignore partial/non-JSON diagnostic output from PowerShell.
      }
    }
  }
}

