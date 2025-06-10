// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { IHyperLiquidComposerErrors } from "../contracts/interfaces/IHyperLiquidComposerErrors.sol";
import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";
import { IHyperAsset } from "../contracts/interfaces/IHyperLiquidComposerCore.sol";
import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

import { OFTMock } from "./mocks/OFTMock.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";

contract HyperLiquidComposerRevertTest is Test {
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

        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);
    }

    function test_unauthorized_call_not_endpoint() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotEndpoint.selector,
            address(HL_LZ_ENDPOINT_V2),
            address(this)
        );

        vm.expectRevert(revertMessage);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), "", msg.sender, "");
    }

    function test_unauthorized_call_not_oft() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotOFT.selector,
            address(oft),
            address(0)
        );
        vm.expectRevert(revertMessage, address(hyperLiquidComposer));

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(0), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }

    function test_panic_invalid_message() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidComposeMessage.selector,
            ""
        );
        vm.expectRevert(revertMessage, address(hyperLiquidComposer));

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }
}
