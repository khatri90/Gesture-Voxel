export class HandTracker {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.hands = null;
    this.camera = null;
    this.isRunning = false;

    this.listeners = new Set();
    this.lastResults = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Initialize MediaPipe Hands
        this.hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        this.hands.onResults((results) => this.onResults(results));

        // Initialize camera
        this.camera = new window.Camera(this.video, {
          onFrame: async () => {
            if (this.isRunning) {
              await this.hands.send({ image: this.video });
            }
          },
          width: 640,
          height: 480,
        });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async start() {
    this.isRunning = true;
    await this.camera.start();

    // Resize canvas to match video
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  resizeCanvas() {
    const rect = this.video.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  onResults(results) {
    this.lastResults = results;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw hand landmarks
    if (results.multiHandLandmarks) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        this.drawHand(landmarks, handedness);
      }
    }

    // Notify listeners
    this.notifyListeners(results);
  }

  drawHand(landmarks, handedness) {
    const { width, height } = this.canvas;

    // Determine hand color based on handedness
    const isLeft = handedness.label === 'Left';
    const primaryColor = isLeft ? '#00ffff' : '#ff0080';
    const secondaryColor = isLeft ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 0, 128, 0.3)';

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17],             // Palm
    ];

    this.ctx.strokeStyle = primaryColor;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    for (const [start, end] of connections) {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      this.ctx.beginPath();
      this.ctx.moveTo(startPoint.x * width, startPoint.y * height);
      this.ctx.lineTo(endPoint.x * width, endPoint.y * height);
      this.ctx.stroke();
    }

    // Draw landmarks as circles
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const x = landmark.x * width;
      const y = landmark.y * height;

      // Larger circles for fingertips
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const radius = isTip ? 8 : 5;

      // Glow effect
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = secondaryColor;
      this.ctx.fill();

      // Main circle
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = primaryColor;
      this.ctx.fill();

      // White center for tips
      if (isTip) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(results) {
    for (const listener of this.listeners) {
      listener(results);
    }
  }

  getLastResults() {
    return this.lastResults;
  }
}
