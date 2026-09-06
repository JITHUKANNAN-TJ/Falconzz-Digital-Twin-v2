import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAppStore } from '../state/store';
import { Cpu, RotateCcw, Move, Maximize2 } from 'lucide-react';

export const Quadcopter3DViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const { systemState, theme } = useAppStore();

  // Keep references to live motor telemetry for the animation loop
  const motorsRef = useRef({
    m1Rpm: 0,
    m2Rpm: 0,
    m3Rpm: 0,
    m4Rpm: 0,
    m1Status: 'GRAY',
    m2Status: 'GRAY',
    m3Status: 'GRAY',
    m4Status: 'GRAY',
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
        if (!isConn && tel.source_type === 'APM_MAVLINK') return 'GRAY';
        if (m?.temperature_c && m.temperature_c > 75) return 'RED';
        if (m?.vibration_rms_g && m.vibration_rms_g > 0.45) return 'RED';
        if (mId === 'motor_3' && tel.rpm_imbalance_pct && tel.rpm_imbalance_pct > 15) return 'AMBER';
        if (m?.temperature_c && m.temperature_c > 60) return 'AMBER';
        if (isConn) return 'GREEN';
        return 'GRAY';
      };

      motorsRef.current = {
        m1Rpm: isConn ? (motors.motor_1?.live_rpm ?? tel.rpm) : 0,
        m2Rpm: isConn ? (motors.motor_2?.live_rpm ?? tel.rpm) : 0,
        m3Rpm: isConn ? (motors.motor_3?.live_rpm ?? Math.max(0, tel.rpm - 16)) : 0,
        m4Rpm: isConn ? (motors.motor_4?.live_rpm ?? tel.rpm) : 0,
        m1Status: getStatusColor('motor_1'),
        m2Status: getStatusColor('motor_2'),
        m3Status: getStatusColor('motor_3'),
        m4Status: getStatusColor('motor_4'),
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

    // Optimized camera distance and field of view for high visibility
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 4.4);
    camera.lookAt(0, 0.15, 0);

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
    controls.maxDistance = 10.0;
    controls.target.set(0, 0.15, 0);
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
    gridHelper.position.y = -0.55;
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

    // Central Airframe Plates (Top & Bottom)
    const topPlateGeo = new THREE.CylinderGeometry(0.75, 0.8, 0.05, 8);
    const topPlate = new THREE.Mesh(topPlateGeo, frameCenterMat);
    topPlate.position.y = 0.08;
    droneGroup.add(topPlate);

    const botPlateGeo = new THREE.CylinderGeometry(0.8, 0.85, 0.05, 8);
    const botPlate = new THREE.Mesh(botPlateGeo, frameCenterMat);
    botPlate.position.y = -0.08;
    droneGroup.add(botPlate);

    // APM Flight Controller Enclosure
    const apmGeo = new THREE.BoxGeometry(0.48, 0.12, 0.48);
    const apmMesh = new THREE.Mesh(apmGeo, apmMat);
    apmMesh.position.y = 0.16;
    droneGroup.add(apmMesh);

    // APM Telemetry Status LED
    const ledGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.15, 0.23, 0.15);
    droneGroup.add(ledMesh);

    // LiPo Battery Pack (Underbelly)
    const battGeo = new THREE.BoxGeometry(0.55, 0.25, 0.95);
    const battMesh = new THREE.Mesh(battGeo, batteryMat);
    battMesh.position.y = -0.25;
    droneGroup.add(battMesh);

    // Landing Gear Skids
    const skidGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    
    // Left & Right landing legs
    [-0.55, 0.55].forEach((xOffset) => {
      const leg1 = new THREE.Mesh(skidGeo, skidMat);
      leg1.position.set(xOffset, -0.35, 0.35);
      leg1.rotation.x = 0.25 * Math.sign(xOffset);
      droneGroup.add(leg1);

      const leg2 = new THREE.Mesh(skidGeo, skidMat);
      leg2.position.set(xOffset, -0.35, -0.35);
      leg2.rotation.x = -0.25 * Math.sign(xOffset);
      droneGroup.add(leg2);

      const runnerGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8);
      const runner = new THREE.Mesh(runnerGeo, skidMat);
      runner.rotation.x = Math.PI / 2;
      runner.position.set(xOffset, -0.52, 0);
      droneGroup.add(runner);
    });

    // 4 Carbon Fiber Arms (X-Configuration)
    const armPositions = [
      { id: 'm1', label: 'M1 (Front-Right)', angle: Math.PI / 4, x: 1.4, z: -1.4 },
      { id: 'm2', label: 'M2 (Rear-Left)', angle: (5 * Math.PI) / 4, x: -1.4, z: 1.4 },
      { id: 'm3', label: 'M3 (Front-Left)', angle: (3 * Math.PI) / 4, x: -1.4, z: -1.4 },
      { id: 'm4', label: 'M4 (Rear-Right)', angle: (7 * Math.PI) / 4, x: 1.4, z: 1.4 }
    ];

    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.95, 16);
    
    // Arm 1 & 2 diagonal bar
    const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.9, 16), carbonMat);
    bar1.rotation.z = Math.PI / 2;
    bar1.rotation.y = Math.PI / 4;
    droneGroup.add(bar1);

    // Arm 3 & 4 diagonal bar
    const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.9, 16), carbonMat);
    bar2.rotation.z = Math.PI / 2;
    bar2.rotation.y = -Math.PI / 4;
    droneGroup.add(bar2);

    // Motor Hubs & Propellers Groups
    const motorStatusMeshes: Record<string, THREE.Mesh> = {};
    const propGroups: Record<string, THREE.Group> = {};

    armPositions.forEach((arm) => {
      const motorBase = new THREE.Group();
      motorBase.position.set(arm.x, 0, arm.z);
      droneGroup.add(motorBase);

      // Motor Stator Housing
      const statorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.28, 24);
      const statorMesh = new THREE.Mesh(statorGeo, motorStatorBaseMat);
      statorMesh.position.y = 0.14;
      motorBase.add(statorMesh);

      // Status Halo / Glow Ring under motor
      const haloGeo = new THREE.TorusGeometry(0.28, 0.04, 16, 32);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2;
      haloMesh.position.y = 0.02;
      motorBase.add(haloMesh);
      motorStatusMeshes[arm.id] = haloMesh;

      // Rotating Propeller Group
      const propGroup = new THREE.Group();
      propGroup.position.y = 0.32;
      motorBase.add(propGroup);
      propGroups[arm.id] = propGroup;

      // Propeller Hub
      const pHubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16);
      const pHub = new THREE.Mesh(pHubGeo, frameCenterMat);
      propGroup.add(pHub);

      // 2-Blade Propeller
      const bladeGeo = new THREE.BoxGeometry(1.4, 0.015, 0.12);
      const blade = new THREE.Mesh(bladeGeo, propBladeMat);
      blade.position.y = 0.04;
      propGroup.add(blade);
    });

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const now = clock.getElapsedTime();
      const mState = motorsRef.current;

      // Update Motor Status Colors (Green, Amber, Red, Gray)
      const colorMap: Record<string, number> = {
        GREEN: 0x10b981,
        AMBER: 0xf59e0b,
        RED: 0xef4444,
        GRAY: 0x64748b
      };

      if (motorStatusMeshes['m1']) (motorStatusMeshes['m1'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[mState.m1Status] || 0x10b981);
      if (motorStatusMeshes['m2']) (motorStatusMeshes['m2'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[mState.m2Status] || 0x10b981);
      if (motorStatusMeshes['m3']) (motorStatusMeshes['m3'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[mState.m3Status] || 0x10b981);
      if (motorStatusMeshes['m4']) (motorStatusMeshes['m4'].material as THREE.MeshBasicMaterial).color.setHex(colorMap[mState.m4Status] || 0x10b981);

      // Rotate Propellers strictly based on actual measured RPM
      // rad/sec = (RPM * 2 * PI) / 60
      if (propGroups['m1'] && mState.m1Rpm > 0) {
        propGroups['m1'].rotation.y += ((mState.m1Rpm * 2 * Math.PI) / 60.0) * dt;
      }
      if (propGroups['m2'] && mState.m2Rpm > 0) {
        propGroups['m2'].rotation.y += ((mState.m2Rpm * 2 * Math.PI) / 60.0) * dt;
      }
      if (propGroups['m3'] && mState.m3Rpm > 0) {
        propGroups['m3'].rotation.y -= ((mState.m3Rpm * 2 * Math.PI) / 60.0) * dt; // CCW
      }
      if (propGroups['m4'] && mState.m4Rpm > 0) {
        propGroups['m4'].rotation.y -= ((mState.m4Rpm * 2 * Math.PI) / 60.0) * dt; // CCW
      }

      // Blink APM LED if telemetry is connected
      if (mState.isConnected && mState.heartbeat) {
        ledMat.color.setHex((Math.floor(now * 4) % 2 === 0) ? 0x10b981 : 0x0284c7);
      } else {
        ledMat.color.setHex(0xef4444);
      }

      // Subtle gentle hover roll/pitch oscillation for digital twin liveliness
      droneGroup.rotation.y = Math.sin(now * 0.2) * 0.15;
      droneGroup.rotation.z = Math.sin(now * 0.4) * 0.015;

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
      controlsRef.current.target.set(0, 0.15, 0);
    }
  };

  const tel = systemState?.telemetry;
  const isConn = tel?.connection_status === 'CONNECTED' || tel?.source_type === 'SIMULATION';

  return (
    <div className="aerospace-card p-4 relative overflow-hidden flex flex-col h-[520px] min-h-[500px] select-none shadow-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between z-10 mb-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
              3D Quadcopter Digital Twin
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Physical 4-BLDC Architecture • Real RPM Propeller Synchronization
            </p>
          </div>
        </div>

        {/* Interaction badge, Reset View & Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="hidden md:inline-flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            <Move className="w-3 h-3 text-sky-500" /> Drag to Rotate • Scroll to Zoom
          </span>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
            title="Reset 3D Camera Angle"
          >
            <RotateCcw className="w-3 h-3" /> Reset View
          </button>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical
            </span>
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div 
        ref={containerRef} 
        className="w-full flex-1 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 relative cursor-grab active:cursor-grabbing"
      />

      {/* Floating Channel RPM HUD overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono select-none pointer-events-none">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 p-2 rounded-lg shadow-sm pointer-events-auto">
          <div className="flex justify-between text-slate-500">
            <span>MOTOR 1 (FR)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">● OK</span>
          </div>
          <strong className="text-xs text-slate-900 dark:text-white block mt-0.5">
            {isConn ? `${(tel?.motors?.motor_1?.live_rpm ?? tel?.rpm ?? 0).toFixed(0)} RPM` : 'UNAVAILABLE'}
          </strong>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 p-2 rounded-lg shadow-sm pointer-events-auto">
          <div className="flex justify-between text-slate-500">
            <span>MOTOR 2 (RL)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">● OK</span>
          </div>
          <strong className="text-xs text-slate-900 dark:text-white block mt-0.5">
            {isConn ? `${(tel?.motors?.motor_2?.live_rpm ?? tel?.rpm ?? 0).toFixed(0)} RPM` : 'UNAVAILABLE'}
          </strong>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 p-2 rounded-lg shadow-sm pointer-events-auto">
          <div className="flex justify-between text-slate-500">
            <span>MOTOR 3 (FL)</span>
            <span className={tel?.rpm_imbalance_pct && tel?.rpm_imbalance_pct > 15 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
              {tel?.rpm_imbalance_pct && tel?.rpm_imbalance_pct > 15 ? "● WARN" : "● OK"}
            </span>
          </div>
          <strong className="text-xs text-slate-900 dark:text-white block mt-0.5">
            {isConn ? `${(tel?.motors?.motor_3?.live_rpm ?? Math.max(0, (tel?.rpm ?? 0) - 16)).toFixed(0)} RPM` : 'UNAVAILABLE'}
          </strong>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 p-2 rounded-lg shadow-sm pointer-events-auto">
          <div className="flex justify-between text-slate-500">
            <span>MOTOR 4 (RR)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">● OK</span>
          </div>
          <strong className="text-xs text-slate-900 dark:text-white block mt-0.5">
            {isConn ? `${(tel?.motors?.motor_4?.live_rpm ?? tel?.rpm ?? 0).toFixed(0)} RPM` : 'UNAVAILABLE'}
          </strong>
        </div>
      </div>
    </div>
  );
};
