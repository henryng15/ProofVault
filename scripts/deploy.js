// This script deploys ProofVault.sol to Polygon Amoy testnet.
// Written for ethers v6 (the version bundled with hardhat-toolbox v6).

async function main() {
  console.log("Starting ProofVault deployment to Polygon Amoy...\n");

  // Get the contract factory (the blueprint for deploying ProofVault).
  // Hardhat compiles ProofVault.sol automatically and returns a factory.
  const ProofVault = await ethers.getContractFactory("ProofVault");
  console.log("Contract factory loaded: ProofVault");

  // Send the deployment transaction to the blockchain.
  console.log("Sending deployment transaction...");
  const proofVault = await ProofVault.deploy();

  // Wait until the deployment transaction is mined and confirmed.
  console.log("Waiting for deployment to complete...");
  await proofVault.waitForDeployment();

  // Read the two key outputs of the deployment.
  const contractAddress = await proofVault.getAddress();
  const deploymentTxHash = proofVault.deploymentTransaction().hash;

  console.log("\nDeployment successful!\n");
  console.log("Contract Address:", contractAddress);
  console.log("Deployment Transaction Hash:", deploymentTxHash);
  console.log("Network: Polygon Amoy (Chain ID: 80002)");

  const explorerUrl = `https://amoy.polygonscan.com/tx/${deploymentTxHash}`;
  console.log("\nView on Explorer:", explorerUrl);

  // Save deployment details (address, ABI, tx hash) so the backend and
  // frontend can later find and call this contract.
  const fs = require("fs");
  const path = require("path");

  const deploymentsDir = path.join(__dirname, "../contracts/deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: "amoy",
    chainId: 80002,
    contractAddress: contractAddress,
    deploymentTxHash: deploymentTxHash,
    deploymentTimestamp: new Date().toISOString(),
    abi: JSON.parse(ProofVault.interface.formatJson()),
  };

  const filePath = path.join(deploymentsDir, "amoy.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${filePath}`);
}

// Run main() and exit cleanly, or report the error and exit with failure.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
