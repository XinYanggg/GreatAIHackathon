import React from 'react';
import Navigation from '../components/Navigation';
import FileUploadZone from '../components/FileUploadZone';
import FileList from '../components/FileList';

const UploadPage = ({ setCurrentPage, selectedFiles, setSelectedFiles }) => {
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles([...selectedFiles, ...files.map((file, idx) => ({
      id: Date.now() + idx,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type,
      selected: true
    }))]);
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
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="upload" setCurrentPage={setCurrentPage} />
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