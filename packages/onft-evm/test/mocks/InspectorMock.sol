// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IOAppMsgInspector } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppMsgInspector.sol";

contract InspectorMock is IOAppMsgInspector {
    function inspect(bytes calldata _message, bytes calldata _options) external pure returns (bool) {
        revert InspectionFailed(_message, _options);
    }
}
