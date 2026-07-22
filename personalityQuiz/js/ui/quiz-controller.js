/**
 * QUIZ CONTROLLER
 * Owns quiz state (current index + chosen answers) and renders questions
 * into a container. Talks to the DOM only inside this class.
 */
class QuizController {
  /**
   * @param {object[]} questions
   * @param {HTMLElement} elements - { questionContainer, progressBar, progressLabel, prevBtn, nextBtn }
   * @param {function} onComplete - called with answerIndices[] when the last question is answered & confirmed
   */
  constructor(questions, elements, onComplete){
    this.questions = questions;
    this.el = elements;
    this.onComplete = onComplete;
    this.currentIndex = 0;
    this.answers = new Array(questions.length).fill(null);

    this.el.prevBtn.addEventListener("click", () => this.goPrev());
    this.el.nextBtn.addEventListener("click", () => this.goNext());
    document.addEventListener("keydown", (e) => this._handleKeyboard(e));
  }

  start(){
    this.currentIndex = 0;
    this.answers = new Array(this.questions.length).fill(null);
    this.render();
  }

  render(){
    const q = this.questions[this.currentIndex];
    const total = this.questions.length;
    const selected = this.answers[this.currentIndex];

    this.el.progressLabel.textContent = `Question ${this.currentIndex + 1} of ${total}`;
    this.el.progressBar.style.width = `${((this.currentIndex + 1) / total) * 100}%`;

    this.el.questionContainer.innerHTML = `
      <p class="text-xs uppercase tracking-widest text-purple-300/70 mb-2 font-semibold">${q.category}</p>
      <h2 class="text-xl sm:text-2xl font-bold text-white mb-6 leading-snug">${q.question}</h2>
      <div class="grid gap-3" role="radiogroup" aria-label="${q.question}">
        ${q.options.map((opt, i) => `
          <button
            type="button"
            class="option-btn ripple text-left w-full px-5 py-4 rounded-2xl border transition-all duration-200
              ${selected === i
                ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 border-purple-400 text-white"
                : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20"}"
            data-index="${i}"
            role="radio"
            aria-checked="${selected === i}"
          >${opt.text}</button>
        `).join("")}
      </div>
    `;

    this.el.questionContainer.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", (e) => this._selectAnswer(parseInt(btn.dataset.index, 10), e));
    });

    this.el.prevBtn.disabled = this.currentIndex === 0;
    this.el.prevBtn.classList.toggle("opacity-30", this.currentIndex === 0);
    this.el.prevBtn.classList.toggle("pointer-events-none", this.currentIndex === 0);

    const isLast = this.currentIndex === total - 1;
    this.el.nextBtn.textContent = isLast ? "See My Results" : "Next";
    this.el.nextBtn.disabled = selected === null;
    this.el.nextBtn.classList.toggle("opacity-40", selected === null);
    this.el.nextBtn.classList.toggle("pointer-events-none", selected === null);
  }

  _selectAnswer(index, event){
    this.answers[this.currentIndex] = index;
    createRipple(event);
    this.render();
  }

  goNext(){
    if(this.answers[this.currentIndex] === null) return;
    if(this.currentIndex === this.questions.length - 1){
      this.onComplete(this.answers);
      return;
    }
    this.currentIndex++;
    this._transition();
  }

  goPrev(){
    if(this.currentIndex === 0) return;
    this.currentIndex--;
    this._transition();
  }

  _transition(){
    this.el.questionContainer.classList.add("opacity-0", "translate-x-4");
    setTimeout(() => {
      this.render();
      this.el.questionContainer.classList.remove("opacity-0", "translate-x-4");
    }, 160);
  }

  _handleKeyboard(e){
    const quizVisible = !document.getElementById("page-quiz").classList.contains("hidden");
    if(!quizVisible) return;
    if(e.key >= "1" && e.key <= "4"){
      const idx = parseInt(e.key, 10) - 1;
      const btn = this.el.questionContainer.querySelectorAll(".option-btn")[idx];
      if(btn) btn.click();
    } else if(e.key === "Enter"){
      this.goNext();
    } else if(e.key === "ArrowLeft"){
      this.goPrev();
    }
  }
}

/** Simple ripple effect for buttons — reused across the app. */
function createRipple(event){
  const button = event.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const rect = button.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - diameter / 2}px`;
  circle.style.top = `${event.clientY - rect.top - diameter / 2}px`;
  circle.classList.add("ripple-circle");

  const existing = button.querySelector(".ripple-circle");
  if(existing) existing.remove();
  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}
