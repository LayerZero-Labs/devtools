// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IHyperLiquidComposerErrors } from "../contracts/interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperLiquidComposerCore, FailedMessage } from "../contracts/interfaces/IHyperLiquidComposerCore.sol";

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { NoFallback } from "./mocks/NoFallback.sol";
import { OFTMock } from "./mocks/OFTMock.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";

contract HyperLiquidComposerRefundTest is Test {
    IHyperAsset public ALICE;
    IHyperAsset public HYPE;
    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;
    address public constant HLP_CORE_WRITER = 0x3333333333333333333333333333333333333333;
    address public constant HLP_PRECOMPILE_READ_SPOT_BALANCE = 0x0000000000000000000000000000000000000801;

    // Ethereum Sepolia
    uint32 public constant SRC_EID = 40161;
    // HyperLiquid Testnet
    uint32 public DST_EID;

    OFTMock public oft;
    HyperLiquidComposer public hyperLiquidComposer;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    uint64 public constant AMOUNT_TO_SEND = 1e18;
    uint64 public constant AMOUNT_TO_SEND_OVERFLOW = 1 wei;
    uint64 public constant AMOUNT_TO_FUND = 100 gwei + AMOUNT_TO_SEND_OVERFLOW;

    function setUp() public {
        // Skip test if fork fails
        try vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm") {} catch {
            console.log("Forking testnet https://rpc.hyperliquid-testnet.xyz/evm failed");
            vm.skip(true);
        }

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

        vm.etch(HLP_PRECOMPILE_READ_SPOT_BALANCE, address(new SpotBalancePrecompileMock()).code);
        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ALICE.assetBridgeAddress,
            ALICE.coreIndexId,
            type(uint64).max
        );

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            HYPE.assetBridgeAddress,
            HYPE.coreIndexId,
            type(uint64).max
        );

        oft = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);

        hyperLiquidComposer = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2,
            address(oft),
            ALICE.coreIndexId,
            ALICE.decimalDiff,
            userA
        );
        DST_EID = oft.endpoint().eid();

        vm.deal(HL_LZ_ENDPOINT_V2, 100 ether);
    }

    function test_malformed_payload() public {
        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);

        bytes memory composerMsg_ = "";

        uint256 preBalance_endpoint = address(HL_LZ_ENDPOINT_V2).balance;

        vm.expectRevert();
        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose{ value: AMOUNT_TO_FUND }(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), AMOUNT_TO_SEND);
        assertEq(address(hyperLiquidComposer).balance, 0);
        assertEq(address(HL_LZ_ENDPOINT_V2).balance, preBalance_endpoint);
    }

    function test_non_evm_sender_malformed_receiver() public {
        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);

        bytes memory composeMsg = abi.encode(AMOUNT_TO_FUND, abi.encodePacked(userB, "error"));

        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            AMOUNT_TO_SEND,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose{ value: AMOUNT_TO_FUND }(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        (SendParam memory refundSendParam, uint256 msgValue) = hyperLiquidComposer.failedMessages(bytes32(0));
        assertEq(refundSendParam.to, addressToBytes32(userA));
        assertEq(refundSendParam.amountLD, AMOUNT_TO_SEND);
        assertEq(msgValue, AMOUNT_TO_FUND);
    }

    function test_erc20_refund_sender_malformed_receiver() public {
        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);

        bytes memory composeMsg = abi.encode(0, "error");

        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            AMOUNT_TO_SEND,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        (SendParam memory refundSendParam, uint256 msgValue) = hyperLiquidComposer.failedMessages(bytes32(0));
        assertEq(refundSendParam.to, addressToBytes32(userA));
        assertEq(refundSendParam.amountLD, AMOUNT_TO_SEND);
        assertEq(msgValue, 0);
    }

    /// forge-config: default.fuzz.runs = 128
    function test_erc20_refund_receiver_excessive_amount(uint64 _exceedAmountBy) public {
        _exceedAmountBy = uint64(bound(_exceedAmountBy, 0, type(uint64).max - 10 ether));

        uint256 totalTransferAmount = AMOUNT_TO_SEND + _exceedAmountBy;
        deal(address(oft), address(hyperLiquidComposer), totalTransferAmount);

        uint256 scaleAliceDecimalDiff = 10 ** uint64(ALICE.decimalDiff);

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ALICE.assetBridgeAddress,
            ALICE.coreIndexId,
            uint64(AMOUNT_TO_SEND / scaleAliceDecimalDiff)
        );

        bytes memory composeMsg = abi.encode(0, userB);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            totalTransferAmount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, AMOUNT_TO_SEND);
        // Triggers when dust > 0
        if (_exceedAmountBy > 0) {
            emit IERC20.Transfer(address(hyperLiquidComposer), userB, _exceedAmountBy);
        }

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
        assertEq(oft.balanceOf(userB), _exceedAmountBy);
    }

    /// forge-config: default.fuzz.runs = 128
    function test_native_refund_receiver_excessive_amount_no_fallback(uint64 _exceedAmountBy) public {
        _exceedAmountBy = uint64(bound(_exceedAmountBy, 0, type(uint64).max - 10 ether));

        uint256 totalTransferAmount = AMOUNT_TO_SEND + _exceedAmountBy;
        deal(address(oft), address(hyperLiquidComposer), totalTransferAmount);

        address noFallback = address(new NoFallback());
        uint256 scaleAliceDecimalDiff = 10 ** uint64(ALICE.decimalDiff);

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ALICE.assetBridgeAddress,
            ALICE.coreIndexId,
            uint64(AMOUNT_TO_SEND / scaleAliceDecimalDiff)
        );

        bytes memory composeMsg = abi.encode(AMOUNT_TO_FUND, noFallback);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            totalTransferAmount,
            abi.encodePacked(addressToBytes32(noFallback), composeMsg)
        );

        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, AMOUNT_TO_SEND);
        // Triggers when dust > 0
        if (_exceedAmountBy > 0) {
            emit IERC20.Transfer(address(hyperLiquidComposer), noFallback, _exceedAmountBy);
        }

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        uint256 preBalance_txOrigin = tx.origin.balance;
        hyperLiquidComposer.lzCompose{ value: AMOUNT_TO_FUND }(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        assertEq(tx.origin.balance, preBalance_txOrigin + AMOUNT_TO_SEND_OVERFLOW);
        vm.stopPrank();

        assertEq(oft.balanceOf(noFallback), _exceedAmountBy);

        assertEq(address(hyperLiquidComposer).balance, 0);
        assertEq(noFallback.balance, 0);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function getComposeMessage(bytes calldata _composerMsg) external pure returns (bytes memory) {
        return OFTComposeMsgCodec.composeMsg(_composerMsg);
    }
}
