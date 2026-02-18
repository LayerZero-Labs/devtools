// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { TIP20OFTMock } from "../mocks/TIP20OFTMock.sol";
import { TIP20OFT } from "../../contracts/OFTTIP20.sol";

library TIP20OFTMockCodec {
    function asTIP20OFTMock(TIP20OFT _oft) internal pure returns (TIP20OFTMock) {
        return TIP20OFTMock(address(_oft));
    }
}
