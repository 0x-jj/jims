const assert = require('assert');
const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");


const SIGNER = 0;
const FEE = 5;
const PREMINT_SUPPLY = 2;
const TOTAL_SUPPLY = 16;
const MAX_MINT_PER_TX = 5;


describe("Jims", () => {
  let factory, accounts, signers;
  const deploy = async () => {
    const jims = await factory.deploy(accounts[FEE], PREMINT_SUPPLY, TOTAL_SUPPLY, MAX_MINT_PER_TX);
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
    const jims = await factory.deploy(
      accounts[FEE],
      PREMINT_SUPPLY,
      TOTAL_SUPPLY,
      MAX_MINT_PER_TX
    );
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: 1 }),
      /Mint is not allowed/
    );
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

    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: 1 }),
      /Not enough ether/
    );
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice.sub(1) }),
      /Not enough ether/
    );
    expect(await jims.totalMinted()).to.equal(0);
  });

  it("Premint fails if user not whitelisted", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );
  });

  it("Premint works with erc721 if paying more than the mint price and returns the correct tokenURI", async () => {
    const jims = await deploy();
    const autoglyphs = await deployAutoglyphs();
    await jims.connect(signers[0]).whitelistERC721(autoglyphs.address, 1);

    const feeWalletBalance = await ethers.provider.getBalance(accounts[FEE]);
    const mintPrice = await jims.priceToMint();
    const prevTotalMinted = await jims.totalMinted();

    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );

    await autoglyphs.createNft(accounts[1]);

    await jims.connect(signers[1]).mint(1, { value: mintPrice });

    const totalMinted = await jims.totalMinted();

    expect(await jims.ownerOf(totalMinted)).to.equal(signers[1].address);
    expect(await jims.tokenURI(totalMinted)).to.equal(
      `ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/${totalMinted}`
    );
    expect(totalMinted).to.equal(prevTotalMinted + 1);
    expect((await jims.priceToMint()) > mintPrice);
    expect(await ethers.provider.getBalance(accounts[FEE])).to.equal(
      feeWalletBalance.add(mintPrice)
    );

    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );
  });

  it("Premint works with erc20", async () => {
    const jims = await deploy();
    const prints = await deployPrints();
    await jims.connect(signers[0]).whitelistERC20(prints.address, 1000);

    const mintPrice = await jims.priceToMint();
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );

    await prints.mint(accounts[1], 500);
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );

    await prints.mint(accounts[1], 500);

    // Premint should work
    expect(await jims.balanceOf(accounts[1])).to.equal(0);
    await jims.connect(signers[1]).mint(1, { value: mintPrice });
    expect(await jims.balanceOf(accounts[1])).to.equal(1);
    expect(await jims.ownerOf(await jims.totalMinted())).to.equal(accounts[1]);
  });

  it("Premint works with whitelisted address", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );

    await jims.connect(signers[0]).whitelistAddress(accounts[1]);

    // Premint works
    expect(await jims.balanceOf(accounts[1])).to.equal(0);
    await jims.connect(signers[1]).mint(1, { value: mintPrice });
    expect(await jims.balanceOf(accounts[1])).to.equal(1);
    expect(await jims.ownerOf(await jims.totalMinted())).to.equal(accounts[1]);
  });

  it("Mint works after 1 hour", async () => {
    const jims = await deploy();
    const mintPrice = await jims.priceToMint();
    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );

    await ethers.provider.send("evm_increaseTime", [15 * 60]);
    await ethers.provider.send("evm_mine");

    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: mintPrice }),
      /You are not eligible to pre-mint/
    );

    await ethers.provider.send("evm_increaseTime", [15 * 60]);
    await ethers.provider.send("evm_mine");

    // Mint works
    expect(await jims.balanceOf(accounts[1])).to.equal(0);
    await jims.connect(signers[1]).mint(1, { value: mintPrice });
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
    await jims.connect(signers[1]).mint(1, { value: price });
    expect(await jims.wasPreMinted(await jims.totalMinted())).to.equal(true);
    await jims.connect(signers[2]).mint(1, { value: price });
    expect(await jims.wasPreMinted(await jims.totalMinted())).to.equal(true);

    expect(await jims.totalMinted()).to.equal(2);
    expect(await jims.totalPreMinted()).to.equal(2);

    expect(await jims.publicSaleStarted()).to.equal(true);

    // Mint the rest of the supply
    const maxSupply = (await jims.maxSupply()).toNumber();
    for (let i = (await jims.totalMinted()).toNumber(); i < maxSupply; i++) {
      await jims
        .connect(signers[3])
        .mint(1, { value: await jims.priceToMint() });
    }
    expect(await jims.totalMinted()).to.equal(maxSupply);
    expect(await jims.totalPreMinted()).to.equal(preMintSupply);

    await assert.rejects(
      jims.connect(signers[1]).mint(1, { value: await jims.priceToMint() }),
      /Not enough Jims left/
    );
  });

  it("Batch mint works", async () => {
    const jims = await deploy();
    const autoglyphs = await deployAutoglyphs();
    await jims.connect(signers[0]).whitelistERC721(autoglyphs.address, 1);
    const price = await jims.priceToMint();

    await autoglyphs.createNft(accounts[1]);

    await assert.rejects(
      jims.connect(signers[1]).mint(5, { value: price.mul(4) }),
      /Not enough ether/
    );
    await assert.rejects(
      jims.connect(signers[1]).mint(5, { value: price.mul(5) }),
      /You are not eligible to pre-mint/
    );

    await ethers.provider.send("evm_increaseTime", [30 * 60]);
    await ethers.provider.send("evm_mine");

    await assert.rejects(
      jims.connect(signers[1]).mint(10, { value: price.mul(10) }),
      /There is a limit/
    );

    expect((await jims.allOwned(accounts[1])).length).to.equal(0);
    await jims.connect(signers[1]).mint(5, { value: price.mul(5) });
    const allOwned = await jims.allOwned(accounts[1]);
    expect(allOwned.length).to.equal(5);
    await Promise.all(
      allOwned.map(async (j) =>
        expect(await jims.wasPreMinted(j)).to.equal(false)
      )
    );
  });

  it("Dev mint works only once", async () => {
    const jims = await deploy();
    await jims.connect(signers[0]).mintSpecial(accounts[1]);
    expect(await jims.totalMinted()).to.equal(10);

    // now expect it to fail
    await assert.rejects(
      jims.connect(signers[0]).mintSpecial(accounts[1]),
      /Dev Mint Permanently Locked/
    );
  });

  it("Can change baseURI", async () => {
    const jims = await deploy();
    const initialBaseURI = await jims.baseURI();
    expect(initialBaseURI).to.equal(
      "ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/"
    );
    await jims._setBaseURI("setToSomethingElse/");
    const newBaseURI = await jims.baseURI();
    expect(newBaseURI).to.equal("setToSomethingElse/");

    await ethers.provider.send("evm_increaseTime", [15 * 60 * 2]);
    await ethers.provider.send("evm_mine");

    const mintPrice = await jims.priceToMint();
    await jims.connect(signers[1]).mint(1, { value: mintPrice });
    const tokenURI = await jims.tokenURI(1);
    expect(tokenURI).to.equal("setToSomethingElse/1");
  });
});
