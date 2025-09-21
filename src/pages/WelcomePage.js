import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { listS3Objects } from '../utils/s3Upload';
import { Send, Download, MessageCircle, FileText, BookOpen, Search, ChevronRight } from 'lucide-react';
import { getUserChatSessions } from '../utils/chatSessionsAPI';

const WelcomePage = ({ setCurrentPage, onSelectSession, onQueryDocument }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedContent, setSelectedContent] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [userId] = useState('user-123');
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
        const records = result.data.map((pdf, index) => ({
          id: `s3-${index}-${Date.now()}`,
          name: pdf.key.replace('.pdf', '').replace(/^\d+_/, ''),
          type: 'record',
          description: `PDF document (${(pdf.size / 1024).toFixed(1)} KB)`,
          url: pdf.url,
          key: pdf.key
        }));

        setPatientRecords(records);
        console.log('Successfully loaded', records.length, 'PDFs from S3');

      } else {
        console.error('Failed to fetch PDFs from S3:', result.error);
      }

    } catch (error) {
      console.error("Failed to fetch PDFs:", error);
    }
  }

  useEffect(() => {
    fetchPdfs();
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    setLoadingSessions(true);
    try {
      const sessions = await getUserChatSessions(userId);

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

  const handleOpenPDF = (url, fileName, event) => {
    event.stopPropagation();

    if (!url) {
      alert('PDF URL not available');
      return;
    }

    try {
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening PDF:', error);
      alert('Error opening PDF. Please try again.');
    }
  };

  const handleDownloadPDF = async (url, fileName, event) => {
    event.stopPropagation();

    if (!url) {
      alert('PDF URL not available');
      return;
    }

    try {
      console.log(`Starting download: ${fileName}.pdf`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${fileName}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
      chatSessions.forEach(chat => {
        if (selectedContent.includes(`chat-${chat.id}`)) {
          selectedItem = chat;
          itemType = 'chat';
        }
      });

      if (selectedItem) {
        if (onSelectSession) {
          onSelectSession(selectedItem.sessionId, currentPrompt);
        }
        setCurrentPage('assistant');
      } else {
        if (onQueryDocument) {
          onQueryDocument(null, currentPrompt, 'general');
        }
        setCurrentPage('assistant');
      }
    } else if (activeTab === 'records') {
      patientRecords.forEach(record => {
        if (selectedContent.includes(`record-${record.id}`)) {
          selectedItem = record;
          itemType = 'record';
        }
      });

      if (selectedItem) {
        if (onQueryDocument) {
          onQueryDocument(selectedItem, currentPrompt, 'document_query');
        }
        setCurrentPage('assistant');
      } else {
        alert('Please select a patient record to query');
      }
    } else if (activeTab === 'guides') {
      clinicalGuides.forEach(guide => {
        if (selectedContent.includes(`guide-${guide.id}`)) {
          selectedItem = guide;
          itemType = 'guide';
        }
      });

      if (selectedItem) {
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

  const handleChatClick = (chat) => {
    if (onSelectSession) {
      onSelectSession(chat.sessionId, null);
    }
    setCurrentPage('assistant');
  };

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

  const getTabIcon = (tab) => {
    switch(tab) {
      case 'chats': return <MessageCircle className="w-4 h-4" />;
      case 'records': return <FileText className="w-4 h-4" />;
      case 'guides': return <BookOpen className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTabCount = (tab) => {
    switch(tab) {
      case 'chats': return chatSessions.length;
      case 'records': return patientRecords.length;
      case 'guides': return clinicalGuides.length;
      default: return 0;
    }
  };

  return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
        <Navigation currentPage="welcome" setCurrentPage={setCurrentPage} />

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 py-12 h-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center h-full">

              {/* Left Side - Hero Content */}
              <div className="space-y-8 flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="space-y-6">
                  <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium animate-pulse">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-ping"></span>
                    AI-Powered Healthcare Analytics
                  </div>

                  <div>
                    <h1 className="text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-blue-600 to-indigo-600 mb-6 leading-tight">
                      Health2Data
                    </h1>
                    <h2 className="text-2xl lg:text-3xl text-slate-600 font-light">
                      Transform Medical Intelligence
                    </h2>
                  </div>

                  <p className="text-lg text-slate-700 leading-relaxed max-w-lg">
                    Unlock the power of your medical documents with advanced AI analysis.
                    Query patient records, clinical guidelines, and chat history with natural language.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <button
                      onClick={() => setCurrentPage('assistant')}
                      className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
                  >
                  <span className="flex items-center justify-center">
                    Get Started
                    <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>

              {/* Right Side - Interactive Panel WITH FIXED LAYOUT */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 h-full relative overflow-hidden">

                {/* Tab Navigation - FIXED HEIGHT (70px) */}
                <div style={{ height: '70px' }} className="flex-shrink-0 p-4">
                  <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl h-full">
                    {['records', 'guides', 'chats'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setSelectedContent([]); }}
                            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-200 ease-in-out ${
                                activeTab === tab
                                    ? 'bg-white text-slate-900 shadow-md scale-105'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center space-x-2">
                            {getTabIcon(tab)}
                            <span className="capitalize whitespace-nowrap">{tab === 'records' ? 'Patient Records' : tab === 'guides' ? 'Clinical Guides' : 'Chat History'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-200 ${
                                activeTab === tab ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                            }`}>
                          {getTabCount(tab)}
                        </span>
                          </div>
                        </button>
                    ))}
                  </div>
                </div>

                {/* SCROLLABLE Content Area - CALCULATED HEIGHT */}
                <div
                    style={{
                      height: 'calc(100% - 190px)', // Total minus tabs (70px) and input (120px)
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 transparent'
                    }}
                    className="px-6"
                >
                  <div className="space-y-4">

                    {/* Chat Sessions */}
                    {activeTab === 'chats' && (
                        <>
                          {loadingSessions ? (
                              <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl p-6">
                                      <div className="h-4 bg-slate-300 rounded w-3/4 mb-3"></div>
                                      <div className="h-3 bg-slate-300 rounded w-1/2"></div>
                                    </div>
                                ))}
                              </div>
                          ) : chatSessions.length === 0 ? (
                              <div className="text-center py-16 text-slate-400">
                                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                                <p className="text-sm">Start your first chat to see it appear here</p>
                              </div>
                          ) : (
                              chatSessions.map((chat) => (
                                  <div
                                      key={chat.id}
                                      onClick={() => handleChatClick(chat)}
                                      className={`group relative bg-gradient-to-br from-white to-slate-50 border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                          isSelected({ ...chat, type: 'chat' })
                                              ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg'
                                              : 'border-slate-200 hover:border-slate-300'
                                      }`}
                                  >
                                    <div className="flex items-start space-x-4">
                                      <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                                        <MessageCircle className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 mb-2 truncate">{chat.title}</h4>
                                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{chat.description}</p>
                                        <span className="text-xs text-slate-400 font-medium">{chat.timestamp}</span>
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                    </div>
                                  </div>
                              ))
                          )}
                        </>
                    )}

                    {/* Patient Records */}
                    {activeTab === 'records' && (
                        <>
                          {patientRecords.length === 0 ? (
                              <div className="text-center py-16 text-slate-400">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <h3 className="text-lg font-medium mb-2">No patient records</h3>
                                <p className="text-sm">Upload PDF documents to get started</p>
                              </div>
                          ) : (
                              patientRecords.map((record) => (
                                  <div
                                      key={record.id}
                                      onClick={() => handleContentSelect(record)}
                                      className={`group relative bg-gradient-to-br from-white to-slate-50 border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                          isSelected(record)
                                              ? 'border-green-400 bg-gradient-to-br from-green-50 to-green-100 shadow-lg'
                                              : 'border-slate-200 hover:border-slate-300'
                                      }`}
                                  >
                                    <div className="flex items-start space-x-4">
                                      <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                                        <FileText className="w-5 h-5 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 mb-2 truncate">{record.name}</h4>
                                        <p className="text-sm text-slate-600 mb-4">{record.description}</p>

                                        {record.url && (
                                            <div className="flex items-center space-x-3">
                                              <button
                                                  onClick={(e) => handleDownloadPDF(record.url, record.name, e)}
                                                  className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                                                  title="Download PDF"
                                              >
                                                <Download className="w-4 h-4" />
                                                <span>Download</span>
                                              </button>
                                              <button
                                                  onClick={(e) => handleOpenPDF(record.url, record.name, e)}
                                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                              >
                                                Open PDF →
                                              </button>
                                            </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                              ))
                          )}
                        </>
                    )}

                    {/* Clinical Guides */}
                    {activeTab === 'guides' && (
                        <>
                          {clinicalGuides.map((guide) => (
                              <div
                                  key={guide.id}
                                  onClick={() => handleContentSelect(guide)}
                                  className={`group relative bg-gradient-to-br from-white to-slate-50 border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                      isSelected(guide)
                                          ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg'
                                          : 'border-slate-200 hover:border-slate-300'
                                  }`}
                              >
                                <div className="flex items-start space-x-4">
                                  <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-900 mb-2 truncate">{guide.name}</h4>
                                    <p className="text-sm text-slate-600">{guide.description}</p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                </div>
                              </div>
                          ))}
                        </>
                    )}
                  </div>
                </div>

                {/* ABSOLUTELY FIXED Bottom Input - FIXED HEIGHT (120px) */}
                <div
                    style={{ height: '120px' }}
                    className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 rounded-b-3xl z-30"
                >
                  <div className="space-y-3">
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
                          className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 text-base placeholder:text-slate-400 bg-white shadow-md"
                      />
                      <button
                          onClick={handlePromptSubmit}
                          disabled={!currentPrompt.trim()}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 text-center">
                      {activeTab === 'chats' && (
                          <span>💬 Select a chat and add a query, or just type to start a new conversation</span>
                      )}
                      {activeTab === 'records' && (
                          <span>📄 Select a patient record to query specific medical information</span>
                      )}
                      {activeTab === 'guides' && (
                          <span>📚 Select a clinical guide to query treatment protocols and guidelines</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default WelcomePage;