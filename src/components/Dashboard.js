import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaClock, FaUser, FaChartLine, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useDetection } from '../context/DetectionContext';
import axios from 'axios';
import { server } from '../config';
const Dashboard = () => {
  const [candidateName, setCandidateName] = useState('');
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgIntegrityScore: 0,
    totalEvents: 0,
    suspiciousEvents: 0
  });
  const { startSession } = useDetection();

  useEffect(() => {
    fetchRecentSessions();
    fetchStats();
  }, []);

  const fetchRecentSessions = async () => {
    try {
      const response = await axios.get(`${server}/api/sessions`);
      setRecentSessions(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${server}/api/sessions`);
      const sessions = response.data;
      
      const totalSessions = sessions.length;
      const avgIntegrityScore = sessions.length > 0 
        ? sessions.reduce((sum, session) => sum + session.integrityScore, 0) / sessions.length 
        : 0;
      const totalEvents = sessions.reduce((sum, session) => sum + session.totalEvents, 0);
      const suspiciousEvents = sessions.reduce((sum, session) => sum + session.suspiciousEventsCount, 0);
      
      setStats({
        totalSessions,
        avgIntegrityScore: Math.round(avgIntegrityScore),
        totalEvents,
        suspiciousEvents
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStartInterview = () => {
    if (candidateName.trim()) {
      startSession(candidateName.trim());
      window.location.href = '/interview';
    }
  };

  const getIntegrityScoreColor = (score) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getIntegrityScoreBg = (score) => {
    if (score >= 80) return 'bg-success-50 border-success-200';
    if (score >= 60) return 'bg-warning-50 border-warning-200';
    return 'bg-danger-50 border-danger-200';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Monitor and manage video proctoring sessions</p>
      </div>

      {/* Quick Start Section */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Start New Interview</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
              Candidate Name
            </label>
            <input
              type="text"
              id="candidateName"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter candidate name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleStartInterview}
              disabled={!candidateName.trim()}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlay className="text-sm" />
              <span>Start Interview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-full">
              <FaClock className="text-primary-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Integrity Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgIntegrityScore}%</p>
            </div>
            <div className="bg-success-100 p-3 rounded-full">
              <FaChartLine className="text-success-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
            <div className="bg-warning-100 p-3 rounded-full">
              <FaExclamationTriangle className="text-warning-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspicious Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.suspiciousEvents}</p>
            </div>
            <div className="bg-danger-100 p-3 rounded-full">
              <FaUser className="text-danger-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
          <Link to="/reports" className="text-primary-600 hover:text-primary-700 font-medium">
            View All Reports
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <FaClock className="text-gray-400 text-4xl mx-auto mb-4" />
            <p className="text-gray-500">No sessions found. Start your first interview to see data here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSessions.map((session) => (
                  <tr key={session._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <FaUser className="text-primary-600 text-sm" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.duration} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.totalEvents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getIntegrityScoreBg(session.integrityScore)} ${getIntegrityScoreColor(session.integrityScore)}`}>
                        {session.integrityScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.integrityScore >= 80 
                          ? 'bg-success-100 text-success-800' 
                          : session.integrityScore >= 60 
                          ? 'bg-warning-100 text-warning-800' 
                          : 'bg-danger-100 text-danger-800'
                      }`}>
                        <FaCheckCircle className="mr-1" />
                        {session.integrityScore >= 80 ? 'Good' : session.integrityScore >= 60 ? 'Fair' : 'Poor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;






