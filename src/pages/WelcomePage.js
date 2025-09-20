import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { listS3Objects } from '../utils/s3Upload';
import { Send, Download } from 'lucide-react';
import { getUserChatSessions } from '../utils/chatSessionsAPI';

const WelcomePage = ({ setCurrentPage, onSelectSession, onQueryDocument }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedContent, setSelectedContent] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [userId] = useState('user-123'); // Replace with actual user ID from auth
  const [chatSessions, setChatSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [patientRecords, setPatientRecords] = useState([]);  
  const [clinicalGuides] = useState([
    { id: 1, name: 'Diabetes Treatment Protocol', type: 'guide', description: 'Standard treatment guidelines', fileId: 'guide-001' },
    { id: 2, name: 'Hypertension Management', type: 'guide', description: 'Clinical best practices', fileId: 'guide-002' },
  ]);

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

  // Load chat sessions on component mount
  useEffect(() => {
    fetchPdfs();
    loadChatSessions();
  }, []);

  /**
   * Load all chat sessions for the user
   */
  const loadChatSessions = async () => {
    setLoadingSessions(true);
    try {
      const sessions = await getUserChatSessions(userId);
      
      // Transform to display format
      const formattedSessions = sessions.map(session => ({
        id: session.sessionId,
        title: session.title || 'New Chat',
        description: session.lastMessage || 'No messages yet',
        timestamp: getRelativeTime(session.updatedAt),
        type: 'chat',
        sessionId: session.sessionId,
      }));
      
      setChatSessions(formattedSessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      setChatSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

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
    let itemType = null;
    
    if (activeTab === 'chats') {
      // Handle chat selection - navigate to assistant with selected chat
      chatSessions.forEach(chat => {
        if (selectedContent.includes(`chat-${chat.id}`)) {
          selectedItem = chat;
          itemType = 'chat';
        }
      });
      
      if (selectedItem) {
        // Navigate to Assistant page with selected session
        if (onSelectSession) {
          onSelectSession(selectedItem.sessionId, currentPrompt);
        }
        setCurrentPage('assistant');
      } else {
        // No chat selected - create new chat with query
        if (onQueryDocument) {
          onQueryDocument(null, currentPrompt, 'general');
        }
        setCurrentPage('assistant');
      }
    } else if (activeTab === 'records') {
      // Handle patient record selection - query on specific document
      patientRecords.forEach(record => {
        if (selectedContent.includes(`record-${record.id}`)) {
          selectedItem = record;
          itemType = 'record';
        }
      });
      
      if (selectedItem) {
        // Navigate to Assistant and query on this document
        if (onQueryDocument) {
          onQueryDocument(selectedItem, currentPrompt, 'document_query');
        }
        setCurrentPage('assistant');
      } else {
        alert('Please select a patient record to query');
      }
    } else if (activeTab === 'guides') {
      // Handle clinical guide selection - query on specific document
      clinicalGuides.forEach(guide => {
        if (selectedContent.includes(`guide-${guide.id}`)) {
          selectedItem = guide;
          itemType = 'guide';
        }
      });
      
      if (selectedItem) {
        // Navigate to Assistant and query on this document
        if (onQueryDocument) {
          onQueryDocument(selectedItem, currentPrompt, 'document_query');
        }
        setCurrentPage('assistant');
      } else {
        alert('Please select a clinical guide to query');
      }
    }
    
    setCurrentPrompt('');
    setSelectedContent([]);
  };

  /**
   * Handle clicking on a chat to open it directly
   */
  const handleChatClick = (chat) => {
    if (onSelectSession) {
      onSelectSession(chat.sessionId, null);
    }
    setCurrentPage('assistant');
  };

  /**
   * Convert ISO timestamp to relative time
   */
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return time.toLocaleDateString();
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
                Patient Record
              </button>
              <button
                onClick={() => { setActiveTab('guides'); setSelectedContent([]); }}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'guides' ? 'bg-gray-100 font-medium text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Clinical Guide
              </button>
              <button
                onClick={() => { setActiveTab('chats'); setSelectedContent([]); }}
                className={`px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === 'chats' ? 'bg-gray-100 font-medium text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Chats
              </button>
            </div>

            <div className="min-h-[300px] mb-6">
              {activeTab === 'chats' && (
                <div className="space-y-3">
                  {loadingSessions ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse border rounded-lg p-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p>No chat history yet</p>
                      <p className="text-sm mt-2">Start a new conversation to see it here</p>
                    </div>
                  ) : (
                    chatSessions.map((chat) => (
                      <div 
                        key={chat.id} 
                        onClick={() => handleChatClick(chat)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected({ ...chat, type: 'chat' }) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{chat.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{chat.description}</p>
                            <span className="text-xs text-gray-400">{chat.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'records' && (
                <div className="space-y-3">
                  {patientRecords.map((record) => (
                    <div 
                      key={record.id} 
                      onClick={() => handleContentSelect(record)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected(record) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">{record.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                      {record.url && (
                        <div className="flex justify-left items-center space-x-2 mt-2">
                          <button
                            onClick={(e) => handleDownloadPDF(record.url, record.name, e)}
                            className="ml-2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                            title="Open PDF in new tab"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenPDF(record.url, record.name, e)}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                          >
                            Open PDF Document
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'guides' && (
                <div className="space-y-3">
                  {clinicalGuides.map((guide) => (
                    <div 
                      key={guide.id} 
                      onClick={() => handleContentSelect(guide)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected(guide) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">{guide.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{guide.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="relative">
              <input
                type="text"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePromptSubmit()}
                placeholder={
                  activeTab === 'chats' 
                    ? "Ask a question or select a chat to continue..." 
                    : `Query the selected ${activeTab === 'records' ? 'patient record' : 'clinical guide'}...`
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePromptSubmit}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 transition-colors"
                disabled={!currentPrompt.trim()}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Helper Text */}
            <div className="text-xs text-gray-500 text-center mt-2">
              {activeTab === 'chats' && (
                <span>Select a chat and add a query, or just type to start a new conversation</span>
              )}
              {activeTab === 'records' && (
                <span>Select a patient record to query specific information</span>
              )}
              {activeTab === 'guides' && (
                <span>Select a clinical guide to query specific information</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;