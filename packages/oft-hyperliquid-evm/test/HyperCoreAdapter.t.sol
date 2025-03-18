// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";
import { IHyperliquidWritePrecompile } from "../contracts/interfaces/IHyperliquidWritePrecompile.sol";
import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";
import { HyperLiquidOFTMock } from "./mocks/HyperLiquidOFTMock.sol";
import { HyperCoreAdapter } from "../contracts/HyperCoreAdapter.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IHYPEPrecompile } from "../contracts/interfaces/IHYPEPrecompile.sol";
contract HyperCoreAdapterTest is Test {
    uint64 public constant ALICE_CORE_INDEX_ID = 1231;
    address public ALICE_ASSET_BRIDGE_ADDRESS;
    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;

    // Ethereum Sepolia
    uint32 public constant SRC_EID = 40161;
    // HyperLiquid Testnet
    uint32 public DST_EID;

    HyperLiquidOFTMock internal oft;
    HyperCoreAdapter internal hyperCoreAdapter;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    uint256 public constant evmWei = 18;
    uint256 public constant hyperLiquidWei = 6;
    uint256 public hyperLiquidWeiDiff;

    uint256 public constant amount = 1e18;
    uint256 public constant amountToFund = 100 gwei;

    function setUp() public {
        vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm");
        oft = new HyperLiquidOFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);
        hyperCoreAdapter = new HyperCoreAdapter(
            HL_LZ_ENDPOINT_V2,
            address(oft),
            ALICE_CORE_INDEX_ID,
            evmWei - hyperLiquidWei
        );
        DST_EID = oft.endpoint().eid();
        ALICE_ASSET_BRIDGE_ADDRESS = HyperLiquidComposerCodec.into_assetBridgeAddress(ALICE_CORE_INDEX_ID);

        vm.deal(HL_LZ_ENDPOINT_V2, 100 ether);
        hyperLiquidWeiDiff = evmWei - hyperLiquidWei;
    }

    function test_SendSpot() public {
        bytes memory composeMsg = abi.encodePacked(userB);

        // Build the composerMsg
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            amount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        assertEq(oft.balanceOf(address(hyperCoreAdapter)), 0);

        // Mocks the lzReceive call that mints the tokens to the hyperCoreAdapter
        deal(address(oft), address(hyperCoreAdapter), amount);

        assertEq(oft.balanceOf(address(hyperCoreAdapter)), amount);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperCoreAdapter), ALICE_ASSET_BRIDGE_ADDRESS, amount);

        // Expect the SpotSend event to be emitted
        vm.expectEmit(hyperCoreAdapter.L1WritePrecompileAddress());
        emit IHyperliquidWritePrecompile.SpotSend(
            address(hyperCoreAdapter),
            userB,
            hyperCoreAdapter.OFT_TOKEN_CORE_INDEX_ID(),
            uint64(amount / 10 ** (evmWei - hyperLiquidWei))
        );

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperCoreAdapter.lzCompose(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperCoreAdapter)), 0);
    }

    function test_SendSpot_and_FundAddress() public {
        bytes memory composeMsg = abi.encodePacked(userB);

        // Build the composerMsg
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            SRC_EID,
            amount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        assertEq(oft.balanceOf(address(hyperCoreAdapter)), 0);

        // Mocks the lzReceive call that mints the tokens to the hyperCoreAdapter
        deal(address(oft), address(hyperCoreAdapter), amount);

        assertEq(oft.balanceOf(address(hyperCoreAdapter)), amount);

        // Expect the Received event to be emitted - this is for the HYPE precompile
        vm.expectEmit(hyperCoreAdapter.HYPE_ASSET_BRIDGE_ADDRESS());
        emit IHYPEPrecompile.Received(address(hyperCoreAdapter), amountToFund);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperCoreAdapter), ALICE_ASSET_BRIDGE_ADDRESS, amount);

        // Expect the SpotSend event to be emitted - this is for the ALICE asset bridge
        vm.expectEmit(hyperCoreAdapter.L1WritePrecompileAddress());
        emit IHyperliquidWritePrecompile.SpotSend(
            address(hyperCoreAdapter),
            userB,
            hyperCoreAdapter.OFT_TOKEN_CORE_INDEX_ID(),
            uint64(amount / 10 ** (evmWei - hyperLiquidWei))
        );

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperCoreAdapter.lzCompose{ value: amountToFund }(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(oft.balanceOf(address(hyperCoreAdapter)), 0);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}
