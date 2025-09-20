import React from 'react';
import { Search, User } from 'lucide-react';

const Sidebar = ({ chatHistory }) => {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search Chat"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chatHistory.map((chat) => (
          <div
            key={chat.id}
            className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
          >
            <p className="font-medium text-gray-900">{chat.title}</p>
            <p className="text-sm text-gray-600 truncate">{chat.description}</p>
            <p className="text-xs text-gray-400 mt-1">{chat.timestamp}</p>
          </div>
        ))}
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