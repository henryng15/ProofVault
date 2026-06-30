const sessionKey = "proofvault-user-id";
const defaultUserId = "2af7a6e4-e75f-4bd4-bf6f-c82bfc688f38";

export function getUserId() {
  const saved = localStorage.getItem(sessionKey);
  if (saved) return saved;

  localStorage.setItem(sessionKey, defaultUserId);
  return defaultUserId;
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
}
