import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import WelcomePage from './pages/WelcomePage';
import UploadPage from './pages/UploadPage';
import AssistantPage from './pages/AssistantPage';

const App = () => {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'History 1', description: 'Patient diagnosis query', timestamp: '2 hours ago' },
    { id: 2, title: 'History 2', description: 'Treatment protocol search', timestamp: '1 day ago' },
    { id: 3, title: 'History 3', description: 'Medication interaction check', timestamp: '2 days ago' },
    { id: 4, title: 'History 4', description: 'Clinical guidelines review', timestamp: '1 week ago' },
  ]);

  const [messages, setMessages] = useState([]);

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
          chatHistory={chatHistory}
          messages={messages}
          setMessages={setMessages}
        />
      )}
    </div>
  );
};

export default App;