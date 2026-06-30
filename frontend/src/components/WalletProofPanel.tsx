import { useEffect, useState } from "react";
import { ExternalLink, LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type EIP1193Provider,
} from "viem";
import { polygonAmoy } from "viem/chains";

import { api, type EvidenceFile } from "../api/client";
import { proofVaultAbi } from "../web3/proofVaultAbi";

type Props = {
  caseId: string;
  file: EvidenceFile | null;
  onConfirmed?: (fileName: string) => void;
};

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);
const explorerUrl = (
  import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com"
).replace(/\/$/, "");

function injectedProvider() {
  return (window as Window & { ethereum?: EIP1193Provider }).ethereum;
}

export default function WalletProofPanel({ caseId, file, onConfirmed }: Props) {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [message, setMessage] = useState("Connect a wallet to create a proof.");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [busyLabel, setBusyLabel] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    setTxHash(null);
    setMessage(account ? "Ready to create a proof for this file." : "Connect a wallet to create a proof.");
  }, [file?.id, account]);

  async function connect() {
    const provider = injectedProvider();
    if (!provider) {
      setMessage("No browser wallet found. Install MetaMask and try again.");
      return;
    }

    try {
      const wallet = createWalletClient({ chain: polygonAmoy, transport: custom(provider) });
      const [address] = await wallet.requestAddresses();
      const currentChain = await wallet.getChainId();
      setAccount(address);
      setWrongNetwork(currentChain !== chainId);
      setMessage(
        currentChain === chainId
          ? "Wallet connected to Polygon Amoy."
          : "Wrong network. Switch your wallet to Polygon Amoy.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet connection was cancelled.");
    }
  }

  async function switchNetwork() {
    const provider = injectedProvider();
    if (!provider) return;

    setBusyLabel("Switching network...");
    try {
      const wallet = createWalletClient({ chain: polygonAmoy, transport: custom(provider) });
      await wallet.switchChain({ id: polygonAmoy.id });
      setWrongNetwork(false);
      setMessage("Wallet connected to Polygon Amoy.");
    } catch {
      setMessage("Open your wallet and switch to Polygon Amoy (chain 80002).");
    } finally {
      setBusyLabel("");
    }
  }

  async function createProof() {
    const provider = injectedProvider();
    if (!provider || !account || !file) return;

    setBusyLabel("Preparing proof...");
    setTxHash(null);
    try {
      const wallet = createWalletClient({
        account,
        chain: polygonAmoy,
        transport: custom(provider),
      });
      if ((await wallet.getChainId()) !== chainId) {
        setWrongNetwork(true);
        setMessage("Wrong network. Switch your wallet to Polygon Amoy.");
        return;
      }

      const proof = await api.requestProof(file.id);
      const address =
        proof.contract_address ||
        (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`);
      if (!address) throw new Error("Contract address is not configured.");
      if (proof.chain_id !== chainId) throw new Error("Backend and wallet chain IDs do not match.");

      setBusyLabel("Confirm in wallet...");
      const hash = await wallet.writeContract({
        address,
        abi: proofVaultAbi,
        functionName: "createProof",
        args: [
          proof.case_id_bytes32,
          proof.file_hash_bytes32,
          proof.metadata_hash_bytes32,
        ],
      });
      setTxHash(hash);
      setMessage("Transaction sent. Waiting for confirmation...");
      setBusyLabel("Waiting for confirmation...");

      const publicClient = createPublicClient({ chain: polygonAmoy, transport: http() });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The blockchain transaction failed.");

      setBusyLabel("Saving confirmation...");
      await api.confirmProof(proof.proof_id, {
        case_id: caseId,
        tx_hash: hash,
        block_number: Number(receipt.blockNumber),
        chain_id: chainId,
      });
      setMessage("Proof confirmed and saved.");
      onConfirmed?.(file.file_name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create proof.");
    } finally {
      setBusyLabel("");
    }
  }

  return (
    <section className="panel proof-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Proof details</span>
          <h2>{file ? file.file_name : "Choose a file"}</h2>
        </div>
        <span className="network-dot"><span /> Polygon Amoy</span>
      </div>

      <dl className="proof-details">
        <div>
          <dt>Wallet</dt>
          <dd>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected"}</dd>
        </div>
        <div>
          <dt>File hash</dt>
          <dd>{file?.file_hash ? `${file.file_hash.slice(0, 12)}...` : "Waiting for hash"}</dd>
        </div>
      </dl>

      <p className="panel-message"><span>Wallet status</span>{message}</p>

      {!account ? (
        <button className="button primary full" onClick={connect}>
          <Wallet size={17} />
          Connect wallet
        </button>
      ) : wrongNetwork ? (
        <button className="button primary full" disabled={Boolean(busyLabel)} onClick={switchNetwork}>
          {busyLabel ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}
          Switch to Polygon Amoy
        </button>
      ) : (
        <button
          className="button primary full"
          disabled={!file?.file_hash || Boolean(busyLabel)}
          onClick={createProof}
        >
          {busyLabel ? <LoaderCircle className="spin" size={17} /> : <Wallet size={17} />}
          {busyLabel || "Create blockchain proof"}
        </button>
      )}

      {txHash && (
        <a
          className="tx-link"
          href={`${explorerUrl}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction <ExternalLink size={14} />
        </a>
      )}
    </section>
  );
}
