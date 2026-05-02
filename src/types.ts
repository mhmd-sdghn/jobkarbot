export interface BaleConfig {
  botToken: string;
  chatIds: string[];
  apiBaseUrl: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface SiteConfig {
  name: string;
  baseUrl: string;
  searchUrl: string;
  loginUrl: string;
  credentials: Credentials;
  crawlIntervalMinutes: number;
  maxDaysOld: number;
  enabled: boolean;
}

export interface BonusTerm {
  terms: string[];
  bonus: number;
}

export interface ScoringRuleWithTerms {
  score: number;
  terms: string[];
}

export interface ScoringRuleUnspecified {
  score: number;
  description: string;
}

export interface Scoring {
  remote: ScoringRuleWithTerms;
  mashhad: ScoringRuleWithTerms;
  unspecified: ScoringRuleUnspecified;
  otherCity: ScoringRuleWithTerms;
  bonusTerms: BonusTerm[];
}

export interface Keywords {
  searchQueries: string[];
  requiredMatch: string[][];
  scoring: Scoring;
  minScoreToNotify: number;
}

export interface AppConfig {
  bale: BaleConfig;
  keywords: Keywords;
  sites: SiteConfig[];
}

export interface JobPost {
  id: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  postedAt: string;
  url: string;
  site: string;
  score: number;
  matchedTerms: string[];
}

export interface BaleCallbackQuery {
  id: string;
  from: BaleUser;
  message?: BaleMessage;
  data?: string;
}

export interface BaleUpdate {
  update_id: number;
  message?: BaleMessage;
  callback_query?: BaleCallbackQuery;
}

export interface BaleMessage {
  message_id: number;
  from: BaleUser;
  chat: BaleChat;
  text?: string;
  date: number;
}

export interface BaleUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
}

export interface BaleChat {
  id: number;
  type: string;
  first_name?: string;
}

export interface BotUser {
  chatId: string;
  firstName: string;
  registeredAt: string;
}

export interface SchedulerState {
  running: boolean;
  lastRunBySite: Record<string, string>;
}
