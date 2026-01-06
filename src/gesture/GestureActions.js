import {
  GESTURES,
  MODES,
  COLORS,
  ACTION_DEBOUNCE,
  COLOR_CHANGE_DEBOUNCE,
  UNDO_DEBOUNCE,
  ORBIT_SENSITIVITY,
} from '../utils/constants.js';

export class GestureActions {
  constructor(voxelWorld, voxelRenderer, historyManager) {
    this.voxelWorld = voxelWorld;
    this.voxelRenderer = voxelRenderer;
    this.historyManager = historyManager;

    this.currentColorIndex = 0;
    this.currentMode = MODES.PLACE;
    this.lastActionTime = 0;
    this.lastColorChangeTime = 0;
    this.lastUndoTime = 0;

    this.lastCursorPosition = null;
    this.isOrbitActive = false;

    this.listeners = {
      modeChange: new Set(),
      colorChange: new Set(),
      gestureChange: new Set(),
    };
  }

  // Debounce helper
  canPerformAction(lastTime, debounce) {
    const now = Date.now();
    return now - lastTime > debounce;
  }

  // Process hand tracking results
  processResults(results, gestureData, handMovement) {
    const { gesture, position } = gestureData;

    // Update gesture display
    this.notifyListeners('gestureChange', gesture);

    // Handle different gestures
    switch (gesture) {
      case GESTURES.POINT:
        this.handlePoint(position);
        break;

      case GESTURES.PINCH:
        this.handlePinch(position);
        break;

      case GESTURES.FIST:
        this.handleFist(position);
        break;

      case GESTURES.PALM:
        this.handlePalm(handMovement);
        break;

      case GESTURES.PEACE:
        this.handlePeace();
        break;

      case GESTURES.SWIPE_LEFT:
        this.handleSwipeLeft();
        break;

      case GESTURES.SWIPE_RIGHT:
        this.handleSwipeRight();
        break;

      case GESTURES.NONE:
        this.handleNone();
        break;
    }

    return {
      mode: this.currentMode,
      colorIndex: this.currentColorIndex,
      gesture,
    };
  }

  // Convert hand position to 3D cursor position
  handToGridPosition(position) {
    if (!position) return null;

    // Convert from normalized coords (0-1) to screen coords (-1 to 1)
    // Note: x is mirrored because webcam is mirrored
    const normalizedX = -(position.x - 0.5) * 2;
    const normalizedY = -(position.y - 0.5) * 2;

    // Use raycast to find grid position
    const gridPos = this.voxelRenderer.raycastToGrid(normalizedX, normalizedY);
    return gridPos;
  }

  // Handle pointing gesture - move cursor
  handlePoint(position) {
    this.setMode(MODES.PLACE);
    this.isOrbitActive = false;

    const gridPos = this.handToGridPosition(position);

    if (gridPos) {
      this.lastCursorPosition = gridPos;
      this.voxelRenderer.setCursorPosition(
        gridPos.x,
        gridPos.y,
        gridPos.z,
        this.currentColorIndex
      );
    } else {
      this.voxelRenderer.setCursorPosition(null);
    }
  }

  // Handle pinch gesture - place voxel
  handlePinch(position) {
    this.setMode(MODES.PLACE);
    this.isOrbitActive = false;

    const gridPos = this.handToGridPosition(position);

    if (gridPos && this.canPerformAction(this.lastActionTime, ACTION_DEBOUNCE)) {
      // Save state for undo
      this.historyManager.saveState(this.voxelWorld.getState());

      // Place voxel
      this.voxelWorld.addVoxel(gridPos.x, gridPos.y, gridPos.z, this.currentColorIndex);
      this.lastActionTime = Date.now();

      // Update cursor
      this.lastCursorPosition = gridPos;
      this.voxelRenderer.setCursorPosition(
        gridPos.x,
        gridPos.y,
        gridPos.z,
        this.currentColorIndex
      );
    }
  }

  // Handle fist gesture - delete voxel
  handleFist(position) {
    this.setMode(MODES.DELETE);
    this.isOrbitActive = false;

    const gridPos = this.handToGridPosition(position);

    if (gridPos && gridPos.hitVoxel && this.canPerformAction(this.lastActionTime, ACTION_DEBOUNCE)) {
      // Save state for undo
      this.historyManager.saveState(this.voxelWorld.getState());

      // Delete voxel
      this.voxelWorld.removeVoxel(
        gridPos.hitVoxel.x,
        gridPos.hitVoxel.y,
        gridPos.hitVoxel.z
      );
      this.lastActionTime = Date.now();
    }

    // Show cursor at current position even in delete mode
    if (gridPos && gridPos.hitVoxel) {
      this.voxelRenderer.setCursorPosition(
        gridPos.hitVoxel.x,
        gridPos.hitVoxel.y,
        gridPos.hitVoxel.z,
        this.currentColorIndex
      );
    }
  }

  // Handle palm gesture - orbit camera
  handlePalm(handMovement) {
    this.setMode(MODES.ORBIT);
    this.voxelRenderer.setCursorPosition(null);

    if (handMovement && this.isOrbitActive) {
      // Apply camera rotation based on hand movement
      this.voxelRenderer.orbitCamera(
        -handMovement.dx * ORBIT_SENSITIVITY,
        handMovement.dy * ORBIT_SENSITIVITY
      );
    }

    this.isOrbitActive = true;
  }

  // Handle peace sign - cycle color
  handlePeace() {
    this.setMode(MODES.COLOR);

    if (this.canPerformAction(this.lastColorChangeTime, COLOR_CHANGE_DEBOUNCE)) {
      this.currentColorIndex = (this.currentColorIndex + 1) % COLORS.length;
      this.lastColorChangeTime = Date.now();
      this.notifyListeners('colorChange', this.currentColorIndex);

      // Update cursor color if visible
      if (this.lastCursorPosition) {
        this.voxelRenderer.setCursorPosition(
          this.lastCursorPosition.x,
          this.lastCursorPosition.y,
          this.lastCursorPosition.z,
          this.currentColorIndex
        );
      }
    }
  }

  // Handle swipe left - undo
  handleSwipeLeft() {
    if (this.canPerformAction(this.lastUndoTime, UNDO_DEBOUNCE)) {
      const previousState = this.historyManager.undo();
      if (previousState) {
        this.voxelWorld.setState(previousState);
      }
      this.lastUndoTime = Date.now();
    }
  }

  // Handle swipe right - redo
  handleSwipeRight() {
    if (this.canPerformAction(this.lastUndoTime, UNDO_DEBOUNCE)) {
      const nextState = this.historyManager.redo();
      if (nextState) {
        this.voxelWorld.setState(nextState);
      }
      this.lastUndoTime = Date.now();
    }
  }

  // Handle no gesture
  handleNone() {
    this.isOrbitActive = false;
    // Keep cursor visible at last position
  }

  // Set current mode
  setMode(mode) {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.notifyListeners('modeChange', mode);
    }
  }

  // Set color directly (from UI)
  setColor(colorIndex) {
    this.currentColorIndex = colorIndex;
    this.notifyListeners('colorChange', colorIndex);

    // Update cursor color if visible
    if (this.lastCursorPosition) {
      this.voxelRenderer.setCursorPosition(
        this.lastCursorPosition.x,
        this.lastCursorPosition.y,
        this.lastCursorPosition.z,
        this.currentColorIndex
      );
    }
  }

  // Get current color
  getCurrentColor() {
    return this.currentColorIndex;
  }

  // Subscribe to events
  on(event, listener) {
    if (this.listeners[event]) {
      this.listeners[event].add(listener);
    }
    return () => this.listeners[event]?.delete(listener);
  }

  // Notify listeners
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        listener(data);
      }
    }
  }
}
