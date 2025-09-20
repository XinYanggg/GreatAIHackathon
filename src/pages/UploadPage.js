import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import FileUploadZone from '../components/FileUploadZone';
import FileList from '../components/FileList';

const UploadPage = ({ setCurrentPage, selectedFiles, setSelectedFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const processFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file type
      const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      return validTypes.includes(fileExtension);
    });

    if (validFiles.length !== fileArray.length) {
      alert('Some files were skipped. Only PDF, DOC, DOCX, and TXT files are allowed.');
    }

    if (validFiles.length > 0) {
      const newFiles = validFiles.map((file, idx) => ({
        id: Date.now() + idx,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type,
        selected: true,
        file: file // Store the actual file object if needed later
      }));

      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(dragCounter + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(dragCounter - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = () => {
    const selectedFilesToUpload = selectedFiles.filter(f => f.selected);
    
    if (selectedFilesToUpload.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }
    
    alert(`${selectedFilesToUpload.length} file(s) uploaded successfully!`);
    setCurrentPage('assistant');
  };

  const handleRemove = (id) => {
    setSelectedFiles(selectedFiles.filter(f => f.id !== id));
  };

  const handleToggleSelect = (id) => {
    setSelectedFiles(selectedFiles.map(f => 
      f.id === id ? {...f, selected: !f.selected} : f
    ));
  };

  return (
    <div className={`min-h-screen bg-gray-50 transition-colors ${isDragging ? 'bg-blue-50' : ''}`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      <Navigation currentPage="upload" setCurrentPage={setCurrentPage} />

      {/* Drag overlay */}
      {isDragging && (
          <div className="fixed inset-0 bg-blue-600 bg-opacity-20 z-40 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-dashed border-blue-500">
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900">Drop files here to upload</p>
                <p className="text-sm text-gray-500 mt-2">PDF, DOC, DOCX, TXT files only</p>
              </div>
            </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        {selectedFiles.length === 0 ? (
          <FileUploadZone onFileSelect={handleFileSelect} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - File List */}
            <div>
              <FileList 
                files={selectedFiles}
                onRemove={handleRemove}
                onToggleSelect={handleToggleSelect}
              />
              
              {/* Action Buttons */}
              <div className="mt-6 flex space-x-4">
                <button 
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors" 
                  onClick={handleUpload}
                >
                  UPLOAD
                </button>
                <label className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer">
                  Add More Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </label>
              </div>
            </div>
            
            {/* Right Side - Upload Zone */}
            <div className="lg:sticky lg:top-6 h-fit">
              <FileUploadZone onFileSelect={handleFileSelect} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;