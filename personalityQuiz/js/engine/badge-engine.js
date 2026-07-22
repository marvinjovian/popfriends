/**
 * BADGE ENGINE
 * Each badge is a simple rule against the computed report. Add a new
 * badge by adding one object to BADGE_RULES — no other code changes needed.
 */
const BADGE_RULES = [
  { name: "Creative Thinker", icon: "🎨", test: (r) => r.traits.O >= 70 },
  { name: "Natural Leader", icon: "👑", test: (r) => r.leadershipScore >= 70 },
  { name: "Problem Solver", icon: "🧩", test: (r) => r.traits.C >= 65 && r.traits.O >= 55 },
  { name: "Calm Mind", icon: "🧘", test: (r) => r.traits.N <= 35 },
  { name: "Social Butterfly", icon: "🦋", test: (r) => r.traits.E >= 70 },
  { name: "Visionary", icon: "🔭", test: (r) => r.traits.O >= 70 && r.traits.E >= 60 },
  { name: "Fast Learner", icon: "⚡", test: (r) => r.traits.O >= 60 && r.traits.C >= 60 }
];

class BadgeEngine {
  /** @returns {{name:string icon:string}[]} badges the report qualifies for */
  static award(report){
    const earned = BADGE_RULES.filter(rule => rule.test(report))
      .map(rule => ({ name: rule.name, icon: rule.icon }));
    // Guarantee at least one badge so results never feel empty.
    if(earned.length === 0){
      earned.push({ name: "Calm Mind", icon: "🧘" });
    }
    return earned;
  }
}
