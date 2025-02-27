// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OAppSender } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { HyperLiquidOFT } from "../contracts/HyperLiquidOFT.sol";
import { HyperLiquidLZComposer } from "../contracts/HyperLiquidLZComposer.sol";

import { IHyperLiquidERC20Extended, IERC20 } from "../contracts/interfaces/IHyperLiquidERC20Extended.sol";
import { HyperLiquidERC20Extended } from "../contracts/HyperLiquidERC20Extended.sol";

import { console } from "forge-std/console.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract HyperLiquidOFTTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 internal constant SRC_EID = 1;
    uint32 internal constant DST_EID = 2;

    string internal constant SRC_OFT_NAME = "srcOFT";
    string internal constant SRC_OFT_SYMBOL = "srcOFT";
    string internal constant DST_OFT_NAME = "dstOFT";
    string internal constant DST_OFT_SYMBOL = "dstOFT";

    HyperLiquidOFT internal srcOFT;
    HyperLiquidOFT internal dstOFT;

    HyperLiquidLZComposer internal dstLZComposer;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    uint256 public initialBalance = 100 ether;
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        vm.deal(userA, initialNativeBalance);
        vm.deal(userB, initialNativeBalance);

        super.setUp();

        setUpEndpoints(2, LibraryType.UltraLightNode);

        srcOFT = HyperLiquidOFT(
            _deployOApp(
                type(HyperLiquidOFT).creationCode,
                abi.encode(SRC_OFT_NAME, SRC_OFT_SYMBOL, address(endpoints[SRC_EID]), address(this))
            )
        );
        dstOFT = HyperLiquidOFT(
            _deployOApp(
                type(HyperLiquidOFT).creationCode,
                abi.encode(DST_OFT_NAME, DST_OFT_SYMBOL, address(endpoints[DST_EID]), address(this))
            )
        );

        dstLZComposer = new HyperLiquidLZComposer(address(endpoints[DST_EID]), address(dstOFT));

        // config and wire the ofts
        address[] memory ofts = new address[](2);
        ofts[0] = address(srcOFT);
        ofts[1] = address(dstOFT);
        this.wireOApps(ofts);

        // mint tokens
        deal(address(srcOFT), userA, initialBalance);
    }

    function test_deployment() public view {
        assertEq(srcOFT.owner(), address(this));
        assertEq(dstOFT.owner(), address(this));

        assertEq(srcOFT.balanceOf(userA), initialBalance);

        assertEq(srcOFT.token(), address(srcOFT));
        assertEq(dstOFT.token(), address(dstOFT));

        (bytes4 interfaceId, ) = srcOFT.oftVersion();
        bytes4 expectedId = 0x02e49c2c;
        assertEq(interfaceId, expectedId);
    }

    function test_send_oft_no_compose_msg(uint256 tokensToSend) public virtual {
        vm.assume(tokensToSend > 0.001 ether && tokensToSend < 100 ether); // avoid reverting due to SlippageExceeded

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory composeMsg = "";

        assertEq(srcOFT.balanceOf(userA), initialBalance);
        assertEq(dstOFT.balanceOf(userB), 0);

        (, OFTReceipt memory oftReceipt) = send_oft_AB(options, composeMsg, userB);

        assert_post_lz_receive_state(userA, userB, address(dstOFT), oftReceipt);
    }

    function test_send_oft_compose_msg(uint256 tokensToSend) public virtual {
        vm.assume(tokensToSend > 0.001 ether && tokensToSend < 100 ether); // avoid reverting due to SlippageExceeded

        // Approve the dstOFT to execute the transferToHyperLiquidL1 function
        dstOFT.approveCaller(address(dstLZComposer));

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 500000, 200000);
        bytes memory composeMsg = abi.encodePacked(userB);

        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = send_oft_AB(
            options,
            composeMsg,
            address(dstLZComposer)
        );

        assert_post_lz_receive_state(userA, address(dstLZComposer), userB, oftReceipt);

        // Build the composerMsg
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            SRC_EID,
            oftReceipt.amountReceivedLD,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        // lzCompose params
        uint32 dstEid_ = DST_EID;
        address from_ = address(dstOFT);
        bytes memory options_ = options;
        bytes32 guid_ = msgReceipt.guid;
        address to_ = address(dstLZComposer);

        // Expect the Transfer event to be emitted
        vm.expectEmit(address(dstOFT));
        emit IERC20.Transfer(address(userB), dstOFT.HL_NATIVE_TRANSFER(), oftReceipt.amountReceivedLD);
        this.lzCompose(dstEid_, from_, options_, guid_, to_, composerMsg_);

        // Assert the post state
        assertEq(dstOFT.balanceOf(address(userB)), 0);
        assertEq(dstOFT.balanceOf(dstOFT.HL_NATIVE_TRANSFER()), oftReceipt.amountReceivedLD);
    }

    function send_oft_AB(
        bytes memory options,
        bytes memory composeMsg,
        address to
    ) public returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        uint256 tokensToSend = 1 ether;

        SendParam memory sendParam = SendParam(
            DST_EID,
            addressToBytes32(to),
            tokensToSend,
            (tokensToSend * 9_500) / 10_000, // allow 1% slippage
            options,
            composeMsg,
            ""
        );

        MessagingFee memory fee = srcOFT.quoteSend(sendParam, false);

        vm.startPrank(userA);
        srcOFT.approve(address(srcOFT), sendParam.amountLD);
        (msgReceipt, oftReceipt) = srcOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();

        verifyPackets(DST_EID, addressToBytes32(address(dstOFT)));
    }

    function assert_post_lz_receive_state(
        address shouldLooseTokens,
        address shouldGainTokens,
        address shouldNotChange,
        OFTReceipt memory oftReceipt
    ) public view {
        assertEq(srcOFT.balanceOf(shouldLooseTokens), initialBalance - oftReceipt.amountSentLD);
        assertEq(dstOFT.balanceOf(shouldGainTokens), oftReceipt.amountReceivedLD);
        assertEq(dstOFT.balanceOf(shouldNotChange), 0);
    }
}
