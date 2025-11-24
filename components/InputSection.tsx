import React, { useState } from 'react';
import { Loader2, Sparkles, Send } from 'lucide-react';

interface InputSectionProps {
  onSubmit: (requirements: string) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onSubmit, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-12 animate-fade-in-up">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 opacity-50"></div>
        
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Build Your Dream App <span className="text-brand-400">Instantly</span>
          </h2>
          <p className="text-gray-400">
            Describe your idea, tech preferences, and features. Our AI Architect will handle the rest.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="e.g., A SaaS platform for project management using Next.js, Supabase, and Stripe. Needs Kanban boards, team chat, and role-based auth..."
            className="w-full h-40 bg-dark-bg border border-dark-border rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none font-mono text-sm leading-relaxed"
          />
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-2">
              <span className="text-xs text-gray-500 bg-dark-bg px-2 py-1 rounded border border-dark-border">React</span>
              <span className="text-xs text-gray-500 bg-dark-bg px-2 py-1 rounded border border-dark-border">Node.js</span>
              <span className="text-xs text-gray-500 bg-dark-bg px-2 py-1 rounded border border-dark-border">Python</span>
              <span className="text-xs text-gray-500 bg-dark-bg px-2 py-1 rounded border border-dark-border">SQL/NoSQL</span>
            </div>
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all
                ${!input.trim() || isLoading 
                  ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-lg shadow-brand-500/20 active:scale-95'}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Architecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Blueprint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};