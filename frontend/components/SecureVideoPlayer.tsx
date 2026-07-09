'use client';

import { useEffect, useRef, useState } from 'react';

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

  // 🚀 استخدام Refs لمنع الـ Re-renders الكارثية وإعادة تشغيل الفيديو
  const tokenRef = useRef(token);
  const streamIdRef = useRef(streamId);
  const onViolationRef = useRef(onViolation);
  const onCompletedRef = useRef(onCompleted);
  const onProgressRef = useRef(onProgress);
  const hasSoughtRef = useRef(false); // قفل لضمان استرجاع الوقت مرة واحدة فقط

  useEffect(() => { setIsClient(true); }, []);
  
  // تحديث الـ Refs باستمرار دون التسبب في تدمير المشغل
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { streamIdRef.current = streamId; }, [streamId]);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  // إعادة ضبط قفل الوقت عند تغيير المحاضرة فقط
  useEffect(() => { hasSoughtRef.current = false; }, [lectureId]);

  // =================================================================
  // 🌟 حقن المكتبات مباشرة في المتصفح
  // =================================================================
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

  // -----------------------------------------------------------------
  // 1. نظام الحماية الذكي
  // -----------------------------------------------------------------
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
    
    // Tab switching security handling - Pauses the video and warns the user without recording a database violation
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (playerRef.current && !playerRef.current.paused()) {
          playerRef.current.pause();
          alert("تنبيه: تم إيقاف تشغيل الفيديو مؤقتاً لأنك غادرت الصفحة. يرجى عدم تغيير تبويب المتصفح أثناء مشاهدة المحاضرة!");
        }
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
  }, [isClient, isKilled]); // 🚀 تمت إزالة onViolation لعدم إعادة تشغيل الحماية بلا داعٍ

  // -----------------------------------------------------------------
  // 2. العلامة المائية الفولاذية
  // -----------------------------------------------------------------
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
      ctx.font = 'bold 22px Cairo, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; 
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(watermarkText || "Protected Content", x, y);
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
    return () => { 
      clearInterval(interval); 
      observer.disconnect(); 
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [isClient, watermarkText, isKilled]); 

  // -----------------------------------------------------------------
  // 3. تهيئة المشغل والاستماع لحدث الانتهاء القاطع
  // -----------------------------------------------------------------
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
        
        if (requestUri.includes('/api/')) {
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            if (requestUri.startsWith('http')) {
              const urlObj = new URL(requestUri);
              requestUri = `${API_URL}${urlObj.pathname}${urlObj.search}`;
            } else if (requestUri.startsWith('/api/')) {
              requestUri = API_URL + requestUri;
            }
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${tokenRef.current}`;
          } catch (e) {
            console.error("URL Parsing error", e);
          }
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
      html5: { vhs: { overrideNative: true } },
      plugins: {
        httpSourceSelector: { default: 'auto' }
      },
      sources: [{ src: videoUrl, type: 'application/x-mpegURL' }],
    });

    playerRef.current = player;

    player.on('contextmenu', (e: Event) => e.preventDefault());

    if (typeof player.httpSourceSelector === 'function') {
      player.httpSourceSelector();
    }

    player.on('ended', async () => {
      const duration = player.duration();
      if (duration > 0) {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${tokenRef.current}`, 
              'Content-Type': 'application/json', 
              'Accept': 'application/json' 
            },
            body: JSON.stringify({ 
              watch_time: duration, 
              total_duration: duration, 
              stream_id: streamIdRef.current,
              is_completed: true 
            })
          });
        } catch (error) {
          console.error("فشل إرسال نبضة الاغلاق النهائية:", error);
        }
      }
      onCompletedRef.current?.();
    });

    player.on('pause', () => {
      onProgressRef.current?.(player.currentTime(), player.duration());
    });

    player.ready(() => {
      // 🚀 القفل السحري: استرجاع الوقت مرة واحدة فقط!
      if (initialTime > 0 && !hasSoughtRef.current) {
        player.currentTime(initialTime);
        hasSoughtRef.current = true; // تم الاسترجاع بنجاح، لن نتدخل مجدداً
      }
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch (e) {}
        playerRef.current = null;
      }
    };
  // 🚀 أصبحت الـ Dependencies نظيفة جداً، لن يُعاد بناء المشغل إلا بتغير المحاضرة
  }, [videoUrl, isClient, scriptsLoaded, lectureId]);

  // -----------------------------------------------------------------
  // 4. نَبَضَات المراقبة وتقدم المشاهدة الدوري مع המزامنة האوفلاين
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!isClient || isKilled || !token) return;

    const syncOfflineProgress = async () => {
      if (typeof window === 'undefined') return;
      const offlineData = localStorage.getItem(`offline_sync_${lectureId}`);
      if (offlineData) {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: offlineData
          });
          if (res.ok) {
            localStorage.removeItem(`offline_sync_${lectureId}`);
          }
        } catch (e) {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', syncOfflineProgress);
      syncOfflineProgress();
    }

    const pingInterval = setInterval(async () => {
      const player = playerRef.current;
      if (!player || player.paused()) return; 
      
      if (player.playbackRate() > 2) {
          player.playbackRate(2);
      }

      const currentTime = player.currentTime();
      const duration = player.duration();

      if (currentTime > 0 && duration > 0) {
        const payload = JSON.stringify({ 
            watch_time: currentTime, 
            total_duration: duration, 
            stream_id: streamIdRef.current 
        });
        
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: payload
          });
          
          if (res.status === 403 || res.status === 409) {
             setIsKilled(true);
             setKillReason('account_shared');
             onViolationRef.current?.('account_shared');
             return;
          }

          if (res.ok) {
            const responseData = await res.json();
            const data = responseData.data || responseData;
            // تحديث حالة الاكتمال مباشرة من رد السيرفر
            if (data.is_completed) onCompletedRef.current?.();
          }
          
          onProgressRef.current?.(currentTime, duration);
        } catch (error) {
            if (typeof window !== 'undefined') {
                localStorage.setItem(`offline_sync_${lectureId}`, payload);
            }
        }
      }
    }, 15000); 

    return () => {
      clearInterval(pingInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', syncOfflineProgress);
      }
    };
  }, [isClient, isKilled, lectureId, token]);

  if (!isClient) return null;
  if (!scriptsLoaded) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center text-white rounded-md shadow-lg">
        <div className="flex flex-col items-center">
          <span className="text-4xl mb-2 animate-bounce">⚙️</span>
          <p>جاري تجهيز المشغل الآمن...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="video-player-container relative w-full aspect-video bg-black overflow-hidden rounded-md shadow-lg" onContextMenu={(e) => e.preventDefault()}>
      <div data-vjs-player ref={videoWrapperRef} className={`absolute inset-0 w-full h-full ${isKilled ? 'hidden' : ''}`} />
      <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none z-[60] ${isKilled ? 'hidden' : ''}`} />

      {isKilled && (
        <div className="absolute inset-0 z-[100] w-full h-full bg-red-900 flex flex-col items-center justify-center text-white p-6 text-center">
          <span className="text-5xl mb-4">🛑</span>
          <h2 className="text-2xl font-bold mb-2">تم إيقاف التشغيل</h2>
          <p className="text-red-200 text-sm leading-relaxed max-w-md">
            {killReason === 'devtools' ? (
              <>تم ايقاف الفيديو لانه تم ملاحظة محاولة استخدام لادوات المطور.<br/>سيتم ارسال هذا التحذير للاستاذ.<br/>قد يؤدي تكرر هذا التصرف الى حظر حسابك</>
            ) : (
              <>تم اكتشاف استخدام هذا الحساب للمشاهدة على جهاز آخر أو تبويب آخر في نفس اللحظة!<br/>(يُمنع مشاركة الحسابات حسب سياسة المنصة).</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}