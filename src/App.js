import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import InterviewRoom from './components/InterviewRoom';
import SimpleDashboard from './components/SimpleDashboard';
import SimpleReports from './components/SimpleReports';
import { DetectionProvider } from './context/DetectionContext';

function App() {
  return (
    <DetectionProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<SimpleDashboard />} />
              <Route path="/interview" element={<InterviewRoom />} />
              <Route path="/reports" element={<SimpleReports />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DetectionProvider>
  );
}

export default App;
