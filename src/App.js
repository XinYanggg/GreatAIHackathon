import React, { useState } from 'react';
import Navigation from './components/Navigation';
import WelcomePage from './pages/WelcomePage';
import UploadPage from './pages/UploadPage';
import AssistantPage from './pages/AssistantPage';

const App = () => {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [messages, setMessages] = useState([]);

  // Note: chatHistory is now managed within AssistantPage component
  // This dummy data is only for WelcomePage display
  const [chatHistory] = useState([
    { id: 1, title: 'History 1', description: 'Patient diagnosis query', timestamp: '2 hours ago' },
    { id: 2, title: 'History 2', description: 'Treatment protocol search', timestamp: '1 day ago' },
    { id: 3, title: 'History 3', description: 'Medication interaction check', timestamp: '2 days ago' },
    { id: 4, title: 'History 4', description: 'Clinical guidelines review', timestamp: '1 week ago' },
  ]);

  return (
    <div>
      {currentPage === 'welcome' && (
        <WelcomePage 
          setCurrentPage={setCurrentPage}
          chatHistory={chatHistory}
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
          chatHistory={chatHistory} // Passed but not used - managed internally
          messages={messages}
          setMessages={setMessages}
        />
      )}
    </div>
  );
};

export default App;