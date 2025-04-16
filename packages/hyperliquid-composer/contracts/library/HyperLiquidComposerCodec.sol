// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ErrorMessagePayload, IHyperLiquidComposerErrors } from "../interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperAssetAmount } from "../interfaces/IHyperLiquidComposerCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

library HyperLiquidComposerCodec {
    /// @dev This is the largest possible token supply on HyperCore
    uint64 public constant EVM_MAX_TRANSFERABLE_INTO_CORE_PER_TX = type(uint64).max;

    /// @dev Valid compose message lengths for the HyperLiquidComposer - can be abi.encodePacked(address) or abi.encode(address)
    /// @dev If we are in abi.encodePacked(address) mode, the length is 20 bytes because addresses are 20 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;
    /// @dev If we are in abi.encode(address) mode, the length is 32 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_ENCODE = 32;

    /// @dev The base asset bridge address is the address of the HyperLiquid L1 contract
    /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
    /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    address public constant BASE_ASSET_BRIDGE_ADDRESS = 0x2000000000000000000000000000000000000000;
    uint256 public constant BASE_ASSET_BRIDGE_ADDRESS_UINT256 = uint256(uint160(BASE_ASSET_BRIDGE_ADDRESS));

    /// @notice Converts a core index id to an asset bridge address
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _coreIndexId The core index id to convert
    ///
    /// @return _assetBridgeAddress The asset bridge address
    function into_assetBridgeAddress(uint256 _coreIndexId) internal pure returns (address) {
        return address(uint160(BASE_ASSET_BRIDGE_ADDRESS_UINT256 + _coreIndexId));
    }

    /// @notice Converts an asset bridge address to a core index id
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _assetBridgeAddress The asset bridge address to convert
    ///
    /// @return _coreIndexId The core index id
    function into_tokenId(address _assetBridgeAddress) internal pure returns (uint256) {
        return uint256(uint160(_assetBridgeAddress)) - BASE_ASSET_BRIDGE_ADDRESS_UINT256;
    }

    /// @notice Converts an amount and an asset to a evm amount, core amount, and dust
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _amount The amount to convert
    /// @param _assetBridgeSupply The maximum amount transferable capped by the number of tokens located on the HyperCore's side of the asset bridge
    /// @param _asset The asset to convert
    ///
    /// @return IHyperAssetAmount memory - The evm amount, core amount, and dust
    function into_hyperAssetAmount(
        uint256 _amount,
        uint64 _assetBridgeSupply,
        IHyperAsset memory _asset
    ) internal pure returns (IHyperAssetAmount memory) {
        uint256 amountEVM;
        uint256 dust;
        uint64 amountCore;

        uint64 maxTransferableCoreAmount = min_u64(_assetBridgeSupply, EVM_MAX_TRANSFERABLE_INTO_CORE_PER_TX);

        /// @dev The general functioning of these function calls are:
        /// @dev 1. Compute the max evm sendable amount from the max core amount computed above as maxTransferableCoreAmount
        /// @dev 2. This gives us evmMaxTransferable which is a u256 scaling of the core amount by 10.pow(decimalDiff)
        /// @dev 3. evmMaxTransferable is the maximal number of tokens that we can send across in a single SendSpot transaction
        /// @dev 4. If amount > evmMaxTransferable then only send evmMaxTransferable and refund the difference by accumulating it in dust
        /// @dev 5. The above step bounds evm amount to be an input that is guaranteed to, on hypercore, have a maximum of u64.
        /// @dev 6. Compute amountCore from evmMaxTransferable by evmMaxTransferable / 10.pow(decimalDiff)
        if (_asset.decimalDiff > 0) {
            (amountEVM, dust, amountCore) = into_hyperAssetAmount_decimal_difference_gt_zero(
                _amount,
                maxTransferableCoreAmount,
                uint64(_asset.decimalDiff)
            );
        } else {
            (amountEVM, dust, amountCore) = into_hyperAssetAmount_decimal_difference_leq_zero(
                _amount,
                maxTransferableCoreAmount,
                uint64(-1 * _asset.decimalDiff)
            );
        }

        return IHyperAssetAmount({ evm: amountEVM, dust: dust, core: amountCore });
    }

    /// @notice Computes hyperAssetAmount when EVM decimals > Core decimals
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _amount The amount to convert
    /// @param _maxTransferableCoreAmount The maximum transferrable amount capped by the asset bridge has range [0,u64.max]
    /// @param _extraWeiDecimals The decimal difference between HyperEVM and HyperCore
    ///
    /// @return amountEVM The EVM amount
    /// @return dust The dust amount
    /// @return amountCore The core amount
    function into_hyperAssetAmount_decimal_difference_gt_zero(
        uint256 _amount,
        uint64 _maxTransferableCoreAmount,
        uint64 _extraWeiDecimals
    ) internal pure returns (uint256 amountEVM, uint256 dust, uint64 amountCore) {
        uint256 scale = 10 ** _extraWeiDecimals;
        uint256 maxEvmAmountFromCoreMax = _maxTransferableCoreAmount * scale;

        /// @dev Strip out the dust from _amount so that _amount and maxEvmAmountFromCoreMax have a maximum of _extraWeiDecimals starting 0s
        dust = _amount % scale;
        _amount = _amount - dust;

        /// @dev Bound amountEvm to the range of [0, evmscaled u64.max]
        /// @dev If _amount is larger then we have an overflow as we can't send over u64.max tokens. Limit the tokens to u64.max and overflow into the dust
        amountEVM = min_u256(_amount, maxEvmAmountFromCoreMax);
        dust = dust + (_amount - amountEVM);

        /// @dev Guaranteed to be in the range of [0, u64.max] because it is uppoerbounded by uint64 _maxTransferableCoreAmount
        amountCore = uint64(amountEVM / scale);
    }

    /// @notice Computes hyperAssetAmount when EVM decimals < Core decimals and 0
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _amount The amount to convert
    /// @param _maxTransferableCoreAmount The maximum transferrable amount capped by the asset bridge
    /// @param _extraWeiDecimals The decimal difference between HyperEVM and HyperCore
    ///
    /// @return amountEVM The EVM amount
    /// @return dust The dust amount
    /// @return amountCore The core amount
    function into_hyperAssetAmount_decimal_difference_leq_zero(
        uint256 _amount,
        uint64 _maxTransferableCoreAmount,
        uint64 _extraWeiDecimals
    ) internal pure returns (uint256 amountEVM, uint256 dust, uint64 amountCore) {
        uint256 scale = 10 ** _extraWeiDecimals;
        uint256 maxEvmAmountFromCoreMax = _maxTransferableCoreAmount / scale;

        /// @dev When Core is greater than EVM there will be no opening dust to strip out since all tokens in evm can be represented on cores
        /// @dev Bound amountEvm to the range of [0, evmscaled u64.max]
        /// @dev Overflow the excess into dust
        amountEVM = min_u256(_amount, maxEvmAmountFromCoreMax);
        dust = _amount - amountEVM;

        /// @dev Guaranteed to be in the range of [0, u64.max] because it is uppoerbounded by uint64 _maxTransferableCoreAmount
        amountCore = uint64(amountEVM * scale);
    }

    /// @notice Converts a bytes32 to an evm address
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _senderAsBytes32 The bytes32 to convert
    ///
    /// @return _evmAddress Non zero address if the bytes32 is a valid evm address, otherwise zero address
    function into_evmAddress_or_zero(bytes32 _senderAsBytes32) internal pure returns (address) {
        uint256 senderAsUint160 = uint256(_senderAsBytes32);
        if (senderAsUint160 <= type(uint160).max) {
            return address(uint160(senderAsUint160));
        }
        return address(0);
    }

    /// @notice Converts a bytes to an evm address
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _senderAsBytes The bytes to convert
    ///
    /// @return _evmAddress Non zero address if the bytes are a valid evm address, otherwise zero address
    function into_evmAddress_or_zero(bytes memory _senderAsBytes) internal pure returns (address) {
        uint256 length = _senderAsBytes.length;
        if (length == VALID_COMPOSE_MESSAGE_LENGTH_PACKED) {
            return address(bytes20(_senderAsBytes));
        } else if (length == VALID_COMPOSE_MESSAGE_LENGTH_ENCODE) {
            bytes32 senderAsBytes32 = bytes32(_senderAsBytes);
            return into_evmAddress_or_zero(senderAsBytes32);
        }
        return address(0);
    }

    /// @notice Extracts the error payload from a bytes array
    /// @notice This function is called by the HyperLiquidComposer contract
    /// @dev Strips out the revert message to extract the payload ErrorMsg(bytes errorMessage) - ('0x' + 32 bytes) * 2 = 64 bytes
    ///
    /// @param _err The bytes array to extract the error payload from
    ///
    /// @return _errorPayload The error payload
    function extractErrorPayload(bytes calldata _err) internal pure returns (bytes memory) {
        return _err[64 + 4:];
    }

    /// @notice Creates an error message payload
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _errorMessage The error message to create
    /// @param _sender The sender of the error message
    /// @param _amountLD The amount of the error message
    ///
    /// @return _errorMessagePayload The error message payload
    function createErrorMessage(
        bytes memory _errorMessage,
        address _sender,
        uint256 _amountLD
    ) internal pure returns (bytes memory) {
        return
            abi.encode(
                ErrorMessagePayload({ refundTo: _sender, refundAmount: _amountLD, errorMessage: _errorMessage })
            );
    }

    function min_u256(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a > b ? b : a);
    }

    function min_u64(uint64 a, uint64 b) internal pure returns (uint64) {
        return (a > b ? b : a);
    }
}
