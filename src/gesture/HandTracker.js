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

    // Cyber smoothing
    this.smoothedLandmarks = { Left: [], Right: [] };
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Initialize MediaPipe Hands
        this.hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
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
    const label = handedness.label;
    const ctx = this.ctx;

    // Smoothing logic
    if (!this.smoothedLandmarks[label] || this.smoothedLandmarks[label].length === 0) {
      this.smoothedLandmarks[label] = landmarks.map(p => ({ ...p }));
    } else {
      landmarks.forEach((p, i) => {
        if (this.smoothedLandmarks[label][i]) {
          this.smoothedLandmarks[label][i].x += (p.x - this.smoothedLandmarks[label][i].x) * 0.45;
          this.smoothedLandmarks[label][i].y += (p.y - this.smoothedLandmarks[label][i].y) * 0.45;
          this.smoothedLandmarks[label][i].z += (p.z - this.smoothedLandmarks[label][i].z) * 0.1;
        }
      });
    }

    const pts = this.smoothedLandmarks[label];

    // Cyber Style Drawing
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
    ctx.lineWidth = 2;

    const CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [9, 10], [10, 11], [11, 12],
      [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17], [0, 5]
    ];

    CONNECTIONS.forEach(([a, b]) => {
      if (pts[a] && pts[b]) {
        ctx.moveTo(pts[a].x * width, pts[a].y * height);
        ctx.lineTo(pts[b].x * width, pts[b].y * height);
      }
    });
    ctx.stroke();

    // Draw joints
    pts.forEach((pt, i) => {
      const x = pt.x * width;
      const y = pt.y * height;

      if ([4, 8, 12, 16, 20].includes(i)) {
        // Fingertips: Hollow Box
        ctx.strokeStyle = "#00f0ff";
        ctx.strokeRect(x - 6, y - 6, 12, 12);
      } else {
        // Joints: Filled small box
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    });

    // Reset shadow
    ctx.shadowBlur = 0;
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
