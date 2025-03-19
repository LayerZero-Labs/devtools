// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";
import { IHyperLiquidComposer, HyperAsset, HyperAssetAmount } from "./interfaces/IHyperLiquidComposer.sol";
import { IHyperLiquidWritePrecompile } from "./interfaces/IHyperLiquidWritePrecompile.sol";

contract HyperLiquidComposer is IHyperLiquidComposer {
    address public constant L1WritePrecompileAddress = 0x3333333333333333333333333333333333333333;

    address public immutable endpoint;
    IOFT public immutable oft;

    HyperAsset public oftAsset;
    HyperAsset public hypeAsset;

    /// @notice Constructor for the HyperLiquidLZComposer contract
    ///
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @dev Post deployment, this address needs to be approved (via approveCaller) by the `owner` of the `HyperLiquidOFT` contract to call the `transferToHyperLiquidL1` function
    ///
    /// @param _endpoint The LayerZero endpoint address
    /// @param _oft The OFT contract address associated with this composer
    /// @param _coreIndexId The core index id of the HyperLiquid L1 contract
    /// @param _weiDiff The difference in decimals between the HyperEVM OFT deployment and HyperLiquid L1 HIP-1 listing
    constructor(address _endpoint, address _oft, uint64 _coreIndexId, uint64 _weiDiff) {
        /// @dev Hyperliquid L1 contract address is the prefix (0x2000...0000) + the core index id
        /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens between HyperEVM and HyperLiquid L1
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        oftAsset = HyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(_coreIndexId),
            coreIndexId: _coreIndexId,
            decimalDiff: _weiDiff
        });

        /// @dev HYPE Core Spot address on HyperLiquid L1 - is a special address which is a precompile and has it's own asset bridge address which can be found here:
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        /// @dev The following contains information about the HYPE Core Spot:
        /// @dev https://app.hyperliquid-testnet.xyz/explorer/token/0x7317beb7cceed72ef0b346074cc8e7ab
        hypeAsset = HyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: 1105,
            /// @dev 18 is the number of decimals in the HYPE token on HyperEVM
            /// @dev 8 is the number of decimals in the HYPE Core Spot on HyperLiquid L1
            decimalDiff: 18 - 8
        });

        // Used during validation of the lzCompose call
        oft = IOFT(_oft);
        endpoint = _endpoint;
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

    /// @notice Quotes the amount of tokens that will be sent to HyperCore
    /// @notice This function is externally callable
    ///
    /// @param _amount The amount of tokens to send
    /// @param _isOFT Whether the amount is an OFT amount or a HYPE amount
    ///
    /// @return _amounts The amount of tokens to send to HyperCore, dust, and the swap amount
    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) external view returns (HyperAssetAmount memory) {
        if (_isOFT) {
            return HyperLiquidComposerCodec.into_core_amount_and_dust(_amount, oftAsset);
        } else {
            return HyperLiquidComposerCodec.into_core_amount_and_dust(_amount, hypeAsset);
        }
    }

    /// @notice Transfers the asset to the _receiver on HyperCore through the SpotSend precompile
    /// @notice Transfers any leftover dust to the _receiver
    /// @notice This function is called by the lzCompose function
    ///
    /// @dev The composer transfers the tokens to it's address on HyperCore
    /// @dev The composer then transfers the tokens from it's address on HyperCore to the _receiver via the SpotSend precompile
    /// @dev The SpotSend precompile is a precompile on HyperEVM that allows for token transfers on HyperCore
    ///
    /// @dev The transfer to HyperCore via the assetBridgeAddress and the SpotSend precompile is done in the same transaction
    /// @dev Hyperliquid guarantees sequantial transactions but not atomicity of the transfer.
    /// @dev Transfers are primitive transactions and are always expected to pass.
    ///
    /// @param _receiver The address of the receiver
    /// @param _amountLD The amount of tokens to send
    function _sendAssetToHyperCore(address _receiver, uint256 _amountLD) internal virtual {
        /// @dev Computes the tokens to send to HyperCore, dust, and the swap amount.
        /// @notice The swap amount (HIP1) and tokens to send (ERC20) are different because they have different decimals
        HyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_core_amount_and_dust(_amountLD, oftAsset);
        IERC20 token = IERC20(oft.token());

        /// Transfers the tokens to the composer address on HyperCore
        token.transfer(oftAsset.assetBridgeAddress, amounts.evm);

        /// Transfers tokens from the composer address on HyperCore to the _receiver
        IHyperLiquidWritePrecompile(L1WritePrecompileAddress).sendSpot(_receiver, oftAsset.coreIndexId, amounts.core);

        /// Transfers any leftover dust to the _receiver on HyperEVM
        if (amounts.dust > 0) {
            token.transfer(_receiver, amounts.dust);
        }
    }

    /// @notice Funds the address on HyperCore with the amount of HYPE tokens
    /// @notice This function is called by the lzCompose function
    /// @notice This is a precompile which makes it different to _sendAssetToHyperCore
    ///
    /// @dev The composer transfers HYPE that is received from the lzCompose call to it's address on HyperCore
    /// @dev The composer then transfers the HYPE from it's address on HyperCore to the _receiver via the SpotSend precompile
    /// @dev The SpotSend precompile is a precompile on HyperEVM that allows for token transfers on HyperCore
    ///
    /// @param _receiver The address of the receiver
    /// @param _amount The amount of HYPE tokens to send
    function _fundAddressOnHyperCore(address _receiver, uint256 _amount) internal virtual {
        /// @dev Computes the HYPE tokens to send to HyperCore, dust, and the swap amount.
        HyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_core_amount_and_dust(_amount, hypeAsset);

        /// Transfers the HYPE tokens to the composer address on HyperCore
        (bool sent, ) = payable(hypeAsset.assetBridgeAddress).call{ value: amounts.evm }("");
        if (!sent) {
            revert HyperLiquidComposer_FailedToSend_HYPE(_amount);
        }

        /// Transfers the HYPE tokens from the composer address on HyperCore to the _receiver via the SpotSend precompile
        IHyperLiquidWritePrecompile(L1WritePrecompileAddress).sendSpot(_receiver, hypeAsset.coreIndexId, amounts.core);

        /// Transfers any leftover dust to the _receiver on HyperEVM
        if (amounts.dust > 0) {
            (bool sentDust, ) = payable(_receiver).call{ value: amounts.dust }("");
            if (!sentDust) {
                revert HyperLiquidComposer_FailedToReturn_HYPE_Dust(amounts.dust);
            }
        }
    }

    function getOFTAsset() external view returns (HyperAsset memory) {
        return oftAsset;
    }

    function getHypeAsset() external view returns (HyperAsset memory) {
        return hypeAsset;
    }

    receive() external payable {}
}
