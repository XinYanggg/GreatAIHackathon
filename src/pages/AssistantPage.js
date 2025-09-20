import React, { useState, useEffect } from 'react';
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
   * Handle sending a message
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
    
    // Simulate AI processing (replace with actual AI call)
    setTimeout(async () => {
      const aiResponse = {
        text: 'Based on the medical documents analyzed, here is the information you requested...',
        timestamp: new Date().toISOString(),
        sources: [
          'Clinical_Guidelines_2024.pdf',
          'Patient_Treatment_Protocol.pdf',
          'Medical_Research_Study.pdf',
        ],
        fileReferences: [
          { fileId: 'doc-001', fileName: 'Clinical_Guidelines_2024.pdf' },
          { fileId: 'doc-002', fileName: 'Patient_Treatment_Protocol.pdf' },
        ],
        queryType: 'document_search',
        processingTimeMs: 1000,
        confidenceScore: 0.92,
      };
      
      // Add AI response to UI
      const aiMessage = {
        id: Date.now() + 1,
        ...aiResponse,
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages([...messages, newMessage, aiMessage]);
      
      try {
        // Store message in DynamoDB
        await storeSessionMessage(userId, sessionId, userQuery, aiResponse);
        
        // If this is the first message, update the chat title
        if (isFirstMessage) {
          const title = generateChatTitle(userQuery);
          await updateChatSession(userId, sessionId, { title });
          
          // Update local state
          setChatSessions(chatSessions.map(session => 
            session.id === sessionId 
              ? { ...session, title, description: userQuery, timestamp: 'Just now' }
              : session
          ));
        } else {
          // Update the last message in sidebar
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Start a conversation by asking a question</p>
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
            onSubmit={handleSendMessage}
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