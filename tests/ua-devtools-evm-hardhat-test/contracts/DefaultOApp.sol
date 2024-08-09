// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

contract DefaultOApp is OApp, OAppOptionsType3 {
    event CallerBpsCapSet(uint256 callerBpsCap);

    uint256 public callerBpsCap;

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    function _lzReceive(Origin calldata, bytes32, bytes calldata, address, bytes calldata) internal virtual override {}

    /**
        Copied from https://github.com/stargate-protocol/stargate-v2/blob/3556e333b197b4f3706c68aa2b5cb4060c9c3812/packages/stg-evm-v2/src/peripheral/oft-wrapper/OFTWrapper.sol#L38-L42
        (except validations)
    */
    function setCallerBpsCap(uint256 _callerBpsCap) external onlyOwner {
        callerBpsCap = _callerBpsCap;
        emit CallerBpsCapSet(_callerBpsCap);
    }
}
