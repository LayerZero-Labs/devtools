// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  LayerZero imports    ==========

import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";

//  ==========  Internal imports    ==========

import { OFTAdapterUpgradeable } from "./OFTAdapterUpgradeable.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title MintBurnOFTAdapterUpgradeable
 * @dev MintBurnOFTAdapter with upgradeable logic.
 */
abstract contract MintBurnOFTAdapterUpgradeable is OFTAdapterUpgradeable {
    /// @notice The contract responsible for minting and burning tokens.
    IMintableBurnable public immutable minterBurner;

    /**
     * @dev Constructor for initializing the contract with token and endpoint addresses.
     * @param _token The address of the token.
     * @param _lzEndpoint The address of the LayerZero endpoint.
     * @param _minterBurner The address of the contract responsible for minting and burning tokens.
     */
    constructor(
        address _token,
        address _lzEndpoint,
        IMintableBurnable _minterBurner
    ) OFTAdapterUpgradeable(_token, _lzEndpoint) {
        minterBurner = _minterBurner;
    }

    /**
     * @dev Initializes the MintAndBurnOFTAdapterUpgradeable contract.
     * @param _delegate The address of the LayerZero delegate.
     */
    function __MintBurnOFTAdapterUpgradeable_init(address _delegate) internal onlyInitializing {
        __OFTAdapter_init(_delegate);
    }

    /**
     * @dev Unchained initialization function for the contract.
     */
    function __MintBurnOFTAdapterUpgradeable_init_unchained() internal onlyInitializing {}

    /**
     * @dev Transfers the full amount from the sender's balance to the contract,
     *      then burns the amount minus the fee from the contract leaving the fee locked in the contract.
     * @param _from The address to debit from.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override(OFTAdapterUpgradeable) returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        // Burns tokens from the caller.
        minterBurner.burn(_from, amountSentLD);
    }

    /**
     * @dev Credits tokens to the specified address.
     * @param _to The address to credit the tokens to.
     * @param _amountLD The amount of tokens to credit in local decimals.
     * @dev _srcEid The source chain ID.
     * @return amountReceivedLD The amount of tokens ACTUALLY received in local decimals.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /* _srcEid */
    ) internal virtual override(OFTAdapterUpgradeable) returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead); // _mint(...) does not support address(0x0)
        // Mints the tokens and transfers to the recipient.
        minterBurner.mint(_to, _amountLD);
        // In the case of NON-default OFTAdapter, the amountLD MIGHT not be equal to amountReceivedLD.
        return _amountLD;
    }
}
