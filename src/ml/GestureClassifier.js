/**
 * Neural Network Gesture Classifier using TensorFlow.js
 * Trained on hand landmark data to classify gestures
 */

import { generateDataset, normalizeLandmarks } from './gestureDataset.js';

export class GestureClassifier {
  constructor() {
    this.model = null;
    this.isTraining = false;
    this.isTrained = false;
    this.classNames = ['none', 'point', 'pinch', 'fist', 'palm', 'peace'];
    this.trainingHistory = null;
    this.accuracy = 0;

    // UI elements for status updates
    this.statusElement = null;
    this.accuracyElement = null;
    this.inferenceElement = null;
    this.loadingBar = null;
    this.loadingText = null;
  }

  // Set UI elements for status updates
  setUIElements(elements) {
    this.statusElement = elements.status;
    this.accuracyElement = elements.accuracy;
    this.inferenceElement = elements.inference;
    this.loadingBar = elements.loadingBar;
    this.loadingText = elements.loadingText;
  }

  updateLoadingProgress(percent, text) {
    if (this.loadingBar) {
      this.loadingBar.style.width = `${percent}%`;
    }
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
  }

  updateStatus(status, isReady = false) {
    if (this.statusElement) {
      this.statusElement.textContent = status;
      this.statusElement.className = isReady ? 'status-ready' : 'status-loading';
    }
  }

  // Build the neural network model
  buildModel() {
    const tf = window.tf;

    const model = tf.sequential();

    // Input layer: 21 landmarks * 3 coords = 63 features
    model.add(tf.layers.dense({
      inputShape: [63],
      units: 128,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    }));

    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Hidden layer 1
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    }));

    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Hidden layer 2
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    }));

    // Output layer: 6 gesture classes
    model.add(tf.layers.dense({
      units: 6,
      activation: 'softmax',
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  // Train the model on the dataset
  async train(onProgress = null) {
    const tf = window.tf;

    if (this.isTraining) {
      console.warn('Already training');
      return;
    }

    this.isTraining = true;
    this.updateStatus('Building model...');
    this.updateLoadingProgress(10, 'Building neural network...');

    try {
      // Build model
      this.model = this.buildModel();
      console.log('Model built successfully');
      this.model.summary();

      this.updateLoadingProgress(20, 'Generating training data...');
      this.updateStatus('Generating data...');

      // Generate dataset
      const dataset = generateDataset();
      console.log(`Dataset generated: ${dataset.data.length} samples`);

      this.updateLoadingProgress(30, 'Preparing tensors...');

      // Convert to tensors
      const xs = tf.tensor2d(dataset.data);
      const ys = tf.oneHot(tf.tensor1d(dataset.labels, 'int32'), dataset.numClasses);

      // Split into train/validation (80/20)
      const splitIdx = Math.floor(dataset.data.length * 0.8);

      const xTrain = xs.slice([0, 0], [splitIdx, 63]);
      const yTrain = ys.slice([0, 0], [splitIdx, 6]);
      const xVal = xs.slice([splitIdx, 0], [-1, 63]);
      const yVal = ys.slice([splitIdx, 0], [-1, 6]);

      this.updateLoadingProgress(40, 'Training neural network...');
      this.updateStatus('Training...');

      // Train the model
      const epochs = 50;
      this.trainingHistory = await this.model.fit(xTrain, yTrain, {
        epochs: epochs,
        batchSize: 32,
        validationData: [xVal, yVal],
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = 40 + (epoch / epochs) * 50;
            this.updateLoadingProgress(progress, `Training epoch ${epoch + 1}/${epochs}...`);

            if (onProgress) {
              onProgress({
                epoch: epoch + 1,
                totalEpochs: epochs,
                loss: logs.loss,
                accuracy: logs.acc,
                valLoss: logs.val_loss,
                valAccuracy: logs.val_acc,
              });
            }

            console.log(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}, val_acc=${logs.val_acc.toFixed(4)}`);
          },
        },
      });

      // Store final accuracy
      const finalAcc = this.trainingHistory.history.val_acc;
      this.accuracy = finalAcc[finalAcc.length - 1];

      // Clean up tensors
      xs.dispose();
      ys.dispose();
      xTrain.dispose();
      yTrain.dispose();
      xVal.dispose();
      yVal.dispose();

      this.isTrained = true;
      this.isTraining = false;

      this.updateLoadingProgress(100, 'Model ready!');
      this.updateStatus('Ready', true);

      if (this.accuracyElement) {
        this.accuracyElement.textContent = `${(this.accuracy * 100).toFixed(1)}%`;
      }

      console.log(`Training complete! Accuracy: ${(this.accuracy * 100).toFixed(1)}%`);

      return this.accuracy;
    } catch (error) {
      console.error('Training error:', error);
      this.isTraining = false;
      this.updateStatus('Error');
      throw error;
    }
  }

  // Predict gesture from hand landmarks
  predict(landmarks) {
    const tf = window.tf;

    if (!this.isTrained || !this.model) {
      return { gesture: 'none', confidence: 0, predictions: null };
    }

    // Normalize landmarks
    const normalized = normalizeLandmarks(landmarks);
    if (!normalized) {
      return { gesture: 'none', confidence: 0, predictions: null };
    }

    const startTime = performance.now();

    // Run inference
    const inputTensor = tf.tensor2d([normalized]);
    const predictions = this.model.predict(inputTensor);
    const probabilities = predictions.dataSync();

    // Clean up
    inputTensor.dispose();
    predictions.dispose();

    const inferenceTime = performance.now() - startTime;

    // Update UI
    if (this.inferenceElement) {
      this.inferenceElement.textContent = `${inferenceTime.toFixed(1)}ms`;
    }

    // Find best prediction
    let maxIdx = 0;
    let maxProb = probabilities[0];

    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIdx = i;
      }
    }

    // Convert to array for easier access
    const predictionArray = Array.from(probabilities);

    return {
      gesture: this.classNames[maxIdx],
      gestureIndex: maxIdx,
      confidence: maxProb,
      predictions: predictionArray,
      inferenceTime: inferenceTime,
    };
  }

  // Get model info
  getModelInfo() {
    if (!this.model) {
      return null;
    }

    return {
      layers: this.model.layers.length,
      params: this.model.countParams(),
      trained: this.isTrained,
      accuracy: this.accuracy,
    };
  }
}
