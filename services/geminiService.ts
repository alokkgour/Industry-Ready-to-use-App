import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Blueprint } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const blueprintSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    appName: { type: Type.STRING, description: "A creative name for the application" },
    tagline: { type: Type.STRING, description: "A short, punchy tagline" },
    summary: { type: Type.STRING, description: "A 2-paragraph executive summary of the system" },
    techStack: {
      type: Type.OBJECT,
      properties: {
        frontend: { type: Type.ARRAY, items: { type: Type.STRING } },
        backend: { type: Type.ARRAY, items: { type: Type.STRING } },
        database: { type: Type.ARRAY, items: { type: Type.STRING } },
        devOps: { type: Type.ARRAY, items: { type: Type.STRING } },
      }
    },
    authentication: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "List of auth strategies (e.g., JWT, OAuth2, Session, MFA)" 
    },
    architecture: {
      type: Type.OBJECT,
      properties: {
        pattern: { type: Type.STRING, description: "e.g., Microservices, Monolith, Serverless, Event-Driven" },
        explanation: { type: Type.STRING },
        flowSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "High level data flow steps" }
      }
    },
    databaseSchema: {
      type: Type.OBJECT,
      properties: {
        models: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              fields: { type: Type.ARRAY, items: { type: Type.STRING } },
              relationships: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    },
    securityFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedComplexity: {
      type: Type.OBJECT,
      properties: {
        frontend: { type: Type.NUMBER, description: "0-100 score" },
        backend: { type: Type.NUMBER, description: "0-100 score" },
        devOps: { type: Type.NUMBER, description: "0-100 score" },
        security: { type: Type.NUMBER, description: "0-100 score" },
      }
    }
  },
  required: ["appName", "summary", "techStack", "authentication", "architecture", "databaseSchema", "securityFeatures", "estimatedComplexity"]
};

export const generateBlueprint = async (requirements: string): Promise<Blueprint> => {
  if (!apiKey) throw new Error("API Key is missing");

  const model = "gemini-2.5-flash"; 
  
  const prompt = `
    You are a Senior Full-Stack Architect (Cursor + Lovable + Backend Builder). 
    Your job is to generate a comprehensive, production-ready architectural blueprint based on the user's requirements.
    
    User Requirements:
    "${requirements}"
    
    Guidelines:
    1. Tech Stack: Be opinionated. Choose the best modern stack (e.g., Next.js 14, NestJS/FastAPI, Postgres/Supabase) unless specified.
    2. Architecture: Ensure scalability and modularity.
    3. Security: Include best practices (RBAC, Rate Limiting, Sanitization).
    4. Database: Design a normalized schema with proper relationships.
    5. Auth: Specify robust authentication methods.

    Output strictly valid JSON matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: blueprintSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as Blueprint;
  } catch (error) {
    console.error("Blueprint generation failed:", error);
    throw error;
  }
};

export const generateModuleCode = async (
  blueprint: Blueprint, 
  moduleType: 'frontend' | 'backend' | 'deployment'
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const model = "gemini-3-pro-preview";

  const context = `
    App Name: ${blueprint.appName}
    Summary: ${blueprint.summary}
    Stack: ${JSON.stringify(blueprint.techStack)}
    Auth: ${JSON.stringify(blueprint.authentication)}
    DB Schema: ${JSON.stringify(blueprint.databaseSchema)}
  `;

  const formatInstruction = `
    OUTPUT FORMAT:
    Do NOT use markdown code blocks.
    Output files using this strict XML format:
    
    <file name="path/to/filename.ext">
    [Full code content here]
    </file>

    <file name="package.json">
    ...
    </file>
  `;

  let prompt = "";

  if (moduleType === 'frontend') {
    prompt = `
      CONTEXT:
      ${context}

      ROLE:
      Expert Frontend Architect specializing in React/Next.js and Tailwind CSS.

      TASK:
      Generate the complete, production-ready frontend source code.

      REQUIREMENTS:
      1. Core Structure:
         - 'src/main.tsx' (Entry)
         - 'src/App.tsx' (Routing with Layout and ErrorBoundary)
         - 'src/layout/DashboardLayout.tsx' (Sidebar + Header)
         - 'src/pages/' (Landing, Login, Register, Dashboard, NotFound)
         - 'src/components/ui/' (Button, Input, Card, Modal, Loader)
         - 'src/context/AuthContext.tsx' (Mock authentication logic)
         - 'src/hooks/' (useAuth, useData)
         - 'src/lib/api.ts' (Axios/Fetch setup with error interceptors)
         - 'src/styles/globals.css' (Tailwind imports)
         - 'vite.config.ts' & 'package.json'

      2. Features:
         - **Robust Error Handling**: Wrap main routes in an Error Boundary. Display toast notifications for API errors.
         - **Animations**: Use 'framer-motion' or Tailwind animate classes for page transitions.
         - **Responsiveness**: Ensure mobile-first design for all pages.
         - **Icons**: Use 'lucide-react' for all icons.

      3. Quality:
         - Code must be clean, typed (TypeScript), and modular.
         - Do not use placeholders like "TODO". Implement a working mock version.

      ${formatInstruction}
    `;
  } else if (moduleType === 'backend') {
    prompt = `
      CONTEXT:
      ${context}

      ROLE:
      Expert Backend Architect specializing in Node.js/Python/Go (based on stack).

      TASK:
      Generate the complete, robust backend API source code.

      REQUIREMENTS:
      1. Core Structure:
         - 'src/server.ts' (Server entry)
         - 'src/app.ts' (Express/App setup with Middleware)
         - 'src/config/database.ts' (DB Connection)
         - 'src/middleware/' (authMiddleware, errorMiddleware, rateLimiter)
         - 'src/routes/' (authRoutes, userRoutes, entityRoutes)
         - 'src/controllers/' (Logic for Auth and CRUD)
         - 'src/models/' (Schema definitions)
         - 'src/utils/' (AppError, catchAsync)
         - 'package.json'

      2. Security & Reliability:
         - **Global Error Handling**: Implement a centralized error handling middleware.
         - **Security**: Include Helmet, CORS, and basic Rate Limiting configuration.
         - **Validation**: Use Zod or Joi for request validation.
         - **Auth**: Implement a JWT-based authentication flow (register, login, me).

      3. Quality:
         - Use specific HTTP status codes.
         - Write clean, commented, and modular code.

      ${formatInstruction}
    `;
  } else {
    prompt = `
      CONTEXT:
      ${context}

      ROLE:
      DevOps Engineer.

      TASK:
      Generate the Deployment & CI/CD Pipeline configuration.

      REQUIREMENTS:
      1. Containerization:
         - 'Dockerfile' (Multi-stage build for small image size).
         - '.dockerignore'.
      2. Orchestration:
         - 'docker-compose.yml' (App, DB, Redis services).
      3. CI/CD:
         - '.github/workflows/ci-cd.yml' (Lint, Test, Build, Deploy).
      4. Config:
         - '.env.example' (List all necessary env vars).
         - 'README.md' (Setup instructions).

      ${formatInstruction}
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4096 },
      }
    });

    return response.text || "Failed to generate code.";
  } catch (error) {
    console.error(`Code generation for ${moduleType} failed:`, error);
    return `// Error generating ${moduleType} code. Please try again. \n// ${error}`;
  }
};