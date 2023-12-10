// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OmniCounter as OmniCounterImpl } from "@layerzerolabs/lz-evm-oapp-v2/contracts/examples/OmniCounter.sol";

contract DefaultOApp is OmniCounterImpl {
    constructor(address _endpoint) OmniCounterImpl(_endpoint) {}
}
