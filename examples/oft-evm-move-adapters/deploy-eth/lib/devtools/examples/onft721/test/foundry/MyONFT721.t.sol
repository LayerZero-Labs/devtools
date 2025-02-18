// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Mock imports
import { ONFT721Mock } from "../mocks/ONFT721Mock.sol";
import { ONFT721ComposerMock } from "../mocks/ONFT721ComposerMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { IONFT721, SendParam } from "@layerzerolabs/onft-evm/contracts/onft721/interfaces/IONFT721.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Core.sol";
import { ONFT721MsgCodec } from "@layerzerolabs/onft-evm/contracts/onft721/libs/ONFT721MsgCodec.sol";
import { ONFTComposeMsgCodec } from "@layerzerolabs/onft-evm/contracts/libs/ONFTComposeMsgCodec.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract MyONFT721Test is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    ONFT721Mock private aONFT721;
    ONFT721Mock private bONFT721;

    address private userA = address(0x1);
    address private userB = address(0x2);
    uint256 private initialBalance = 100 ether;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        aONFT721 = ONFT721Mock(
            _deployOApp(
                type(ONFT721Mock).creationCode,
                abi.encode("aONFT721", "aONFT721", address(endpoints[aEid]), address(this))
            )
        );

        bONFT721 = ONFT721Mock(
            _deployOApp(
                type(ONFT721Mock).creationCode,
                abi.encode("bONFT721", "bONFT721", address(endpoints[bEid]), address(this))
            )
        );

        // config and wire the onfts
        address[] memory onfts = new address[](2);
        onfts[0] = address(aONFT721);
        onfts[1] = address(bONFT721);
        this.wireOApps(onfts);

        // mint tokens
        aONFT721.mint(userA, 0);
    }

    function test_constructor() public {
        assertEq(aONFT721.owner(), address(this));
        assertEq(bONFT721.owner(), address(this));

        assertEq(aONFT721.balanceOf(userA), 1);
        assertEq(bONFT721.balanceOf(userB), 0);

        assertEq(aONFT721.token(), address(aONFT721));
        assertEq(bONFT721.token(), address(bONFT721));
    }

    function test_send_onft721() public {
        uint256 tokenId = 0;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(bEid, addressToBytes32(userB), tokenId, options, "", "");
        MessagingFee memory fee = aONFT721.quoteSend(sendParam, false);

        assertEq(aONFT721.balanceOf(userA), 1);
        assertEq(bONFT721.balanceOf(userB), 0);

        vm.prank(userA);
        aONFT721.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        verifyPackets(bEid, addressToBytes32(address(bONFT721)));

        assertEq(aONFT721.balanceOf(userA), 0);
        assertEq(bONFT721.balanceOf(userB), 1);
    }

    function test_send_oft_compose_msg() public {
        uint256 tokenIdToSend = 0;

        ONFT721ComposerMock composer = new ONFT721ComposerMock();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        bytes memory composeMsg = hex"1234";
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(address(composer)),
            tokenIdToSend,
            options,
            composeMsg,
            ""
        );
        MessagingFee memory fee = aONFT721.quoteSend(sendParam, false);

        assertEq(aONFT721.balanceOf(userA), 1);
        assertEq(bONFT721.balanceOf(address(composer)), 0);

        vm.prank(userA);
        MessagingReceipt memory msgReceipt = aONFT721.send{ value: fee.nativeFee }(
            sendParam,
            fee,
            payable(address(this))
        );
        verifyPackets(bEid, addressToBytes32(address(bONFT721)));

        // lzCompose params
        uint32 dstEid_ = bEid;
        address from_ = address(bONFT721);
        bytes memory options_ = options;
        bytes32 guid_ = msgReceipt.guid;
        address to_ = address(composer);
        bytes memory composerMsg_ = ONFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            aEid,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );
        this.lzCompose(dstEid_, from_, options_, guid_, to_, composerMsg_);

        assertEq(aONFT721.balanceOf(userA), 0);
        assertEq(bONFT721.balanceOf(address(composer)), 1);

        assertEq(composer.from(), from_);
        assertEq(composer.guid(), guid_);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }
}
