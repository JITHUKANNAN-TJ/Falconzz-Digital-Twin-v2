import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAppStore } from '../state/store';
import { Cpu, RotateCcw } from 'lucide-react';

export const Quadcopter3DViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const { systemState, theme } = useAppStore();

  const telemetryRef = useRef({
    m1Rpm: 0, m2Rpm: 0, m3Rpm: 0, m4Rpm: 0,
    m1Status: 'GRAY', m2Status: 'GRAY', m3Status: 'GRAY', m4Status: 'GRAY',
    rollDeg: 0, pitchDeg: 0, yawDeg: 0,
    hasRealAttitude: false,
    flightMode: 'STABILIZE', isArmed: false, heartbeat: false, isConnected: false,
    vib: 0.05, temp: 25
  });

  useEffect(() => {
    if (!systemState) return;
    const tel = systemState.telemetry;
    const motors = tel.motors || {};
    const isConn = tel.connection_status === 'CONNECTED' || tel.source_type === 'SIMULATION';
    const hb = !!tel.heartbeat_received;
    const getStatus = (mId: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4') => {
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
    // For realistic demo, treat any connected state as having attitude if SIM provides it, else hardware
    const hasAttitude = isConn && tel.roll_deg !== undefined && tel.pitch_deg !== undefined;
    const getRpm = (mId: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4') => {
      const m = motors[mId];
      if (!isConn) return 0;
      if (!m || m.is_connected === false || m.connection_status === 'DISCONNECTED') return 0;
      return m.live_rpm ?? 0;
    };
    telemetryRef.current = {
      m1Rpm: getRpm('motor_1'), m2Rpm: getRpm('motor_2'), m3Rpm: getRpm('motor_3'), m4Rpm: getRpm('motor_4'),
      m1Status: getStatus('motor_1'), m2Status: getStatus('motor_2'), m3Status: getStatus('motor_3'), m4Status: getStatus('motor_4'),
      rollDeg: tel.roll_deg || 0, pitchDeg: tel.pitch_deg || 0, yawDeg: tel.yaw_deg || 0,
      hasRealAttitude: !!hasAttitude, flightMode: tel.flight_mode || 'STABILIZE', isArmed: !!tel.is_armed,
      heartbeat: hb, isConnected: isConn, vib: tel.vibration_rms_g ?? 0.05, temp: tel.temperature_c ?? 25
    };
  }, [systemState]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    const isDark = theme === 'dark';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x0a0a0a : 0xf8fafc);
    scene.fog = new THREE.Fog(isDark ? 0x0a0a0a : 0xf8fafc, 8, 18);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 2.9, 4.2);
    camera.lookAt(0, 0.05, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.05 : 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 9;
    controls.target.set(0, 0.05, 0);
    controlsRef.current = controls;

    // ——— Lights: realistic studio ———
    const ambient = new THREE.AmbientLight(0xffffff, isDark ? 0.55 : 0.75);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xffffff, isDark ? 0x222222 : 0x444444, isDark ? 0.5 : 0.7);
    hemi.position.set(0, 8, 0);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.1 : 1.35);
    keyLight.position.set(5, 9, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -6; keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6; keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(isDark ? 0x8ab4f8 : 0xfff4e0, isDark ? 0.35 : 0.5);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(isDark ? 0x8ab4f8 : 0xffffff, 0.6, 12);
    rimLight.position.set(0, 2.5, 0);
    scene.add(rimLight);

    // Ground + shadow catcher
    const groundGeo = new THREE.PlaneGeometry(14, 14);
    const groundMat = new THREE.ShadowMaterial({ opacity: isDark ? 0.18 : 0.12 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.32;
    ground.receiveShadow = true;
    scene.add(ground);
    const gridHelper = new THREE.GridHelper(10, 20, isDark ? 0x333333 : 0xd4d4d4, isDark ? 0x1a1a1a : 0xeeeeee);
    gridHelper.position.y = -0.315;
    scene.add(gridHelper);

    const droneGroup = new THREE.Group();
    scene.add(droneGroup);

    // ——— Realistic PBR materials ———
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1e242e, roughness: 0.55, metalness: 0.15 });
    const centerPlateMat = new THREE.MeshStandardMaterial({ color: 0x0f1419, roughness: 0.35, metalness: 0.4 });
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1e242e, roughness: 0.5, metalness: 0.12 });
    const motorBellMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.28, metalness: 0.75 });
    const motorBaseMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.35, metalness: 0.85 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.6, emissive: 0x7c2d12, emissiveIntensity: isDark ? 0.06 : 0 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.45, metalness: 0.05 });
    const propHubMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.6 });
    const escMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6, metalness: 0.1 });
    const escLabelMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.5, metalness: 0.1 });
    const batteryLabelMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
    const apmBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.35, metalness: 0.25 });
    const apmPortMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.9 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.6, metalness: 0.05 });
    const footMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const gpsMastMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.4, metalness: 0.6 });
    const gpsPuckMat = new THREE.MeshStandardMaterial({ color: 0xf9fafb, roughness: 0.3, metalness: 0.05 });
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });

    // ——— Try load detailed F450 GLB, fallback to procedural frame ———
    let glbLoaded = false;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/models/f450_frame.glb', (gltf) => {
      glbLoaded = true;
      const cad = gltf.scene;
      cad.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true; m.receiveShadow = true;
          // Enhance carbon look: darken and add slight metalness
          if (m.material && (m.material as any).color) {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat.color.getHex() === 0xffffff || mat.color.getHex() === 0xfafafa) {
              mat.color.setHex(0x1e242e);
              mat.roughness = 0.55; mat.metalness = 0.12;
            }
          }
        }
      });
      // slight scale normalize and center
      const box = new THREE.Box3().setFromObject(cad);
      const center = box.getCenter(new THREE.Vector3());
      cad.position.sub(center);
      cad.position.y += 0.05;
      droneGroup.add(cad);
    }, undefined, () => { glbLoaded = false; });

    // ——— Procedural fallback frame (always present underneath, GLB sits on top; if GLB fails, this is visible) ———
    if (true) {
      const plateTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.62), centerPlateMat);
      plateTop.position.y = 0.06; plateTop.castShadow = true; plateTop.receiveShadow = true; droneGroup.add(plateTop);
      const plateBottom = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.62), centerPlateMat);
      plateBottom.position.y = -0.06; plateBottom.castShadow = true; droneGroup.add(plateBottom);
      // Arms — 4 rectangular + circular tube
      const armPositions = [
        { x: 0.62, z: -0.62 }, { x: -0.62, z: 0.62 }, { x: -0.62, z: -0.62 }, { x: 0.62, z: 0.62 }
      ];
      armPositions.forEach((p) => {
        const len = Math.sqrt(p.x*p.x + p.z*p.z);
        const ang = Math.atan2(p.z, p.x);
        const armGeo = new THREE.BoxGeometry(len + 0.18, 0.02, 0.045);
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(p.x*0.48, 0, p.z*0.48);
        arm.rotation.y = -ang;
        arm.castShadow = true; arm.receiveShadow = true;
        droneGroup.add(arm);
        // ESC under arm
        const esc = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.042), escMat);
        esc.position.set(p.x*0.32, -0.02, p.z*0.32);
        esc.rotation.y = -ang;
        esc.castShadow = true; droneGroup.add(esc);
        const escLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.014), escLabelMat);
        escLabel.position.set(p.x*0.32, -0.013, p.z*0.32);
        escLabel.rotation.x = -Math.PI/2; escLabel.rotation.z = -ang;
        droneGroup.add(escLabel);
        // Wiring along arm
        const wireCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.05*Math.sign(p.x), -0.04, 0.05*Math.sign(p.z)),
          new THREE.Vector3(p.x*0.25, -0.04, p.z*0.25),
          new THREE.Vector3(p.x*0.55, -0.02, p.z*0.55)
        ]);
        const wireGeo = new THREE.TubeGeometry(wireCurve, 8, 0.004, 6, false);
        const wireMat = new THREE.MeshStandardMaterial({ color: p.x > 0 ? 0xef4444 : 0x111827, roughness: 0.8 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        droneGroup.add(wire);
      });
      // Center screws
      for (let i = 0; i < 4; i++) {
        const sx = (i % 2 === 0 ? 0.24 : -0.24);
        const sz = (i < 2 ? 0.24 : -0.24);
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 8), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.9, roughness: 0.2 }));
        screw.position.set(sx, 0.075, sz); droneGroup.add(screw);
      }
      // PDB circular
      const pdb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.006, 24), new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 }));
      pdb.position.y = 0.01; droneGroup.add(pdb);
    }

    // ——— Landing gear — realistic X skid ———
    const skidY = -0.28;
    const skidLegs = [
      { x: 0.22, z: 0.22, hx: 0.22, hz: 0.05 }, { x: -0.22, z: 0.22, hx: -0.22, hz: 0.05 },
      { x: 0.22, z: -0.22, hx: 0.22, hz: -0.05 }, { x: -0.22, z: -0.22, hx: -0.22, hz: -0.05 }
    ];
    skidLegs.forEach(p => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8), legMat);
      leg.position.set(p.x, -0.16, p.z);
      leg.castShadow = true; droneGroup.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 12), footMat);
      foot.position.set(p.x, skidY + 0.003, p.z); droneGroup.add(foot);
    });
    // Skids horizontal
    const skidBarGeo = new THREE.BoxGeometry(0.58, 0.012, 0.012);
    const skidBar1 = new THREE.Mesh(skidBarGeo, legMat); skidBar1.position.set(0, skidY, 0.22); droneGroup.add(skidBar1);
    const skidBar2 = new THREE.Mesh(skidBarGeo, legMat); skidBar2.position.set(0, skidY, -0.22); droneGroup.add(skidBar2);

    // ——— APM stack ———
    const apm = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.075, 0.44), apmBodyMat);
    apm.position.y = 0.115; apm.castShadow = true; apm.receiveShadow = true; droneGroup.add(apm);
    const apmTopLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    apmTopLabel.rotation.x = -Math.PI/2; apmTopLabel.position.set(0, 0.153, 0); droneGroup.add(apmTopLabel);
    // Ports
    const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.012), apmPortMat);
    usbPort.position.set(0.18, 0.115, 0.22); droneGroup.add(usbPort);
    const telemPort = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.01), apmPortMat);
    telemPort.position.set(-0.18, 0.115, 0.22); droneGroup.add(telemPort);
    // LED
    const ledGeo = new THREE.SphereGeometry(0.018, 12, 12);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.14, 0.158, 0.14); droneGroup.add(led);
    const led2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.7 }));
    led2.position.set(0.14, 0.158, 0.10); droneGroup.add(led2);

    // ——— Battery ———
    const batt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.80), batteryMat);
    batt.position.y = -0.14; batt.castShadow = true; droneGroup.add(batt);
    const battStrap1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.012, 0.04), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }));
    battStrap1.position.set(0, -0.10, 0.18); droneGroup.add(battStrap1);
    const battStrap2 = battStrap1.clone(); battStrap2.position.set(0, -0.10, -0.18); droneGroup.add(battStrap2);
    const battLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.05), batteryLabelMat);
    battLabel.rotation.x = Math.PI/2; battLabel.position.set(0, -0.22, 0); // bottom
    droneGroup.add(battLabel);
    // XT60 connector + wires
    const xt60 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.018, 0.02), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }));
    xt60.position.set(0.23, -0.12, 0); droneGroup.add(xt60);
    const battWireCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.21, -0.12, 0), new THREE.Vector3(0.28, -0.09, 0), new THREE.Vector3(0.32, -0.04, 0)]);
    const battWire1 = new THREE.Mesh(new THREE.TubeGeometry(battWireCurve, 6, 0.005, 6, false), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    const battWire2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.21, -0.12, 0.012), new THREE.Vector3(0.28, -0.09, 0.012), new THREE.Vector3(0.32, -0.04, 0.012)]), 6, 0.005, 6, false), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    droneGroup.add(battWire1); droneGroup.add(battWire2);

    // ——— GPS mast ———
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), gpsMastMat);
    mast.position.set(-0.14, 0.22, -0.14); droneGroup.add(mast);
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.012, 16), gpsPuckMat);
    puck.position.set(-0.14, 0.33, -0.14); puck.castShadow = true; droneGroup.add(puck);
    // Antenna 915MHz
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.28, 6), antennaMat);
    ant.position.set(0.20, 0.18, -0.18); ant.rotation.z = 0.12; droneGroup.add(ant);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    antTip.position.set(0.22, 0.32, -0.18); droneGroup.add(antTip);

    // ——— Motors ———
    const armPositions = [
      { id: 'm1', x: 1.251, z: -1.284, cw: true }, { id: 'm2', x: -1.163, z: 1.343, cw: true },
      { id: 'm3', x: -1.296, z: -1.216, cw: false }, { id: 'm4', x: 1.278, z: 1.247, cw: false }
    ];
    const motorStatusMeshes: Record<string, THREE.Mesh> = {};
    const propGroups: Record<string, THREE.Group> = {};
    const blurDiscs: Record<string, THREE.Mesh> = {};

    armPositions.forEach((arm) => {
      const base = new THREE.Group();
      base.position.set(arm.x, 0.068, arm.z);
      droneGroup.add(base);

      // Motor mount
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7, roughness: 0.3 }));
      mount.position.y = 0.01; mount.castShadow = true; base.add(mount);

      // Stator base
      const stator = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.085, 24), motorBaseMat);
      stator.position.y = 0.055; stator.castShadow = true; base.add(stator);
      // Windings copper ring
      const winding = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.018, 10, 20), copperMat);
      winding.rotation.x = Math.PI/2; winding.position.y = 0.06; base.add(winding);
      // Bell
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.105, 0.075, 24), motorBellMat);
      bell.position.y = 0.125; bell.castShadow = true; base.add(bell);
      // Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.15 }));
      shaft.position.y = 0.175; base.add(shaft);
      // Prop adapter
      const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.5 }));
      adapter.position.y = 0.185; base.add(adapter);

      // Halo ring
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.009, 10, 28), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.0, transparent: true, opacity: 0.9 }));
      halo.rotation.x = Math.PI/2; halo.position.y = 0.008; base.add(halo);
      motorStatusMeshes[arm.id] = halo as any;

      // Prop group at shaft top
      const propGroup = new THREE.Group();
      propGroup.position.y = 0.195;
      base.add(propGroup);
      propGroups[arm.id] = propGroup;

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.014, 16), propHubMat);
      hub.castShadow = true; propGroup.add(hub);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.3 }));
      nut.position.y = 0.012; propGroup.add(nut);

      // Realistic 1045 prop — two blades with slight twist via two boxes + tip rounding
      const bladeShape: THREE.Mesh[] = [];
      [0, Math.PI].forEach((ang) => {
        const bladeGroup = new THREE.Group();
        bladeGroup.rotation.y = ang;
        // Main blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.008, 0.052), propMat);
        blade.position.set(0.29, 0.006, 0);
        blade.rotation.z = 0.18; // twist
        blade.rotation.y = 0.08;
        blade.castShadow = true;
        bladeGroup.add(blade);
        // Tip
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.014, 0.006, 8), propMat);
        tip.rotation.x = Math.PI/2; tip.rotation.z = 0.18;
        tip.position.set(0.57, 0.006, 0);
        bladeGroup.add(tip);
        propGroup.add(bladeGroup);
        bladeShape.push(blade);
      });

      // Blur disc — shown when rpm > 1200
      const blurGeo = new THREE.CircleGeometry(0.58, 32);
      const blurMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const blur = new THREE.Mesh(blurGeo, blurMat);
      blur.rotation.x = Math.PI/2; blur.position.y = 0.008;
      propGroup.add(blur);
      blurDiscs[arm.id] = blur;
    });

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const now = clock.getElapsedTime();
      const t = telemetryRef.current;

      const colorMap: Record<string, { color: number, emissive: number, intensity: number }> = {
        GREEN: { color: 0x22c55e, emissive: 0x22c55e, intensity: 1.0 },
        AMBER: { color: 0xf59e0b, emissive: 0xf59e0b, intensity: 0.9 },
        RED: { color: 0xef4444, emissive: 0xef4444, intensity: 1.0 },
        GRAY: { color: 0x6b7280, emissive: 0x6b7280, intensity: 0.0 },
        DISCONNECTED: { color: 0x4b5563, emissive: 0x000000, intensity: 0.0 }
      };
      (['m1','m2','m3','m4'] as const).forEach(k => {
        const mesh = motorStatusMeshes[k];
        const status = (t as any)[`${k}Status`] as string;
        const cfg = colorMap[status] ?? colorMap.GRAY;
        if (mesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(cfg.color);
          (mat as any).emissive.setHex(cfg.emissive);
          mat.emissiveIntensity = cfg.intensity * (0.7 + 0.3*Math.sin(now*3 + (k==='m1'?0: k==='m2'?1: k==='m3'?2:3)));
          mat.opacity = status==='DISCONNECTED' ? 0.25 : 0.95;
        }
      });

      // Props + blur
      const rpmMap: Record<string, number> = { m1: t.m1Rpm, m2: t.m2Rpm, m3: t.m3Rpm, m4: t.m4Rpm };
      (['m1','m2','m3','m4'] as const).forEach(k => {
        const rpm = rpmMap[k];
        const grp = propGroups[k];
        const blur = blurDiscs[k];
        if (!grp || !blur) return;
        const isCCW = k==='m3' || k==='m4';
        const dir = isCCW ? -1 : 1;
        if (rpm > 0) grp.rotation.y += dir * ((rpm * 2 * Math.PI)/60) * dt;
        const bMat = blur.material as THREE.MeshBasicMaterial;
        if (rpm > 1100) {
          const a = Math.min(0.18, (rpm-1100)/4000 * 0.18);
          bMat.opacity = a;
          // subtle spin for blur shimmer
          blur.rotation.z += dir * 0.5 * dt;
          // hide solid blades by scaling? keep visible under blur for realism — reduce opacity via material? keep
          grp.children.forEach((c:any, idx:number) => {
            if (c.geometry && c.geometry.type === 'BoxGeometry') c.material.transparent = true, c.material.opacity = Math.max(0.15, 1 - (rpm/6000));
          });
        } else {
          bMat.opacity = 0;
          grp.children.forEach((c:any) => {
            if (c.material) c.material.opacity = 1, c.material.transparent = false;
          });
        }
      });

      // LED
      if (t.isConnected && t.heartbeat) {
        const blink = Math.floor(now*3.5)%2===0;
        ledMat.color.setHex(blink ? 0x22c55e : 0x3b82f6);
        (ledMat as any).emissive.setHex(blink ? 0x22c55e : 0x3b82f6);
        (ledMat as any).emissiveIntensity = 0.9;
      } else {
        ledMat.color.setHex(0x6b7280);
        (ledMat as any).emissive.setHex(0x000000);
      }

      // Vibration micro-jitter on whole drone
      const vib = Math.min(0.025, t.vib * 0.04);
      droneGroup.position.y = Math.sin(now*38)*vib*0.5 + Math.sin(now*72)*vib*0.25;
      droneGroup.position.x = Math.sin(now*31)*vib*0.15;
      droneGroup.position.z = Math.cos(now*29)*vib*0.12;

      // Temperature tint: if hot, slight emissive on belly
      // (handled via batteryMat emissive? keep subtle)

      // Attitude
      if (t.hasRealAttitude) {
        const tp = (t.pitchDeg * Math.PI)/180, tr = (t.rollDeg * Math.PI)/180, ty = (t.yawDeg * Math.PI)/180;
        droneGroup.rotation.x += (tp - droneGroup.rotation.x) * Math.min(1, dt*8);
        droneGroup.rotation.z += (-tr - droneGroup.rotation.z) * Math.min(1, dt*8);
        droneGroup.rotation.y += (-ty - droneGroup.rotation.y) * Math.min(1, dt*5);
      } else if (t.isConnected) {
        droneGroup.rotation.x += (0 - droneGroup.rotation.x) * Math.min(1, dt*6);
        droneGroup.rotation.z += (0 - droneGroup.rotation.z) * Math.min(1, dt*6);
        droneGroup.rotation.y += (0 - droneGroup.rotation.y) * Math.min(1, dt*4);
      } else {
        droneGroup.rotation.y = Math.sin(now*0.18)*0.14;
        droneGroup.rotation.z = Math.sin(now*0.32)*0.012;
        droneGroup.rotation.x = Math.cos(now*0.24)*0.008;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth, nh = container.clientHeight;
      camera.aspect = nw/nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      scene.traverse((obj:any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m:any)=>m.dispose());
          else obj.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [theme]);

  const handleResetView = () => {
    if (controlsRef.current) { controlsRef.current.reset(); controlsRef.current.target.set(0, 0.05, 0); }
  };

  const tel = systemState?.telemetry;
  const isConn = tel?.connection_status === 'CONNECTED' || tel?.source_type === 'SIMULATION';
  const flightMode = tel?.flight_mode || 'STABILIZE';
  const isArmed = !!tel?.is_armed;
  const renderHud = (k: string, label: string) => {
    const m:any = tel?.motors?.[k];
    const conn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : false;
    const rpm = conn ? Math.round(m?.live_rpm ?? 0) : 0;
    const curr = conn && m?.current_a != null ? m.current_a.toFixed(2) : '—';
    const thrust = conn ? Math.round(m?.thrust_g ?? 0) : 0;
    return (
      <div key={k} className="p-2 rounded-md border backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--card) 88%, transparent)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-medium text-[10px] tracking-wide" style={{ color: 'var(--text)' }}>{label}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] border font-medium" style={{ background: conn ? (rpm>50 ? 'var(--text)' : 'var(--card)') : 'var(--card)', color: conn ? (rpm>50 ? 'var(--bg)' : 'var(--text-muted)') : 'var(--text-faint)', borderColor: 'var(--border)' }}>{!conn ? 'Offline' : rpm>50 ? 'Run' : 'Idle'}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text)' }}>{conn ? (rpm>0 ? `${rpm.toLocaleString()} RPM` : '0 RPM') : '—'}</span>
          {conn && <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{curr}A {thrust? `• ${thrust}g`:''}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="aerospace-card p-5 relative overflow-hidden flex flex-col h-[520px] min-h-[480px] select-none">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--text)', color: 'var(--bg)' }}><Cpu className="w-3.5 h-3.5" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>3D Digital Twin</span>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{flightMode}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full border font-medium" style={{ background: isArmed ? 'var(--text)' : 'transparent', color: isArmed ? 'var(--bg)' : 'var(--text-muted)', borderColor: isArmed ? 'var(--text)' : 'var(--border)' }}>{isArmed ? 'Armed' : 'Disarmed'}</span>
            </div>
            <div className="text-[11px] hidden sm:block" style={{ color: 'var(--text-faint)' }}>Realistic F450 • Drag to orbit • Scroll to zoom</div>
          </div>
        </div>
        <button onClick={handleResetView} className="text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card)' }}>Reset view</button>
      </div>
      <div ref={containerRef} className="w-full flex-1 rounded-lg overflow-hidden border relative cursor-grab active:cursor-grabbing" style={{ background: theme==='dark' ? '#0a0a0a' : '#f8fafc', borderColor: 'var(--border)' }} />
      <div className="absolute bottom-6 left-6 right-6 z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] select-none pointer-events-none">
        {renderHud('motor_1', 'M1 Front-R (CW)')}
        {renderHud('motor_2', 'M2 Rear-L (CW)')}
        {renderHud('motor_3', 'M3 Front-L (CCW)')}
        {renderHud('motor_4', 'M4 Rear-R (CCW)')}
      </div>
    </div>
  );
};
