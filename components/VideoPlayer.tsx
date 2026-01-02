
import React from 'react';
import { X, Play, Pause, Volume2, Maximize, ChevronLeft } from 'lucide-react';
import { IPTVItem } from '../types';

interface VideoPlayerProps {
  item: IPTVItem;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <button onClick={onClose} className="text-white hover:text-gray-300 flex items-center gap-2">
          <ChevronLeft size={32} />
          <span className="font-bold text-lg">{item.name}</span>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Most HLS streams need a specific player in real apps, using native video for demo */}
        <video
          ref={videoRef}
          src={item.url}
          className="w-full max-h-screen"
          autoPlay
          controls={false}
          onEnded={onClose}
        />
        
        {/* Minimal Controls Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && <Play size={80} className="text-white opacity-50" />}
        </div>
      </div>

      <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black to-transparent flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={togglePlay} className="text-white">
            {isPlaying ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <Volume2 size={28} className="text-white" />
        </div>
        <div className="flex items-center gap-6">
          <Maximize size={28} className="text-white" />
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
