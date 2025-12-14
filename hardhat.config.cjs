require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const path = require("path");

let privateKey = process.env.PRIVATE_KEY;

const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  let envConfig = fs.readFileSync(envPath, "utf8");
  // Strip BOM
  if (envConfig.charCodeAt(0) === 0xFEFF) {
    envConfig = envConfig.slice(1);
  }

  envConfig.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      // Remove non-alphanumeric characters from key (except underscore)
      const key = parts[0].trim().replace(/[^\w]/g, "");
      const value = parts.slice(1).join("=").trim();
      if (key === "PRIVATE_KEY" && value) {
        console.log(`Found Private Key (length: ${value.length})`);
        privateKey = value;
      }
    }
  });
}

console.log("Private Key available:", !!privateKey);

const isMnemonic = privateKey && privateKey.includes(" ");
const accountsConfig = isMnemonic ? { mnemonic: privateKey } : (privateKey ? [privateKey] : []);

if (isMnemonic) {
  console.log("Detected Mnemonic (Seed Phrase).");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    mantleTestnet: {
      url: "https://rpc.sepolia.mantle.xyz",
      accounts: accountsConfig,
      chainId: 5003,
    },
    mantle: {
      url: "https://rpc.mantle.xyz",
      accounts: accountsConfig,
      chainId: 5000,
    },
  },
};
