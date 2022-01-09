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

  address public _feeWallet;
  uint256 public maxSupply;
  uint256 public preMintSupply;
  uint256 public preMintStartTime;
  mapping (address => bool) public _whitelistedAddresses;
  mapping (address => bool) public _preMintedAddresses;
  mapping (uint256 => bool) public _preMintedTokenIds;

  uint256 public totalPreMinted = 0;
  uint256 public priceToMint = 0.069 ether;
  bool public mintAllowed = false;

  constructor(address feeWallet, uint256 preMintSupply_, uint256 maxSupply_) ERC721("The Jims", "JIM") {
    require(preMintSupply_ <= maxSupply_, "preMintSupply must <= maxSupply");
    _feeWallet = feeWallet;
    maxSupply = maxSupply_;
    preMintSupply = preMintSupply_;
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

  function batchMint(uint256 n) payable public {
    require(msg.value >= n * priceToMint, "Must pay the price to mint multiple Jims");

    for (uint256 i = 0; i < n; i++) {
      mint();
    }
  }

  function mint() payable public {
    require(mintAllowed, "Mint is not allowed yet");
    require(totalSupply() < maxSupply, "All JIMs were already minted");
    require(msg.value >= priceToMint, "Must pay at least the price to mint");

    uint256 tokenId = totalSupply() + 1;

    if (canPreMint(msg.sender)) {
      totalPreMinted += 1;
      _preMintedAddresses[msg.sender] = true;
      _preMintedTokenIds[tokenId] = true;
    } else {
      require(publicSaleStarted(), "Public sale hasn't started yet");
    }

    (bool feeSent, ) = _feeWallet.call{value: priceToMint}("");
    require(feeSent, "Transfer to fee wallet failed");

    _safeMint(msg.sender, tokenId);
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

  function _whitelistToadzBuilders() private {
    _whitelistedAddresses[0xD19BF5F0B785c6f1F6228C72A8A31C9f383a49c4] = true;
    _whitelistedAddresses[0x7132C9f36abE62EAb74CdfDd08C154c9AE45691B] = true;
    _whitelistedAddresses[0x51200AA490F8DF9EBdC9671cF8C8F8A12c089fDa] = true;
    _whitelistedAddresses[0x6b2AF62E0Bb72761241F35d6796b64B98Fe1Bd1C] = true;
    _whitelistedAddresses[0xDE8f5F0b94134d50ad7f85EF02b9771203F939E5] = true;

    _whitelistedAddresses[0xDe05523952B159f1E07f61E744a5e451776B2890] = true;
    _whitelistedAddresses[0x484eC62385e780f2460fEaC34864A77bA5A18134] = true;
    _whitelistedAddresses[0x202e1B414D601395c30A6F70EFfA082f36Ea8f79] = true;
    _whitelistedAddresses[0xf8c75C5E9ec6875c57C0Dbc30b59934B37908c4e] = true;
    _whitelistedAddresses[0xCF4e26a7e7eAe4b3840dd31C527096e1265AB990] = true;

    _whitelistedAddresses[0xe151dF2b98F9CE246C1De62f10F08c75991F6f6d] = true;
    _whitelistedAddresses[0x805f017fd3E5F427bA7510f10CE0BE2e0d6e277A] = true;
    _whitelistedAddresses[0x3491A2C7Aa4D12D67A5ab628185CE07821B9C553] = true;
    _whitelistedAddresses[0xa596370bC21DeE36872B98009dfbbF465DBFefA3] = true;
    _whitelistedAddresses[0x515278483D7888B877F605984bF7fF0f489D6b88] = true;

    _whitelistedAddresses[0xdFba1C121d57d317467dCf6eba3df7b32C5C736f] = true;
    _whitelistedAddresses[0x77595DA2902B7B6eC37Aee731B75abb1D2861Ea3] = true;
    _whitelistedAddresses[0x389D3C071687A92F060995327Acb015e936A27CE] = true;
    _whitelistedAddresses[0xbC9C6379C7C5b87f32cB707711FbEbB2511f0BA1] = true;
    _whitelistedAddresses[0x04D42dEd30A02986Dd5E17d39dd34fBA381FcC4E] = true;

    _whitelistedAddresses[0xcD494a22fCF4888976c145F9e389869C4ec313aA] = true;
    _whitelistedAddresses[0xff91128081043dcEB6C0bD3f752Fa447fbaA9335] = true;
    _whitelistedAddresses[0x52A7991d52d8e68de46DFe3CD7d4f48edDa7aE77] = true;
    _whitelistedAddresses[0xDB708B93932F328356587510B57CfFC43C19EdA0] = true;
    _whitelistedAddresses[0x43B3939483f0694544DF0a6288918d51e18BD435] = true;

    _whitelistedAddresses[0x06151656d748990d77e20a2d47C4F9369AA74645] = true;
    _whitelistedAddresses[0x31C1b03EC94EC958DD6E53351f1760f8FF72946B] = true;
    _whitelistedAddresses[0x6A9B9563F32Bc418f35067CE47554C894799515b] = true;
    _whitelistedAddresses[0x9C906F90137C764035d180D3983F15E7C2cb8BbE] = true;
    _whitelistedAddresses[0xF68C82911C7e6c9701aa27ddf9fECDE8A1C0D470] = true;

    _whitelistedAddresses[0x407b3E415234A43c3f8f899514Aa77BF9d940a75] = true;
    _whitelistedAddresses[0xF3A45Ee798fc560CE080d143D12312185f84aa72] = true;
    _whitelistedAddresses[0x2C5DCa9915bDd37A6b347c0289C2aE7C2F802a71] = true;
    _whitelistedAddresses[0xDb94Daa8bF1b6F45B122F442F922a2C4DD2F7aDe] = true;
    _whitelistedAddresses[0x51661d54E0b6653446c602fd4d973D5205F22Dc3] = true;

    _whitelistedAddresses[0x8Bd8795CbeED15F8D5074f493C53b39C11Ed37B2] = true;
    _whitelistedAddresses[0x93e9594A8f2b5671aeE54b86283FA5A7261F93d7] = true;
    _whitelistedAddresses[0xc6B89634f0afb34b59c05A0B7cD132141778aDDd] = true;
  }

  function _baseURI() internal view virtual override returns (string memory) {
      return "ipfs://QmcnnBXi99renVhnr3wX14TEj3k2EiGHFnn1gQGJhZBmeX/";
  }
}


