const assert = require("assert");
const { ethers } = require("hardhat");

const FEE = 5;
const PREMINT_SUPPLY = 512;
const TOTAL_SUPPLY = 2048;
const MAX_MINT_PER_TX = 20;

// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.
async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is avaialble in the global scope
  const factory = await ethers.getContractFactory("Jims");
  const signers = await ethers.getSigners();
  const accounts = signers.map((s) => s.address);
  const deployer = signers[0];
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );
  const jims = await factory.deploy(
    accounts[FEE],
    PREMINT_SUPPLY,
    TOTAL_SUPPLY,
    MAX_MINT_PER_TX
  );
  assert.notEqual(jims, undefined, "Jims contract instance is undefined.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
