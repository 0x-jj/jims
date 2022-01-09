pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



// SPDX-License-Identifier: MIT
contract Jims is ERC721Enumerable, Ownable {
  address[] public _whitelistedERC20s;
  address[] public _whitelistedERC721s;
  mapping (address => uint256) public _erc20MinBals;
  mapping (address => uint256) public _erc721MinBals;

  uint256 public constant priceToMint = 0.069 ether;
  address public immutable _feeWallet;
  uint256 public immutable maxSupply;
  uint256 public immutable preMintSupply;
  uint256 public immutable maxMintPerTransaction;
  uint256 private immutable _obfuscationOffset;

  uint256 public preMintStartTime;
  mapping (address => bool) public _whitelistedAddresses;
  mapping (address => bool) public _preMintedAddresses;
  mapping (uint256 => bool) public _preMintedTokenIds;

  uint256 public totalPreMinted = 0;
  bool public mintAllowed = false;
  bool public devMintLocked = false;
  string public baseURI = "ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/";


  constructor(address feeWallet, uint256 preMintSupply_, uint256 maxSupply_, uint256 maxMintPerTransaction_, uint256 obfuscationOffset) ERC721("The Jims", "JIM") {
    require(preMintSupply_ <= maxSupply_, "preMintSupply must <= maxSupply");
    _feeWallet = feeWallet;
    maxSupply = maxSupply_;
    preMintSupply = preMintSupply_;
    maxMintPerTransaction = maxMintPerTransaction_;
    _obfuscationOffset = obfuscationOffset;
    _whitelistToadzBuilders();
  }

  function allowMinting() public onlyOwner {
    mintAllowed = true;
    preMintStartTime = block.timestamp;
  }

  function whitelistERC721(address erc721, uint256 minBalance) public onlyOwner {
    require(minBalance > 0, "minBalance must be > 0");
    _whitelistedERC721s.push(erc721);
    _erc721MinBals[erc721] = minBalance;
  }

  function whitelistERC20(address erc20, uint256 minBalance) public onlyOwner {
    require(minBalance > 0, "minBalance must be > 0");
    _whitelistedERC20s.push(erc20);
    _erc20MinBals[erc20] = minBalance;
  }

  function whitelistAddress(address wallet) public onlyOwner {
    require(_whitelistedAddresses[wallet] == false, "Address already whitelisted");
    _whitelistedAddresses[wallet] = true;
  }

  function totalMinted() public view returns (uint256) {
    return totalSupply();
  }

  function wasPreMinted(uint256 tokenId) public view returns (bool) {
    return _preMintedTokenIds[tokenId];
  }

  function publicSaleStarted() public view returns (bool) {
    return mintAllowed && preMintStartTime > 0 &&
      (totalPreMinted >= preMintSupply || block.timestamp - 30 minutes > preMintStartTime);
  }

  function timeToPublicSale() public view returns (int256) {
    if (preMintStartTime == 0) {
      return -1;
    }
    if (block.timestamp >= preMintStartTime + 30 minutes) {
      return 0;
    }
    return int256(preMintStartTime + 30 minutes - block.timestamp);
  }

  function mint(uint256 n) payable public {
    uint256 mintedSoFar = totalSupply();
    require(mintAllowed, "Mint is not allowed yet");
    require(n <= maxMintPerTransaction, "There is a limit on minting too many at a time!");
    require(mintedSoFar + n <= maxSupply, "Not enough Jims left to mint");
    require(msg.value >= n * priceToMint, "Not enough ether sent");

    if (canPreMint(msg.sender) && n == 1) {
      totalPreMinted += 1;
      _preMintedAddresses[msg.sender] = true;
      _preMintedTokenIds[_bijectTokenId(mintedSoFar + 1)] = true;
    } else {
      require(publicSaleStarted(), "You are not eligible to pre-mint");
    }

    (bool feeSent, ) = _feeWallet.call{value: msg.value}("");
    require(feeSent, "Transfer to fee wallet failed");

    for (uint256 i = 0; i < n; i++) {
      _safeMint(msg.sender, mintedSoFar + 1 + i);
    }
  }


  function allOwned(address wallet) public view returns (uint256[] memory) {
    uint256[] memory ret = new uint256[](balanceOf(wallet));
    for (uint256 i = 0; i < balanceOf(wallet); i++) {
      ret[i] = tokenOfOwnerByIndex(wallet, i);
    }
    return ret;
  }

  function canPreMint(address wallet) public view returns (bool) {
    return isPreMinter(wallet) && _preMintedAddresses[wallet] == false && totalPreMinted < preMintSupply;
  }

  function isPreMinter(address wallet) public view returns (bool) {
    for (uint256 i = 0; i < _whitelistedERC20s.length; i++) {
      address erc20 = _whitelistedERC20s[i];
      uint256 minBal = _erc20MinBals[erc20];
      if (IERC20(erc20).balanceOf(wallet) >= minBal) {
        return true;
      }
    }

    for (uint256 i = 0; i < _whitelistedERC721s.length; i++) {
      address erc721  = _whitelistedERC721s[i];
      uint256 minBal = _erc721MinBals[erc721];
      if (IERC721(erc721).balanceOf(wallet) >= minBal) {
        return true;
      }
    }

    return _whitelistedAddresses[wallet];
  }

  function _safeMint(address recipient, uint256 tokenId) internal override {
    super._safeMint(recipient, _bijectTokenId(tokenId));
  }

  function _bijectTokenId(uint256 tokenId) internal view returns (uint256) {
    return (tokenId + _obfuscationOffset) % maxSupply;
  }

  function mintSpecial(address recipient) external onlyOwner {
    require(!devMintLocked, "Dev Mint Permanently Locked");
    for (uint256 i = 0; i < 10; i++) {
        _safeMint(recipient, totalSupply() + 1);
    }
    devMintLocked = true;
  }

  function _whitelistToadzBuilders() private {
    _whitelistedAddresses[0x38cb169b538a9Ad32a8B146D534b8087A7fa9033] = true;
    _whitelistedAddresses[0xe151dF2b98F9CE246C1De62f10F08c75991F6f6d] = true;
    _whitelistedAddresses[0x0deE629A5961F0493A54283B88Fc0Da49558E27c] = true;
    _whitelistedAddresses[0x515278483D7888B877F605984bF7fF0f489D6b88] = true;
    _whitelistedAddresses[0x7651f150fDF8E9C6293FaF3DBFE469296397f216] = true;
    _whitelistedAddresses[0x829B325036EE8F6B6ec80311d2699505505696eF] = true;
    _whitelistedAddresses[0x31C1b03EC94EC958DD6E53351f1760f8FF72946B] = true;
    _whitelistedAddresses[0x5ba89cAd1B7925083FdC91F8aFc5dff954df803F] = true;
    _whitelistedAddresses[0xDE8f5F0b94134d50ad7f85EF02b9771203F939E5] = true;
    _whitelistedAddresses[0x27E46E5C28d29Cae26fC0a92ACfCb3C9718D8Ee0] = true;
    _whitelistedAddresses[0x51e13ff041D86dcc4B8126eD58050b7C2BA2c5B0] = true;
    _whitelistedAddresses[0xb4005DB54aDecf669BaBC3efb19B9B7E3978ebc2] = true;
    _whitelistedAddresses[0xce4122fEC66C21b0114a8Ef6dA8BCC44C396Cb66] = true;
    _whitelistedAddresses[0x1E4aB43d5D283cb3bf809a46C4eed47C7283e6EC] = true;
    _whitelistedAddresses[0xAd1B4d6d80Aea57c966D9751A5Fe2c60a0469F60] = true;
    _whitelistedAddresses[0xDe05523952B159f1E07f61E744a5e451776B2890] = true;
    _whitelistedAddresses[0x9C3b82bf3464e3Eb594d7F172800066C0394D996] = true;
    _whitelistedAddresses[0xCF4e26a7e7eAe4b3840dd31C527096e1265AB990] = true;
    _whitelistedAddresses[0xe1385eA3cD4AEB508b2B8094F822960D0C968505] = true;
    _whitelistedAddresses[0xcB06bEDe7cB0a4b333581B6BdcD05f7cc737b9cC] = true;
    _whitelistedAddresses[0x04fe82a2a3284F629Bb501e78e6DDf38702d129c] = true;
    _whitelistedAddresses[0xe0110C6EE2138Ecf9962a6f9f6Ad329cDFE1FA17] = true;
    _whitelistedAddresses[0x3993996B09949BBA655d98C02c87EA6ABf553630] = true;
    _whitelistedAddresses[0xD19BF5F0B785c6f1F6228C72A8A31C9f383a49c4] = true;
    _whitelistedAddresses[0x53aD02394eB71543D4deB7c034893A12e15fF4e0] = true;
    _whitelistedAddresses[0xF3A45Ee798fc560CE080d143D12312185f84aa72] = true;
    _whitelistedAddresses[0x5b8589befa1bAeaB1f10FF0933DC93c54F906A53] = true;
    _whitelistedAddresses[0x062062Ed41002Ed2Bff56df561496cbE7FB374ae] = true;
    _whitelistedAddresses[0xbC9C6379C7C5b87f32cB707711FbEbB2511f0BA1] = true;
    _whitelistedAddresses[0xb75F87261a1FAC3a86f8A48d55597A622BA3CC48] = true;
    _whitelistedAddresses[0x6b2AF62E0Bb72761241F35d6796b64B98Fe1Bd1C] = true;
    _whitelistedAddresses[0x9A15235379CF1111EA102850d442b743BF586FC5] = true;
    _whitelistedAddresses[0x52A7991d52d8e68de46DFe3CD7d4f48edDa7aE77] = true;
    _whitelistedAddresses[0x3b359252E4A9B352a127aDdbcc2547460AA4e51c] = true;
    _whitelistedAddresses[0xedcB20e324E75553C9C7E7578eFAe48AaB4702FF] = true;
    _whitelistedAddresses[0x7132C9f36abE62EAb74CdfDd08C154c9AE45691B] = true;
    _whitelistedAddresses[0x51200AA490F8DF9EBdC9671cF8C8F8A12c089fDa] = true;
    _whitelistedAddresses[0xCEB6798d609F86E156F36735EB39108aF6d9a8cB] = true;
    _whitelistedAddresses[0xe360776eDA4764CDEe0b7613857f286b861aB4D4] = true;
    _whitelistedAddresses[0x484eC62385e780f2460fEaC34864A77bA5A18134] = true;
    _whitelistedAddresses[0x202e1B414D601395c30A6F70EFfA082f36Ea8f79] = true;
    _whitelistedAddresses[0xf8c75C5E9ec6875c57C0Dbc30b59934B37908c4e] = true;
    _whitelistedAddresses[0x3491A2C7Aa4D12D67A5ab628185CE07821B9C553] = true;
    _whitelistedAddresses[0xa596370bC21DeE36872B98009dfbbF465DBFefA3] = true;
    _whitelistedAddresses[0xdFba1C121d57d317467dCf6eba3df7b32C5C736f] = true;
    _whitelistedAddresses[0x389D3C071687A92F060995327Acb015e936A27CE] = true;
    _whitelistedAddresses[0x04D42dEd30A02986Dd5E17d39dd34fBA381FcC4E] = true;
    _whitelistedAddresses[0xcD494a22fCF4888976c145F9e389869C4ec313aA] = true;
    _whitelistedAddresses[0xff91128081043dcEB6C0bD3f752Fa447fbaA9335] = true;
    _whitelistedAddresses[0x06151656d748990d77e20a2d47C4F9369AA74645] = true;
    _whitelistedAddresses[0x6A9B9563F32Bc418f35067CE47554C894799515b] = true;
    _whitelistedAddresses[0x9C906F90137C764035d180D3983F15E7C2cb8BbE] = true;
    _whitelistedAddresses[0x8Bd8795CbeED15F8D5074f493C53b39C11Ed37B2] = true;
    _whitelistedAddresses[0x93e9594A8f2b5671aeE54b86283FA5A7261F93d7] = true;
    _whitelistedAddresses[0xc6B89634f0afb34b59c05A0B7cD132141778aDDd] = true;
    _whitelistedAddresses[0x51661d54E0b6653446c602fd4d973D5205F22Dc3] = true;
  }

  function _baseURI() internal view virtual override returns (string memory) {
      return baseURI;
  }

  function _setBaseURI(string memory baseURI_) external onlyOwner {
      baseURI = baseURI_;
  }

}


