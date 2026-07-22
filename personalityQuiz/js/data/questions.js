/**
 * QUESTIONS DATA
 * Each question maps to a real-life category. Each answer option carries
 * "deltas" — small point shifts toward the Big Five (OCEAN) traits:
 *   O = Openness, C = Conscientiousness, E = Extraversion,
 *   A = Agreeableness, N = Neuroticism (emotional reactivity)
 *
 * This is the only file the scoring engine reads from — add or edit
 * questions here without touching any logic elsewhere.
 */
const QUIZ_QUESTIONS = [
  {
    id: 1,
    category: "Daily Habits",
    question: "How does your ideal morning start?",
    options: [
      { text: "Wake up early and plan the whole day", deltas: { C: 2, N: -1 } },
      { text: "Wake up and check messages & socials", deltas: { E: 1 } },
      { text: "Wake up whenever, go with the flow", deltas: { O: 1, C: -1 } },
      { text: "Wake up and journal or reflect quietly", deltas: { O: 1, E: -1 } }
    ]
  },
  {
    id: 2,
    category: "Social Life",
    question: "Your ideal weekend looks like...",
    options: [
      { text: "A big gathering with lots of friends", deltas: { E: 2, A: 1 } },
      { text: "A small dinner with 1–2 close friends", deltas: { A: 1, E: -1 } },
      { text: "A solo adventure exploring somewhere new", deltas: { O: 2, E: -1 } },
      { text: "A cozy night in, no plans at all", deltas: { E: -2, N: -1 } }
    ]
  },
  {
    id: 3,
    category: "Decision Making",
    question: "When making a big decision, you usually...",
    options: [
      { text: "Make a pros/cons list and analyze data", deltas: { C: 2 } },
      { text: "Trust your gut feeling", deltas: { O: 1, C: -1 } },
      { text: "Ask friends or family what they think", deltas: { A: 2, E: 1 } },
      { text: "Overthink it for days before deciding", deltas: { N: 2 } }
    ]
  },
  {
    id: 4,
    category: "Creativity",
    question: "In your free time, you're most drawn to...",
    options: [
      { text: "Painting, writing, or making music", deltas: { O: 2 } },
      { text: "Solving puzzles or brain teasers", deltas: { O: 1, C: 1 } },
      { text: "Organizing events or hanging out", deltas: { E: 2 } },
      { text: "Building or fixing things with your hands", deltas: { C: 1 } }
    ]
  },
  {
    id: 5,
    category: "Work Style",
    question: "When a deadline is approaching, you...",
    options: [
      { text: "Already finished it early", deltas: { C: 2, N: -1 } },
      { text: "Work best under pressure, last minute", deltas: { O: 1, N: 1 } },
      { text: "Ask teammates to divide the work", deltas: { A: 1, E: 1 } },
      { text: "Feel anxious and lose focus", deltas: { N: 2 } }
    ]
  },
  {
    id: 6,
    category: "Emotional Reactions",
    question: "When someone criticizes your work, you...",
    options: [
      { text: "Take it calmly and look for the lesson", deltas: { N: -2, C: 1 } },
      { text: "Feel hurt, but move on quickly", deltas: { A: 1 } },
      { text: "Get defensive right away", deltas: { N: 1, A: -1 } },
      { text: "Overanalyze it for hours afterward", deltas: { N: 2 } }
    ]
  },
  {
    id: 7,
    category: "Problem Solving",
    question: "Faced with a tough problem, you...",
    options: [
      { text: "Break it into small, methodical steps", deltas: { C: 2 } },
      { text: "Brainstorm wild, unconventional ideas", deltas: { O: 2 } },
      { text: "Ask others how they'd approach it", deltas: { A: 1, E: 1 } },
      { text: "Feel overwhelmed and procrastinate", deltas: { N: 1, C: -1 } }
    ]
  },
  {
    id: 8,
    category: "Hobbies",
    question: "Which hobby sounds most like you?",
    options: [
      { text: "Traveling somewhere new and unplanned", deltas: { O: 2, E: 1 } },
      { text: "Reading or learning something niche", deltas: { O: 1, E: -1 } },
      { text: "Team sports or group activities", deltas: { E: 2, A: 1 } },
      { text: "Gardening, crafting, or quiet routines", deltas: { C: 1, N: -1 } }
    ]
  },
  {
    id: 9,
    category: "Learning Style",
    question: "You learn best by...",
    options: [
      { text: "Reading and researching deeply", deltas: { O: 1 } },
      { text: "Hands-on trial and error", deltas: { O: 1, C: -1 } },
      { text: "Discussing ideas with others", deltas: { E: 1, A: 1 } },
      { text: "Following a structured course step by step", deltas: { C: 2 } }
    ]
  },
  {
    id: 10,
    category: "Communication",
    question: "In a group conversation, you usually...",
    options: [
      { text: "Lead the conversation and share ideas openly", deltas: { E: 2 } },
      { text: "Listen more than you speak", deltas: { E: -2 } },
      { text: "Mediate when there's disagreement", deltas: { A: 2 } },
      { text: "Say what you think, even if it's blunt", deltas: { A: -1, E: 1 } }
    ]
  },
  {
    id: 11,
    category: "Daily Habits",
    question: "How do you usually plan your day?",
    options: [
      { text: "Detailed to-do list, everything scheduled", deltas: { C: 2 } },
      { text: "Rough idea, staying flexible", deltas: { O: 1, C: -1 } },
      { text: "Depends on how I feel that morning", deltas: { N: 1, C: -1 } },
      { text: "Plan around other people's schedules", deltas: { A: 1 } }
    ]
  },
  {
    id: 12,
    category: "Social Life",
    question: "At a party full of strangers, you...",
    options: [
      { text: "Introduce yourself to everyone", deltas: { E: 2 } },
      { text: "Stick with the one person you know", deltas: { E: -1, N: 1 } },
      { text: "Observe from the sidelines for a while", deltas: { E: -2, O: 1 } },
      { text: "Leave early if you can", deltas: { E: -2, N: 1 } }
    ]
  },
  {
    id: 13,
    category: "Creativity",
    question: "Which best describes your thinking style?",
    options: [
      { text: "Big-picture, always imagining possibilities", deltas: { O: 2 } },
      { text: "Practical, focused on what works now", deltas: { C: 1, O: -1 } },
      { text: "Emotionally intuitive, feelings-first", deltas: { A: 1, N: 1 } },
      { text: "Logical, structured, step-by-step", deltas: { C: 2 } }
    ]
  },
  {
    id: 14,
    category: "Emotional Reactions",
    question: "When you're stressed, you usually...",
    options: [
      { text: "Stay calm and problem-solve", deltas: { N: -2 } },
      { text: "Talk it out with someone", deltas: { A: 1, E: 1 } },
      { text: "Distract yourself and avoid it", deltas: { N: 1, C: -1 } },
      { text: "Feel it intensely and need time alone", deltas: { N: 2, E: -1 } }
    ]
  },
  {
    id: 15,
    category: "Work Style",
    question: "Which work environment helps you thrive?",
    options: [
      { text: "Fast-paced, lots of collaboration", deltas: { E: 2 } },
      { text: "Quiet, independent, minimal interruptions", deltas: { E: -2, O: 1 } },
      { text: "Structured, with clear rules and expectations", deltas: { C: 2 } },
      { text: "Flexible and creative, with few constraints", deltas: { O: 2, C: -1 } }
    ]
  }
];
