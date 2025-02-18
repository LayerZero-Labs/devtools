// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// @dev WARNING: This is for testing purposes only
contract MOVEMock is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {}

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }
}

// cast send 0xcf28bDf5352881cAc32bA7C94265Ac7C720B7DC6 "mint(address,uint256)" 0x65E467bB02984c535a79D28f6538318F46FF9A5B 100000000000000 --private-key $PRIVATE_KEY --rpc-url https://bsc-testnet-dataseed.bnbchain.org