// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { HyperLiquidComposerCodec } from "../../contracts/library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposerErrors, ErrorMessagePayload } from "../../contracts/interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperLiquidComposerCore } from "../../contracts/interfaces/IHyperLiquidComposerCore.sol";

import { HyperLiquidComposer } from "../../contracts/HyperLiquidComposer.sol";
import { OFTMock } from "../mocks/OFTMock.sol";

import { Test, console } from "forge-std/Test.sol";

contract ComposeMessageTest is Test {
    using HyperLiquidComposerCodec for bytes;

    uint256 public constant DEFAULT_AMOUNT = 1e18;

    IHyperAsset public ALICE;
    IHyperAsset public HYPE;
    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;

    OFTMock public oft;
    HyperLiquidComposer public hyperLiquidComposer;

    address public sender;

    function setUp() public {
        // Skip test if fork fails
        try vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm") {} catch {
            console.log("Forking testnet https://rpc.hyperliquid-testnet.xyz/evm failed");
            vm.skip(true);
        }

        sender = makeAddr("sender");

        ALICE = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1231),
            coreIndexId: 1231,
            decimalDiff: 18 - 6
        });

        HYPE = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: 1105,
            decimalDiff: 18 - 10
        });

        oft = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);

        hyperLiquidComposer = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2,
            address(oft),
            ALICE.coreIndexId,
            ALICE.decimalDiff
        );
    }

    function test_validateAndDecodeMessage_EncodingVariants(address _receiver, bool _useEncodePacked) public view {
        vm.assume(_receiver != address(0));

        bytes memory encodedReceiver = _useEncodePacked ? abi.encodePacked(_receiver) : abi.encode(_receiver);
        bytes memory encodedMessage = abi.encode(1 ether, encodedReceiver);

        bytes memory message = _createMessage(encodedMessage, DEFAULT_AMOUNT, "");

        (uint256 _minMsgValue, address decodedReceiver, uint256 decodedAmount) = this.validateAndDecodeMessage(message);
        assertEq(_minMsgValue, 1 ether);
        assertEq(decodedReceiver, _receiver);
        assertEq(decodedAmount, DEFAULT_AMOUNT);
    }

    function _createMessage(
        bytes memory _receiver,
        uint256 _amount,
        bytes memory _noise
    ) internal view returns (bytes memory) {
        bytes memory payload = bytes.concat(addressToBytes32(sender), _receiver, _noise);
        return OFTComposeMsgCodec.encode(0, 0, _amount, payload);
    }

    function validateAndDecodeMessage(
        bytes calldata _message
    ) public view returns (uint256 _minMsgValue, address _receiver, uint256 _amountLD) {
        bytes memory maybeReceiver = OFTComposeMsgCodec.composeMsg(_message);
        bytes32 senderBytes32 = OFTComposeMsgCodec.composeFrom(_message);

        _amountLD = OFTComposeMsgCodec.amountLD(_message);
        (_minMsgValue, _receiver) = hyperLiquidComposer.validate_msg_or_refund(maybeReceiver, senderBytes32, _amountLD);
    }

    function composeMsg(bytes calldata _message) public pure returns (bytes memory) {
        return OFTComposeMsgCodec.composeMsg(_message);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function createErrorMessage(address _to, uint256 _amount, bytes memory _reason) public pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                IHyperLiquidComposerErrors.ErrorMsg.selector,
                _reason.createErrorMessage(_to, _amount)
            );
    }
}
