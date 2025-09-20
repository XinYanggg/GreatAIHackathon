import React, { useState, useEffect } from 'react';
import { MessageSquare, FileText, Search } from 'lucide-react';
import Navigation from '../components/Navigation';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import SourceModal from '../components/SourceModal';
import { searchKendra } from '../utils/kendraAPI'; // New import
import {
  createChatSession,
  getUserChatSessions,
  getSessionMessages,
  storeSessionMessage,
  updateChatSession,
  deleteChatSession,
  generateChatTitle,
} from '../utils/chatSessionsAPI';

const AssistantPage = ({ setCurrentPage, chatHistory, messages, setMessages }) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);
  const [userId] = useState('user-123'); // Replace with actual user ID from auth
  const [isLoading, setIsLoading] = useState(false);
  
  // Session management states
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // New states for Kendra integration
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load all chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  /**
   * Load all chat sessions for the user
   */
  const loadChatSessions = async () => {
    setLoadingSessions(true);
    try {
      const sessions = await getUserChatSessions(userId);
      
      // Transform to match the expected format for Sidebar
      const formattedSessions = sessions.map(session => ({
        id: session.sessionId,
        title: session.title || 'New Chat',
        description: session.lastMessage || 'No messages yet',
        timestamp: getRelativeTime(session.updatedAt),
        updatedAt: session.updatedAt,
        messageCount: session.messageCount || 0,
      }));
      
      setChatSessions(formattedSessions);
      
      // If no current session, create a new one
      if (!currentSessionId && formattedSessions.length === 0) {
        await createNewChat();
      } else if (!currentSessionId && formattedSessions.length > 0) {
        // Select the most recent chat
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
      
      // Convert to message format expected by ChatMessage component
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
      const newSession = await createChatSession(userId, 'New Chat');
      
      // Add to sessions list
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
      
      // Remove from local state
      const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
      setChatSessions(updatedSessions);
      
      // If deleted current session, select another or create new
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
   * Enhanced message handler with Kendra integration
   */
  const handleSendMessage = async () => {
    if (!currentPrompt.trim()) return;
    
    // If no current session, create one
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewChat();
      if (!sessionId) return;
    }
    
    const newMessage = {
      id: Date.now(),
      text: currentPrompt,
      type: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };
    
    // Add user message to UI immediately
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    
    const userQuery = currentPrompt;
    const isFirstMessage = messages.length === 0;
    setCurrentPrompt('');
    
    try {
      // Step 1: Search Kendra for relevant documents
      console.log('Searching Kendra for:', userQuery);
      const kendraResult = await searchKendra(userQuery, 'PAT-12345'); // Replace with actual patient ID
      
      let context = '';
      let sources = [];
      let fileReferences = [];
      
      if (kendraResult.success && kendraResult.results.length > 0) {
        // Format Kendra results for context
        context = kendraResult.results
          .slice(0, 3) // Use top 3 results
          .map(result => `Document: ${result.title}\nContent: ${result.excerpt}`)
          .join('\n\n');
        
        sources = kendraResult.results.map(result => result.title);
        fileReferences = kendraResult.results.map(result => ({
          fileId: result.id,
          fileName: result.title,
          excerpt: result.excerpt,
          confidence: result.confidence
        }));
        
        setSearchResults(kendraResult.results);
        setShowSearchResults(true);
      }
      
      // Step 2: Call Bedrock/LLM with Kendra context (simulate for now)
      const aiResponseText = await generateAIResponse(userQuery, context);
      
      const aiResponse = {
        text: aiResponseText,
        timestamp: new Date().toISOString(),
        sources: sources,
        fileReferences: fileReferences,
        queryType: kendraResult.success ? 'document_search' : 'general',
        processingTimeMs: 1500,
        confidenceScore: kendraResult.success ? 0.92 : 0.75,
        kendraResults: kendraResult.success ? kendraResult.totalResults : 0
      };
      
      // Add AI response to UI
      const aiMessage = {
        id: Date.now() + 1,
        ...aiResponse,
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages([...messages, newMessage, aiMessage]);
      
      // Store message in DynamoDB
      await storeSessionMessage(userId, sessionId, userQuery, aiResponse);
      
      // Update chat session metadata
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
      
      console.log('Message with Kendra context stored successfully');
      
    } catch (error) {
      console.error('Error processing message with Kendra:', error);
      
      // Fallback AI response without Kendra
      const fallbackResponse = {
        text: 'I apologize, but I encountered an issue searching your documents. Please try again or rephrase your question.',
        timestamp: new Date().toISOString(),
        sources: [],
        fileReferences: [],
        queryType: 'error',
        processingTimeMs: 0,
        confidenceScore: 0
      };
      
      const aiMessage = {
        id: Date.now() + 1,
        ...fallbackResponse,
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages([...messages, newMessage, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Simulate AI response generation with context
   * In production, this would call Amazon Bedrock
   */
  const generateAIResponse = async (query, context) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (context) {
      return `Based on the medical documents I found, here's what I can tell you about "${query}":\n\n` +
             `From the retrieved documents, I can see relevant information about your query. ` +
             `The documents contain specific details that directly address your question.\n\n` +
             `Key findings:\n` +
             `• Medical records show relevant data for your inquiry\n` +
             `• Treatment protocols and guidelines are available\n` +
             `• Clinical observations support the medical recommendations\n\n` +
             `Please refer to the source documents for complete details. Would you like me to search for more specific information?`;
    } else {
      return `I understand you're asking about "${query}". However, I couldn't find specific documents in your medical records that directly address this question. ` +
             `You might want to:\n\n` +
             `• Upload relevant medical documents if they're not yet in the system\n` +
             `• Try rephrasing your question with more specific medical terms\n` +
             `• Check if the documents have been fully processed and indexed\n\n` +
             `Is there anything else I can help you with?`;
    }
  };

  const showSources = (sources) => {
    setCurrentSources(sources);
    setShowSourceModal(true);
  };

  /**
   * Convert ISO timestamp to relative time
   */
  const getRelativeTime = (timestamp) => {
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
          {/* Search Results Panel (when visible) */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Found {searchResults.length} relevant documents
                </h3>
                <button 
                  onClick={() => setShowSearchResults(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Hide
                </button>
              </div>
              <div className="flex space-x-3 overflow-x-auto">
                {searchResults.slice(0, 5).map((result, idx) => (
                  <div key={idx} className="flex-shrink-0 bg-white rounded-lg p-3 border border-blue-200 min-w-[200px]">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">{result.title}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.excerpt}</p>
                        <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${
                          result.confidence === 'VERY_HIGH' ? 'bg-green-100 text-green-800' :
                          result.confidence === 'HIGH' ? 'bg-blue-100 text-blue-800' :
                          result.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.confidence || 'MEDIUM'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Start a conversation by asking a question</p>
                  <p className="text-sm text-gray-400">Your uploaded documents are indexed and ready to search!</p>
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
              <div className="flex justify-center space-y-2">
                <div className="text-center">
                  <div className="animate-pulse text-gray-500 mb-1">Searching your documents...</div>
                  <div className="text-xs text-gray-400">Using Amazon Kendra + Bedrock AI</div>
                </div>
              </div>
            )}
          </div>

          <PromptInput 
            value={currentPrompt}
            onChange={setCurrentPrompt}
            onSubmit={handleSendMessage}
            disabled={isLoading}
            placeholder="Ask about your medical documents... e.g., 'What does my latest blood test show?'"
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