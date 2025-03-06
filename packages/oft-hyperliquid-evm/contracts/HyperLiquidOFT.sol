// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/// @notice This is the only change to the OFTCore contract - HyperLiquidERC20Extended instead of ERC20
import { ERC20HyperliquidHopTransferable } from "./ERC20HyperliquidHopTransferable.sol";
import { OFTCore } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";

/// @title HyperLiquidOFT Contract
///
/// @dev HyperLiquidOFT is an ERC-20 token that extends the functionality of the OFTCore contract.
/// @dev HyperLiquidOFT is a composition contract formed by composing classic OFT, HyperLiquidERC20Extended, and implementing IHyperLiquidComposer.
/// @dev Functionality of classic OFT is preserved, and is for interacting with tokens on the LayerZero network.
/// @dev HyperLiquidERC20Extended extends vanilla ERC-20 standard to include a function for transferring tokens to the HyperLiquid L1 contract
/// @dev IHyperLiquidComposer is an interface that is implemented by HyperLiquidOFT - contains the lzCompose() interface + errors
///
/// @notice HyperLiquid L1 to listen for token transfers and credits them to the `from` address of the Transfer event.
/// @notice This means that transactions sent to HyperEVM that a user wants in the HyperLiquid L1 contract they can either
/// @notice send an lzReceive() and manually transfer to the HyperLiquid L1 system contract (0x2222222222222222222222222222222222222222)
/// @notice OR
/// @notice they can send an lzCompose() and have the HyperLiquidOFT contract transfer to the HyperLiquid L1 system contract.
abstract contract HyperLiquidOFT is OFTCore, ERC20HyperliquidHopTransferable {
    /// @dev Constructor for the OFT contract.
    ///
    /// @param _name The name of the OFT.
    /// @param _symbol The symbol of the OFT.
    /// @param _lzEndpoint The LayerZero endpoint address.
    /// @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ERC20HyperliquidHopTransferable(_name, _symbol) OFTCore(decimals(), _lzEndpoint, _delegate) {}

    /// @dev Retrieves the address of the underlying ERC20 implementation.
    /// @dev In the case of OFT, address(this) and erc20 are the same contract.
    ///
    /// @return The address of the OFT token.
    function token() public view returns (address) {
        return address(this);
    }

    /// @notice Indicates whether the OFT contract requires approval of the 'token()' to send.
    ///
    /// @dev In the case of OFT where the contract IS the token, approval is NOT required.
    ///
    /// @return requiresApproval Needs approval of the underlying token implementation.
    function approvalRequired() external pure virtual returns (bool) {
        return false;
    }

    /// @dev Burns tokens from the sender's specified balance.
    ///
    /// @param _from The address to debit the tokens from.
    /// @param _amountLD The amount of tokens to send in local decimals.
    /// @param _minAmountLD The minimum amount to send in local decimals.
    /// @param _dstEid The destination chain ID.
    ///
    /// @return amountSentLD The amount sent in local decimals.
    /// @return amountReceivedLD The amount received in local decimals on the remote.
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);

        // @dev In NON-default OFT, amountSentLD could be 100, with a 10% fee, the amountReceivedLD amount is 90,
        // therefore amountSentLD CAN differ from amountReceivedLD.

        // @dev Default OFT burns on src.
        _burn(_from, amountSentLD);
    }

    /// @dev Credits tokens to the specified address.
    ///
    /// @param _to The address to credit the tokens to.
    /// @param _amountLD The amount of tokens to credit in local decimals.
    ///
    /// @return amountReceivedLD The amount of tokens ACTUALLY received in local decimals.
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /*_srcEid*/
    ) internal virtual override returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead); // _mint(...) does not support address(0x0)
        // @dev Default OFT mints on dst.
        _mint(_to, _amountLD);
        // @dev In the case of NON-default OFT, the _amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }
}
