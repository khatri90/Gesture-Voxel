import { GRID_SIZE, COLORS } from '../utils/constants.js';

export class VoxelWorld {
  constructor() {
    // Store voxels as a Map with key "x,y,z" and value { color: index }
    this.voxels = new Map();
    this.listeners = new Set();
  }

  // Generate key from coordinates
  getKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  // Parse key back to coordinates
  parseKey(key) {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  }

  // Check if position is within grid bounds
  isValidPosition(x, y, z) {
    return (
      x >= 0 && x < GRID_SIZE &&
      y >= 0 && y < GRID_SIZE &&
      z >= 0 && z < GRID_SIZE
    );
  }

  // Add a voxel at position with color
  addVoxel(x, y, z, colorIndex) {
    if (!this.isValidPosition(x, y, z)) return false;

    const key = this.getKey(x, y, z);
    const existed = this.voxels.has(key);

    this.voxels.set(key, { colorIndex });
    this.notifyListeners();

    return { added: true, wasNew: !existed };
  }

  // Remove a voxel at position
  removeVoxel(x, y, z) {
    const key = this.getKey(x, y, z);
    const existed = this.voxels.has(key);

    if (existed) {
      this.voxels.delete(key);
      this.notifyListeners();
    }

    return { removed: existed };
  }

  // Check if voxel exists at position
  hasVoxel(x, y, z) {
    return this.voxels.has(this.getKey(x, y, z));
  }

  // Get voxel at position
  getVoxel(x, y, z) {
    return this.voxels.get(this.getKey(x, y, z));
  }

  // Get all voxels as array of { x, y, z, colorIndex }
  getAllVoxels() {
    const result = [];
    for (const [key, data] of this.voxels) {
      const { x, y, z } = this.parseKey(key);
      result.push({ x, y, z, colorIndex: data.colorIndex });
    }
    return result;
  }

  // Get voxel count
  getCount() {
    return this.voxels.size;
  }

  // Clear all voxels
  clear() {
    this.voxels.clear();
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of changes
  notifyListeners() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  // Export voxels as JSON
  toJSON() {
    return this.getAllVoxels();
  }

  // Import voxels from JSON
  fromJSON(data) {
    this.voxels.clear();
    for (const voxel of data) {
      this.addVoxel(voxel.x, voxel.y, voxel.z, voxel.colorIndex);
    }
  }

  // Get state for undo/redo
  getState() {
    return JSON.stringify(this.toJSON());
  }

  // Restore state from undo/redo
  setState(stateString) {
    const data = JSON.parse(stateString);
    this.fromJSON(data);
  }
}
