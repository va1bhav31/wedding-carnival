// Shared Fastest Finger timing — used by both the server actions (which
// enforce it) and the client-side launch-all orchestrator + guest countdown
// (which display it). Kept in a plain module since 'use server' files may
// only export async functions.
export const FF_DURATION_MS = 20000; // guests have 20s to arrange the order once a question is live
export const FF_GAP_MS = 10000; // "next question" heads-up window between auto-launched questions
