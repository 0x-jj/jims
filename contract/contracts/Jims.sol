pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";


// SPDX-License-Identifier: MIT
contract Jims is ERC721URIStorage {
  address _feeWallet;
  uint256 public _totalSupply = 2048;
  uint256 public _totalMinted = 0;
  uint256 public _mintPriceLowerBound = 100;
  uint256 public _mintPriceUpperBound = 200;

  constructor(address feeWallet) ERC721("The Jims", "JIM") {
    _feeWallet = feeWallet;
  }

  function priceToMint() public view returns (uint256) {
    return _totalMinted * (_mintPriceUpperBound - _mintPriceLowerBound) / _totalSupply + _mintPriceLowerBound;
  }

  function mint() payable external {
    require(_totalMinted < _totalSupply, "All JIMs were already minted");
    require(msg.value >= priceToMint(), "Must pay at least the price to mint");

    (bool feeSent, ) = _feeWallet.call{value: msg.value}("");
    require(feeSent, "Transfer to fee wallet failed");

    _safeMint(msg.sender, _totalMinted);
    _totalMinted += 1;
  }
}
