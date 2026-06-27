require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

module.exports = {
  solidity: "0.8.28",
  networks: {
    // Only configure amoy when env vars are present (local dev/deployment).
    // CI runs tests on the built-in hardhat network, so this is not needed there.
    ...(PRIVATE_KEY && ALCHEMY_API_KEY
      ? {
          amoy: {
            url: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            accounts: [PRIVATE_KEY],
            chainId: 80002,
          },
        }
      : {}),
  },
};
