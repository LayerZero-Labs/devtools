// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFTAdapter} from "layerzerolabs/oapp/contracts/oft/OFTAdapter.sol";

contract USDCOFTAdapter is OFTAdapter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}

    /**
     * @dev Returns the number of shared decimals for the OFTAdapter.
     */
    function sharedDecimals() public view override returns (uint8) {
        return 6;
    }
}
