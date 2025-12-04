import React, { useState, ChangeEvent } from 'react';
import { JigsawGame } from './components/JigsawGame';
import { Difficulty } from './types';
import { PLACEHOLDER_IMAGE } from './constants';
import { generatePuzzleImage } from './services/geminiService';
import { Upload, Image as ImageIcon, Sparkles, AlertCircle, Play } from 'lucide-react';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(PLACEHOLDER_IMAGE);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Easy);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setImageSrc(evt.target.result as string);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = "A vibrant, high-contrast, magical landscape fantasy art, intricate details, 4k digital painting";
      const generatedImage = await generatePuzzleImage(prompt);
      setImageSrc(generatedImage);
    } catch (err) {
      setError("Failed to generate AI image. Please try again or upload your own.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isPlaying) {
    return (
      <div className="w-screen h-screen overflow-hidden">
        <JigsawGame 
          imageSrc={imageSrc} 
          difficulty={difficulty} 
          onBack={() => setIsPlaying(false)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl w-full bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row gap-8">
        
        {/* Left: Preview */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg group border-2 border-slate-700/50">
            <img 
              src={imageSrc} 
              alt="Puzzle Preview" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
              <h2 className="text-white text-xl font-bold">Preview</h2>
            </div>
            
            {/* Overlay Loading State */}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-emerald-400">
                 <Sparkles className="w-12 h-12 animate-spin mb-2" />
                 <span className="font-mono text-sm animate-pulse">Dreaming up a puzzle...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex-1 flex flex-col justify-center space-y-8">
          <div>
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
              Gemini Jigsaw
            </h1>
            <p className="text-slate-400 text-lg">Create, Upload, and Solve.</p>
          </div>

          <div className="space-y-6">
            
            {/* Difficulty Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {[Difficulty.Easy, Difficulty.Medium, Difficulty.Hard].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-3 rounded-xl font-bold transition-all ${
                      difficulty === level 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/25 shadow-lg scale-105' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {level === Difficulty.Easy ? 'Easy' : level === Difficulty.Medium ? 'Medium' : 'Hard'}
                    <span className="block text-xs font-normal opacity-70">{level}x{level}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-slate-700/50" />

            {/* Image Sources */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Image Source</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Upload Button */}
                <label className="relative flex flex-col items-center justify-center p-4 h-32 border-2 border-dashed border-slate-600 rounded-xl hover:border-emerald-400 hover:bg-slate-800/50 transition cursor-pointer group">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 mb-2 transition" />
                  <span className="text-sm text-slate-400 group-hover:text-white font-medium">Upload Image</span>
                </label>

                {/* AI Generate Button */}
                <button 
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className="relative flex flex-col items-center justify-center p-4 h-32 border-2 border-dashed border-slate-600 rounded-xl hover:border-purple-400 hover:bg-slate-800/50 transition cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-8 h-8 text-purple-400 group-hover:scale-110 transition mb-2" />
                  <span className="text-sm text-purple-300 group-hover:text-white font-medium">Generate AI Art</span>
                </button>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Start Button */}
            <button 
              onClick={() => setIsPlaying(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transform transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
            >
              <Play className="fill-current w-5 h-5" />
              Start Puzzle
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
