// app/components/SecureVideoPlayer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/axios'; // 🚀 الاعتماد على عميل Axios الموحد

interface SecureVideoPlayerProps {
  lectureId: string | number;
  videoUrl: string;
  token: string;
  watermarkText?: string;
  initialTime?: number;
  onViolation?: (type: string) => void;
  onCompleted?: () => void;
  onProgress?: (currentTime: number, totalDuration: number) => void;
  streamId: string;
}

export default function SecureVideoPlayer({ 
  lectureId, 
  videoUrl, 
  token, 
  watermarkText, 
  initialTime = 0, 
  onViolation, 
  onCompleted, 
  onProgress, 
  streamId 
}: SecureVideoPlayerProps) {
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<any>(null);
  
  const [isClient, setIsClient] = useState(false);
  const [isKilled, setIsKilled] = useState(false); 
  const [killReason, setKillReason] = useState<'devtools' | 'account_shared'>('devtools');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const tokenRef = useRef(token);
  const streamIdRef = useRef(streamId);
  const onViolationRef = useRef(onViolation);
  const onCompletedRef = useRef(onCompleted);
  const onProgressRef = useRef(onProgress);
  const hasSoughtRef = useRef(false);

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { streamIdRef.current = streamId; }, [streamId]);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { hasSoughtRef.current = false; }, [lectureId]);

  // 1. حقن مكتبات Video.js
  useEffect(() => {
    if (!isClient) return;

    const loadScript = (src: string) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true); return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const initScripts = async () => {
      try {
        if (!document.querySelector('link[href*="video-js.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://vjs.zencdn.net/7.21.5/video-js.css';
          document.head.appendChild(link);
        }
        await loadScript('https://vjs.zencdn.net/7.21.5/video.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/videojs-contrib-quality-levels@2.1.0/dist/videojs-contrib-quality-levels.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/videojs-http-source-selector@1.1.6/dist/videojs-http-source-selector.min.js');
        setScriptsLoaded(true);
      } catch (err) {
        console.error("فشل تحميل مشغل الفيديو:", err);
      }
    };
    initScripts();
  }, [isClient]);

  // 2. نظام الحماية الذكي
  useEffect(() => {
    if (!isClient || isKilled) return;

    const executeKillSwitch = (reason: string) => { 
        setIsKilled(true); 
        setKillReason(reason as 'devtools' | 'account_shared'); 
        onViolationRef.current?.(reason); 
    };
    const reportWarning = (reason: string) => { onViolationRef.current?.(reason); };

    const devtoolsTrap = setInterval(() => {
      const start = performance.now();
      Function("debugger")(); 
      const end = performance.now();
      if (end - start > 100) executeKillSwitch('devtools'); 
    }, 2000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && (e.key === 'U' || e.key === 'S'))) {
        e.preventDefault(); executeKillSwitch('devtools'); 
      }
      if (e.key === 'PrintScreen') reportWarning('screenshot');
    };

    const handleCopyCut = (e: ClipboardEvent) => e.preventDefault();
    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current && !playerRef.current.paused()) {
        playerRef.current.pause();
        alert("تنبيه أمني: تم إيقاف الفيديو مؤقتاً لأنك غادرت الصفحة.");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(devtoolsTrap);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isClient, isKilled]);

  // 3. العلامة المائية
  useEffect(() => {
    if (!isClient || isKilled || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWatermark = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (canvas.width === 0 || canvas.height === 0) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const x = Math.random() * (canvas.width - 300) + 20;
      const y = Math.random() * (canvas.height - 50) + 30;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; 
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(watermarkText || "محتوى محمي", x, y);
    };

    drawWatermark();
    const interval = setInterval(drawWatermark, 4000);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.removedNodes.length > 0) mutation.removedNodes.forEach(node => { if (node === canvas) { setIsKilled(true); onViolationRef.current?.('devtools'); }});
        if (mutation.type === 'attributes' && mutation.attributeName === 'style' && mutation.target === canvas) {
          const style = window.getComputedStyle(canvas);
          if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden') { setIsKilled(true); onViolationRef.current?.('devtools'); }
        }
      });
    });

    observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    return () => { clearInterval(interval); observer.disconnect(); };
  }, [isClient, watermarkText, isKilled]); 

  // 4. تهيئة المشغل (تحديث الرابط الذكي)
  useEffect(() => {
    if (!isClient || !scriptsLoaded || !videoWrapperRef.current) return;

    const vjs = (window as any).videojs;
    if (!vjs) return;

    if (vjs.Vhs) {
      vjs.Vhs.xhr.beforeRequest = function (options: any) {
        let requestUri = options.uri || options.url;
        if (!requestUri) return options;
        
        if (requestUri.includes('backblazeb2.com') && requestUri.includes(' ')) {
          requestUri = requestUri.replace(/ /g, '%20');
        }
        
        // 🚀 الفلتر الذكي: يمنع تكرار /api/api ويدمج الرابط الأساسي بسلاسة
        const videoPathIndex = requestUri.indexOf('/api/video/');
        if (videoPathIndex !== -1) {
          try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
            // نأخذ الجزء بدءاً من /video/ لتجنب تكرار كلمة /api
            const endpoint = requestUri.substring(videoPathIndex + 4); 
            requestUri = `${apiBase}${endpoint}`;
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${tokenRef.current}`;
          } catch (e) {}
        }
        
        options.uri = requestUri;
        options.url = requestUri;
        return options;
      };
    }

    const videoElement = document.createElement('video-js');
    videoElement.className = "vjs-big-play-centered vjs-theme-city w-full h-full";
    videoElement.setAttribute('crossOrigin', 'anonymous');
    videoWrapperRef.current.innerHTML = '';
    videoWrapperRef.current.appendChild(videoElement);

    const player = vjs(videoElement, {
      controls: true,
      fill: true, 
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      controlBar: { pictureInPictureToggle: false },
      html5: { vhs: { overrideNative: true }, nativeAudioTracks: false, nativeVideoTracks: false },
      plugins: { httpSourceSelector: { default: 'auto' } },
      sources: [{ src: videoUrl, type: 'application/x-mpegURL' }],
    });

    playerRef.current = player;
    player.on('contextmenu', (e: Event) => e.preventDefault());

    if (typeof player.httpSourceSelector === 'function') player.httpSourceSelector();

    player.on('ended', async () => {
      const duration = player.duration();
      if (duration > 0) {
        try {
          // 🚀 استخدام Axios
          await api.post(`/lectures/${lectureId}/progress`, { 
            watch_time: duration, 
            total_duration: duration, 
            stream_id: streamIdRef.current,
            is_completed: true 
          });
        } catch (error) {}
      }
      onCompletedRef.current?.();
    });

    player.on('pause', () => {
      onProgressRef.current?.(player.currentTime(), player.duration());
    });

    player.ready(() => {
      if (initialTime > 0 && !hasSoughtRef.current) {
        player.currentTime(initialTime);
        hasSoughtRef.current = true;
      }
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [videoUrl, isClient, scriptsLoaded, lectureId, initialTime]);

  // 5. المزامنة (Ping باستخدام Axios)
  useEffect(() => {
    if (!isClient || isKilled || !token) return;

    const pingInterval = setInterval(async () => {
      const player = playerRef.current;
      if (!player || player.paused()) return; 
      
      if (player.playbackRate() > 2) player.playbackRate(2);

      const currentTime = player.currentTime();
      const duration = player.duration();

      if (currentTime > 0 && duration > 0) {
        try {
          // 🚀 استخدام Axios النظيف
          const res = await api.post(`/lectures/${lectureId}/progress`, {
            watch_time: currentTime, 
            total_duration: duration, 
            stream_id: streamIdRef.current 
          });
          
          if (res.data?.data?.is_completed || res.data?.is_completed) {
            onCompletedRef.current?.();
          }
          onProgressRef.current?.(currentTime, duration);
        } catch (error: any) {
          if (error.response && (error.response.status === 403 || error.response.status === 409)) {
             setIsKilled(true);
             setKillReason('account_shared');
             onViolationRef.current?.('account_shared');
          }
        }
      }
    }, 15000); 

    return () => clearInterval(pingInterval);
  }, [isClient, isKilled, lectureId, token]);

  if (!isClient) return null;
  if (!scriptsLoaded) {
    return (
      <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-white rounded-2xl shadow-inner border border-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-gray-300 tracking-wide">جاري تهيئة المشغل الآمن...</p>
        </div>
      </div>
    );
  }

 return (
    // 🚀 تم إضافة style={{ aspectRatio: '16/9', minHeight: '300px' }} لمنع انهيار الحاوية
    <div ref={containerRef} className="relative w-full bg-black overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10" style={{ aspectRatio: '16/9', minHeight: '300px' }} onContextMenu={(e) => e.preventDefault()}>
      <div data-vjs-player ref={videoWrapperRef} className={`absolute inset-0 w-full h-full ${isKilled ? 'hidden' : ''}`} />
      <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none z-[60] ${isKilled ? 'hidden' : ''}`} />

      {isKilled && (
        <div className="absolute inset-0 z-[100] w-full h-full bg-red-600 flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-3xl font-black mb-4 tracking-tight">تنبيه أمني صارم</h2>
          <p className="text-red-50 text-lg leading-relaxed max-w-2xl font-bold bg-black/20 p-6 rounded-xl border border-red-500/50">
            {killReason === 'devtools' ? (
              <>تم إيقاف تشغيل الفيديو لأن نظام الحماية اكتشف محاولة لاستخدام أدوات خارجية أو تصوير الشاشة.<br/>تم تسجيل هذه المحاولة كـ (مخالفة أمنية) في حسابك.</>
            ) : (
              <>تم اكتشاف جلسة مشاهدة أخرى نشطة لحسابك في نفس اللحظة!<br/>يُمنع مشاركة الحسابات وسيتم اتخاذ الإجراءات اللازمة ضد الحسابات المخالفة.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}