import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAppStore } from '../state/store';
import { Cpu, RotateCcw, Move, Compass, Shield, Navigation } from 'lucide-react';

export const Quadcopter3DViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const { systemState, theme } = useAppStore();

  // Keep references to live motor & attitude telemetry for the animation loop
  const telemetryRef = useRef({
    m1Rpm: 0,
    m2Rpm: 0,
    m3Rpm: 0,
    m4Rpm: 0,
    m1Status: 'GRAY',
    m2Status: 'GRAY',
    m3Status: 'GRAY',
    m4Status: 'GRAY',
    rollDeg: 0,
    pitchDeg: 0,
    yawDeg: 0,
    hasRealAttitude: false,
    flightMode: 'STABILIZE',
    isArmed: false,
    sats: 0,
    heartbeat: false,
    isConnected: false
  });

  useEffect(() => {
    if (systemState) {
      const tel = systemState.telemetry;
      const motors = tel.motors || {};
      const isConn = tel.connection_status === 'CONNECTED' || tel.source_type === 'SIMULATION';
      const hb = !!tel.heartbeat_received;

      const getStatusColor = (mId: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4') => {
        const m = motors[mId];
        if (m && m.is_connected === false) return 'DISCONNECTED';
        if (!isConn && tel.source_type === 'APM_MAVLINK') return 'GRAY';
        if (m?.temperature_c && m.temperature_c > 75) return 'RED';
        if (m?.vibration_rms_g && m.vibration_rms_g > 0.45) return 'RED';
        if (mId === 'motor_3' && tel.rpm_imbalance_pct && tel.rpm_imbalance_pct > 15) return 'AMBER';
        if (m?.temperature_c && m.temperature_c > 60) return 'AMBER';
        if (isConn) return 'GREEN';
        return 'GRAY';
      };

      const hasAttitude = (tel.roll_deg !== undefined && tel.pitch_deg !== undefined && isConn && (tel.roll_deg !== 0 || tel.pitch_deg !== 0 || tel.yaw_deg !== 0));

      const getMotorRpm = (mId: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4') => {
        const m = motors[mId];
        if (!isConn) return 0;
        if (!m || m.is_connected === false || m.connection_status === 'DISCONNECTED') return 0;
        return m.live_rpm ?? 0;
      };

      telemetryRef.current = {
        m1Rpm: getMotorRpm('motor_1'),
        m2Rpm: getMotorRpm('motor_2'),
        m3Rpm: getMotorRpm('motor_3'),
        m4Rpm: getMotorRpm('motor_4'),
        m1Status: getStatusColor('motor_1'),
        m2Status: getStatusColor('motor_2'),
        m3Status: getStatusColor('motor_3'),
        m4Status: getStatusColor('motor_4'),
        rollDeg: tel.roll_deg || 0,
        pitchDeg: tel.pitch_deg || 0,
        yawDeg: tel.yaw_deg || 0,
        hasRealAttitude: !!hasAttitude,
        flightMode: tel.flight_mode || 'STABILIZE',
        isArmed: !!tel.is_armed,
        sats: tel.satellites_visible || 0,
        heartbeat: hb,
        isConnected: isConn
      };
    }
  }, [systemState]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 480;

    const isDark = theme === 'dark';

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x090d16 : 0xf8fafc);

    // Optimized camera distance and field of view for high visibility of full F450 assembly
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 4.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls for 360-degree interactive mouse/touch rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Don't go below ground
    controls.minDistance = 2.0;
    controls.maxDistance = 12.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.7 : 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.0 : 1.2);
    dirLight.position.set(6, 10, 6);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const cyanPoint = new THREE.PointLight(0x0ea5e9, 0.8, 12);
    cyanPoint.position.set(0, 3, 0);
    scene.add(cyanPoint);

    // 3. Grid Helper
    const gridHelper = new THREE.GridHelper(
      10, 
      20, 
      isDark ? 0x0284c7 : 0x0284c7, 
      isDark ? 0x1e293b : 0xe2e8f0
    );
    gridHelper.position.y = -0.28;
    scene.add(gridHelper);

    // 4. Drone Master Group
    const droneGroup = new THREE.Group();
    scene.add(droneGroup);

    // Materials
    const carbonMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x334155,
      roughness: 0.3,
      metalness: 0.8
    });
    const frameCenterMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0x1e293b,
      roughness: 0.2,
      metalness: 0.9
    });
    const motorStatorBaseMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.7
    });
    const propBladeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.3
    });
    const batteryMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Amber LiPo pack
      roughness: 0.5
    });
    const apmMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1, // APM Blue enclosure
      roughness: 0.3,
      metalness: 0.5
    });

    // Authentic DJI F450 CAD Airframe (Converted from Autodesk Inventor STEP AP214)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/f450_frame.glb',
      (gltf) => {
        const cadModel = gltf.scene;
        cadModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        droneGroup.add(cadModel);
      },
      undefined,
      (err) => {
        console.warn('F450 CAD model loading failed:', err);
      }
    );

    // APM Flight Controller Enclosure (Mounted securely on Top Plate)
    const apmGeo = new THREE.BoxGeometry(0.44, 0.09, 0.44);
    const apmMesh = new THREE.Mesh(apmGeo, apmMat);
    apmMesh.position.y = 0.22;
    apmMesh.castShadow = true;
    droneGroup.add(apmMesh);

    // APM Telemetry Status LED
    const ledGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.12, 0.27, 0.12);
    droneGroup.add(ledMesh);

    // 3S LiPo Battery Pack (Slotted directly under Bottom Plate)
    const battGeo = new THREE.BoxGeometry(0.42, 0.18, 0.78);
    const battMesh = new THREE.Mesh(battGeo, batteryMat);
    battMesh.position.y = -0.16;
    battMesh.castShadow = true;
    droneGroup.add(battMesh);

    // 4 Motor Positions (Aligned exactly with CAD Arm Motor Mount Pads)
    const armPositions = [
      { id: 'm1', label: 'M1 (Front-Right)', x: 1.251, y: 0.124, z: -1.284 },
      { id: 'm2', label: 'M2 (Rear-Left)', x: -1.163, y: 0.124, z: 1.343 },
      { id: 'm3', label: 'M3 (Front-Left)', x: -1.296, y: 0.124, z: -1.216 },
      { id: 'm4', label: 'M4 (Rear-Right)', x: 1.278, y: 0.124, z: 1.247 }
    ];

    // Motor Hubs & Propellers Groups
    const motorStatusMeshes: Record<string, THREE.Mesh> = {};
    const propGroups: Record<string, THREE.Group> = {};

    armPositions.forEach((arm) => {
      const motorBase = new THREE.Group();
      motorBase.position.set(arm.x, arm.y, arm.z);
      droneGroup.add(motorBase);

      // A2212 Brushless Motor Stator Housing
      const statorGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.22, 24);
      const statorMesh = new THREE.Mesh(statorGeo, motorStatorBaseMat);
      statorMesh.position.y = 0.11;
      statorMesh.castShadow = true;
      motorBase.add(statorMesh);

      // Status Halo / Glow Ring under motor mount
      const haloGeo = new THREE.TorusGeometry(0.23, 0.035, 16, 32);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2;
      haloMesh.position.y = 0.01;
      motorBase.add(haloMesh);
      motorStatusMeshes[arm.id] = haloMesh;

      // Rotating Propeller Group
      const propGroup = new THREE.Group();
      propGroup.position.y = 0.23;
      motorBase.add(propGroup);
      propGroups[arm.id] = propGroup;

      // Propeller Hub
      const pHubGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.06, 16);
      const pHub = new THREE.Mesh(pHubGeo, frameCenterMat);
      pHub.castShadow = true;
      propGroup.add(pHub);

      // 2-Blade 1045 Aerodynamic Propeller
      const bladeGeo = new THREE.BoxGeometry(1.20, 0.015, 0.10);
      const blade = new THREE.Mesh(bladeGeo, propBladeMat);
      blade.position.y = 0.03;
      blade.castShadow = true;
      propGroup.add(blade);
    });

    // Target rotation angles for smooth interpolation
    const currentEuler = new THREE.Euler(0, 0, 0, 'YXZ');

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const now = clock.getElapsedTime();
      const tState = telemetryRef.current;

      // Update Motor Status Colors (Green, Amber, Red, Gray, Disconnected)
      const colorMap: Record<string, number> = {
        GREEN: 0x10b981,
        AMBER: 0xf59e0b,
        RED: 0xef4444,
        GRAY: 0x64748b,
        DISCONNECTED: 0x334155
      };

      if (motorStatusMeshes['m1']) (motorStatusMeshes['m1'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[tState.m1Status] ?? 0x10b981);
      if (motorStatusMeshes['m2']) (motorStatusMeshes['m2'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[tState.m2Status] ?? 0x10b981);
      if (motorStatusMeshes['m3']) (motorStatusMeshes['m3'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[tState.m3Status] ?? 0x10b981);
      if (motorStatusMeshes['m4']) (motorStatusMeshes['m4'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[tState.m4Status] ?? 0x10b981);

      // Rotate Propellers strictly based on actual measured RPM
      if (propGroups['m1'] && tState.m1Rpm > 0) {
        propGroups['m1'].rotation.y += ((tState.m1Rpm * 2 * Math.PI) / 60.0) * dt;
      }
      if (propGroups['m2'] && tState.m2Rpm > 0) {
        propGroups['m2'].rotation.y += ((tState.m2Rpm * 2 * Math.PI) / 60.0) * dt;
      }
      if (propGroups['m3'] && tState.m3Rpm > 0) {
        propGroups['m3'].rotation.y -= ((tState.m3Rpm * 2 * Math.PI) / 60.0) * dt; // CCW
      }
      if (propGroups['m4'] && tState.m4Rpm > 0) {
        propGroups['m4'].rotation.y -= ((tState.m4Rpm * 2 * Math.PI) / 60.0) * dt; // CCW
      }

      // Blink APM LED if telemetry is connected
      if (tState.isConnected && tState.heartbeat) {
        ledMat.color.setHex((Math.floor(now * 4) % 2 === 0) ? 0x10b981 : 0x0284c7);
      } else {
        ledMat.color.setHex(0xef4444);
      }

      // Live 3D Attitude Synchronization from Telemetry (Roll / Pitch / Yaw)
      if (tState.hasRealAttitude) {
        // Convert APM roll/pitch/yaw (degrees) to Three.js coordinates
        const targetPitch = (tState.pitchDeg * Math.PI) / 180.0;
        const targetRoll = (tState.rollDeg * Math.PI) / 180.0;
        const targetYaw = (tState.yawDeg * Math.PI) / 180.0;

        // Smoothly interpolate current rotation towards target
        droneGroup.rotation.x += (targetPitch - droneGroup.rotation.x) * Math.min(1.0, dt * 10.0);
        droneGroup.rotation.z += (-targetRoll - droneGroup.rotation.z) * Math.min(1.0, dt * 10.0);
        droneGroup.rotation.y += (-targetYaw - droneGroup.rotation.y) * Math.min(1.0, dt * 6.0);
      } else if (tState.isConnected) {
        // Physical testbed resting on bench: maintain true level attitude without synthetic oscillation
        droneGroup.rotation.x += (0 - droneGroup.rotation.x) * Math.min(1.0, dt * 10.0);
        droneGroup.rotation.z += (0 - droneGroup.rotation.z) * Math.min(1.0, dt * 10.0);
        droneGroup.rotation.y += (0 - droneGroup.rotation.y) * Math.min(1.0, dt * 6.0);
      } else {
        // Subtle gentle hover roll/pitch oscillation for digital twin standby only
        droneGroup.rotation.y = Math.sin(now * 0.2) * 0.15;
        droneGroup.rotation.z = Math.sin(now * 0.4) * 0.015;
        droneGroup.rotation.x = Math.cos(now * 0.3) * 0.01;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [theme]);

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 0, 0);
    }
  };

  const tel = systemState?.telemetry;
  const isConn = tel?.connection_status === 'CONNECTED' || tel?.source_type === 'SIMULATION';
  const flightMode = tel?.flight_mode || 'STABILIZE';
  const isArmed = !!tel?.is_armed;
  const renderMotorHudCard = (motorKey: string, label: string) => {
    const motor = tel?.motors?.[motorKey];
    const isMotorConnected = motor ? (motor.is_connected !== false && motor.connection_status !== 'DISCONNECTED') : false;
    const rpm = isMotorConnected ? Math.round(motor?.live_rpm ?? 0) : 0;
    const curr = isMotorConnected && motor?.current_a != null ? motor.current_a.toFixed(2) : '0.00';
    const thrustG = isMotorConnected ? Math.round(motor?.thrust_g ?? 0) : 0;
    const temp = isMotorConnected && motor?.temperature_c != null ? `${motor.temperature_c.toFixed(0)}°C` : null;

    return (
      <div
        key={motorKey}
        className={`p-2 rounded-lg border backdrop-blur-md transition-all ${
          isMotorConnected
            ? 'bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-sm'
            : 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-400/40 text-rose-600 dark:text-rose-400'
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-bold truncate text-[10px]">{label}</span>
          <span
            className={`px-1 py-0.2 rounded text-[8px] font-bold ${
              !isMotorConnected
                ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                : rpm > 50
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
            }`}
          >
            {!isMotorConnected ? '✕ NOT CONNECTED' : rpm > 50 ? '● RUNNING' : '○ IDLE'}
          </span>
        </div>
        <div className="flex items-baseline justify-between font-mono">
          <span className="text-xs font-bold">
            {isMotorConnected ? (rpm > 0 ? `${rpm.toLocaleString()} RPM` : '0 RPM (IDLE)') : '0 RPM (OFFLINE)'}
          </span>
          {isMotorConnected ? (
            <span className="text-[10px] text-slate-500">
              {curr}A {thrustG > 0 ? `• ${thrustG}g` : ''} {temp ? `• ${temp}` : ''}
            </span>
          ) : (
            <span className="text-[9px] text-rose-500 font-sans">Hardware Unplugged</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="aerospace-card p-5 relative overflow-hidden flex flex-col h-[540px] min-h-[500px] select-none">
      {/* Header — minimal */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Cpu className="w-4 h-4" /></div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text)' }}>3D Digital Twin</span>
              <span className="text-[10px] font-bold tracking-wide px-2 py-1 rounded-full border h-5 inline-flex items-center" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}>F450 CAD</span>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full border h-5 inline-flex items-center hidden sm:inline-flex" style={{ background: 'rgba(2,132,199,0.08)', color: 'var(--accent)', borderColor: 'rgba(2,132,199,0.18)' }}>{flightMode}</span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full border h-5 inline-flex items-center" style={{ background: isArmed ? 'var(--critical-bg)' : 'var(--success-bg)', color: isArmed ? 'var(--critical)' : 'var(--success)', borderColor: isArmed ? 'var(--critical-border)' : 'var(--success-border)' }}>{isArmed ? 'ARMED' : 'DISARMED'}</span>
            </div>
            <p className="text-[11px] mt-0.5 hidden sm:block" style={{ color: 'var(--text-faint)' }}>450 mm • 30 components • Live ArduPilot sync</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}><Move className="w-3 h-3" style={{ color: 'var(--accent)' }} /> Drag to rotate</span>
          <button onClick={handleResetView} className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border hover:opacity-80 transition-colors" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}><RotateCcw className="w-3 h-3" /> Reset</button>
        </div>
      </div>

      <div ref={containerRef} className="w-full flex-1 rounded-xl overflow-hidden border relative cursor-grab active:cursor-grabbing" style={{ background: 'color-mix(in srgb, var(--bg) 70%, var(--card))', borderColor: 'var(--border)' }} />

      {/* Floating Channel RPM HUD overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono select-none pointer-events-none">
        {renderMotorHudCard('motor_1', 'M1 - FRONT RIGHT (CW)')}
        {renderMotorHudCard('motor_2', 'M2 - REAR LEFT (CW)')}
        {renderMotorHudCard('motor_3', 'M3 - FRONT LEFT (CCW)')}
        {renderMotorHudCard('motor_4', 'M4 - REAR RIGHT (CCW)')}
      </div>
    </div>
  );
};
