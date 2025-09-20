import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import FileUploadZone from '../components/FileUploadZone';
import FileList from '../components/FileList';
import { uploadFileToS3 } from '../utils/s3Upload';
import { useEffect } from 'react';

const UploadPage = ({ setCurrentPage, selectedFiles, setSelectedFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  // const [uploadProgress, setUploadProgress] = useState({});

  useEffect(()=> {
    console.log('AWS_ACCESS_KEY_ID:', process.env.REACT_APP_AWS_ACCESS_KEY_ID ? 'Found' : 'Missing');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? 'Found' : 'Missing');
    console.log('AWS_REGION:', process.env.REACT_APP_AWS_REGION || 'us-east-1');
    console.log('S3 BUCKET:', process.env.REACT_APP_S3_BUCKET_NAME ? 'Found': 'Missing');
  })
  

  // Your existing processFiles, handleFileSelect, drag handlers remain the same...
  const processFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
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
        file: file,
        uploadStatus: 'pending' // Add upload status tracking
      }));

      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  // Upload handler with S3 integration
  const handleUpload = async () => {
    const selectedFilesToUpload = selectedFiles.filter(f => f.selected);
    
    if (selectedFilesToUpload.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);
    const bucketName = process.env.REACT_APP_S3_BUCKET_NAME || 'your-bucket-name';
    
    try {
      // Upload files one by one
      for (const fileInfo of selectedFilesToUpload) {
        // Update status to uploading
        setSelectedFiles(prev => prev.map(f => 
          f.id === fileInfo.id ? {...f, uploadStatus: 'uploading'} : f
        ));

        // Generate unique filename to avoid conflicts
        const timestamp = Date.now();
        const fileName = `${timestamp}_${fileInfo.file.name}`;
        
        const result = await uploadFileToS3(fileInfo.file, bucketName, fileName);
        
        if (result.success) {
          // Update status to completed
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileInfo.id ? {
              ...f, 
              uploadStatus: 'completed',
              s3Key: result.key,
              s3Location: result.location
            } : f
          ));
        } else {
          // Update status to failed
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileInfo.id ? {...f, uploadStatus: 'failed', error: result.error} : f
          ));
        }
      }
      
      const successCount = selectedFiles.filter(f => f.uploadStatus === 'completed').length;
      const failCount = selectedFiles.filter(f => f.uploadStatus === 'failed').length;
      
      if (failCount === 0) {
        alert(`All ${successCount} file(s) uploaded successfully to S3!`);
        setCurrentPage('assistant');
      } else {
        alert(`${successCount} files uploaded successfully, ${failCount} failed. Check console for details.`);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
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

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
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
                  className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                    isUploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'UPLOADING...' : 'UPLOAD'}
                </button>
                <label className={`border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}>
                  Add More Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    disabled={isUploading}
                  />
                </label>
              </div>
              
              {isUploading && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Uploading files to S3...</p>
                </div>
              )}
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