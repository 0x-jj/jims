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
  const signers = await ethers.getSigners();
  const accounts = signers.map(s => s.address);
  const deployer = signers[0];
  console.log("Deploying the contracts with the account:", await deployer.getAddress());

  const etFactory = await ethers.getContractFactory('ClaimableTokens');
  const et = await etFactory.deploy("Event Tokens", "EVT");

  console.log("Event Tokens address:", et.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
