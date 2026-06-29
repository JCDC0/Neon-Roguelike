import React, { useState, useRef } from 'react';
import { Vec2 } from '../game/math';

interface JoystickProps {
  onMove: (dir: Vec2, isActive: boolean) => void;
  scale: number;
  position: 'left' | 'right';
}

export function Joystick({ onMove, scale, position }: JoystickProps) {
  const baseRadius = 60 * scale;
  const stickRadius = 30 * scale;
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState(new Vec2(0, 0));
  const touchId = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (active) return;
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    setActive(true);
    updatePos(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId.current) {
        updatePos(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        setActive(false);
        setPos(new Vec2(0, 0));
        onMove(new Vec2(0, 0), false);
        touchId.current = null;
        break;
      }
    }
  };

  const updatePos = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    
    if (dist > baseRadius) {
      dx = (dx / dist) * baseRadius;
      dy = (dy / dist) * baseRadius;
    }
    
    setPos(new Vec2(dx, dy));
    onMove(new Vec2(dx / baseRadius, dy / baseRadius), true);
  };

  return (
    <div 
      className={`absolute bottom-12 ${position === 'left' ? 'left-12' : 'right-12'} rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm touch-none z-40`}
      style={{ width: baseRadius * 2, height: baseRadius * 2 }}
      ref={baseRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div 
        className="absolute rounded-full bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        style={{ 
          width: stickRadius * 2, 
          height: stickRadius * 2,
          left: baseRadius - stickRadius + pos.x,
          top: baseRadius - stickRadius + pos.y
        }}
      />
    </div>
  );
}
