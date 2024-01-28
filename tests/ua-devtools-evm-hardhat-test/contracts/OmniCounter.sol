// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OmniCounter as OmniCounterImpl } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/examples/OmniCounter.sol";

contract OmniCounter is OmniCounterImpl {
    constructor(address _endpoint, address _delegate) OmniCounterImpl(_endpoint, _delegate) Ownable(_delegate) {}
}
