import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { File, Folder, ChevronRight, ChevronDown, Copy, Check, FileCode, FileJson, FileText, Terminal, Play, Eye, EyeOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface CodeBlockProps {
  content: string;
  enablePreview?: boolean;
  isStreaming?: boolean;
}

interface ParsedFile {
  name: string;
  path: string[];
  content: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, enablePreview = false, isStreaming = false }) => {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [activeFile, setActiveFile] = useState<ParsedFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!content) {
      setFiles([]);
      return;
    }

    // Regex to match <file name="...">...</file> pattern
    // We use a non-greedy match for content to handle multiple files
    const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
    const matches = [...content.matchAll(fileRegex)];
    
    // Also try to find a "partial" file at the end if we are streaming
    const partialRegex = /<file name="([^"]+)">([\s\S]*?)$/;
    
    let parsed: ParsedFile[] = [];

    if (matches.length > 0) {
      parsed = matches.map(m => {
        const fullPath = m[1];
        const pathParts = fullPath.split('/');
        return {
          name: fullPath,
          path: pathParts,
          content: m[2].trim(),
          language: fullPath.split('.').pop() || 'txt'
        };
      });
    }

    // If streaming and we have trailing content that looks like an open file tag
    if (isStreaming) {
      const lastMatchIndex = matches.length > 0 ? matches[matches.length - 1].index! + matches[matches.length - 1][0].length : 0;
      const remainingContent = content.slice(lastMatchIndex);
      const partialMatch = remainingContent.match(partialRegex);
      
      if (partialMatch) {
         const fullPath = partialMatch[1];
         parsed.push({
            name: fullPath,
            path: fullPath.split('/'),
            content: partialMatch[2], // raw content, might change
            language: fullPath.split('.').pop() || 'txt'
         });
      }
    }

    setFiles(parsed);

    // Set active file if none selected or if previously selected is no longer valid (rare)
    if (!activeFile && parsed.length > 0) {
      setActiveFile(parsed[0]);
    } else if (activeFile && !parsed.find(f => f.name === activeFile.name)) {
      // If the file we were looking at disappeared (shouldn't happen), reset
      // Or if it's the same name but updated content, we want to keep it selected
      const updated = parsed.find(f => f.name === activeFile.name);
      if (updated) {
         // Should update content automatically via render
      }
    }
  }, [content, isStreaming]);

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generatePreview = () => {
    if (!files.length) return;
    
    // Find entry points
    const mainFile = files.find(f => f.name.includes('main.tsx') || f.name.includes('index.tsx'));
    const indexHtml = files.find(f => f.name.endsWith('index.html'));

    if (!mainFile) {
      console.warn("No entry point found for preview");
      return;
    }

    // Create a map of file paths to Blob URLs
    const blobMap: Record<string, string> = {};
    
    const rewriteImports = (code: string) => {
      return code.replace(/import\s+(?:(?:\w+|\{[^}]+\})\s+from\s+)?['"](\.[^'"]+)['"]/g, (match, importPath) => {
         // Try to resolve relative path
         // This is a naive implementation. 
         const namePart = importPath.split('/').pop(); 
         // Find a file that ends with this name (naive resolution)
         const targetFile = files.find(f => {
            const fName = f.name.replace(/\.(tsx|ts|jsx|js)$/, '');
            const iName = importPath.replace(/\.(tsx|ts|jsx|js)$/, '').split('/').pop();
            return fName.endsWith(iName);
         });

         if (targetFile && blobMap[targetFile.name]) {
           return match.replace(importPath, blobMap[targetFile.name]);
         }
         return match;
      });
    };

    // Construct the HTML
    const appFile = files.find(f => f.name === 'src/App.tsx' || f.name === 'App.tsx');
    const cssFile = files.find(f => f.name.endsWith('.css'))?.content || '';

    if (!appFile) return;

    const sortedFiles = [
       ...files.filter(f => f.name.includes('utils') || f.name.includes('types')),
       ...files.filter(f => f.name.includes('components/')),
       ...files.filter(f => f.name.includes('pages/')),
       appFile,
       mainFile
    ];
    
    // Remove duplicates
    const uniqueFiles = Array.from(new Set(sortedFiles));

    let bundle = `
      window.process = { env: { NODE_ENV: 'development' } };
    `;

    uniqueFiles.forEach(f => {
       // Strip imports
       let content = f.content
         .replace(/import\s+.*from\s+['"].*['"];?/g, '')
         .replace(/export\s+default\s+/g, 'const DefaultExport = ')
         .replace(/export\s+/g, '');
       
       // Handle "export default function App" -> "function App"
       const name = f.name.split('/').pop()?.split('.')[0] || 'Unknown';
       
       // If it was export default, assign it to the name
       if (f.content.includes('export default')) {
          content += `\nwindow.${name} = DefaultExport || ${name};\n`;
       } else {
          // Named exports are already stripped of 'export'
       }
       
       bundle += `\n/* File: ${f.name} */\n${content}\n`;
    });

    // Add CSS
    const style = `<style>
      ${cssFile}
      body { background-color: #0f1117; color: white; }
    </style>`;

    const iframeContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/lucide@latest"></script>
          <script src="https://unpkg.com/lucide-react@latest"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          ${style}
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            // Mocks and Polyfills
            const { useState, useEffect, useContext, createContext, useRef } = React;
            
             // --- INJECTED BUNDLE START ---
             ${bundle}
             // --- INJECTED BUNDLE END ---

             // Mount
             const root = ReactDOM.createRoot(document.getElementById('root'));
             // Try to find App
             if (window.App) {
                root.render(<window.App />);
             } else {
                root.render(<div className="p-4 text-red-400">Could not auto-detect Entry Point (App). Code structure might be too complex for simple preview.</div>);
             }
          </script>
        </body>
      </html>
    `;
    
    const blob = new Blob([iframeContent], { type: 'text/html' });
    setPreviewUrl(URL.createObjectURL(blob));
  };

  useEffect(() => {
    if (showPreview && files.length > 0 && !previewUrl) {
       generatePreview();
    }
  }, [showPreview, files]);

  // Render basic markdown if not in file format
  if (files.length === 0 && !isStreaming) {
    return (
      <div className="prose prose-invert max-w-none text-sm">
        <ReactMarkdown
          components={{
            code({node, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '');
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
    <div className="flex flex-col md:flex-row h-[500px] md:h-[600px] bg-[#0d1117] border border-dark-border rounded-xl overflow-hidden shadow-2xl animate-fade-in relative">
      {/* Sidebar - File Explorer */}
      <div className="w-full md:w-64 bg-[#161b22] border-r border-dark-border flex flex-col max-h-[200px] md:max-h-full">
        <div className="p-3 border-b border-dark-border flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Explorer</span>
          </div>
          {isStreaming && <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>}
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          <div className="space-y-0.5">
             {files.map((file, idx) => {
               // Determine if this file is currently being streamed (last one)
               const isGenerating = isStreaming && idx === files.length - 1;
               return (
                <button
                  key={file.name + idx}
                  onClick={() => {
                    setActiveFile(file);
                    setShowPreview(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left font-mono group",
                    activeFile?.name === file.name && !showPreview
                      ? "bg-brand-500/10 text-brand-400" 
                      : "text-gray-400 hover:bg-[#21262d] hover:text-gray-200"
                  )}
                >
                   <div className="shrink-0">{getFileIcon(file.name)}</div>
                   <span className="truncate flex-1">{file.name}</span>
                   {isGenerating && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse ml-2"></span>}
                </button>
               );
             })}
             {files.length === 0 && isStreaming && (
                <div className="px-3 py-2 text-xs text-gray-500 italic flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></span>
                  Initializing...
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative h-full">
        {/* Tab Header */}
        <div className="flex items-center justify-between border-b border-dark-border bg-[#0d1117] h-10 px-4">
           <div className="flex items-center gap-2 text-sm text-gray-300 font-mono truncate mr-2">
              {!showPreview && getFileIcon(activeFile?.name || '')}
              <span className="truncate">{showPreview ? 'Live Preview (Beta)' : activeFile?.name}</span>
           </div>
           
           <div className="flex items-center gap-3 shrink-0">
             {enablePreview && files.length > 0 && (
               <button 
                 onClick={() => {
                    setShowPreview(!showPreview);
                    if (!showPreview) generatePreview();
                 }}
                 className={clsx(
                   "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors",
                   showPreview ? "bg-brand-500/20 text-brand-400" : "text-gray-400 hover:text-white"
                 )}
               >
                 {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                 {showPreview ? "Code" : "Preview"}
               </button>
             )}
             
             {!showPreview && (
               <button 
                 onClick={handleCopy}
                 className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
               >
                 {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                 {copied ? "Copied" : "Copy"}
               </button>
             )}
           </div>
        </div>

        {/* Editor or Preview Area */}
        <div className="flex-1 overflow-hidden relative">
           {showPreview ? (
             <div className="w-full h-full bg-white">
                {previewUrl ? (
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-full border-none"
                    title="Live Preview"
                    sandbox="allow-scripts allow-modals"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-800">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
                    <span className="text-sm">Building Preview...</span>
                  </div>
                )}
             </div>
           ) : (
             <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
                {activeFile ? (
                  <pre className="font-mono text-sm leading-relaxed text-gray-300 tab-4">
                    <code>{activeFile.content}</code>
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    {isStreaming ? "Generating files..." : "Select a file to view content"}
                  </div>
                )}
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