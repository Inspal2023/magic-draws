import React, { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { runAiGuessAgent, runDrawingAssistantAgent } from '../services/geminiService';
import { Screen } from '../types';

const PreviewScreen: React.FC = () => {
    const { 
        generatedImage, 
        style, 
        renderTime, 
        lineArt,
        prompt,
        setScreen,
        setIsLoading,
        setError,
        setGeneratedImage,
        setRenderTime,
        resetToConfig,
     } = useAppContext();

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magic-brush-art-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRerender = useCallback(async () => {
        if (!lineArt) {
            setError("无法重新渲染，原始线条图丢失");
            resetToConfig();
            return;
        }

        setIsLoading(true);
        const startTime = Date.now();
        try {
            let newImage: string;
            if (style === "AI 猜猜") {
                newImage = await runAiGuessAgent(lineArt);
            } else {
                if (!prompt) {
                    setError("无法重新渲染，原始提示词丢失。");
                    setIsLoading(false);
                    resetToConfig();
                    return;
                }
                newImage = await runDrawingAssistantAgent(lineArt, prompt, style);
            }
            
            const endTime = Date.now();
            setGeneratedImage(newImage);
            setRenderTime((endTime - startTime) / 1000);
        } catch (e) {
            console.error(e);
            setError("重新渲染失败");
        } finally {
            setIsLoading(false);
        }
    }, [lineArt, prompt, style, setIsLoading, setError, setGeneratedImage, setRenderTime, resetToConfig]);


    return (
        <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-hidden bg-gradient-to-b from-yellow-500 to-yellow-300">
            <div className="relative z-10 flex flex-col h-full min-h-screen">
                <header className="flex items-center p-4 pb-2 justify-between shrink-0 bg-white/10 backdrop-blur-md">
                    <button onClick={() => setScreen(Screen.CONFIG)} className="flex items-center gap-2 text-zinc-700">
                        <div className="flex size-10 shrink-0 items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">arrow_back</span>
                        </div>
                        <p className="text-base font-bold leading-normal tracking-[0.015em] shrink-0">返回</p>
                    </button>
                    <h1 className="text-zinc-900 text-lg font-bold leading-tight tracking-[-0.015em] absolute left-1/2 -translate-x-1/2">作品预览 🖼️</h1>
                    <div className="w-24"></div>
                </header>
                <main className="flex-grow flex flex-col justify-center items-center px-4 py-8">
                    <div className="w-full max-w-sm p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg">
                        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden">
                           {generatedImage ? (
                             <img src={generatedImage} alt="AI generated artwork" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                               <p className="text-gray-500">图片加载中...</p>
                            </div>
                           )}
                        </div>
                    </div>
                    <div className="w-full max-w-sm mt-6 p-4 rounded-xl bg-black/5 backdrop-blur-sm">
                        <div className="grid grid-cols-[auto_1fr] gap-x-4">
                            <div className="col-span-2 grid grid-cols-subgrid py-3 border-b border-white/20">
                                <p className="text-zinc-700 text-sm font-normal leading-normal">风格</p>
                                <p className="text-zinc-900 text-sm font-bold leading-normal text-right">{style || 'N/A'} 🌸</p>
                            </div>
                            <div className="col-span-2 grid grid-cols-subgrid py-3">
                                <p className="text-zinc-700 text-sm font-normal leading-normal">渲染时间</p>
                                <p className="text-zinc-900 text-sm font-bold leading-normal text-right">{renderTime?.toFixed(1) || 'N/A'}s</p>
                            </div>
                        </div>
                    </div>
                </main>
                <footer className="sticky bottom-0 z-20 w-full p-4 bg-white/20 backdrop-blur-lg">
                    <div className="flex gap-4">
                        <button onClick={handleRerender} className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 text-zinc-900 text-base font-bold leading-normal bg-gradient-to-br from-white/80 to-white/50 border border-white/50 shadow-lg active:scale-95 transition-transform">
                            <span className="truncate">重新渲染</span>
                        </button>
                        <button onClick={handleDownload} className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 text-white text-base font-bold leading-normal shadow-lg active:scale-95 transition-transform">
                            <span className="truncate">📥下载图片</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PreviewScreen;