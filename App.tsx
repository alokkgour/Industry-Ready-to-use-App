import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { BlueprintVisuals } from './components/BlueprintVisuals';
import { ResultTabs } from './components/ResultTabs';
import { CodeBlock } from './components/CodeBlock';
import { generateBlueprint, generateModuleCode } from './services/geminiService';
import { AppStatus, Blueprint, TabOption } from './types';
import { Bot, Terminal, AlertCircle, Loader, Loader2, Code, Download, ChevronRight, Zap, Shield, Layout, Database, Wifi, RefreshCw, Check, X } from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.SUMMARY);
  
  const [frontendCode, setFrontendCode] = useState<string>("");
  const [backendCode, setBackendCode] = useState<string>("");
  const [deploymentGuide, setDeploymentGuide] = useState<string>("");
  
  const [loadingModules, setLoadingModules] = useState({
    frontend: false,
    backend: false,
    deployment: false
  });

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database Connection Simulation State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  const handleCreateBlueprint = async (requirements: string) => {
    setStatus(AppStatus.GENERATING_BLUEPRINT);
    setError(null);
    setBlueprint(null);
    setFrontendCode("");
    setBackendCode("");
    setDeploymentGuide("");
    setLoadingModules({ frontend: false, backend: false, deployment: false });
    
    // Reset connection state
    setConnectionStatus('idle');
    setConnectionLogs([]);

    try {
      const result = await generateBlueprint(requirements);
      setBlueprint(result);
      setStatus(AppStatus.BLUEPRINT_READY);
      
      // Auto-start code generation
      setActiveTab(TabOption.FRONTEND);
      generateAllCode(result);
    } catch (e: any) {
      setError(e.message || "Failed to generate blueprint");
      setStatus(AppStatus.ERROR);
    }
  };

  const generateAllCode = (bp: Blueprint) => {
    setLoadingModules({ frontend: true, backend: true, deployment: true });

    // Stream Frontend
    generateModuleCode(bp, 'frontend', (chunk) => {
      setFrontendCode(prev => prev + chunk);
    })
    .then(() => setLoadingModules(prev => ({ ...prev, frontend: false })))
    .catch(() => setLoadingModules(prev => ({ ...prev, frontend: false })));

    // Stream Backend
    generateModuleCode(bp, 'backend', (chunk) => {
      setBackendCode(prev => prev + chunk);
    })
    .then(() => setLoadingModules(prev => ({ ...prev, backend: false })))
    .catch(() => setLoadingModules(prev => ({ ...prev, backend: false })));

    // Stream Deployment
    generateModuleCode(bp, 'deployment', (chunk) => {
      setDeploymentGuide(prev => prev + chunk);
    })
    .then(() => setLoadingModules(prev => ({ ...prev, deployment: false })))
    .catch(() => setLoadingModules(prev => ({ ...prev, deployment: false })));
  };

  const handleExport = async () => {
    if (!blueprint) return;
    setIsExporting(true);
    
    try {
      if (typeof JSZip === 'undefined' && !JSZip) {
          throw new Error("Compression library failed to load. Please refresh the page.");
      }

      const zip = new JSZip();
      const safeName = blueprint.appName ? blueprint.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'project';
      const folderName = safeName;
      
      // Helper to add files from XML-like string
      const addFilesFromContent = (content: string) => {
        if (!content) return false;
        
        const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
        let match;
        let found = false;
        while ((match = fileRegex.exec(content)) !== null) {
          found = true;
          const filePath = match[1];
          const fileContent = match[2].trim();
          zip.file(`${folderName}/${filePath}`, fileContent);
        }
        return found;
      };

      // Process modules
      let hasFiles = false;
      if (frontendCode && addFilesFromContent(frontendCode)) hasFiles = true;
      else if (frontendCode) zip.file(`${folderName}/frontend-guide.md`, frontendCode);

      if (backendCode && addFilesFromContent(backendCode)) hasFiles = true;
      else if (backendCode) zip.file(`${folderName}/backend-guide.md`, backendCode);

      if (deploymentGuide && addFilesFromContent(deploymentGuide)) hasFiles = true;
      else if (deploymentGuide) zip.file(`${folderName}/deployment.md`, deploymentGuide);

      // Add Blueprint metadata
      zip.file(`${folderName}/blueprint.json`, JSON.stringify(blueprint, null, 2));

      // Generate and download
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}-starter-kit.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error("Export failed", err);
      setError("Failed to export project files: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    setConnectionLogs(['Initializing connection pool...']);
    
    // Simulate finding .env
    const combined = backendCode + deploymentGuide;
    const envMatch = combined.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    const dbUrl = envMatch ? envMatch[1] : 'postgres://localhost:5432/app_db';
    
    await new Promise(r => setTimeout(r, 600));
    setConnectionLogs(prev => [...prev, `Loaded configuration from .env`]);
    setConnectionLogs(prev => [...prev, `Target: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`]);
    
    await new Promise(r => setTimeout(r, 800));
    setConnectionLogs(prev => [...prev, 'Authenticating user...']);
    
    await new Promise(r => setTimeout(r, 800));
    setConnectionLogs(prev => [...prev, 'Verifying schema permissions...']);
    
    await new Promise(r => setTimeout(r, 600));

    // Success simulation
    setConnectionStatus('success');
    setConnectionLogs(prev => [...prev, '✓ Connection established successfully.', '✓ Latency: 24ms']);
  };

  const renderContent = () => {
    if (!blueprint) return null;

    switch (activeTab) {
      case TabOption.SUMMARY:
        return <BlueprintVisuals blueprint={blueprint} />;
      
      case TabOption.STACK:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
             <div className="bg-dark-surface p-6 rounded-xl border border-dark-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Layout className="w-24 h-24 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                   <Code className="w-5 h-5 text-blue-400" /> Application Stack
                </h3>
                <div className="space-y-6 relative z-10">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Frontend</h4>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.techStack.frontend.map(t => <span key={t} className="px-3 py-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md text-sm font-medium">{t}</span>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Backend</h4>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.techStack.backend.map(t => <span key={t} className="px-3 py-1.5 bg-green-500/10 text-green-300 border border-green-500/20 rounded-md text-sm font-medium">{t}</span>)}
                    </div>
                  </div>
                </div>
             </div>
             
             <div className="bg-dark-surface p-6 rounded-xl border border-dark-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Database className="w-24 h-24 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                   <Shield className="w-5 h-5 text-amber-400" /> Infrastructure
                </h3>
                <div className="space-y-6 relative z-10">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Data Store</h4>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.techStack.database.map(t => <span key={t} className="px-3 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md text-sm font-medium">{t}</span>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Authentication</h4>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.authentication?.map(t => <span key={t} className="px-3 py-1.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm font-medium">{t}</span>) || <span className="text-gray-500 text-sm">Not specified</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">DevOps</h4>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.techStack.devOps.map(t => <span key={t} className="px-3 py-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md text-sm font-medium">{t}</span>)}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        );

      case TabOption.ARCHITECTURE:
        return (
          <div className="bg-dark-surface p-8 rounded-xl border border-dark-border animate-fade-in relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl"></div>
             <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-8 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-brand-500/20 rounded-lg">
                        <Zap className="w-5 h-5 text-brand-400" />
                     </div>
                     <h3 className="text-2xl font-bold text-white tracking-tight">{blueprint.architecture.pattern}</h3>
                  </div>
                  <p className="text-gray-400 mt-2 max-w-3xl leading-relaxed">{blueprint.architecture.explanation}</p>
                </div>
             </div>
             
             <div className="mt-8">
               <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Data Flow & Interaction</h4>
               <div className="space-y-0">
                  {blueprint.architecture.flowSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 relative pb-8 last:pb-0">
                       {idx !== blueprint.architecture.flowSteps.length - 1 && (
                         <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-brand-500/50 to-transparent"></div>
                       )}
                       <div className="w-10 h-10 shrink-0 rounded-full bg-dark-bg border border-brand-500/30 flex items-center justify-center text-brand-400 font-mono text-sm font-bold z-10 shadow-lg shadow-brand-900/20">
                          {idx + 1}
                       </div>
                       <div className="pt-2">
                          <p className="text-gray-300 bg-dark-bg/50 border border-dark-border p-4 rounded-lg">{step}</p>
                       </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        );

      case TabOption.DATABASE:
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Connection Tester */}
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <Wifi className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Connectivity Check
                        {connectionStatus === 'success' && <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                        {connectionStatus === 'failure' && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Failed</span>}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 max-w-md">
                        Test the connection to your configured database using the generated environment credentials.
                      </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTestConnection}
                        disabled={connectionStatus === 'testing' || (!backendCode && !deploymentGuide)}
                        className={`
                          flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all
                          ${connectionStatus === 'testing' || (!backendCode && !deploymentGuide)
                            ? 'bg-dark-bg text-gray-600 cursor-not-allowed border border-dark-border' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                        `}
                    >
                        {connectionStatus === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {connectionStatus === 'testing' ? 'Connecting...' : 'Test Connection'}
                    </button>
                </div>
              </div>

              {/* Terminal Logs */}
              {(connectionStatus !== 'idle' || connectionLogs.length > 0) && (
                <div className="mt-6 bg-[#0d1117] rounded-lg border border-dark-border p-4 font-mono text-xs overflow-hidden">
                  <div className="flex items-center gap-2 mb-3 border-b border-dark-border/50 pb-2">
                    <Terminal className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-500 uppercase tracking-widest text-[10px]">Connection Log</span>
                  </div>
                  <div className="space-y-1.5 h-32 overflow-y-auto custom-scrollbar">
                    {connectionLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 text-gray-300 animate-slide-up">
                         <span className="text-gray-600 shrink-0">{new Date().toLocaleTimeString()}</span>
                         <span className={log.includes('✓') ? 'text-green-400' : 'text-gray-300'}>{log}</span>
                      </div>
                    ))}
                    {connectionStatus === 'testing' && (
                       <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                         <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                         Processing...
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Schema Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {blueprint.databaseSchema.models.map((model, idx) => (
                <div key={idx} className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden hover:border-brand-500/30 transition-all hover:shadow-lg hover:shadow-brand-900/10">
                  <div className="bg-[#161b22] px-5 py-3 border-b border-dark-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-gray-200">{model.name}</h4>
                    </div>
                    <span className="text-xs bg-dark-bg px-2 py-0.5 rounded text-gray-500 border border-dark-border">Table</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Schema</div>
                      <ul className="space-y-1.5">
                        {model.fields.map((f, i) => (
                          <li key={i} className="text-sm text-gray-300 font-mono bg-dark-bg/50 px-2 py-1.5 rounded border border-dark-border/50 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {model.relationships.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Relations</div>
                        <ul className="space-y-1.5">
                          {model.relationships.map((r, i) => (
                            <li key={i} className="text-xs text-amber-300/80 bg-amber-500/5 px-2 py-1.5 rounded border border-amber-500/10 flex items-center gap-2">
                              <ChevronRight className="w-3 h-3"/> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case TabOption.FRONTEND:
        return (
          <div className="animate-fade-in">
             <CodeBlock content={frontendCode} enablePreview={true} isStreaming={loadingModules.frontend} />
          </div>
        );

      case TabOption.BACKEND:
        return (
          <div className="animate-fade-in">
             <CodeBlock content={backendCode} isStreaming={loadingModules.backend} />
          </div>
        );
        
      case TabOption.DEPLOYMENT:
        return (
          <div className="animate-fade-in">
             <CodeBlock content={deploymentGuide} isStreaming={loadingModules.deployment} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 selection:bg-brand-500/30 font-sans pb-20">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
                <Bot className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight text-white leading-tight">DevArchitect <span className="text-brand-400">AI</span></h1>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase hidden sm:block">Full-Stack Generator</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              {status === AppStatus.GENERATING_BLUEPRINT && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-brand-500/10 rounded-full border border-brand-500/20">
                   <Loader className="w-3 h-3 text-brand-400 animate-spin" />
                   <span className="text-xs font-medium text-brand-300">Processing Request...</span>
                </div>
              )}
              {status === AppStatus.BLUEPRINT_READY && !blueprint && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-xs font-medium text-green-300">System Ready</span>
                </div>
              )}
              <div className="w-px h-6 bg-dark-border hidden sm:block"></div>
              <a href="#" className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 <span className="hidden sm:inline">API Status: Operational</span>
              </a>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Input Phase */}
        <div className={blueprint ? "hidden" : "block"}>
           <InputSection 
            onSubmit={handleCreateBlueprint} 
            isLoading={status === AppStatus.GENERATING_BLUEPRINT} 
           />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 animate-slide-up">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Generation Failed</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {blueprint && (
          <div className="animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-dark-border pb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3 flex-wrap">
                  {blueprint.appName}
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">v1.0.0</span>
                </h2>
                <p className="text-base md:text-lg text-gray-400 font-light">{blueprint.tagline}</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => {
                    setBlueprint(null);
                    setStatus(AppStatus.IDLE);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  New Project
                </button>
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex flex-1 md:flex-none justify-center items-center gap-2 px-5 py-2.5 bg-white text-dark-bg font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg shadow-white/5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExporting ? 'Zipping...' : 'Export Project'}
                </button>
              </div>
            </div>

            <ResultTabs 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              loadingStates={loadingModules}
            />
            
            <div className="min-h-[500px] md:min-h-[600px] transition-all duration-300">
              {renderContent()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;