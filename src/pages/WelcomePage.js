import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { Send, FileText, ExternalLink, Download} from 'lucide-react';
import { listS3Objects } from '../utils/s3Upload';

const WelcomePage = ({ setCurrentPage, chatHistory }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedContent, setSelectedContent] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');

  const [patientRecords, setPatientRecords] = useState([]);

  const [clinicalGuides, setClinicalGuides] = useState([
    { id: 1, name: 'Diabetes Treatment Protocol', type: 'guide', description: 'Standard treatment guidelines' },
    { id: 2, name: 'Hypertension Management', type: 'guide', description: 'Clinical best practices' },
  ]);
  
  useEffect(() => {
    async function fetchPdfs() {
      try {
        const bucketName = process.env.REACT_APP_S3_BUCKET_NAME;
        
        if (!bucketName) {
          console.log('No S3 bucket configured, skipping PDF fetch');
          return;
        }

        const result = await listS3Objects(bucketName);
        
        if (result.success) {
          // Transform the fetched PDFs into patient records format
          const records = result.data.map((pdf, index) => ({
            id: `s3-${index}-${Date.now()}`, // Use unique string ID to avoid conflicts
            name: pdf.key.replace('.pdf', '').replace(/^\d+_/, ''), // Remove timestamp prefix if exists
            type: 'record',
            description: `PDF document (${(pdf.size / 1024).toFixed(1)} KB)`,
            url: pdf.url,
            key: pdf.key // Keep the S3 key for reference
          }));
          
          // Replace existing records with fetched records (avoid duplicates)
          setPatientRecords(records);
          console.log('Successfully loaded', records.length, 'PDFs from S3');
          
        } else {
          console.error('Failed to fetch PDFs from S3:', result.error);
        }
        
      } catch (error) {
        console.error("Failed to fetch PDFs:", error);
      }
    }
    
    fetchPdfs();
  }, []);  

  const displayChatHistory = chatHistory.length > 0 ? chatHistory : chatHistory;

  const handleContentSelect = (item) => {
    const itemKey = `${item.type}-${item.id}`;
    if (selectedContent.includes(itemKey)) {
      setSelectedContent([]);
    } else {
      setSelectedContent([itemKey]);
    }
  };

  const isSelected = (item) => {
    return selectedContent.includes(`${item.type}-${item.id}`);
  };

  // Function to open PDF in new tab
  const handleOpenPDF = (url, fileName, event) => {
    event.stopPropagation(); // Prevent selection when clicking the PDF link
    
    if (!url) {
      alert('PDF URL not available');
      return;
    }

    try {
      // Open PDF in new tab
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newTab) {
        // If popup was blocked, show an alert with the URL
        // alert(`Popup blocked. Please manually open: ${url}`);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      alert('Error opening PDF. Please try again.');
    }
  };

  const handleDownloadPDF = async (url, fileName, event) => {
    event.stopPropagation(); // Prevent selection when clicking the download button
    
    if (!url) {
      alert('PDF URL not available');
      return;
    }

    try {
      // Show loading state (optional)
      console.log(`Starting download: ${fileName}.pdf`);
      
      // Fetch the file as blob
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Convert response to blob
      const blob = await response.blob();
      
      // Create object URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create temporary link element for download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${fileName}.pdf`; // Set the download filename
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(blobUrl);
      
      console.log(`Successfully downloaded: ${fileName}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  const handlePromptSubmit = () => {
    if (!currentPrompt.trim()) return;
    
    let selectedItem = null;
    
    if (activeTab === 'chats') {
      displayChatHistory.forEach(chat => {
        if (selectedContent.includes(`chat-${chat.id}`)) {
          selectedItem = chat.title;
        }
      });
    } else if (activeTab === 'records') {
      patientRecords.forEach(record => {
        if (selectedContent.includes(`record-${record.id}`)) {
          selectedItem = record.name;
        }
      });
    } else if (activeTab === 'guides') {
      clinicalGuides.forEach(guide => {
        if (selectedContent.includes(`guide-${guide.id}`)) {
          selectedItem = guide.name;
        }
      });
    }

    if (selectedItem) {
      alert(`Prompt "${currentPrompt}" will be applied to:\n${selectedItem}`);
    } else {
      alert(`Prompt "${currentPrompt}" submitted (no specific content selected)`);
    }
    
    setCurrentPrompt('');
    setSelectedContent([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Navigation currentPage="welcome" setCurrentPage={setCurrentPage} />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-6xl font-bold text-gray-900 mb-4">Welcome</h1>
              <h3 className="text-2xl text-gray-600">Health2Data</h3>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Transform your medical documents into an accessible knowledge base with AI-powered intelligence
            </p>
            <button
              onClick={() => setCurrentPage('assistant')}
              className="bg-black text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex space-x-2 mb-6 border-b">
              <button
                onClick={() => { setActiveTab('records'); setSelectedContent([]); }}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'records' ? 'bg-gray-100 font-medium text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Patient Record ({patientRecords.length})
              </button>
              <button
                onClick={() => { setActiveTab('guides'); setSelectedContent([]); }}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'guides' ? 'bg-gray-100 font-medium text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Clinical Guide ({clinicalGuides.length})
              </button>
              <button
                onClick={() => { setActiveTab('chats'); setSelectedContent([]); }}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'chats' ? 'bg-gray-100 font-medium text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Chats ({displayChatHistory.length})
              </button>
            </div>

            <div className="max-h-[400px] min-h-[400px] mb-6 overflow-y-auto border border-gray-100 rounded-lg">
              <div className="p-4 flex-1">
                {activeTab === 'chats' && (
                  <div className="space-y-3">
                    {displayChatHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No chat history available</p>
                      </div>
                    ) : (
                      displayChatHistory.map((chat) => (
                        <div 
                          key={chat.id} 
                          onClick={() => handleContentSelect({ ...chat, type: 'chat' })}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected({ ...chat, type: 'chat' }) ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-3 flex-1">
                              <input 
                                type="radio" 
                                name="content-selection" 
                                checked={isSelected({ ...chat, type: 'chat' })} 
                                onChange={() => {}} 
                                className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{chat.title}</h4>
                                <p className="text-sm text-gray-600">{chat.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{chat.timestamp}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activeTab === 'records' && (
                  <div className="space-y-3">
                    {patientRecords.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No patient records found</p>
                        <p className="text-sm mt-1">Upload PDF files to see them here</p>
                      </div>
                    ) : (
                      patientRecords.map((record) => (
                        <div 
                          key={record.id} 
                          onClick={() => handleContentSelect(record)} 
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected(record) ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <input 
                                type="radio" 
                                name="content-selection" 
                                checked={isSelected(record)} 
                                onChange={() => {}} 
                                className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                              />
                              <FileText className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{record.name}</h4>
                                <p className="text-sm text-gray-600">{record.description}</p>
                              </div>
                            </div>
                            {record.url && (
                              <button
                                onClick={(e) => handleDownloadPDF(record.url, record.name, e)}
                                className="ml-2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                title="Open PDF in new tab"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {record.url && (
                            <div className="mt-2 ml-8">
                              <button
                                onClick={(e) => handleOpenPDF(record.url, record.name, e)}
                                className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                              >
                                📄 Open PDF Document
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activeTab === 'guides' && (
                  <div className="space-y-3">
                    {clinicalGuides.map((guide) => (
                      <div 
                        key={guide.id} 
                        onClick={() => handleContentSelect(guide)} 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected(guide) ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input 
                            type="radio" 
                            name="content-selection" 
                            checked={isSelected(guide)} 
                            onChange={() => {}} 
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{guide.name}</h4>
                            <p className="text-sm text-gray-600">{guide.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePromptSubmit()}
                placeholder={selectedContent.length > 0 ? 'Ask a question about selected content...' : 'Prompt: Filter Doc, Search History, Analysis'}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handlePromptSubmit} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;