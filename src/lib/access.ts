// Pure authorization rules shared by server functions and tests.
export type AccessLevel = "owner" | "edit" | "read" | null;
export type AppRole = "admin" | "owner" | "viewer";

export function canDownload(level: AccessLevel) {
  return level === "owner" || level === "edit" || level === "read";
}
export function canEditMetadata(level: AccessLevel) {
  return level === "owner" || level === "edit";
}
export function canManageSharing(level: AccessLevel) {
  return level === "owner";
}
export function canDelete(level: AccessLevel) {
  return level === "owner";
}
export function canUpload(roles: AppRole[]) {
  return roles.includes("owner");
}

export const SIGNED_URL_TTL_SECONDS = 60;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}
