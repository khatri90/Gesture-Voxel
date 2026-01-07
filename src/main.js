import { VoxelWorld } from './core/VoxelWorld.js';
import { VoxelRenderer } from './core/VoxelRenderer.js';
import { Canvas2DRenderer } from './core/Canvas2DRenderer.js';
import { HandTracker } from './gesture/HandTracker.js';
import { GestureRecognizer } from './gesture/GestureRecognizer.js';
import { GestureActions } from './gesture/GestureActions.js';
import { HistoryManager } from './utils/HistoryManager.js';
import { ColorPalette } from './ui/ColorPalette.js';
import { ExportManager } from './export/ExportManager.js';
import { GESTURES, MODES } from './utils/constants.js';

class App {
  constructor() {
    // Core components
    this.voxelWorld = null;
    this.voxelRenderer = null;
    this.canvas2dRenderer = null;
    this.handTracker = null;
    this.gestureRecognizer = null;
    this.gestureActions = null;
    this.historyManager = null;
    this.colorPalette = null;
    this.exportManager = null;

    // State
    this.is3DMode = false; // Default to 2D

    // DOM elements
    this.elements = {};

    this.init();
  }

  async init() {
    try {
      // Get DOM elements
      this.getElements();

      // Initialize core components
      this.initCore();

      // Set initial state
      this.updateModeUI();

      // Initialize hand tracking
      await this.initHandTracking();

      // Initialize UI
      this.initUI();

      // Show tutorial on first load
      this.showTutorial();

      // Hide loading overlay
      this.hideLoading();

      console.log('Gesture Voxel Editor initialized!');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize: ' + error.message);
    }
  }

  getElements() {
    this.elements = {
      webcam: document.getElementById('webcam'),
      handCanvas: document.getElementById('handCanvas'),
      threeCanvas: document.getElementById('threeCanvas'),
      canvas2d: document.getElementById('canvas2d'),
      currentGesture: document.getElementById('currentGesture'),
      currentMode: document.getElementById('currentMode'),
      colorPalette: document.getElementById('colorPalette'),
      tutorialModal: document.getElementById('tutorialModal'),
      exportModal: document.getElementById('exportModal'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      tutorialBtn: document.getElementById('tutorialBtn'),
      modeToggleBtn: document.getElementById('modeToggleBtn'),
      exportBtn: document.getElementById('exportBtn'),
      screenshotBtn: document.getElementById('screenshotBtn'),
      closeTutorial: document.getElementById('closeTutorial'),
      closeExport: document.getElementById('closeExport'),
      startBtn: document.getElementById('startBtn'),
      exportOBJ: document.getElementById('exportOBJ'),
      exportGLB: document.getElementById('exportGLB'),
    };
  }

  initCore() {
    // Create voxel world
    this.voxelWorld = new VoxelWorld();

    // Create voxel renderer
    this.voxelRenderer = new VoxelRenderer(
      this.elements.threeCanvas,
      this.voxelWorld
    );

    // Create 2D renderer
    this.canvas2dRenderer = new Canvas2DRenderer(this.elements.canvas2d);

    // Create history manager
    this.historyManager = new HistoryManager();

    // Create gesture recognizer
    this.gestureRecognizer = new GestureRecognizer();

    // Create gesture actions handler
    this.gestureActions = new GestureActions(
      this.voxelWorld,
      this.voxelRenderer,
      this.canvas2dRenderer,
      this.historyManager
    );

    // Initial sync
    this.gestureActions.set3DMode(this.is3DMode);

    // Create export manager
    this.exportManager = new ExportManager(this.voxelWorld, this.voxelRenderer);

    // Set up gesture action listeners
    this.gestureActions.on('modeChange', (mode) => {
      this.elements.currentMode.textContent = mode;
    });

    this.gestureActions.on('colorChange', (colorIndex) => {
      if (this.colorPalette) {
        this.colorPalette.selectColor(colorIndex);
      }
    });

    this.gestureActions.on('gestureChange', (gesture) => {
      this.elements.currentGesture.textContent = this.getGestureDisplayName(gesture);
    });
  }

  updateModeUI() {
    if (this.is3DMode) {
      this.elements.threeCanvas.style.display = 'block';
      this.elements.canvas2d.style.display = 'none';
      this.elements.modeToggleBtn.textContent = 'MODE [3D]';
      this.elements.modeToggleBtn.title = 'Switch to 2D Mode';
      this.elements.currentMode.textContent = '3D_VOXEL_MODE';

      // Update export button visibility (only makes sense in 3D)
      this.elements.exportBtn.style.display = 'inline-block';

      // Update cursor info visibility (if we wanted to toggle IDs, but keeping them visible is fine)

    } else {
      this.elements.threeCanvas.style.display = 'none';
      this.elements.canvas2d.style.display = 'block';
      this.elements.modeToggleBtn.textContent = 'MODE [2D]';
      this.elements.modeToggleBtn.title = 'Switch to 3D Mode';
      this.elements.currentMode.textContent = '2D_BLOCK_MODE';

      // Hide export button in 2D
      this.elements.exportBtn.style.display = 'none';
    }
  }

  toggleMode() {
    this.is3DMode = !this.is3DMode;
    this.updateModeUI();
    this.gestureActions.set3DMode(this.is3DMode);
  }

  async initHandTracking() {
    // Create hand tracker
    this.handTracker = new HandTracker(
      this.elements.webcam,
      this.elements.handCanvas
    );

    // Initialize and start
    await this.handTracker.init();
    await this.handTracker.start();

    // Subscribe to hand tracking results
    this.handTracker.subscribe((results) => {
      this.processHandResults(results);
    });
  }

  processHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Use the first detected hand
      const landmarks = results.multiHandLandmarks[0];

      // Recognize gesture
      const gestureData = this.gestureRecognizer.recognize(landmarks);

      // Get hand movement for camera control
      const handMovement = this.gestureRecognizer.getHandMovement(landmarks);

      // Process gesture actions
      this.gestureActions.processResults(results, gestureData, handMovement);
    } else {
      // No hands detected
      this.elements.currentGesture.textContent = 'NO HAND';
    }
  }

  initUI() {
    // Initialize color palette
    this.colorPalette = new ColorPalette(
      this.elements.colorPalette,
      (colorIndex) => {
        this.gestureActions.setColor(colorIndex);
      }
    );

    // Tutorial button
    this.elements.tutorialBtn.addEventListener('click', () => {
      this.showTutorial();
    });

    // Mode Toggle button
    this.elements.modeToggleBtn.addEventListener('click', () => {
      this.toggleMode();
    });

    // Close tutorial
    this.elements.closeTutorial.addEventListener('click', () => {
      this.hideTutorial();
    });

    this.elements.startBtn.addEventListener('click', () => {
      this.hideTutorial();
    });

    // Export button
    this.elements.exportBtn.addEventListener('click', () => {
      this.showExportModal();
    });

    // Close export modal
    this.elements.closeExport.addEventListener('click', () => {
      this.hideExportModal();
    });

    // Export OBJ
    this.elements.exportOBJ.addEventListener('click', () => {
      this.exportManager.exportOBJ();
      this.hideExportModal();
    });

    // Export GLB
    this.elements.exportGLB.addEventListener('click', () => {
      this.exportManager.exportGLB();
      this.hideExportModal();
    });

    // Screenshot button
    this.elements.screenshotBtn.addEventListener('click', () => {
      this.exportManager.takeScreenshot();
    });

    // Close modals on outside click
    this.elements.tutorialModal.addEventListener('click', (e) => {
      if (e.target === this.elements.tutorialModal) {
        this.hideTutorial();
      }
    });

    this.elements.exportModal.addEventListener('click', (e) => {
      if (e.target === this.elements.exportModal) {
        this.hideExportModal();
      }
    });
  }

  getGestureDisplayName(gesture) {
    const names = {
      [GESTURES.NONE]: 'NONE',
      [GESTURES.POINT]: 'POINTING',
      [GESTURES.PINCH]: 'PINCHING',
      [GESTURES.FIST]: 'FIST',
      [GESTURES.PALM]: 'OPEN PALM',
      [GESTURES.PEACE]: 'PEACE SIGN',
      [GESTURES.SWIPE_LEFT]: 'SWIPE LEFT',
      [GESTURES.SWIPE_RIGHT]: 'SWIPE RIGHT',
    };
    return names[gesture] || gesture;
  }

  showTutorial() {
    this.elements.tutorialModal.classList.add('active');
  }

  hideTutorial() {
    this.elements.tutorialModal.classList.remove('active');
  }

  showExportModal() {
    this.elements.exportModal.classList.add('active');
  }

  hideExportModal() {
    this.elements.exportModal.classList.remove('active');
  }

  hideLoading() {
    this.elements.loadingOverlay.classList.add('hidden');
    setTimeout(() => {
      this.elements.loadingOverlay.style.display = 'none';
    }, 500);
  }

  showError(message) {
    const loadingContent = this.elements.loadingOverlay.querySelector('.loading-content');
    loadingContent.innerHTML = `
      <div style="color: #ff4444; font-size: 48px; margin-bottom: 20px;">&#9888;</div>
      <p style="color: #ff4444;">${message}</p>
      <p style="color: #888; margin-top: 10px; font-size: 14px;">
        Please ensure your webcam is connected and you've granted permission.
      </p>
    `;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
