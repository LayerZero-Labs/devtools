// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IHyperAsset } from "@layerzerolabs/hyperliquid-composer/contracts/interfaces/IHyperLiquidComposerCore.sol";
import { IHYPEPrecompile } from "@layerzerolabs/hyperliquid-composer/contracts/interfaces/IHYPEPrecompile.sol";
import { ICoreWriter } from "@layerzerolabs/hyperliquid-composer/contracts/interfaces/ICoreWriter.sol";

import { MyOFT } from "../../contracts/MyOFT.sol";
import { SpotBalancePrecompileMock } from "@layerzerolabs/hyperliquid-composer/test/mocks/SpotBalancePrecompileMock.sol";

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";

import { HyperliquidBaseTest } from "@layerzerolabs/hyperliquid-composer/test/HyperliquidBase.t.sol";
import { console } from "forge-std/Test.sol";

contract HyperLiquidComposerTest is HyperliquidBaseTest {
    function setUp() public override {
        super.setUp();
    }

    function test_deployment() public view {
        (uint64 coreIndexId, int64 decimalDiff, address assetBridgeAddress) = hyperLiquidComposer.hypeAsset();
        assertEq(assetBridgeAddress, 0x2222222222222222222222222222222222222222);
        uint256 expectedHypeCoreIndexId = block.chainid == 998 ? 1105 : 150;
        assertEq(coreIndexId, expectedHypeCoreIndexId);
        assertEq(decimalDiff, 10);

        (uint64 oftCoreIndexId, int64 oftDecimalDiff, address oftAssetBridgeAddress) = hyperLiquidComposer.oftAsset();
        assertEq(oftAssetBridgeAddress, ERC20.assetBridgeAddress);
        assertEq(oftCoreIndexId, ERC20.coreIndexId);
        assertEq(oftDecimalDiff, ERC20.decimalDiff);
    }

    function test_hypeIndexByChainId_testnet() public {
        string memory rpcUrl = "https://rpc.hyperliquid-testnet.xyz/evm";

        try vm.envString("RPC_URL_HYPERLIQUID_TESTNET") returns (string memory _rpcUrl) {
            rpcUrl = _rpcUrl;
        } catch {
            console.log("Using default testnet RPC URL");
        }
        // Skip test if fork fails
        try vm.createSelectFork(rpcUrl) {} catch {
            console.log("Forking testnet ", rpcUrl, " failed");
            vm.skip(true);
        }

        MyOFT oftTestnet = new MyOFT("test", "test", HL_LZ_ENDPOINT_V2_TESTNET, msg.sender);
        HyperLiquidComposer hypeComposerTestnet = new HyperLiquidComposer(
            address(oftTestnet),
            ERC20.coreIndexId,
            ERC20.decimalDiff,
            recovery
        );

        assertEq(hypeComposerTestnet.hypeIndexByChainId(998), 1105);
    }

    function test_hypeIndexByChainId_mainnet() public {
        string memory rpcUrl = "https://rpc.hyperliquid.xyz/evm";
        try vm.envString("RPC_URL_HYPERLIQUID_MAINNET") returns (string memory _rpcUrl) {
            rpcUrl = _rpcUrl;
        } catch {
            console.log("Using default mainnet RPC URL");
        }
        // Skip test if fork fails
        try vm.createSelectFork(rpcUrl) {} catch {
            console.log("Forking mainnet ", rpcUrl, " failed");
            vm.skip(true);
        }

        MyOFT oftMainnet = new MyOFT("test", "test", HL_LZ_ENDPOINT_V2_MAINNET, msg.sender);
        HyperLiquidComposer hypeComposerMainnet = new HyperLiquidComposer(
            address(oftMainnet),
            ERC20.coreIndexId,
            ERC20.decimalDiff,
            recovery
        );

        assertEq(hypeComposerMainnet.hypeIndexByChainId(999), 150);
    }

    function test_SendSpot_no_FundAddress() public {
        bytes memory composeMsg = abi.encode(0, userB);

        // Build composerMsg similar to the outcome of OFTCore.send()
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            AMOUNT_TO_SEND + DUST,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND + DUST);

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), AMOUNT_TO_SEND + DUST);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ERC20.assetBridgeAddress, AMOUNT_TO_SEND);

        uint64 coreAmount = hyperLiquidComposer.quoteHyperCoreAmount(AMOUNT_TO_SEND, true).core;
        bytes memory action = abi.encode(userB, ERC20.coreIndexId, coreAmount);
        bytes memory payload = abi.encodePacked(hyperLiquidComposer.SPOT_SEND_HEADER(), action);
        vm.expectEmit(HLP_CORE_WRITER);
        emit ICoreWriter.RawAction(address(hyperLiquidComposer), payload);

        uint256 balanceBefore = oft.balanceOf(userB);

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperLiquidComposer)), 0);
        assertEq(oft.balanceOf(userB), balanceBefore + DUST);
    }

    function test_SendSpot_and_FundAddress() public {
        bytes memory composeMsg = abi.encode(AMOUNT_TO_FUND, userB);

        // Build composerMsg similar to the outcome of OFTCore.send()
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            AMOUNT_TO_SEND,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);
        assertEq(oft.balanceOf(address(hyperLiquidComposer)), AMOUNT_TO_SEND);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), ERC20.assetBridgeAddress, AMOUNT_TO_SEND);

        uint64 coreAmount = hyperLiquidComposer.quoteHyperCoreAmount(AMOUNT_TO_SEND, true).core;
        bytes memory action = abi.encode(userB, ERC20.coreIndexId, coreAmount);
        bytes memory payload = abi.encodePacked(hyperLiquidComposer.SPOT_SEND_HEADER(), action);
        vm.expectEmit(HLP_CORE_WRITER);
        emit ICoreWriter.RawAction(address(hyperLiquidComposer), payload);

        // Expect the Received event to be emitted - this is for the HYPE precompile
        (, , address hypeAssetBridge) = hyperLiquidComposer.hypeAsset();
        vm.expectEmit(hypeAssetBridge);
        emit IHYPEPrecompile.Received(address(hyperLiquidComposer), AMOUNT_TO_FUND);

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
