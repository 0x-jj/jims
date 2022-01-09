const assert = require('assert');
const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");


const SIGNER = 0;
const FEE = 5;
const PREMINT_SUPPLY = 4;
const TOTAL_SUPPLY = 16;


describe("Jims", () => {
  let factory, accounts, signers;
  const deploy = async () => {
    const jims = await factory.deploy(accounts[FEE], PREMINT_SUPPLY, TOTAL_SUPPLY);
    assert.notEqual(jims, undefined, "Jims contract instance is undefined.");
    await jims.connect(signers[0]).allowMinting();
    return jims;
  };

  before(async () => {
    factory = await ethers.getContractFactory('Jims');
    signers = await ethers.getSigners();
    accounts = signers.map(s => s.address);
  });

  it("Cannot mint before minting is allowed", async () => {
    const jims = await factory.deploy(accounts[FEE], PREMINT_SUPPLY, TOTAL_SUPPLY);
    await assert.rejects(jims.connect(signers[1]).mint({value: 1}), /Mint is not allowed/);
  });

  it("Total supply returns correct value", async () => {
    const jims = await deploy();
    expect(await jims._totalSupply()).to.equal(TOTAL_SUPPLY);
  });

  it("Total minted returns 0 initially", async () => {
    const jims = await deploy();
    expect(await jims._totalMinted()).to.equal(0);
  });

  it("Mint fails if paying less than the mint price", async () => {
    const jims = await deploy();
    const mintPrice = await jims._priceToMint();

    await assert.rejects(jims.connect(signers[1]).mint({value: 1}), /Must pay at least/);
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice.sub(1)}), /Must pay at least/);
    expect(await jims._totalMinted()).to.equal(0);
  });

  it("Mint works if paying more than the mint price", async () => {
    const jims = await deploy();
    const feeWalletBalance = await ethers.provider.getBalance(accounts[FEE]);
    const mintPrice = await jims._priceToMint();
    const prevTotalMinted = await jims._totalMinted();

    await jims.connect(signers[1]).mint({value: mintPrice});

    const totalMinted = await jims._totalMinted();

    expect(await jims.ownerOf(totalMinted)).to.equal(signers[1].address);
    expect(await jims.tokenURI(totalMinted)).to.equal(`ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/${totalMinted}`)
    expect(totalMinted).to.equal(prevTotalMinted + 1);
    expect(await jims._priceToMint() > mintPrice);
    expect(await ethers.provider.getBalance(accounts[FEE])).to.equal(feeWalletBalance.add(mintPrice));
  });

  it("Mint stops after reaching total supply", async () => {
    const jims = await deploy();
    const totalSupply = await jims._totalSupply();
    for (let i = await jims._totalMinted(); i < totalSupply; i++) {
      await jims.connect(signers[1]).mint({value: await jims._priceToMint()});
    }
    expect(await jims._totalMinted()).to.equal(totalSupply);

    await assert.rejects(jims.connect(signers[1]).mint({value: await jims._priceToMint()}), /All JIMs were already minted/);
  });
});
