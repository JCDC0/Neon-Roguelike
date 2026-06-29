import { Vec2 } from './math';
import { Particle, Enemy, Bullet, XpOrb, EnemyType, Mountain, Powerup, PowerupType } from './entities';

export interface GameStateCallback {
  (state: { hp: number; maxHp: number; score: number; gameOver: boolean; xp: number; maxXp: number; level: number; showLevelUp: boolean; upgrades: any[]; isPaused: boolean; gameTime: number; fps: number }): void;
}

const MAP_RADIUS = 3000;

export class GameEngine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; onStateChange: GameStateCallback;
  lastTime: number = 0; reqId: number = 0; keys: { [key: string]: boolean } = {};
  mousePos: Vec2 = new Vec2(0, 0); isMouseDown: boolean = false;
  
  joystickMove: Vec2 = new Vec2(0, 0);
  isTouchShooting: boolean = false;
  touchShootDir: Vec2 = new Vec2(0, 0);

  playerPos: Vec2 = new Vec2(0, 0); playerHp: number = 100; maxHp: number = 100;
  score: number = 0; gameOver: boolean = false; isPaused: boolean = false;
  enemies: Enemy[] = []; particles: Particle[] = []; bullets: Bullet[] = []; xpOrbs: XpOrb[] = [];
  mountains: Mountain[] = [];
  powerups: Powerup[] = [];
  notifications: { text: string; life: number; maxLife: number; pos: Vec2 }[] = [];
  
  attackCooldown: number = 0;
  cameraPos: Vec2 = new Vec2(0, 0); spawnTimer: number = 0; screenShake: number = 0;
  healTimer: number = 0;
  burstTimer: number = 0;
  shieldTimer: number = 0;

  xp: number = 0; maxXp: number = 10; level: number = 1;
  isLevelingUp: boolean = false;
  
  gameTime: number = 0;
  fps: number = 0;
  frameCount: number = 0;
  lastFpsTime: number = 0;
  lastNotifyTime: number = 0;

  stats = {
    bulletCount: 1,
    bulletDamage: 15,
    bulletPierce: 0,
    bulletSplit: 0,
    fireRate: 0.3
  };

  constructor(canvas: HTMLCanvasElement, onStateChange: GameStateCallback) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d')!; this.onStateChange = onStateChange;
    this.resize = this.resize.bind(this); this.keydown = this.keydown.bind(this);
    this.keyup = this.keyup.bind(this); this.mousemove = this.mousemove.bind(this);
    this.mousedown = this.mousedown.bind(this); this.mouseup = this.mouseup.bind(this);
    this.touchstart = this.touchstart.bind(this); this.touchmove = this.touchmove.bind(this);
    this.touchend = this.touchend.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    window.addEventListener('resize', this.resize); window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup); this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mousedown', this.mousedown); this.canvas.addEventListener('mouseup', this.mouseup);
    this.canvas.addEventListener('touchstart', this.touchstart); this.canvas.addEventListener('touchmove', this.touchmove);
    this.canvas.addEventListener('touchend', this.touchend); this.canvas.addEventListener('touchcancel', this.touchend);
    this.resize(); this.restart(); this.lastTime = performance.now(); this.lastFpsTime = this.lastTime; this.reqId = requestAnimationFrame(this.loop);
  }

  stop() {
    window.removeEventListener('resize', this.resize); window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup); this.canvas.removeEventListener('mousemove', this.mousemove);
    this.canvas.removeEventListener('mousedown', this.mousedown); this.canvas.removeEventListener('mouseup', this.mouseup);
    this.canvas.removeEventListener('touchstart', this.touchstart); this.canvas.removeEventListener('touchmove', this.touchmove);
    this.canvas.removeEventListener('touchend', this.touchend); this.canvas.removeEventListener('touchcancel', this.touchend);
    cancelAnimationFrame(this.reqId);
  }

  restart() {
    this.playerPos = new Vec2(0, 0);
    this.playerHp = 100; this.score = 0; this.gameOver = false; this.isPaused = false;
    this.enemies = []; this.particles = []; this.bullets = []; this.xpOrbs = []; this.powerups = [];
    this.attackCooldown = 0; this.spawnTimer = 0; this.screenShake = 0; this.healTimer = 0;
    this.burstTimer = 0; this.shieldTimer = 0;
    this.xp = 0; this.maxXp = 10; this.level = 1; this.isLevelingUp = false;
    this.gameTime = 0; this.fps = 0; this.frameCount = 0; this.lastFpsTime = performance.now(); this.lastNotifyTime = 0;
    this.stats = { bulletCount: 1, bulletDamage: 15, bulletPierce: 0, bulletSplit: 0, fireRate: 0.3 };
    
    this.mountains = [];
    const numMountains = 120;
    for (let i = 0; i < numMountains; i++) {
      const angle = (i / numMountains) * Math.PI * 2;
      const r = MAP_RADIUS + (Math.random() - 0.5) * 100;
      const pos = new Vec2(Math.cos(angle) * r, Math.sin(angle) * r);
      const colors = ['#ff0055', '#0055ff', '#00ffaa', '#ffaa00', '#aa00ff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.mountains.push(new Mountain(pos, 150 + Math.random() * 80, color));
    }

    this.notifyState();
  }

  togglePause() {
    if (this.gameOver || this.isLevelingUp) return;
    this.isPaused = !this.isPaused;
    this.notifyState();
  }

  setJoystickMove(v: Vec2) {
    this.joystickMove = v;
  }

  resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
  keydown(e: KeyboardEvent) { 
    if (e.key === 'Escape') {
      this.togglePause();
    }
    this.keys[e.key.toLowerCase()] = true; 
  }
  keyup(e: KeyboardEvent) { this.keys[e.key.toLowerCase()] = false; }
  mousemove(e: MouseEvent) { const r = this.canvas.getBoundingClientRect(); this.mousePos = new Vec2(e.clientX - r.left, e.clientY - r.top); }
  mousedown() { this.isMouseDown = true; }
  mouseup() { this.isMouseDown = false; }
  
  touchstart(e: TouchEvent) {
    if (e.targetTouches.length > 0) {
      const r = this.canvas.getBoundingClientRect();
      const touch = e.targetTouches[0];
      const pos = new Vec2(touch.clientX - r.left, touch.clientY - r.top);
      
      // If touch is on the right half of the screen, it's a shooting touch
      if (touch.clientX > window.innerWidth / 2) {
        this.isTouchShooting = true;
        this.touchShootDir = pos.sub(new Vec2(this.canvas.width / 2, this.canvas.height / 2)).norm();
      } else {
        this.isMouseDown = true;
        this.mousePos = pos;
      }
    }
  }
  touchmove(e: TouchEvent) {
    if (e.targetTouches.length > 0) {
      const r = this.canvas.getBoundingClientRect();
      for (let i = 0; i < e.targetTouches.length; i++) {
        const touch = e.targetTouches[i];
        const pos = new Vec2(touch.clientX - r.left, touch.clientY - r.top);
        if (touch.clientX > window.innerWidth / 2) {
          this.touchShootDir = pos.sub(new Vec2(this.canvas.width / 2, this.canvas.height / 2)).norm();
        } else {
          this.mousePos = pos;
        }
      }
    }
  }
  touchend(e: TouchEvent) {
    if (e.targetTouches.length === 0) {
      this.isMouseDown = false;
      this.isTouchShooting = false;
    } else {
      let hasRightTouch = false;
      let hasLeftTouch = false;
      for (let i = 0; i < e.targetTouches.length; i++) {
        if (e.targetTouches[i].clientX > window.innerWidth / 2) hasRightTouch = true;
        else hasLeftTouch = true;
      }
      this.isTouchShooting = hasRightTouch;
      this.isMouseDown = hasLeftTouch;
    }
  }
  
  notifyState() { 
    this.onStateChange({ 
      hp: this.playerHp, maxHp: this.maxHp, score: this.score, gameOver: this.gameOver,
      xp: this.xp, maxXp: this.maxXp, level: this.level, showLevelUp: this.isLevelingUp, upgrades: [],
      isPaused: this.isPaused, gameTime: this.gameTime, fps: this.fps
    }); 
  }

  spawnParticles(pos: Vec2, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 200 + 50;
      this.particles.push(new Particle(pos, new Vec2(Math.cos(a) * s, Math.sin(a) * s), Math.random() * 0.3 + 0.2, color, Math.random() * 4 + 2));
    }
  }

  triggerLevelUp() {
    this.isLevelingUp = true;
    this.notifyState();
  }

  addNotification(text: string, pos: Vec2) {
    this.notifications.push({ text, life: 1.5, maxLife: 1.5, pos: pos.copy() });
  }

  applyPowerup(type: PowerupType) {
    this.spawnParticles(this.playerPos, '#ffffff', 30);
    if (type === 'nuke') {
      const count = 75;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dir = new Vec2(Math.cos(angle), Math.sin(angle));
        this.shoot(this.playerPos, dir, 1, this.stats.bulletDamage * 2, 100, 10);
      }
      this.screenShake = 0.8;
      this.addNotification("NUCLEAR MELTDOWN!", this.playerPos);
    } else if (type === 'magnet') {
      for (const orb of this.xpOrbs) {
        orb.isCollecting = true;
      }
      this.addNotification("MAGNETIZED!", this.playerPos);
    } else if (type === 'burst') {
      this.burstTimer = 10;
      this.addNotification("RAPID FIRE!", this.playerPos);
    } else if (type === 'shield') {
      this.shieldTimer = 10;
      this.addNotification("SHIELD ACTIVE!", this.playerPos);
    } else if (type === 'levelup') {
      const upgrades = ['count', 'damage', 'pierce', 'split'];
      const randomUpgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
      this.applyUpgrade(randomUpgrade);
      this.addNotification("FREE UPGRADE!", this.playerPos);
    }
  }

  applyUpgrade(type: string) {
    let upgradeName = "";
    if (type === 'count') {
      this.stats.bulletCount++;
      upgradeName = "Bullet Count +1";
    } else if (type === 'damage') {
      this.stats.bulletDamage += 10;
      upgradeName = "Damage +10";
    } else if (type === 'pierce') {
      this.stats.bulletPierce++;
      upgradeName = "Pierce +1";
    } else if (type === 'split') {
      this.stats.bulletSplit++;
      upgradeName = "Split +1";
    } else if (type === 'fireRate') {
      this.stats.fireRate = Math.max(0.05, this.stats.fireRate * 0.85);
      upgradeName = "Fire Rate Up";
    }
    this.addNotification(upgradeName, this.playerPos);
    this.isLevelingUp = false;
    this.notifyState();
  }

  shoot(pos: Vec2, dir: Vec2, count: number, damage: number, pierce: number, split: number) {
    const spread = 0.15;
    const baseAngle = Math.atan2(dir.y, dir.x);
    for (let i = 0; i < count; i++) {
      const angleOffset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const finalAngle = baseAngle + angleOffset;
      const vel = new Vec2(Math.cos(finalAngle), Math.sin(finalAngle)).mul(500);
      this.bullets.push(new Bullet(pos, vel, damage, pierce, split));
    }
  }

  update(dt: number) {
    if (this.gameOver || this.isLevelingUp || this.isPaused) return;
    if (this.screenShake > 0) this.screenShake -= dt;

    this.gameTime += dt;
    const difficulty = (this.gameTime / 20) * (1 + this.gameTime / 120);

    this.healTimer += dt;
    if (this.burstTimer > 0) this.burstTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.healTimer >= 1.0) {
      this.healTimer -= 1.0;
      if (this.playerHp < this.maxHp) {
        this.playerHp = Math.min(this.maxHp, this.playerHp + 1);
        this.notifyState();
      }
    }

    for (const e of this.enemies) {
      if (e.type === 'healer') {
        e.healTimer += dt;
        if (e.healTimer >= 1.0) {
          e.healTimer -= 1.0;
          for (const other of this.enemies) {
            if (other !== e && other.pos.dist(e.pos) < 150) {
              other.hp = Math.min(other.maxHp, other.hp + 1);
            }
          }
        }
      } else if (e.type === 'merger') {
        e.mergeTimer -= dt;
        if (e.mergeTimer <= 0) {
          e.mergeTimer = 5;
          let nearest: Enemy | null = null;
          let minDist = 300;
          for (const other of this.enemies) {
            if (other !== e && other.type !== 'merger' && other.type !== 'juggernaut') {
              const dist = e.pos.dist(other.pos);
              if (dist < minDist) {
                minDist = dist;
                nearest = other;
              }
            }
          }
          if (nearest) {
            e.maxHp += nearest.maxHp;
            e.hp += nearest.hp;
            e.speed = Math.max(1, e.speed * 0.8);
            e.radius = Math.min(60, e.radius + 5);
            e.xpValue += nearest.xpValue;
            nearest.hp = 0;
            this.spawnParticles(e.pos, '#5500ff', 15);
          }
        }
      }
    }

    let md = new Vec2(0, 0);
    if (this.keys['w'] || this.keys['arrowup']) md.y -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) md.y += 1;
    if (this.keys['a'] || this.keys['arrowleft']) md.x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) md.x += 1;
    
    if (this.joystickMove.mag() > 0) {
      md = md.add(this.joystickMove);
    }

    if (md.mag() > 0) {
      if (md.mag() > 1) md = md.norm();
      const newPos = this.playerPos.add(md.mul(300 * dt));
      
      if (newPos.mag() < MAP_RADIUS) {
        this.playerPos = newPos;
      } else {
        const angle = Math.atan2(newPos.y, newPos.x);
        this.playerPos = new Vec2(Math.cos(angle) * MAP_RADIUS, Math.sin(angle) * MAP_RADIUS);
      }
    }

    for (const m of this.mountains) {
      const dist = this.playerPos.dist(m.pos);
      if (dist < m.radius + 20) {
        const dir = this.playerPos.sub(m.pos).norm();
        this.playerPos = m.pos.add(dir.mul(m.radius + 20));
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if ((this.isMouseDown || this.isTouchShooting) && this.attackCooldown <= 0) {
      this.attackCooldown = this.burstTimer > 0 ? this.stats.fireRate * 0.2 : this.stats.fireRate;
      let dir = new Vec2(1, 0);
      if (this.isTouchShooting) {
        dir = this.touchShootDir;
      } else {
        dir = this.mousePos.sub(new Vec2(this.canvas.width / 2, this.canvas.height / 2)).norm();
      }
      this.shoot(this.playerPos, dir, this.stats.bulletCount, this.stats.bulletDamage, this.stats.bulletPierce, this.stats.bulletSplit);
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      
      let hit = false;
      for (const m of this.mountains) {
        if (b.pos.dist(m.pos) < m.radius + 5) {
          hit = true;
          this.spawnParticles(b.pos, '#ffff00', 3);
          break;
        }
      }

      if (!hit) {
        for (const e of this.enemies) {
          if (!b.hitEnemies.has(e) && b.pos.dist(e.pos) < e.radius + 5) {
            b.hitEnemies.add(e);
            e.hp -= b.damage;
            e.hitTimer = 0.1;
            this.spawnParticles(e.pos, '#ffffff', 5);
            
            if (b.split > 0) {
              const otherEnemies = this.enemies.filter(en => en !== e);
              if (otherEnemies.length > 0) {
                const target = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
                const dir = target.pos.sub(e.pos).norm();
                this.shoot(e.pos, dir, 1, b.damage * 0.5, 0, b.split - 1);
              }
            }
            
            if (e.hp <= 0) {
              this.score += 10;
              this.spawnParticles(e.pos, e.color, 20);
              this.xpOrbs.push(new XpOrb(e.pos, e.xpValue));
              
              if (e.type === 'splitter') {
                for (let j = 0; j < 3; j++) {
                  const splitEnemy = new Enemy(e.pos.add(new Vec2((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20)), 3, this.level, 'normal');
                  splitEnemy.maxHp = e.maxHp * 0.4;
                  splitEnemy.hp = splitEnemy.maxHp;
                  splitEnemy.speed = e.speed * 1.5;
                  splitEnemy.radius = e.radius * 0.6;
                  this.enemies.push(splitEnemy);
                }
              }

              if (Math.random() < 0.05) {
                const pRand = Math.random();
                let pType: PowerupType = 'nuke';
                if (pRand < 0.1) pType = 'levelup';
                else if (pRand < 0.3) pType = 'nuke';
                else if (pRand < 0.5) pType = 'shield';
                else if (pRand < 0.7) pType = 'burst';
                else pType = 'magnet';
                this.powerups.push(new Powerup(e.pos, pType));
              }
              
              this.enemies.splice(this.enemies.indexOf(e), 1);
              this.notifyState();
            }
            
            if (b.hitEnemies.size > b.pierce) {
              hit = true;
              break;
            }
          }
        }
      }
      
      if (hit || b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.update(dt, this.playerPos);
      if (orb.pos.dist(this.playerPos) < 20) {
        this.xp += orb.value;
        this.xpOrbs.splice(i, 1);
        if (this.xp >= this.maxXp) {
          this.xp -= this.maxXp;
          this.level++;
          this.maxXp = 10 + this.level * 20 + Math.floor(Math.pow(this.level, 1.5) * 5);
          this.triggerLevelUp();
        } else {
          this.notifyState();
        }
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.update(dt);
      if (p.life <= 0) {
        this.powerups.splice(i, 1);
        continue;
      }
      if (p.pos.dist(this.playerPos) < 25) {
        this.applyPowerup(p.type);
        this.powerups.splice(i, 1);
      }
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.1, 1.5 - difficulty * 0.1);
      const spawnCount = Math.floor(1 + Math.pow(1.2, difficulty));
      for (let i = 0; i < spawnCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 800 + Math.random() * 400;
        let spawnPos = this.playerPos.add(new Vec2(Math.cos(a) * d, Math.sin(a) * d));
        
        if (spawnPos.mag() > MAP_RADIUS - 100) {
           spawnPos = spawnPos.norm().mul(MAP_RADIUS - 100);
        }

        const maxSides = Math.min(6, 2 + Math.ceil(difficulty / 2));
        const sides = Math.floor(Math.random() * (maxSides - 3 + 1)) + 3;
        
        let type: EnemyType = 'normal';
        const rand = Math.random();
        if (difficulty >= 2 && rand < 0.05) type = 'healer';
        else if (difficulty >= 3 && rand < 0.1) type = 'dasher';
        else if (difficulty >= 4 && rand < 0.15) type = 'splitter';
        else if (difficulty >= 5 && rand < 0.2) type = 'merger';
        else if (difficulty >= 6 && rand < 0.25) type = 'rainbow';
        else if (difficulty >= 7 && rand < 0.3) type = 'tank';
        else if (difficulty >= 8 && rand < 0.35) type = 'swarmer';
        else if (difficulty >= 9 && rand < 0.4) type = 'ghost';
        else if (difficulty >= 12 && rand < 0.42) type = 'juggernaut';
        
        this.enemies.push(new Enemy(spawnPos, sides, difficulty, type));
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; e.update(dt, this.playerPos);
      
      for (const m of this.mountains) {
        const dist = e.pos.dist(m.pos);
        if (dist < m.radius + e.radius) {
          const dir = e.pos.sub(m.pos).norm();
          e.pos = m.pos.add(dir.mul(m.radius + e.radius));
        }
      }

      if (e.pos.dist(this.playerPos) < e.radius + 20) {
        if (this.shieldTimer <= 0) {
          this.playerHp -= 10; 
          this.screenShake = 0.2; 
          this.spawnParticles(this.playerPos, '#00ffff', 10);
        } else {
          this.spawnParticles(e.pos, '#ffff00', 5);
          e.hp -= 50;
        }
        const kd = this.playerPos.sub(e.pos).norm();
        this.playerPos = this.playerPos.add(kd.mul(40)); e.pos = e.pos.sub(kd.mul(40));
        this.notifyState();
        if (this.playerHp <= 0) { this.gameOver = true; this.notifyState(); }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i];
      n.life -= dt;
      n.pos.y -= 50 * dt;
      if (n.life <= 0) this.notifications.splice(i, 1);
    }
  }

  draw() {
    this.ctx.fillStyle = '#050505'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    let sx = 0, sy = 0;
    if (this.screenShake > 0) { sx = (Math.random() - 0.5) * 20 * (this.screenShake / 0.2); sy = (Math.random() - 0.5) * 20 * (this.screenShake / 0.2); }
    
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(0.75, 0.75);
    this.ctx.translate(-this.playerPos.x + sx, -this.playerPos.y + sy);
    
    this.ctx.strokeStyle = '#111'; this.ctx.lineWidth = 2; const gs = 100;
    const viewWidth = this.canvas.width / 0.75;
    const viewHeight = this.canvas.height / 0.75;
    const stX = Math.floor((this.playerPos.x - viewWidth / 2) / gs) * gs - gs;
    const stY = Math.floor((this.playerPos.y - viewHeight / 2) / gs) * gs - gs;
    this.ctx.beginPath();
    for (let x = stX; x < stX + viewWidth + gs * 2; x += gs) { this.ctx.moveTo(x, stY); this.ctx.lineTo(x, stY + viewHeight + gs * 2); }
    for (let y = stY; y < stY + viewHeight + gs * 2; y += gs) { this.ctx.moveTo(stX, y); this.ctx.lineTo(stX + viewWidth + gs * 2, y); }
    this.ctx.stroke();

    for (const m of this.mountains) m.draw(this.ctx);
    for (const p of this.powerups) p.draw(this.ctx);
    for (const orb of this.xpOrbs) orb.draw(this.ctx);
    for (const e of this.enemies) e.draw(this.ctx);
    for (const b of this.bullets) b.draw(this.ctx);

    this.ctx.save(); this.ctx.translate(this.playerPos.x, this.playerPos.y);
    
    if (this.shieldTimer > 0) {
      this.ctx.strokeStyle = '#ffff00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.shieldTimer / 10));
      this.ctx.stroke();
    }
    
    if (this.burstTimer > 0) {
      this.ctx.strokeStyle = '#00aaff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 35, -Math.PI / 2, -Math.PI / 2 - Math.PI * 2 * (this.burstTimer / 10), true);
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#00ffff'; this.ctx.fillStyle = '#00ffff';
    this.ctx.beginPath(); this.ctx.arc(0, 0, 20, 0, Math.PI * 2); this.ctx.fill();
    
    const ld = this.mousePos.sub(new Vec2(this.canvas.width / 2, this.canvas.height / 2)).norm();
    this.ctx.fillStyle = '#ffffff'; this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#ffffff';
    this.ctx.beginPath(); this.ctx.arc(ld.x * 12, ld.y * 12, 6, 0, Math.PI * 2); this.ctx.fill();
    
    this.ctx.restore();

    for (const p of this.particles) p.draw(this.ctx);

    for (const n of this.notifications) {
      this.ctx.save();
      this.ctx.translate(n.pos.x, n.pos.y);
      this.ctx.globalAlpha = Math.max(0, n.life / n.maxLife);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 24px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#00ffff';
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(n.text, 0, 0);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  loop(time: number) {
    this.reqId = requestAnimationFrame(this.loop);
    const dt = (time - this.lastTime) / 1000; this.lastTime = time;
    
    this.frameCount++;
    if (time - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = time;
      this.notifyState();
    } else if (time - this.lastNotifyTime >= 100) {
      this.notifyState();
      this.lastNotifyTime = time;
    }

    if (dt > 0.1) return;
    this.update(dt); this.draw();
  }
}
