// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

interface IHyperLiquidComposer is IOAppComposer {
    event errorMessage(bytes reason);
}
