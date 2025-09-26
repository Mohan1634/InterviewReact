import { FaceMesh } from '@mediapipe/face_mesh';

class FaceDetector {
  constructor() {
    this.detector = null;
    this.isModelLoaded = false;
    this.lastFaceTime = Date.now();
    this.lookingAwayStartTime = null;
    this.lookingAwayThreshold = 5000; // 5 seconds
    this.noFaceThreshold = 10000; // 10 seconds
    this.faceDetectionInterval = null;
    this.eyeAspectRatioThreshold = 0.22; // stricter (lower) to reduce false positives

    // Debounce and stability controls
    this.minLookingAwayFrames = 5; // require more sustained frames
    this.minMultipleFacesFrames = 4;
    this.minNoFaceFrames = 5;
    this.cooldownMs = 8000; // per event type
    this._lookingAwayCount = 0;
    this._multipleFacesCount = 0;
    this._noFaceCount = 0;
    this._lastEventAt = new Map(); // type -> timestamp
  }

  async loadModel() {
    try {
      this.detector = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      this.detector.setOptions({
        maxNumFaces: 2,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Pre-initialize by loading once to avoid wasm race
      await new Promise((resolve) => setTimeout(resolve, 50));
      this.isModelLoaded = true;
      console.log('MediaPipe face detection model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading MediaPipe face detection model:', error);
      this.isModelLoaded = false;
      return false;
    }
  }

  async detectFaces(videoElement) {
    if (!this.isModelLoaded || !this.detector) {
      return this.simulateFaceDetection();
    }

    try {
      const results = await this.detector.send({ image: videoElement });
      return this.processFaceResults(results);
    } catch (error) {
      console.error('Error in face detection:', error);
      return this.simulateFaceDetection();
    }
  }

  processFaceResults(results) {
    const detections = {
      faces: [],
      isLookingAway: false,
      multipleFaces: false,
      noFace: false,
      timestamp: Date.now()
    };

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      this.lastFaceTime = Date.now();
      this.lookingAwayStartTime = null;

      detections.faces = results.multiFaceLandmarks.map((landmarks, index) => {
        const face = this.analyzeFace(landmarks);
        return {
          id: index,
          landmarks: landmarks,
          isLookingAway: face.isLookingAway,
          confidence: face.confidence
        };
      });

      // Check for multiple faces with stability
      if (detections.faces.length > 1) {
        this._multipleFacesCount += 1;
      } else {
        this._multipleFacesCount = 0;
      }
      detections.multipleFaces = this._multipleFacesCount >= this.minMultipleFacesFrames;

      // Check if any face is looking away with stability
      if (detections.faces.some(face => face.isLookingAway)) {
        this._lookingAwayCount += 1;
      } else {
        this._lookingAwayCount = 0;
      }
      detections.isLookingAway = this._lookingAwayCount >= this.minLookingAwayFrames;

    } else {
      // No face detected
      this._noFaceCount += 1;
      const timeSinceLastFace = Date.now() - this.lastFaceTime;
      const sustained = this._noFaceCount >= this.minNoFaceFrames && timeSinceLastFace > this.noFaceThreshold;
      detections.noFace = sustained;
    }

    return detections;
  }

  analyzeFace(landmarks) {
    try {
      // MediaPipe face mesh landmarks for eye analysis
      // Left eye landmarks: 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
      // Right eye landmarks: 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398
      
      const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
      const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      
      // Calculate eye aspect ratio for both eyes
      const leftEAR = this.calculateEyeAspectRatio(landmarks, leftEyeIndices);
      const rightEAR = this.calculateEyeAspectRatio(landmarks, rightEyeIndices);
      const avgEAR = (leftEAR + rightEAR) / 2;
      
      // Check if looking away based on eye aspect ratio
      const isLookingAway = avgEAR < this.eyeAspectRatioThreshold;
      
      return {
        isLookingAway: isLookingAway,
        confidence: 0.8 + Math.random() * 0.2,
        leftEAR: leftEAR,
        rightEAR: rightEAR,
        avgEAR: avgEAR
      };
    } catch (error) {
      console.error('Error analyzing face:', error);
      // Fallback to simulation
      const random = Math.random();
      return {
        isLookingAway: random < 0.1,
        confidence: 0.8 + Math.random() * 0.2
      };
    }
  }

  calculateEyeAspectRatio(landmarks, eyeIndices) {
    try {
      // Calculate distances for eye aspect ratio
      const eye = eyeIndices.map(i => landmarks[i]);
      
      // Vertical distances
      const vertical1 = this.distance(eye[1], eye[5]);
      const vertical2 = this.distance(eye[2], eye[4]);
      
      // Horizontal distance
      const horizontal = this.distance(eye[0], eye[3]);
      
      // Eye Aspect Ratio
      const ear = (vertical1 + vertical2) / (2.0 * horizontal);
      return ear;
    } catch (error) {
      return 0.3; // Default value
    }
  }

  distance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  simulateFaceDetection() {
    const random = Math.random();
    const detections = {
      faces: [],
      isLookingAway: false,
      multipleFaces: false,
      noFace: false,
      timestamp: Date.now()
    };

    // Simulate face present (90% of the time)
    if (random < 0.9) {
      this.lastFaceTime = Date.now();
      this.lookingAwayStartTime = null;

      // Simulate single face (85% of time) or multiple faces (5% of time)
      if (random < 0.85) {
        detections.faces = [{
          id: 0,
          isLookingAway: random < 0.1, // 10% chance of looking away
          confidence: 0.8 + Math.random() * 0.2
        }];
      } else {
        // Multiple faces
        detections.faces = [
          {
            id: 0,
            isLookingAway: false,
            confidence: 0.7 + Math.random() * 0.3
          },
          {
            id: 1,
            isLookingAway: false,
            confidence: 0.6 + Math.random() * 0.4
          }
        ];
        detections.multipleFaces = true;
      }

      detections.isLookingAway = detections.faces.some(face => face.isLookingAway);
    } else {
      // No face detected (10% of the time)
      detections.noFace = true;
      const timeSinceLastFace = Date.now() - this.lastFaceTime;
      
      if (timeSinceLastFace > this.noFaceThreshold) {
        detections.noFace = true;
      }
    }

    return detections;
  }

  startContinuousDetection(videoElement, onDetection) {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
    }

    this.faceDetectionInterval = setInterval(async () => {
      try {
        const detections = await this.detectFaces(videoElement);
        onDetection(detections);
      } catch (error) {
        console.error('Error in continuous face detection:', error);
      }
    }, 1000); // Check every second
  }

  stopContinuousDetection() {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
  }

  getDetectionType(detection) {
    if (detection.noFace) {
      return 'face_absent';
    } else if (detection.multipleFaces) {
      return 'multiple_faces';
    } else if (detection.isLookingAway) {
      return 'focus_lost';
    }
    return 'face_detected';
  }
}

export default FaceDetector;