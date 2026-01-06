import * as THREE from 'three';
import { GRID_SIZE, VOXEL_SIZE, MAX_VOXELS, COLORS, CAMERA_FOV, CAMERA_DISTANCE } from '../utils/constants.js';

export class VoxelRenderer {
  constructor(canvas, voxelWorld) {
    this.canvas = canvas;
    this.voxelWorld = voxelWorld;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.instancedMesh = null;
    this.cursorMesh = null;
    this.gridHelper = null;

    this.cameraAngleX = 0.5;
    this.cameraAngleY = 0.3;
    this.cameraDistance = CAMERA_DISTANCE;

    this.cursorPosition = null;
    this.dummy = new THREE.Object3D();
    this.colorArray = null;

    this.init();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    // Create camera
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 1000);
    this.updateCameraPosition();

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add lighting
    this.setupLighting();

    // Add grid
    this.setupGrid();

    // Create instanced mesh for voxels
    this.setupInstancedMesh();

    // Create cursor mesh
    this.setupCursor();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());

    // Subscribe to voxel world changes
    this.voxelWorld.subscribe(() => this.updateVoxels());

    // Start render loop
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Main directional light with shadows
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -25;
    mainLight.shadow.camera.right = 25;
    mainLight.shadow.camera.top = 25;
    mainLight.shadow.camera.bottom = -25;
    mainLight.shadow.bias = -0.001;
    this.scene.add(mainLight);

    // Fill light (softer, from opposite side)
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-15, 10, -10);
    this.scene.add(fillLight);

    // Rim light (from behind)
    const rimLight = new THREE.DirectionalLight(0xff8888, 0.2);
    rimLight.position.set(0, 5, -20);
    this.scene.add(rimLight);
  }

  setupGrid() {
    // Grid floor
    const gridSize = GRID_SIZE;
    const gridDivisions = GRID_SIZE;

    // Custom grid using lines for better visual
    const gridGeometry = new THREE.BufferGeometry();
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x2a2a35,
      transparent: true,
      opacity: 0.6,
    });

    const points = [];
    const halfGrid = gridSize / 2;

    // Horizontal lines (X direction)
    for (let i = 0; i <= gridDivisions; i++) {
      points.push(-halfGrid + GRID_SIZE / 2, 0, i - halfGrid + GRID_SIZE / 2);
      points.push(halfGrid + GRID_SIZE / 2, 0, i - halfGrid + GRID_SIZE / 2);
    }

    // Vertical lines (Z direction)
    for (let i = 0; i <= gridDivisions; i++) {
      points.push(i - halfGrid + GRID_SIZE / 2, 0, -halfGrid + GRID_SIZE / 2);
      points.push(i - halfGrid + GRID_SIZE / 2, 0, halfGrid + GRID_SIZE / 2);
    }

    gridGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points, 3)
    );

    this.gridHelper = new THREE.LineSegments(gridGeometry, gridMaterial);
    this.scene.add(this.gridHelper);

    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2);
    const groundMaterial = new THREE.ShadowMaterial({
      opacity: 0.3,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(GRID_SIZE / 2, -0.01, GRID_SIZE / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add subtle boundary box
    const boundaryGeometry = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE);
    const boundaryEdges = new THREE.EdgesGeometry(boundaryGeometry);
    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
    });
    const boundaryBox = new THREE.LineSegments(boundaryEdges, boundaryMaterial);
    boundaryBox.position.set(GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5);
    this.scene.add(boundaryBox);
  }

  setupInstancedMesh() {
    // Create geometry and material for voxels
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE * 0.95, VOXEL_SIZE * 0.95, VOXEL_SIZE * 0.95);
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.1,
    });

    // Create instanced mesh
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_VOXELS);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;
    this.instancedMesh.count = 0;

    // Initialize color array
    this.colorArray = new Float32Array(MAX_VOXELS * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      this.colorArray,
      3
    );

    this.scene.add(this.instancedMesh);
  }

  setupCursor() {
    const cursorGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    const cursorMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      wireframe: false,
    });
    this.cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.cursorMesh.visible = false;
    this.scene.add(this.cursorMesh);

    // Cursor outline
    const outlineGeometry = new THREE.EdgesGeometry(cursorGeometry);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2,
    });
    this.cursorOutline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    this.cursorMesh.add(this.cursorOutline);
  }

  updateVoxels() {
    const voxels = this.voxelWorld.getAllVoxels();

    let i = 0;
    for (const voxel of voxels) {
      // Set position
      this.dummy.position.set(voxel.x, voxel.y, voxel.z);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      // Set color
      const color = new THREE.Color(COLORS[voxel.colorIndex]);
      this.colorArray[i * 3] = color.r;
      this.colorArray[i * 3 + 1] = color.g;
      this.colorArray[i * 3 + 2] = color.b;

      i++;
    }

    this.instancedMesh.count = voxels.length;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor.needsUpdate = true;

    // Update voxel count display
    const countElement = document.getElementById('voxelCount');
    if (countElement) {
      countElement.textContent = voxels.length;
    }
  }

  setCursorPosition(x, y, z, colorIndex = 0) {
    if (x !== null && this.voxelWorld.isValidPosition(x, y, z)) {
      this.cursorMesh.position.set(x, y, z);
      this.cursorMesh.visible = true;

      // Update cursor color based on current color
      const color = new THREE.Color(COLORS[colorIndex]);
      this.cursorMesh.material.color = color;
      this.cursorOutline.material.color = color;

      // Update cursor info display
      const cursorPosElement = document.getElementById('cursorPos');
      if (cursorPosElement) {
        cursorPosElement.textContent = `(${x}, ${y}, ${z})`;
      }
    } else {
      this.cursorMesh.visible = false;
      const cursorPosElement = document.getElementById('cursorPos');
      if (cursorPosElement) {
        cursorPosElement.textContent = '--';
      }
    }
  }

  updateCameraPosition() {
    const x = Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;
    const y = Math.sin(this.cameraAngleY) * this.cameraDistance;
    const z = Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;

    const center = GRID_SIZE / 2 - 0.5;
    this.camera.position.set(x + center, y + center, z + center);
    this.camera.lookAt(center, center, center);
  }

  orbitCamera(deltaX, deltaY) {
    this.cameraAngleX += deltaX;
    this.cameraAngleY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngleY + deltaY));
    this.updateCameraPosition();
  }

  zoomCamera(delta) {
    this.cameraDistance = Math.max(10, Math.min(50, this.cameraDistance + delta));
    this.updateCameraPosition();
  }

  handleResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  // Raycast from normalized screen coords to find grid position
  raycastToGrid(normalizedX, normalizedY) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: normalizedX, y: normalizedY }, this.camera);

    // Create planes for each level of the grid
    const intersections = [];

    // Ground plane (y = 0)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundIntersect = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, groundIntersect)) {
      const x = Math.floor(groundIntersect.x + 0.5);
      const z = Math.floor(groundIntersect.z + 0.5);
      if (this.voxelWorld.isValidPosition(x, 0, z)) {
        intersections.push({ x, y: 0, z, distance: groundIntersect.distanceTo(this.camera.position) });
      }
    }

    // Check intersection with existing voxels
    const voxels = this.voxelWorld.getAllVoxels();
    for (const voxel of voxels) {
      const box = new THREE.Box3(
        new THREE.Vector3(voxel.x - 0.5, voxel.y - 0.5, voxel.z - 0.5),
        new THREE.Vector3(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5)
      );

      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectBox(box, intersection)) {
        // Determine which face was hit to place adjacent voxel
        const faceNormal = this.getHitFaceNormal(intersection, voxel);
        const newPos = {
          x: voxel.x + faceNormal.x,
          y: voxel.y + faceNormal.y,
          z: voxel.z + faceNormal.z,
        };

        if (this.voxelWorld.isValidPosition(newPos.x, newPos.y, newPos.z)) {
          intersections.push({
            ...newPos,
            distance: intersection.distanceTo(this.camera.position),
            hitVoxel: { x: voxel.x, y: voxel.y, z: voxel.z },
          });
        }
      }
    }

    // Return closest intersection
    if (intersections.length > 0) {
      intersections.sort((a, b) => a.distance - b.distance);
      return intersections[0];
    }

    return null;
  }

  getHitFaceNormal(intersection, voxel) {
    const dx = intersection.x - voxel.x;
    const dy = intersection.y - voxel.y;
    const dz = intersection.z - voxel.z;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const az = Math.abs(dz);

    if (ax >= ay && ax >= az) {
      return { x: dx > 0 ? 1 : -1, y: 0, z: 0 };
    } else if (ay >= ax && ay >= az) {
      return { x: 0, y: dy > 0 ? 1 : -1, z: 0 };
    } else {
      return { x: 0, y: 0, z: dz > 0 ? 1 : -1 };
    }
  }

  // Get scene for export
  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }
}
