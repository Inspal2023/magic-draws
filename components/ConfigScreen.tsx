import React, { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Screen } from '../types';
import { getFunnyJokeOrQuote, getInspirationFromImage, optimizePromptWithText, runAiGuessAgent, runDrawingAssistantAgent } from '../services/geminiService';


const styleOptions = [
  { name: '日漫', icon: 'auto_awesome', color: 'text-pink-500' },
  { name: '3D卡通', icon: 'animation', color: 'text-orange-500' },
  { name: '蒸汽朋克', icon: 'precision_manufacturing', color: 'text-amber-700' },
  { name: '彩色简笔画', icon: 'palette', color: 'text-teal-500' },
  { name: '中国风', icon: 'token', color: 'text-red-600' },
  { name: '黑白素描', icon: 'gesture', color: 'text-slate-600' },
];

const ConfigScreen: React.FC = () => {
    const { 
        lineArt, 
        style, 
        prompt, 
        setScreen, 
        setStyle, 
        setPrompt, 
        setIsLoading, 
        setError,
        setGeneratedImage,
        setRenderTime,
        setLoadingText,
        setLoadingType
    } = useAppContext();

    /**
     * Handles the "Get Inspiration" feature.
     * If the prompt is empty, it analyzes the line art to generate a new prompt.
     * If the prompt has content, it optimizes the existing text.
     */
    const handleGetInspiration = useCallback(async () => {
        setLoadingType('inspiration');
        const inspirationMessages = [
          "哇，今天你的手指感觉好灵活啊",
          "看来今天你的灵感很Strong啊",
          "看来你的作品艺术成分真的很高，让我好欣赏一下",
          "嗯...看来你是一个被体育老师耽误了的艺术生"
        ];
        const randomMessage = inspirationMessages[Math.floor(Math.random() * inspirationMessages.length)];
        
        setLoadingText(randomMessage);
        setIsLoading(true);

        try {
            let newPrompt: string;
            if (prompt.trim() === '') {
                // Generate prompt from image if prompt is empty
                if (!lineArt) {
                    setError("请先绘制线条图以获取灵感");
                    setIsLoading(false);
                    return;
                }
                newPrompt = await getInspirationFromImage(lineArt);
            } else {
                // Optimize the existing prompt
                newPrompt = await optimizePromptWithText(prompt);
            }
            setPrompt(newPrompt);
        } catch (e) {
            console.error(e);
            setError("AI辅助失败, 请检查网络或API设置");
        } finally {
            setIsLoading(false);
            setLoadingText(null);
            setLoadingType(null);
        }
    }, [lineArt, prompt, setIsLoading, setError, setPrompt, setLoadingText, setLoadingType]);
    
    /**
     * Handles the main image generation logic.
     * @param {boolean} isGuess - If true, runs the "AI Guess" agent. Otherwise, runs the "Drawing Assistant" agent.
     */
    const handleGenerate = useCallback(async (isGuess: boolean) => {
        if (!lineArt) {
            setError("没有可用于生成的线条图");
            return;
        }
        
        // For standard generation, a prompt is required.
        if (!isGuess) {
            if (prompt.trim() === '') {
                setError("请输入创意提示词");
                return;
            }
        }
        
        setLoadingType('generation');
        // Fetch a funny quote for the loading screen to improve user experience.
        let jokeText = "正在为您生成天才画作...";
        try {
            jokeText = await getFunnyJokeOrQuote();
        } catch (e) {
            console.error("Failed to get joke/quote:", e);
        }
        setLoadingText(jokeText);
        setIsLoading(true);
        
        const startTime = Date.now();
        try {
            let generated: string;
            // Branch logic based on which generation mode was chosen.
            if (isGuess) {
                generated = await runAiGuessAgent(lineArt);
            } else {
                generated = await runDrawingAssistantAgent(lineArt, prompt, style);
            }
            
            const endTime = Date.now();
            // Use a descriptive style name for the preview screen.
            const finalStyle = isGuess ? "AI 猜猜" : (style || '自定义');

            // Update app state with the results and navigate to the preview screen.
            setRenderTime((endTime - startTime) / 1000);
            setGeneratedImage(generated);
            setStyle(finalStyle);
            setScreen(Screen.PREVIEW);

        } catch (e) {
            console.error(e);
            setError("图片生成失败, 请检查API密钥或网络连接");
        } finally {
            setIsLoading(false);
            setLoadingText(null);
            setLoadingType(null);
        }
    }, [lineArt, prompt, style, setIsLoading, setError, setGeneratedImage, setRenderTime, setScreen, setStyle, setLoadingText, setLoadingType]);

    /**
     * Resets the style and prompt fields to their initial empty states.
     */
    const handleReset = () => {
        // Set style to a non-matching value to visually deselect all options.
        setStyle(''); 
        setPrompt('');
    };

    // Derived state to control button disabled status
    const isPromptEmpty = prompt.trim() === '';

    return (
        <div className="font-display bg-gradient-to-b from-[#FFD700] to-[#FFFACD]">
            <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <header className="p-4 pt-5 z-10 flex items-center justify-between">
                    <button onClick={() => setScreen(Screen.DRAWING)} className="flex items-center gap-1 text-gray-800 transition-opacity hover:opacity-80">
                        <span className="material-symbols-outlined text-3xl">arrow_back</span>
                        <span className="text-lg font-bold">返回</span>
                    </button>
                     <button onClick={handleReset} className="flex items-center gap-1 text-gray-800 transition-opacity hover:opacity-80">
                        <span className="material-symbols-outlined text-3xl">restart_alt</span>
                        <span className="text-lg font-bold">重置</span>
                    </button>
                </header>
                <main className="flex-grow flex flex-col p-4 pt-0">
                    <div className="relative w-full aspect-square rounded-xl bg-white/40 backdrop-blur-lg border border-white/30 mb-6 flex items-center justify-center p-2 shadow-xl overflow-hidden">
                        {lineArt ? (
                            <img src={lineArt} alt="User drawing" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                                <span className="text-gray-700/80 text-sm font-medium">AI 识别的指绘线条图像</span>
                            </div>
                        )}
                    </div>

                    <h1 className="text-center text-xl font-bold tracking-[-0.015em] text-[#111618] mb-6">选择绘画风格 🌈</h1>
                    
                    <div className="w-full pb-4">
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {styleOptions.map(s => (
                                <button 
                                  key={s.name} 
                                  onClick={() => setStyle(s.name)} 
                                  className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all duration-200 backdrop-blur-md border ${
                                    style === s.name 
                                    ? 'bg-white/60 border-white font-bold shadow-lg scale-110' 
                                    : 'bg-white/25 border-white/50 hover:bg-white/40 active:scale-95'
                                  }`}
                                >
                                  <span className={`material-symbols-outlined text-3xl ${s.color}`}>{s.icon}</span>
                                  <span className={`text-xs font-semibold mt-1 ${s.color}`}>{s.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative mt-4 mb-6">
                        <textarea 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)}
                            maxLength={200}
                            className="w-full rounded-lg border border-white/30 bg-white/20 p-4 pr-12 text-gray-800 focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition-all duration-300 resize-none shadow-lg backdrop-blur-lg placeholder-gray-600" 
                            placeholder="输入你的创意提示词..." 
                            rows={3}
                        ></textarea>
                        <button onClick={handleGetInspiration} className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 transition-transform hover:scale-110 active:scale-95 shadow-md">
                            <span className="material-symbols-outlined text-white text-lg drop-shadow-md">auto_awesome</span>
                        </button>
                    </div>
                </main>
                <footer className="sticky bottom-0 z-10 bg-white/10 p-4 backdrop-blur-lg border-t border-white/20">
                    <div className="flex items-center justify-center gap-4">
                        <button 
                            onClick={() => handleGenerate(true)} 
                            disabled={!isPromptEmpty}
                            className="flex-1 flex h-14 w-full cursor-pointer items-center justify-center rounded-full text-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-95 bg-gradient-to-br from-cyan-400/80 to-blue-600/80 border border-white/30 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                            <span className="truncate drop-shadow-lg">AI猜猜 🤔</span>
                        </button>
                        <button 
                            onClick={() => handleGenerate(false)} 
                            disabled={isPromptEmpty}
                            className="flex-1 flex h-14 w-full cursor-pointer items-center justify-center rounded-full text-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-95 bg-gradient-to-br from-pink-500/80 to-purple-600/80 border border-white/30 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                            <span className="truncate drop-shadow-lg">开始绘制 ✨</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ConfigScreen;