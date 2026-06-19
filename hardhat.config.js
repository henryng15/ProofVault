require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY;
const accounts =
  privateKey && /^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)
    ? [privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`]
    : [];

module.exports = {
  solidity: "0.8.28",
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://polygon-amoy.drpc.org",
      chainId: 80002,
      accounts,
    },
  },
};
