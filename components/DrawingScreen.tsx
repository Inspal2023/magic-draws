import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useAppContext } from '../context/AppContext';
import { Screen } from '../types';
import ColorPicker from './common/ColorPicker';

const DrawingScreen: React.FC = () => {
    const { setScreen, setLineArt, setError } = useAppContext();
    
    // Refs for DOM elements and animation control
    const videoRef = useRef<HTMLVideoElement>(null); // For camera input
    const canvasRef = useRef<HTMLCanvasElement>(null); // For the final line drawing
    const feedbackCanvasRef = useRef<HTMLCanvasElement>(null); // For real-time user feedback (e.g., finger dots)
    const lastVideoTimeRef = useRef(-1); // Tracks the last processed video frame to avoid redundant processing
    const animationFrameId = useRef<number | null>(null); // Stores the ID of the requestAnimationFrame loop

    // Refs for hand tracking and drawing state
    const handLandmarkerRef = useRef<HandLandmarker | null>(null); // The MediaPipe HandLandmarker instance
    const isGestureDrawingRef = useRef(false); // Tracks if the user is currently drawing with a pinch gesture
    const smoothedPointRef = useRef<{ x: number; y: number } | null>(null); // Stores the smoothed coordinates of the drawing point

    // Component state
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // Camera facing mode
    const [isMediaPipeReady, setIsMediaPipeReady] = useState(false); // Tracks if the HandLandmarker model is loaded
    const [strokeColor, setStrokeColor] = useState('#FFFFFF'); // Current drawing color
    const strokeColorRef = useRef(strokeColor); // Ref to hold the current color for use in callbacks
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // State and refs for whiteboard (touch/mouse drawing) mode
    const [drawMode, setDrawMode] = useState<'gesture' | 'touch'>('gesture'); // Toggles between 'gesture' and 'touch' input
    const drawModeRef = useRef(drawMode); // Ref to hold the current draw mode for use in callbacks
    const isTouchDrawingRef = useRef(false); // Tracks if the user is currently drawing with touch/mouse

    // --- Constants for gesture control ---
    const PINCH_THRESHOLD = 0.06; // Normalized distance between thumb and index finger to trigger a "pinch"
    const SMOOTHING_FACTOR = 0.3; // Factor for smoothing hand movements (higher value = less smoothing)

    // Update refs when state changes to ensure callbacks have the latest values
    useEffect(() => {
        strokeColorRef.current = strokeColor;
    }, [strokeColor]);

    useEffect(() => {
        drawModeRef.current = drawMode;
    }, [drawMode]);

    // Initialize the MediaPipe HandLandmarker model
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
                    numHands: 1 // Track only one hand for performance
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

    /**
     * The main hand tracking and drawing loop, called on every animation frame.
     */
    const predictWebcam = useCallback(() => {
        // Re-queue the function for the next frame
        animationFrameId.current = requestAnimationFrame(predictWebcam);
        
        const video = videoRef.current;
        const handLandmarker = handLandmarkerRef.current;
        const canvas = canvasRef.current;
        const feedbackCanvas = feedbackCanvasRef.current;
        
        // Guard clause: exit if essential elements are not ready
        if (!isMediaPipeReady || !video || !handLandmarker || !canvas || !feedbackCanvas) {
            return;
        }

        const feedbackCtx = feedbackCanvas.getContext('2d');
        if (!feedbackCtx) return;
        // Clear the feedback canvas on every frame to remove old finger dots
        feedbackCtx.clearRect(0, 0, feedbackCanvas.width, feedbackCanvas.height);

        // If in touch mode, skip gesture detection entirely to save resources
        if (drawModeRef.current === 'touch') {
            return;
        }

        // Guard clause: exit if the video is not ready or hasn't updated
        if (video.paused || video.ended || video.readyState < 3 || video.currentTime === lastVideoTimeRef.current) {
            return;
        }

        lastVideoTimeRef.current = video.currentTime;
        // Detect hands in the current video frame
        const results = handLandmarker.detectForVideo(video, Date.now());
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Process hand landmarks if a hand is detected
        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            
            // Calculate distance between thumb and index finger to detect a pinch
            const distance = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
            const isPinching = distance < PINCH_THRESHOLD;

            // Use the midpoint of the fingertips as the drawing point
            const currentPoint = { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };

            // Apply smoothing to prevent jittery lines
            if (!smoothedPointRef.current) {
                smoothedPointRef.current = currentPoint;
            }
            smoothedPointRef.current.x = smoothedPointRef.current.x * (1 - SMOOTHING_FACTOR) + currentPoint.x * SMOOTHING_FACTOR;
            smoothedPointRef.current.y = smoothedPointRef.current.y * (1 - SMOOTHING_FACTOR) + currentPoint.y * SMOOTHING_FACTOR;

            // --- Coordinate Transformation Logic ---
            // This is crucial to map the normalized coordinates from MediaPipe (0-1)
            // to the pixel coordinates of our canvas, accounting for aspect ratio differences.
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            const videoAspect = videoWidth / videoHeight;
            const canvasAspect = canvasWidth / canvasHeight;
            
            let scale = 1, offsetX = 0, offsetY = 0;

            // Calculate scale and offset to fit the video feed within the canvas ('object-fit: cover' style)
            if (videoAspect > canvasAspect) {
                scale = canvasHeight / videoHeight;
                offsetX = (canvasWidth - videoWidth * scale) / 2;
            } else {
                scale = canvasWidth / videoWidth;
                offsetY = (canvasHeight - videoHeight * scale) / 2;
            }
            
            const getCanvasCoords = (point: {x: number, y: number}) => {
                // Mirror the X coordinate for the front camera for an intuitive "mirror" effect
                const mirroredX = facingMode === 'user' ? (1 - point.x) : point.x;
                return {
                    x: (mirroredX * videoWidth * scale) + offsetX,
                    y: (point.y * videoHeight * scale) + offsetY
                };
            };
            
            const { x: canvasX, y: canvasY } = getCanvasCoords(smoothedPointRef.current);
            const { x: thumbCanvasX, y: thumbCanvasY } = getCanvasCoords(thumbTip);
            const { x: indexCanvasX, y: indexCanvasY } = getCanvasCoords(indexTip);

            // --- Visual Feedback Logic (on feedback canvas) ---
            const pinchColor = 'rgba(52, 211, 153, 0.7)';
            const defaultColor = 'rgba(255, 255, 255, 0.7)';
            feedbackCtx.fillStyle = isPinching ? pinchColor : defaultColor;

            // Draw dots for both fingertips
            feedbackCtx.beginPath();
            feedbackCtx.arc(thumbCanvasX, thumbCanvasY, 10, 0, 2 * Math.PI);
            feedbackCtx.fill();
            feedbackCtx.beginPath();
            feedbackCtx.arc(indexCanvasX, indexCanvasY, 10, 0, 2 * Math.PI);
            feedbackCtx.fill();
            
            // Draw a special indicator at the drawing point when pinching
            if (isPinching) {
                if (isGestureDrawingRef.current) { // Solid dot if drawing
                    feedbackCtx.fillStyle = strokeColorRef.current;
                    feedbackCtx.beginPath();
                    feedbackCtx.arc(canvasX, canvasY, 7, 0, 2 * Math.PI);
                    feedbackCtx.fill();
                } else { // Circle outline if about to draw
                    feedbackCtx.strokeStyle = strokeColorRef.current;
                    feedbackCtx.lineWidth = 3;
                    feedbackCtx.beginPath();
                    feedbackCtx.arc(canvasX, canvasY, 10, 0, 2 * Math.PI);
                    feedbackCtx.stroke();
                }
            }

            // --- Actual Drawing Logic (on main canvas) ---
            if (isPinching) {
                if (!isGestureDrawingRef.current) {
                    // Start of a new line
                    isGestureDrawingRef.current = true;
                    ctx.beginPath();
                    ctx.moveTo(canvasX, canvasY);
                } else {
                    // Continue the current line
                    ctx.lineTo(canvasX, canvasY);
                    ctx.strokeStyle = strokeColorRef.current;
                    ctx.lineWidth = 5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                }
            } else {
                // End the current line when pinch is released
                if (isGestureDrawingRef.current) {
                    isGestureDrawingRef.current = false;
                    ctx.closePath();
                    smoothedPointRef.current = null; // Reset smoothing for the next line
                }
            }
        } else {
            // If no hand is detected, ensure any active drawing is stopped
            if (isGestureDrawingRef.current) {
                isGestureDrawingRef.current = false;
                ctx.closePath();
                smoothedPointRef.current = null;
            }
        }
    }, [isMediaPipeReady, facingMode]);

    /**
     * Sets up the camera with the specified facing mode. Includes robust fallback logic.
     */
    const setupCamera = useCallback(async (mode: 'user' | 'environment') => {
        // Stop any existing camera streams
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        if (!videoRef.current) return;

        const videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
        let stream: MediaStream | null = null;
        let finalMode: 'user' | 'environment' = mode;

        try { // Try preferred mode
            stream = await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, facingMode: mode } });
        } catch (err) {
            console.warn(`Failed to get preferred camera (${mode}). Trying fallback.`);
            try { // Try the other mode
                const fallbackMode = mode === 'user' ? 'environment' : 'user';
                stream = await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, facingMode: fallbackMode } });
                finalMode = fallbackMode;
            } catch (err2) {
                 console.warn(`Failed to get fallback camera. Trying any camera.`);
                 try { // Try without specifying a mode
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
            // Resize canvases to match their display size once video data is loaded
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

    // --- Touch/Mouse Drawing Handlers ---
    const getCoords = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e instanceof TouchEvent) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            return null;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);

    const handleDrawStart = useCallback((e: MouseEvent | TouchEvent) => {
        if (drawModeRef.current !== 'touch') return;
        e.preventDefault(); // Prevent scrolling on touch devices
        const coords = getCoords(e);
        if (!coords) return;
        
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        isTouchDrawingRef.current = true;
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    }, [getCoords]);

    const handleDrawMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isTouchDrawingRef.current || drawModeRef.current !== 'touch') return;
        e.preventDefault();
        const coords = getCoords(e);
        if (!coords) return;
        
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.lineTo(coords.x, coords.y);
        ctx.strokeStyle = strokeColorRef.current;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [getCoords]);

    const handleDrawEnd = useCallback(() => {
        if (!isTouchDrawingRef.current || drawModeRef.current !== 'touch') return;
        isTouchDrawingRef.current = false;
        canvasRef.current?.getContext('2d')?.closePath();
    }, []);

    // Effect to add and remove touch/mouse event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use { passive: false } to allow preventDefault()
        canvas.addEventListener('mousedown', handleDrawStart, { passive: false });
        canvas.addEventListener('mousemove', handleDrawMove, { passive: false });
        canvas.addEventListener('mouseup', handleDrawEnd, { passive: false });
        canvas.addEventListener('mouseleave', handleDrawEnd, { passive: false });
        canvas.addEventListener('touchstart', handleDrawStart, { passive: false });
        canvas.addEventListener('touchmove', handleDrawMove, { passive: false });
        canvas.addEventListener('touchend', handleDrawEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleDrawEnd, { passive: false });

        return () => {
            canvas.removeEventListener('mousedown', handleDrawStart);
            canvas.removeEventListener('mousemove', handleDrawMove);
            canvas.removeEventListener('mouseup', handleDrawEnd);
            canvas.removeEventListener('mouseleave', handleDrawEnd);
            canvas.removeEventListener('touchstart', handleDrawStart);
            canvas.removeEventListener('touchmove', handleDrawMove);
            canvas.removeEventListener('touchend', handleDrawEnd);
            canvas.removeEventListener('touchcancel', handleDrawEnd);
        };
    }, [handleDrawStart, handleDrawMove, handleDrawEnd]);
    
    // Main effect to set up the camera and start the animation loop
    useEffect(() => {
        setupCamera(facingMode);
        
        const animId = requestAnimationFrame(predictWebcam);
        animationFrameId.current = animId;

        // Cleanup function to stop camera and animation loop on component unmount
        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [setupCamera, facingMode, predictWebcam]);

    const handleToggleDrawMode = () => {
        setDrawMode(prev => prev === 'gesture' ? 'touch' : 'gesture');
    };
    
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
        // Clean up resources before transitioning
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }

        const canvas = canvasRef.current;
        if (canvas) {
            // Save the drawing and move to the next screen
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
                    <button 
                        onClick={handleToggleDrawMode} 
                        className={`flex flex-col items-center justify-center size-14 rounded-full text-white shadow-[0_4px_8px_rgba(0,0,0,0.2),_inset_0_2px_2px_rgba(255,255,255,0.5)] border-t border-l border-white/60 transform active:scale-95 transition-all duration-300 hover:brightness-110 ${
                            drawMode === 'touch' 
                            ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 scale-110' 
                            : 'bg-gradient-to-br from-blue-300 to-blue-500'
                        }`}
                    >
                        <span className="material-symbols-outlined text-4xl">draw</span>
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