const ID_KEY = "proofvault-user-id";
const NAME_KEY = "proofvault-user-name";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getSession(): { userId: string; name: string } | null {
  const userId = localStorage.getItem(ID_KEY);
  const name = localStorage.getItem(NAME_KEY);
  if (userId && name) return { userId, name };
  return null;
}

export function createSession(name: string): { userId: string; name: string } {
  const userId = generateUUID();
  localStorage.setItem(ID_KEY, userId);
  localStorage.setItem(NAME_KEY, name);
  return { userId, name };
}

export function clearSession(): void {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getUserId(): string {
  return localStorage.getItem(ID_KEY) ?? "";
}
