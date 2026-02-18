// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { MessagingFee, MessagingReceipt, OFTReceipt } from "../contracts/OFTCore.sol";
import { IOFT, SendParam, OFTLimit } from "../contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { TIP20TokenMock } from "./mocks/TIP20TokenMock.sol";
import { TIP20OFTMock } from "./mocks/TIP20OFTMock.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract TIP20OFTTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 internal constant A_EID = 1;
    uint32 internal constant B_EID = 2;

    string internal constant TOKEN_A_NAME = "TIP20TokenA";
    string internal constant TOKEN_A_SYMBOL = "TIPA";
    string internal constant TOKEN_B_NAME = "TIP20TokenB";
    string internal constant TOKEN_B_SYMBOL = "TIPB";

    ERC20Mock internal nativeTokenMock;
    TIP20TokenMock internal tokenA;
    TIP20TokenMock internal tokenB;
    TIP20OFTMock internal oftA;
    TIP20OFTMock internal oftB;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");
    uint256 public initialBalance = 100 ether;
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        _deal();
        super.setUp();

        // EndpointV2Alt requires a native token per endpoint
        nativeTokenMock = new ERC20Mock("NativeFeeToken", "NAT");
        address[] memory nativeTokens = new address[](2);
        nativeTokens[0] = address(nativeTokenMock);
        nativeTokens[1] = address(nativeTokenMock);
        createEndpoints(2, LibraryType.UltraLightNode, nativeTokens);

        tokenA = new TIP20TokenMock(TOKEN_A_NAME, TOKEN_A_SYMBOL);
        tokenB = new TIP20TokenMock(TOKEN_B_NAME, TOKEN_B_SYMBOL);

        oftA = TIP20OFTMock(
            _deployOApp(
                type(TIP20OFTMock).creationCode,
                abi.encode(address(tokenA), address(endpoints[A_EID]), address(this))
            )
        );
        oftB = TIP20OFTMock(
            _deployOApp(
                type(TIP20OFTMock).creationCode,
                abi.encode(address(tokenB), address(endpoints[B_EID]), address(this))
            )
        );

        address[] memory ofts = new address[](2);
        ofts[0] = address(oftA);
        ofts[1] = address(oftB);
        this.wireOApps(ofts);

        tokenA.mint(userA, initialBalance);
        tokenB.mint(userB, initialBalance);

        // Native token for fees (user approves OFT to pay fee)
        nativeTokenMock.mint(userA, initialNativeBalance);
        nativeTokenMock.mint(userB, initialNativeBalance);
    }

    function _deal() internal {
        vm.deal(userA, initialNativeBalance);
        vm.deal(userB, initialNativeBalance);
    }

    function test_constructor() public view {
        assertEq(oftA.owner(), address(this));
        assertEq(oftB.owner(), address(this));
        assertEq(oftA.token(), address(tokenA));
        assertEq(oftB.token(), address(tokenB));
        assertEq(tokenA.balanceOf(userA), initialBalance);
        assertEq(tokenB.balanceOf(userB), initialBalance);
        assertTrue(oftA.approvalRequired());
        assertTrue(oftB.approvalRequired());
    }

    function test_token() public view {
        assertEq(oftA.token(), address(tokenA));
        assertEq(oftB.token(), address(tokenB));
    }

    function test_approvalRequired() public view {
        assertTrue(oftA.approvalRequired());
    }

    function test_tip20_debit() public {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = B_EID;

        assertEq(tokenA.balanceOf(userA), initialBalance);
        assertEq(tokenA.balanceOf(address(oftA)), 0);

        vm.prank(userA);
        tokenA.approve(address(oftA), amountToSendLD);

        vm.prank(userA);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = oftA.debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);
        assertEq(tokenA.balanceOf(userA), initialBalance - amountToSendLD);
        assertEq(tokenA.balanceOf(address(oftA)), 0); // OFT burns after receiving
    }

    function test_tip20_debit_revertsWithoutApproval() public {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = B_EID;

        vm.prank(userA);
        vm.expectRevert();
        oftA.debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_tip20_debit_slippageReverts() public {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether + 1;
        uint32 dstEid = B_EID;

        vm.prank(userA);
        tokenA.approve(address(oftA), amountToSendLD);

        vm.prank(userA);
        vm.expectRevert(abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD));
        oftA.debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_tip20_credit() public {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = A_EID;

        assertEq(tokenB.balanceOf(userB), initialBalance);

        vm.prank(address(oftB));
        uint256 amountReceived = oftB.credit(userB, amountToCreditLD, srcEid);

        assertEq(amountReceived, amountToCreditLD);
        assertEq(tokenB.balanceOf(userB), initialBalance + amountToCreditLD);
    }

    function test_tip20_credit_zeroAddressMintsToDead() public {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = A_EID;
        address dead = address(0xdead);

        uint256 supplyBefore = tokenB.totalSupply();

        vm.prank(address(oftB));
        uint256 amountReceived = oftB.credit(address(0), amountToCreditLD, srcEid);

        assertEq(amountReceived, amountToCreditLD);
        assertEq(tokenB.balanceOf(dead), amountToCreditLD);
        assertEq(tokenB.totalSupply(), supplyBefore + amountToCreditLD);
    }

    function test_tip20_send() public {
        uint256 tokensToSend = 1 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = oftA.quoteSend(sendParam, false);

        assertEq(tokenA.balanceOf(userA), initialBalance);
        assertEq(tokenB.balanceOf(userB), initialBalance);

        vm.startPrank(userA);
        tokenA.approve(address(oftA), tokensToSend);
        nativeTokenMock.approve(address(oftA), fee.nativeFee);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = oftA.send(
            sendParam,
            fee,
            payable(address(this))
        );
        vm.stopPrank();

        assertEq(tokenA.balanceOf(userA), initialBalance - oftReceipt.amountSentLD);
        assertEq(msgReceipt.fee.nativeFee, fee.nativeFee);

        // Deliver the packet to oftB (calls lzReceive and credits userB)
        verifyPackets(B_EID, addressToBytes32(address(oftB)));

        assertEq(tokenB.balanceOf(userB), initialBalance + oftReceipt.amountReceivedLD);
    }

    function test_quoteSend() public view {
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(userB),
            1 ether,
            1 ether,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0),
            "",
            ""
        );
        MessagingFee memory fee = oftA.quoteSend(sendParam, false);
        assertTrue(fee.nativeFee > 0 || fee.lzTokenFee > 0);
    }

    function test_quoteOFT() public view {
        SendParam memory sendParam = SendParam(B_EID, addressToBytes32(userB), 1 ether, 1 ether, "", "", "");
        (OFTLimit memory oftLimit, , OFTReceipt memory oftReceipt) = oftA.quoteOFT(sendParam);
        assertEq(oftLimit.minAmountLD, 0);
        assertEq(oftLimit.maxAmountLD, tokenA.totalSupply());
        assertEq(oftReceipt.amountSentLD, 1 ether);
        assertEq(oftReceipt.amountReceivedLD, 1 ether);
    }
}
