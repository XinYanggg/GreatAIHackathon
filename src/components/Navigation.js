import React from 'react';
import { Sparkles } from 'lucide-react';

const Navigation = ({ currentPage, setCurrentPage }) => (
  <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and text clickable */}
        <button
            onClick={() => setCurrentPage('welcome')}
            className="flex items-center space-x-2 focus:outline-none"
        >
          <Sparkles className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold text-gray-800">Health2Data</span>
        </button>

      <div className="flex items-center space-x-6">
        <button
          onClick={() => setCurrentPage('upload')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentPage === 'upload' 
              ? 'bg-blue-50 text-blue-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          UPLOAD
        </button>
        <button
          onClick={() => setCurrentPage('assistant')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentPage === 'assistant' 
              ? 'bg-blue-50 text-blue-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          AI ASSISTANT
        </button>
      </div>
    </div>
  </nav>
);

export default Navigation;
