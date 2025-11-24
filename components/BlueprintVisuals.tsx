import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { Blueprint } from '../types';
import { Database, Server, Layout, Shield, Cpu } from 'lucide-react';

interface BlueprintVisualsProps {
  blueprint: Blueprint;
}

export const BlueprintVisuals: React.FC<BlueprintVisualsProps> = ({ blueprint }) => {
  
  const complexityData = [
    { subject: 'Frontend', A: blueprint.estimatedComplexity.frontend, fullMark: 100 },
    { subject: 'Backend', A: blueprint.estimatedComplexity.backend, fullMark: 100 },
    { subject: 'DevOps', A: blueprint.estimatedComplexity.devOps, fullMark: 100 },
    { subject: 'Security', A: blueprint.estimatedComplexity.security, fullMark: 100 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Overview Card */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6 col-span-1 lg:col-span-2">
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-brand-400" /> System Overview
        </h3>
        <p className="text-gray-400 text-sm mb-6">{blueprint.summary}</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TechCard icon={<Layout className="w-4 h-4" />} title="Frontend" items={blueprint.techStack.frontend} color="text-blue-400" border="border-blue-500/30" />
          <TechCard icon={<Server className="w-4 h-4" />} title="Backend" items={blueprint.techStack.backend} color="text-green-400" border="border-green-500/30" />
          <TechCard icon={<Database className="w-4 h-4" />} title="Database" items={blueprint.techStack.database} color="text-amber-400" border="border-amber-500/30" />
          <TechCard icon={<Shield className="w-4 h-4" />} title="DevOps" items={blueprint.techStack.devOps} color="text-purple-400" border="border-purple-500/30" />
        </div>
      </div>

      {/* Complexity Chart */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6 flex flex-col">
        <h3 className="text-lg font-semibold text-white mb-4">Complexity Analysis</h3>
        <div className="flex-grow w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={complexityData}>
              <PolarGrid stroke="#2d3342" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Complexity"
                dataKey="A"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="#0ea5e9"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const TechCard = ({ icon, title, items, color, border }: { icon: React.ReactNode, title: string, items: string[], color: string, border: string }) => (
  <div className={`bg-dark-bg rounded-lg p-4 border ${border}`}>
    <div className={`flex items-center gap-2 mb-3 ${color} font-medium`}>
      {icon}
      <span>{title}</span>
    </div>
    <ul className="space-y-1">
      {items.slice(0, 4).map((item, i) => (
        <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-gray-600"></span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);