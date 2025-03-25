// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/// QUESTIONS
// how does sending several requests work?
// how does the user know which requestId maps to which request?
// do I need to use lzReduce for gathering all the responses?

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OAppReader, MessagingFee, Origin, OAppReceiver } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppReader.sol";
import { ReadCodecV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title Generic omnichain read.
 * @author LayerZeroLabs (@EWCunha).
 * @notice Generic contract that handles cross-chain state reads
 * without the need to set-up security stack and messaging options.
 */
contract OmniRead is OAppReader {
    /// -----------------------------------------------------------------------
    /// Libraries
    /// -----------------------------------------------------------------------

    using OptionsBuilder for bytes;

    /// -----------------------------------------------------------------------
    /// Custom errors
    /// -----------------------------------------------------------------------

    /// @dev Error for when a zero gas limit is passed as a parameter.
    error LZ_OmniRead__ZeroGasLimit();

    /// -----------------------------------------------------------------------
    /// Custom events
    /// -----------------------------------------------------------------------

    event RequestSent(uint256 indexed requestId, bytes callData);
    event RequestCompleted(uint256 indexed requestId);

    /// -----------------------------------------------------------------------
    /// Custom types
    /// -----------------------------------------------------------------------

    struct SimplerEVMCallRequestV1 {
        uint32 targetEid;
        bool isBlockNum;
        uint64 blockNumOrTimestamp;
        uint16 confirmations;
        address to;
        bytes callData;
    }

    /// -----------------------------------------------------------------------
    /// State variables
    /// -----------------------------------------------------------------------

    mapping(uint256 requestId => bytes returnData) public s_returnedData;
    uint256 public s_nextRequestId;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    /**
     * @notice Constructor logic
     * @param endpoint_: LZ endpoint address;
     * @param delegate: address to which permissions are delegated.
     */
    constructor(address endpoint_, address delegate) OAppReader(endpoint_, delegate) Ownable(delegate) {}

    /// -----------------------------------------------------------------------
    /// State-change public/external functions
    /// -----------------------------------------------------------------------

    function read(
        SimplerEVMCallRequestV1[] calldata requests,
        uint128 dstGasLimit,
        uint128 value
    ) external payable returns (MessagingReceipt memory receipt) {
        (MessagingFee memory fee, bytes memory options, bytes memory cmd) = _quoteWithOptions(
            requests,
            dstGasLimit,
            value
        );

        receipt = _lzSend(dstEid, cmd, options, fee, payable(msg.sender));

        emit RequestSent(s_nextRequestId, cmd);
    }

    /// -----------------------------------------------------------------------
    /// State-change internal/private functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Internal function override to handle incoming messages from another chain.
     * @dev _origin A struct containing information about the message sender.
     * @dev _guid A unique global packet identifier for the message.
     * @param returnData The encoded message payload being received.
     *
     * @dev The following params are unused in the current implementation of the OApp.
     * @dev _executor The address of the Executor responsible for processing the message.
     * @dev _extraData Arbitrary data appended by the Executor to the message.
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata returnData,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override(OAppReceiver) {
        uint256 currentRequestId = s_nextRequestId;
        if (returnData.length > 0) {
            s_returnedData[currentRequestId] = returnData;
        }

        unchecked {
            ++s_nextRequestId;
        }

        emit RequestCompleted(currentRequestId);
    }

    /// -----------------------------------------------------------------------
    /// View public/external functions
    /// -----------------------------------------------------------------------

    function quote(
        SimplerEVMCallRequestV1[] calldata requests,
        uint128 dstGasLimit,
        uint128 value
    ) public view returns (MessagingFee memory fee) {
        (fee, , ) = _quoteWithOptions(requests, dstGasLimit, value);
    }

    /// @follow-up: is this needed?
    function lzMap(bytes calldata, bytes calldata _response) external pure returns (bytes memory) {
        return _response;
    }

    /// -----------------------------------------------------------------------
    /// View internal/private functions
    /// -----------------------------------------------------------------------

    function _quoteWithOptions(
        SimplerEVMCallRequestV1[] calldata requests,
        uint128 dstGasLimit,
        uint128 value
    ) internal view returns (MessagingFee memory fee, bytes memory options, bytes memory cmd) {
        if (dstGasLimit == 0) {
            revert LZ_OmniRead__ZeroGasLimit();
        }

        cmd = _getCmd(requests);
        options = OptionsBuilder.newOptions().addExecutorLzReadOption(dstGasLimit, cmd.length, value);
        fee = _quote(dstEid, cmd, options, false);
    }

    function _getCmd(SimplerEVMCallRequestV1[] calldata requests) internal pure returns (bytes memory) {
        EVMCallRequestV1[] memory evmCallRequests = new EVMCallRequestV1[](requests.length);
        for (uint256 i = 0; i < requests.length; i++) {
            evmCallRequests[i] = EVMCallRequestV1({
                appRequestLabel: 0,
                targetEid: requests[i].targetEid,
                isBlockNum: requests[i].isBlockNum,
                blockNumOrTimestamp: requests[i].blockNumOrTimestamp,
                confirmations: requests[i].confirmations,
                to: requests[i].to,
                callData: requests[i].callData
            });
        }

        return ReadCodecV1.encode(0, evmCallRequests); /// @follow-up why 0?
    }
}
