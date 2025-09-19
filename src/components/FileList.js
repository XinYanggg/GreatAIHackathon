import React from 'react';
import { FileText, X } from 'lucide-react';

const FileList = ({ files, onRemove, onToggleSelect }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Selected Files</h2>
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {files.map((file) => (
          <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={file.selected}
                onChange={() => onToggleSelect(file.id)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <FileText className="w-8 h-8 text-red-500" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{file.size}</p>
              </div>
            </div>
            <button
              onClick={() => onRemove(file.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;