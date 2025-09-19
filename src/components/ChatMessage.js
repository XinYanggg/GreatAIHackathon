import React from 'react';

const ChatMessage = ({ message, onShowSources }) => {
  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl p-4 rounded-lg ${
          message.type === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white shadow-md border border-gray-200'
        }`}
      >
        {message.type === 'ai' && message.sources && (
          <button
            onClick={() => onShowSources(message.sources)}
            className="mb-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Source
          </button>
        )}
        <p className={message.type === 'user' ? 'text-white' : 'text-gray-800'}>
          {message.text}
        </p>
        <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
          {message.timestamp}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;