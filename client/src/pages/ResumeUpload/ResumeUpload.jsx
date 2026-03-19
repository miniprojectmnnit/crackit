import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Target, ArrowRight, Loader2, Award } from 'lucide-react';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResumeData(null); // Reset on new file
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("user_id", localStorage.getItem("user_id") || "mock_user_123");

    try {
      const res = await fetch("http://localhost:5000/api/resume/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error("Failed to process resume");
      }

      const data = await res.json();
      setResumeData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartInterview = () => {
    if (resumeData && resumeData._id) {
       navigate(`/interview?resumeId=${resumeData._id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-white p-8 pt-24 font-sans max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent inline-block">
          AI Resume Analyzer
        </h1>
        <p className="text-gray-400 text-lg">Upload your resume to receive a personalized, structured technical interview.</p>
      </div>

      {!resumeData ? (
        <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col items-center">
          <div 
            className="w-full max-w-2xl border-2 border-dashed border-[#3A3F58] hover:border-indigo-500 transition-colors rounded-xl p-16 flex flex-col items-center justify-center bg-[#13151D] cursor-pointer"
            onClick={() => document.getElementById('resume-upload').click()}
          >
            <input 
              type="file" 
              id="resume-upload" 
              className="hidden" 
              accept=".pdf,.txt"
              onChange={handleFileChange}
            />
            
            <Upload size={48} className="text-indigo-400 mb-6" />
            
            {file ? (
              <div className="text-center">
                <p className="text-xl font-medium text-white mb-2">{file.name}</p>
                <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-medium text-white mb-2">Click to browse or drag and drop</p>
                <p className="text-gray-400 text-sm">Supports PDF and TXT</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 text-red-400 bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20 w-full max-w-2xl">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className={`mt-8 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 w-full max-w-sm transition-all shadow-lg ${
              !file || isProcessing 
              ? 'bg-[#2A2E3D] text-gray-500 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 cursor-pointer'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing Document...
              </>
            ) : (
              <>
                Analyze Resume <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-[#1A1D27] border border-[#2A2E3D] rounded-2xl p-8 shadow-xl">
             <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#2A2E3D]">
               <div className="bg-green-500/20 p-3 rounded-full text-green-400">
                 <CheckCircle size={28} />
               </div>
               <div>
                  <h2 className="text-2xl font-bold text-white">Resume Analyzed Successfully</h2>
                  <p className="text-gray-400">"{resumeData.candidate_info?.name || "Candidate"}"</p>
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                <div>
                   <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText className="text-indigo-400" size={20}/> 
                      Extracted Technical Skills
                   </h3>
                   <div className="flex flex-wrap gap-2">
                      {resumeData.technical_skills?.map((skill, idx) => (
                        <span key={idx} className="bg-[#2A2E3D] text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                   </div>
                </div>

                <div>
                   <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                     <Target className="text-orange-400" size={20} />
                     Initial Domain Profile (Low Confidence)
                   </h3>
                   <div className="space-y-3">
                     {Object.entries(resumeData.domain_scores || {})
                       .filter(([_, score]) => score > 0)
                       .map(([domain, score]) => (
                       <div key={domain} className="flex justify-between items-center bg-[#13151D] p-3 rounded-lg border border-[#2A2E3D]">
                          <span className="text-gray-300 font-medium">{domain}</span>
                          <span className="text-orange-400 font-bold">{score.toFixed(1)} / 10</span>
                       </div>
                     ))}
                   </div>
                   <p className="text-xs text-gray-500 mt-2 italic">*These scores are unverified resume claims and will be tested during the interview.</p>
                </div>
             </div>

             {resumeData.projects?.length > 0 && (
                <div className="mt-8">
                   <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Award className="text-blue-400" size={20} />
                      Projects Detected
                   </h3>
                   <div className="grid md:grid-cols-2 gap-4">
                     {resumeData.projects.map((proj, idx) => (
                        <div key={idx} className="bg-[#13151D] p-4 rounded-xl border border-[#2A2E3D]">
                           <h4 className="font-bold text-white text-lg">{proj.name}</h4>
                           <p className="text-sm text-gray-400 mt-1 mb-3 line-clamp-2">{proj.description}</p>
                           <div className="flex flex-wrap gap-1">
                             {proj.technologies_used?.slice(0, 4).map(t => (
                               <span key={t} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{t}</span>
                             ))}
                           </div>
                        </div>
                     ))}
                   </div>
                </div>
             )}
          </div>

          <div className="flex justify-center">
            <button
               onClick={handleStartInterview}
               className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/25 px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-transform hover:scale-105"
            >
               Start AI Technical Interview <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
