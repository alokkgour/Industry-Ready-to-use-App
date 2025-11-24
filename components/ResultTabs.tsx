import React from 'react';
import { TabOption } from '../types';
import { clsx } from 'clsx';
import { FileText, Layers, GitGraph, Database, Code, Terminal, Rocket, Loader2 } from 'lucide-react';

interface ResultTabsProps {
  activeTab: TabOption;
  setActiveTab: (tab: TabOption) => void;
  loadingStates?: {
    frontend: boolean;
    backend: boolean;
    deployment: boolean;
  };
}

export const ResultTabs: React.FC<ResultTabsProps> = ({ activeTab, setActiveTab, loadingStates }) => {
  const tabs = [
    { id: TabOption.SUMMARY, icon: FileText, loading: false },
    { id: TabOption.STACK, icon: Layers, loading: false },
    { id: TabOption.ARCHITECTURE, icon: GitGraph, loading: false },
    { id: TabOption.DATABASE, icon: Database, loading: false },
    { id: TabOption.FRONTEND, icon: Code, loading: loadingStates?.frontend },
    { id: TabOption.BACKEND, icon: Terminal, loading: loadingStates?.backend },
    { id: TabOption.DEPLOYMENT, icon: Rocket, loading: loadingStates?.deployment },
  ];

  return (
    <div className="w-full overflow-hidden mb-8">
      <div className="flex overflow-x-auto pb-2 gap-1 scrollbar-hide border-b border-dark-border/50">
        {tabs.map((tab) => {
          const Icon = tab.loading ? Loader2 : tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap border-b-2 relative top-[1px] select-none",
                isActive 
                  ? "border-brand-500 text-brand-400 bg-dark-surface" 
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-dark-surface/30"
              )}
            >
              <Icon className={clsx("w-4 h-4", isActive ? "text-brand-400" : "text-gray-500", tab.loading && "animate-spin")} />
              {tab.id}
            </button>
          );
        })}
      </div>
    </div>
  );
};