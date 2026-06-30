export const proofVaultAbi = [
  {
    type: "function",
    name: "createProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "caseId", type: "bytes32" },
      { name: "fileHash", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
