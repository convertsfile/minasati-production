'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  watermarkText?: string;
  lectureId: number;
  onViolation?: (type: 'screenshot' | 'screen_recording' | 'devtools' | 'tab_switch') => void;
}

export default function VideoPlayer({ videoUrl, onViolation }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Anti-screenshot protection - DISABLED for now
  // Can be re-enabled later when needed

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#000',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  );
}