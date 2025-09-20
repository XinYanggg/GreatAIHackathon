import React from 'react';
import { Clock, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Search, User } from 'lucide-react';

const Sidebar = ({ 
  chatHistory, 
  onSelectChat, 
  onDeleteChat, 
  onNewChat, 
  currentChatId,
  loading = false 
}) => {
  const handleChatClick = (chatId) => {
    if (onSelectChat) {
      onSelectChat(chatId);
    }
  };

  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation(); // Prevent chat selection when deleting
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteChat(chatId);
    }
  };

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header with New Chat Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewChatClick}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Chat History
          </h3>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                    currentChatId === chat.id
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  {/* Chat Content */}
                  <div className="pr-8">
                    <h4 className={`font-medium mb-1 truncate ${
                      currentChatId === chat.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {chat.title}
                    </h4>
                    <p className="text-sm text-gray-500 truncate mb-1">
                      {chat.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-400">
                      <span>{chat.timestamp}</span>
                      {chat.messageCount > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, chat.id)}
                    className={`absolute top-3 right-3 p-1 rounded hover:bg-red-100 transition-colors ${
                      currentChatId === chat.id 
                        ? 'opacity-100' 
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>

                  {/* Active Indicator */}
                  {currentChatId === chat.id && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Username</p>
            <p className="text-sm text-gray-500">Healthcare Professional</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;