export class Vec2 {
  constructor(public x: number, public y: number) {}
  add(v: Vec2) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s: number) { return new Vec2(this.x * s, this.y * s); }
  mag() { return Math.hypot(this.x, this.y); }
  norm() { const m = this.mag(); return m === 0 ? new Vec2(0,0) : new Vec2(this.x/m, this.y/m); }
  dist(v: Vec2) { return this.sub(v).mag(); }
  copy() { return new Vec2(this.x, this.y); }
}
