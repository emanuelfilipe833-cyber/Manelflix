
import React from 'react';
import { Play, Pause, Maximize, ChevronLeft, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
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
  const hlsRef = React.useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  const resolveUrl = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '';
      if (item.url.startsWith('SERIES_ID:')) {
        url = await getFirstEpisodeUrl(creds!, item.url.split(':')[1]);
      } else {
        url = item.url;
      }

      // IMPORTANTE: Só usamos proxy para o VÍDEO se o servidor exigir.
      // Primeiro tentamos direto (mais rápido). Se o navegador bloquear, usamos proxy.
      setVideoUrl(url);
    } catch (e: any) {
      setError(e.message);
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    resolveUrl();
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [item.id]);

  React.useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) hlsRef.current.destroy();

    const loadStream = (url: string, useProxy: boolean) => {
      const finalUrl = useProxy ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url;
      
      if (Hls.isSupported() && (finalUrl.includes('.m3u8') || item.group === 'Live')) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          manifestLoadingMaxRetry: 5,
          levelLoadingMaxRetry: 5,
          fragLoadingMaxRetry: 5,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });
        hlsRef.current = hls;
        hls.loadSource(finalUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal && !useProxy) {
            // Se falhou sem proxy, tenta COM proxy automaticamente
            console.log('Falha direta. Tentando com Proxy...');
            loadStream(url, true);
          } else if (data.fatal) {
            setError('Este canal não pode ser reproduzido no momento.');
            setIsLoading(false);
          }
        });
      } else {
        video.src = finalUrl;
        video.onloadeddata = () => {
          video.play().catch(() => {});
          setIsLoading(false);
        };
        video.onerror = () => {
          if (!useProxy) {
            loadStream(url, true);
          } else {
            setError('Formato de vídeo incompatível com o navegador.');
            setIsLoading(false);
          }
        };
      }
    };

    loadStream(videoUrl, false);
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
      <div className="absolute top-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-50">
        <button onClick={onClose} className="text-white flex items-center gap-4">
          <ChevronLeft size={32} />
          <div className="text-left">
            <h2 className="font-black text-lg uppercase truncate max-w-[200px]">{item.name}</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.category}</p>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-red-600 animate-spin" />
            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Estabilizando Sinal</span>
          </div>
        )}

        {error ? (
          <div className="text-center px-8">
            <AlertTriangle className="text-red-600 mx-auto mb-4" size={56} />
            <h3 className="text-white text-xl font-black uppercase mb-4 tracking-tighter">O sinal caiu</h3>
            <button onClick={resolveUrl} className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition active:scale-95">Tentar Novamente</button>
          </div>
        ) : (
          <video ref={videoRef} className="w-full h-full object-contain" playsInline onClick={togglePlay} />
        )}
      </div>

      {!error && !isLoading && (
        <div className="absolute bottom-0 w-full p-10 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between z-50">
          <button onClick={togglePlay} className="text-white">
            {isPlaying ? <Pause size={42} fill="white" /> : <Play size={42} fill="white" />}
          </button>
          <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white">
            <Maximize size={28} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
