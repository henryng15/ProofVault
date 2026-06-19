const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofVault", function () {
  async function deployProofVault() {
    const [owner, otherAccount] = await ethers.getSigners();
    const ProofVault = await ethers.getContractFactory("ProofVault");
    const proofVault = await ProofVault.deploy();

    return { proofVault, owner, otherAccount };
  }

  it("creates a proof and emits ProofCreated", async function () {
    const { proofVault, owner } = await deployProofVault();
    const caseId = ethers.id("case-001");
    const fileHash = ethers.id("file-content");
    const metadataHash = ethers.id("metadata");

    const tx = await proofVault.createProof(caseId, fileHash, metadataHash);
    const receipt = await tx.wait();
    const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
    const proofId = ethers.solidityPackedKeccak256(
      ["address", "bytes32", "bytes32"],
      [owner.address, caseId, fileHash]
    );

    await expect(tx)
      .to.emit(proofVault, "ProofCreated")
      .withArgs(owner.address, caseId, fileHash, timestamp);

    const proof = await proofVault.proofs(proofId);
    expect(proof.owner).to.equal(owner.address);
    expect(proof.caseId).to.equal(caseId);
    expect(proof.fileHash).to.equal(fileHash);
    expect(proof.metadataHash).to.equal(metadataHash);
    expect(proof.timestamp).to.equal(timestamp);
    expect(proof.status).to.equal(0);
  });

  it("prevents duplicate proofs from the same owner, caseId, and fileHash", async function () {
    const { proofVault } = await deployProofVault();
    const caseId = ethers.id("case-001");
    const fileHash = ethers.id("file-content");
    const metadataHash = ethers.id("metadata");

    await proofVault.createProof(caseId, fileHash, metadataHash);

    await expect(
      proofVault.createProof(caseId, fileHash, ethers.id("new-metadata"))
    ).to.be.revertedWith("Proof already exists");
  });
});
