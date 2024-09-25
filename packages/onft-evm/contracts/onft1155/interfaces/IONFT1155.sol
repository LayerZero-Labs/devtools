// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

struct SendParam {
    uint32 dstEid;
    bytes32 to;
    uint256[] tokenIds;
    uint256[] amounts;
    bytes extraOptions;
    bytes composeMessage;
    bytes onftCmd;
}

interface IONFT1155 {
    /**
     * @notice Retrieves interfaceID and the version of the ONFT.
     * @return interfaceId The interface ID.
     * @return version The version.
     *
     * @dev interfaceId: This specific interface ID is 'a72f5dd8'.
     * @dev version: Indicates a cross-chain compatible msg encoding with other ONFTs.
     * @dev If a new feature is added to the ONFT cross-chain msg encoding, the version will be incremented.
     * ie. localONFT version(x,1) CAN send messages to remoteONFT version(x,1)
     */
    function onftVersion() external view returns (bytes4 interfaceId, uint64 version);

    /**
     * @notice Retrieves the address of the token associated with the ONFT.
     * @return token The address of the ERC721 token implementation.
     */
    function token() external view returns (address);

    function quoteSend(SendParam calldata _sendParam, bool _payInLzToken) external view returns (MessagingFee memory);

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory);
}
