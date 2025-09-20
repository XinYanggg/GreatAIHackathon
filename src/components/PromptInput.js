import React from 'react';
import { Send } from 'lucide-react';

const PromptInput = ({ value, onChange, onSubmit, placeholder }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-gray-50">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder || "Prompt: Filter Doc, Search History, Analysis"}
          className="w-full h-14 px-4 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onSubmit}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PromptInput;