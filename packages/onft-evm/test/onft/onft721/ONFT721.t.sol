// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { ONFTComposeMsgCodec } from "../../../contracts/libs/ONFTComposeMsgCodec.sol";
import { ONFT721Adapter } from "../../../contracts/onft721/ONFT721Adapter.sol";
import { ONFT721 } from "../../../contracts/onft721/ONFT721.sol";

import { IONFT721 } from "../../../contracts/onft721/interfaces/IONFT721.sol";
import { ERC721Mock } from "./mocks/ERC721Mock.sol";
import { ONFT721MsgCodec } from "../../../contracts/onft721/libs/ONFT721MsgCodec.sol";
import { ComposerMock } from "../../mocks/ComposerMock.sol";
import { InspectorMock, IOAppMsgInspector } from "../../mocks/InspectorMock.sol";
import { MessagingFee, MessagingReceipt } from "../../../contracts/onft721/ONFT721Core.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

import { SendParam } from "../../../contracts/onft721/interfaces/IONFT721.sol";

import { ONFT721Mock } from "./mocks/ONFT721Mock.sol";
import { ONFT721AdapterMock } from "./mocks/ONFT721AdapterMock.sol";
import { ONFT721EnumerableMock } from "./mocks/ONFT721EnumerableMock.sol";
import { ONFT721Base } from "./ONFT721Base.sol";
// Forge imports
import "forge-std/console.sol";

contract ONFT721Test is ONFT721Base {
    using OptionsBuilder for bytes;

    bytes4 internal constant EXPECTED_ONFT721_ID = 0x23e18da6;
    uint8 internal constant EXPECTED_ONFT721_VERSION = 1;

    // also tests token() function
    function test_constructor() public {
        assertEq(aONFT.owner(), address(this));
        assertEq(bONFT.owner(), address(this));
        assertEq(cONFTAdapter.owner(), address(this));
        assertEq(dONFTEnumerable.owner(), address(this));

        assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(bONFT.balanceOf(bob), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(IERC721(cONFTAdapter.token()).balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(IERC721(dONFTEnumerable.token()).balanceOf(david), DEFAULT_INITIAL_ONFTS_PER_EID);

        assertEq(aONFT.token(), address(aONFT));
        assertEq(bONFT.token(), address(bONFT));
        assertEq(cONFTAdapter.token(), address(cERC721Mock));
        assertEq(dONFTEnumerable.token(), address(dONFTEnumerable));
    }

    function test_approvalRequired() public {
        assertFalse(aONFT.approvalRequired());
        assertFalse(bONFT.approvalRequired());
        assertTrue(cONFTAdapter.approvalRequired());
        assertFalse(dONFTEnumerable.approvalRequired());
    }

    function test_onftVersion() public {
        (bytes4 interfaceId, uint64 version) = aONFT.onftVersion();
        bytes4 expectedId = EXPECTED_ONFT721_ID;
        assertEq(interfaceId, expectedId);
        assertEq(version, EXPECTED_ONFT721_VERSION);
    }

    function test_send(uint16 _tokenToSend) public {
    // 1. Assume that the token is owned by charlie on C_EID ONFT721Adapter
    vm.assume(_tokenToSend >= 256 * 3 && _tokenToSend < 256 * 4);

    // 2. Set enforced options for SEND
    _setMeshDefaultEnforcedSendOption();

    // 3. Sanity check token balances and _tokenToSend ownership
    assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(bONFT.balanceOf(bob), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(dONFTEnumerable.balanceOf(david), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(IERC721(cONFTAdapter.token()).balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(IERC721(cONFTAdapter.token()).ownerOf(_tokenToSend), charlie);

    // 4. Send the same ONFT in a circle 10 times.
    //   a) C->D
    //   b) D->A
    //   c) A->B
    //   d) B->C
    for (uint8 i = 0; i < 10; i++) {
        vm.startPrank(charlie);
        IERC721(cONFTAdapter.token()).approve(address(cONFTAdapter), _tokenToSend);
        vm.stopPrank();
        _sendAndCheck(
            _tokenToSend,
            C_EID,
            D_EID,
            charlie,
            david,
            DEFAULT_INITIAL_ONFTS_PER_EID,
            DEFAULT_INITIAL_ONFTS_PER_EID,
            true,
            false
        );
        console.log("C->D success");
        _sendAndCheck(
            _tokenToSend,
            D_EID,
            A_EID,
            david,
            alice,
            DEFAULT_INITIAL_ONFTS_PER_EID + 1,
            DEFAULT_INITIAL_ONFTS_PER_EID,
            false,
            false
        );
        console.log("D->A success");
        _sendAndCheck(
            _tokenToSend,
            A_EID,
            B_EID,
            alice,
            bob,
            DEFAULT_INITIAL_ONFTS_PER_EID + 1,
            DEFAULT_INITIAL_ONFTS_PER_EID,
            false,
            false
        );
        console.log("A->B success");
        _sendAndCheck(
            _tokenToSend,
            B_EID,
            C_EID,
            bob,
            charlie,
            DEFAULT_INITIAL_ONFTS_PER_EID + 1,
            DEFAULT_INITIAL_ONFTS_PER_EID - 1,
            false,
            true
        );
        console.log("B->C success");
    }

    // 5. Check the final balances
    assertEq(aONFT.balanceOf(alice), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(bONFT.balanceOf(bob), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(IERC721(cONFTAdapter.token()).balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID);
    assertEq(dONFTEnumerable.balanceOf(david), DEFAULT_INITIAL_ONFTS_PER_EID);
}


    /// @dev Test to ensure that the quoteSend function reverts when the receiver is invalid.
    function test_quoteSend_InvalidReceiver(uint16 _tokenToSend) public {
        // 1. Assume that the token is owned by charlie on C_EID ONFT721Adapter
        vm.assume(_tokenToSend >= 256 * 2 && _tokenToSend < 256 * 3);

        // 2. Set enforced options for SEND
        _setMeshDefaultEnforcedSendOption();

        SendParam memory sendParam = SendParam(B_EID, addressToBytes32(address(0)), _tokenToSend, "", "", "");
        vm.expectRevert(IONFT721.InvalidReceiver.selector);
        IONFT721(onfts[2]).quoteSend(sendParam, false);
    }

    /// @dev Test to ensure that the send function reverts when the receiver is invalid.
    function test_send_InvalidReceiver(uint16 _tokenToSend) public {
        // 1. Assume that the token is owned by charlie on C_EID ONFT721Adapter
        vm.assume(_tokenToSend >= 256 * 3 && _tokenToSend < 256 * 4);

        // 2. Set enforced options for SEND
        _setMeshDefaultEnforcedSendOption();

        SendParam memory sendParam = SendParam(B_EID, addressToBytes32(address(0)), _tokenToSend, "", "", "");
        MessagingFee memory fee = MessagingFee(200_000, 0);

        vm.startPrank(charlie);
        IERC721(cONFTAdapter.token()).approve(address(cONFTAdapter), _tokenToSend);
        vm.expectRevert(IONFT721.InvalidReceiver.selector);
        IONFT721(onfts[2]).send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();
    }

    function test_sendAndCompose(uint8 _tokenToSend, bytes memory _composeMsg) public {
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
            _tokenToSend,
            options,
            _composeMsg,
            ""
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

    function test_ONFTComposeMsgCodec(uint64 _nonce, uint32 _srcEid, bytes memory _composeMsg) public {
        vm.assume(_composeMsg.length > 0);

        bytes memory message = ONFTComposeMsgCodec.encode(
            _nonce,
            _srcEid,
            abi.encodePacked(addressToBytes32(msg.sender), _composeMsg)
        );
        (uint64 nonce, uint32 srcEid, bytes32 composeFrom, bytes memory composeMsg) = this._decodeONFTComposeMsgCodec(
            message
        );

        assertEq(nonce, _nonce);
        assertEq(srcEid, _srcEid);
        assertEq(composeFrom, addressToBytes32(msg.sender));
        assertEq(composeMsg, _composeMsg);
    }

    function _decodeONFTComposeMsgCodec(
        bytes calldata _message
    ) public pure returns (uint64 nonce, uint32 srcEid, bytes32 composeFrom, bytes memory composeMsg) {
        nonce = ONFTComposeMsgCodec.nonce(_message);
        srcEid = ONFTComposeMsgCodec.srcEid(_message);
        composeFrom = ONFTComposeMsgCodec.composeFrom(_message);
        composeMsg = ONFTComposeMsgCodec.composeMsg(_message);
    }

    function test_debit(uint256 _tokenId) public {
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

    function test_credit(uint256 _tokenId) public {
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

    function test_ONFTAdapter_debitAndCredit(uint16 _tokenId) public {
        // Ensure that the tokenId is owned by userC
        vm.assume(_tokenId >= DEFAULT_INITIAL_ONFTS_PER_EID * 3 && _tokenId < DEFAULT_INITIAL_ONFTS_PER_EID * 4);
        vm.assume(cERC721Mock.ownerOf(_tokenId) == charlie);

        uint32 dstEid = C_EID;
        uint32 srcEid = C_EID;

        assertEq(cERC721Mock.balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID);
        assertEq(cERC721Mock.balanceOf(address(cONFTAdapter)), DEFAULT_INITIAL_ONFTS_PER_EID * 3);

        vm.prank(charlie);
        cERC721Mock.approve(address(cONFTAdapter), _tokenId);
        vm.prank(charlie);
        cONFTAdapter.debit(_tokenId, dstEid);

        // Ensure that
        // 1. userC balance is decremented by 1.
        // 2. The Adapter balance is incremented by 1.
        // 3. The Adapter is the owner of the token
        assertEq(cERC721Mock.balanceOf(charlie), DEFAULT_INITIAL_ONFTS_PER_EID - 1);
        assertEq(cERC721Mock.balanceOf(address(cONFTAdapter)), DEFAULT_INITIAL_ONFTS_PER_EID * 3 + 1);
        assertEq(cERC721Mock.ownerOf(_tokenId), address(cONFTAdapter));

        vm.prank(charlie);
        cONFTAdapter.credit(bob, _tokenId, srcEid);

        // Ensure that:
        // 1. userB balance is incremented by 1.
        // 2. The Adapter balance is decremented by 1.
        // 3. userB owns the token
        assertEq(cERC721Mock.balanceOf(address(bob)), 1);
        assertEq(cERC721Mock.balanceOf(address(cONFTAdapter)), DEFAULT_INITIAL_ONFTS_PER_EID * 3);
        assertEq(cERC721Mock.ownerOf(_tokenId), bob);
    }

    function _decodeONFTMsgCodec(
        bytes calldata _message
    ) public pure returns (bool isComposed, bytes32 sendTo, uint256 tokenId, bytes memory composeMsg) {
        isComposed = ONFT721MsgCodec.isComposed(_message);
        sendTo = ONFT721MsgCodec.sendTo(_message);
        tokenId = ONFT721MsgCodec.tokenId(_message);
        composeMsg = ONFT721MsgCodec.composeMsg(_message);
    }

    function test_buildMsgAndOptions(
        uint256 _tokenId,
        bytes memory _composeMsg,
        uint128 _baseGas,
        uint128 _value,
        uint128 _composeGas
    ) public {
        vm.assume(_baseGas > 0);
        vm.assume(_composeGas > 0);

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(_baseGas, _value);
        if (_composeMsg.length > 0) extraOptions = extraOptions.addExecutorLzComposeOption(0, _composeGas, _value);
        SendParam memory sendParam = SendParam(B_EID, addressToBytes32(alice), _tokenId, extraOptions, _composeMsg, "");

        (bytes memory message, bytes memory options) = aONFT.buildMsgAndOptions(sendParam);

        assertEq(options, extraOptions);
        (bool isComposed, bytes32 sendTo, uint256 tokenId, bytes memory composeMsg) = this._decodeONFTMsgCodec(message);
        assertEq(isComposed, _composeMsg.length > 0);
        assertEq(sendTo, addressToBytes32(alice));
        assertEq(tokenId, _tokenId);
        bytes memory expectedComposeMsg = abi.encodePacked(addressToBytes32(address(this)), _composeMsg);
        assertEq(composeMsg, _composeMsg.length > 0 ? expectedComposeMsg : bytes(""));
    }

    function test_buildMsgAndOptions_noComposition(
        uint256 _tokenId,
        bool _useEnforcedOptions,
        bool _useExtraOptions,
        uint128 _lzReceiveGas,
        uint128 _lzReceiveValue
    ) public {
        if (_useEnforcedOptions) _setMeshDefaultEnforcedSendOption();
        bytes memory extraOptions = _useExtraOptions
            ? OptionsBuilder.newOptions().addExecutorLzReceiveOption(_lzReceiveGas, _lzReceiveValue)
            : bytes("");
        SendParam memory sendParam = SendParam(B_EID, addressToBytes32(alice), _tokenId, extraOptions, "", "");

        (bytes memory message, bytes memory options) = aONFT.buildMsgAndOptions(sendParam);
        assertEq(options, aONFT.combineOptions(B_EID, 1, extraOptions));
        (bool isComposed_, bytes32 sendTo_, uint256 tokenId_, bytes memory composeMsg_) = this._decodeONFTMsgCodec(
            message
        );
        assertEq(isComposed_, false);
        assertEq(sendTo_, addressToBytes32(alice));
        assertEq(tokenId_, _tokenId);
        assertEq(composeMsg_.length, 0);
        assertEq(composeMsg_, "");
    }

    function test_setEnforcedOptions(
        uint32 _eid,
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

        bytes memory optionsTypeOne = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _optionTypeOneGas,
            _optionTypeOneValue
        );
        bytes memory optionsTypeTwo = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
            _optionTypeTwoGas,
            _optionTypeTwoValue
        );

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](2);
        enforcedOptions[0] = EnforcedOptionParam(_eid, 1, optionsTypeOne);
        enforcedOptions[1] = EnforcedOptionParam(_eid, 2, optionsTypeTwo);

        aONFT.setEnforcedOptions(enforcedOptions);

        assertEq(aONFT.enforcedOptions(_eid, 1), optionsTypeOne);
        assertEq(aONFT.enforcedOptions(_eid, 2), optionsTypeTwo);
    }

    function test_assertOptionsType3(uint32 _eid, bytes2 _prefix) public {
        vm.assume(_prefix != bytes2(0x0003));

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);

        bytes memory options = new bytes(2);
        assembly {
            mstore(add(options, 32), _prefix)
        }

        enforcedOptions[0] = EnforcedOptionParam(_eid, 1, options); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, options));
        aONFT.setEnforcedOptions(enforcedOptions);
    }

    function test_combineOptions(
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

    function test_combineOptions_noExtraOptions(
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

    function test_combineOptions_noEnforcedOptions(
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

    function test_OAppInspector_inspect(uint256 _tokenId, bytes32 _to) public {
        vm.assume(_to != bytes32(0));

        uint32 dstEid = B_EID;
        _setMeshDefaultEnforcedSendOption();

        SendParam memory sendParam = SendParam(dstEid, _to, _tokenId, "", "", "");

        // doesnt revert
        (bytes memory message, ) = aONFT.buildMsgAndOptions(sendParam);

        // deploy a universal inspector, it automatically reverts
        oAppInspector = new InspectorMock();
        aONFT.setMsgInspector(address(oAppInspector));

        // does revert because inspector is set
        vm.expectRevert(
            abi.encodeWithSelector(
                IOAppMsgInspector.InspectionFailed.selector,
                message,
                aONFT.enforcedOptions(B_EID, 1)
            )
        );
        (message, ) = aONFT.buildMsgAndOptions(sendParam);
    }

    function test_setBaseURI(address _user, string memory _baseTokenURI) public {
        vm.assume(_user != address(this));

        // 1. Test non privileged user
        vm.prank(_user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, _user));
        aONFT.setBaseURI(_baseTokenURI);

        // 2. Test setting with owner doesn't throw
        vm.expectEmit();
        emit ONFT721.BaseURISet(_baseTokenURI);
        aONFT.setBaseURI(_baseTokenURI);
    }
}
