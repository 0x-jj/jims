pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


// SPDX-License-Identifier: MIT

contract Fingerprints is ERC20 {
  constructor() ERC20("Fingerprints", "PRINT") {}

  function mint(address to, uint256 howMuch) public {
    _mint(to, howMuch);
  }
}
