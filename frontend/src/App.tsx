import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { api, type CaseDetail, type EvidenceFile, type TimelineEvent } from "./api/client";
import VerifyPanel from "./components/VerifyPanel";
import WalletProofPanel from "./components/WalletProofPanel";
import { hashFile } from "./files/hashFile";

const demoCase: CaseDetail = {
  id: "6034b734-bb29-4e1c-a7a7-9d04af9727b1",
  owner_user_id: "2af7a6e4-e75f-4bd4-bf6f-c82bfc688f38",
  title: "Move-in inspection",
  description: "Files collected during the apartment inspection.",
  created_at: "2026-06-21T16:20:00Z",
  updated_at: "2026-06-26T18:42:00Z",
  files: [
    {
      id: "6ad29517-b88f-48b1-84d6-7af0e1c1ed17",
      case_id: "6034b734-bb29-4e1c-a7a7-9d04af9727b1",
      file_name: "inspection.pdf",
      object_key: "cases/demo/files/report.pdf",
      file_size: 1800000,
      mime_type: "application/pdf",
      file_hash: "a".repeat(64),
      hash_algorithm: "sha256",
    },
  ],
};

const demoTimeline: TimelineEvent[] = [
  {
    event_type: "proof_confirmed",
    description: "Proof confirmed for inspection.pdf",
    created_at: "2026-06-26T18:42:00Z",
  },
];

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

export default function App() {
  const [caseDetail, setCaseDetail] = useState(demoCase);
  const [timeline, setTimeline] = useState(demoTimeline);
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(demoCase.files[0]);
  const [usingDemo, setUsingDemo] = useState(true);
  const [view, setView] = useState<"cases" | "verify">("cases");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listCases()
      .then(async (cases) => {
        if (!cases[0]) return;
        const [detail, events] = await Promise.all([
          api.getCase(cases[0].id),
          api.getTimeline(cases[0].id),
        ]);
        setCaseDetail(detail);
        setTimeline(events.events);
        setSelectedFile(detail.files[0] || null);
        setUsingDemo(false);
      })
      .catch(() => setUsingDemo(true));
  }, []);

  function addTimeline(description: string, eventType = "verification_completed") {
    setTimeline((current) => [
      {
        event_type: eventType,
        description,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  async function uploadEvidence(file: File | null) {
    if (!file) return;

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
      setCaseDetail((current) => ({
        ...current,
        files: [...current.files, savedFile],
        updated_at: new Date().toISOString(),
      }));
      setSelectedFile(savedFile);
      addTimeline(`${file.name} was uploaded and hashed`, "file_added");
      setUploadMessage("Evidence uploaded.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload could not be completed.");
    } finally {
      setUploading(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={20} /></div>
          <span>ProofVault</span>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <button><LayoutDashboard size={18} /> Overview</button>
          <button className={view === "cases" ? "active" : ""} onClick={() => setView("cases")}>
            <FolderOpen size={18} /> Cases
          </button>
          <button className={view === "verify" ? "active" : ""} onClick={() => setView("verify")}>
            <FileCheck2 size={18} /> Verify
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button><Settings size={18} /> Settings</button>
          <div className="user">
            <span className="avatar">BN</span>
            <div><strong>Bui Nguyen</strong><small>Developer</small></div>
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
            <button className="button primary"><Plus size={17} /> New case</button>
          </div>
        </header>

        <div className="content">
          {view === "verify" ? (
            <>
              <div className="breadcrumbs">
                Verify <ChevronRight size={14} /> <span>File check</span>
              </div>
              <VerifyPanel files={caseDetail.files} onVerified={addTimeline} />
            </>
          ) : (
            <>
              <div className="breadcrumbs">
                Cases <ChevronRight size={14} /> <span>{caseDetail.title}</span>
              </div>

              <div className="case-header">
                <div>
                  <div className="case-meta">
                    <span className="open-status"><span /> Open case</span>
                    <span>PV-2026-014</span>
                  </div>
                  <div className="title-line">
                    <h1>{caseDetail.title}</h1>
                    {usingDemo && <span className="demo-label">Local preview</span>}
                  </div>
                  <p>{caseDetail.description}</p>
                </div>
                <div className="case-actions">
                  <button className="button" disabled={uploading} onClick={() => uploadInput.current?.click()}>
                    {uploading ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}
                    {uploading ? "Uploading..." : "Add evidence"}
                  </button>
                  <input
                    ref={uploadInput}
                    className="hidden-input"
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) => uploadEvidence(event.target.files?.[0] || null)}
                  />
                  <button className="icon-button" title="Case actions"><MoreHorizontal size={18} /></button>
                </div>
              </div>

              {uploadMessage && (
                <div className={`upload-notice ${uploading ? "working" : ""}`}>
                  {uploading ? <LoaderCircle className="spin" size={15} /> : <AlertCircle size={15} />}
                  {uploadMessage}
                </div>
              )}

              <div className="summary-strip">
                <div><span>Total evidence</span><strong>{caseDetail.files.length} files</strong></div>
                <div><span>On-chain proofs</span><strong>1 confirmed</strong></div>
                <div><span>Last updated</span><strong>{formatDate(caseDetail.updated_at)}</strong></div>
              </div>

              <div className="workspace">
                <section className="panel files-panel">
                  <div className="panel-heading">
                    <div><span className="eyebrow">Evidence</span><h2>Case files</h2></div>
                    <span className="item-count">{caseDetail.files.length}</span>
                  </div>

                  <div className="file-list">
                    {caseDetail.files.map((file) => (
                      <button
                        key={file.id}
                        className={`file-row ${selectedFile?.id === file.id ? "selected" : ""}`}
                        onClick={() => setSelectedFile(file)}
                      >
                        <span className="file-icon"><FileText size={20} /></span>
                        <span className="file-name">
                          <strong>{file.file_name}</strong>
                          <small>{formatSize(file.file_size)} · {file.mime_type.replace("application/", "").replace("image/", "")}</small>
                        </span>
                        <span className={file.file_hash ? "status protected" : "status pending"}>
                          {file.file_hash ? <Check size={13} /> : <Clock3 size={13} />}
                          {file.file_hash ? "Hashed" : "Pending"}
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                </section>

                <WalletProofPanel
                  caseId={caseDetail.id}
                  file={selectedFile}
                  onConfirmed={(fileName) => addTimeline(`Blockchain proof confirmed for ${fileName}`, "proof_confirmed")}
                />

                <section className="timeline">
                  <div className="panel-heading">
                    <div><span className="eyebrow">History</span><h2>Recent activity</h2></div>
                  </div>
                  <div className="timeline-list">
                    {timeline.map((event, index) => (
                      <div className="timeline-item" key={`${event.event_type}-${index}`}>
                        <span className="timeline-marker" />
                        <div><strong>{event.description}</strong><small>{formatDate(event.created_at)}</small></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
