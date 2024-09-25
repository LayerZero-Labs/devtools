// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { ONFT1155 } from "../../../../contracts/onft1155/ONFT1155.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ONFT1155Mock is ONFT1155 {
    constructor(string memory _uri, address _lzEndpoint, address _delegate) ONFT1155(_uri, _lzEndpoint, _delegate) Ownable(_delegate) {}

    function mint(address _to, uint256 _tokenId, uint256 _amount, bytes memory _data) public {
        _mint(_to, _tokenId, _amount, _data);
    }

    function mintBatch(address _to, uint256[] memory _tokenIds, uint256[] memory _amounts, bytes memory _data) public {
        _mintBatch(_to, _tokenIds, _amounts, _data);
    }
}
