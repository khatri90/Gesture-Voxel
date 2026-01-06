import { VoxelWorld } from './core/VoxelWorld.js';
import { VoxelRenderer } from './core/VoxelRenderer.js';
import { HandTracker } from './gesture/HandTracker.js';
import { GestureRecognizer } from './gesture/GestureRecognizer.js';
import { GestureActions } from './gesture/GestureActions.js';
import { HistoryManager } from './utils/HistoryManager.js';
import { ColorPalette } from './ui/ColorPalette.js';
import { ExportManager } from './export/ExportManager.js';
import { GestureClassifier } from './ml/GestureClassifier.js';
import { GESTURES, MODES } from './utils/constants.js';

class App {
  constructor() {
    // Core components
    this.voxelWorld = null;
    this.voxelRenderer = null;
    this.handTracker = null;
    this.gestureRecognizer = null;
    this.gestureActions = null;
    this.historyManager = null;
    this.colorPalette = null;
    this.exportManager = null;

    // ML components
    this.gestureClassifier = null;
    this.useMLClassifier = true; // Use ML model for gesture recognition

    // DOM elements
    this.elements = {};

    this.init();
  }

  async init() {
    try {
      // Get DOM elements
      this.getElements();

      this.updateLoading(5, 'Initializing core components...');

      // Initialize core components
      this.initCore();

      this.updateLoading(15, 'Training neural network...');

      // Initialize and train ML classifier
      await this.initMLClassifier();

      this.updateLoading(85, 'Starting hand tracking...');

      // Initialize hand tracking
      await this.initHandTracking();

      this.updateLoading(95, 'Setting up UI...');

      // Initialize UI
      this.initUI();

      // Show tutorial on first load
      this.showTutorial();

      // Hide loading overlay
      this.hideLoading();

      console.log('Gesture Voxel Editor initialized with ML!');
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
      currentGesture: document.getElementById('currentGesture'),
      currentMode: document.getElementById('currentMode'),
      mlConfidence: document.getElementById('mlConfidence'),
      colorPalette: document.getElementById('colorPalette'),
      tutorialModal: document.getElementById('tutorialModal'),
      exportModal: document.getElementById('exportModal'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      loadingText: document.getElementById('loadingText'),
      loadingBar: document.getElementById('loadingBar'),
      tutorialBtn: document.getElementById('tutorialBtn'),
      exportBtn: document.getElementById('exportBtn'),
      screenshotBtn: document.getElementById('screenshotBtn'),
      closeTutorial: document.getElementById('closeTutorial'),
      closeExport: document.getElementById('closeExport'),
      startBtn: document.getElementById('startBtn'),
      exportOBJ: document.getElementById('exportOBJ'),
      exportGLB: document.getElementById('exportGLB'),
      modelStatus: document.getElementById('modelStatus'),
      modelAccuracy: document.getElementById('modelAccuracy'),
      inferenceTime: document.getElementById('inferenceTime'),
    };
  }

  updateLoading(percent, text) {
    if (this.elements.loadingBar) {
      this.elements.loadingBar.style.width = `${percent}%`;
    }
    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = text;
    }
  }

  initCore() {
    // Create voxel world
    this.voxelWorld = new VoxelWorld();

    // Create voxel renderer (with transparent background for AR overlay)
    this.voxelRenderer = new VoxelRenderer(
      this.elements.threeCanvas,
      this.voxelWorld
    );

    // Create history manager
    this.historyManager = new HistoryManager();

    // Create gesture recognizer (fallback if ML fails)
    this.gestureRecognizer = new GestureRecognizer();

    // Create gesture actions handler
    this.gestureActions = new GestureActions(
      this.voxelWorld,
      this.voxelRenderer,
      this.historyManager
    );

    // Create export manager
    this.exportManager = new ExportManager(this.voxelWorld, this.voxelRenderer);

    // Set up gesture action listeners
    this.gestureActions.on('modeChange', (mode) => {
      this.elements.currentMode.textContent = mode.replace(' MODE', '');
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

  async initMLClassifier() {
    // Create ML gesture classifier
    this.gestureClassifier = new GestureClassifier();

    // Set UI elements for status updates
    this.gestureClassifier.setUIElements({
      status: this.elements.modelStatus,
      accuracy: this.elements.modelAccuracy,
      inference: this.elements.inferenceTime,
      loadingBar: this.elements.loadingBar,
      loadingText: this.elements.loadingText,
    });

    // Train the model
    await this.gestureClassifier.train((progress) => {
      console.log(`Training progress: Epoch ${progress.epoch}/${progress.totalEpochs}`);
    });

    console.log('ML Classifier trained successfully!');
    console.log('Model info:', this.gestureClassifier.getModelInfo());
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

      let gestureData;

      if (this.useMLClassifier && this.gestureClassifier.isTrained) {
        // Use ML classifier for gesture recognition
        const mlResult = this.gestureClassifier.predict(landmarks);

        // Convert ML result to gesture data format
        gestureData = this.convertMLResultToGesture(mlResult, landmarks);

        // Update confidence display
        if (this.elements.mlConfidence) {
          this.elements.mlConfidence.textContent = `${(mlResult.confidence * 100).toFixed(0)}%`;
        }
      } else {
        // Fallback to rule-based recognizer
        gestureData = this.gestureRecognizer.recognize(landmarks);
      }

      // Get hand movement for camera control
      const handMovement = this.gestureRecognizer.getHandMovement(landmarks);

      // Process gesture actions
      this.gestureActions.processResults(results, gestureData, handMovement);
    } else {
      // No hands detected
      this.elements.currentGesture.textContent = 'NO HAND';
      if (this.elements.mlConfidence) {
        this.elements.mlConfidence.textContent = '--';
      }
    }
  }

  // Convert ML classifier result to gesture data format
  convertMLResultToGesture(mlResult, landmarks) {
    const gestureMap = {
      'none': GESTURES.NONE,
      'point': GESTURES.POINT,
      'pinch': GESTURES.PINCH,
      'fist': GESTURES.FIST,
      'palm': GESTURES.PALM,
      'peace': GESTURES.PEACE,
    };

    // Get position based on gesture type
    let position;
    if (mlResult.gesture === 'point' || mlResult.gesture === 'pinch' || mlResult.gesture === 'peace') {
      position = landmarks[8]; // Index finger tip
    } else {
      position = landmarks[0]; // Wrist
    }

    // Only accept high confidence predictions
    const confidenceThreshold = 0.6;
    const gesture = mlResult.confidence >= confidenceThreshold
      ? gestureMap[mlResult.gesture]
      : GESTURES.NONE;

    return {
      gesture: gesture,
      confidence: mlResult.confidence,
      position: position,
      mlPrediction: mlResult,
    };
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
      <div style="color: #ff4444; font-size: 48px; margin-bottom: 20px;">⚠️</div>
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
