// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { MockERC20 } from "./MockERC20.sol";

contract MockWETH is MockERC20 {
    constructor() MockERC20("Mock Wrapped Ether", "WETH") {}

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) public {
        _burn(msg.sender, wad);
        payable(msg.sender).transfer(wad);
    }
}
