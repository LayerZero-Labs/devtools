// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IHYPEPrecompile } from "../../contracts/interfaces/IHYPEPrecompile.sol";

contract HypePrecompileMock is IHYPEPrecompile {
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value);
    }
}
