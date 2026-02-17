// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { OFTCore } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";
import { HederaTokenService } from "./HederaTokenService.sol";
import { IHederaTokenService } from "./IHederaTokenService.sol";
import { KeyHelper } from "./KeyHelper.sol";

/**
 * @title HTS Connector for existing token
 * @dev HTSConnectorExistingToken is a contract wrapped for already existing HTS token that extends the functionality of the OFTCore contract.
 */
abstract contract OFTAdapterHTS is OFTCore, KeyHelper, HederaTokenService {
    address public htsTokenAddress;

    /**
     * @dev Constructor for the HTSConnectorExistingToken contract.
     * @param _tokenAddress Address of already existing HTS token
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        address _tokenAddress,
        address _lzEndpoint,
        address _delegate
    ) payable OFTCore(8, _lzEndpoint, _delegate) {
        htsTokenAddress = _tokenAddress;
    }

    /**
     * @dev Retrieves the address of the underlying HTS implementation.
     * @return The address of the HTS token.
     */
    function token() public view returns (address) {
        return htsTokenAddress;
    }

    /**
     * @notice Indicates whether the HTS Connector contract requires approval of the 'token()' to send.
     * @return requiresApproval Needs approval of the underlying token implementation.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return false;
    }

    /**
     * @dev Burns tokens from the sender's specified balance.
     * @param _from The address to debit the tokens from.
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
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);

        int256 transferResponse = HederaTokenService.transferToken(htsTokenAddress, _from, address(this), int64(uint64(_amountLD)));
        require(transferResponse == HederaTokenService.SUCCESS_CODE, "HTS: Transfer failed");

        (int256 response,) = HederaTokenService.burnToken(htsTokenAddress, int64(uint64(amountSentLD)), new int64[](0));
        require(response == HederaTokenService.SUCCESS_CODE, "HTS: Burn failed");
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
        uint32 /*_srcEid*/
    ) internal virtual override returns (uint256) {
        (int256 response, ,) = HederaTokenService.mintToken(htsTokenAddress, int64(uint64(_amountLD)), new bytes[](0));
        require(response == HederaTokenService.SUCCESS_CODE, "HTS: Mint failed");

        int256 transferResponse = HederaTokenService.transferToken(htsTokenAddress, address(this), _to, int64(uint64(_amountLD)));
        require(transferResponse == HederaTokenService.SUCCESS_CODE, "HTS: Transfer failed");

        return _amountLD;
    }
}