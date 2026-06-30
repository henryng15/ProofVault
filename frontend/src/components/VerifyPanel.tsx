import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  LoaderCircle,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";

import { api, type EvidenceFile } from "../api/client";
import { hashFile } from "../files/hashFile";
import "./verify-panel.css";

type VerifyState = "idle" | "hashing" | "checking" | "match" | "mismatch" | "not-enough-data";

type Props = {
  files: EvidenceFile[];
  onVerified: (description: string) => void;
};

export default function VerifyPanel({ files, onVerified }: Props) {
  const availableFiles = useMemo(() => files.filter((file) => file.file_hash), [files]);
  const [fileId, setFileId] = useState(availableFiles[0]?.id || "");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedHash, setUploadedHash] = useState("");
  const [state, setState] = useState<VerifyState>("idle");
  const [detail, setDetail] = useState("Choose the saved evidence, then select the file you want to check.");

  async function chooseFile(file: File | null) {
    setUploadedFile(file);
    setUploadedHash("");
    setState("idle");
    if (!file) return;

    setState("hashing");
    setDetail("Reading the file and creating a SHA-256 hash...");
    try {
      const hash = await hashFile(file);
      setUploadedHash(hash);
      setState("idle");
      setDetail("Hash ready. The file itself stays on your device.");
    } catch {
      setState("not-enough-data");
      setDetail("This browser could not read the selected file.");
    }
  }

  async function verify() {
    if (!fileId || !uploadedFile || !uploadedHash) {
      setState("not-enough-data");
      setDetail("Select both the original evidence record and a file to verify.");
      return;
    }

    setState("checking");
    setDetail("Checking this hash against the saved blockchain proof...");
    try {
      const result = await api.verifyFile(fileId, uploadedHash);
      setState(result.result);
      const description =
        result.result === "match"
          ? `${uploadedFile.name} matched the saved proof`
          : `${uploadedFile.name} did not match the saved proof`;
      setDetail(
        result.result === "match"
          ? "The uploaded file matches the hash recorded for this evidence."
          : "The uploaded file is different from the version used to create the proof.",
      );
      onVerified(description);
    } catch (error) {
      setState("not-enough-data");
      setDetail(error instanceof Error ? error.message : "Verification could not be completed.");
    }
  }

  const result = {
    match: {
      icon: <CheckCircle2 size={25} />,
      title: "Verified match",
      className: "match",
    },
    mismatch: {
      icon: <XCircle size={25} />,
      title: "Mismatch",
      className: "mismatch",
    },
    "not-enough-data": {
      icon: <AlertTriangle size={25} />,
      title: "Not enough data",
      className: "unknown",
    },
  }[state as "match" | "mismatch" | "not-enough-data"];

  return (
    <div className="verify-layout">
      <section className="verify-intro">
        <span className="eyebrow">Independent check</span>
        <h1>Verify an evidence file</h1>
        <p>
          Re-upload a file to compare its fingerprint with the proof already saved for this case.
          The file is hashed in your browser before verification.
        </p>
      </section>

      <section className="panel verify-form">
        <div className="verify-step">
          <span className="step-number">1</span>
          <div className="step-copy">
            <label htmlFor="original-file">Saved evidence</label>
            <span>Select the record you want to check against.</span>
          </div>
          <select id="original-file" value={fileId} onChange={(event) => setFileId(event.target.value)}>
            {availableFiles.length ? (
              availableFiles.map((file) => (
                <option key={file.id} value={file.id}>{file.file_name}</option>
              ))
            ) : (
              <option value="">No evidence with a saved hash</option>
            )}
          </select>
        </div>

        <div className="verify-step">
          <span className="step-number">2</span>
          <div className="step-copy">
            <label htmlFor="verify-upload">File to verify</label>
            <span>{uploadedFile ? uploadedFile.name : "Choose a file from your computer."}</span>
          </div>
          <label className="button upload-choice" htmlFor="verify-upload">
            <Upload size={16} /> Choose file
          </label>
          <input
            id="verify-upload"
            className="hidden-input"
            type="file"
            onChange={(event) => chooseFile(event.target.files?.[0] || null)}
          />
        </div>

        {uploadedHash && (
          <div className="hash-preview">
            <span>SHA-256</span>
            <code>{uploadedHash}</code>
          </div>
        )}

        <button
          className="button primary verify-button"
          disabled={state === "hashing" || state === "checking"}
          onClick={verify}
        >
          {state === "hashing" || state === "checking" ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <RefreshCw size={17} />
          )}
          {state === "checking" ? "Checking proof..." : state === "hashing" ? "Hashing file..." : "Verify file"}
        </button>
      </section>

      <section className={`verify-result ${result?.className || "empty"}`}>
        <div className="result-icon">{result?.icon || <FileQuestion size={25} />}</div>
        <div>
          <span className="eyebrow">Result</span>
          <h2>{result?.title || "Waiting for a file"}</h2>
          <p>{detail}</p>
        </div>
      </section>
    </div>
  );
}
