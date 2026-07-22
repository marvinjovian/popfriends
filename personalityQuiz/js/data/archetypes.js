/**
 * ARCHETYPES DATA
 * Each archetype has an "ideal" OCEAN vector. The scoring engine compares
 * the user's computed traits against every vector here and picks the
 * closest match (nearest-neighbor) — this is what makes the report feel
 * personalized without needing any external AI API.
 */
const PERSONALITY_ARCHETYPES = [
  {
    name: "The Visionary Innovator",
    emoji: "🚀",
    vector: { O: 80, C: 50, E: 65, A: 55, N: 35 },
    description: "You see possibilities before anyone else even notices the problem.",
    strength: "Turning abstract ideas into exciting, tangible possibilities.",
    weakness: "Losing interest once the initial spark fades.",
    hiddenTalent: "Spotting trends before they go mainstream.",
    fear: "Being seen as ordinary or unoriginal.",
    idealCareer: "Product Design, Entrepreneurship, Creative Direction",
    workEnvironment: "Flexible, fast-moving, idea-driven teams",
    loveLanguage: "Words of Affirmation",
    learningStyle: "Exploratory — learns by experimenting and connecting dots",
    productivityTip: "Set a hard deadline before your curiosity wanders off.",
    famousPeople: ["Steve Jobs", "Elon Musk", "Oprah Winfrey"]
  },
  {
    name: "The Steady Achiever",
    emoji: "🏆",
    vector: { O: 45, C: 85, E: 50, A: 60, N: 25 },
    description: "Consistency is your superpower — you finish what others only start.",
    strength: "Reliability. People know they can always count on you.",
    weakness: "Struggling to adapt when plans suddenly change.",
    hiddenTalent: "Spotting small details everyone else misses.",
    fear: "Letting people down or failing to deliver.",
    idealCareer: "Project Management, Finance, Operations",
    workEnvironment: "Structured, organized, with clear expectations",
    loveLanguage: "Acts of Service",
    learningStyle: "Sequential — structured, step-by-step courses",
    productivityTip: "Build in buffer time — perfection can wait.",
    famousPeople: ["Angela Merkel", "Tim Cook", "Serena Williams"]
  },
  {
    name: "The Social Connector",
    emoji: "🌟",
    vector: { O: 55, C: 55, E: 85, A: 75, N: 30 },
    description: "Rooms feel more alive the moment you walk in.",
    strength: "Making anyone feel instantly welcome.",
    weakness: "Avoiding conflict even when it needs addressing.",
    hiddenTalent: "Remembering tiny details about people you just met.",
    fear: "Being excluded or misunderstood by the group.",
    idealCareer: "Community Management, Sales, Event Planning",
    workEnvironment: "Collaborative, social, people-first",
    loveLanguage: "Quality Time",
    learningStyle: "Social — learns best through discussion",
    productivityTip: "Schedule quiet focus blocks, not just meetings.",
    famousPeople: ["Ellen DeGeneres", "Dwayne Johnson", "Michelle Obama"]
  },
  {
    name: "The Calm Strategist",
    emoji: "🧭",
    vector: { O: 55, C: 80, E: 40, A: 55, N: 15 },
    description: "While others panic, you're already three steps ahead.",
    strength: "Staying level-headed when everyone else is spiraling.",
    weakness: "Can come across as distant or overly reserved.",
    hiddenTalent: "Seeing three moves ahead in any situation.",
    fear: "Losing control over outcomes.",
    idealCareer: "Engineering, Law, Strategic Consulting",
    workEnvironment: "Quiet, autonomous, low-drama",
    loveLanguage: "Acts of Service",
    learningStyle: "Analytical — structured and evidence-based",
    productivityTip: "Share your thought process out loud more often.",
    famousPeople: ["Warren Buffett", "Angela Duckworth", "Barack Obama"]
  },
  {
    name: "The Creative Free Spirit",
    emoji: "🎨",
    vector: { O: 85, C: 35, E: 55, A: 60, N: 45 },
    description: "Your imagination doesn't follow anyone else's rulebook.",
    strength: "Endless original ideas nobody else thinks of.",
    weakness: "Following through once the initial excitement fades.",
    hiddenTalent: "Turning ordinary things into something beautiful.",
    fear: "Feeling trapped by rules or routine.",
    idealCareer: "Art, Music, Writing, Design",
    workEnvironment: "Unstructured, inspiring, freedom to explore",
    loveLanguage: "Words of Affirmation",
    learningStyle: "Experiential — hands-on trial and error",
    productivityTip: "Pair your creativity with one small daily habit.",
    famousPeople: ["Björk", "Timothée Chalamet", "Frida Kahlo"]
  },
  {
    name: "The Empathetic Guardian",
    emoji: "🕊️",
    vector: { O: 55, C: 60, E: 45, A: 85, N: 35 },
    description: "You notice what people need before they say a word.",
    strength: "Making people feel truly heard and understood.",
    weakness: "Absorbing other people's stress as if it were your own.",
    hiddenTalent: "Sensing when someone needs help before they ask.",
    fear: "Conflict, or hurting someone unintentionally.",
    idealCareer: "Counseling, Healthcare, Human Resources, Teaching",
    workEnvironment: "Supportive, people-centered, low conflict",
    loveLanguage: "Quality Time",
    learningStyle: "Reflective — learns through meaning and connection",
    productivityTip: "Set boundaries before you're asked to give more.",
    famousPeople: ["Fred Rogers", "Malala Yousafzai", "Keanu Reeves"]
  },
  {
    name: "The Bold Leader",
    emoji: "🔥",
    vector: { O: 60, C: 75, E: 80, A: 50, N: 20 },
    description: "People naturally look to you when it's time to move.",
    strength: "Rallying people around a shared goal.",
    weakness: "Impatience with people who move slower than you.",
    hiddenTalent: "Making high-pressure decisions look effortless.",
    fear: "Being seen as weak or indecisive.",
    idealCareer: "Executive Leadership, Politics, Startup Founder",
    workEnvironment: "High-stakes, fast-paced, ownership-driven",
    loveLanguage: "Acts of Service",
    learningStyle: "Action-based — learns by doing and leading",
    productivityTip: "Slow down enough to actually listen.",
    famousPeople: ["Jacinda Ardern", "Richard Branson", "Serena Williams"]
  },
  {
    name: "The Deep Thinker",
    emoji: "🔮",
    vector: { O: 80, C: 60, E: 25, A: 55, N: 40 },
    description: "You'd rather ask one great question than make ten small talk lines.",
    strength: "Seeing patterns and meaning that others overlook.",
    weakness: "Getting lost in your head instead of taking action.",
    hiddenTalent: "Asking the one question that reframes everything.",
    fear: "Being misunderstood or forced into small talk.",
    idealCareer: "Research, Writing, Philosophy, Software Engineering",
    workEnvironment: "Quiet, solo-friendly, deep-focus time",
    loveLanguage: "Words of Affirmation",
    learningStyle: "Reflective — deep independent research",
    productivityTip: "Set a timer — thinking has a finish line too.",
    famousPeople: ["Albert Einstein", "Susan Cain", "Bill Gates"]
  }
];

/** Motivational quotes shown randomly on the result page. */
const MOTIVATIONAL_QUOTES = [
  "Know thyself, and the rest follows. — Ancient proverb",
  "Personality is not a fixed pattern, but a range of possibilities. — adapted from Rollo May",
  "The privilege of a lifetime is to become who you truly are. — Carl Jung",
  "What lies behind us and before us are tiny matters compared to what lies within us. — Ralph Waldo Emerson",
  "Your talent is God's gift to you. What you do with it is your gift back. — Leo Buscaglia",
  "Character is destiny. — Heraclitus",
  "Know what you value, and self-doubt becomes quieter.",
  "The strongest people aren't always the loudest in the room."
];
