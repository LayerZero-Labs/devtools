// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// Mock imports
import { OFTMock } from "../mocks/OFTMock.sol";
import { NativeOFTAdapterMock } from "../mocks/NativeOFTAdapterMock.sol";
import { OFTComposerMock } from "../mocks/OFTComposerMock.sol";

// OApp imports
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract MyNativeOFTAdapterTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    NativeOFTAdapterMock private nativeOFTAdapter;
    OFTMock private bOFT;

    address private userA = address(0x1);
    address private userB = address(0x2);
    uint256 private initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        vm.deal(userA, initialNativeBalance);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        nativeOFTAdapter = NativeOFTAdapterMock(
            _deployOApp(
                type(NativeOFTAdapterMock).creationCode,
                abi.encode(18, address(endpoints[aEid]), address(this))
            )
        );

        bOFT = OFTMock(
            _deployOApp(type(OFTMock).creationCode, abi.encode("Token", "TKN", address(endpoints[bEid]), address(this)))
        );

        // config and wire
        address[] memory ofts = new address[](2);
        ofts[0] = address(nativeOFTAdapter);
        ofts[1] = address(bOFT);
        this.wireOApps(ofts);
    }

    function test_constructor() public {
        assertEq(nativeOFTAdapter.owner(), address(this));
        assertEq(bOFT.owner(), address(this));

        assertEq(bOFT.balanceOf(userB), 0);

        assertEq(nativeOFTAdapter.token(), address(0));
        assertEq(bOFT.token(), address(bOFT));

        assertEq(nativeOFTAdapter.approvalRequired(), false);
    }

    function test_send_native_oft_adapter() public {
        uint256 amountToSend = 1 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            amountToSend,
            amountToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = nativeOFTAdapter.quoteSend(sendParam, false);

        assertEq(userA.balance, initialNativeBalance);
        assertEq(address(nativeOFTAdapter).balance, 0);
        assertEq(bOFT.balanceOf(userB), 0);

        uint256 msgValue = fee.nativeFee + nativeOFTAdapter.removeDust(amountToSend);

        vm.prank(userA);
        nativeOFTAdapter.send{ value: msgValue }(sendParam, fee, payable(address(this)));
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(userA.balance, initialNativeBalance - msgValue);
        assertEq(address(nativeOFTAdapter).balance, amountToSend);
        assertEq(bOFT.balanceOf(userB), amountToSend);
    }

    function test_send_native_oft_adapter_compose_msg() public {
        uint256 amountToSend = 1 ether;

        OFTComposerMock composer = new OFTComposerMock();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        bytes memory composeMsg = hex"1234";
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(address(composer)),
            amountToSend,
            amountToSend,
            options,
            composeMsg,
            ""
        );
        MessagingFee memory fee = nativeOFTAdapter.quoteSend(sendParam, false);

        assertEq(userA.balance, initialNativeBalance);
        assertEq(address(nativeOFTAdapter).balance, 0);
        assertEq(bOFT.balanceOf(address(composer)), 0);

        uint256 msgValue = fee.nativeFee + nativeOFTAdapter.removeDust(amountToSend);

        vm.prank(userA);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = nativeOFTAdapter.send{ value: msgValue }(
            sendParam,
            fee,
            payable(address(this))
        );
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        // lzCompose params
        address from_ = address(bOFT);
        bytes memory options_ = options;
        bytes32 guid_ = msgReceipt.guid;
        address to_ = address(composer);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            aEid,
            oftReceipt.amountReceivedLD,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );
        this.lzCompose(bEid, from_, options_, guid_, to_, composerMsg_);

        assertEq(userA.balance, initialNativeBalance - msgValue);
        assertEq(address(nativeOFTAdapter).balance, amountToSend);
        assertEq(bOFT.balanceOf(address(composer)), amountToSend);

        assertEq(composer.from(), from_);
        assertEq(composer.guid(), guid_);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    // TODO import the rest of native oft adapter tests?
}
