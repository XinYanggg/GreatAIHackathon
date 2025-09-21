import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import SourceModal from '../components/SourceModal';
import medicalAPI from '../utils/medicalQueryAPI'; // Import the API
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
    
    try {
      console.log('=== CALLING MEDICAL QUERY API ===');
      console.log('Query:', userQuery);
      console.log('Document context:', document);
      
      // Prepare filters based on document context
      const filters = {};
      
      // Add document-specific filters
      if (document) {
        if (document.fileId || document.id) {
          filters.documentId = document.fileId || document.id;
        }
        if (document.key) {
          filters.documentKey = document.key; // S3 key if from uploaded files
        }
        if (document.name) {
          filters.documentName = document.name;
        }
        if (document.type === 'record' && document.patientName) {
          filters.patientName = document.patientName;
        }
      }
      
      // Add session context for conversation continuity
      const options = {
        filters,
        sessionId: sessionId,
        userId: userId,
        queryType: document ? 'document_query' : 'general'
      };
      
      console.log('API call options:', options);
      
      // Call the Medical Query API
      const apiResponse = await medicalAPI.ask(userQuery, options);
      
      console.log('=== MEDICAL API RESPONSE ===');
      console.log('Full response:', apiResponse);
      
      // Handle different response formats
      let parsedResponse;
      
      if (apiResponse && typeof apiResponse.body === 'string') {
        // AWS Lambda format with JSON string body
        try {
          parsedResponse = JSON.parse(apiResponse.body);
          console.log('Parsed AWS Lambda body:', parsedResponse);
        } catch (parseError) {
          console.error('Failed to parse response body:', parseError);
          throw new Error('Invalid response format from API');
        }
      } else if (apiResponse && apiResponse.body) {
        // AWS Lambda format with object body
        parsedResponse = apiResponse.body;
        console.log('Using AWS Lambda body object:', parsedResponse);
      } else {
        // Direct response object
        parsedResponse = apiResponse;
        console.log('Using direct response:', parsedResponse);
      }
      
      // Extract the AI response text with multiple fallbacks
      const aiResponseText = parsedResponse.answer || 
                            parsedResponse.response || 
                            parsedResponse.text || 
                            parsedResponse.message || 
                            'No response available from the medical AI system.';
      
      console.log('Extracted AI response:', aiResponseText);
      
      // Extract sources and citations
      const sources = [];
      const fileReferences = [];
      
      // Handle sourceDocuments array
      if (parsedResponse.sourceDocuments && Array.isArray(parsedResponse.sourceDocuments)) {
        parsedResponse.sourceDocuments.forEach(doc => {
          if (typeof doc === 'string') {
            sources.push(doc);
          } else if (doc) {
            const docName = doc.name || doc.title || doc.filename || doc.key || 'Unknown Document';
            sources.push(docName);
            fileReferences.push({
              id: doc.id || doc.key || doc.filename,
              name: docName,
              type: doc.type || 'document',
              url: doc.url || null
            });
          }
        });
      }
      
      // Handle citations array
      if (parsedResponse.citations && Array.isArray(parsedResponse.citations)) {
        parsedResponse.citations.forEach(citation => {
          if (citation.sources && Array.isArray(citation.sources)) {
            citation.sources.forEach(source => {
              if (typeof source === 'string') {
                sources.push(source);
              } else if (source && (source.name || source.title)) {
                sources.push(source.name || source.title);
              }
            });
          }
        });
      }
      
      // Handle sources array (direct)
      if (parsedResponse.sources && Array.isArray(parsedResponse.sources)) {
        parsedResponse.sources.forEach(source => {
          if (typeof source === 'string') {
            sources.push(source);
          } else if (source && (source.name || source.title)) {
            sources.push(source.name || source.title);
          }
        });
      }
      
      console.log('Extracted sources:', sources);
      console.log('File references:', fileReferences);
      
      // Extract metadata
      const metadata = parsedResponse.metadata || {};
      
      // Create comprehensive AI response object
      const aiResponse = {
        text: aiResponseText,
        timestamp: new Date().toISOString(),
        sources: [...new Set(sources)], // Remove duplicates
        fileReferences: fileReferences,
        queryType: document ? 'document_query' : 'general',
        processingTimeMs: metadata.processingTimeMs || null,
        confidenceScore: metadata.confidence || metadata.confidenceScore || null,
        modelUsed: metadata.modelUsed || null,
        numberOfSources: metadata.numberOfSources || sources.length,
        hasAnswer: metadata.hasAnswer !== false,
        intent: parsedResponse.intent || null,
        sessionId: parsedResponse.sessionId || sessionId,
        // Additional medical-specific metadata
        medicalCategories: parsedResponse.categories || [],
        riskLevel: parsedResponse.riskLevel || null,
        recommendations: parsedResponse.recommendations || [],
      };
      
      // Create the AI message for display
      const aiMessage = {
        id: Date.now() + 1,
        ...aiResponse,
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      
      console.log('AI message for UI:', aiMessage);
      
      // Update messages state
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      
      // Store the conversation in DynamoDB
      try {
        await storeSessionMessage(userId, sessionId, userQuery, aiResponse);
        
        // Update session metadata
        if (isFirstMessage) {
          const title = generateChatTitle(userQuery);
          await updateChatSession(userId, sessionId, { title });
          
          setChatSessions(prevSessions => prevSessions.map(session => 
            session.id === sessionId 
              ? { ...session, title, description: userQuery, timestamp: 'Just now' }
              : session
          ));
        } else {
          setChatSessions(prevSessions => prevSessions.map(session => 
            session.id === sessionId 
              ? { ...session, description: userQuery, timestamp: 'Just now' }
              : session
          ));
        }
        
        console.log('Message stored successfully in DynamoDB');
      } catch (storageError) {
        console.error('Failed to store message in DynamoDB:', storageError);
        // Continue execution - don't block UI for storage errors
      }
      
    } catch (error) {
      console.error('=== ERROR IN MEDICAL API CALL ===');
      console.error('Error details:', error);
      
      // Create user-friendly error message
      let errorText = 'Sorry, I encountered an error while processing your medical query. ';
      
      if (error.message.includes('timeout')) {
        errorText += 'The request timed out. Please try again.';
      } else if (error.message.includes('HTTP 4')) {
        errorText += 'There was a client error. Please check your query and try again.';
      } else if (error.message.includes('HTTP 5')) {
        errorText += 'There was a server error. Please try again in a moment.';
      } else {
        errorText += `Error: ${error.message}`;
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        sources: [],
        error: true,
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      console.log('=== MEDICAL API CALL COMPLETED ===');
    }
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
                <div className="animate-pulse text-gray-500">AI is analyzing medical documents...</div>
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