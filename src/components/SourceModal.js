import React from 'react';
import { X, FileText, ChevronRight } from 'lucide-react';

const SourceModal = ({ show, onClose, sources }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Referenced Sources</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sources.map((source, idx) => (
            <div
              key={source.key || idx}
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span
                  className="text-blue-700 hover:underline cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    if (source.url) {
                      window.open(source.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  title={source.filename}
                >
                  {source.filename || source.key || 'Open PDF'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SourceModal;