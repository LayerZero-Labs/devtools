// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.22;

// @dev oz4/5 breaking change... Ownable constructor
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// structs
import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { MessagingFee } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";

// contracts
import { SendUlnBase } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/SendUlnBase.sol";
import { SendLibBaseE2, WorkerOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBaseE2.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

import { TestHelperOz5 } from "../TestHelperOz5.sol";

contract SendUln302Mock is SendUlnBase, SendLibBaseE2 {
    // offchain packets schedule
    TestHelperOz5 public testHelper;

    uint32 internal constant CONFIG_TYPE_EXECUTOR = 1;
    uint32 internal constant CONFIG_TYPE_ULN = 2;

    error LZ_ULN_InvalidConfigType(uint32 configType);

    constructor(
        address payable _verifyHelper,
        address _endpoint,
        uint256 _treasuryGasCap,
        uint256 _treasuryGasForFeeCap
    ) Ownable(msg.sender) SendLibBaseE2(_endpoint, _treasuryGasCap, _treasuryGasForFeeCap) {
        testHelper = TestHelperOz5(_verifyHelper);
    }

    // ============================ OnlyEndpoint ===================================

    // on the send side the user can config both the executor and the ULN
    function setConfig(address _oapp, SetConfigParam[] calldata _params) external override onlyEndpoint {
        for (uint256 i = 0; i < _params.length; i++) {
            SetConfigParam calldata param = _params[i];
            _assertSupportedEid(param.eid);
            if (param.configType == CONFIG_TYPE_EXECUTOR) {
                _setExecutorConfig(param.eid, _oapp, abi.decode(param.config, (ExecutorConfig)));
            } else if (param.configType == CONFIG_TYPE_ULN) {
                _setUlnConfig(param.eid, _oapp, abi.decode(param.config, (UlnConfig)));
            } else {
                revert LZ_ULN_InvalidConfigType(param.configType);
            }
        }
    }

    // ============================ View ===================================

    function getConfig(uint32 _eid, address _oapp, uint32 _configType) external view override returns (bytes memory) {
        if (_configType == CONFIG_TYPE_EXECUTOR) {
            return abi.encode(getExecutorConfig(_oapp, _eid));
        } else if (_configType == CONFIG_TYPE_ULN) {
            return abi.encode(getUlnConfig(_oapp, _eid));
        } else {
            revert LZ_ULN_InvalidConfigType(_configType);
        }
    }

    function version() external pure override returns (uint64 major, uint8 minor, uint8 endpointVersion) {
        return (3, 0, 2);
    }

    function isSupportedEid(uint32 _eid) external view override returns (bool) {
        return _isSupportedEid(_eid);
    }

    // ============================ Internal ===================================

    function _quoteVerifier(
        address _sender,
        uint32 _dstEid,
        WorkerOptions[] memory _options
    ) internal view override returns (uint256) {
        return _quoteDVNs(_sender, _dstEid, _options);
    }

    function _payVerifier(
        Packet calldata _packet,
        WorkerOptions[] memory _options
    ) internal override returns (uint256 otherWorkerFees, bytes memory encodedPacket) {
        (otherWorkerFees, encodedPacket) = _payDVNs(fees, _packet, _options);
    }

    function _splitOptions(
        bytes calldata _options
    ) internal pure override returns (bytes memory, WorkerOptions[] memory) {
        return _splitUlnOptions(_options);
    }

    function send(
        Packet calldata _packet,
        bytes calldata _options,
        bool _payInLzToken
    ) public override returns (MessagingFee memory fee, bytes memory encodedPacket) {
        (fee, encodedPacket) = super.send(_packet, _options, _payInLzToken);
        testHelper.schedulePacket(encodedPacket, _options);
    }
}
