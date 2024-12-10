// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Mock imports
import { OFTMock } from "../mocks/OFTMock.sol";
import { MintBurnOFTAdapterMock } from "../mocks/MintBurnOFTAdapterMock.sol";
import { MintBurnERC20Mock } from "../mocks/MintBurnERC20Mock.sol";
import { OFTComposerMock } from "../mocks/OFTComposerMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";
import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract MyMintBurnOFTAdapterTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    MintBurnERC20Mock private aMintBurnToken;
    MintBurnOFTAdapterMock private aMintBurnOFTAdapter;
    OFTMock private bOFT;

    address private userA = address(0x1);
    address private userB = address(0x2);
    uint256 private initialBalance = 100 ether;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        aMintBurnToken = MintBurnERC20Mock(
            _deployOApp(type(MintBurnERC20Mock).creationCode, abi.encode("Token", "TOKEN"))
        );

        aMintBurnOFTAdapter = MintBurnOFTAdapterMock(
            _deployOApp(
                type(MintBurnOFTAdapterMock).creationCode,
                abi.encode(
                    address(aMintBurnToken),
                    IMintableBurnable(aMintBurnToken),
                    address(endpoints[aEid]),
                    address(this)
                )
            )
        );

        bOFT = OFTMock(
            _deployOApp(
                type(OFTMock).creationCode,
                abi.encode("Token", "TOKEN", address(endpoints[bEid]), address(this))
            )
        );

        // config and wire the ofts
        address[] memory ofts = new address[](2);
        ofts[0] = address(aMintBurnOFTAdapter);
        ofts[1] = address(bOFT);
        this.wireOApps(ofts);

        // mint tokens
        aMintBurnToken.mint(userA, initialBalance);
    }

    function test_constructor() public {
        assertEq(aMintBurnOFTAdapter.owner(), address(this));
        assertEq(bOFT.owner(), address(this));

        assertEq(aMintBurnToken.balanceOf(userA), initialBalance);
        assertEq(aMintBurnToken.balanceOf(address(aMintBurnOFTAdapter)), 0);
        assertEq(bOFT.balanceOf(userB), 0);

        assertEq(aMintBurnOFTAdapter.token(), address(aMintBurnToken));
        assertEq(bOFT.token(), address(bOFT));
    }

    function test_send_mint_burn_oft_adapter() public {
        uint256 tokensToSend = 1 ether;
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
        MessagingFee memory fee = aMintBurnOFTAdapter.quoteSend(sendParam, false);

        assertEq(aMintBurnToken.balanceOf(userA), initialBalance);
        assertEq(aMintBurnToken.balanceOf(address(aMintBurnOFTAdapter)), 0);
        assertEq(bOFT.balanceOf(userB), 0);

        vm.prank(userA);
        aMintBurnOFTAdapter.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(aMintBurnToken.balanceOf(userA), initialBalance - tokensToSend);
        assertEq(aMintBurnToken.balanceOf(address(aMintBurnOFTAdapter)), 0);
        assertEq(bOFT.balanceOf(userB), tokensToSend);
    }

    function test_send_oft_adapter_compose_msg() public {
        uint256 tokensToSend = 1 ether;

        OFTComposerMock composer = new OFTComposerMock();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        bytes memory composeMsg = hex"1234";
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(address(composer)),
            tokensToSend,
            tokensToSend,
            options,
            composeMsg,
            ""
        );
        MessagingFee memory fee = aMintBurnOFTAdapter.quoteSend(sendParam, false);

        assertEq(aMintBurnToken.balanceOf(userA), initialBalance);
        assertEq(aMintBurnToken.balanceOf(address(aMintBurnOFTAdapter)), 0);
        assertEq(bOFT.balanceOf(userB), 0);

        vm.prank(userA);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aMintBurnOFTAdapter.send{
            value: fee.nativeFee
        }(sendParam, fee, payable(address(this)));
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        // lzCompose params
        uint32 dstEid_ = bEid;
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
        this.lzCompose(dstEid_, from_, options_, guid_, to_, composerMsg_);

        assertEq(aMintBurnToken.balanceOf(userA), initialBalance - tokensToSend);
        assertEq(aMintBurnToken.balanceOf(address(aMintBurnOFTAdapter)), 0);
        assertEq(bOFT.balanceOf(address(composer)), tokensToSend);

        assertEq(composer.from(), from_);
        assertEq(composer.guid(), guid_);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    // TODO import the rest of oft tests?
}
