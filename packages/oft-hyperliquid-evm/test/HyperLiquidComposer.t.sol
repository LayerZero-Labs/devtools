// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IHyperAsset } from "../contracts/interfaces/IHyperLiquidComposerCore.sol";
import { IHyperLiquidWritePrecompile } from "../contracts/interfaces/IHyperLiquidWritePrecompile.sol";
import { IHYPEPrecompile } from "../contracts/interfaces/IHYPEPrecompile.sol";

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

import { HyperLiquidComposer, IHyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { OFTMock } from "./mocks/OFTMock.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";

contract HyperLiquidComposerTest is Test {
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

    function test_deployment() public view {
        IHyperAsset memory hypeAsset = hyperLiquidComposer.getHypeAsset();
        assertEq(hypeAsset.assetBridgeAddress, 0x2222222222222222222222222222222222222222);
        assertEq(hypeAsset.coreIndexId, 1105);
        assertEq(hypeAsset.decimalDiff, 10);

        IHyperAsset memory oftAsset = hyperLiquidComposer.getOFTAsset();
        assertEq(oftAsset.assetBridgeAddress, ALICE.assetBridgeAddress);
        assertEq(oftAsset.coreIndexId, ALICE.coreIndexId);
        assertEq(oftAsset.decimalDiff, ALICE.decimalDiff);
    }

    function test_SendSpot_no_FundAddress() public {
        bytes memory composeMsg = abi.encodePacked(userB);

        // Build composerMsg similar to the outcome of OFTCore.send()
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            amount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), amount);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, amount);

        // Expect the SpotSend event to be emitted
        vm.expectEmit(hyperLiquidComposer.L1WritePrecompileAddress());
        emit IHyperLiquidWritePrecompile.SpotSend(
            address(hyperLiquidComposer),
            userB,
            ALICE.coreIndexId,
            uint64(amount / 10 ** ALICE.decimalDiff)
        );

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
    }

    function test_SendSpot_and_FundAddress() public {
        bytes memory composeMsg = abi.encodePacked(userB);

        // Build composerMsg similar to the outcome of OFTCore.send()
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            amount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), amount);

        // Expect the Received event to be emitted - this is for the HYPE precompile
        vm.expectEmit(hyperLiquidComposer.getHypeAsset().assetBridgeAddress);
        emit IHYPEPrecompile.Received(address(hyperLiquidComposer), amountToFund);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, amount);

        // Expect the SpotSend event to be emitted - this is for the ALICE asset bridge
        vm.expectEmit(hyperLiquidComposer.L1WritePrecompileAddress());
        emit IHyperLiquidWritePrecompile.SpotSend(
            address(hyperLiquidComposer),
            userB,
            ALICE.coreIndexId,
            uint64(amount / 10 ** ALICE.decimalDiff)
        );

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose{ value: amountToFund }(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}
