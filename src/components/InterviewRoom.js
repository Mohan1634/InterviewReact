import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaPause, FaStop, FaCamera, FaClock, FaExclamationTriangle, FaCheckCircle, FaMobile, FaBook, FaLaptop } from 'react-icons/fa';
import { useDetection } from '../context/DetectionContext';
import axios from 'axios';
import { server } from '../config';
const InterviewRoom = () => {
  const navigate = useNavigate();
  const {
    isRecording,
    candidateName,
    events,
    focusLost,
    suspiciousEvents,
    integrityScore,
    alerts,
    detectionStats,
    endSession,
    startDetection,
    stopDetection,
    addAlert
  } = useDetection();

  const videoRef = useRef(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (!isRecording) {
      navigate('/');
      return;
    }

    const initializeVideoStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setIsStreamActive(true);
          setSessionStartTime(Date.now());
          
          // Start AI detection
          startDetection(videoRef.current);
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

    initializeVideoStream();

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, navigate, addAlert, startDetection, stopDetection]);

  useEffect(() => {
    let interval;
    if (isStreamActive && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreamActive, isPaused, sessionStartTime]);

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopDetection();
    setIsStreamActive(false);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      // Resume detection
      if (videoRef.current) {
        startDetection(videoRef.current);
      }
    } else {
      // Pause detection
      stopDetection();
    }
    setIsPaused(!isPaused);
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
        events,
        detectionStats
      };

      await axios.post(`${server}/api/sessions`, sessionData);

      cleanup();
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

  const getIntegrityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'phone_detected':
        return <FaMobile className="text-red-500" />;
      case 'book_detected':
        return <FaBook className="text-orange-500" />;
      case 'device_detected':
        return <FaLaptop className="text-purple-500" />;
      case 'focus_lost':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'face_absent':
        return <FaCamera className="text-red-500" />;
      case 'multiple_faces':
        return <FaExclamationTriangle className="text-red-500" />;
      default:
        return <FaCheckCircle className="text-green-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Interview Room</h2>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isStreamActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isStreamActive ? 'Recording' : 'Not Recording'}
                </span>
              </div>
            </div>

            <div className="video-container mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto rounded-lg"
                style={{ maxHeight: '480px' }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                onClick={handlePauseResume}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPaused
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {isPaused ? <FaPlay /> : <FaPause />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={handleEndSession}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <FaStop />
                <span>End Session</span>
              </button>
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <FaClock className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">Duration</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{formatTime(sessionDuration)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <FaCheckCircle className="text-green-500" />
                  <span className="text-sm font-medium text-gray-600">Integrity Score</span>
                </div>
                <div className={`text-xl font-bold ${getIntegrityColor(integrityScore)}`}>
                  {integrityScore}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detection Panel */}
        <div className="space-y-6">
          {/* Detection Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Detection Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Detections</span>
                <span className="font-semibold">{detectionStats.totalDetections}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Face Detections</span>
                <span className="font-semibold">{detectionStats.faceDetections}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Object Detections</span>
                <span className="font-semibold">{detectionStats.objectDetections}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phone Detections</span>
                <span className="font-semibold text-red-600">{detectionStats.phoneDetections}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Book Detections</span>
                <span className="font-semibold text-orange-600">{detectionStats.bookDetections}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Device Detections</span>
                <span className="font-semibold text-purple-600">{detectionStats.deviceDetections}</span>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.slice(-10).reverse().map((event) => (
                <div key={event.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  {getEventIcon(event.eventType)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {event.eventType.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {(event.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No events detected yet
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Alerts</h3>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg ${
                      alert.type === 'error'
                        ? 'bg-red-50 border border-red-200'
                        : alert.type === 'warning'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {alert.type === 'error' ? (
                        <FaExclamationTriangle className="text-red-500" />
                      ) : alert.type === 'warning' ? (
                        <FaExclamationTriangle className="text-yellow-500" />
                      ) : (
                        <FaCheckCircle className="text-green-500" />
                      )}
                      <span className="text-sm font-medium">{alert.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;