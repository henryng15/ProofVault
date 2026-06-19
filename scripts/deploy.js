const { ethers } = require("hardhat");

async function main() {
  const ProofVault = await ethers.getContractFactory("ProofVault");
  const proofVault = await ProofVault.deploy();
  await proofVault.waitForDeployment();

  console.log("ProofVault deployed to:", await proofVault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
