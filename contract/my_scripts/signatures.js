const _ = require('lodash');
const { ethers } = require('hardhat');

const hash = (tokenId, n) => {
  return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [tokenId, n])));
}


const sign = async (signer, tokenId, n) => {
  return await signer.signMessage(hash(tokenId, n));
}

const main = async () => {
  if (process.argv.length != 5) {
    console.log("Usage: node signatures.js privKey tokenId numOfSlots")
    return;
  }

  let [privKey, tokenId, numOfSlots] = process.argv.slice(2);
  [numOfSlots, tokenId] = [parseInt(numOfSlots), parseInt(tokenId)];

  const wallet = new ethers.Wallet(privKey);

  const rows = await Promise.all(_.range(numOfSlots).map(async (i) => {
    const signature = await sign(wallet, tokenId, i);
    return [tokenId, i, signature];
  }));

  let csvContent = rows.map(e => e.join(",")).join("\n");
  console.log('Event Id,Claimable fraction #,Signature');
  console.log(csvContent);
}

main();
