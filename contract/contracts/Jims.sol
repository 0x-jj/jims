pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



// SPDX-License-Identifier: MIT
contract Jims is ERC721URIStorage, Ownable {
  address _feeWallet;
  uint256 public _totalSupply;
  uint256 public _preMintSupply;
  uint256 public _preMintStartTime;

  uint256 public _totalMinted = 0;
  uint256 public _totalPreMinted = 0;
  uint256 public _priceToPreMint = 0.069 ether;
  uint256 public _priceToMint = 0.169 ether;
  bool public _mintAllowed = false;

  constructor(address feeWallet, uint256 preMintSupply, uint256 totalSupply) ERC721("The Jims", "JIM") {
    require(preMintSupply <= totalSupply, "preMintSupply must <= totalSupply");
    _feeWallet = feeWallet;
    _totalSupply = totalSupply;
    _preMintSupply = preMintSupply;
  }

  function allowMinting() public onlyOwner {
    _mintAllowed = true;
  }

  function mint() payable external {
    require(_mintAllowed, "Mint is not allowed yet");
    require(_totalMinted < _totalSupply, "All JIMs were already minted");
    require(msg.value >= _priceToMint, "Must pay at least the price to mint");

    _mint();
  }

  function preMint() payable external {
    require(isPreMinter(msg.sender), "Address not whitelisted as a pre-minter");
    require(_mintAllowed, "Mint is not allowed yet");
    require(_totalPreMinted < _preMintSupply, "All JIMs were already pre-minted");
    require(msg.value >= _priceToPreMint, "Must pay at least the price to pre-mint");

    _mint();
    _totalPreMinted += 1;
  }

  function _mint() private {
    (bool feeSent, ) = _feeWallet.call{value: msg.value}("");
    require(feeSent, "Transfer to fee wallet failed");

    _safeMint(msg.sender, _totalMinted);
    _totalMinted += 1;
  }

  function isPreMinter(address wallet) public view returns (bool) {
    IERC20 PRINTS = IERC20(0x4dd28568D05f09b02220b09C2cb307bFd837cb95);
    IERC20 RAW = IERC20(0xb41F289d699C5e79A51Cb29595c203cFaE85F32a);
    IERC721 NOUNS = IERC721(0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03);
    IERC721 AVID_LINES = IERC721(0xDFAcD840f462C27b0127FC76b63e7925bEd0F9D5);
    IERC721 AUTO_GLYPHS = IERC721(0xd4e4078ca3495DE5B1d4dB434BEbc5a986197782);

    return PRINTS.balanceOf(wallet) >= 1000 || RAW.balanceOf(wallet) >= 500 || NOUNS.balanceOf(wallet) >= 1 ||
      AVID_LINES.balanceOf(wallet) >= 1 || AUTO_GLYPHS.balanceOf(wallet) >= 1;
  }
}

