// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ProofVault {
    enum ProofStatus {
        Active
    }

    struct Proof {
        address owner;
        bytes32 caseId;
        bytes32 fileHash;
        bytes32 metadataHash;
        uint256 timestamp;
        ProofStatus status;
    }

    event ProofCreated(
        address indexed owner,
        bytes32 indexed caseId,
        bytes32 indexed fileHash,
        uint256 timestamp
    );

    mapping(bytes32 => Proof) public proofs;

    function createProof(bytes32 caseId, bytes32 fileHash, bytes32 metadataHash) external {
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, caseId, fileHash));

        require(proofs[proofId].owner == address(0), "Proof already exists");

        proofs[proofId] = Proof({
            owner: msg.sender,
            caseId: caseId,
            fileHash: fileHash,
            metadataHash: metadataHash,
            timestamp: block.timestamp,
            status: ProofStatus.Active
        });

        emit ProofCreated(msg.sender, caseId, fileHash, block.timestamp);
    }
}
