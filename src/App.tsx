/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { Joystick } from './components/Joystick';
import { Vec2 } from './game/math';
import { Pause } from 'lucide-react';

const UPGRADE_TYPES = [
  { id: 'count', name: 'Bullet Count', desc: 'Fires an additional bullet' },
  { id: 'damage', name: 'Damage Up', desc: 'Increases bullet damage' },
  { id: 'pierce', name: 'Pierce', desc: 'Bullets pass through an extra enemy' },
  { id: 'split', name: 'Split', desc: 'Bullets split on impact' },
  { id: 'fireRate', name: 'Fire Rate', desc: 'Increases shooting speed' }
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState({ 
    hp: 100, maxHp: 100, score: 0, gameOver: false,
    xp: 0, maxXp: 10, level: 1, showLevelUp: false, upgrades: [],
    isPaused: false, gameTime: 0, fps: 0
  });
  const engineRef = useRef<GameEngine | null>(null);
  const [upgradeChoices, setUpgradeChoices] = useState<any[]>([]);
  
  const [showFps, setShowFps] = useState(true);
  const [showStopwatch, setShowStopwatch] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);
  const [joystickScale, setJoystickScale] = useState(1.0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(pointer: coarse)").matches || /Mobi|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current, setGameState);
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  useEffect(() => {
    if (gameState.showLevelUp) {
      const shuffled = [...UPGRADE_TYPES].sort(() => 0.5 - Math.random());
      setUpgradeChoices(shuffled.slice(0, 4));
    }
  }, [gameState.showLevelUp]);

  const handleUpgrade = (type: string) => {
    if (engineRef.current) {
      engineRef.current.applyUpgrade(type);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden flex items-center justify-center touch-none">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          {isMobile && (
            <button 
              onClick={() => engineRef.current?.togglePause()}
              className="pointer-events-auto w-12 h-12 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors mb-2"
            >
              <Pause size={24} />
            </button>
          )}
          <div className="text-white font-mono text-xl font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
            SCORE: {gameState.score}
          </div>
          <div className="text-white font-mono text-lg font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
            LEVEL: {gameState.level}
          </div>
          <div className="w-64 h-6 bg-neutral-800 border-2 border-neutral-700 rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(255,0,0,0.3)]">
            <div 
              className="h-full bg-red-500 transition-all duration-200 ease-out"
              style={{ width: `${Math.max(0, (gameState.hp / gameState.maxHp) * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
              HP: {Math.max(0, Math.ceil(gameState.hp))} / {gameState.maxHp}
            </div>
          </div>
          <div className="w-64 h-4 bg-neutral-800 border-2 border-neutral-700 rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(0,255,170,0.3)] mt-1">
            <div 
              className="h-full bg-emerald-400 transition-all duration-200 ease-out"
              style={{ width: `${Math.max(0, (gameState.xp / gameState.maxXp) * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
              XP: {Math.floor(gameState.xp)} / {gameState.maxXp}
            </div>
          </div>
        </div>
      </div>

      {isMobile && !gameState.isPaused && !gameState.gameOver && !gameState.showLevelUp && (
        <>
          <Joystick 
            position="left" 
            scale={joystickScale} 
            onMove={(dir) => engineRef.current?.setJoystickMove(dir)} 
          />
        </>
      )}

      {showStopwatch && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="text-white font-mono text-2xl font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] bg-black/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
            {formatTime(gameState.gameTime)}
          </div>
        </div>
      )}

      {showFps && (
        <div className="absolute bottom-6 left-6 pointer-events-none z-10">
          <div className="text-neutral-400 font-mono text-sm font-bold bg-black/30 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/5">
            {gameState.fps} FPS
          </div>
        </div>
      )}

      {gameState.showLevelUp && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-8 backdrop-blur-md z-50 pointer-events-auto">
          <div className="relative">
            <h1 className="text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" style={{ animationDuration: '2s' }}>
              LEVEL UP!
            </h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 max-w-4xl px-4 w-full">
            {upgradeChoices.map((upgrade, i) => (
              <button
                key={i}
                onClick={() => handleUpgrade(upgrade.id)}
                className="flex-1 bg-neutral-900 border-2 border-neutral-700 rounded-xl p-6 hover:border-white hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 group text-left"
                style={{
                  animation: `slideUp 0.5s ease-out ${i * 0.1}s both`
                }}
              >
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                  {upgrade.name}
                </h3>
                <p className="text-neutral-400 font-mono text-sm leading-relaxed">
                  {upgrade.desc}
                </p>
              </button>
            ))}
          </div>
          
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(50px) scale(0.9); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}

      {gameState.isPaused && !gameState.gameOver && !gameState.showLevelUp && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-8 backdrop-blur-sm z-50 pointer-events-auto">
          <h1 className="text-6xl font-black text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
            PAUSED
          </h1>
          
          {showSettings ? (
            <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-2xl flex flex-col gap-6 min-w-[300px]">
              <h2 className="text-2xl font-bold text-white text-center mb-2">Settings</h2>
              
              <label className="flex items-center justify-between text-white font-mono cursor-pointer group">
                <span>Show FPS</span>
                <input 
                  type="checkbox" 
                  checked={showFps} 
                  onChange={(e) => setShowFps(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </label>
              
              <label className="flex items-center justify-between text-white font-mono cursor-pointer group">
                <span>Show Timer</span>
                <input 
                  type="checkbox" 
                  checked={showStopwatch} 
                  onChange={(e) => setShowStopwatch(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </label>

              {isMobile && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-between text-white font-mono">
                    <span>Joystick Scale</span>
                    <span>{joystickScale.toFixed(1)}x</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.1" 
                    value={joystickScale}
                    onChange={(e) => setJoystickScale(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}
              
              <button 
                onClick={() => setShowSettings(false)}
                className="mt-4 px-6 py-3 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-colors"
              >
                BACK
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => engineRef.current?.togglePause()}
                className="px-12 py-4 bg-white text-black font-bold text-xl rounded-xl hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_30px_rgba(16,185,129,0.8)] transition-all duration-300"
              >
                RESUME
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="px-12 py-4 bg-neutral-800 text-white font-bold text-xl rounded-xl hover:bg-neutral-700 transition-all duration-300"
              >
                SETTINGS
              </button>
              <button 
                onClick={() => engineRef.current?.restart()}
                className="px-12 py-4 bg-transparent border-2 border-white text-white font-bold text-xl rounded-xl hover:bg-red-500 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.8)] transition-all duration-300"
              >
                RESTART
              </button>
            </div>
          )}
        </div>
      )}

      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-6 backdrop-blur-sm z-50 pointer-events-auto">
          <h1 className="text-6xl font-black text-red-500 tracking-widest drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
            YOU DIED
          </h1>
          <p className="text-2xl text-white font-mono">FINAL SCORE: {gameState.score}</p>
          <p className="text-xl text-neutral-400 font-mono">TIME SURVIVED: {formatTime(gameState.gameTime)}</p>
          <button 
            onClick={() => engineRef.current?.restart()}
            className="px-8 py-4 bg-white text-black font-bold text-xl rounded hover:bg-red-500 hover:text-white hover:shadow-[0_0_30px_rgba(255,0,0,0.8)] transition-all duration-300 mt-4"
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
