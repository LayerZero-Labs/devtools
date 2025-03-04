// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/console.sol";

// Mock imports
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MOVEOFTAdapter, RateLimiter} from "../../../deploy-eth/src/MOVEOFTAdapter.sol";

// OApp imports
import {
    IOAppOptionsType3, EnforcedOptionParam
} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports 
import {IOFT, SendParam, OFTReceipt} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {MessagingFee, MessagingReceipt} from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";
import {OFTMsgCodec} from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

// OZ imports
import {IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// DevTools imports
import {TestHelperOz5} from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract MOVEOFTAdapterTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    MOVEOFTAdapter private aOFT;
    MOVEOFTAdapter private bOFT;

    ERC20Mock private amove;
    ERC20Mock private bmove;

    address private userA = makeAddr("userA");
    address private userB = makeAddr("userB");
    uint256 private initialBalance = 100 ether;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        // Deploy token mocks
        amove = new ERC20Mock("Movement", "l1MOVE");
        bmove = new ERC20Mock("Movement", "l2MOVE");

        // Configure rate limits
        RateLimiter.RateLimitConfig[] memory arateLimitConfigs = new RateLimiter.RateLimitConfig[](2);
        arateLimitConfigs[0] = RateLimiter.RateLimitConfig({
            dstEid: bEid,
            limit: 10000000 * 10**uint256(8),
            window: 1 days
        });
        arateLimitConfigs[1] = RateLimiter.RateLimitConfig({
            dstEid: aEid,
            limit: 10000000 * 10**uint256(8),
            window: 1 days
        });

        RateLimiter.RateLimitConfig[] memory brateLimitConfigs = new RateLimiter.RateLimitConfig[](2);
        brateLimitConfigs[0] = arateLimitConfigs[1];
        brateLimitConfigs[1] = arateLimitConfigs[0];

        // Deploy adapters for each chain
        aOFT = MOVEOFTAdapter(
            _deployOApp(
                type(MOVEOFTAdapter).creationCode,
                abi.encode(
                    address(amove),
                    address(endpoints[aEid]),
                    address(this),
                    arateLimitConfigs
                )
            )
        );

        bOFT = MOVEOFTAdapter(
            _deployOApp(
                type(MOVEOFTAdapter).creationCode,
                abi.encode(
                    address(bmove),
                    address(endpoints[bEid]),
                    address(this),
                    brateLimitConfigs
                )
            )
        );

        // Wire the adapters together
        address[] memory ofts = new address[](2);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        this.wireOApps(ofts);

        // Mint tokens to user addresses
        deal(address(amove), userA, initialBalance);
        deal(address(bmove), userB, initialBalance);
    }

    function test_constructor() public {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));

        assertEq(amove.balanceOf(userA), initialBalance);
        assertEq(bmove.balanceOf(userB), initialBalance);

        assertEq(aOFT.token(), address(amove));
        assertEq(bOFT.token(), address(bmove));
    }

    /// @notice Test sending an amount within the rate limit.
    function test_send_oft_within_rate_limit() public {
        (, uint256 amountCanBeSent) = aOFT.getAmountCanBeSent(bEid);
        // Send an amount within the limit (e.g., half the allowed amount)
        uint256 tokensToSend = amountCanBeSent / 2;

        // Ensure the recipient adapter is funded (if necessary)
        bmove.mint(address(bOFT), 1000 * 10 ** bmove.decimals());

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        // Check initial balances.
        assertEq(amove.balanceOf(userA), initialBalance);
        assertEq(IERC20(bOFT.token()).balanceOf(userB), initialBalance);

        // Execute the send.
        vm.startPrank(userA);

        // Approve aOFT
        amove.approve(address(aOFT), type(uint256).max);

        uint256 badAmount = amove.balanceOf(userA) + 1;

        SendParam memory sendParamBad = SendParam(
            bEid,
            addressToBytes32(userB),
            badAmount,
            badAmount,
            options,
            "",
            ""
        );
        MessagingFee memory feeBad = aOFT.quoteSend(sendParam, false);

        // Attempts to send more than balance
        vm.expectRevert();
        aOFT.send{value: feeBad.nativeFee}(sendParamBad, feeBad, payable(address(this)));

        // Send the correct amount and fee
        aOFT.send{value: fee.nativeFee}(sendParam, fee, payable(address(this)));
        vm.stopPrank();
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        // Verify balances updated correctly.
        assertEq(IERC20(aOFT.token()).balanceOf(userA), initialBalance - tokensToSend);
        assertEq(IERC20(bOFT.token()).balanceOf(userB), initialBalance + tokensToSend);
    }

    /// @notice Test that sending an amount that exceeds the rate limit is rejected.
    function test_send_oft_exceeds_rate_limit() public {
        (, uint256 allowedAmount) = aOFT.getAmountCanBeSent(bEid);
        // We'll use the allowed amount for fee calculation...
        SendParam memory feeSendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            allowedAmount,
            allowedAmount,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0),
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(feeSendParam, false);

        // Now, create a send parameter that exceeds the allowed amount.
        uint256 overLimitAmount = allowedAmount + 1;
        SendParam memory overLimitSendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            overLimitAmount,
            overLimitAmount,
            "", // You can pass empty options if desired.
            "",
            ""
        );

        vm.startPrank(userA);
        amove.approve(address(aOFT), overLimitAmount);

        // Now, calling send with an over-limit token amount should revert.
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("RateLimitExceeded()"))));
        aOFT.send{value: fee.nativeFee}(overLimitSendParam, fee, payable(address(this)));
        vm.stopPrank();
    }

    function test_can_bridge_after_window() public {
        test_send_oft_exceeds_rate_limit();
        vm.warp(1 days + 1);
        test_send_oft_within_rate_limit();
    }
}
