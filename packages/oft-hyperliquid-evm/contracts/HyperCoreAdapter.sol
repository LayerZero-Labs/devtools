// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";
import { IHyperLiquidComposer } from "./interfaces/IHyperLiquidComposer.sol";
import { IHyperliquidWritePrecompile } from "./interfaces/IHyperliquidWritePrecompile.sol";

contract HyperCoreAdapter is IHyperLiquidComposer {
    address public immutable OFT_TOKEN_ASSET_BRIDGE_ADDRESS;
    uint64 public immutable OFT_TOKEN_CORE_INDEX_ID;

    address public constant L1WritePrecompileAddress = 0x3333333333333333333333333333333333333333;
    address payable public constant HYPE_ASSET_BRIDGE_ADDRESS = payable(0x2222222222222222222222222222222222222222);
    uint64 public constant HYPER_CORE_INDEX_ID = 1105;
    uint256 public constant HYPER_CORE_INDEX_ID_DECIMAL_DIFF = 18 - 8;

    address public immutable endpoint;
    IOFT public immutable oft;
    IERC20 public immutable token;
    uint256 public immutable weiDiff;
    /// @notice Constructor for the HyperLiquidLZComposer contract
    ///
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @dev Post deployment, this address needs to be approved (via approveCaller) by the `owner` of the `HyperLiquidOFT` contract to call the `transferToHyperLiquidL1` function
    ///
    /// @param _endpoint The LayerZero endpoint address
    /// @param _oft The OFT contract address associated with this composer
    constructor(address _endpoint, address _oft, uint64 _coreIndexId, uint256 _weiDiff) {
        // Validate that the OFT contract implements the `IHyperLiquidERC20Extended` interface
        // This is to ensure that the OFT contract has the `transferToHyperLiquidL1` function
        oft = IOFT(_oft);
        token = IERC20(oft.token());

        endpoint = _endpoint;

        /// @dev Hyperliquid L1 contract address is the prefix + the core index id
        /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        /// @dev It is formed by 0x2000...0000 + the core index id
        OFT_TOKEN_ASSET_BRIDGE_ADDRESS = HyperLiquidComposerCodec.into_assetBridgeAddress(_coreIndexId);
        OFT_TOKEN_CORE_INDEX_ID = _coreIndexId;
        weiDiff = _weiDiff;
    }

    /// @notice Composes a message to be sent to the HyperLiquidLZComposer
    /// @notice This function is the only new addition to the OFT standard
    ///
    /// @dev This function is called by the OFTCore contract when a message is sent
    ///
    /// @param _oft The address of the OFT contract.
    /// @param _message The encoded message content, expected to be of type: (address receiver).
    function lzCompose(
        address _oft,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        // Validate the composeCall based on the docs - https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions#receiving-compose
        if (msg.sender != address(endpoint)) {
            revert HyperLiquidComposer_InvalidCall_NotEndpoint(msg.sender);
        }

        if (address(oft) != _oft) {
            revert HyperLiquidComposer_InvalidCall_NotOFT(address(oft), _oft);
        }

        // Validate the message and decode it -
        // The message is expected to be of type: (address receiver)
        // The bytes object should be encoded as an abi.encodePacked() of the receiver address
        // This is found as SendParam.composeMsg that the OFTCore contract populates on the send() call
        (address _receiver, uint256 _amountLD) = HyperLiquidComposerCodec.validateAndDecodeMessage(_message);

        // If the message is being sent with a value, we need to fund the address on HyperCore
        // This is because the HyperCore contract is deployed with a zero balance
        if (msg.value > 0) {
            _fundAddressOnHyperCore(_receiver, msg.value);
        }

        // Transfer the tokens to the HyperLiquid L1 contract
        // This creates the Transfer event that HyperLiquid L1 listens for
        // IERC20.Transfer(_receiver, 0x2222222222222222222222222222222222222222, _amountLD)
        _sendAssetToHyperCore(_receiver, _amountLD);
    }

    function _sendAssetToHyperCore(address receiever, uint256 amount) internal virtual {
        token.transfer(OFT_TOKEN_ASSET_BRIDGE_ADDRESS, amount);
        IHyperliquidWritePrecompile(L1WritePrecompileAddress).sendSpot(
            receiever,
            OFT_TOKEN_CORE_INDEX_ID,
            uint64(amount / 10 ** weiDiff)
        );
    }

    function _fundAddressOnHyperCore(address receiever, uint256 amount) internal virtual {
        (bool sent, ) = HYPE_ASSET_BRIDGE_ADDRESS.call{ value: amount }("");
        require(sent, "Failed to send HYPE to HyperCore");

        IHyperliquidWritePrecompile(L1WritePrecompileAddress).sendSpot(
            receiever,
            HYPER_CORE_INDEX_ID,
            uint64(amount / 10 ** HYPER_CORE_INDEX_ID_DECIMAL_DIFF)
        );
    }

    receive() external payable {}
}
