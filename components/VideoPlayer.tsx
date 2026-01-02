
import React from 'react';
import { Play, Pause, Maximize, ChevronLeft, Loader2, AlertTriangle, ExternalLink, RefreshCcw } from 'lucide-react';
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
        let url = '';
        if (item.url.startsWith('SERIES_ID:')) {
          if (!creds) throw new Error('Credenciais ausentes.');
          url = await getFirstEpisodeUrl(creds, item.url.split(':')[1]);
        } else {
          url = item.url;
        }

        // SEMPRE usamos o proxy para o player no navegador se for HTTP
        if (url.startsWith('http:')) {
          setVideoUrl(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        } else {
          setVideoUrl(url);
        }
      } catch (e: any) {
        setError(e.message);
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
    
    // Se for Live ou m3u8, usamos HLS.js
    if (videoUrl.includes('.m3u8') || item.group === 'Live') {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          manifestLoadingMaxRetry: 5,
          levelLoadingMaxRetry: 5
        });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError('Servidor IPTV não está enviando dados de vídeo no momento.');
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          setIsLoading(false);
        };
      }
    } else {
      // Filmes normais
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        setError('O formato deste vídeo não é compatível com o navegador.');
        setIsLoading(false);
      };
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black to-transparent z-50">
        <button onClick={onClose} className="text-white flex items-center gap-4">
          <ChevronLeft size={32} />
          <div className="text-left">
            <h2 className="font-bold text-lg uppercase truncate max-w-[200px]">{item.name}</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.group}</p>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-red-600 animate-spin" />
            <span className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.3em]">Conectando Stream</span>
          </div>
        )}

        {error ? (
          <div className="text-center px-10">
            <AlertTriangle className="text-red-600 mx-auto mb-4" size={48} />
            <h3 className="text-white font-bold mb-2">Erro na Transmissão</h3>
            <p className="text-zinc-500 text-xs uppercase mb-8">{error}</p>
            <button onClick={onClose} className="bg-white text-black px-8 py-3 rounded-full font-black text-[10px] uppercase">Voltar</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
          />
        )}
      </div>

      {!error && !isLoading && (
        <div className="absolute bottom-0 w-full p-10 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-50">
          <button onClick={togglePlay} className="text-white">
            {isPlaying ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" />}
          </button>
          <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white">
            <Maximize size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
