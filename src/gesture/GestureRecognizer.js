import {
  GESTURES,
  PINCH_THRESHOLD,
  FIST_THRESHOLD,
  PALM_THRESHOLD,
  PEACE_THRESHOLD,
  SWIPE_VELOCITY,
  SWIPE_MIN_DISTANCE,
  HAND_LANDMARKS,
} from '../utils/constants.js';

export class GestureRecognizer {
  constructor() {
    this.previousHandPosition = null;
    this.swipeStartPosition = null;
    this.swipeStartTime = null;
    this.lastGesture = GESTURES.NONE;
    this.gestureHoldTime = 0;
  }

  // Calculate distance between two landmarks
  distance(landmark1, landmark2) {
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    const dz = (landmark1.z || 0) - (landmark2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Calculate 2D distance (for screen space calculations)
  distance2D(landmark1, landmark2) {
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Check if a finger is extended
  isFingerExtended(landmarks, fingerTip, fingerPIP, fingerMCP) {
    const tipToMCP = this.distance(landmarks[fingerTip], landmarks[fingerMCP]);
    const pipToMCP = this.distance(landmarks[fingerPIP], landmarks[fingerMCP]);
    return tipToMCP > pipToMCP * 1.2;
  }

  // Check if thumb is extended
  isThumbExtended(landmarks) {
    const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const thumbIP = landmarks[HAND_LANDMARKS.THUMB_IP];
    const thumbMCP = landmarks[HAND_LANDMARKS.THUMB_MCP];
    const indexMCP = landmarks[HAND_LANDMARKS.INDEX_MCP];

    const tipToIndexMCP = this.distance(thumbTip, indexMCP);
    const mcpToIndexMCP = this.distance(thumbMCP, indexMCP);

    return tipToIndexMCP > mcpToIndexMCP;
  }

  // Get extended finger count
  getExtendedFingers(landmarks) {
    const fingers = {
      thumb: this.isThumbExtended(landmarks),
      index: this.isFingerExtended(
        landmarks,
        HAND_LANDMARKS.INDEX_TIP,
        HAND_LANDMARKS.INDEX_PIP,
        HAND_LANDMARKS.INDEX_MCP
      ),
      middle: this.isFingerExtended(
        landmarks,
        HAND_LANDMARKS.MIDDLE_TIP,
        HAND_LANDMARKS.MIDDLE_PIP,
        HAND_LANDMARKS.MIDDLE_MCP
      ),
      ring: this.isFingerExtended(
        landmarks,
        HAND_LANDMARKS.RING_TIP,
        HAND_LANDMARKS.RING_PIP,
        HAND_LANDMARKS.RING_MCP
      ),
      pinky: this.isFingerExtended(
        landmarks,
        HAND_LANDMARKS.PINKY_TIP,
        HAND_LANDMARKS.PINKY_PIP,
        HAND_LANDMARKS.PINKY_MCP
      ),
    };

    return fingers;
  }

  // Detect pinch gesture
  isPinching(landmarks) {
    const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
    const distance = this.distance(thumbTip, indexTip);
    return distance < PINCH_THRESHOLD;
  }

  // Detect fist gesture
  isFist(landmarks) {
    const fingers = this.getExtendedFingers(landmarks);
    const extendedCount = Object.values(fingers).filter(Boolean).length;
    return extendedCount <= 1;
  }

  // Detect open palm gesture
  isOpenPalm(landmarks) {
    const fingers = this.getExtendedFingers(landmarks);
    const extendedCount = Object.values(fingers).filter(Boolean).length;
    return extendedCount >= 4;
  }

  // Detect peace sign (index + middle extended)
  isPeaceSign(landmarks) {
    const fingers = this.getExtendedFingers(landmarks);
    return (
      fingers.index &&
      fingers.middle &&
      !fingers.ring &&
      !fingers.pinky
    );
  }

  // Detect pointing gesture (only index extended)
  isPointing(landmarks) {
    const fingers = this.getExtendedFingers(landmarks);
    return (
      fingers.index &&
      !fingers.middle &&
      !fingers.ring &&
      !fingers.pinky
    );
  }

  // Detect swipe gesture
  detectSwipe(landmarks) {
    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const currentTime = Date.now();

    if (!this.swipeStartPosition) {
      this.swipeStartPosition = { x: wrist.x, y: wrist.y };
      this.swipeStartTime = currentTime;
      return null;
    }

    const dx = wrist.x - this.swipeStartPosition.x;
    const dy = wrist.y - this.swipeStartPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = (currentTime - this.swipeStartTime) / 1000; // seconds

    if (dt > 0.5) {
      // Reset if too slow
      this.swipeStartPosition = { x: wrist.x, y: wrist.y };
      this.swipeStartTime = currentTime;
      return null;
    }

    if (distance > SWIPE_MIN_DISTANCE) {
      const velocity = distance / dt;

      if (velocity > SWIPE_VELOCITY) {
        // Reset for next swipe
        this.swipeStartPosition = null;
        this.swipeStartTime = null;

        // Note: x is mirrored in webcam, so left/right are swapped
        if (Math.abs(dx) > Math.abs(dy)) {
          return dx > 0 ? GESTURES.SWIPE_LEFT : GESTURES.SWIPE_RIGHT;
        }
      }
    }

    return null;
  }

  // Main recognition function
  recognize(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.previousHandPosition = null;
      this.swipeStartPosition = null;
      return { gesture: GESTURES.NONE, confidence: 0 };
    }

    // Check for swipe first (quick gesture)
    const swipe = this.detectSwipe(landmarks);
    if (swipe) {
      return { gesture: swipe, confidence: 0.9 };
    }

    // Check gestures in priority order
    if (this.isPinching(landmarks)) {
      return {
        gesture: GESTURES.PINCH,
        confidence: 0.95,
        position: landmarks[HAND_LANDMARKS.INDEX_TIP],
      };
    }

    if (this.isFist(landmarks)) {
      return {
        gesture: GESTURES.FIST,
        confidence: 0.9,
        position: landmarks[HAND_LANDMARKS.WRIST],
      };
    }

    if (this.isPeaceSign(landmarks)) {
      return {
        gesture: GESTURES.PEACE,
        confidence: 0.85,
        position: landmarks[HAND_LANDMARKS.INDEX_TIP],
      };
    }

    if (this.isOpenPalm(landmarks)) {
      return {
        gesture: GESTURES.PALM,
        confidence: 0.9,
        position: landmarks[HAND_LANDMARKS.WRIST],
      };
    }

    if (this.isPointing(landmarks)) {
      return {
        gesture: GESTURES.POINT,
        confidence: 0.85,
        position: landmarks[HAND_LANDMARKS.INDEX_TIP],
      };
    }

    return {
      gesture: GESTURES.NONE,
      confidence: 0,
      position: landmarks[HAND_LANDMARKS.WRIST],
    };
  }

  // Get hand center position
  getHandCenter(landmarks) {
    if (!landmarks) return null;

    const palm = landmarks[HAND_LANDMARKS.WRIST];
    const indexMCP = landmarks[HAND_LANDMARKS.INDEX_MCP];
    const pinkyMCP = landmarks[HAND_LANDMARKS.PINKY_MCP];

    return {
      x: (palm.x + indexMCP.x + pinkyMCP.x) / 3,
      y: (palm.y + indexMCP.y + pinkyMCP.y) / 3,
      z: (palm.z + indexMCP.z + pinkyMCP.z) / 3,
    };
  }

  // Track hand movement for camera control
  getHandMovement(landmarks) {
    if (!landmarks) {
      this.previousHandPosition = null;
      return null;
    }

    const currentPosition = this.getHandCenter(landmarks);

    if (!this.previousHandPosition) {
      this.previousHandPosition = currentPosition;
      return { dx: 0, dy: 0 };
    }

    const dx = currentPosition.x - this.previousHandPosition.x;
    const dy = currentPosition.y - this.previousHandPosition.y;

    this.previousHandPosition = currentPosition;

    return { dx, dy };
  }
}
