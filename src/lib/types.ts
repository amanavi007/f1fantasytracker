export type GpStatus = "draft" | "under_review" | "finalized";

export type TieRule = "shared_last" | "lower_best_team_loses" | "manual_decision";

export interface Player {
  id: string;
  displayName: string;
  realName?: string;
  avatarUrl?: string;
  joinGpId?: string;
  isActive: boolean;
  notes?: string;
  team1Name: string;
  team2Name: string;
  aliases: string[];
}

export interface Gp {
  id: string;
  name: string;
  raceDate: string;
  status: GpStatus;
  round: number;
}

export interface GpTeamScore {
  id: string;
  gpId: string;
  playerId: string;
  teamSlot: 1 | 2;
  teamName: string;
  score: number | null;
  sourceScreenshotId?: string;
  needsReview?: boolean;
}

export type SubmissionStatus =
  | "both_detected"
  | "one_team_missing"
  | "needs_review"
  | "manually_corrected"
  | "finalized"
  | "missing_submission";

export interface GpEntry {
  id: string;
  gpId: string;
  playerId: string;
  status: SubmissionStatus;
  notes?: string;
}

export interface ScreenshotUpload {
  id: string;
  gpId: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  uploadedBy: string;
  hash: string;
}

export interface ParsedScreenshotResult {
  id: string;
  screenshotId: string;
  gpName?: string;
  detectedAccountName?: string;
  detectedTeamNames: string[];
  detectedScores: number[];
  screenshotType?: string;
  confidenceByField: Record<string, number>;
  missingFields: string[];
  warnings: string[];
  parsedEntities: Record<string, string | number | null>;
  approved: boolean;
}

export interface CorrectionLog {
  id: string;
  gpId: string;
  screenshotId?: string;
  fieldName: string;
  originalValue: string;
  correctedValue: string;
  editedBy: string;
  editedAt: string;
  reason?: string;
}

export interface GpComputedRow {
  gpId: string;
  playerId: string;
  playerName: string;
  team1Score: number | null;
  team2Score: number | null;
  combined: number | null;
  rank: number | null;
}

export interface GpPunishmentResult {
  gpId: string;
  loserPlayerIds: string[];
  secondLastPlayerIds: string[];
  tieRule: TieRule;
  requiresManualDecision: boolean;
}
