import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Loader2, ArrowLeft, Trophy, AlertTriangle, TrendingUp, CheckCircle, Award } from 'lucide-react';


const InterviewReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/interviews/session/${id}/report?user_id=${localStorage.getItem("user_id") || "mock_user_123"}`);
        if (!res.ok) throw new Error('Failed to fetch report');
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold font-sans">Generating Final Evaluation...</h2>
        <p className="text-gray-400 mt-2">Analyzing your performance across all domains</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center text-white px-4">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold mb-2">Error Loading Report</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-[#2A2E3D] hover:bg-[#3A3F58] rounded-lg transition-colors">
          Return Home
        </button>
      </div>
    );
  }

  // Format data for charts
  const radarData = Object.entries(reportData.skill_scores || {}).map(([domain, score]) => ({
    domain: domain.replace("Data Structures & Algorithms", "DSA").replace("Logical Reasoning", "Logic"),
    score: score
  }));

  const getScoreColor = (score) => {
    if (score >= 7) return "text-green-400";
    if (score >= 4) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-white p-8 pt-24 font-sans max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent inline-block">
          Interview Evaluation Report
        </h1>
        <p className="text-gray-400 text-lg">AI-generated analysis of your technical interview performance.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Summary & Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
             <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
               <Award className="text-yellow-400" /> Professional Summary
             </h2>
             <p className="text-gray-300 leading-relaxed text-lg">
                {reportData.professional_summary}
             </p>
          </div>

          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
             <h2 className="text-2xl font-bold mb-6">Domain Skill Breakdown</h2>
             <div className="h-[400px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                   <PolarGrid stroke="#3A3F58" />
                   <PolarAngleAxis dataKey="domain" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                   <PolarRadiusAxis angle={30} domain={[0, 10]} textAnchor="middle" tick={{ fill: '#6B7280' }} />
                   <Radar name="Observed Skill" dataKey="score" stroke="#818CF8" fill="#818CF8" fillOpacity={0.5} />
                   <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
             <h2 className="text-2xl font-bold mb-6">Resume vs. Observed Reality</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b border-[#2A2E3D] text-gray-400">
                     <th className="pb-4 font-medium">Technical Domain</th>
                     <th className="pb-4 font-medium text-center">Resume Claim</th>
                     <th className="pb-4 font-medium text-center">Observed Skill</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#2A2E3D]/50">
                   {reportData.resume_vs_observed?.map((item, idx) => (
                     <tr key={idx} className="hover:bg-[#2A2E3D]/20 transition-colors">
                       <td className="py-4 text-gray-200 font-medium">{item.domain}</td>
                       <td className="py-4 text-center">
                         <span className="bg-[#2A2E3D] px-3 py-1 rounded-full text-xs font-semibold text-gray-300">
                           {item.resume_claim}
                         </span>
                       </td>
                       <td className="py-4 text-center">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                           item.observed_skill === 'High' ? 'bg-green-500/20 text-green-400' :
                           item.observed_skill === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                           'bg-red-500/20 text-red-400'
                         }`}>
                           {item.observed_skill}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

        </div>

        {/* Right Column: Strengths & Weaknesses */}
        <div className="space-y-8">
          
          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
               <Trophy size={24} /> Verified Strengths
             </h3>
             {reportData.strengths?.length > 0 ? (
               <ul className="space-y-4">
                 {reportData.strengths.map((str, i) => (
                   <li key={i} className="flex gap-3 text-gray-300">
                     <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
                     <span className="text-sm">{str}</span>
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-gray-500 italic">No significant strengths detected (&gt;7/10).</p>
             )}
          </div>

          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-400">
               <AlertTriangle size={24} /> Weak Areas
             </h3>
             {reportData.weak_areas?.length > 0 ? (
               <ul className="space-y-4">
                 {reportData.weak_areas.map((weak, i) => (
                   <li key={i} className="flex gap-3 text-gray-300">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                     <span className="text-sm">{weak}</span>
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-gray-500 italic">No critical weak areas detected (&lt;4/10).</p>
             )}
          </div>

          <div className="bg-[#1A1D27] border border-blue-500/30 rounded-2xl p-8 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400">
               <TrendingUp size={24} /> Potential Growth Areas
             </h3>
             {reportData.potential_growth?.length > 0 ? (
               <ul className="space-y-4">
                 {reportData.potential_growth.map((growth, i) => (
                   <li key={i} className="flex gap-3 text-gray-300">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                     <span className="text-sm">{growth}</span>
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-gray-500 italic">Insufficient cross-domain data to infer potential growth.</p>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default InterviewReport;
