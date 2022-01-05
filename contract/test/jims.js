const assert = require('assert');
const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");


const SIGNER = 0;
const FEE = 5;

describe("Jims", () => {
  let jims, accounts, signers;

  before(async () => {
    // Deploy contracts
    const factory = await ethers.getContractFactory('Jims');

    signers = await ethers.getSigners();
    accounts = signers.map(s => s.address);

    jims = await factory.deploy(accounts[FEE]);
    assert.notEqual(jims, undefined, "Jims contract instance is undefined.");
  });

  it("Total supply returns correct value", async () => {
    expect(await jims._totalSupply()).to.equal(2048);
  });

  it("Total minted returns 0 initially", async () => {
    expect(await jims._totalMinted()).to.equal(0);
  });

  it("Mint fails if paying less than the mint price", async () => {
    await assert.rejects(jims.connect(signers[1]).mint({value: 1}), /Must pay at least/);
    expect(await jims._totalMinted()).to.equal(0);
  });

  it("Mint works if paying more than the mint price", async () => {
    const mintPrice = await jims.priceToMint();
    const totalMinted = await jims._totalMinted();

    await jims.connect(signers[1]).mint({value: mintPrice});

    expect(await jims.ownerOf(totalMinted)).to.equal(signers[1].address);
    expect(await jims._totalMinted()).to.equal(totalMinted + 1);
    expect(await jims.priceToMint() > mintPrice);
  });
});
