import React, { useState, useEffect,useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import SourceModal from '../components/SourceModal';
import {
  createChatSession,
  getUserChatSessions,
  getSessionMessages,
  storeSessionMessage,
  updateChatSession,
  deleteChatSession,
  generateChatTitle,
} from '../utils/chatSessionsAPI';

const AssistantPage = ({ 
  setCurrentPage, 
  messages, 
  setMessages,
  initialSessionId = null,
  initialQuery = null,
  queryType = 'general',
  onContextUsed = null,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);
  const [userId] = useState('user-123'); // Replace with actual user ID from auth
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Session management states
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  // Use refs to prevent duplicate processing
  const contextProcessedRef = useRef(false);
  const initializedRef = useRef(false);
  
  // Load all chat sessions on component mount (only once)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      loadChatSessions();
    }
  }, []);

  // Handle initial context from WelcomePage (only once)
  useEffect(() => {
    if (chatSessions.length > 0 && !contextProcessedRef.current && 
        (initialSessionId || initialQuery || selectedDocument)) {
      contextProcessedRef.current = true;
      handleInitialContext();
    }
  }, [chatSessions, initialSessionId, initialQuery, selectedDocument]);

  // Load messages when session changes (but not on initial mount)
  useEffect(() => {
    if (currentSessionId && !initialSessionId && contextProcessedRef.current) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  /**
   * Handle initial context from WelcomePage navigation
   */
  const handleInitialContext = async () => {
    try {
      if (initialSessionId) {
        // Load existing session
        setCurrentSessionId(initialSessionId);
        await loadSessionMessages(initialSessionId);
        
        // If there's also an initial query, send it
        if (initialQuery) {
          setCurrentPrompt(initialQuery);
          setTimeout(() => {
            handleSendMessage(initialQuery);
          }, 500);
        }
      } else if (selectedDocument && initialQuery) {
        // Create new session for document query
        const newSession = await createNewChat();
        console.log('docq');
        if (newSession) {
          // Send query with document context
          setTimeout(() => {
            handleSendMessage(initialQuery, selectedDocument);
          }, 500);
        }
      } else if (initialQuery) {
        // Just a query without session or document
        const newSession = await createNewChat();
        if (newSession) {
          setTimeout(() => {
            handleSendMessage(initialQuery);
          }, 500);
        }
      }
      
      // Clear context after processing
      if (onContextUsed) {
        onContextUsed();
      }
    } catch (error) {
      console.error('Error handling initial context:', error);
    }
  };

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId && !initialSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  /**
   * Load all chat sessions for the user
   */
  const loadChatSessions = async () => {
    setLoadingSessions(true);
    try {
      const sessions = await getUserChatSessions(userId);
      
      const formattedSessions = sessions.map(session => ({
        id: session.sessionId,
        title: session.title || 'New Chat',
        description: session.lastMessage || 'No messages yet',
        timestamp: getRelativeTime(session.updatedAt),
        updatedAt: session.updatedAt,
        messageCount: session.messageCount || 0,
      }));
      
      setChatSessions(formattedSessions);
      
      // Only auto-select if no initial session provided
      if (!initialSessionId && !initialQuery && !selectedDocument) {
        if (sessions.length === 0) {
          await createNewChat();
        }
      } else if (!initialSessionId && !currentSessionId && formattedSessions.length > 0) {
        setCurrentSessionId(formattedSessions[0].id);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  /**
   * Load messages for a specific session
   */
  const loadSessionMessages = async (sessionId) => {
    try {
      const sessionMessages = await getSessionMessages(userId, sessionId);
      
      const formattedMessages = sessionMessages.flatMap(item => [
        {
          id: `${item.messageId}-user`,
          text: item.userQuery.text,
          type: 'user',
          timestamp: new Date(item.userQuery.timestamp).toLocaleTimeString(),
        },
        {
          id: `${item.messageId}-ai`,
          text: item.aiResponse.text,
          type: 'ai',
          timestamp: new Date(item.aiResponse.timestamp).toLocaleTimeString(),
          sources: item.aiResponse.sources || [],
          fileReferences: item.aiResponse.fileReferences || [],
        }
      ]);
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setMessages([]);
    }
  };

  /**
   * Create a new chat session
   */
  const createNewChat = async () => {
    try {
      console.log('Creating new chat session...');
      const newSession = await createChatSession(userId, 'New Chat');
      
      const formattedSession = {
        id: newSession.sessionId,
        title: newSession.title,
        description: 'No messages yet',
        timestamp: 'Just now',
        updatedAt: newSession.updatedAt,
        messageCount: 0,
      };
      
      setChatSessions([formattedSession, ...chatSessions]);
      setCurrentSessionId(newSession.sessionId);
      setMessages([]);
      
      return newSession.sessionId;
    } catch (error) {
      console.error('Failed to create new chat:', error);
      return null;
    }
  };

  /**
   * Handle selecting a chat from sidebar
   */
  const handleSelectChat = (sessionId) => {
    setCurrentSessionId(sessionId);
  };

  /**
   * Handle deleting a chat
   */
  const handleDeleteChat = async (sessionId) => {
    try {
      await deleteChatSession(userId, sessionId);
      
      const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
      setChatSessions(updatedSessions);
      
      if (sessionId === currentSessionId) {
        if (updatedSessions.length > 0) {
          setCurrentSessionId(updatedSessions[0].id);
        } else {
          await createNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (queryText = null, documentContext = null) => {
    const messageText = queryText || currentPrompt;
    if (!messageText.trim()) return;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewChat();
      if (!sessionId) return;
    }
    
    const newMessage = {
      id: Date.now(),
      text: messageText,
      type: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    
    const userQuery = messageText;
    const isFirstMessage = messages.length === 0;
    const document = documentContext || selectedDocument;
    
    if (!queryText) {
      setCurrentPrompt('');
    }
    
    // Simulate AI processing - REPLACE WITH YOUR ACTUAL AI SERVICE
    setTimeout(async () => {
      let aiResponseText = 'Based on the medical documents analyzed, here is the information you requested...';
      let sources = [
        'Clinical_Guidelines_2024.pdf',
        'Patient_Treatment_Protocol.pdf',
        'Medical_Research_Study.pdf',
      ];
      let fileRefs = [
        { fileId: 'doc-001', fileName: 'Clinical_Guidelines_2024.pdf' },
        { fileId: 'doc-002', fileName: 'Patient_Treatment_Protocol.pdf' },
      ];
      
      // If querying a specific document, customize the response
      if (document) {
        aiResponseText = `Based on the ${document.type === 'record' ? 'patient record' : 'clinical guide'} "${document.name}", here is the information about "${userQuery}":\n\n${document.description}\n\nThis is a simulated response. Replace with your actual AI service that queries the specific document.`;
        sources = [document.name];
        fileRefs = [{ fileId: document.fileId, fileName: document.name }];
      }
      
      const aiResponse = {
        text: aiResponseText,
        timestamp: new Date().toISOString(),
        sources: sources,
        fileReferences: fileRefs,
        queryType: document ? 'document_query' : queryType,
        processingTimeMs: 1000,
        confidenceScore: 0.92,
      };
      
      const aiMessage = {
        id: Date.now() + 1,
        ...aiResponse,
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages([...messages, newMessage, aiMessage]);
      
      try {
        await storeSessionMessage(userId, sessionId, userQuery, aiResponse);
        
        if (isFirstMessage) {
          const title = generateChatTitle(userQuery);
          await updateChatSession(userId, sessionId, { title });
          
          setChatSessions(chatSessions.map(session => 
            session.id === sessionId 
              ? { ...session, title, description: userQuery, timestamp: 'Just now' }
              : session
          ));
        } else {
          setChatSessions(chatSessions.map(session => 
            session.id === sessionId 
              ? { ...session, description: userQuery, timestamp: 'Just now' }
              : session
          ));
        }
        
        console.log('Message stored successfully');
      } catch (error) {
        console.error('Failed to store message:', error);
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const showSources = (sources) => {
    setCurrentSources(sources);
    setShowSourceModal(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="assistant" setCurrentPage={setCurrentPage} />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar 
          chatHistory={chatSessions} 
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onNewChat={createNewChat}
          currentChatId={currentSessionId}
          loading={loadingSessions}
        />
        
        <div className="flex-1 flex flex-col">
          {/* Document Context Banner */}
          {selectedDocument && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Querying: {selectedDocument.name}
                  </p>
                  <p className="text-xs text-blue-700">{selectedDocument.description}</p>
                </div>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {selectedDocument 
                      ? `Ask questions about ${selectedDocument.name}`
                      : 'Start a conversation by asking a question'
                    }
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  onShowSources={showSources}
                />
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-center">
                <div className="animate-pulse text-gray-500">AI is thinking...</div>
              </div>
            )}
          </div>

          <PromptInput 
            value={currentPrompt}
            onChange={setCurrentPrompt}
            onSubmit={() => handleSendMessage()}
            disabled={isLoading}
          />
        </div>
      </div>

      <SourceModal 
        show={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        sources={currentSources}
      />
    </div>
  );
};

export default AssistantPage;