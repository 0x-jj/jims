const assert = require('assert');
const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");


const hash = (tokenId, n) => {
  return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [tokenId, n])));
}

const SIGNER = 0;
const eventTokenId = 1;
const slot = 2;
const numSlots = 10;
const fractionsPerSlot = 2;
const URI = "https://foo.bar";
const NAME = "EventTokens";
const SYMBOL = "EVT";

describe("ClaimableTokens", () => {
  let et, accounts, signers;

  before(async () => {
    // Deploy contracts
    const etFactory = await ethers.getContractFactory('ClaimableTokens');

    signers = await ethers.getSigners();
    accounts = signers.map(s => s.address);

    et = await etFactory.deploy(NAME, SYMBOL);
    assert.notEqual(et, undefined, "ClaimableTokens contract instance is undefined.");

    expect(await et.totalSupply(eventTokenId)).to.equal(0);
    await et.createToken(eventTokenId, numSlots, fractionsPerSlot, accounts[SIGNER], URI);

    expect(await et.totalSupply(eventTokenId)).to.equal(numSlots * fractionsPerSlot);
  });

  it("Hash works", async () => {
    const [tokenId, n] = [eventTokenId, slot];
    expect(await et.hash(tokenId, n)).to.equal(ethers.utils.hashMessage(hash(tokenId, n)));
  });

  it("Cannot claim token with wrong signature", async () => {
    const [tokenId, n] = [eventTokenId, slot];
    const badSignature = signers[2].signMessage(hash(tokenId, n));
    await expect(et.claimTokenFractions(tokenId, n, badSignature)).to.be.revertedWith('Wrong signature');
  });

  it("Cannot claim token that was not created", async () => {
    const [tokenId, n] = [eventTokenId + 1, slot];
    const correctSignature = signers[SIGNER].signMessage(hash(tokenId, n));
    await expect(et.claimTokenFractions(tokenId, n, correctSignature)).to.be.revertedWith('Wrong signature');
  });

  it("Claims token with correct signature", async () => {
    const [tokenId, n] = [eventTokenId, slot];
    const correctSignature = signers[SIGNER].signMessage(hash(tokenId, n));

    expect(await et.balanceOf(accounts[3], tokenId)).to.equal(0);

    await et.connect(signers[3]).claimTokenFractions(tokenId, n, correctSignature);

    expect(await et.balanceOf(accounts[3], tokenId)).to.equal(fractionsPerSlot);

    await expect(et.claimTokenFractions(tokenId, n, correctSignature)).to.be.revertedWith('No more fractions');

    expect(await et.totalClaimed(tokenId)).to.equal(fractionsPerSlot);
  });

  it("Claims another token with correct signature", async () => {
    const [tokenId, n] = [eventTokenId, slot + 1];
    const correctSignature = signers[SIGNER].signMessage(hash(tokenId, n));

    expect(await et.balanceOf(accounts[4], tokenId)).to.equal(0);

    await et.connect(signers[4]).claimTokenFractions(tokenId, n, correctSignature);

    expect(await et.balanceOf(accounts[4], tokenId)).to.equal(fractionsPerSlot);

    await expect(et.claimTokenFractions(tokenId, n, correctSignature)).to.be.revertedWith('No more fractions');

    expect(await et.totalClaimed(tokenId)).to.equal(fractionsPerSlot * 2);
  });

  it("Total supply works", async () => {
    expect(await et.totalSupply(eventTokenId)).to.equal(numSlots * fractionsPerSlot);
  });

  it("Stores token URIs", async () => {
    expect(await et.uri(eventTokenId)).to.equal(URI)
  });

  it("Stores name and symbol", async () => {
    expect(await et.name()).to.equal(NAME);
    expect(await et.symbol()).to.equal(SYMBOL);
  });

  it("Records registerd tokens", async () => {
    expect(await et.registeredTokens()).to.deep.equal([ethers.BigNumber.from(eventTokenId)]);

    await et.createToken(eventTokenId-1, numSlots, fractionsPerSlot, accounts[SIGNER], URI);
    expect(await et.registeredTokens()).to.deep.equal([ethers.BigNumber.from(eventTokenId), ethers.BigNumber.from(eventTokenId - 1)]);
  });
});
