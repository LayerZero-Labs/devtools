// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IOFTWithDecimalConversionRate is IOFT {
    function decimalConversionRate() external view returns (uint256);
}
