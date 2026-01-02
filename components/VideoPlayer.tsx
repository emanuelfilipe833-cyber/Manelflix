
import React from 'react';
import { Play, Pause, Volume2, Maximize, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { IPTVItem, XCCredentials } from '../types';
import { getFirstEpisodeUrl } from '../utils/xtreamCodes';
import Hls from 'hls.js';

interface VideoPlayerProps {
  item: IPTVItem;
  onClose: () => void;
  creds?: XCCredentials;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose, creds }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function resolveUrl() {
      setIsLoading(true);
      setError(null);
      try {
        let rawUrl = '';
        if (item.url.startsWith('SERIES_ID:')) {
          if (!creds) throw new Error('Credenciais não encontradas.');
          const seriesId = item.url.split(':')[1];
          rawUrl = await getFirstEpisodeUrl(creds, seriesId);
        } else {
          rawUrl = item.url;
        }

        // Aplicamos o Proxy para evitar Mixed Content (HTTPS -> HTTP)
        if (creds?.useProxy && (rawUrl.startsWith('http:'))) {
          setVideoUrl(`https://corsproxy.io/?${encodeURIComponent(rawUrl)}`);
        } else {
          setVideoUrl(rawUrl);
        }
      } catch (e: any) {
        setError(e.message || 'Erro ao preparar vídeo.');
        setIsLoading(false);
      }
    }
    resolveUrl();
  }, [item.url, creds]);

  React.useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    
    // Identifica se deve usar HLS (Live ou extensão m3u8)
    const isHlsSource = videoUrl.includes('.m3u8') || item.group === 'Live';

    if (isHlsSource) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60
        });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS Error:', data);
            setError('Falha ao conectar ao canal. Tente desativar o Proxy se o erro persistir.');
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => {});
          setIsLoading(false);
        });
      }
    } else {
      // Filmes e Séries (MP4, MKV, etc)
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        setError('O formato deste vídeo não é suportado pelo seu navegador.');
        setIsLoading(false);
      };
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [videoUrl, item.group]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-20">
        <button onClick={onClose} className="text-white hover:text-red-600 flex items-center gap-3 transition-colors">
          <ChevronLeft size={32} />
          <div className="text-left">
            <span className="block font-black text-xl uppercase tracking-tighter truncate max-w-[200px]">{item.name}</span>
            <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">{item.group}</span>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-red-600 animate-spin" />
            <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.3em]">Carregando...</p>
          </div>
        )}

        {error ? (
          <div className="text-center px-10">
            <AlertTriangle className="text-red-600 mx-auto mb-6" size={48} />
            <h3 className="text-white text-lg font-black uppercase mb-2 tracking-tighter">Falha na Reprodução</h3>
            <p className="text-zinc-500 text-xs mb-8 uppercase leading-relaxed">{error}</p>
            <button onClick={onClose} className="bg-white text-black px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition">Voltar</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
            crossOrigin="anonymous"
          />
        )}
      </div>

      {!error && !isLoading && (
        <div className="absolute bottom-0 w-full p-10 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between pointer-events-none">
          <button onClick={togglePlay} className="text-white hover:text-red-600 pointer-events-auto transition-colors">
            {isPlaying ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" />}
          </button>
          <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white hover:text-red-600 pointer-events-auto transition-colors">
            <Maximize size={28} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
