import type { Keywords, JobPost } from "./types.js";

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function containsAny(text: string, terms: string[]): string | null {
  const norm = normalize(text);
  for (const term of terms) {
    if (norm.includes(normalize(term))) return term;
  }
  return null;
}

export function matchesRequiredTerms(text: string, requiredMatch: string[][]): boolean {
  for (const group of requiredMatch) {
    if (group.some((term) => normalize(text).includes(normalize(term)))) return true;
  }
  return false;
}

export function scoreJob(
  job: Omit<JobPost, "score" | "matchedTerms">,
  keywords: Keywords
): { score: number; matchedTerms: string[] } {
  const { scoring } = keywords;
  const searchText = `${job.title} ${job.company} ${job.location} ${job.jobType}`;
  const matched: string[] = [];

  let baseScore = scoring.unspecified.score;

  const remoteMatch = containsAny(searchText, scoring.remote.terms);
  const mashhadMatch = containsAny(searchText, scoring.mashhad.terms);
  const otherCityMatch = containsAny(searchText, scoring.otherCity.terms);

  if (remoteMatch) {
    baseScore = scoring.remote.score;
    matched.push(remoteMatch);
  } else if (mashhadMatch) {
    baseScore = scoring.mashhad.score;
    matched.push(mashhadMatch);
  } else if (otherCityMatch) {
    baseScore = scoring.otherCity.score;
    matched.push(otherCityMatch);
  }

  let bonus = 0;
  for (const bonusRule of scoring.bonusTerms) {
    const hit = containsAny(searchText, bonusRule.terms);
    if (hit) {
      bonus += bonusRule.bonus;
      matched.push(hit);
    }
  }

  const finalScore = Math.min(10, Math.round((baseScore + bonus) * 10) / 10);
  return { score: finalScore, matchedTerms: [...new Set(matched)] };
}
