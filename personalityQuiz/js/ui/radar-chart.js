/**
 * RADAR CHART
 * Minimal canvas radar/spider chart built from scratch (no Chart.js
 * dependency) — draws the 5 OCEAN axes and the user's shape on top.
 */
class RadarChart {
  constructor(canvas, options = {}){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = options.size || 280;
    this.levels = options.levels || 5;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.center = this.size / 2;
    this.radius = this.center - 46;
  }

  /**
   * @param {string[]} labels - axis labels, e.g. ['Openness', 'Conscientiousness', ...]
   * @param {number[]} values - 0-100 values, same order as labels
   */
  draw(labels, values){
    const { ctx, center, radius } = this;
    const count = labels.length;
    const angleStep = (Math.PI * 2) / count;
    ctx.clearRect(0, 0, this.size, this.size);

    // Grid rings
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for(let level = 1; level <= this.levels; level++){
      const r = (radius / this.levels) * level;
      ctx.beginPath();
      for(let i = 0; i <= count; i++){
        const angle = i * angleStep - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Axis lines + labels
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    labels.forEach((label, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(x, y);
      ctx.stroke();

      const labelX = center + (radius + 22) * Math.cos(angle);
      const labelY = center + (radius + 22) * Math.sin(angle);
      ctx.textAlign = Math.abs(Math.cos(angle)) < 0.2 ? "center" : (Math.cos(angle) > 0 ? "left" : "right");
      ctx.fillText(label, labelX, labelY + 4);
    });

    // Data shape
    ctx.beginPath();
    values.forEach((value, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (radius * value) / 100;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, this.size, this.size);
    gradient.addColorStop(0, "rgba(168,85,247,0.45)");
    gradient.addColorStop(1, "rgba(59,130,246,0.45)");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    values.forEach((value, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (radius * value) / 100;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#f472b6";
      ctx.fill();
    });
  }
}
