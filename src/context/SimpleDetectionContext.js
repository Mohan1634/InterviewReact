import React, { createContext, useContext, useReducer } from 'react';

const SimpleDetectionContext = createContext();

const initialState = {
  isRecording: false,
  candidateName: '',
  sessionId: null,
  events: [],
  focusLost: 0,
  suspiciousEvents: 0,
  integrityScore: 100,
  alerts: []
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
        integrityScore: 100
      };
    
    case 'END_SESSION':
      return {
        ...state,
        isRecording: false,
        sessionId: null
      };
    
    case 'ADD_EVENT':
      const newEvent = {
        ...action.payload,
        timestamp: new Date()
      };
      return {
        ...state,
        events: [...state.events, newEvent],
        focusLost: action.payload.eventType === 'focus_lost' ? state.focusLost + 1 : state.focusLost,
        suspiciousEvents: ['multiple_faces', 'phone_detected', 'book_detected', 'device_detected'].includes(action.payload.eventType) 
          ? state.suspiciousEvents + 1 
          : state.suspiciousEvents,
        integrityScore: Math.max(0, state.integrityScore - (action.payload.deduction || 0))
      };
    
    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, { ...action.payload, id: Date.now() }]
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

export const SimpleDetectionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(detectionReducer, initialState);

  const startSession = (candidateName) => {
    console.log('startSession called with:', candidateName);
    const sessionId = `session_${Date.now()}`;
    console.log('Generated session ID:', sessionId);
    dispatch({
      type: 'START_SESSION',
      payload: { candidateName, sessionId }
    });
    console.log('Session dispatch completed');
    return sessionId;
  };

  const endSession = () => {
    dispatch({ type: 'END_SESSION' });
  };

  const addEvent = (event) => {
    dispatch({ type: 'ADD_EVENT', payload: event });
  };

  const addAlert = (alert) => {
    dispatch({ type: 'ADD_ALERT', payload: alert });
  };

  const removeAlert = (alertId) => {
    dispatch({ type: 'REMOVE_ALERT', payload: alertId });
  };

  const value = {
    ...state,
    startSession,
    endSession,
    addEvent,
    addAlert,
    removeAlert
  };

  return (
    <SimpleDetectionContext.Provider value={value}>
      {children}
    </SimpleDetectionContext.Provider>
  );
};

export const useSimpleDetection = () => {
  const context = useContext(SimpleDetectionContext);
  if (!context) {
    throw new Error('useSimpleDetection must be used within a SimpleDetectionProvider');
  }
  return context;
};
