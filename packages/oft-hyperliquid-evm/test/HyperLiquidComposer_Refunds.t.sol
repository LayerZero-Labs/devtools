// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IHyperLiquidComposerErrors } from "../contracts/interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperLiquidComposerCore } from "../contracts/interfaces/IHyperLiquidComposerCore.sol";

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposer, IHyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { OFTMock } from "./mocks/OFTMock.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";

contract HyperLiquidComposerRefundsTest is Test {
    IHyperAsset public ALICE;
    IHyperAsset public HYPE;
    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;
    address public constant L1WritePrecompileAddress = 0x3333333333333333333333333333333333333333;
    address public constant L1ReadPrecompileAddress_SpotBalance = 0x0000000000000000000000000000000000000801;
    // Ethereum Sepolia
    uint32 public constant SRC_EID = 40161;
    // HyperLiquid Testnet
    uint32 public DST_EID;

    OFTMock internal oft;
    HyperLiquidComposer internal hyperLiquidComposer;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    uint64 public constant amount = 1e18;
    uint64 public constant amountToFund = 100 gwei;

    function setUp() public {
        vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm");

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

        vm.etch(L1ReadPrecompileAddress_SpotBalance, address(new SpotBalancePrecompileMock()).code);
        SpotBalancePrecompileMock(L1ReadPrecompileAddress_SpotBalance).setSpotBalance(
            ALICE.assetBridgeAddress,
            ALICE.coreIndexId,
            type(uint64).max
        );

        SpotBalancePrecompileMock(L1ReadPrecompileAddress_SpotBalance).setSpotBalance(
            HYPE.assetBridgeAddress,
            HYPE.coreIndexId,
            type(uint64).max
        );

        oft = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);

        hyperLiquidComposer = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2,
            address(oft),
            ALICE.coreIndexId,
            ALICE.decimalDiff
        );
        DST_EID = oft.endpoint().eid();

        vm.deal(HL_LZ_ENDPOINT_V2, 100 ether);

        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), amount);
    }
    function test_refund_sender_malformed_receiver() public {
        bytes memory composeMsg = abi.encodePacked(userB, "error");

        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            amount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        bytes memory message = this.getComposeMessage(composerMsg_);
        bytes memory expectedErrorMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength.selector,
            message,
            message.length
        );

        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), userA, amount);

        vm.expectEmit(address(hyperLiquidComposer));
        emit IHyperLiquidComposerCore.errorRefund(userA, amount);
        emit IHyperLiquidComposer.errorMessage(expectedErrorMessage);

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
        assertEq(oft.balanceOf(userA), amount);
    }

    function test_refund_receiver_excessive_amount(uint64 _exceedAmountBy) public {
        _exceedAmountBy = uint64(bound(_exceedAmountBy, 0, type(uint64).max - 10 ether));
        uint256 totalTransferAmount = amount + _exceedAmountBy;
        deal(address(oft), address(hyperLiquidComposer), totalTransferAmount);
        uint256 scaleAliceDecimalDiff = 10 ** ALICE.decimalDiff;

        SpotBalancePrecompileMock(L1ReadPrecompileAddress_SpotBalance).setSpotBalance(
            ALICE.assetBridgeAddress,
            ALICE.coreIndexId,
            uint64(amount / scaleAliceDecimalDiff)
        );

        bytes memory composeMsg = abi.encodePacked(userB);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            totalTransferAmount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        uint256 normalizedTotalTransferAmount = totalTransferAmount - (totalTransferAmount % scaleAliceDecimalDiff);
        if (normalizedTotalTransferAmount > amount) {
            vm.expectEmit(address(hyperLiquidComposer));
            emit HyperLiquidComposerCodec.OverflowDetected(
                uint64(totalTransferAmount / scaleAliceDecimalDiff),
                uint64(1 ether / scaleAliceDecimalDiff)
            );
        }

        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, amount);
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

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function getComposeMessage(bytes calldata _composerMsg) external pure returns (bytes memory) {
        return OFTComposeMsgCodec.composeMsg(_composerMsg);
    }
}
