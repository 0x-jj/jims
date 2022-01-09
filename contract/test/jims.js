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

  const deployPrints = async () => {
    const fact = await ethers.getContractFactory('Fingerprints');
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

  it("Premint works with erc721 if paying more than the mint price and returns the correct tokenURI", async () => {
    const jims = await deploy();
    const autoglyphs = await deployAutoglyphs();
    await jims.connect(signers[0]).whitelistERC721(autoglyphs.address, 1);

    const feeWalletBalance = await ethers.provider.getBalance(accounts[FEE]);
    const mintPrice = await jims.priceToMint();
    const prevTotalMinted = await jims.totalMinted();

    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);

    await autoglyphs.createNft(accounts[1]);

    await jims.connect(signers[1]).mint({value: mintPrice});

    const totalMinted = await jims.totalMinted();

    expect(await jims.ownerOf(totalMinted)).to.equal(signers[1].address);
    expect(await jims.tokenURI(totalMinted)).to.equal(`ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/${totalMinted}`)
    expect(totalMinted).to.equal(prevTotalMinted + 1);
    expect(await jims.priceToMint() > mintPrice);
    expect(await ethers.provider.getBalance(accounts[FEE])).to.equal(feeWalletBalance.add(mintPrice));

    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);
  });

  it("Premint works with erc20", async () => {
    const jims = await deploy();
    const prints = await deployPrints();
    await jims.connect(signers[0]).whitelistERC20(prints.address, 1000);

    const mintPrice = await jims.priceToMint();
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);

    await prints.mint(accounts[1], 500);
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);

    await prints.mint(accounts[1], 500);

    // Premint should work
    expect(await jims.balanceOf(accounts[1])).to.equal(0);
    await jims.connect(signers[1]).mint({value: mintPrice});
    expect(await jims.balanceOf(accounts[1])).to.equal(1);
    expect(await jims.ownerOf(await jims.totalMinted())).to.equal(accounts[1]);
  });

  it("Premint works with whitelisted address", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);

    await jims.connect(signers[0]).whitelistAddress(accounts[1]);

    // Premint works
    expect(await jims.balanceOf(accounts[1])).to.equal(0);
    await jims.connect(signers[1]).mint({value: mintPrice});
    expect(await jims.balanceOf(accounts[1])).to.equal(1);
    expect(await jims.ownerOf(await jims.totalMinted())).to.equal(accounts[1]);
  });

  it("Mint works after 1 hour", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();
    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);

    await ethers.provider.send("evm_increaseTime", [15 * 60])
    await ethers.provider.send("evm_mine")

    await assert.rejects(jims.connect(signers[1]).mint({value: mintPrice}), /Public sale/);

    await ethers.provider.send("evm_increaseTime", [15 * 60])
    await ethers.provider.send("evm_mine")

    // Mint works
    expect(await jims.balanceOf(accounts[1])).to.equal(0);
    await jims.connect(signers[1]).mint({value: mintPrice});
    expect(await jims.balanceOf(accounts[1])).to.equal(1);
    expect(await jims.ownerOf(await jims.totalMinted())).to.equal(accounts[1]);
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

    expect(await jims.totalMinted()).to.equal(0);
    expect(await jims.totalPreMinted()).to.equal(0);
    expect(await jims.publicSaleStarted()).to.equal(false);

    // Premint the entire pre-mint supply
    await jims.connect(signers[1]).mint({value: price});
    await jims.connect(signers[2]).mint({value: price});

    expect(await jims.totalMinted()).to.equal(2);
    expect(await jims.totalPreMinted()).to.equal(2);

    expect(await jims.publicSaleStarted()).to.equal(true);

    // Mint the rest of the supply
    const maxSupply = (await jims.maxSupply()).toNumber();
    for (let i = (await jims.totalMinted()).toNumber(); i < maxSupply; i++) {
      await jims.connect(signers[3]).mint({value: await jims.priceToMint()});
    }
    expect(await jims.totalMinted()).to.equal(maxSupply);
    expect(await jims.totalPreMinted()).to.equal(preMintSupply);

    await assert.rejects(jims.connect(signers[1]).mint({value: await jims.priceToMint()}), /All JIMs were already minted/);
  });

  it("Batch mint works", async () => {
    const jims = await deploy();
    const autoglyphs = await deployAutoglyphs();
    await jims.connect(signers[0]).whitelistERC721(autoglyphs.address, 1);
    const price = await jims.priceToMint();

    await autoglyphs.createNft(accounts[1]);

    await assert.rejects(jims.connect(signers[1]).batchMint(5, {value: price.mul(4)}), /Must pay the price to mint multiple Jims/);
    await assert.rejects(jims.connect(signers[1]).batchMint(5, {value: price.mul(5)}), /Public sale/);

    await ethers.provider.send("evm_increaseTime", [30 * 60])
    await ethers.provider.send("evm_mine")

    expect((await jims.allOwned(accounts[1])).length).to.equal(0);
    await jims.connect(signers[1]).batchMint(5, {value: price.mul(5)});
    const allOwned = await jims.allOwned(accounts[1]);
    expect(allOwned.length).to.equal(5);
    expect(await jims.wasPreMinted(allOwned[0])).to.equal(true);
    expect(await jims.wasPreMinted(allOwned[1])).to.equal(false);
    expect(await jims.wasPreMinted(allOwned[2])).to.equal(false);
    expect(await jims.wasPreMinted(allOwned[3])).to.equal(false);
    expect(await jims.wasPreMinted(allOwned[4])).to.equal(false);

  });
});
