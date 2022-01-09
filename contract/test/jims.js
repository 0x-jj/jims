const assert = require('assert');
const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");


const SIGNER = 0;
const FEE = 5;
const PREMINT_SUPPLY = 2;
const TOTAL_SUPPLY = 16;


describe("Jims", () => {
  let factory, accounts, signers;
  const deploy = async () => {
    const jims = await factory.deploy(accounts[FEE], PREMINT_SUPPLY, TOTAL_SUPPLY);
    assert.notEqual(jims, undefined, "Jims contract instance is undefined.");
    await jims.connect(signers[0]).allowMinting();
    return jims;
  };

  const deployAutoglyphs = async () => {
    const fact = await ethers.getContractFactory('Autoglyphs');
    return await fact.deploy();
  }

  before(async () => {
    factory = await ethers.getContractFactory('Jims');
    signers = await ethers.getSigners();
    accounts = signers.map(s => s.address);
  });

  it("Cannot mint before minting is allowed", async () => {
    const jims = await factory.deploy(accounts[FEE], PREMINT_SUPPLY, TOTAL_SUPPLY);
    await assert.rejects(jims.connect(signers[1]).mint({value: 1}), /Mint is not allowed/);
  });

  it("Max supply returns correct value", async () => {
    const jims = await deploy();
    expect(await jims.maxSupply()).to.equal(TOTAL_SUPPLY);
  });

  it("Total minted returns 0 initially", async () => {
    const jims = await deploy();
    expect(await jims.totalMinted()).to.equal(0);
  });

  it("Mint fails if paying less than the mint price", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();

    await assert.rejects(jims.connect(signers[1]).mint({value: 1}), /Must pay at least/);
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice.sub(1)}), /Must pay at least/);
    expect(await jims.totalMinted()).to.equal(0);
  });

  it("Premint fails if user not whitelisted", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);
  });

  it("Premint works if paying more than the mint price and returns the correct tokenURI", async () => {
    const jims = await deploy();
    const autoglyphs = await deployAutoglyphs();
    await jims.connect(signers[0]).whitelistERC721(autoglyphs.address, 1);

    await autoglyphs.createNft(accounts[1]);

    const feeWalletBalance = await ethers.provider.getBalance(accounts[FEE]);
    const mintPrice = await jims.priceToMint();
    const prevTotalMinted = await jims.totalMinted();

    await jims.connect(signers[1]).mint({value: mintPrice});

    const totalMinted = await jims.totalMinted();

    expect(await jims.ownerOf(totalMinted)).to.equal(signers[1].address);
    expect(await jims.tokenURI(totalMinted)).to.equal(`ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/${totalMinted}`)
    expect(totalMinted).to.equal(prevTotalMinted + 1);
    expect(await jims.priceToMint() > mintPrice);
    expect(await ethers.provider.getBalance(accounts[FEE])).to.equal(feeWalletBalance.add(mintPrice));

    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);
  });

  it("Mint stops after reaching total supply", async () => {
    const jims = await deploy();
    const autoglyphs = await deployAutoglyphs();
    await jims.connect(signers[0]).whitelistERC721(autoglyphs.address, 1);

    const preMintSupply = await jims.preMintSupply();
    const price = await jims.priceToMint();
    expect(preMintSupply).to.equal(2);

    await autoglyphs.createNft(accounts[1]);
    await autoglyphs.createNft(accounts[2]);

    expect(await jims.publicSaleStarted()).to.equal(false);

    // Premint the entire pre-mint supply
    await jims.connect(signers[1]).mint({value: price});
    await jims.connect(signers[2]).mint({value: price});

    expect(await jims.publicSaleStarted()).to.equal(true);

    // Mint the rest of the supply
    const maxSupply = (await jims.maxSupply()).toNumber();
    for (let i = (await jims.totalMinted()).toNumber(); i < maxSupply; i++) {
      await jims.connect(signers[3]).mint({value: await jims.priceToMint()});
    }
    expect(await jims.totalMinted()).to.equal(maxSupply);

    await assert.rejects(jims.connect(signers[1]).mint({value: await jims.priceToMint()}), /All JIMs were already minted/);
  });
});
