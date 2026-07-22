/**
 * CIRCULAR PROGRESS
 * Draws an animated ring inside a given container element.
 * Usage: new CircularProgress(containerEl, { size: 120, stroke: 10 }).animateTo(72, '#a855f7');
 */
class CircularProgress {
  constructor(container, options = {}){
    this.container = container;
    this.size = options.size || 120;
    this.stroke = options.stroke || 10;
    this.radius = (this.size - this.stroke) / 2;
    this.circumference = 2 * Math.PI * this.radius;
    this._render();
  }

  _render(){
    const half = this.size / 2;
    this.container.innerHTML = `
      <svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}" class="-rotate-90">
        <circle cx="${half}" cy="${half}" r="${this.radius}"
          fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="${this.stroke}"></circle>
        <circle cx="${half}" cy="${half}" r="${this.radius}"
          fill="none" stroke-width="${this.stroke}" stroke-linecap="round"
          stroke-dasharray="${this.circumference}" stroke-dashoffset="${this.circumference}"
          class="progress-ring-fill transition-[stroke-dashoffset] duration-[1400ms] ease-out"></circle>
      </svg>
      <div class="progress-ring-label absolute inset-0 flex items-center justify-center font-bold"></div>
    `;
    this.container.style.position = "relative";
    this.container.style.width = this.size + "px";
    this.container.style.height = this.size + "px";
    this.fillCircle = this.container.querySelector(".progress-ring-fill");
    this.labelEl = this.container.querySelector(".progress-ring-label");
  }

  /** Animate the ring to a percentage (0-100), with an optional gradient stroke color. */
  animateTo(percent, colorId){
    const offset = this.circumference * (1 - percent / 100);
    this.fillCircle.setAttribute("stroke", colorId ? `url(#${colorId})` : "#a855f7");
    // Force reflow so the transition actually plays from the starting offset.
    requestAnimationFrame(() => {
      this.fillCircle.style.strokeDashoffset = offset;
    });
    this._animateNumber(percent);
  }

  _animateNumber(target){
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.labelEl.textContent = Math.round(eased * target) + "%";
      if(progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
