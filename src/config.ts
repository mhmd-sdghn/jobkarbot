import { readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
import type { AppConfig } from "./types.js";

const BonusTermSchema = z.object({
  terms: z.array(z.string()),
  bonus: z.number(),
});

const ScoringRuleWithTermsSchema = z.object({
  score: z.number(),
  terms: z.array(z.string()),
});

const ConfigSchema = z.object({
  bale: z.object({
    botToken: z.string().min(1, "Bale botToken is required"),
    chatIds: z.array(z.string()).default([]),
    apiBaseUrl: z.string().url(),
  }),
  keywords: z.object({
    searchQueries: z.array(z.string()).min(1),
    requiredMatch: z.array(z.array(z.string())),
    scoring: z.object({
      remote: ScoringRuleWithTermsSchema,
      mashhad: ScoringRuleWithTermsSchema,
      unspecified: z.object({ score: z.number(), description: z.string() }),
      otherCity: ScoringRuleWithTermsSchema,
      bonusTerms: z.array(BonusTermSchema),
    }),
    minScoreToNotify: z.number().min(1).max(10),
  }),
  sites: z.array(
    z.object({
      name: z.string(),
      baseUrl: z.string().url(),
      searchUrl: z.string(),
      loginUrl: z.string().default(""),
      credentials: z.object({
        username: z.string().default(""),
        password: z.string().default(""),
      }),
      crawlIntervalMinutes: z.number().min(1),
      maxDaysOld: z.number().min(1),
      enabled: z.boolean(),
    })
  ),
});

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;

  const path = resolve(process.cwd(), "settings.json");
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const result = ConfigSchema.safeParse(raw);

  if (!result.success) {
    console.error("Invalid settings.json:", result.error.format());
    process.exit(1);
  }

  _config = result.data as AppConfig;
  return _config;
}

export function reloadConfig(): AppConfig {
  _config = null;
  return loadConfig();
}
