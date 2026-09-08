import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';

export const Propulsion3DViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { systemState } = useAppStore();

  const rpmRef = useRef<number>(0);
  const tempRef = useRef<number>(25);
  const vibRef = useRef<number>(0.05);

  useEffect(() => {
    if (systemState) {
      rpmRef.current = systemState.telemetry.rpm;
      tempRef.current = systemState.telemetry.temperature_c;
      vibRef.current = systemState.telemetry.vibration_rms_g;
    }
  }, [systemState]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 260;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // slate-50

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.5);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x0ea5e9, 1.2, 10);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // Assembly Group
    const assemblyGroup = new THREE.Group();
    scene.add(assemblyGroup);

    // Testbed Mount Base
    const baseGeo = new THREE.BoxGeometry(3.2, 0.25, 2.0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.125;
    assemblyGroup.add(baseMesh);

    // Motor Stator (Fixed Housing)
    const statorGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.9, 32);
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // sky-600
      roughness: 0.3,
      metalness: 0.7
    });
    const statorMesh = new THREE.Mesh(statorGeo, statorMat);
    statorMesh.position.y = 0.55;
    assemblyGroup.add(statorMesh);

    // Stator Windings (Copper ring)
    const windingGeo = new THREE.TorusGeometry(0.7, 0.12, 16, 32);
    const windingMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5, metalness: 0.8 });
    const windingMesh = new THREE.Mesh(windingGeo, windingMat);
    windingMesh.rotation.x = Math.PI / 2;
    windingMesh.position.y = 0.55;
    assemblyGroup.add(windingMesh);

    // Rotating Rotor & Propeller Group
    const rotorGroup = new THREE.Group();
    rotorGroup.position.y = 1.05;
    assemblyGroup.add(rotorGroup);

    // Rotor Bell
    const bellGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.3, 32);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.9 });
    const bellMesh = new THREE.Mesh(bellGeo, bellMat);
    rotorGroup.add(bellMesh);

    // Motor Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.position.y = 0.35;
    rotorGroup.add(shaftMesh);

    // Propeller Hub
    const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.position.y = 0.5;
    rotorGroup.add(hubMesh);

    // Propeller Blades (2-Blade Carbon Aero Prop)
    const bladeGeo = new THREE.BoxGeometry(3.6, 0.04, 0.28);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.4 });
    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeMesh.position.y = 0.5;
    rotorGroup.add(bladeMesh);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(8, 16, 0x0284c7, 0xe2e8f0);
    gridHelper.position.y = -0.25;
    scene.add(gridHelper);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const currentRPM = rpmRef.current;
      const currentTemp = tempRef.current;
      const currentVib = vibRef.current;

      // 1. Rotor Rotation
      const radPerSec = (currentRPM * 2 * Math.PI) / 60.0;
      rotorGroup.rotation.y += radPerSec * dt;

      // 2. Thermal Color Dynamic Shift
      // Interpolate stator color: Blue (25C) -> Amber (60C) -> Red (85C+)
      const tempNorm = Math.max(0, Math.min(1, (currentTemp - 25) / 60));
      if (tempNorm < 0.5) {
        statorMat.color.setRGB(
          0.05 + tempNorm * 1.5,
          0.52 + tempNorm * 0.4,
          0.78 - tempNorm * 0.8
        );
      } else {
        statorMat.color.setRGB(
          0.8 + (tempNorm - 0.5) * 0.4,
          0.72 - (tempNorm - 0.5) * 1.2,
          0.2 - (tempNorm - 0.5) * 0.3
        );
      }

      // 3. Vibration Oscillation displacement
      const vibDisplacement = Math.sin(clock.getElapsedTime() * 45) * (currentVib * 0.018);
      assemblyGroup.position.x = vibDisplacement;
      assemblyGroup.position.z = Math.cos(clock.getElapsedTime() * 45) * (currentVib * 0.018);

      // Subtle scene orbit
      scene.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.15;

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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="aerospace-card p-4 relative overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between z-10 mb-2">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            3D Propulsion Twin Representation
          </h3>
          <p className="text-[11px] text-slate-400">
            Real-time RPM rotation, thermal color-shift & vibration oscillation
          </p>
        </div>
        <StatusBadge type="VALIDATED" />
      </div>

      <div ref={containerRef} className="w-full flex-1 rounded-lg overflow-hidden bg-slate-50/50" />

      {/* Floating Diagnostics overlay */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-xs border border-slate-200/90 rounded-md px-2.5 py-1.5 text-[11px] font-mono text-slate-600 shadow-xs flex gap-3">
        <span>RPM: <strong className="text-slate-900">{(systemState?.telemetry?.rpm ?? 0).toFixed(0)}</strong></span>
        <span>TEMP: <strong className="text-slate-900">{(systemState?.telemetry?.temperature_c ?? 25).toFixed(1)}°C</strong></span>
        <span>VIB: <strong className="text-slate-900">{(systemState?.telemetry?.vibration_rms_g ?? 0.05).toFixed(2)}g</strong></span>
      </div>
    </div>
  );
};
