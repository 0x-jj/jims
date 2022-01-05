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
});
