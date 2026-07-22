/**
 * SCORING ENGINE
 * Pure logic, no DOM access — this file could be unit-tested on its own.
 *
 * PersonalityScorer   : turns raw answers into normalized OCEAN scores (0-100)
 * ArchetypeMatcher     : finds the closest archetype via distance calculation
 * ReportBuilder        : combines everything into the final report object
 *   used by the UI layer
 */

class PersonalityScorer {
  constructor(questions){
    this.questions = questions;
  }

  /**
   * @param {number[]} answerIndices - index of the chosen option per question
   * @returns {{O:number,C:number,E:number,A:number,N:number}}
   */
  score(answerIndices){
    const raw = { O: 0, C: 0, E: 0, A: 0, N: 0 };

    this.questions.forEach((q, i) => {
      const chosenIndex = answerIndices[i];
      if(chosenIndex === undefined || chosenIndex === null) return;
      const deltas = q.options[chosenIndex]?.deltas || {};
      Object.keys(deltas).forEach(trait => {
        raw[trait] += deltas[trait];
      });
    });

    const normalized = {};
    Object.keys(raw).forEach(trait => {
      normalized[trait] = PersonalityScorer.clamp(50 + raw[trait] * 4, 0, 100);
    });
    return normalized;
  }

  static clamp(value, min, max){
    return Math.max(min, Math.min(max, Math.round(value)));
  }
}

class ArchetypeMatcher {
  constructor(archetypes){
    this.archetypes = archetypes;
  }

  /** Euclidean distance between the user's traits and an archetype's ideal vector. */
  static distance(traits, vector){
    const traitKeys = ["O", "C", "E", "A", "N"];
    const sumSquares = traitKeys.reduce((sum, k) => {
      const diff = (traits[k] ?? 50) - (vector[k] ?? 50);
      return sum + diff * diff;
    }, 0);
    return Math.sqrt(sumSquares);
  }

  /** @returns {{archetype: object, confidence: number}} */
  match(traits){
    let best = null;
    let bestDistance = Infinity;

    this.archetypes.forEach(archetype => {
      const d = ArchetypeMatcher.distance(traits, archetype.vector);
      if(d < bestDistance){
        bestDistance = d;
        best = archetype;
      }
    });

    // Convert distance into a believable confidence percentage (55–99%).
    const confidence = PersonalityScorer.clamp(100 - bestDistance * 0.55, 55, 99);
    return { archetype: best, confidence };
  }
}

/** Derives human-readable style labels from trait combinations. */
class TraitInterpreter {
  static communicationStyle(traits){
    if(traits.E >= 50 && traits.A >= 50) return "Warm & Expressive";
    if(traits.E >= 50 && traits.A < 50) return "Direct & Assertive";
    if(traits.E < 50 && traits.A >= 50) return "Diplomatic & Thoughtful";
    return "Reserved & Precise";
  }

  static decisionStyle(traits){
    if(traits.C >= 50 && traits.O >= 50) return "Strategic Analyzer";
    if(traits.C >= 50 && traits.O < 50) return "Methodical Planner";
    if(traits.C < 50 && traits.O >= 50) return "Intuitive Explorer";
    return "Spontaneous Responder";
  }

  static leadershipScore(traits){
    return PersonalityScorer.clamp(traits.E * 0.6 + traits.C * 0.4, 0, 100);
  }

  static eqScore(traits){
    return PersonalityScorer.clamp(traits.A * 0.5 + (100 - traits.N) * 0.5, 0, 100);
  }
}

/** Assembles the full report object consumed by the results UI. */
class ReportBuilder {
  constructor(questions, archetypes){
    this.scorer = new PersonalityScorer(questions);
    this.matcher = new ArchetypeMatcher(archetypes);
  }

  build(answerIndices){
    const traits = this.scorer.score(answerIndices);
    const { archetype, confidence } = this.matcher.match(traits);
    const leadershipScore = TraitInterpreter.leadershipScore(traits);
    const eqScore = TraitInterpreter.eqScore(traits);

    return {
      traits,
      archetype,
      confidence,
      extrovertPct: traits.E,
      introvertPct: 100 - traits.E,
      creativityScore: traits.O,
      leadershipScore,
      eqScore,
      communicationStyle: TraitInterpreter.communicationStyle(traits),
      decisionStyle: TraitInterpreter.decisionStyle(traits),
      quote: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
    };
  }
}
