import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useAppContext } from '../context/AppContext';
import { Screen } from '../types';
import ColorPicker from './common/ColorPicker';

const DrawingScreen: React.FC = () => {
    const { setScreen, setLineArt, setError } = useAppContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const feedbackCanvasRef = useRef<HTMLCanvasElement>(null); // New canvas for feedback
    const lastVideoTimeRef = useRef(-1);
    const animationFrameId = useRef<number | null>(null);
    const handLandmarkerRef = useRef<HandLandmarker | null>(null);
    const isDrawingRef = useRef(false);
    const smoothedPointRef = useRef<{ x: number; y: number } | null>(null);

    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);
    const [strokeColor, setStrokeColor] = useState('#FFFFFF');
    const strokeColorRef = useRef(strokeColor);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const PINCH_THRESHOLD = 0.06; 
    const SMOOTHING_FACTOR = 0.3; 

    useEffect(() => {
        strokeColorRef.current = strokeColor;
    }, [strokeColor]);

    useEffect(() => {
        const createHandLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });
                handLandmarkerRef.current = landmarker;
                setIsMediaPipeReady(true);
            } catch (e) {
                console.error("Error creating HandLandmarker:", e);
                setError("手势识别模块加载失败");
            }
        };
        createHandLandmarker();
    }, [setError]);

    const predictWebcam = useCallback(() => {
        animationFrameId.current = requestAnimationFrame(predictWebcam);
        
        const video = videoRef.current;
        const handLandmarker = handLandmarkerRef.current;
        const canvas = canvasRef.current;
        const feedbackCanvas = feedbackCanvasRef.current;
        
        if (!isMediaPipeReady || !video || !handLandmarker || !canvas || !feedbackCanvas || video.paused || video.ended || video.readyState < 3 || video.currentTime === lastVideoTimeRef.current) {
            return;
        }

        lastVideoTimeRef.current = video.currentTime;
        const results = handLandmarker.detectForVideo(video, Date.now());
        const ctx = canvas.getContext('2d');
        const feedbackCtx = feedbackCanvas.getContext('2d');
        if (!ctx || !feedbackCtx) return;

        feedbackCtx.clearRect(0, 0, feedbackCanvas.width, feedbackCanvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            
            const distance = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
            const isPinching = distance < PINCH_THRESHOLD;

            const currentPoint = { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };

            if (!smoothedPointRef.current) {
                smoothedPointRef.current = currentPoint;
            }
            smoothedPointRef.current.x = smoothedPointRef.current.x * (1 - SMOOTHING_FACTOR) + currentPoint.x * SMOOTHING_FACTOR;
            smoothedPointRef.current.y = smoothedPointRef.current.y * (1 - SMOOTHING_FACTOR) + currentPoint.y * SMOOTHING_FACTOR;

            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            const videoAspect = videoWidth / videoHeight;
            const canvasAspect = canvasWidth / canvasHeight;
            
            let scale = 1;
            let offsetX = 0;
            let offsetY = 0;

            if (videoAspect > canvasAspect) {
                scale = canvasHeight / videoHeight;
                offsetX = (canvasWidth - videoWidth * scale) / 2;
            } else {
                scale = canvasWidth / videoWidth;
                offsetY = (canvasHeight - videoHeight * scale) / 2;
            }
            
            const getCanvasCoords = (point: {x: number, y: number}) => {
                const mirroredX = facingMode === 'user' ? (1 - point.x) : point.x;
                return {
                    x: (mirroredX * videoWidth * scale) + offsetX,
                    y: (point.y * videoHeight * scale) + offsetY
                };
            };
            
            const { x: canvasX, y: canvasY } = getCanvasCoords(smoothedPointRef.current);
            const { x: thumbCanvasX, y: thumbCanvasY } = getCanvasCoords(thumbTip);
            const { x: indexCanvasX, y: indexCanvasY } = getCanvasCoords(indexTip);

            // --- Visual Feedback Logic ---
            const pinchColor = 'rgba(52, 211, 153, 0.7)';
            const defaultColor = 'rgba(255, 255, 255, 0.7)';
            feedbackCtx.fillStyle = isPinching ? pinchColor : defaultColor;

            feedbackCtx.beginPath();
            feedbackCtx.arc(thumbCanvasX, thumbCanvasY, 10, 0, 2 * Math.PI);
            feedbackCtx.fill();

            feedbackCtx.beginPath();
            feedbackCtx.arc(indexCanvasX, indexCanvasY, 10, 0, 2 * Math.PI);
            feedbackCtx.fill();
            
            if (isPinching) {
                if (isDrawingRef.current) {
                    feedbackCtx.fillStyle = strokeColorRef.current;
                    feedbackCtx.beginPath();
                    feedbackCtx.arc(canvasX, canvasY, 7, 0, 2 * Math.PI);
                    feedbackCtx.fill();
                } else {
                    feedbackCtx.strokeStyle = strokeColorRef.current;
                    feedbackCtx.lineWidth = 3;
                    feedbackCtx.beginPath();
                    feedbackCtx.arc(canvasX, canvasY, 10, 0, 2 * Math.PI);
                    feedbackCtx.stroke();
                }
            }
            // --- End of Visual Feedback Logic ---

            if (isPinching) {
                if (!isDrawingRef.current) {
                    isDrawingRef.current = true;
                    ctx.beginPath();
                    ctx.moveTo(canvasX, canvasY);
                } else {
                    ctx.lineTo(canvasX, canvasY);
                    ctx.strokeStyle = strokeColorRef.current;
                    ctx.lineWidth = 5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                }
            } else {
                if (isDrawingRef.current) {
                    isDrawingRef.current = false;
                    ctx.closePath();
                    smoothedPointRef.current = null;
                }
            }
        } else {
            if (isDrawingRef.current) {
                isDrawingRef.current = false;
                ctx.closePath();
                smoothedPointRef.current = null;
            }
        }
    }, [isMediaPipeReady, facingMode]);

    const setupCamera = useCallback(async (mode: 'user' | 'environment') => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        if (!videoRef.current) return;

        const videoConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
        };

        let stream: MediaStream | null = null;
        let finalMode: 'user' | 'environment' = mode;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, facingMode: mode } });
        } catch (err) {
            console.warn(`Failed to get preferred camera (${mode}). Trying fallback.`);
            try {
                const fallbackMode = mode === 'user' ? 'environment' : 'user';
                stream = await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, facingMode: fallbackMode } });
                finalMode = fallbackMode;
            } catch (err2) {
                 console.warn(`Failed to get fallback camera. Trying any camera.`);
                 try {
                     stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
                 } catch (err3) {
                     console.error("All attempts to access camera failed.", err3);
                     setError("无法访问任何摄像头, 请检查设备和权限设置。");
                     return;
                 }
            }
        }
        
        setFacingMode(finalMode);
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', () => {
            if (videoRef.current && canvasRef.current && feedbackCanvasRef.current) {
                const canvas = canvasRef.current;
                const feedbackCanvas = feedbackCanvasRef.current;
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                feedbackCanvas.width = feedbackCanvas.clientWidth;
                feedbackCanvas.height = feedbackCanvas.clientHeight;
            }
        });
    }, [setError]);

    useEffect(() => {
        setupCamera(facingMode);
        
        const animId = requestAnimationFrame(predictWebcam);
        animationFrameId.current = animId;

        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [setupCamera, facingMode, predictWebcam]);
    

    const handleFlipCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
    };

    const handleClearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    const handleDone = () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            setLineArt(dataUrl);
            setScreen(Screen.CONFIG);
        }
    };

    return (
        <div className="relative h-screen w-full bg-black overflow-hidden max-w-md mx-auto">
             <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}></video>
             <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>
             <canvas ref={feedbackCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
            
            {!isMediaPipeReady && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="w-4/5 max-w-xs text-center text-white">
                        <h3 className="text-lg font-bold">正在加载手势识别引擎...</h3>
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animated-gradient"></div>
                        </div>
                        <p className="mt-2 text-sm text-gray-300">首次加载可能需要一些时间</p>
                    </div>
                </div>
            )}

            <header className="absolute top-0 left-0 right-0 z-20 pt-4 px-4">
                <div className="flex items-center justify-between text-white backdrop-blur-lg bg-white/10 p-2 rounded-xl border border-white/20 shadow-lg">
                    <span className="material-symbols-outlined text-4xl text-yellow-300">auto_awesome</span>
                    <h1 className="text-xl font-bold font-display leading-tight tracking-[-0.015em] text-center">指尖上的画笔</h1>
                    <span className="material-symbols-outlined text-4xl text-pink-300">local_florist</span>
                </div>
            </header>

            <footer className="absolute bottom-4 left-4 right-4 z-20">
                 {showColorPicker && <ColorPicker 
                    currentColor={strokeColor}
                    onColorSelect={(color) => { setStrokeColor(color); setShowColorPicker(false); }} 
                 />}
                <div className={`flex items-center justify-around gap-2 px-3 py-3 backdrop-blur-lg bg-white/20 rounded-xl shadow-xl border border-white/20 transition-opacity duration-300 ${!isMediaPipeReady ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={handleDone} className="flex flex-col items-center justify-center size-14 rounded-full bg-gradient-to-br from-green-300 to-green-500 text-white shadow-[0_4px_8px_rgba(0,0,0,0.2),_inset_0_2px_2px_rgba(255,255,255,0.5)] border-t border-l border-white/60 transform active:scale-95 transition-transform hover:brightness-110">
                        <span className="material-symbols-outlined text-4xl">check</span>
                    </button>
                    <button onClick={() => setShowColorPicker(p => !p)} className="flex flex-col items-center justify-center size-14 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 text-white shadow-[0_4px_8px_rgba(0,0,0,0.2),_inset_0_2px_2px_rgba(255,255,255,0.5)] border-t border-l border-white/60 transform active:scale-95 transition-transform hover:brightness-110">
                        <span className="material-symbols-outlined text-4xl">palette</span>
                    </button>
                    <button onClick={handleFlipCamera} className="flex flex-col items-center justify-center size-14 rounded-full bg-gradient-to-br from-purple-300 to-purple-500 text-white shadow-[0_4px_8px_rgba(0,0,0,0.2),_inset_0_2px_2px_rgba(255,255,255,0.5)] border-t border-l border-white/60 transform active:scale-95 transition-transform hover:brightness-110">
                        <span className="material-symbols-outlined text-4xl">flip_camera_android</span>
                    </button>
                    <button onClick={handleClearCanvas} className="flex flex-col items-center justify-center size-14 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 text-white shadow-[0_4px_8px_rgba(0,0,0,0.2),_inset_0_2px_2px_rgba(255,255,255,0.5)] border-t border-l border-white/60 transform active:scale-95 transition-transform hover:brightness-110">
                        <span className="material-symbols-outlined text-4xl">delete</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default DrawingScreen;