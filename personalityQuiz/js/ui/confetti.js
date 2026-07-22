/**
 * CONFETTI ENGINE
 * Tiny canvas confetti burst — purely for the "result reveal" moment.
 * No external library, just a short-lived particle simulation.
 */
class ConfettiEngine {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.colors = ["#a855f7", "#3b82f6", "#f472b6", "#facc15", "#34d399"];
    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize(){
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 140){
    this.particles = Array.from({ length: count }, () => ({
      x: this.canvas.width / 2,
      y: this.canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 7 + 4,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.35 + Math.random() * 0.15,
      life: 0,
      maxLife: 110 + Math.random() * 40
    }));
    this._animate();
  }

  _animate(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let alive = false;

    this.particles.forEach(p => {
      if(p.life >= p.maxLife) return;
      alive = true;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life++;

      const opacity = 1 - p.life / p.maxLife;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(opacity, 0);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    });

    if(alive){
      requestAnimationFrame(() => this._animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
