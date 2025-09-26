import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaVideo, FaChartBar, FaHome, FaUserShield } from 'react-icons/fa';
import { server } from '../index.js';
const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FaHome },
    { path: '/interview', label: 'Interview Room', icon: FaVideo },
    { path: '/reports', label: 'Reports', icon: FaChartBar }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FaUserShield className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ProctorAI</h1>
              <p className="text-sm text-gray-500">Video Proctoring System</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="text-lg" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
