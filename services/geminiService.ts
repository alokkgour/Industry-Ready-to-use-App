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
  moduleType: 'frontend' | 'backend' | 'deployment',
  onChunk?: (chunk: string) => void
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
    Do NOT use markdown code blocks or backticks.
    Output files using this strict XML format:
    
    <file name="src/App.tsx">
    import React from 'react';
    ...
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
      Expert Frontend Architect specializing in React, Vite, and Tailwind CSS.

      TASK:
      Generate the complete, production-ready frontend source code.

      REQUIREMENTS:
      1. **Project Structure**:
         - Use a standard Vite + React + TypeScript structure.
         - 'index.html' (Include <div id="root"></div>).
         - 'src/main.tsx' (Mount App to root).
         - 'src/App.tsx' (Main router/layout).
         - 'src/components/' (Reusable UI components).
         - 'src/pages/' (Route components).
         - 'src/lib/utils.ts' (Helper functions like clsx/tailwind-merge).
      
      2. **Live Preview Compatibility**:
         - Use standard 'lucide-react' imports for icons.
         - Do NOT use complex 3rd party libraries that require heavy config (like Redux) unless necessary. Use Context API or Zustand.
         - Ensure 'export default' is used for page components.
         - Use Tailwind CSS classes for ALL styling.
      
      3. **Quality & Responsiveness**:
         - Implement a modern, clean dashboard UI.
         - **CRITICAL**: Ensure all layouts are fully responsive (Mobile, Tablet, Desktop) using Tailwind's sm:, md:, lg: prefixes.
         - Include responsive navigation (Sidebar allows collapse or hidden on mobile with hamburger menu).
         - Mock data integration for immediate visual feedback.
         - Handle loading and empty states in UI.

      ${formatInstruction}
    `;
  } else if (moduleType === 'backend') {
    prompt = `
      CONTEXT:
      ${context}

      ROLE:
      Expert Backend Architect.

      TASK:
      Generate the complete, robust backend API source code.

      REQUIREMENTS:
      1. **Architecture**:
         - Use a layered architecture (Controllers, Services, Repositories).
         - 'src/server.ts' (Entry point).
         - 'src/app.ts' (Express/FastAPI setup).
      
      2. **Security & Best Practices**:
         - Implement global error handling middleware.
         - structured logging.
         - Input validation (Zod/Joi).
         - Environment variable configuration (dotenv).

      3. **Database & Seeding**:
         - Include models/schemas matching the blueprint.
         - **CRITICAL**: Include a seed script (e.g., 'prisma/seed.ts' or 'src/scripts/seed.ts') to populate the DB with mock data.
         - Add a "seed" script to 'package.json' (e.g., "seed": "ts-node prisma/seed.ts").
         - Ensure seed script handles conflicts (idempotent).

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
      1. **Docker**:
         - Optimized 'Dockerfile' (multistage build).
         - 'docker-compose.yml' for local dev (App + DB + Redis).
      
      2. **CI/CD**:
         - GitHub Actions workflow for testing and building.
      
      3. **Documentation**:
         - Comprehensive 'README.md' with setup steps.
         - '.env.example'.

      ${formatInstruction}
    `;
  }

  try {
    const result = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4096 },
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      const text = chunk.text();
      fullText += text;
      if (onChunk) onChunk(text);
    }

    return fullText || "Failed to generate code.";
  } catch (error) {
    console.error(`Code generation for ${moduleType} failed:`, error);
    return `// Error generating ${moduleType} code. Please try again. \n// ${error}`;
  }
};