// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { HyperLiquidComposer, IHyperAsset } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperLiquidComposer.sol";
import { IHyperLiquidWritePrecompile } from "@layerzerolabs/oft-hyperliquid-evm/contracts/interfaces/IHyperLiquidWritePrecompile.sol";

import { HyperLiquidComposerCodec } from "@layerzerolabs/oft-hyperliquid-evm/contracts/library/HyperLiquidComposerCodec.sol";

import { IHYPEPrecompile } from "@layerzerolabs/oft-hyperliquid-evm/contracts/interfaces/IHYPEPrecompile.sol";
import { HypePrecompileMock } from "@layerzerolabs/oft-hyperliquid-evm/test/mocks/HypePrecompileMock.sol";
import { SpotBalancePrecompileMock } from "@layerzerolabs/oft-hyperliquid-evm/test/mocks/SpotBalancePrecompileMock.sol";

import { OFTMock } from "./mocks/OFTMock.sol";

contract HyperLiquidComposerTest is Test {
    IHyperAsset public OFT;
    IHyperAsset public HYPE;

    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;

    // Ethereum Sepolia
    uint32 public constant SRC_EID = 40161;
    // HyperLiquid Testnet
    uint32 public DST_EID;

    OFTMock internal oft;
    HyperLiquidComposer internal hyperLiquidComposer;
    SpotBalancePrecompileMock internal spotBalancePrecompileMock;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    uint256 public constant amount = 1 ether;
    uint256 public constant amountToFund = 100 gwei;

    address public constant HYPERLIQUID_PRECOMPILE = 0x2222222222222222222222222222222222222222;
    address public constant SPOT_BALANCE_PRECOMPILE = 0x0000000000000000000000000000000000000801;

    uint64 public aliceHlIndexId = 1231;
    uint64 public hypeHlIndexId = 1105;
    function setUp() public {
        vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm");

        HypePrecompileMock hypePrecompileMock = new HypePrecompileMock();
        vm.etch(HYPERLIQUID_PRECOMPILE, address(hypePrecompileMock).code);

        SpotBalancePrecompileMock temp_spotBalancePrecompileMock = new SpotBalancePrecompileMock();
        vm.etch(SPOT_BALANCE_PRECOMPILE, address(temp_spotBalancePrecompileMock).code);
        spotBalancePrecompileMock = SpotBalancePrecompileMock(SPOT_BALANCE_PRECOMPILE);

        OFT = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1231),
            coreIndexId: 1231,
            decimalDiff: 18 - 6
        });

        HYPE = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: 1105,
            decimalDiff: 18 - 8
        });

        spotBalancePrecompileMock.setSpotBalance(OFT.assetBridgeAddress, OFT.coreIndexId, type(uint64).max);
        spotBalancePrecompileMock.setSpotBalance(HYPE.assetBridgeAddress, HYPE.coreIndexId, type(uint64).max);

        oft = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);
        hyperLiquidComposer = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2,
            address(oft),
            OFT.coreIndexId,
            OFT.decimalDiff
        );
        DST_EID = oft.endpoint().eid();

        vm.deal(HL_LZ_ENDPOINT_V2, 100 ether);
    }

    function test_deployment() public view {
        IHyperAsset memory hypeAsset = hyperLiquidComposer.getHypeAsset();
        assertEq(hypeAsset.assetBridgeAddress, HYPE.assetBridgeAddress);
        assertEq(hypeAsset.coreIndexId, HYPE.coreIndexId);
        assertEq(hypeAsset.decimalDiff, HYPE.decimalDiff);

        IHyperAsset memory oftAsset = hyperLiquidComposer.getOFTAsset();
        assertEq(oftAsset.assetBridgeAddress, OFT.assetBridgeAddress);
        assertEq(oftAsset.coreIndexId, OFT.coreIndexId);
        assertEq(oftAsset.decimalDiff, OFT.decimalDiff);

        assertEq(spotBalancePrecompileMock.balanceOf(OFT.assetBridgeAddress, OFT.coreIndexId), type(uint64).max);
        assertEq(spotBalancePrecompileMock.balanceOf(HYPE.assetBridgeAddress, HYPE.coreIndexId), type(uint64).max);
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

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);

        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), amount);

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), amount);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), OFT.assetBridgeAddress, amount);

        // Expect the SpotSend event to be emitted
        vm.expectEmit(hyperLiquidComposer.L1WritePrecompileAddress());
        emit IHyperLiquidWritePrecompile.SpotSend(
            address(hyperLiquidComposer),
            userB,
            OFT.coreIndexId,
            uint64(amount / 10 ** OFT.decimalDiff)
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

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);

        // Mocks the lzReceive call that mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), amount);

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), amount);

        // Expect the Received event to be emitted - this is for the HYPE precompile
        vm.expectEmit(hyperLiquidComposer.getHypeAsset().assetBridgeAddress);
        emit IHYPEPrecompile.Received(address(hyperLiquidComposer), amountToFund);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), OFT.assetBridgeAddress, amount);

        // Expect the SpotSend event to be emitted - this is for the OFT asset bridge
        vm.expectEmit(hyperLiquidComposer.L1WritePrecompileAddress());
        emit IHyperLiquidWritePrecompile.SpotSend(
            address(hyperLiquidComposer),
            userB,
            OFT.coreIndexId,
            uint64(amount / 10 ** OFT.decimalDiff)
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
