// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { Proxied } from "hardhat-deploy/solc_0.8/proxy/Proxied.sol";

contract TestProxy is Initializable, Proxied {
    function initialize() public proxied initializer {}

    function contractMethod() public pure returns (uint256 something) {
        something = 100;
    }
}
