import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { File, Folder, ChevronRight, ChevronDown, Copy, Check, FileCode, FileJson, FileText, Terminal } from 'lucide-react';
import { clsx } from 'clsx';

interface CodeBlockProps {
  content: string;
}

interface ParsedFile {
  name: string;
  path: string[];
  content: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content }) => {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [activeFile, setActiveFile] = useState<ParsedFile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!content) return;

    // Regex to match <file name="...">...</file> pattern provided by Gemini
    const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
    const matches = [...content.matchAll(fileRegex)];

    if (matches.length > 0) {
      const parsed = matches.map(m => {
        const fullPath = m[1];
        const pathParts = fullPath.split('/');
        return {
          name: fullPath,
          path: pathParts,
          content: m[2].trim(),
          language: fullPath.split('.').pop() || 'txt'
        };
      });
      setFiles(parsed);
      setActiveFile(parsed[0]);
    } else {
      // Fallback: If no tags found, treat as single markdown block
      setFiles([]);
    }
  }, [content]);

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render basic markdown if not in file format
  if (files.length === 0) {
    return (
      <div className="prose prose-invert max-w-none text-sm">
        <ReactMarkdown
          components={{
            code({node, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              if (isInline) {
                return (
                  <code className="bg-dark-bg px-1 py-0.5 rounded text-brand-300 font-mono text-xs" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <div className="relative group my-4 rounded-lg overflow-hidden border border-dark-border bg-dark-bg">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-dark-border">
                    <span className="text-xs text-gray-500 font-mono">{match?.[1]}</span>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <code className="font-mono text-gray-300 whitespace-pre" {...props}>
                      {children}
                    </code>
                  </div>
                </div>
              );
            },
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-8 mb-4 border-b border-dark-border pb-2" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold text-brand-400 mt-6 mb-3" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 text-gray-400 mb-4" {...props} />,
            p: ({node, ...props}) => <p className="text-gray-400 leading-relaxed mb-4" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[600px] bg-[#0d1117] border border-dark-border rounded-xl overflow-hidden shadow-2xl animate-fade-in">
      {/* Sidebar - File Explorer */}
      <div className="w-full md:w-64 bg-[#161b22] border-r border-dark-border flex flex-col">
        <div className="p-3 border-b border-dark-border flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Explorer</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          <div className="space-y-0.5">
             {files.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setActiveFile(file)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left font-mono",
                    activeFile?.name === file.name 
                      ? "bg-brand-500/10 text-brand-400" 
                      : "text-gray-400 hover:bg-[#21262d] hover:text-gray-200"
                  )}
                >
                   {getFileIcon(file.name)}
                   <span className="truncate">{file.name}</span>
                </button>
             ))}
          </div>
        </div>
      </div>

      {/* Main Content - Code Editor View */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
        {/* Tab Header */}
        <div className="flex items-center justify-between border-b border-dark-border bg-[#0d1117] h-10 px-4">
           <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
              {getFileIcon(activeFile?.name || '')}
              {activeFile?.name}
           </div>
           
           <button 
             onClick={handleCopy}
             className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
           >
             {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
             {copied ? "Copied" : "Copy"}
           </button>
        </div>

        {/* Code Area */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
           {activeFile ? (
             <pre className="font-mono text-sm leading-relaxed text-gray-300 tab-4">
               <code>{activeFile.content}</code>
             </pre>
           ) : (
             <div className="flex items-center justify-center h-full text-gray-500 text-sm">
               Select a file to view content
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const getFileIcon = (filename: string) => {
  if (filename.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-yellow-500" />;
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
  if (filename.endsWith('.css')) return <FileCode className="w-3.5 h-3.5 text-pink-400" />;
  if (filename.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-gray-400" />;
  return <File className="w-3.5 h-3.5 text-gray-500" />;
};
