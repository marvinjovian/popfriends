/**
 * APP.JS
 * The orchestrator. Wires together: page navigation, the quiz controller,
 * the loading screen message rotation, and the results rendering
 * (charts, badges, actions). Nothing here computes personality scores —
 * that all lives in scoring-engine.js / badge-engine.js.
 */
(function(){
  "use strict";

  const pages = {
    landing: document.getElementById("page-landing"),
    quiz: document.getElementById("page-quiz"),
    loading: document.getElementById("page-loading"),
    results: document.getElementById("page-results")
  };

  function showPage(name){
    Object.values(pages).forEach(p => p.classList.add("hidden"));
    pages[name].classList.remove("hidden");
    pages[name].classList.add("animate-page-in");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Quiz wiring ----------
  const quizController = new QuizController(
    QUIZ_QUESTIONS,
    {
      questionContainer: document.getElementById("question-container"),
      progressBar: document.getElementById("quiz-progress-bar"),
      progressLabel: document.getElementById("quiz-progress-label"),
      prevBtn: document.getElementById("quiz-prev-btn"),
      nextBtn: document.getElementById("quiz-next-btn")
    },
    handleQuizComplete
  );

  document.getElementById("start-quiz-btn").addEventListener("click", (e) => {
    createRipple(e);
    showPage("quiz");
    quizController.start();
  });

  // ---------- Loading screen ----------
  const LOADING_MESSAGES = [
    "Reading your answers...",
    "Detecting hidden patterns...",
    "Comparing millions of personalities...",
    "Running AI prediction...",
    "Almost done..."
  ];
  let loadingInterval = null;

  function runLoadingScreen(answers){
    showPage("loading");
    const label = document.getElementById("loading-message");
    const bar = document.getElementById("loading-progress-bar");
    let step = 0;
    label.textContent = LOADING_MESSAGES[0];
    bar.style.width = "0%";

    clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
      step++;
      if(step < LOADING_MESSAGES.length){
        label.classList.add("opacity-0");
        setTimeout(() => {
          label.textContent = LOADING_MESSAGES[step];
          label.classList.remove("opacity-0");
        }, 200);
      }
      bar.style.width = `${Math.min(((step + 1) / LOADING_MESSAGES.length) * 100, 100)}%`;

      if(step >= LOADING_MESSAGES.length - 1){
        clearInterval(loadingInterval);
        setTimeout(() => renderResults(answers), 900);
      }
    }, 2000);
  }

  function handleQuizComplete(answers){
    runLoadingScreen(answers);
  }

  // ---------- Results rendering ----------
  const reportBuilder = new ReportBuilder(QUIZ_QUESTIONS, PERSONALITY_ARCHETYPES);
  let currentReport = null;

  function renderResults(answers){
    currentReport = reportBuilder.build(answers);
    const badges = BadgeEngine.award(currentReport);
    const r = currentReport;

    showPage("results");

    // Header
    document.getElementById("result-emoji").textContent = r.archetype.emoji;
    document.getElementById("result-type").textContent = r.archetype.name;
    document.getElementById("result-description").textContent = r.archetype.description;
    document.getElementById("result-confidence").textContent = `${r.confidence}% Match Confidence`;

    // Circular progress rings
    new CircularProgress(document.getElementById("ring-creativity")).animateTo(r.creativityScore, "gradA");
    new CircularProgress(document.getElementById("ring-leadership")).animateTo(r.leadershipScore, "gradB");
    new CircularProgress(document.getElementById("ring-eq")).animateTo(r.eqScore, "gradA");

    // Introvert/Extrovert bar
    document.getElementById("extrovert-pct").textContent = `${r.extrovertPct}%`;
    document.getElementById("introvert-pct").textContent = `${r.introvertPct}%`;
    requestAnimationFrame(() => {
      document.getElementById("extrovert-bar").style.width = `${r.extrovertPct}%`;
    });

    // Skill bars (animated width)
    animateSkillBar("bar-openness", r.traits.O);
    animateSkillBar("bar-conscientiousness", r.traits.C);
    animateSkillBar("bar-agreeableness", r.traits.A);
    animateSkillBar("bar-stability", 100 - r.traits.N);

    // Radar chart
    const radar = new RadarChart(document.getElementById("radar-canvas"));
    setTimeout(() => {
      radar.draw(
        ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Stability"],
        [r.traits.O, r.traits.C, r.traits.E, r.traits.A, 100 - r.traits.N]
      );
    }, 100);

    // Narrative fields
    document.getElementById("communication-style").textContent = r.communicationStyle;
    document.getElementById("decision-style").textContent = r.decisionStyle;
    document.getElementById("biggest-strength").textContent = r.archetype.strength;
    document.getElementById("biggest-weakness").textContent = r.archetype.weakness;
    document.getElementById("hidden-talent").textContent = r.archetype.hiddenTalent;
    document.getElementById("biggest-fear").textContent = r.archetype.fear;
    document.getElementById("ideal-career").textContent = r.archetype.idealCareer;
    document.getElementById("work-environment").textContent = r.archetype.workEnvironment;
    document.getElementById("love-language").textContent = r.archetype.loveLanguage;
    document.getElementById("learning-style").textContent = r.archetype.learningStyle;
    document.getElementById("productivity-tip").textContent = r.archetype.productivityTip;
    document.getElementById("famous-people").textContent = r.archetype.famousPeople.join(" · ");
    document.getElementById("motivational-quote").textContent = `"${r.quote}"`;

    // Badges
    const badgeContainer = document.getElementById("badge-container");
    badgeContainer.innerHTML = badges.map(b => `
      <div class="badge-chip flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/15">
        <span class="text-lg">${b.icon}</span>
        <span class="text-sm font-semibold text-slate-100">${b.name}</span>
      </div>
    `).join("");

    // Confetti moment
    const confettiCanvas = document.getElementById("confetti-canvas");
    new ConfettiEngine(confettiCanvas).burst();
  }

  function animateSkillBar(id, percent){
    const bar = document.getElementById(id);
    const label = document.getElementById(id + "-label");
    if(label) label.textContent = `${percent}%`;
    requestAnimationFrame(() => {
      bar.style.width = `${percent}%`;
    });
  }

  // ---------- Result actions ----------
  document.getElementById("restart-btn").addEventListener("click", (e) => {
    createRipple(e);
    showPage("landing");
  });

  document.getElementById("copy-btn").addEventListener("click", (e) => {
    createRipple(e);
    const r = currentReport;
    const text = `I'm "${r.archetype.name}" ${r.archetype.emoji} — ${r.confidence}% match!\n` +
      `${r.archetype.description}\n\nDiscover yours at Can AI Guess Your Personality?`;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied to clipboard!");
    }).catch(() => showToast("Couldn't copy — try again"));
  });

  document.getElementById("share-btn").addEventListener("click", (e) => {
    createRipple(e);
    const r = currentReport;
    const shareText = `I'm "${r.archetype.name}" ${r.archetype.emoji} — ${r.confidence}% match! Find out yours:`;
    if(navigator.share){
      navigator.share({ title: "Can AI Guess Your Personality?", text: shareText, url: window.location.href })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      showToast("Link copied — paste it anywhere!");
    }
  });

  document.getElementById("download-btn").addEventListener("click", async (e) => {
    createRipple(e);
    const target = document.getElementById("result-card");
    await ensureHtml2Canvas();
    html2canvas(target, { backgroundColor: "#0f0a1f", scale: 2 }).then(canvas => {
      const link = document.createElement("a");
      link.download = "my-personality-result.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  });

  function ensureHtml2Canvas(){
    return new Promise((resolve) => {
      if(typeof html2canvas !== "undefined") return resolve();
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  function showToast(message){
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-4");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-4");
    }, 2400);
  }
})();
