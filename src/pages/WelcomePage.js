import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import { Send } from 'lucide-react';

const Inpage_Navigation = ({ currentPage, setCurrentPage }) => (
  <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <h2 className="text-xl font-semibold text-gray-800">Health2Data</h2>
      <div className="flex space-x-4">
        <button 
          onClick={() => setCurrentPage('welcome')}
          className={`px-4 py-2 rounded-lg ${currentPage === 'welcome' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Welcome
        </button>
        <button 
          onClick={() => setCurrentPage('assistant')}
          className={`px-4 py-2 rounded-lg ${currentPage === 'assistant' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Assistant
        </button>
      </div>
    </div>
  </nav>
);


const WelcomePage = ({ setCurrentPage, chatHistory }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedContent, setSelectedContent] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');

  const [patientRecords, setpatientRecords] = useState([
    { id: 1, name: 'John Doe - Medical History', type: 'record', description: 'Complete medical history' },
    { id: 2, name: 'Jane Smith - Lab Results', type: 'record', description: 'Recent blood work analysis' },
  ]);
  
  const [clinicalGuides, setclinicalGuides] = useState([
    { id: 1, name: 'Diabetes Treatment Protocol', type: 'guide', description: 'Standard treatment guidelines' },
    { id: 2, name: 'Hypertension Management', type: 'guide', description: 'Clinical best practices' },
  ]);

  const displayChatHistory = chatHistory.length > 0 ? chatHistory : chatHistory;

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

  const handlePromptSubmit = () => {
    if (!currentPrompt.trim()) return;
    
    let selectedItem = null;
    
    if (activeTab === 'chats') {
      displayChatHistory.forEach(chat => {
        if (selectedContent.includes(`chat-${chat.id}`)) {
          selectedItem = chat.title;
        }
      });
    } else if (activeTab === 'records') {
      patientRecords.forEach(record => {
        if (selectedContent.includes(`record-${record.id}`)) {
          selectedItem = record.name;
        }
      });
    } else if (activeTab === 'guides') {
      clinicalGuides.forEach(guide => {
        if (selectedContent.includes(`guide-${guide.id}`)) {
          selectedItem = guide.name;
        }
      });
    }

    if (selectedItem) {
      alert(`Prompt "${currentPrompt}" will be applied to:\n${selectedItem}`);
    } else {
      alert(`Prompt "${currentPrompt}" submitted (no specific content selected)`);
    }
    
    setCurrentPrompt('');
    setSelectedContent([]);
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

            <div className="max-h-[400px] min-h-[400px] mb-6 overflow-y-auto border border-gray-100 rounded-lg">
               <div className="p-4 flex-1">
                {activeTab === 'chats' && (
                  <div className="space-y-3">
                    {displayChatHistory.map((chat) => (
                      <div 
                        key={chat.id} 
                        onClick={() => handleContentSelect({ ...chat, type: 'chat' })}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected({ ...chat, type: 'chat' }) ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3 flex-1">
                            <input 
                              type="radio" 
                              name="content-selection" 
                              checked={isSelected({ ...chat, type: 'chat' })} 
                              onChange={() => {}} 
                              className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{chat.title}</h4>
                              <p className="text-sm text-gray-600">{chat.description}</p>
                              <p className="text-xs text-gray-400 mt-1">{chat.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'records' && (
                  <div className="space-y-3">
                    {patientRecords.map((record) => (
                      <div 
                        key={record.id} 
                        onClick={() => handleContentSelect(record)} 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected(record) ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input 
                            type="radio" 
                            name="content-selection" 
                            checked={isSelected(record)} 
                            onChange={() => {}} 
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{record.name}</h4>
                            <p className="text-sm text-gray-600">{record.description}</p>
                          </div>
                        </div>
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
                          isSelected(guide) ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input 
                            type="radio" 
                            name="content-selection" 
                            checked={isSelected(guide)} 
                            onChange={() => {}} 
                            className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{guide.name}</h4>
                            <p className="text-sm text-gray-600">{guide.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePromptSubmit()}
                placeholder={selectedContent.length > 0 ? 'Ask a question about selected content...' : 'Prompt: Filter Doc, Search History, Analysis'}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handlePromptSubmit} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;