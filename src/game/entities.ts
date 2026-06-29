import { Vec2 } from './math';

export class Particle {
  pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string; size: number;
  constructor(pos: Vec2, vel: Vec2, life: number, color: string, size: number) {
    this.pos = pos; this.vel = vel; this.life = life; this.maxLife = life; this.color = color; this.size = size;
  }
  update(dt: number) { this.pos = this.pos.add(this.vel.mul(dt)); this.life -= dt; this.vel = this.vel.mul(0.95); }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
    ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}

export type EnemyType = 'normal' | 'healer' | 'rainbow' | 'tank' | 'dasher' | 'swarmer' | 'ghost' | 'juggernaut' | 'splitter' | 'merger';

export class Enemy {
  pos: Vec2; hp: number; maxHp: number; radius: number = 15;
  speed: number; color: string; hitTimer: number = 0;
  sides: number;
  rotation: number = 0;
  type: EnemyType;
  xpValue: number;
  healTimer: number = 0;
  dashTimer: number = 0;
  isDashing: boolean = false;
  dashDir: Vec2 = new Vec2(0, 0);
  mergeTimer: number = 5;

  constructor(pos: Vec2, sides: number, difficulty: number, type: EnemyType = 'normal') {
    this.pos = pos; this.sides = sides; this.type = type;
    const hpMultiplier = sides - 2;
    const speedMultiplier = 6 - sides;
    
    this.maxHp = 15 * hpMultiplier * (1 + difficulty * 0.2);
    this.speed = (50 + 30 * speedMultiplier) * (1 + difficulty * 0.05);
    this.xpValue = Math.floor(hpMultiplier * (1 + difficulty * 0.5));

    if (type === 'healer') {
      this.maxHp *= 1.5;
      this.speed *= 0.8;
      this.color = '#00ffaa';
      this.xpValue *= 3;
      this.radius = 18;
    } else if (type === 'rainbow') {
      this.maxHp *= 4;
      this.speed *= 1.2;
      this.color = 'rainbow';
      this.xpValue *= 15;
      this.radius = 22;
    } else if (type === 'tank') {
      this.maxHp *= 5;
      this.speed *= 0.4;
      this.color = '#885533';
      this.xpValue *= 5;
      this.radius = 25;
      this.sides = 4;
    } else if (type === 'dasher') {
      this.maxHp *= 0.5;
      this.speed *= 2.5;
      this.color = '#00ffff';
      this.xpValue *= 2;
      this.radius = 12;
      this.sides = 3;
    } else if (type === 'swarmer') {
      this.maxHp *= 0.3;
      this.speed *= 1.5;
      this.color = '#ff00aa';
      this.xpValue *= 1;
      this.radius = 10;
      this.sides = 5;
    } else if (type === 'ghost') {
      this.maxHp *= 1.2;
      this.speed *= 1.1;
      this.color = 'rgba(255, 255, 255, 0.4)';
      this.xpValue *= 4;
      this.radius = 16;
      this.sides = 6;
    } else if (type === 'juggernaut') {
      this.maxHp *= 15;
      this.speed *= 0.25;
      this.color = '#aa0000';
      this.xpValue *= 25;
      this.radius = 40;
      this.sides = 8;
    } else if (type === 'splitter') {
      this.maxHp *= 1.5;
      this.speed *= 0.8;
      this.color = '#ffaa00';
      this.xpValue *= 3;
      this.radius = 20;
      this.sides = 6;
    } else if (type === 'merger') {
      this.maxHp *= 1.2;
      this.speed *= 0.6;
      this.color = '#5500ff';
      this.xpValue *= 5;
      this.radius = 22;
      this.sides = 5;
    } else {
      const colors: Record<number, string> = { 3: '#ff0055', 4: '#0055ff', 5: '#ffaa00', 6: '#aa00ff' };
      this.color = colors[sides] || '#ffffff';
    }
    this.hp = this.maxHp;
  }
  update(dt: number, playerPos: Vec2) {
    if (this.type === 'dasher') {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0 && !this.isDashing) {
        this.isDashing = true;
        this.dashTimer = 0.5;
        this.dashDir = playerPos.sub(this.pos).norm();
      } else if (this.isDashing) {
        this.pos = this.pos.add(this.dashDir.mul(this.speed * 4 * dt));
        this.dashTimer -= dt;
        if (this.dashTimer <= 0) {
          this.isDashing = false;
          this.dashTimer = 2 + Math.random() * 2;
        }
      } else {
        this.pos = this.pos.add(playerPos.sub(this.pos).norm().mul(this.speed * 0.5 * dt));
      }
    } else {
      this.pos = this.pos.add(playerPos.sub(this.pos).norm().mul(this.speed * dt));
    }
    this.rotation += (this.speed / 50) * dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.translate(this.pos.x, this.pos.y);
    
    if (this.color === 'rainbow') {
      ctx.fillStyle = this.hitTimer > 0 ? '#ffffff' : `hsl(${(Date.now() / 5) % 360}, 100%, 50%)`;
    } else {
      ctx.fillStyle = this.hitTimer > 0 ? '#ffffff' : this.color;
    }
    
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 15;
    
    ctx.save();
    ctx.rotate(this.rotation);
    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i * Math.PI * 2) / this.sides - Math.PI / 2;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    
    if (this.type === 'healer') {
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-15, -25, 30, 4);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(-15, -25, 30 * (this.hp / this.maxHp), 4);
    ctx.restore();
  }
}

export class Bullet {
  pos: Vec2; vel: Vec2; damage: number; pierce: number; split: number; life: number = 2;
  hitEnemies: Set<Enemy> = new Set();
  constructor(pos: Vec2, vel: Vec2, damage: number, pierce: number, split: number) {
    this.pos = pos; this.vel = vel; this.damage = damage; this.pierce = pierce; this.split = split;
  }
  update(dt: number) {
    this.pos = this.pos.add(this.vel.mul(dt));
    this.life -= dt;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ffff00'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffff00';
    ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export class XpOrb {
  pos: Vec2; value: number; isCollecting: boolean = false;
  color: string;
  constructor(pos: Vec2, value: number) { 
    this.pos = pos; this.value = value; 
    if (value >= 50) this.color = '#ffaa00';
    else if (value >= 15) this.color = '#aa00ff';
    else if (value >= 5) this.color = '#0055ff';
    else this.color = '#00ffaa';
  }
  update(dt: number, playerPos: Vec2) {
    if (!this.isCollecting && this.pos.dist(playerPos) < 60) {
      this.isCollecting = true;
    }
    if (this.isCollecting) {
      const dir = playerPos.sub(this.pos).norm();
      this.pos = this.pos.add(dir.mul(400 * dt));
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
    ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 4 + Math.min(this.value / 5, 6), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export type PowerupType = 'nuke' | 'magnet' | 'burst' | 'shield' | 'levelup';

export class Powerup {
  pos: Vec2;
  type: PowerupType;
  life: number = 15;
  rotation: number = 0;
  
  constructor(pos: Vec2, type: PowerupType) {
    this.pos = pos;
    this.type = type;
  }
  
  update(dt: number) {
    this.life -= dt;
    this.rotation += dt;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rotation);
    
    let color = '#fff';
    let symbol = '';
    
    switch(this.type) {
      case 'nuke': color = '#ff4400'; symbol = 'N'; break;
      case 'magnet': color = '#aa00ff'; symbol = 'M'; break;
      case 'burst': color = '#00aaff'; symbol = 'B'; break;
      case 'shield': color = '#ffff00'; symbol = 'S'; break;
      case 'levelup': color = '#00ffaa'; symbol = 'L'; break;
    }
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.rotate(-this.rotation);
    ctx.fillText(symbol, 0, 1);
    
    ctx.restore();
  }
}

export class Mountain {
  pos: Vec2;
  radius: number;
  color: string;
  rotation: number;
  sides: number;
  constructor(pos: Vec2, radius: number, color: string) {
    this.pos = pos;
    this.radius = radius;
    this.color = color;
    this.rotation = Math.random() * Math.PI * 2;
    this.sides = 3;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#050505';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i * Math.PI * 2) / this.sides;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
