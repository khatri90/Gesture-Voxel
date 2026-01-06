// Grid configuration
export const GRID_SIZE = 16;
export const VOXEL_SIZE = 1;
export const MAX_VOXELS = GRID_SIZE * GRID_SIZE * GRID_SIZE;

// Vibrant color palette
export const COLORS = [
  0xff0080, // Hot Pink
  0x00ffff, // Cyan
  0xffff00, // Yellow
  0xff4400, // Orange
  0x00ff00, // Lime Green
  0x8800ff, // Purple
  0x0088ff, // Electric Blue
  0xff0000, // Red
];

// Gesture detection thresholds
export const PINCH_THRESHOLD = 0.07;
export const FIST_THRESHOLD = 0.25;
export const PALM_THRESHOLD = 0.12;
export const PEACE_THRESHOLD = 0.08;
export const SWIPE_VELOCITY = 0.15;
export const SWIPE_MIN_DISTANCE = 0.2;

// Debounce times (ms)
export const ACTION_DEBOUNCE = 300;
export const COLOR_CHANGE_DEBOUNCE = 500;
export const UNDO_DEBOUNCE = 600;

// Camera settings
export const CAMERA_DISTANCE = 25;
export const CAMERA_FOV = 50;
export const ORBIT_SENSITIVITY = 2;
export const ZOOM_SENSITIVITY = 0.5;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 50;

// Gesture types
export const GESTURES = {
  NONE: 'NONE',
  POINT: 'POINT',
  PINCH: 'PINCH',
  FIST: 'FIST',
  PALM: 'PALM',
  PEACE: 'PEACE',
  SWIPE_LEFT: 'SWIPE_LEFT',
  SWIPE_RIGHT: 'SWIPE_RIGHT',
};

// Mode types
export const MODES = {
  PLACE: 'PLACE MODE',
  DELETE: 'DELETE MODE',
  ORBIT: 'ORBIT MODE',
  COLOR: 'COLOR MODE',
};

// Hand landmark indices
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};
