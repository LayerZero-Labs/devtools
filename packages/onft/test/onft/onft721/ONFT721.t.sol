// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import { ONFTComposeMsgCodec } from "../../../contracts/libs/ONFTComposeMsgCodec.sol";

import { ERC721Mock } from "./mocks/ERC721Mock.sol";
import { ONFT721MsgCodec } from "../../../contracts/onft721/libs/ONFT721MsgCodec.sol";
import { ComposerMock } from "../../mocks/ComposerMock.sol";
import { InspectorMock, IOAppMsgInspector } from "../../mocks/InspectorMock.sol";
import { MessagingFee, MessagingReceipt } from "../../../contracts/onft721/ONFT721Core.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";

import { SendParam } from "../../../contracts/onft721/interfaces/IONFT721.sol";

import { ONFT721Mock } from "./mocks/ONFT721Mock.sol";
import { ONFT721AdapterMock } from "./mocks/ONFT721AdapterMock.sol";
import { ONFT721Base } from "./ONFT721Base.sol";

contract ONFT721Test is ONFT721Base {
    using OptionsBuilder for bytes;

    uint128 internal constant DEFAULT_EXTRA_OPTIONS_GAS = 200_000;
    uint128 internal constant DEFAULT_EXTRA_OPTIONS_VALUE = 0;
    bytes4 internal constant EXPECTED_ONFT721_ID = 0x94642228;
    uint8 internal constant EXPECTED_ONFT721_VERSION = 1;

    function _deployONFTs() internal override {
        aONFT = ONFT721Mock(
            _deployOApp(
                type(ONFT721Mock).creationCode,
                abi.encode(A_ONFT_NAME, A_ONFT_SYMBOL, address(endpoints[A_EID]), address(this))
            )
        );

        bONFT = ONFT721Mock(
            _deployOApp(
                type(ONFT721Mock).creationCode,
                abi.encode(B_ONFT_NAME, B_ONFT_SYMBOL, address(endpoints[B_EID]), address(this))
            )
        );

        cERC721Mock = new ERC721Mock(C_TOKEN_NAME, C_TOKEN_SYMBOL);
        cONFTAdapter = ONFT721AdapterMock(
            _deployOApp(
                type(ONFT721AdapterMock).creationCode,
                abi.encode(address(cERC721Mock), address(endpoints[C_EID]), address(this))
            )
        );
    }

    function _createDefaultExecutorLzReceiveOptions() internal pure returns (bytes memory) {
        return
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(
                DEFAULT_EXTRA_OPTIONS_GAS,
                DEFAULT_EXTRA_OPTIONS_VALUE
            );
    }

    function test_constructor() public {
        assertEq(aONFT.owner(), address(this));
        assertEq(bONFT.owner(), address(this));
        assertEq(cONFTAdapter.owner(), address(this));

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(bONFT.balanceOf(bob), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(IERC721(cONFTAdapter.token()).balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID);

        assertEq(aONFT.token(), address(aONFT));
        assertEq(bONFT.token(), address(bONFT));
        assertEq(cONFTAdapter.token(), address(cERC721Mock));
    }

    function test_onftVersion() public {
        (bytes4 interfaceId, uint64 version) = aONFT.onftVersion();
        bytes4 expectedId = EXPECTED_ONFT721_ID;
        assertEq(interfaceId, expectedId);
        assertEq(version, EXPECTED_ONFT721_VERSION);
    }

    function test_send_onft(uint8 _tokenToSend) public {
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(bob),
            toSingletonArray(_tokenToSend),
            _createDefaultExecutorLzReceiveOptions(),
            ""
        );
        MessagingFee memory fee = aONFT.quoteSend(sendParam, false);

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(bONFT.balanceOf(bob), DEFAULT_INITIAL_ONFTS_PER_EID);

        vm.prank(alice);
        aONFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        verifyPackets(B_EID, addressToBytes32(address(bONFT)));

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID - 1);
        assertEq(bONFT.balanceOf(bob), DEFAULT_INITIAL_ONFTS_PER_EID + 1);
        assertEq(bONFT.ownerOf(_tokenToSend), bob);
    }

    function test_send_onft_compose_msg(uint8 _tokenToSend, bytes memory _composeMsg) public {
        vm.assume(_composeMsg.length > 0);

        assertEq(aONFT.ownerOf(_tokenToSend), alice);

        ComposerMock composer = new ComposerMock();
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(500000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(address(composer)),
            toSingletonArray(_tokenToSend),
            options,
            _composeMsg
        );
        MessagingFee memory fee = aONFT.quoteSend(sendParam, false);

        assertEq(bONFT.balanceOf(address(composer)), 0);

        vm.prank(alice);
        MessagingReceipt memory msgReceipt = aONFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        verifyPackets(B_EID, addressToBytes32(address(bONFT)));

        // lzCompose params
        address from_ = address(bONFT);
        bytes memory options_ = options;
        bytes32 guid_ = msgReceipt.guid;
        address to_ = address(composer);
        bytes memory composerMsg_ = ONFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            A_EID,
            abi.encodePacked(addressToBytes32(alice), _composeMsg)
        );
        this.lzCompose(B_EID, from_, options_, guid_, to_, composerMsg_);

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID - 1);
        assertEq(bONFT.balanceOf(address(composer)), 1);

        assertEq(composer.from(), from_);
        assertEq(composer.guid(), guid_);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    function test_onft_compose_codec(uint64 _nonce, uint32 _srcEid, bytes memory _composeMsg) public {
        vm.assume(_composeMsg.length > 0);

        bytes memory message = ONFTComposeMsgCodec.encode(
            _nonce,
            _srcEid,
            abi.encodePacked(addressToBytes32(msg.sender), _composeMsg)
        );
        (uint64 nonce, uint32 srcEid, bytes32 composeFrom, bytes memory composeMsg) = this.decodeONFTComposeMsgCodec(
            message
        );

        assertEq(nonce, _nonce);
        assertEq(srcEid, _srcEid);
        assertEq(composeFrom, addressToBytes32(msg.sender));
        assertEq(composeMsg, _composeMsg);
    }

    function decodeONFTComposeMsgCodec(
        bytes calldata _message
    ) public pure returns (uint64 nonce, uint32 srcEid, bytes32 composeFrom, bytes memory composeMsg) {
        nonce = ONFTComposeMsgCodec.nonce(_message);
        srcEid = ONFTComposeMsgCodec.srcEid(_message);
        composeFrom = ONFTComposeMsgCodec.composeFrom(_message);
        composeMsg = ONFTComposeMsgCodec.composeMsg(_message);
    }

    function toSingletonArray(uint256 _element) public pure returns (uint256[] memory array) {
        array = new uint256[](1);
        array[0] = _element;
    }

    function test_onft_debit(uint256 _tokenId) public {
        vm.assume(_tokenId < DEFAULT_INITIAL_ONFTS_PER_EID);
        vm.assume(aONFT.ownerOf(_tokenId) == alice);

        uint32 dstEid = A_EID;

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(aONFT.balanceOf(address(this)), 0);

        vm.prank(alice);
        aONFT.debit(_tokenId, dstEid);

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID - 1);
        assertFalse(aONFT.exists(_tokenId));
        assertEq(aONFT.balanceOf(address(this)), 0);
    }

    function test_onft_credit(uint256 _tokenId) public {
        vm.assume(_tokenId >= DEFAULT_INITIAL_ONFTS_PER_EID);
        uint32 srcEid = A_EID;

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(aONFT.balanceOf(address(this)), 0);

        vm.prank(alice);
        aONFT.credit(alice, _tokenId, srcEid);

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID + 1);
        assertEq(aONFT.ownerOf(_tokenId), alice);
        assertEq(aONFT.balanceOf(address(this)), 0);
    }

    function test_oft_adapter_debit_credit(uint256 _tokenId) public {
        // Ensure that the tokenId is owned by userC
        vm.assume(_tokenId > DEFAULT_INITIAL_ONFTS_PER_EID * 2 && _tokenId < DEFAULT_INITIAL_ONFTS_PER_EID * 3);
        vm.assume(cERC721Mock.ownerOf(_tokenId) == charlie);

        uint32 dstEid = C_EID;
        uint32 srcEid = C_EID;

        assertEq(cERC721Mock.balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(cERC721Mock.balanceOf(address(cONFTAdapter)), 0);

        vm.prank(charlie);
        cERC721Mock.approve(address(cONFTAdapter), _tokenId);
        vm.prank(charlie);
        cONFTAdapter.debit(_tokenId, dstEid);

        // Ensure that
        // 1. userC balance is decremented by 1.
        // 2. The Adapter balance is incremented by 1.
        // 3. The Adapter is the owner of the token
        assertEq(cERC721Mock.balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID - 1);
        assertEq(cERC721Mock.balanceOf(address(cONFTAdapter)), 1);
        assertEq(cERC721Mock.ownerOf(_tokenId), address(cONFTAdapter));

        vm.prank(charlie);
        cONFTAdapter.credit(bob, _tokenId, srcEid);

        // Ensure that:
        // 1. userB balance is incremented by 1.
        // 2. The Adapter balance is decremented by 1.
        // 3. userB owns the token
        assertEq(cERC721Mock.balanceOf(address(bob)), 1);
        assertEq(cERC721Mock.balanceOf(address(cONFTAdapter)), 0);
        assertEq(cERC721Mock.ownerOf(_tokenId), bob);
    }

    function decodeONFTMsgCodec(
        bytes calldata _message
    ) public pure returns (bool isComposed, bytes32 sendTo, uint256 tokenId, bytes memory composeMsg) {
        isComposed = ONFT721MsgCodec.isComposed(_message);
        sendTo = ONFT721MsgCodec.sendTo(_message);
        tokenId = ONFT721MsgCodec.tokenId(_message);
        composeMsg = ONFT721MsgCodec.composeMsg(_message);
    }

    function test_onft_build_msg(uint256 _tokenId, bytes memory _composeMsg) public {
        uint32 dstEid = B_EID;
        bytes32 to = addressToBytes32(alice);

        bytes memory extraOptions = _createDefaultExecutorLzReceiveOptions();
        SendParam memory sendParam = SendParam(dstEid, to, toSingletonArray(_tokenId), extraOptions, _composeMsg);

        (bytes memory message, bytes memory options) = aONFT.buildMsgAndOptions(sendParam);

        assertEq(options, extraOptions);
        (bool isComposed, bytes32 sendTo, uint256 tokenId, bytes memory composeMsg) = this.decodeONFTMsgCodec(
            message
        );
        assertEq(isComposed, _composeMsg.length > 0);
        assertEq(sendTo, to);
        assertEq(tokenId, _tokenId);
        bytes memory expectedComposeMsg = abi.encodePacked(addressToBytes32(address(this)), _composeMsg);
        assertEq(composeMsg, _composeMsg.length > 0 ? expectedComposeMsg : bytes(""));
    }

    function test_onft_build_msg_no_compose_msg(uint256 _tokenId) public {
        uint32 dstEid = B_EID;
        bytes32 to = addressToBytes32(alice);

        bytes memory extraOptions = _createDefaultExecutorLzReceiveOptions();
        SendParam memory sendParam = SendParam(dstEid, to, toSingletonArray(_tokenId), extraOptions, "");

        (bytes memory message, bytes memory options) = aONFT.buildMsgAndOptions(sendParam);

        assertEq(options, extraOptions);
        (bool isComposed_, bytes32 sendTo_, uint256 tokenId_, bytes memory composeMsg_) = this
            .decodeONFTMsgCodec(message);
        assertEq(isComposed_, false);
        assertEq(sendTo_, to);
        assertEq(tokenId_, _tokenId);
        assertEq(composeMsg_.length, 0);
        assertEq(composeMsg_, "");
    }

    function test_set_enforced_options(
        uint128 _optionTypeOneGas,
        uint128 _optionTypeOneValue,
        uint128 _optionTypeTwoGas,
        uint128 _optionTypeTwoValue
    ) public {
        vm.assume(
            _optionTypeOneGas > 0 &&
                _optionTypeOneGas < type(uint128).max &&
                _optionTypeTwoGas > 0 &&
                _optionTypeTwoGas < type(uint128).max
        );
        uint32 eid = 1;

        bytes memory optionsTypeOne = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _optionTypeOneGas,
            _optionTypeOneValue
        );
        bytes memory optionsTypeTwo = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _optionTypeTwoGas,
            _optionTypeTwoValue
        );

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](2);
        enforcedOptions[0] = EnforcedOptionParam(eid, 1, optionsTypeOne);
        enforcedOptions[1] = EnforcedOptionParam(eid, 2, optionsTypeTwo);

        aONFT.setEnforcedOptions(enforcedOptions);

        assertEq(aONFT.enforcedOptions(eid, 1), optionsTypeOne);
        assertEq(aONFT.enforcedOptions(eid, 2), optionsTypeTwo);
    }

    function test_assert_options_type3_revert() public {
        uint32 eid = 1;
        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0004"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0004"));
        aONFT.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0002"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0002"));
        aONFT.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0001"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0001"));
        aONFT.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0003"); // IS type 3
        aONFT.setEnforcedOptions(enforcedOptions); // doesnt revert because option type 3
    }

    function test_combine_options(
        uint32 _eid,
        uint16 _msgType,
        uint128 _enforcedOptionGas,
        uint128 _enforcedOptionNativeDrop,
        uint128 _combinedOptionNativeDrop
    ) public {
        vm.assume(uint256(_enforcedOptionNativeDrop) + _combinedOptionNativeDrop < type(uint128).max);

        bytes memory enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _enforcedOptionGas,
            _enforcedOptionNativeDrop
        );
        EnforcedOptionParam[] memory enforcedOptionsArray = new EnforcedOptionParam[](1);
        enforcedOptionsArray[0] = EnforcedOptionParam(_eid, _msgType, enforcedOptions);
        aONFT.setEnforcedOptions(enforcedOptionsArray);

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            _combinedOptionNativeDrop,
            addressToBytes32(alice)
        );

        bytes memory expectedOptions = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(_enforcedOptionGas, _enforcedOptionNativeDrop)
            .addExecutorNativeDropOption(_combinedOptionNativeDrop, addressToBytes32(alice));

        bytes memory combinedOptions = aONFT.combineOptions(_eid, _msgType, extraOptions);
        assertEq(combinedOptions, expectedOptions);
    }

    function test_combine_options_no_extra_options(
        uint32 _eid,
        uint16 _msgType,
        uint128 _enforcedOptionGas,
        uint128 _enforcedOptionNativeGas
    ) public {
        bytes memory enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _enforcedOptionGas,
            _enforcedOptionNativeGas
        );
        EnforcedOptionParam[] memory enforcedOptionsArray = new EnforcedOptionParam[](1);
        enforcedOptionsArray[0] = EnforcedOptionParam(_eid, _msgType, enforcedOptions);
        aONFT.setEnforcedOptions(enforcedOptionsArray);

        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _enforcedOptionGas,
            _enforcedOptionNativeGas
        );

        bytes memory combinedOptions = aONFT.combineOptions(_eid, _msgType, "");
        assertEq(combinedOptions, expectedOptions);
    }

    function test_combine_options_no_enforced_options(
        uint32 _eid,
        uint16 _msgType,
        uint128 _combinedOptionNativeDrop
    ) public {
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            _combinedOptionNativeDrop,
            addressToBytes32(alice)
        );

        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            _combinedOptionNativeDrop,
            addressToBytes32(alice)
        );

        bytes memory combinedOptions = aONFT.combineOptions(_eid, _msgType, extraOptions);
        assertEq(combinedOptions, expectedOptions);
    }

    function test_oapp_inspector_inspect(uint256 _tokenId, bytes32 _to) public {
        uint32 dstEid = B_EID;

        bytes memory extraOptions = _createDefaultExecutorLzReceiveOptions();
        SendParam memory sendParam = SendParam(dstEid, _to, toSingletonArray(_tokenId), extraOptions, "");

        // doesnt revert
        (bytes memory message, ) = aONFT.buildMsgAndOptions(sendParam);

        // deploy a universal inspector, it automatically reverts
        oAppInspector = new InspectorMock();
        // set the inspector
        aONFT.setMsgInspector(address(oAppInspector));

        // does revert because inspector is set
        vm.expectRevert(abi.encodeWithSelector(IOAppMsgInspector.InspectionFailed.selector, message, extraOptions));
        (message, ) = aONFT.buildMsgAndOptions(sendParam);
    }
}
