
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
  const [retryCount, setRetryCount] = React.useState(0);

  const resolveAndLoad = async () => {
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

      // Aplica Proxy se for HTTP ou se as credenciais pedirem
      const finalUrl = (url.startsWith('http:') || creds?.useProxy) 
        ? `https://corsproxy.io/?${encodeURIComponent(url)}`
        : url;
      
      setVideoUrl(finalUrl);
    } catch (e: any) {
      setError(e.message);
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    resolveAndLoad();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [item.url, creds]);

  React.useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // Tecnologia Blink: HLS.js para streams de TV
    if (videoUrl.includes('.m3u8') || item.group === 'Live') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingMaxRetry: 10,
          manifestLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 10,
          startLevel: -1,
          abrEwmaDefaultEstimate: 500000,
          testBandwidth: true
        });

        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (retryCount < 5) {
                  hls.startLoad();
                  setRetryCount(prev => prev + 1);
                } else {
                  setError('Falha na rede. O servidor IPTV pode estar offline.');
                  setIsLoading(false);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError('Erro fatal na reprodução.');
                hls.destroy();
                setIsLoading(false);
                break;
            }
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
      // Filmes (MP4/MKV)
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        setError('Este formato de vídeo não é compatível com seu navegador.');
        setIsLoading(false);
      };
    }
  }, [videoUrl, retryCount]);

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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Barra superior */}
      <div className="absolute top-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black to-transparent z-50">
        <button onClick={onClose} className="text-white hover:text-red-600 transition flex items-center gap-4">
          <ChevronLeft size={32} />
          <div className="text-left">
            <h2 className="font-black text-lg uppercase tracking-tight truncate max-w-[250px]">{item.name}</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.category}</p>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-red-600 animate-spin" />
            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">Injetando Stream...</span>
          </div>
        )}

        {error ? (
          <div className="text-center px-10">
            <AlertTriangle className="text-red-600 mx-auto mb-6" size={56} />
            <h3 className="text-white text-xl font-black uppercase mb-2 tracking-tighter">Ocorreu um Problema</h3>
            <p className="text-zinc-500 text-xs uppercase mb-10 max-w-xs mx-auto leading-relaxed">{error}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setRetryCount(0); resolveAndLoad(); }} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 active:scale-95 transition">
                <RefreshCcw size={16} className="inline mr-2" /> Tentar Novamente
              </button>
              <button onClick={onClose} className="text-zinc-500 font-black text-[10px] uppercase hover:text-white transition">Cancelar</button>
            </div>
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
        <div className="absolute bottom-0 w-full p-10 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between z-50">
          <button onClick={togglePlay} className="text-white hover:text-red-600 transition">
            {isPlaying ? <Pause size={42} fill="white" /> : <Play size={42} fill="white" />}
          </button>
          <div className="flex gap-6">
             <button onClick={() => { setRetryCount(0); resolveAndLoad(); }} className="text-zinc-400 hover:text-white transition">
              <RefreshCcw size={24} />
            </button>
            <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white hover:text-red-600 transition">
              <Maximize size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
