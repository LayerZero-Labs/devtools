// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IHyperLiquidComposer } from "../contracts/interfaces/IHyperLiquidComposer.sol";

import { NoFallback } from "./mocks/NoFallback.sol";
import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";
import { CoreUserExistsMock } from "./mocks/CoreUserExistsMock.sol";

import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { HyperliquidBaseTest } from "./HyperliquidBase.t.sol";
import { console } from "forge-std/Test.sol";

contract HyperLiquidComposerRefundTest is HyperliquidBaseTest {
    function setUp() public override {
        super.setUp();
        AMOUNT_TO_FUND = 100 gwei;
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

        bytes memory composeMsg = abi.encode(AMOUNT_TO_FUND, vm.randomBytes(40));

        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
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
            ETH_EID,
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

    function test_native_refund_receiver_not_activated(uint64 _dust) public {
        _dust = uint64(bound(_dust, 0, type(uint64).max - 10 ether));

        uint256 totalTransferAmount = AMOUNT_TO_SEND + _dust;
        deal(address(oft), address(hyperLiquidComposer), totalTransferAmount);

        address unactivatedAddress = vm.randomAddress();
        CoreUserExistsMock(HLP_PRECOMPILE_READ_USER_EXISTS).setUserExists(unactivatedAddress, false);

        uint256 scaleERC20DecimalDiff = 10 ** uint8(ERC20.decimalDiff);

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ERC20.assetBridgeAddress,
            ERC20.coreIndexId,
            uint64(AMOUNT_TO_SEND / scaleERC20DecimalDiff)
        );

        bytes memory composeMsg = abi.encode(AMOUNT_TO_FUND, unactivatedAddress);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            totalTransferAmount,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        vm.expectEmit(address(oft));
        emit IERC20.Transfer(address(hyperLiquidComposer), unactivatedAddress, totalTransferAmount);

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose{ value: AMOUNT_TO_FUND }(address(oft), bytes32(0), composerMsg_, msg.sender, "");
        vm.stopPrank();

        assertEq(address(hyperLiquidComposer).balance, 0);
        assertEq(unactivatedAddress.balance, AMOUNT_TO_FUND);
        assertEq(oft.balanceOf(address(unactivatedAddress)), totalTransferAmount);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function getComposeMessage(bytes calldata _composerMsg) external pure returns (bytes memory) {
        return OFTComposeMsgCodec.composeMsg(_composerMsg);
    }
}
