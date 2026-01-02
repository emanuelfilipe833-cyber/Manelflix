
import React from 'react';
import { Play, Pause, Volume2, Maximize, ChevronLeft } from 'lucide-react';
import { IPTVItem } from '../types';
import Hls from 'hls.js';

interface VideoPlayerProps {
  item: IPTVItem;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(item.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS Fatal Error:', data);
          setError('Não foi possível carregar este canal.');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari native support
      video.src = item.url;
    } else {
      setError('Seu navegador não suporta este formato de vídeo.');
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [item.url]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <button onClick={onClose} className="text-white hover:text-gray-300 flex items-center gap-2">
          <ChevronLeft size={32} />
          <span className="font-bold text-lg">{item.name}</span>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {error ? (
          <div className="text-center px-6">
            <p className="text-red-500 text-xl font-bold mb-2">Erro no Player</p>
            <p className="text-gray-400">{error}</p>
            <button onClick={onClose} className="mt-4 bg-white text-black px-4 py-2 rounded font-bold">Voltar</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full max-h-screen"
            autoPlay
            playsInline
            onClick={togglePlay}
          />
        )}
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && !error && <Play size={80} className="text-white opacity-50" />}
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
