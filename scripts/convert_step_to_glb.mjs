// scripts/convert_step_to_glb.mjs
import fs from 'fs';
import path from 'path';
import initOpenCascade from 'occt-import-js';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill FileReader for Node.js GLTFExporter binary export
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onloadend) this.onloadend({ target: this });
    }).catch((err) => {
      if (this.onerror) this.onerror(err);
    });
  }
}
globalThis.FileReader = NodeFileReader;

async function run() {
  console.log('🚀 Loading Open CASCADE Technology WebAssembly...');
  const occt = await initOpenCascade();
  console.log('✅ Open CASCADE loaded.');

  const stepFilePath = 'C:\\Users\\sarveshwaran\\Downloads\\F450 Frame Assembly (1).stp';
  console.log(`📖 Reading STEP file: ${stepFilePath}...`);
  const fileBuffer = fs.readFileSync(stepFilePath);

  console.log('⚙️ Parsing and tessellating B-Rep geometry into 3D triangular meshes...');
  const result = occt.ReadStepFile(fileBuffer, null);
  if (!result.success) {
    throw new Error('Failed to parse STEP file.');
  }
  console.log(`✅ Extracted ${result.meshes.length} solid meshes.`);

  // Assembly center offset in millimeters (to place quadcopter origin at center of frame)
  const centerOffset = new THREE.Vector3(-35.0, 26.0, 61.5);
  // Scale factor: convert mm to Three.js world units
  // 1 unit = 125mm -> diagonal 450mm = 3.6 units, matching standard scene dimensions
  const SCALE = 0.008;

  // Materials
  const plateMat = new THREE.MeshStandardMaterial({
    name: 'Mat_Fiberglass_Carbon',
    color: 0x181e28,
    roughness: 0.35,
    metalness: 0.25,
  });

  const frontArmMat = new THREE.MeshStandardMaterial({
    name: 'Mat_PA66_Nylon_Red',
    color: 0xef4444, // DJI Signature Red
    roughness: 0.35,
    metalness: 0.1,
  });

  const rearArmMat = new THREE.MeshStandardMaterial({
    name: 'Mat_PA66_Nylon_White',
    color: 0xf8fafc, // DJI Signature White
    roughness: 0.35,
    metalness: 0.1,
  });

  const fastenerMat = new THREE.MeshStandardMaterial({
    name: 'Mat_Steel_M3_Fastener',
    color: 0x334155,
    roughness: 0.25,
    metalness: 0.85,
  });

  const rootGroup = new THREE.Group();
  rootGroup.name = 'DJI_F450_CAD_Frame';

  const fastenersGroup = new THREE.Group();
  fastenersGroup.name = 'Fasteners_M3';
  rootGroup.add(fastenersGroup);

  let totalVertices = 0;
  let totalTriangles = 0;

  result.meshes.forEach((meshData, index) => {
    const rawPos = meshData.attributes.position.array;
    const rawNorm = meshData.attributes.normal ? meshData.attributes.normal.array : null;
    const rawIndex = meshData.index ? meshData.index.array : null;

    const vertexCount = rawPos.length / 3;
    totalVertices += vertexCount;

    // Center and scale vertex positions
    const pos = new Float32Array(rawPos.length);
    for (let i = 0; i < rawPos.length; i += 3) {
      pos[i] = (rawPos[i] - centerOffset.x) * SCALE;
      pos[i + 1] = (rawPos[i + 1] - centerOffset.y) * SCALE;
      pos[i + 2] = (rawPos[i + 2] - centerOffset.z) * SCALE;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    if (rawNorm && rawNorm.length === rawPos.length) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(rawNorm), 3));
    } else {
      geometry.computeVertexNormals();
    }

    if (rawIndex) {
      if (vertexCount > 65535) {
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(rawIndex), 1));
      } else {
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(rawIndex), 1));
      }
      totalTriangles += rawIndex.length / 3;
    }

    // Classify mesh by component
    let meshName = meshData.name || `Mesh_${index}`;
    let material = plateMat;

    if (index === 0) {
      meshName = 'F450_Bottom_Plate';
      material = plateMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
    } else if (index === 4) {
      meshName = 'F450_Top_Plate';
      material = plateMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
    } else if (index === 3) {
      // Front-Right Arm (Motor 1)
      meshName = 'F450_Arm_Front_Right_M1';
      material = frontArmMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
    } else if (index === 5) {
      // Front-Left Arm (Motor 3)
      meshName = 'F450_Arm_Front_Left_M3';
      material = frontArmMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
    } else if (index === 1) {
      // Rear-Left Arm (Motor 2)
      meshName = 'F450_Arm_Rear_Left_M2';
      material = rearArmMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
    } else if (index === 2) {
      // Rear-Right Arm (Motor 4)
      meshName = 'F450_Arm_Rear_Right_M4';
      material = rearArmMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
    } else {
      // M3 Fastener Screws
      meshName = `Screw_M3_${index}`;
      material = fastenerMat;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshName;
      mesh.castShadow = true;
      fastenersGroup.add(mesh);
    }
  });

  console.log(`📊 Geometry Summary: Total Vertices = ${totalVertices.toLocaleString()}, Triangles = ${totalTriangles.toLocaleString()}`);

  console.log('📦 Exporting to binary glTF (.glb)...');
  const exporter = new GLTFExporter();
  const glbBuffer = await exporter.parseAsync(rootGroup, { binary: true });

  const outputDir = path.resolve('frontend/public/models');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'f450_frame.glb');
  fs.writeFileSync(outputPath, Buffer.from(glbBuffer));

  const stats = fs.statSync(outputPath);
  console.log(`✨ Success! Exported f450_frame.glb (${(stats.size / 1024).toFixed(1)} KB) to: ${outputPath}`);
}

run().catch((err) => {
  console.error('❌ Conversion error:', err);
  process.exit(1);
});
