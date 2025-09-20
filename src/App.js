import React, { useState } from 'react';
import Navigation from './components/Navigation';
import WelcomePage from './pages/WelcomePage';
import UploadPage from './pages/UploadPage';
import AssistantPage from './pages/AssistantPage';

const App = () => {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Session and document context for navigation
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [initialQuery, setInitialQuery] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [queryType, setQueryType] = useState('general');

  /**
   * Handle selecting a chat session from WelcomePage
   * @param {string} sessionId - The session ID to load
   * @param {string} query - Optional initial query to send
   */
  const handleSelectSession = (sessionId, query = null) => {
    setSelectedSessionId(sessionId);
    setInitialQuery(query);
    setSelectedDocument(null);
    setQueryType('general');
  };

  /**
   * Handle querying a specific document from WelcomePage
   * @param {object} document - The document to query (patient record or clinical guide)
   * @param {string} query - The query to send
   * @param {string} type - The query type ('document_query' or 'general')
   */
  const handleQueryDocument = (document, query, type = 'document_query') => {
    setSelectedDocument(document);
    setInitialQuery(query);
    setQueryType(type);
    setSelectedSessionId(null); // Create new session for document queries
  };

  /**
   * Reset context when navigating back to welcome
   */
  const handleNavigateToWelcome = () => {
    setSelectedSessionId(null);
    setInitialQuery(null);
    setSelectedDocument(null);
    setQueryType('general');
    setCurrentPage('welcome');
  };

  return (
    <div>
      {currentPage === 'welcome' && (
        <WelcomePage 
          setCurrentPage={setCurrentPage}
          onSelectSession={handleSelectSession}
          onQueryDocument={handleQueryDocument}
        />
      )}
      {currentPage === 'upload' && (
        <UploadPage 
          setCurrentPage={setCurrentPage}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
        />
      )}
      {currentPage === 'assistant' && (
        <AssistantPage 
          setCurrentPage={setCurrentPage}
          messages={messages}
          setMessages={setMessages}
          // Pass navigation context
          initialSessionId={selectedSessionId}
          initialQuery={initialQuery}
          selectedDocument={selectedDocument}
          queryType={queryType}
          // Clear context after use
          onContextUsed={() => {
            setSelectedSessionId(null);
            setInitialQuery(null);
            setSelectedDocument(null);
            setQueryType('general');
          }}
        />
      )}
    </div>
  );
};

export default App;