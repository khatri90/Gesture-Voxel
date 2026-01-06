import * as THREE from 'three';
import { COLORS, VOXEL_SIZE } from '../utils/constants.js';

export class ExportManager {
  constructor(voxelWorld, voxelRenderer) {
    this.voxelWorld = voxelWorld;
    this.voxelRenderer = voxelRenderer;
  }

  // Export to OBJ format
  exportOBJ() {
    const voxels = this.voxelWorld.getAllVoxels();
    if (voxels.length === 0) {
      alert('No voxels to export!');
      return;
    }

    let objContent = '# Gesture Voxel Editor Export\n';
    objContent += '# Voxel count: ' + voxels.length + '\n\n';

    let vertexIndex = 1;
    const size = VOXEL_SIZE / 2;

    // Generate OBJ content
    for (const voxel of voxels) {
      const { x, y, z, colorIndex } = voxel;
      const color = COLORS[colorIndex];
      const r = ((color >> 16) & 255) / 255;
      const g = ((color >> 8) & 255) / 255;
      const b = (color & 255) / 255;

      // Add comment for color (some viewers support this)
      objContent += `# Color: ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}\n`;

      // Vertices for a cube
      const vertices = [
        [x - size, y - size, z - size],
        [x + size, y - size, z - size],
        [x + size, y + size, z - size],
        [x - size, y + size, z - size],
        [x - size, y - size, z + size],
        [x + size, y - size, z + size],
        [x + size, y + size, z + size],
        [x - size, y + size, z + size],
      ];

      for (const [vx, vy, vz] of vertices) {
        objContent += `v ${vx} ${vy} ${vz}\n`;
      }

      // Faces (1-indexed in OBJ)
      const faces = [
        [1, 2, 3, 4], // Front
        [5, 6, 7, 8], // Back
        [1, 5, 8, 4], // Left
        [2, 6, 7, 3], // Right
        [4, 3, 7, 8], // Top
        [1, 2, 6, 5], // Bottom
      ];

      for (const face of faces) {
        const [a, b, c, d] = face.map((i) => i + vertexIndex - 1);
        objContent += `f ${a} ${b} ${c} ${d}\n`;
      }

      vertexIndex += 8;
    }

    this.downloadFile(objContent, 'voxel-creation.obj', 'text/plain');
  }

  // Export to GLB format (using Three.js)
  async exportGLB() {
    const voxels = this.voxelWorld.getAllVoxels();
    if (voxels.length === 0) {
      alert('No voxels to export!');
      return;
    }

    // Dynamically import GLTFExporter
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');

    // Create a new scene with merged geometry
    const exportScene = new THREE.Scene();

    // Group voxels by color for efficiency
    const colorGroups = new Map();

    for (const voxel of voxels) {
      if (!colorGroups.has(voxel.colorIndex)) {
        colorGroups.set(voxel.colorIndex, []);
      }
      colorGroups.get(voxel.colorIndex).push(voxel);
    }

    // Create merged mesh for each color
    for (const [colorIndex, voxelList] of colorGroups) {
      const geometry = new THREE.BoxGeometry(
        VOXEL_SIZE * 0.95,
        VOXEL_SIZE * 0.95,
        VOXEL_SIZE * 0.95
      );

      const color = new THREE.Color(COLORS[colorIndex]);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.1,
      });

      for (const voxel of voxelList) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(voxel.x, voxel.y, voxel.z);
        exportScene.add(mesh);
      }
    }

    // Export using GLTFExporter
    const exporter = new GLTFExporter();

    exporter.parse(
      exportScene,
      (glb) => {
        this.downloadFile(glb, 'voxel-creation.glb', 'application/octet-stream');
      },
      (error) => {
        console.error('GLB export error:', error);
        alert('Failed to export GLB: ' + error.message);
      },
      { binary: true }
    );
  }

  // Take screenshot
  takeScreenshot() {
    const renderer = this.voxelRenderer.getRenderer();
    const scene = this.voxelRenderer.getScene();
    const camera = this.voxelRenderer.getCamera();

    // Render to get the current frame
    renderer.render(scene, camera);

    // Get data URL
    const dataURL = renderer.domElement.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.download = 'voxel-screenshot.png';
    link.href = dataURL;
    link.click();
  }

  // Helper to download file
  downloadFile(content, filename, mimeType) {
    let blob;

    if (content instanceof ArrayBuffer) {
      blob = new Blob([content], { type: mimeType });
    } else {
      blob = new Blob([content], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }
}
