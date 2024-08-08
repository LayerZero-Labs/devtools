// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

contract CustomOApp is OApp {
    uint256 private _customProperty;

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    function _lzReceive(Origin calldata, bytes32, bytes calldata, address, bytes calldata) internal virtual override {}

    function getCustomProperty() external view returns (uint256) {
        return _customProperty;
    }

    function setCustomProperty(uint256 value) external onlyOwner {
        _customProperty = value;
    }
}
