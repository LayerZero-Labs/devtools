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

import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { OFTMock } from "./mocks/OFTMock.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";

contract HyperLiquidComposerTest is Test {
    IHyperAsset public ALICE;
    IHyperAsset public HYPE;
    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;

    address public constant HL_LZ_ENDPOINT_V2_TESTNET = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;
    address public constant HL_LZ_ENDPOINT_V2_MAINNET = 0x3A73033C0b1407574C76BdBAc67f126f6b4a9AA9;

    address public constant HLP_PRECOMPILE_WRITE = 0x3333333333333333333333333333333333333333;
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
    uint64 public constant AMOUNT_TO_FUND = 100 gwei;
    uint64 public constant DUST = 1 wei;

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
            ALICE.decimalDiff
        );
        DST_EID = oft.endpoint().eid();

        vm.deal(HL_LZ_ENDPOINT_V2, 100 ether);
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

    function test_hypeIndexByChainId_testnet() public {
        vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm");

        OFTMock oftTestnet = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2_TESTNET, msg.sender);
        HyperLiquidComposer hypeComposerTestnet = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2_TESTNET,
            address(oftTestnet),
            ALICE.coreIndexId,
            ALICE.decimalDiff
        );

        assertEq(hypeComposerTestnet.hypeIndexByChainId(998), 1105);
    }

    function test_hypeIndexByChainId_mainnet() public {
        vm.createSelectFork("https://rpc.hyperliquid.xyz/evm");

        OFTMock oftMainnet = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2_MAINNET, msg.sender);
        HyperLiquidComposer hypeComposerMainnet = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2_MAINNET,
            address(oftMainnet),
            ALICE.coreIndexId,
            ALICE.decimalDiff
        );

        assertEq(hypeComposerMainnet.hypeIndexByChainId(999), 150);
    }

    function test_SendSpot_no_FundAddress() public {
        bytes memory composeMsg = abi.encodePacked(userB);

        // Build composerMsg similar to the outcome of OFTCore.send()
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            AMOUNT_TO_SEND + DUST,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND + DUST);

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), AMOUNT_TO_SEND + DUST);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, AMOUNT_TO_SEND);

        // Expect the SpotSend event to be emitted
        vm.expectEmit(hyperLiquidComposer.HLP_PRECOMPILE_WRITE());
        emit IHyperLiquidWritePrecompile.SpotSend(
            address(hyperLiquidComposer),
            userB,
            ALICE.coreIndexId,
            uint64(AMOUNT_TO_SEND / 10 ** uint64(ALICE.decimalDiff))
        );

        uint256 balanceBefore = oft.balanceOf(userB);

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
        assertEq(oft.balanceOf(userB), balanceBefore + DUST);
    }

    function test_SendSpot_and_FundAddress() public {
        bytes memory composeMsg = abi.encodePacked(userB);

        // Build composerMsg similar to the outcome of OFTCore.send()
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            AMOUNT_TO_SEND,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);
        assertEq(oft.balanceOf(address(hyperLiquidComposer)), AMOUNT_TO_SEND);

        // Expect the Received event to be emitted - this is for the HYPE precompile
        vm.expectEmit(hyperLiquidComposer.getHypeAsset().assetBridgeAddress);
        emit IHYPEPrecompile.Received(address(hyperLiquidComposer), AMOUNT_TO_FUND);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ALICE.assetBridgeAddress, AMOUNT_TO_SEND);

        // Expect the SpotSend event to be emitted - this is for the ALICE asset bridge
        vm.expectEmit(hyperLiquidComposer.HLP_PRECOMPILE_WRITE());
        emit IHyperLiquidWritePrecompile.SpotSend(
            address(hyperLiquidComposer),
            userB,
            ALICE.coreIndexId,
            uint64(AMOUNT_TO_SEND / 10 ** uint64(ALICE.decimalDiff))
        );

        uint256 balanceBeforeBridge = HYPE.assetBridgeAddress.balance;
        uint256 balanceBeforeUserB = userB.balance;

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose{ value: AMOUNT_TO_FUND + DUST }(
            address(oft),
            bytes32(0),
            composerMsg_,
            msg.sender,
            ""
        );
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
        assertEq(HYPE.assetBridgeAddress.balance, balanceBeforeBridge + AMOUNT_TO_FUND);
        assertEq(userB.balance, balanceBeforeUserB + DUST);
    }

    function test_getBalanceOfHyperCore(uint64 _balance) public {
        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            HYPE.assetBridgeAddress,
            HYPE.coreIndexId,
            _balance
        );

        uint64 balance = hyperLiquidComposer.balanceOfHyperCore(HYPE.assetBridgeAddress, HYPE.coreIndexId);
        assertEq(balance, _balance);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}
