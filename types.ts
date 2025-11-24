export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING_BLUEPRINT = 'GENERATING_BLUEPRINT',
  BLUEPRINT_READY = 'BLUEPRINT_READY',
  GENERATING_CODE = 'GENERATING_CODE',
  ERROR = 'ERROR',
}

export enum TabOption {
  SUMMARY = 'Summary',
  STACK = 'Tech Stack',
  ARCHITECTURE = 'Architecture',
  DATABASE = 'Database',
  FRONTEND = 'Frontend Code',
  BACKEND = 'Backend Code',
  DEPLOYMENT = 'Deployment',
}

// Structured output for the initial blueprint
export interface Blueprint {
  appName: string;
  tagline: string;
  summary: string;
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    devOps: string[];
  };
  authentication: string[];
  architecture: {
    pattern: string;
    explanation: string;
    flowSteps: string[];
  };
  databaseSchema: {
    models: Array<{
      name: string;
      fields: string[];
      relationships: string[];
    }>;
  };
  securityFeatures: string[];
  estimatedComplexity: {
    frontend: number;
    backend: number;
    devOps: number;
    security: number;
  };
}

export interface GeneratedCodeModule {
  id: string;
  title: string;
  language: string;
  content: string;
  description: string;
}

export interface ProjectState {
  status: AppStatus;
  requirements: string;
  blueprint: Blueprint | null;
  frontendCode: string | null;
  backendCode: string | null;
  deploymentGuide: string | null;
  error: string | null;
}