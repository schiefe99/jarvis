import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import ChatPanel from './ChatPanel';

export default function AiChat() {
  const { profileData } = useProfile();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-2xl flex items-center justify-center transition-colors"
        title="Assistente"
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9999] w-80 max-w-[calc(100vw-3rem)] h-[28rem] max-h-[calc(100vh-6rem)] card-glass rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Assistente</span>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel category={profileData?.category} />
      </div>
    </div>
  );
}
