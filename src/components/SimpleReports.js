import React, { useState, useEffect } from 'react';
import { FaDownload, FaEye, FaCalendarAlt, FaClock, FaUser, FaExclamationTriangle, FaChartBar } from 'react-icons/fa';
import axios from 'axios';
import { server } from '../config';
import moment from 'moment';
const SimpleReports = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${server}/api/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    switch (filter) {
      case 'good':
        return session.integrityScore >= 80;
      case 'fair':
        return session.integrityScore >= 60 && session.integrityScore < 80;
      case 'poor':
        return session.integrityScore < 60;
      default:
        return true;
    }
  });

  const generateReport = (session) => {
    const reportData = {
      candidateName: session.candidateName,
      startTime: moment(session.startTime).format('YYYY-MM-DD HH:mm:ss'),
      endTime: moment(session.endTime).format('YYYY-MM-DD HH:mm:ss'),
      duration: session.duration,
      totalEvents: session.totalEvents,
      focusLostCount: session.focusLostCount,
      suspiciousEventsCount: session.suspiciousEventsCount,
      integrityScore: session.integrityScore,
      events: session.events
    };

    const reportContent = `
PROCTORING REPORT
================

Candidate Name: ${reportData.candidateName}
Interview Date: ${reportData.startTime}
Duration: ${reportData.duration} minutes
Integrity Score: ${reportData.integrityScore}%

SUMMARY
-------
Total Events Detected: ${reportData.totalEvents}
Focus Lost Incidents: ${reportData.focusLostCount}
Suspicious Events: ${reportData.suspiciousEventsCount}

DETAILED EVENTS
--------------
${session.events.map(event => `
Event: ${event.eventType.replace('_', ' ').toUpperCase()}
Time: ${moment(event.timestamp).format('HH:mm:ss')}
Confidence: ${(event.confidence * 100).toFixed(1)}%
Details: ${event.details}
`).join('\n')}

FINAL ASSESSMENT
---------------
${reportData.integrityScore >= 80 ? 'GOOD - Interview conducted with high integrity' :
  reportData.integrityScore >= 60 ? 'FAIR - Some concerns noted' :
  'POOR - Multiple integrity violations detected'}

Generated on: ${moment().format('YYYY-MM-DD HH:mm:ss')}
    `.trim();

    // Download as text file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proctoring-report-${session.candidateName}-${moment(session.startTime).format('YYYY-MM-DD')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'focus_lost': return '👁️';
      case 'face_absent': return '👤';
      case 'multiple_faces': return '👥';
      case 'phone_detected': return '📱';
      case 'book_detected': return '📖';
      case 'device_detected': return '💻';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proctoring Reports</h1>
          <p className="text-gray-600">View and analyze interview session reports</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Sessions</option>
            <option value="good">Good (≥80%)</option>
            <option value="fair">Fair (60-79%)</option>
            <option value="poor">Poor ({'<'}60%)</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FaCalendarAlt className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Integrity</p>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.integrityScore, 0) / sessions.length) : 0}%
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaChartBar className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Good Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.integrityScore >= 80).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaEye className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flagged Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.integrityScore < 60).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <FaExclamationTriangle className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Integrity Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={session._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FaUser className="text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                        <div className="text-sm text-gray-500">ID: {session._id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {moment(session.startTime).format('MMM DD, YYYY')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {moment(session.startTime).format('HH:mm')} - {moment(session.endTime).format('HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <FaClock className="mr-2 text-gray-400" />
                      {session.duration} min
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{session.totalEvents}</div>
                    <div className="text-sm text-gray-500">
                      {session.focusLostCount} focus, {session.suspiciousEventsCount} suspicious
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      session.integrityScore >= 80 ? 'bg-green-100 text-green-800' :
                      session.integrityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {session.integrityScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <FaEye />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => generateReport(session)}
                        className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                      >
                        <FaDownload />
                        <span>Download</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <FaChartBar className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-gray-500">No sessions found matching the current filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Session Report: {selectedSession.candidateName}
                </h2>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Session Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Session Info</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Date:</span> {moment(selectedSession.startTime).format('MMM DD, YYYY')}</div>
                    <div><span className="font-medium">Duration:</span> {selectedSession.duration} minutes</div>
                    <div><span className="font-medium">Start:</span> {moment(selectedSession.startTime).format('HH:mm:ss')}</div>
                    <div><span className="font-medium">End:</span> {moment(selectedSession.endTime).format('HH:mm:ss')}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Event Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Total Events:</span> {selectedSession.totalEvents}</div>
                    <div><span className="font-medium">Focus Lost:</span> {selectedSession.focusLostCount}</div>
                    <div><span className="font-medium">Suspicious:</span> {selectedSession.suspiciousEventsCount}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Integrity Score</h3>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      selectedSession.integrityScore >= 80 ? 'text-green-600' : 
                      selectedSession.integrityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {selectedSession.integrityScore}%
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                      selectedSession.integrityScore >= 80 ? 'bg-green-100 text-green-800' : 
                      selectedSession.integrityScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedSession.integrityScore >= 80 ? 'Good' : 
                       selectedSession.integrityScore >= 60 ? 'Fair' : 'Poor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Events Timeline */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Event Timeline</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedSession.events.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl">{getEventIcon(event.eventType)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {event.eventType.replace('_', ' ').toUpperCase()}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {moment(event.timestamp).format('HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Confidence: {(event.confidence * 100).toFixed(1)}%</span>
                          {event.duration && <span>Duration: {event.duration}ms</span>}
                          {event.deduction && <span>Deduction: -{event.deduction} points</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {selectedSession.events.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No events detected during this session.
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                <button
                  onClick={() => generateReport(selectedSession)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <FaDownload />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleReports;






