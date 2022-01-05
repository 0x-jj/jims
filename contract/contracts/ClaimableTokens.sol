pragma solidity ^0.8.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


contract ClaimableTokens is ERC1155, Ownable {
  mapping(uint256 => address) private _publicKeys;
  mapping(uint256 => mapping (uint256 => address)) private _claimedBy;
  mapping(uint256 => uint256) private _fractionsPerSlot;
  mapping(uint256 => uint256) private _numOfSlots;
  mapping(uint256 => string) _URIs;
  uint256[] _registeredTokens;
  string _name;
  string _symbol;

  constructor(string memory givenName, string memory givenSymbol) ERC1155("NOT_USED") {
    _name = givenName;
    _symbol = givenSymbol;
  }

  function claimTokenFractions(uint256 tokenId, uint256 n, bytes memory signature) public virtual {
    // Require that the signer of _hash(tokenId, n) was the private key corresponding to _internalPublicKey
    require(
      SignatureChecker.isValidSignatureNow(_publicKeys[tokenId], hash(tokenId, n), signature),
      "Wrong signature"
    );
    require(_fractionsPerSlot[tokenId] > 0, "Invalid tokenId (nonexistent)");
    require(n < _numOfSlots[tokenId], "Invalid n");
    require(_claimedBy[tokenId][n] == address(0), "No more fractions available to claim");
    _claimedBy[tokenId][n] = msg.sender;

    _mint(msg.sender, tokenId, _fractionsPerSlot[tokenId], "");
  }

  function createToken(uint256 tokenId, uint256 numOfSlots, uint256 fractionsPerSlot, address publicKey,
                       string memory tokenUri) public virtual onlyOwner {
    require(_numOfSlots[tokenId] == 0, "Token was already created");
    require(publicKey != address(0), "Public Key must be non-zero");
    require(fractionsPerSlot * numOfSlots > 0, "Total supply must be > 0");

    _numOfSlots[tokenId] = numOfSlots;
    _publicKeys[tokenId] = publicKey;
    _fractionsPerSlot[tokenId] = fractionsPerSlot;
    _URIs[tokenId] = tokenUri;
    _registeredTokens.push(tokenId);
  }

  function hash(uint256 tokenId, uint256 n) public pure returns (bytes32) {
    bytes32 hashedMsg = keccak256(abi.encode(tokenId, n));
    return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedMsg));
  }

  function totalSupply(uint256 tokenId) public view returns (uint256) {
    return _numOfSlots[tokenId] * _fractionsPerSlot[tokenId];
  }

  function claimedBy(uint256 tokenId, uint256 n) public view returns (address) {
    return _claimedBy[tokenId][n];
  }

  function totalClaimed(uint256 tokenId) public view returns (uint256) {
    uint256 total = 0;
    for (uint256 i = 0; i < _numOfSlots[tokenId]; i++) {
      if (claimedBy(tokenId, i) != address(0)) {
        total += _fractionsPerSlot[tokenId];
      }
    }
    return total;
  }

  function uri(uint256 tokenId) public view virtual override returns (string memory) {
    return _URIs[tokenId];
  }

  function name() public view returns (string memory) {
    return _name;
  }

  function symbol() public view returns (string memory) {
    return _symbol;
  }

  function registeredTokens() public view returns (uint256[] memory) {
    return _registeredTokens;
  }
}
