// This script calls createProof() on the already-deployed ProofVault contract.
// It creates 3 sample proofs with fake hashes to test that the contract works.
// Each call generates a transaction hash you can verify on the explorer.

const fs = require("fs");
const path = require("path");

async function main() {
  // Load the contract address and ABI from the deployment file.
  const deploymentPath = path.join(__dirname, "../contracts/deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const { contractAddress, abi } = deployment;

  console.log("Loading ProofVault contract...");
  console.log("Contract address:", contractAddress);
  console.log("Network: Polygon Amoy\n");

  // Get the signer (your account, derived from PRIVATE_KEY in .env).
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  // Create a contract instance connected to your signer.
  // This allows you to call functions AND sign transactions.
  const proofVault = new ethers.Contract(contractAddress, abi, signer);

  // Create 3 sample proofs with different fake hashes.
  const sampleProofs = [
    {
      caseId: ethers.id("apartment-move-in-2024"),
      fileHash: ethers.id("photo-1.jpg"),
      metadataHash: ethers.id("metadata-1"),
      description: "Apartment move-in photos",
    },
    {
      caseId: ethers.id("subletting-agreement-2024"),
      fileHash: ethers.id("agreement.pdf"),
      metadataHash: ethers.id("metadata-2"),
      description: "Subletting agreement document",
    },
    {
      caseId: ethers.id("professor-grades-2024"),
      fileHash: ethers.id("grades.csv"),
      metadataHash: ethers.id("metadata-3"),
      description: "Course grades file",
    },
  ];

  console.log("\nCreating 3 sample proofs...\n");

  for (let i = 0; i < sampleProofs.length; i++) {
    const proof = sampleProofs[i];
    console.log(`Proof ${i + 1}: ${proof.description}`);
    console.log("  caseId:", proof.caseId);
    console.log("  fileHash:", proof.fileHash);
    console.log("  metadataHash:", proof.metadataHash);

    try {
      // Call createProof on the contract.
      // This sends a signed transaction to the blockchain.
      const tx = await proofVault.createProof(
        proof.caseId,
        proof.fileHash,
        proof.metadataHash
      );

      console.log("  Transaction sent:", tx.hash);
      console.log("  Waiting for confirmation...");

      // Wait for the transaction to be mined and confirmed.
      const receipt = await tx.wait();

      console.log("  Confirmed in block:", receipt.blockNumber);
      console.log("  Gas used:", receipt.gasUsed.toString());
      console.log("  Status: Success\n");
    } catch (error) {
      console.error("  Error:", error.message, "\n");
    }
  }

  console.log("All proofs created. Check the explorer to verify:");
  console.log("https://amoy.polygonscan.com/address/" + contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
