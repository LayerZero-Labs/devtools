// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import { IHederaTokenService } from "./IHederaTokenService.sol";

abstract contract HederaTokenService {
    // all response codes are defined here https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/HederaResponseCodes.sol
    int32 constant UNKNOWN_CODE = 21;
    int32 constant SUCCESS_CODE = 22;

    address constant precompileAddress = address(0x167);
    // 90 days in seconds
    int32 constant defaultAutoRenewPeriod = 7776000;

    modifier nonEmptyExpiry(IHederaTokenService.HederaToken memory token) {
        if (token.expiry.second == 0 && token.expiry.autoRenewPeriod == 0) {
            token.expiry.autoRenewPeriod = defaultAutoRenewPeriod;
        }
        _;
    }

    /// Generic event
    event CallResponseEvent(bool, bytes);

    /// Mints an amount of the token to the defined treasury account
    /// @param token The token for which to mint tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount Applicable to tokens of type FUNGIBLE_COMMON. The amount to mint to the Treasury Account.
    ///               Amount must be a positive non-zero number represented in the lowest denomination of the
    ///               token. The new supply must be lower than 2^63.
    /// @param metadata Applicable to tokens of type NON_FUNGIBLE_UNIQUE. A list of metadata that are being created.
    ///                 Maximum allowed size of each metadata is 100 bytes
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs it is the total count of NFTs
    /// @return serialNumbers If the token is an NFT the newly generate serial numbers, otherwise empty.
    function mintToken(
        address token,
        int64 amount,
        bytes[] memory metadata
    )
        internal
        returns (
            int responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        )
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.mintToken.selector,
                token,
                amount,
                metadata
            )
        );
        (responseCode, newTotalSupply, serialNumbers) = success
            ? abi.decode(result, (int32, int64, int64[]))
            : (HederaTokenService.UNKNOWN_CODE, int64(0), new int64[](0));
    }

    /// Burns an amount of the token from the defined treasury account
    /// @param token The token for which to burn tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount  Applicable to tokens of type FUNGIBLE_COMMON. The amount to burn from the Treasury Account.
    ///                Amount must be a positive non-zero number, not bigger than the token balance of the treasury
    ///                account (0; balance], represented in the lowest denomination.
    /// @param serialNumbers Applicable to tokens of type NON_FUNGIBLE_UNIQUE. The list of serial numbers to be burned.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs it is the total count of NFTs
    function burnToken(
        address token,
        int64 amount,
        int64[] memory serialNumbers
    ) internal returns (int responseCode, int64 newTotalSupply) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.burnToken.selector,
                token,
                amount,
                serialNumbers
            )
        );
        (responseCode, newTotalSupply) = success
            ? abi.decode(result, (int32, int64))
            : (HederaTokenService.UNKNOWN_CODE, int64(0));
    }

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The
    /// initial supply is sent to the Treasury Account. The supply is in the lowest denomination possible.
    /// @param decimals the number of decimal places a token is divisible by
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleToken(
        IHederaTokenService.HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    )
        internal
        nonEmptyExpiry(token)
        returns (int responseCode, address tokenAddress)
    {
        (bool success, bytes memory result) = precompileAddress.call{
            value: msg.value
        }(
            abi.encodeWithSelector(
                IHederaTokenService.createFungibleToken.selector,
                token,
                initialTotalSupply,
                decimals
            )
        );

        (responseCode, tokenAddress) = success
            ? abi.decode(result, (int32, address))
            : (HederaTokenService.UNKNOWN_CODE, address(0));
    }

    /// Transfers tokens where the calling account/contract is implicitly the first entry in the token transfer list,
    /// where the amount is the value needed to zero balance the transfers. Regular signing rules apply for sending
    /// (positive amount) or receiving (negative amount)
    /// @param token The token to transfer to/from
    /// @param sender The sender for the transaction
    /// @param receiver The receiver of the transaction
    /// @param amount Non-negative value to send. a negative value will result in a failure.
    function transferToken(
        address token,
        address sender,
        address receiver,
        int64 amount
    ) internal returns (int responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(
                IHederaTokenService.transferToken.selector,
                token,
                sender,
                receiver,
                amount
            )
        );
        responseCode = success
            ? abi.decode(result, (int32))
            : HederaTokenService.UNKNOWN_CODE;
    }

    /// Operation to update token keys
    /// @param token The token address
    /// @param keys The token keys
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenKeys(address token, IHederaTokenService.TokenKey[] memory keys)
    internal returns (int64 responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenKeys.selector, token, keys));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaTokenService.UNKNOWN_CODE;
    }

}