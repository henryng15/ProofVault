const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofVault", function () {
  let proofVault;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const ProofVault = await ethers.getContractFactory("ProofVault");
    proofVault = await ProofVault.deploy();
    await proofVault.waitForDeployment();
  });

  describe("createProof", function () {
    it("Should create a proof with correct data", async function () {
      const caseId = ethers.id("case-1");
      const fileHash = ethers.id("file-1");
      const metadataHash = ethers.id("metadata-1");

      const tx = await proofVault.createProof(caseId, fileHash, metadataHash);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      const proofId = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "bytes32"],
        [owner.address, caseId, fileHash]
      );

      const proof = await proofVault.proofs(proofId);

      expect(proof.owner).to.equal(owner.address);
      expect(proof.caseId).to.equal(caseId);
      expect(proof.fileHash).to.equal(fileHash);
      expect(proof.metadataHash).to.equal(metadataHash);
      expect(proof.timestamp).to.equal(blockTimestamp);
      expect(proof.status).to.equal(0); // Active status
    });

    it("Should emit ProofCreated event with correct parameters", async function () {
      const caseId = ethers.id("case-2");
      const fileHash = ethers.id("file-2");
      const metadataHash = ethers.id("metadata-2");

      const tx = proofVault.createProof(caseId, fileHash, metadataHash);
      const receipt = await (await tx).wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(proofVault, "ProofCreated")
        .withArgs(owner.address, caseId, fileHash, blockTimestamp);
    });

    it("Should reject duplicate proofs for same owner, caseId, and fileHash", async function () {
      const caseId = ethers.id("case-3");
      const fileHash = ethers.id("file-3");
      const metadataHash = ethers.id("metadata-3");

      await proofVault.createProof(caseId, fileHash, metadataHash);

      await expect(
        proofVault.createProof(caseId, fileHash, ethers.id("different-metadata"))
      ).to.be.revertedWith("Proof already exists");
    });

    it("Should allow same file hash for different cases", async function () {
      const fileHash = ethers.id("same-file");
      const metadataHash1 = ethers.id("metadata-4");
      const metadataHash2 = ethers.id("metadata-5");

      const caseId1 = ethers.id("case-4");
      const caseId2 = ethers.id("case-5");

      await proofVault.createProof(caseId1, fileHash, metadataHash1);
      await proofVault.createProof(caseId2, fileHash, metadataHash2);

      expect(true).to.be.true;
    });

    it("Should allow different users to create proofs for same case and file", async function () {
      const caseId = ethers.id("shared-case");
      const fileHash = ethers.id("shared-file");
      const metadataHash = ethers.id("metadata-6");

      await proofVault.connect(owner).createProof(caseId, fileHash, metadataHash);
      await proofVault.connect(user1).createProof(caseId, fileHash, metadataHash);

      expect(true).to.be.true;
    });

    it("Should store proof with Active status (0)", async function () {
      const caseId = ethers.id("case-7");
      const fileHash = ethers.id("file-7");
      const metadataHash = ethers.id("metadata-7");

      await proofVault.createProof(caseId, fileHash, metadataHash);

      const proofId = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "bytes32"],
        [owner.address, caseId, fileHash]
      );

      const proof = await proofVault.proofs(proofId);
      expect(proof.status).to.equal(0);
    });
  });

  describe("proofs mapping", function () {
    it("Should retrieve proof data correctly after creation", async function () {
      const caseId = ethers.id("case-8");
      const fileHash = ethers.id("file-8");
      const metadataHash = ethers.id("metadata-8");

      await proofVault.createProof(caseId, fileHash, metadataHash);

      const proofId = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "bytes32"],
        [owner.address, caseId, fileHash]
      );

      const proof = await proofVault.proofs(proofId);

      expect(proof.owner).to.equal(owner.address);
      expect(proof.caseId).to.equal(caseId);
      expect(proof.fileHash).to.equal(fileHash);
      expect(proof.metadataHash).to.equal(metadataHash);
    });

    it("Should return empty proof for non-existent proofId", async function () {
      const nonExistentProofId = ethers.id("non-existent");
      const proof = await proofVault.proofs(nonExistentProofId);

      expect(proof.owner).to.equal(ethers.ZeroAddress);
      expect(proof.caseId).to.equal(ethers.ZeroHash);
    });
  });
});
