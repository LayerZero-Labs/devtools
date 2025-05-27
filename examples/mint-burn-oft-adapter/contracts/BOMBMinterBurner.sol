// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";
import { BOMBToken } from "./BOMBToken.sol";

contract BOMBMinterBurner is IMintableBurnable {
    BOMBToken public immutable bombToken;

    constructor(address _bombToken) {
        bombToken = BOMBToken(_bombToken);
    }

    function burn(address _from, uint256 _amount) external override returns (bool success) {
        bombToken.transferFrom(_from, address(this), _amount);
        bombToken.burn(_amount);
        return true;
    }

    function mint(address _to, uint256 _amount) external override returns (bool success) {
        bombToken.mint(_to, _amount);
        return true;
    }
}
