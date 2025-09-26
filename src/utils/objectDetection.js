import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class ObjectDetector {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.detectionThreshold = 0.75; // higher threshold to reduce false positives
    this.targetClasses = ['cell phone', 'book', 'laptop', 'mouse', 'keyboard', 'person'];
    this.cocoClasses = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
      'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
      'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
      'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
      'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
      'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
      'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
    ];

    // Stability and cooldown controls
    this.minStableFrames = 2; // require detection in N consecutive frames
    this.cooldownMs = 8000; // don't re-fire same class event within this window
    this._stableCounts = new Map(); // class -> count
    this._lastFiredAt = new Map(); // class -> timestamp
  }

  async loadModel() {
    try {
      this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      this.isModelLoaded = true;
      console.log('coco-ssd model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading coco-ssd:', error);
      this.isModelLoaded = false;
      return false;
    }
  }

  async detectObjects(videoElement) {
    if (!this.isModelLoaded || !this.model) {
      // Fallback: avoid noisy simulated detections in production
      return [];
    }

    try {
      // Create a canvas to capture video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Run coco-ssd directly on canvas
      const predictions = await this.model.detect(canvas);
      
      // Map predictions to our format
      let detections = predictions
        .filter(p => p.score >= this.detectionThreshold)
        .map(p => ({
          class: p.class,
          confidence: p.score,
          bbox: [p.bbox[1], p.bbox[0], p.bbox[1] + p.bbox[3], p.bbox[0] + p.bbox[2]],
          timestamp: Date.now()
        }))
        .filter(d => this.targetClasses.includes(d.class));

      // Stability and cooldown filtering
      detections = this.filterStableDetections(detections);
      
      return detections;
    } catch (error) {
      console.error('Error in TensorFlow.js object detection:', error);
      return [];
    }
  }

  simulateDetection() {
    // Disable simulation to decrease false positives during development
    return [];
  }

  isSuspiciousObject(detection) {
    const suspiciousClasses = ['cell phone', 'book', 'laptop', 'mouse', 'keyboard'];
    return suspiciousClasses.includes(detection.class) && detection.confidence > this.detectionThreshold;
  }

  getDetectionType(detection) {
    switch (detection.class) {
      case 'cell phone':
        return 'phone_detected';
      case 'book':
        return 'book_detected';
      case 'laptop':
      case 'mouse':
      case 'keyboard':
        return 'device_detected';
      default:
        return 'unknown_object';
    }
  }

  // Require detections to be stable across consecutive frames and respect cooldowns
  filterStableDetections(detections) {
    const now = Date.now();

    // Increment counts for detected classes this frame
    const seenThisFrame = new Set();
    for (const det of detections) {
      const key = det.class;
      seenThisFrame.add(key);
      const prev = this._stableCounts.get(key) || 0;
      this._stableCounts.set(key, prev + 1);
    }

    // Decay counts for classes not seen this frame
    for (const [key, count] of this._stableCounts.entries()) {
      if (!seenThisFrame.has(key)) {
        // reset if missed
        this._stableCounts.set(key, 0);
      }
    }

    const filtered = [];
    for (const det of detections) {
      const key = det.class;
      const stableCount = this._stableCounts.get(key) || 0;
      const lastFired = this._lastFiredAt.get(key) || 0;
      const cooledDown = now - lastFired >= this.cooldownMs;

      if (stableCount >= this.minStableFrames && cooledDown && det.confidence >= this.detectionThreshold) {
        filtered.push(det);
        this._lastFiredAt.set(key, now);
        // reset the counter to avoid immediate re-trigger
        this._stableCounts.set(key, 0);
      }
    }

    return filtered;
  }
}

export default ObjectDetector;

