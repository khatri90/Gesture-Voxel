/**
 * Pre-collected gesture training dataset
 * Each sample contains 21 hand landmarks (x, y, z) normalized to hand bounding box
 * Labels: 0=none, 1=point, 2=pinch, 3=fist, 4=palm, 5=peace
 */

// Helper to generate variations of a base pose
function generateVariations(baseLandmarks, numVariations, noiseLevel = 0.02) {
  const variations = [baseLandmarks];

  for (let i = 0; i < numVariations - 1; i++) {
    const varied = baseLandmarks.map(coord =>
      coord + (Math.random() - 0.5) * noiseLevel * 2
    );
    variations.push(varied);
  }

  return variations;
}

// Base hand landmark positions for each gesture (normalized 0-1)
// Format: [wrist_x, wrist_y, wrist_z, thumb_cmc_x, ..., pinky_tip_z] (63 values)

// POINT gesture - index finger extended, others curled
const POINT_BASE = [
  // Wrist
  0.5, 0.9, 0,
  // Thumb (slightly curled)
  0.35, 0.85, -0.02, 0.28, 0.78, -0.03, 0.25, 0.70, -0.02, 0.22, 0.63, -0.01,
  // Index (extended)
  0.45, 0.75, 0, 0.45, 0.55, 0, 0.45, 0.38, 0, 0.45, 0.22, 0,
  // Middle (curled)
  0.5, 0.75, 0, 0.5, 0.65, 0.03, 0.5, 0.60, 0.06, 0.48, 0.58, 0.08,
  // Ring (curled)
  0.55, 0.76, 0, 0.55, 0.67, 0.03, 0.55, 0.62, 0.06, 0.53, 0.60, 0.08,
  // Pinky (curled)
  0.60, 0.78, 0, 0.62, 0.70, 0.02, 0.63, 0.65, 0.05, 0.62, 0.62, 0.07,
];

// PINCH gesture - thumb and index tips touching
const PINCH_BASE = [
  // Wrist
  0.5, 0.9, 0,
  // Thumb (reaching toward index)
  0.38, 0.82, -0.02, 0.35, 0.72, -0.02, 0.38, 0.60, -0.01, 0.42, 0.50, 0,
  // Index (reaching toward thumb)
  0.45, 0.75, 0, 0.45, 0.62, 0, 0.44, 0.52, 0, 0.43, 0.48, 0,
  // Middle (relaxed/slightly curled)
  0.5, 0.75, 0, 0.5, 0.60, 0.01, 0.5, 0.48, 0.02, 0.5, 0.40, 0.02,
  // Ring (relaxed)
  0.55, 0.76, 0, 0.56, 0.62, 0.01, 0.56, 0.50, 0.02, 0.56, 0.42, 0.02,
  // Pinky (relaxed)
  0.60, 0.78, 0, 0.62, 0.66, 0.01, 0.63, 0.56, 0.02, 0.63, 0.48, 0.02,
];

// FIST gesture - all fingers curled into palm
const FIST_BASE = [
  // Wrist
  0.5, 0.9, 0,
  // Thumb (curled over fingers)
  0.38, 0.82, 0.02, 0.35, 0.75, 0.04, 0.38, 0.68, 0.05, 0.42, 0.65, 0.05,
  // Index (tightly curled)
  0.45, 0.75, 0, 0.45, 0.70, 0.05, 0.44, 0.68, 0.08, 0.42, 0.70, 0.08,
  // Middle (tightly curled)
  0.5, 0.75, 0, 0.5, 0.70, 0.05, 0.49, 0.68, 0.08, 0.47, 0.70, 0.08,
  // Ring (tightly curled)
  0.55, 0.76, 0, 0.55, 0.71, 0.05, 0.54, 0.69, 0.08, 0.52, 0.71, 0.08,
  // Pinky (tightly curled)
  0.60, 0.78, 0, 0.60, 0.73, 0.04, 0.59, 0.71, 0.07, 0.57, 0.73, 0.07,
];

// PALM gesture - all fingers extended/spread
const PALM_BASE = [
  // Wrist
  0.5, 0.9, 0,
  // Thumb (extended outward)
  0.32, 0.82, -0.02, 0.22, 0.75, -0.03, 0.15, 0.68, -0.02, 0.10, 0.62, -0.01,
  // Index (extended up)
  0.42, 0.75, 0, 0.40, 0.55, 0, 0.38, 0.38, 0, 0.36, 0.22, 0,
  // Middle (extended up)
  0.5, 0.73, 0, 0.5, 0.52, 0, 0.5, 0.34, 0, 0.5, 0.18, 0,
  // Ring (extended up)
  0.58, 0.74, 0, 0.60, 0.54, 0, 0.62, 0.37, 0, 0.64, 0.22, 0,
  // Pinky (extended up)
  0.66, 0.76, 0, 0.70, 0.58, 0, 0.74, 0.43, 0, 0.78, 0.30, 0,
];

// PEACE gesture - index and middle extended, others curled
const PEACE_BASE = [
  // Wrist
  0.5, 0.9, 0,
  // Thumb (curled)
  0.35, 0.85, 0.02, 0.30, 0.78, 0.03, 0.32, 0.72, 0.04, 0.36, 0.68, 0.04,
  // Index (extended)
  0.43, 0.75, 0, 0.41, 0.55, 0, 0.39, 0.38, 0, 0.37, 0.22, 0,
  // Middle (extended)
  0.52, 0.73, 0, 0.54, 0.53, 0, 0.56, 0.36, 0, 0.58, 0.20, 0,
  // Ring (curled)
  0.58, 0.76, 0, 0.60, 0.68, 0.04, 0.60, 0.64, 0.07, 0.58, 0.65, 0.08,
  // Pinky (curled)
  0.64, 0.78, 0, 0.66, 0.72, 0.03, 0.66, 0.68, 0.06, 0.64, 0.69, 0.07,
];

// NONE gesture - neutral/relaxed hand (partially open)
const NONE_BASE = [
  // Wrist
  0.5, 0.9, 0,
  // Thumb (relaxed)
  0.35, 0.84, -0.01, 0.30, 0.78, -0.01, 0.27, 0.72, 0, 0.25, 0.67, 0,
  // Index (relaxed, slightly bent)
  0.45, 0.75, 0, 0.45, 0.62, 0.01, 0.45, 0.52, 0.02, 0.45, 0.45, 0.03,
  // Middle (relaxed, slightly bent)
  0.5, 0.74, 0, 0.5, 0.60, 0.01, 0.5, 0.50, 0.02, 0.5, 0.43, 0.03,
  // Ring (relaxed, slightly bent)
  0.55, 0.75, 0, 0.55, 0.62, 0.01, 0.55, 0.52, 0.02, 0.55, 0.45, 0.03,
  // Pinky (relaxed, slightly bent)
  0.60, 0.77, 0, 0.62, 0.66, 0.01, 0.63, 0.58, 0.02, 0.63, 0.52, 0.02,
];

// Generate training dataset
const SAMPLES_PER_CLASS = 200;

export function generateDataset() {
  const data = [];
  const labels = [];

  // Class 0: None
  const noneVariations = generateVariations(NONE_BASE, SAMPLES_PER_CLASS, 0.03);
  noneVariations.forEach(sample => {
    data.push(sample);
    labels.push(0);
  });

  // Class 1: Point
  const pointVariations = generateVariations(POINT_BASE, SAMPLES_PER_CLASS, 0.025);
  pointVariations.forEach(sample => {
    data.push(sample);
    labels.push(1);
  });

  // Class 2: Pinch
  const pinchVariations = generateVariations(PINCH_BASE, SAMPLES_PER_CLASS, 0.025);
  pinchVariations.forEach(sample => {
    data.push(sample);
    labels.push(2);
  });

  // Class 3: Fist
  const fistVariations = generateVariations(FIST_BASE, SAMPLES_PER_CLASS, 0.02);
  fistVariations.forEach(sample => {
    data.push(sample);
    labels.push(3);
  });

  // Class 4: Palm
  const palmVariations = generateVariations(PALM_BASE, SAMPLES_PER_CLASS, 0.025);
  palmVariations.forEach(sample => {
    data.push(sample);
    labels.push(4);
  });

  // Class 5: Peace
  const peaceVariations = generateVariations(PEACE_BASE, SAMPLES_PER_CLASS, 0.025);
  peaceVariations.forEach(sample => {
    data.push(sample);
    labels.push(5);
  });

  // Shuffle the dataset
  const indices = Array.from({ length: data.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledData = indices.map(i => data[i]);
  const shuffledLabels = indices.map(i => labels[i]);

  return {
    data: shuffledData,
    labels: shuffledLabels,
    numClasses: 6,
    classNames: ['none', 'point', 'pinch', 'fist', 'palm', 'peace'],
  };
}

// Normalize hand landmarks from MediaPipe format to model input
export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 21) {
    return null;
  }

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const lm of landmarks) {
    minX = Math.min(minX, lm.x);
    maxX = Math.max(maxX, lm.x);
    minY = Math.min(minY, lm.y);
    maxY = Math.max(maxY, lm.y);
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  // Normalize to 0-1 range relative to hand bounding box
  const normalized = [];
  for (const lm of landmarks) {
    normalized.push(
      (lm.x - minX) / width,
      (lm.y - minY) / height,
      lm.z || 0
    );
  }

  return normalized;
}
