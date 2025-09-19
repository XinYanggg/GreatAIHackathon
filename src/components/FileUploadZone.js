import React from 'react';
import { Upload } from 'lucide-react';

const FileUploadZone = ({ onFileSelect }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-12">
      <div className="border-4 border-dashed border-gray-300 rounded-xl p-16 text-center hover:border-blue-400 transition-colors">
        <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-xl text-gray-600 mb-2">Drag and drop files here</p>
        <p className="text-gray-500 mb-6">OR</p>
        <label className="bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors inline-block">
          Browse files
          <input
            type="file"
            multiple
            onChange={onFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
          />
        </label>
        <p className="text-sm text-gray-500 mt-4">Supported: PDF, DOC, DOCX, TXT</p>
      </div>
    </div>
  );
};

export default FileUploadZone;