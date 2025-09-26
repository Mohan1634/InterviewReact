import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStop, FaPlay, FaPause, FaExclamationTriangle, FaEye, FaUser, FaMobile, FaBook } from 'react-icons/fa';
import { useSimpleDetection } from '../context/SimpleDetectionContext';
import axios from 'axios';
import { server } from '../index';
const SimpleInterviewRoom = () => {
  const navigate = useNavigate();
  const {
    isRecording,
    candidateName,
    events,
    focusLost,
    suspiciousEvents,
    integrityScore,
    alerts,
    endSession,
    addEvent,
    addAlert
  } = useSimpleDetection();

  const videoRef = useRef(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Simple detection simulation (since we removed complex AI libraries)
  const [detectionInterval, setDetectionInterval] = useState(null);
  // const [lastFaceTime, setLastFaceTime] = useState(Date.now());
  const [isLookingAway, setIsLookingAway] = useState(false);

  useEffect(() => {
    if (!isRecording) {
      navigate('/');
      return;
    }

    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreamActive(true);
          setSessionStartTime(Date.now());
          startSimpleDetection();
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        addAlert({
          type: 'error',
          message: 'Unable to access camera. Please check permissions.',
          duration: 5000
        });
      }
    };

    initStream();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      if (detectionInterval) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
      
      setIsStreamActive(false);
    };
  }, [isRecording, navigate, addAlert]);

  useEffect(() => {
    let interval;
    if (isStreamActive && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreamActive, isPaused, sessionStartTime]);


  const startSimpleDetection = () => {
    // Simple detection simulation - in real implementation, this would use AI models
    const interval = setInterval(() => {
      simulateDetection();
    }, 2000); // Check every 2 seconds
    
    setDetectionInterval(interval);
  };

  const simulateDetection = () => {
    // Simulate random events for demo purposes
    const random = Math.random();

    if (random < 0.1) { // 10% chance of focus lost
      handleFocusLost();
    } else if (random < 0.05) { // 5% chance of face absent
      handleFaceAbsent();
    } else if (random < 0.03) { // 3% chance of phone detected
      handlePhoneDetected();
    } else if (random < 0.02) { // 2% chance of book detected
      handleBookDetected();
    }
  };

  const handleFocusLost = () => {
    const event = {
      eventType: 'focus_lost',
      duration: 5000,
      confidence: 0.8,
      details: 'User looking away from screen',
      deduction: 5
    };
    addEvent(event);
    addAlert({
      type: 'warning',
      message: '⚠️ User is looking away from screen',
      duration: 3000
    });
    setIsLookingAway(true);
    setTimeout(() => setIsLookingAway(false), 5000);
  };

  const handleFaceAbsent = () => {
    const event = {
      eventType: 'face_absent',
      duration: 10000,
      confidence: 0.9,
      details: 'No face detected in frame',
      deduction: 10
    };
    addEvent(event);
    addAlert({
      type: 'danger',
      message: '🚨 No face detected - user may have left',
      duration: 5000
    });
  };

  const handlePhoneDetected = () => {
    const event = {
      eventType: 'phone_detected',
      duration: 0,
      confidence: 0.8,
      details: 'Mobile phone detected in frame',
      deduction: 20
    };
    addEvent(event);
    addAlert({
      type: 'danger',
      message: '🚨 Mobile phone detected',
      duration: 5000
    });
  };

  const handleBookDetected = () => {
    const event = {
      eventType: 'book_detected',
      duration: 0,
      confidence: 0.8,
      details: 'Book or notes detected in frame',
      deduction: 20
    };
    addEvent(event);
    addAlert({
      type: 'danger',
      message: '🚨 Book or notes detected',
      duration: 5000
    });
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    
    if (isPaused) {
      startSimpleDetection();
    } else {
      if (detectionInterval) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
    }
  };

  const handleEndSession = async () => {
    try {
      // Save session to backend
      const sessionData = {
        candidateName,
        startTime: sessionStartTime,
        endTime: new Date(),
        duration: Math.floor(sessionDuration / 60),
        totalEvents: events.length,
        focusLostCount: focusLost,
        suspiciousEventsCount: suspiciousEvents,
        integrityScore,
        events
      };

      await axios.post('/api/sessions', sessionData);
      
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      if (detectionInterval) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
      
      setIsStreamActive(false);
      
      endSession();
      navigate('/reports');
    } catch (error) {
      console.error('Error saving session:', error);
      addAlert({
        type: 'error',
        message: 'Error saving session data',
        duration: 3000
      });
    }
  };


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'focus_lost': return <FaEye className="text-yellow-600" />;
      case 'face_absent': return <FaUser className="text-red-600" />;
      case 'multiple_faces': return <FaUser className="text-red-600" />;
      case 'phone_detected': return <FaMobile className="text-red-600" />;
      case 'book_detected': return <FaBook className="text-red-600" />;
      default: return <FaExclamationTriangle className="text-yellow-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Room</h1>
          <p className="text-gray-600">Candidate: {candidateName}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isStreamActive ? 'bg-green-500 pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isStreamActive ? 'Live' : 'Offline'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Duration: {formatTime(sessionDuration)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="relative">
              <div className="video-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                />
                
                {/* Status indicators */}
                <div className="absolute top-4 left-4 flex flex-col space-y-2">
                  {isLookingAway && (
                    <div className="status-badge">
                      Looking Away
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 mt-4">
              <button
                onClick={handlePauseResume}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                {isPaused ? <FaPlay /> : <FaPause />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              
              <button
                onClick={handleEndSession}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <FaStop />
                <span>End Session</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Integrity Score */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integrity Score</h3>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                integrityScore >= 80 ? 'text-green-600' : 
                integrityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {integrityScore}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    integrityScore >= 80 ? 'bg-green-500' : 
                    integrityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${integrityScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Event Summary */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Focus Lost:</span>
                <span className="font-medium">{focusLost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Suspicious Events:</span>
                <span className="font-medium">{suspiciousEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Events:</span>
                <span className="font-medium">{events.length}</span>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.slice(-5).reverse().map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  {getEventIcon(event.eventType)}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {event.eventType.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No events detected yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-l-4 font-medium ${
              alert.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
              alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 
              'bg-green-50 border-green-500 text-green-700'
            }`}
          >
            {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleInterviewRoom;
