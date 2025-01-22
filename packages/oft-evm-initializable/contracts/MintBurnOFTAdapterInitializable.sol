// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// External imports
import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Local imports
import { IMintableBurnable } from "./interfaces/IMintableBurnable.sol";
import { OFTCoreInitializable } from "./OFTCoreInitializable.sol";

/**
 * @title MintBurnOFTAdapter
 * @notice A variant of the standard OFT Adapter that uses an existing ERC20's mint and burn mechanisms for cross-chain transfers.
 *
 * @dev Inherits from OFTCore and provides implementations for _debit and _credit functions using a mintable and burnable token.
 */
abstract contract MintBurnOFTAdapterInitializable is OFTCoreInitializable {
    /// @dev The underlying ERC20 token.
    IERC20 internal immutable innerToken;

    /// @notice The contract responsible for minting and burning tokens.
    IMintableBurnable public immutable minterBurner;

    /**
     * @notice Initializes the MintBurnOFTAdapter contract.
     *
     * @param _token The address of the underlying ERC20 token.
     * @param _minterBurner The contract responsible for minting and burning tokens.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The address of the delegate.
     *
     * @dev Calls the OFTCore constructor with the token's decimals, the endpoint, and the delegate.
     */
    constructor(
        address _token,
        IMintableBurnable _minterBurner,
        address _lzEndpoint,
        address _delegate
    ) OFTCoreInitializable(_lzEndpoint, _delegate) {
        _initialize(IERC20Metadata(_token).decimals());
        innerToken = IERC20(_token);
        minterBurner = _minterBurner;
    }

    /**
     * @dev Initialize decimals for the OFTAdapter for ERC-20.
     * @param _localDecimals The decimals of the OFT
     */
    function _initialize(uint8 _localDecimals) internal initializer {
        // Initialize OFTCore with local decimals
        __OFTCore_init(_localDecimals);
    }

    /**
     * @notice Retrieves the address of the underlying ERC20 token.
     *
     * @return The address of the adapted ERC20 token.
     *
     * @dev In the case of MintBurnOFTAdapter, address(this) and erc20 are NOT the same contract.
     */
    function token() public view returns (address) {
        return address(innerToken);
    }

    /**
     * @notice Indicates whether the OFT contract requires approval of the underlying token to send.
     *
     * @return requiresApproval True if approval is required, false otherwise.
     *
     * @dev In this MintBurnOFTAdapter, approval is NOT required because it uses mint and burn privileges.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return false;
    }

    /**
     * @notice Burns tokens from the sender's balance to prepare for sending.
     *
     * @param _from The address to debit the tokens from.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     *
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     *
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, i.e., 1 token in, 1 token out.
     *      If the 'innerToken' applies something like a transfer fee, the default will NOT work.
     *      A pre/post balance check will need to be done to calculate the amountReceivedLD.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        // Burns tokens from the caller.
        minterBurner.burn(_from, amountSentLD);
    }

    /**
     * @notice Mints tokens to the specified address upon receiving them.
     *
     * @param _to The address to credit the tokens to.
     * @param _amountLD The amount of tokens to credit in local decimals.
     *
     * @return amountReceivedLD The amount of tokens actually received in local decimals.
     *
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, i.e., 1 token in, 1 token out.
     *      If the 'innerToken' applies something like a transfer fee, the default will NOT work.
     *      A pre/post balance check will need to be done to calculate the amountReceivedLD.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /* _srcEid */
    ) internal virtual override returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead); // _mint(...) does not support address(0x0)
        // Mints the tokens and transfers to the recipient.
        minterBurner.mint(_to, _amountLD);
        // In the case of NON-default OFTAdapter, the amountLD MIGHT not be equal to amountReceivedLD.
        return _amountLD;
    }
}
