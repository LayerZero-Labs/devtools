// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { ICoreWriter } from "../contracts/interfaces/ICoreWriter.sol";

import { FeeTokenMock } from "./mocks/FeeTokenMock.sol";
import { OFTMock } from "./mocks/OFTMock.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";
import { CoreUserExistsMock } from "./mocks/CoreUserExistsMock.sol";

import { HyperliquidBaseTest } from "./HyperliquidBase.t.sol";
import { console } from "forge-std/Test.sol";

contract FeeTokenTest is HyperliquidBaseTest {
    FeeTokenMock public feeToken;

    address public activatedUser = makeAddr("activatedUser");
    address public newUser = makeAddr("newUser");

    uint256 public constant TRANSFER_AMOUNT_EVM = 100 ether; // 100 tokens in evm precision
    uint64 public constant TRANSFER_AMOUNT_CORE = 100e8; // 100 tokens in core precision
    uint64 public constant ACTIVATION_FEE = 1e8; // 1 token in core precision

    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public override {
        super.setUp();

        // Deploy FeeToken extension
        feeToken = new FeeTokenMock(address(oft), ERC20.coreIndexId, ERC20.decimalDiff);

        // Set up user states in the mock
        CoreUserExistsMock(HLP_PRECOMPILE_READ_USER_EXISTS).setUserExists(activatedUser, true);
        CoreUserExistsMock(HLP_PRECOMPILE_READ_USER_EXISTS).setUserExists(newUser, false);

        // Ensure the bridge has sufficient balance
        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ERC20.assetBridgeAddress,
            ERC20.coreIndexId,
            type(uint64).max
        );
    }

    function test_deployment() public view {
        assertEq(feeToken.CORE_SPOT_DECIMALS(), 8);

        assertEq(feeToken.ERC20(), address(oft));
    }

    function test_sendSpot_activatedUser() public {
        bytes memory composeMsg = abi.encode(0, activatedUser);

        bytes memory composerMsg = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            TRANSFER_AMOUNT_EVM,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        deal(address(oft), address(feeToken), TRANSFER_AMOUNT_EVM);

        bytes memory rawActionPayload = feeToken.createRawActionPayloadERC20(activatedUser, TRANSFER_AMOUNT_CORE);

        // Expect transfer to bridge
        vm.expectEmit(address(oft));
        emit Transfer(address(feeToken), ERC20.assetBridgeAddress, TRANSFER_AMOUNT_EVM);

        // Emit CoreWriter action
        vm.expectEmit(HLP_CORE_WRITER);
        emit ICoreWriter.RawAction(address(feeToken), rawActionPayload);

        vm.prank(HL_LZ_ENDPOINT_V2);
        feeToken.lzCompose(address(oft), bytes32(0), composerMsg, msg.sender, "");
    }

    function test_sendSpot_newUser() public {
        bytes memory composeMsg = abi.encode(0, newUser);

        bytes memory composerMsg = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            TRANSFER_AMOUNT_EVM,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        deal(address(oft), address(feeToken), TRANSFER_AMOUNT_EVM);

        uint64 coreIndexId = feeToken.ERC20_CORE_INDEX_ID();
        int8 decimalDiff = feeToken.ERC20_DECIMAL_DIFF();
        address assetBridgeAddress = feeToken.ERC20_ASSET_BRIDGE();

        // For new users, the core amount should be reduced by activation fee
        uint64 baseCoreAmount = feeToken
            .quoteHyperCoreAmount(coreIndexId, decimalDiff, assetBridgeAddress, TRANSFER_AMOUNT_EVM)
            .core;
        uint64 expectedCoreAmount = baseCoreAmount - ACTIVATION_FEE;
        bytes memory rawActionPayload = feeToken.createRawActionPayloadERC20(newUser, expectedCoreAmount);

        // Expect transfer to bridge (same EVM amount, but less will be transferred in core)
        vm.expectEmit(address(oft));
        emit Transfer(address(feeToken), ERC20.assetBridgeAddress, TRANSFER_AMOUNT_EVM);

        // Emit CoreWriter action
        vm.expectEmit(HLP_CORE_WRITER);
        emit ICoreWriter.RawAction(address(feeToken), rawActionPayload);

        // Execute the compose call
        vm.prank(HL_LZ_ENDPOINT_V2);
        feeToken.lzCompose(address(oft), bytes32(0), composerMsg, msg.sender, "");
    }

    // Helper function from HyperliquidBaseTest
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}
