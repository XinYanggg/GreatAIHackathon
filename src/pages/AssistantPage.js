import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import SourceModal from '../components/SourceModal';

const AssistantPage = ({ setCurrentPage, chatHistory, messages, setMessages }) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);

  const handleSendMessage = () => {
    if (!currentPrompt.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: currentPrompt,
      type: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: 'Based on the medical documents analyzed, here is the information you requested...',
        type: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        sources: [
          'Clinical_Guidelines_2024.pdf',
          'Patient_Treatment_Protocol.pdf',
          'Medical_Research_Study.pdf',
          'Pharmaceutical_Reference.pdf',
          'Diagnostic_Procedures.pdf',
          'Treatment_Outcomes.pdf',
          'Medical_Standards.pdf'
        ]
      };
      setMessages([...messages, newMessage, aiResponse]);
    }, 1000);
    
    setMessages([...messages, newMessage]);
    setCurrentPrompt('');
  };

  const showSources = (sources) => {
    setCurrentSources(sources);
    setShowSourceModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="assistant" setCurrentPage={setCurrentPage} />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar chatHistory={chatHistory} />
        
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
          </div>

          <PromptInput 
            value={currentPrompt}
            onChange={setCurrentPrompt}
            onSubmit={handleSendMessage}
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