import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import ObjectDetector from '../utils/objectDetection';
import FaceDetector from '../utils/faceDetection';
import axios from 'axios';
import { server } from '../config';

const DetectionContext = createContext();

const initialState = {
  isRecording: false,
  candidateName: '',
  sessionId: null,
  events: [],
  focusLost: 0,
  suspiciousEvents: 0,
  integrityScore: 100,
  alerts: [],
  detectionStats: {
    totalDetections: 0,
    faceDetections: 0,
    objectDetections: 0,
    phoneDetections: 0,
    bookDetections: 0,
    deviceDetections: 0
  }
};

const detectionReducer = (state, action) => {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        isRecording: true,
        candidateName: action.payload.candidateName,
        sessionId: action.payload.sessionId,
        events: [],
        focusLost: 0,
        suspiciousEvents: 0,
        integrityScore: 100,
        alerts: [],
        detectionStats: {
          totalDetections: 0,
          faceDetections: 0,
          objectDetections: 0,
          phoneDetections: 0,
          bookDetections: 0,
          deviceDetections: 0
        }
      };

    case 'END_SESSION':
      return {
        ...state,
        isRecording: false,
        candidateName: '',
        sessionId: null
      };

    case 'ADD_EVENT':
      const newEvent = {
        id: Date.now(),
        timestamp: new Date(),
        ...action.payload
      };

      let updatedFocusLost = state.focusLost;
      let updatedSuspiciousEvents = state.suspiciousEvents;
      let updatedIntegrityScore = state.integrityScore;

      // Update counters based on event type
      if (action.payload.eventType === 'focus_lost') {
        updatedFocusLost += 1;
        updatedIntegrityScore = Math.max(0, updatedIntegrityScore - 5);
      } else if (['phone_detected', 'book_detected', 'device_detected', 'multiple_faces'].includes(action.payload.eventType)) {
        updatedSuspiciousEvents += 1;
        updatedIntegrityScore = Math.max(0, updatedIntegrityScore - 10);
      }

      // Update detection stats
      const updatedStats = { ...state.detectionStats };
      updatedStats.totalDetections += 1;

      if (['focus_lost', 'face_absent', 'multiple_faces'].includes(action.payload.eventType)) {
        updatedStats.faceDetections += 1;
      } else if (['phone_detected', 'book_detected', 'device_detected'].includes(action.payload.eventType)) {
        updatedStats.objectDetections += 1;
        
        if (action.payload.eventType === 'phone_detected') {
          updatedStats.phoneDetections += 1;
        } else if (action.payload.eventType === 'book_detected') {
          updatedStats.bookDetections += 1;
        } else if (action.payload.eventType === 'device_detected') {
          updatedStats.deviceDetections += 1;
        }
      }

      return {
        ...state,
        events: [...state.events, newEvent],
        focusLost: updatedFocusLost,
        suspiciousEvents: updatedSuspiciousEvents,
        integrityScore: updatedIntegrityScore,
        detectionStats: updatedStats
      };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, { id: Date.now(), ...action.payload }]
      };

    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload)
      };

    default:
      return state;
  }
};

export const DetectionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(detectionReducer, initialState);
  const objectDetectorRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize AI models when component mounts
    const initializeModels = async () => {
      try {
        // Initialize object detector
        objectDetectorRef.current = new ObjectDetector();
        await objectDetectorRef.current.loadModel();

        // Initialize face detector
        faceDetectorRef.current = new FaceDetector();
        await faceDetectorRef.current.loadModel();

        console.log('AI models initialized successfully');
      } catch (error) {
        console.error('Error initializing AI models:', error);
      }
    };

    initializeModels();

    return () => {
      // Cleanup
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const startSession = (candidateName) => {
    const sessionId = `session_${Date.now()}`;
    dispatch({
      type: 'START_SESSION',
      payload: { candidateName, sessionId }
    });
    return sessionId;
  };

  const endSession = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    dispatch({ type: 'END_SESSION' });
  };

  const addEvent = (eventData) => {
    dispatch({
      type: 'ADD_EVENT',
      payload: eventData
    });

    // Send event to backend
    sendEventToBackend(eventData);
  };

  const addAlert = (alertData) => {
    dispatch({
      type: 'ADD_ALERT',
      payload: alertData
    });

    // Auto-remove alert after duration
    if (alertData.duration) {
      setTimeout(() => {
        dispatch({
          type: 'REMOVE_ALERT',
          payload: alertData.id
        });
      }, alertData.duration);
    }
  };

  const removeAlert = (alertId) => {
    dispatch({
      type: 'REMOVE_ALERT',
      payload: alertId
    });
  };

  const sendEventToBackend = async (eventData) => {
    try {
      await axios.post(`${server}/api/events`, {
        candidateName: state.candidateName,
        sessionId: state.sessionId,
        ...eventData
      });
    } catch (error) {
      console.error('Error sending event to backend:', error);
    }
  };

  const startDetection = (videoElement) => {
    if (!videoElement || !objectDetectorRef.current || !faceDetectorRef.current) {
      console.error('Detection not ready - missing video element or AI models');
      return;
    }

    videoRef.current = videoElement;

    // Start continuous detection
    detectionIntervalRef.current = setInterval(async () => {
      try {
        // Run face detection
        const faceDetections = await faceDetectorRef.current.detectFaces(videoElement);
        processFaceDetections(faceDetections);

        // Run object detection
        const objectDetections = await objectDetectorRef.current.detectObjects(videoElement);
        processObjectDetections(objectDetections);

      } catch (error) {
        console.error('Error in detection loop:', error);
      }
    }, 2000); // Run detection every 2 seconds
  };

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const processFaceDetections = (detections) => {
    if (detections.noFace) {
      addEvent({
        eventType: 'face_absent',
        duration: 0,
        confidence: 0.8,
        details: 'No face detected in frame'
      });
    } else if (detections.multipleFaces) {
      addEvent({
        eventType: 'multiple_faces',
        duration: 0,
        confidence: 0.9,
        details: `Multiple faces detected: ${detections.faces.length}`
      });
    } else if (detections.isLookingAway) {
      addEvent({
        eventType: 'focus_lost',
        duration: 0,
        confidence: 0.7,
        details: 'User looking away from screen'
      });
    }
  };

  const processObjectDetections = (detections) => {
    detections.forEach(detection => {
      if (objectDetectorRef.current.isSuspiciousObject(detection)) {
        const eventType = objectDetectorRef.current.getDetectionType(detection);
        
        addEvent({
          eventType: eventType,
          duration: 0,
          confidence: detection.confidence,
          details: `${detection.class} detected with ${(detection.confidence * 100).toFixed(1)}% confidence`
        });

        // Add alert for suspicious objects
        addAlert({
          type: 'warning',
          message: `${detection.class} detected!`,
          duration: 5000
        });
      }
    });
  };

  const value = {
    ...state,
    startSession,
    endSession,
    addEvent,
    addAlert,
    removeAlert,
    startDetection,
    stopDetection
  };

  return (
    <DetectionContext.Provider value={value}>
      {children}
    </DetectionContext.Provider>
  );
};

export const useDetection = () => {
  const context = useContext(DetectionContext);
  if (!context) {
    throw new Error('useDetection must be used within a DetectionProvider');
  }
  return context;
};