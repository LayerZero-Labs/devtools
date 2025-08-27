// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { FeeToken } from "../../contracts/extensions/FeeToken.sol";
import { HyperLiquidComposer } from "../../contracts/HyperLiquidComposer.sol";

contract FeeTokenMock is FeeToken {
    constructor(
        address _oft,
        uint64 _coreIndexId,
        int64 _assetDecimalDiff,
        address _REFUND_ADDRESS
    ) HyperLiquidComposer(_oft, _coreIndexId, _assetDecimalDiff, _REFUND_ADDRESS) {}

    function createRawActionPayloadERC20(address _to, uint64 _coreAmount) public view returns (bytes memory payload) {
        bytes memory action = abi.encode(_to, erc20Asset.coreIndexId, _coreAmount);
        payload = abi.encodePacked(SPOT_SEND_HEADER, action);
    }
}
