'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings2 } from 'lucide-react';
import useSound from 'use-sound';

type Player = 'white' | 'black';

// Helper Format Waktu
const formatTime = (timeInSeconds: number) => {
  if (timeInSeconds <= 0) return "00:00";

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 10); // Hanya ambil 1 digit desimal

  if (timeInSeconds < 10) {
    return `${seconds.toString().padStart(1, '0')}.${milliseconds}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- KOMPONEN UI TOMBOL PLAYER (Reusable) ---
const PlayerButton = ({ 
  player, 
  time, 
  isActive, 
  isLoser, 
  handlePlayerTap,
  isPlaying,
  winner,
  initialTime,
}: { 
  player: Player, 
  time: number, 
  isActive: boolean, 
  isLoser: boolean, 
  handlePlayerTap: (player: Player) => void,
  isPlaying: boolean,
  winner: Player | 'draw' | null,
  initialTime: number,
}) => {
  const isWhite = player === 'white';
  
  // Warna Dinamis
  let bgColor = "var(--color-bg-secondary)"; // Default (Idle)
  if (isLoser) bgColor = "rgba(var(--color-accent-red), 0.2)"; // Kalah
  else if (isActive) bgColor = isWhite ? "rgb(var(--color-accent-blue))" : "rgb(var(--color-accent-red))"; // Aktif
  else if (!isActive && isPlaying && !winner) bgColor = "rgba(var(--color-bg-secondary), 0.5)"; // Menunggu giliran

  const progress = (time / initialTime) * 100;

  return (
    <div 
      onClick={() => handlePlayerTap(player)}
      style={{ backgroundColor: bgColor }}
      className={clsx(
        "relative flex flex-col items-center justify-center transition-all duration-300 ease-out overflow-hidden touch-manipulation active:scale-[0.98]",
        player === 'black' ? "flex-1 rotate-180" : "flex-1", // Rotasi untuk player hitam (atas)
      )}
    >
      {/* Background Glow Effect saat Aktif */}
      {isActive && (
         <div className="absolute inset-0 radial-gradient-mask-light opacity-50 pointer-events-none" />
      )}

      {/* Text Container */}
      <div className="z-10 text-center pointer-events-none select-none drop-shadow-lg">
        
        {/* Label Waktu */}
        <h2 className={clsx(
          "font-timer tracking-tight transition-all duration-300 font-bold",
          isActive ? "text-[5.5rem] md:text-9xl text-white scale-110" : "text-6xl md:text-8xl text-slate-400"
        )}>
          {formatTime(time)}
        </h2>

        {/* Indikator Status */}
        <div className="h-8 mt-2 flex justify-center items-center">
           {isLoser ? (
             <span className="bg-red-700 text-white px-3 py-1 rounded-full font-bold text-sm tracking-widest animate-pulse">TIME OUT</span>
           ) : isActive ? (
             <span className="text-white/80 font-medium text-lg tracking-wider uppercase">Running</span>
           ) : (
             <span className="text-slate-400 font-medium text-lg uppercase tracking-wider">{player}</span>
           )}
        </div>
      </div>

      {/* Progress Bar Visual */}
      <div className="absolute bottom-0 left-0 h-2 bg-white/30 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
    </div>
  );
};

export default function ChessTimer() {
  const INITIAL_TIME = 600; 
  
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Audio
  const [playClick] = useSound('/sounds/click.mp3', { volume: 1.0 });
  const [playAlarm] = useSound('/sounds/alarm.mp3', { volume: 1.0 });

  const triggerSound = useCallback((type: 'click' | 'alarm') => {
    if (isMuted) return;
    if (type === 'click') playClick();
    if (type === 'alarm') playAlarm();
  }, [isMuted, playClick, playAlarm]);

  // Logic Worker
  useEffect(() => {
    const worker = new Worker(new URL('../workers/timer.worker.js', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event) => {
      if (event.data.type !== 'TICK') return;

      setActivePlayer((currentPlayer) => {
        if (!currentPlayer) return null;

        if (currentPlayer === 'white') {
          setWhiteTime((prevTime) => {
            const newTime = prevTime - 0.1;
            if (newTime <= 0) {
              setWinner('black');
              setIsPlaying(false);
              triggerSound('alarm');
              worker.postMessage({ command: 'STOP' });
              return 0;
            }
            return newTime;
          });
        } else {
          setBlackTime((prevTime) => {
            const newTime = prevTime - 0.1;
            if (newTime <= 0) {
              setWinner('white');
              setIsPlaying(false);
              triggerSound('alarm');
              worker.postMessage({ command: 'STOP' });
              return 0;
            }
            return newTime;
          });
        }
        return currentPlayer;
      });
    };

    return () => {
      worker.terminate();
    };
  }, [triggerSound]);

  // Controls Logic
  const handlePlayerTap = useCallback((player: Player) => {
    if (winner) return;
    if (!isPlaying && activePlayer === null) return; 

    if (activePlayer === player) {
      triggerSound('click');
      setActivePlayer(player === 'white' ? 'black' : 'white');
    }
  }, [winner, isPlaying, activePlayer, triggerSound]);

  const toggleGame = () => {
    if (winner) return;
    if (isPlaying) {
      setIsPlaying(false);
      workerRef.current?.postMessage({ command: 'STOP' });
    } else {
      setIsPlaying(true);
      if (!activePlayer) setActivePlayer('white');
      workerRef.current?.postMessage({ command: 'START', interval: 100 });
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setActivePlayer(null);
    setWhiteTime(INITIAL_TIME);
    setBlackTime(INITIAL_TIME);
    setWinner(null);
    workerRef.current?.postMessage({ command: 'STOP' });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 font-sans relative">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none z-0" />

      {/* --- PLAYER 2 (BLACK) --- */}
      <PlayerButton 
        player="black" 
        time={blackTime} 
        isActive={activePlayer === 'black'} 
        isLoser={winner === 'white'} 
        handlePlayerTap={handlePlayerTap}
        isPlaying={isPlaying}
        winner={winner}
        initialTime={INITIAL_TIME}
      />

      {/* --- MENU BAR (Floating Glassmorphism) --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center justify-between pointer-events-auto">
          
          {/* Reset */}
          <button onClick={resetGame} className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition">
            <RotateCcw size={22} />
          </button>

          {/* Play/Pause (Big Button) */}
          <button 
            onClick={toggleGame}
            disabled={!!winner}
            className={clsx(
              "h-16 w-20 flex items-center justify-center rounded-xl transition-all shadow-lg active:scale-95",
              winner ? "bg-slate-700 opacity-50 cursor-not-allowed" :
              isPlaying ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-emerald-500 hover:bg-emerald-400 text-white"
            )}
          >
            {isPlaying ? <Pause fill="currentColor" size={32} /> : <Play fill="currentColor" size={32} className="ml-1" />}
          </button>

          {/* Sound Toggle */}
          <button onClick={() => setIsMuted(!isMuted)} className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition">
             {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>

          {/* Settings (Placeholder) */}
          <button className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition">
             <Settings2 size={22} />
          </button>

        </div>
      </div>

      {/* --- PLAYER 1 (WHITE) --- */}
      <PlayerButton 
        player="white" 
        time={whiteTime} 
        isActive={activePlayer === 'white'} 
        isLoser={winner === 'black'} 
        handlePlayerTap={handlePlayerTap}
        isPlaying={isPlaying}
        winner={winner}
        initialTime={INITIAL_TIME}
      />

    </div>
  );
}