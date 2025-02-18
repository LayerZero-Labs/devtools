// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { LzApp } from "@layerzerolabs/lz-evm-oapp-v1/contracts/lzApp/LzApp.sol";

contract DefaultLzApp is LzApp {
    constructor(address _endpoint, address _delegate) LzApp(_endpoint) Ownable(_delegate) {}

    function _blockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {}
}
