import { getUserId } from "../auth/session";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const apiUrl = configuredApiUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

export type EvidenceFile = {
  id: string;
  case_id: string;
  file_name: string;
  object_key: string;
  file_size: number;
  mime_type: string;
  file_hash: string | null;
  hash_algorithm: string | null;
};

export type CaseSummary = {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseDetail = CaseSummary & {
  files: EvidenceFile[];
};

export type TimelineEvent = {
  event_type: string;
  description: string;
  created_at: string;
};

export type ProofRequest = {
  proof_id: string;
  file_id: string;
  case_id: string;
  case_id_bytes32: `0x${string}`;
  file_hash_bytes32: `0x${string}`;
  metadata_hash_bytes32: `0x${string}`;
  proof_status: "pending" | "confirmed" | "failed";
  chain_id: number;
  contract_address: `0x${string}`;
};

export type ShareLink = {
  token: string;
  share_url: string;
  created_at: string;
};

export type ShareFileReport = {
  file_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string | null;
  proof_status: string | null;
  tx_hash: string | null;
  block_number: number | null;
  chain_id: number | null;
};

export type ShareReport = {
  case_id: string;
  case_title: string;
  case_description: string | null;
  created_at: string;
  files: ShareFileReport[];
};

export type VerifyResult = {
  verification_attempt_id: string;
  file_id: string;
  result: "match" | "mismatch";
};

type RequestOptions = RequestInit & {
  user?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!apiUrl) {
    throw new Error("VITE_API_BASE_URL is missing from the deployed frontend.");
  }
  if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(apiUrl)) {
    throw new Error("The deployed frontend is still configured to use a local backend.");
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.user !== false) headers.set("X-User-Id", getUserId());

  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  listCases: () => request<CaseSummary[]>("/cases"),
  getCase: (caseId: string) => request<CaseDetail>(`/cases/${caseId}`),
  createCase: (title: string, description?: string) =>
    request<CaseSummary>("/cases", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),
  getTimeline: (caseId: string) =>
    request<{ case_id: string; events: TimelineEvent[] }>(
      `/cases/${caseId}/timeline`,
    ),
  presignFile: (
    caseId: string,
    file: { file_name: string; file_size: number; mime_type: string },
  ) =>
    request<{ file_id: string; upload_url: string; headers: Record<string, string> }>(
      `/cases/${caseId}/files/presign`,
      { method: "POST", body: JSON.stringify(file) },
    ),
  uploadToStorage: (uploadUrl: string, file: File, headers: Record<string, string>) =>
    fetch(uploadUrl, { method: "PUT", body: file, headers }).then((response) => {
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    }),
  confirmHash: (fileId: string, fileHash: string) =>
    request<EvidenceFile>(`/files/${fileId}/hash-confirm`, {
      method: "POST",
      body: JSON.stringify({ file_hash: fileHash, hash_algorithm: "sha256" }),
    }),
  requestProof: (fileId: string) =>
    request<ProofRequest>(`/files/${fileId}/proof-request`, { method: "POST" }),
  confirmProof: (
    proofId: string,
    data: { case_id: string; tx_hash: string; block_number: number; chain_id: number },
  ) =>
    request<{ proof_id: string; proof_status: string }>(
      `/proofs/${proofId}/confirm`,
      { method: "POST", body: JSON.stringify(data), user: false },
    ),
  createShareLink: (caseId: string) =>
    request<ShareLink>(`/cases/${caseId}/share`, { method: "POST" }),
  getShareReport: (token: string) =>
    request<ShareReport>(`/share/${token}`, { user: false }),
  verifyFile: (fileId: string, uploadedHash: string) =>
    request<VerifyResult>("/verify/file", {
      method: "POST",
      body: JSON.stringify({ file_id: fileId, uploaded_hash: uploadedHash }),
      user: false,
    }),
};
