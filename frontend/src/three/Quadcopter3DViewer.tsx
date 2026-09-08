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
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x0a0a0a : 0xffffff);

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

    // 3. Grid Helper — monochrome
    const gridHelper = new THREE.GridHelper(10, 20, isDark ? 0x404040 : 0xd4d4d4, isDark ? 0x262626 : 0xe5e5e5);
    gridHelper.position.y = -0.28;
    scene.add(gridHelper);

    // 4. Drone Master Group
    const droneGroup = new THREE.Group();
    scene.add(droneGroup);

    const carbonMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x262626 : 0x404040, roughness: 0.3, metalness: 0.6 });
    const frameCenterMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x171717 : 0x262626, roughness: 0.2, metalness: 0.8 });
    const motorStatorBaseMat = new THREE.MeshStandardMaterial({ color: 0x525252, roughness: 0.4, metalness: 0.6 });
    const propBladeMat = new THREE.MeshStandardMaterial({ color: isDark ? 0xfafafa : 0x0a0a0a, roughness: 0.2, metalness: 0.2 });
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0x737373, roughness: 0.5 });
    const apmMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x404040 : 0x262626, roughness: 0.3, metalness: 0.5 });

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

    const ledGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xa3a3a3 });
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

      const haloGeo = new THREE.TorusGeometry(0.23, 0.035, 16, 32);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x737373 });
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

      const colorMap: Record<string, number> = {
        GREEN: 0x0a0a0a,
        AMBER: 0x737373,
        RED: 0x171717,
        GRAY: 0xa3a3a3,
        DISCONNECTED: 0xd4d4d4
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

      if (tState.isConnected && tState.heartbeat) {
        ledMat.color.setHex((Math.floor(now * 4) % 2 === 0) ? 0x0a0a0a : 0x737373);
      } else {
        ledMat.color.setHex(0xd4d4d4);
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
    return (
      <div key={motorKey} className="p-2 rounded-md border bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-medium truncate text-[10px] tracking-wide" style={{ color: 'var(--text)' }}>{label}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] border" style={{ background: isMotorConnected ? (rpm>50 ? 'var(--text)' : 'var(--card)') : 'var(--card)', color: isMotorConnected ? (rpm>50 ? 'var(--bg)' : 'var(--text-muted)') : 'var(--text-faint)', borderColor: 'var(--border)' }}>{!isMotorConnected ? 'Offline' : rpm>50 ? 'Run' : 'Idle'}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text)' }}>{isMotorConnected ? (rpm>0 ? `${rpm.toLocaleString()} RPM` : '0 RPM') : '—'}</span>
          {isMotorConnected && <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{curr}A {thrustG>0 ? `• ${thrustG}g` : ''}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="aerospace-card p-5 relative overflow-hidden flex flex-col h-[480px] min-h-[460px] select-none">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md border flex items-center justify-center" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}><Cpu className="w-3.5 h-3.5" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>3D Model</span>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{flightMode}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ background: isArmed ? 'var(--text)' : 'var(--card)', color: isArmed ? 'var(--bg)' : 'var(--text-muted)', borderColor: isArmed ? 'var(--text)' : 'var(--border)' }}>{isArmed ? 'Armed' : 'Disarmed'}</span>
            </div>
            <div className="text-[11px] hidden sm:block" style={{ color: 'var(--text-faint)' }}>Drag to rotate • Scroll to zoom</div>
          </div>
        </div>
        <button onClick={handleResetView} className="text-xs px-3 py-1.5 rounded-full border hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Reset</button>
      </div>

      <div ref={containerRef} className="w-full flex-1 rounded-lg overflow-hidden border relative cursor-grab active:cursor-grabbing" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />

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
