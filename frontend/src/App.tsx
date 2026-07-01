import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { api, type CaseDetail, type CaseSummary, type EvidenceFile, type ShareReport, type TimelineEvent } from "./api/client";
import { clearSession, createSession, getSession } from "./auth/session";
import VerifyPanel from "./components/VerifyPanel";
import WalletProofPanel from "./components/WalletProofPanel";
import { hashFile } from "./files/hashFile";

type AppView = "dashboard" | "create-case" | "case-detail" | "verify" | "share-report";
type FileStatus = "uploaded_not_proven" | "hash_saved" | "proof_pending" | "confirmed";

const STATUS_LABELS: Record<FileStatus, string> = {
  uploaded_not_proven: "Uploaded",
  hash_saved: "Hashed",
  proof_pending: "Proof pending",
  confirmed: "Confirmed",
};

function getInitialStatus(file: EvidenceFile): FileStatus {
  return file.file_hash ? "hash_saved" : "uploaded_not_proven";
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim());
  }
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand"><ShieldCheck size={32} /><h1>ProofVault</h1></div>
        <p>Tamper-proof evidence on the blockchain.</p>
        <form onSubmit={submit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-name">Your name</label>
            <input
              id="login-name"
              type="text"
              className="form-input"
              placeholder="e.g. Henry Ng"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" className="button primary full" disabled={!name.trim()}>
            Get started
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(getSession());

  function handleLogin(name: string) {
    setSession(createSession(name));
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setCases([]);
    setCaseDetail(null);
    setView("dashboard");
  }

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  // Navigation — check on mount if URL contains a share token
  const initialShareToken = new URLSearchParams(window.location.search).get("share");
  const [view, setView] = useState<AppView>(initialShareToken ? "share-report" : "dashboard");

  // Share report state
  const [shareReport, setShareReport] = useState<ShareReport | null>(null);
  const [shareLoading, setShareLoading] = useState(!!initialShareToken);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken);
  const [shareCopied, setShareCopied] = useState(false);

  // Dashboard state
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  // Case detail state
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [caseDetailError, setCaseDetailError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>({});

  // Create case form state
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Upload state
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);

  // Load share report if token is in URL on first mount
  useEffect(() => {
    if (!initialShareToken) return;
    api.getShareReport(initialShareToken)
      .then((report) => { setShareReport(report); setShareLoading(false); })
      .catch((err) => { setShareError(err instanceof Error ? err.message : "Report not found."); setShareLoading(false); });
  }, []);

  async function handleShare() {
    if (!caseDetail) return;
    try {
      const link = await api.createShareLink(caseDetail.id);
      setShareToken(link.token);
      await navigator.clipboard.writeText(link.share_url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch {
      // clipboard may be blocked in some browsers — fallback is just showing token
    }
  }

  // Load cases list on mount
  useEffect(() => {
    setCasesLoading(true);
    setCasesError(null);
    api
      .listCases()
      .then((list) => {
        setCases(list);
        setCasesLoading(false);
      })
      .catch((err) => {
        setCasesError(err instanceof Error ? err.message : "Failed to load cases.");
        setCasesLoading(false);
      });
  }, []);

  async function openCase(caseId: string) {
    setCaseDetailLoading(true);
    setCaseDetailError(null);
    setView("case-detail");
    try {
      const [detail, events] = await Promise.all([
        api.getCase(caseId),
        api.getTimeline(caseId),
      ]);
      setCaseDetail(detail);
      setTimeline(events.events);
      setSelectedFile(detail.files[0] || null);
      const statuses: Record<string, FileStatus> = {};
      for (const f of detail.files) statuses[f.id] = getInitialStatus(f);
      setFileStatuses(statuses);
    } catch (err) {
      setCaseDetailError(err instanceof Error ? err.message : "Failed to load case.");
    } finally {
      setCaseDetailLoading(false);
    }
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const newCase = await api.createCase(
        createTitle.trim(),
        createDescription.trim() || undefined,
      );
      setCases((prev) => [newCase, ...prev]);
      setCreateTitle("");
      setCreateDescription("");
      await openCase(newCase.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create case.");
      setCreateLoading(false);
    }
  }

  function addTimeline(description: string, eventType = "verification_completed") {
    setTimeline((current) => [
      { event_type: eventType, description, created_at: new Date().toISOString() },
      ...current,
    ]);
  }

  async function uploadEvidence(file: File | null) {
    if (!file || !caseDetail) return;
    setUploading(true);
    setUploadMessage("Creating file hash...");
    try {
      const fileHash = await hashFile(file);
      setUploadMessage("Preparing secure upload...");
      const presign = await api.presignFile(caseDetail.id, {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      });
      setUploadMessage("Uploading evidence...");
      await api.uploadToStorage(presign.upload_url, file, presign.headers);
      setUploadMessage("Saving file hash...");
      const savedFile = await api.confirmHash(presign.file_id, fileHash);
      setCaseDetail((current) =>
        current
          ? { ...current, files: [...current.files, savedFile], updated_at: new Date().toISOString() }
          : current,
      );
      setSelectedFile(savedFile);
      setFileStatuses((prev) => ({ ...prev, [savedFile.id]: "hash_saved" }));
      addTimeline(`${file.name} was uploaded and hashed`, "file_added");
      setUploadMessage("Evidence uploaded successfully.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload could not be completed.");
    } finally {
      setUploading(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  }

  function handleProofConfirmed(fileName: string) {
    if (selectedFile) {
      setFileStatuses((prev) => ({ ...prev, [selectedFile.id]: "confirmed" }));
    }
    addTimeline(`Blockchain proof confirmed for ${fileName}`, "proof_confirmed");
  }

  const confirmedCount = Object.values(fileStatuses).filter((s) => s === "confirmed").length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={20} /></div>
          <span>ProofVault</span>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => setView("dashboard")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            className={view === "case-detail" || view === "create-case" ? "active" : ""}
            onClick={() => setView("dashboard")}
          >
            <FolderOpen size={18} /> Cases
          </button>
          <button
            className={view === "verify" ? "active" : ""}
            onClick={() => setView("verify")}
          >
            <FileCheck2 size={18} /> Verify
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout}><Settings size={18} /> Log out</button>
          <div className="user">
            <span className="avatar">{session.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
            <div><strong>{session.name}</strong><small>ProofVault user</small></div>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <label className="search">
            <Search size={17} />
            <input placeholder="Search cases and files" />
          </label>
          <div className="topbar-actions">
            <button className="icon-button quiet" title="Notifications"><Bell size={18} /></button>
            <button className="button primary" onClick={() => setView("create-case")}>
              <Plus size={17} /> New case
            </button>
          </div>
        </header>

        <div className="content">

          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {view === "dashboard" && (
            <>
              <div className="breadcrumbs">Dashboard</div>
              <div className="page-heading">
                <h1>Cases</h1>
                <button className="button primary" onClick={() => setView("create-case")}>
                  <Plus size={17} /> New case
                </button>
              </div>

              {casesLoading && (
                <div className="state-box">
                  <LoaderCircle className="spin" size={32} />
                  <p>Loading cases…</p>
                </div>
              )}

              {casesError && (
                <div className="state-box error">
                  <AlertCircle size={28} />
                  <p>{casesError}</p>
                  <button className="button" onClick={() => window.location.reload()}>Retry</button>
                </div>
              )}

              {!casesLoading && !casesError && cases.length === 0 && (
                <div className="state-box">
                  <FolderOpen size={44} strokeWidth={1.2} />
                  <p>No cases yet. Create your first case to get started.</p>
                  <button className="button primary" onClick={() => setView("create-case")}>
                    <Plus size={16} /> New case
                  </button>
                </div>
              )}

              {!casesLoading && !casesError && cases.length > 0 && (
                <div className="case-grid">
                  {cases.map((c) => (
                    <button key={c.id} className="case-card" onClick={() => openCase(c.id)}>
                      <div className="case-card-icon"><FolderOpen size={22} /></div>
                      <div className="case-card-body">
                        <strong>{c.title}</strong>
                        {c.description && <p>{c.description}</p>}
                        <small>Updated {formatDate(c.updated_at)}</small>
                      </div>
                      <ChevronRight size={18} className="case-card-arrow" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── CREATE CASE ───────────────────────────────────────── */}
          {view === "create-case" && (
            <>
              <div className="breadcrumbs">
                <button className="breadcrumb-btn" onClick={() => setView("dashboard")}>Dashboard</button>
                <ChevronRight size={14} />
                <span>New case</span>
              </div>
              <div className="page-heading">
                <h1>Create a new case</h1>
              </div>

              <form className="create-form" onSubmit={handleCreateCase}>
                <div className="form-group">
                  <label htmlFor="case-title">
                    Case title <span className="required">*</span>
                  </label>
                  <input
                    id="case-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Apartment Move-in Inspection"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    disabled={createLoading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="case-description">
                    Description <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    id="case-description"
                    className="form-input form-textarea"
                    placeholder="Describe the purpose of this case…"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    disabled={createLoading}
                    rows={4}
                  />
                </div>

                {createError && (
                  <div className="form-error">
                    <AlertCircle size={14} /> {createError}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => setView("dashboard")}
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button primary"
                    disabled={createLoading || !createTitle.trim()}
                  >
                    {createLoading
                      ? <><LoaderCircle className="spin" size={16} /> Creating…</>
                      : "Create case"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── CASE DETAIL ───────────────────────────────────────── */}
          {view === "case-detail" && (
            <>
              {caseDetailLoading && (
                <div className="state-box">
                  <LoaderCircle className="spin" size={32} />
                  <p>Loading case…</p>
                </div>
              )}

              {caseDetailError && (
                <div className="state-box error">
                  <AlertCircle size={28} />
                  <p>{caseDetailError}</p>
                  <button className="button" onClick={() => setView("dashboard")}>
                    Back to dashboard
                  </button>
                </div>
              )}

              {!caseDetailLoading && !caseDetailError && caseDetail && (
                <>
                  <div className="breadcrumbs">
                    <button className="breadcrumb-btn" onClick={() => setView("dashboard")}>
                      Dashboard
                    </button>
                    <ChevronRight size={14} />
                    <span>{caseDetail.title}</span>
                  </div>

                  <div className="case-header">
                    <div>
                      <div className="case-meta">
                        <span className="open-status"><span /> Open case</span>
                      </div>
                      <div className="title-line">
                        <h1>{caseDetail.title}</h1>
                      </div>
                      {caseDetail.description && <p>{caseDetail.description}</p>}
                    </div>
                    <div className="case-actions">
                      <button className="button" onClick={handleShare}>
                        {shareCopied ? <Check size={17} /> : <Share2 size={17} />}
                        {shareCopied ? "Link copied!" : "Share"}
                      </button>
                      <button
                        className="button"
                        disabled={uploading}
                        onClick={() => uploadInput.current?.click()}
                      >
                        {uploading
                          ? <LoaderCircle className="spin" size={17} />
                          : <Upload size={17} />}
                        {uploading ? "Uploading..." : "Add evidence"}
                      </button>
                      <input
                        ref={uploadInput}
                        className="hidden-input"
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => uploadEvidence(e.target.files?.[0] || null)}
                      />
                      <button className="icon-button" title="Case actions">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>

                  {uploadMessage && (
                    <div className={`upload-notice ${uploading ? "working" : ""}`}>
                      {uploading
                        ? <LoaderCircle className="spin" size={15} />
                        : <AlertCircle size={15} />}
                      {uploadMessage}
                    </div>
                  )}

                  <div className="summary-strip">
                    <div><span>Total evidence</span><strong>{caseDetail.files.length} files</strong></div>
                    <div><span>On-chain proofs</span><strong>{confirmedCount} confirmed</strong></div>
                    <div><span>Last updated</span><strong>{formatDate(caseDetail.updated_at)}</strong></div>
                  </div>

                  <div className="workspace">
                    <section className="panel files-panel">
                      <div className="panel-heading">
                        <div><span className="eyebrow">Evidence</span><h2>Case files</h2></div>
                        <span className="item-count">{caseDetail.files.length}</span>
                      </div>

                      {caseDetail.files.length === 0 ? (
                        <div className="panel-empty">
                          <FileText size={28} strokeWidth={1.3} />
                          <p>No files yet. Upload evidence to get started.</p>
                        </div>
                      ) : (
                        <div className="file-list">
                          {caseDetail.files.map((file) => {
                            const status = fileStatuses[file.id] ?? getInitialStatus(file);
                            return (
                              <button
                                key={file.id}
                                className={`file-row ${selectedFile?.id === file.id ? "selected" : ""}`}
                                onClick={() => setSelectedFile(file)}
                              >
                                <span className="file-icon"><FileText size={20} /></span>
                                <span className="file-name">
                                  <strong>{file.file_name}</strong>
                                  <small>
                                    {formatSize(file.file_size)} ·{" "}
                                    {file.mime_type.replace("application/", "").replace("image/", "")}
                                  </small>
                                </span>
                                <span className={`status status-${status}`}>
                                  {status === "confirmed" && <Check size={13} />}
                                  {status === "proof_pending" && <LoaderCircle className="spin" size={13} />}
                                  {(status === "hash_saved" || status === "uploaded_not_proven") && <Clock3 size={13} />}
                                  {STATUS_LABELS[status]}
                                </span>
                                <ChevronRight size={17} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <WalletProofPanel
                      caseId={caseDetail.id}
                      file={selectedFile}
                      onConfirmed={handleProofConfirmed}
                    />

                    <section className="timeline">
                      <div className="panel-heading">
                        <div><span className="eyebrow">History</span><h2>Recent activity</h2></div>
                      </div>
                      {timeline.length === 0 ? (
                        <div className="panel-empty"><p>No activity yet.</p></div>
                      ) : (
                        <div className="timeline-list">
                          {timeline.map((event, index) => (
                            <div className="timeline-item" key={`${event.event_type}-${index}`}>
                              <span className="timeline-marker" />
                              <div>
                                <strong>{event.description}</strong>
                                <small>{formatDate(event.created_at)}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── SHARE REPORT (read-only, no auth) ────────────────── */}
          {view === "share-report" && (
            <>
              <div className="breadcrumbs">Shared report <ChevronRight size={14} /> <span>Read only</span></div>

              {shareLoading && (
                <div className="state-box"><LoaderCircle className="spin" size={32} /><p>Loading report…</p></div>
              )}
              {shareError && (
                <div className="state-box error"><AlertCircle size={28} /><p>{shareError}</p></div>
              )}
              {shareReport && (
                <div className="share-report">
                  <div className="share-report-header">
                    <div className="share-badge"><ShieldCheck size={18} /> ProofVault — Verified Record</div>
                    <h1>{shareReport.case_title}</h1>
                    {shareReport.case_description && <p>{shareReport.case_description}</p>}
                    <small>Case created {formatDate(shareReport.created_at)}</small>
                  </div>

                  {shareReport.files.map((file, i) => (
                    <div className="share-file-card" key={i}>
                      <div className="share-file-name">
                        <FileText size={18} />
                        <strong>{file.file_name}</strong>
                        <span className={`status ${file.proof_status === "confirmed" ? "status-confirmed" : "status-hash_saved"}`}>
                          {file.proof_status === "confirmed" ? <><Check size={12} /> Confirmed</> : <><Clock3 size={12} /> Unproven</>}
                        </span>
                      </div>
                      <dl className="share-details">
                        <div><dt>File hash (SHA-256)</dt><dd className="mono">{file.file_hash ?? "—"}</dd></div>
                        <div><dt>Proof status</dt><dd>{file.proof_status ?? "No proof"}</dd></div>
                        {file.tx_hash && <div><dt>Transaction hash</dt><dd className="mono">{file.tx_hash}</dd></div>}
                        {file.block_number && <div><dt>Block number</dt><dd>{file.block_number.toLocaleString()}</dd></div>}
                        {file.chain_id && <div><dt>Network</dt><dd>Polygon Amoy (chain {file.chain_id})</dd></div>}
                      </dl>
                      {file.tx_hash && (
                        <a
                          className="tx-link"
                          href={`${import.meta.env.VITE_EXPLORER_URL ?? "https://amoy.polygonscan.com"}/tx/${file.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={13} /> View on blockchain explorer
                        </a>
                      )}
                    </div>
                  ))}

                  <div className="share-footer">
                    <Copy size={13} /> Share token: <span className="mono">{shareToken}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── VERIFY ────────────────────────────────────────────── */}
          {view === "verify" && (
            <>
              <div className="breadcrumbs">
                Verify <ChevronRight size={14} /> <span>File check</span>
              </div>
              <VerifyPanel
                files={caseDetail?.files ?? []}
                onVerified={addTimeline}
              />
            </>
          )}

        </div>
      </main>
    </div>
  );
}
