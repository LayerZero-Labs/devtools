// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { DoubleEndedQueue } from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import { ONFTComposeMsgCodec } from "../../../contracts/libs/ONFTComposeMsgCodec.sol";

import { ERC721Mock } from "./mocks/ERC721Mock.sol";
import { ONFT721MsgCodec } from "../../../contracts/onft721/libs/ONFT721MsgCodec.sol";
import { ComposerMock } from "../../mocks/ComposerMock.sol";
import { InspectorMock, IOAppMsgInspector } from "../../mocks/InspectorMock.sol";
import { MessagingFee, MessagingReceipt } from "../../../contracts/onft721/ONFT721Core.sol";
import { IOAppOptionsType3, EnforcedOptionParam, OAppOptionsType3 } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";

import { SendParam } from "../../../contracts/onft721/interfaces/IONFT721.sol";
import { SendParamSingle, SendParamDouble, SendParamTriple } from "./mocks/interfaces/ITestableONFT721.sol";

import { ONFT721AdapterMock } from "./mocks/ONFT721AdapterMock.sol";
import { ITestableONFT721 } from "./mocks/interfaces/ITestableONFT721.sol";
import { ONFT721Base } from "./ONFT721Base.sol";
import { ONFT721Mock } from "./mocks/ONFT721Mock.sol";

contract ONFT721Test is ONFT721Base {
    using OptionsBuilder for bytes;
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;

    ITestableONFT721 internal aTestableONFT;

    function _initialNumONFTsPerEID() internal pure override returns (uint256) {
        return 10_000;
    }

    function _deployONFTs() internal override {
        aONFT = ONFT721Mock(
            _deployOApp(
                type(ONFT721Mock).creationCode,
                abi.encode(A_ONFT_NAME, A_ONFT_SYMBOL, address(endpoints[A_EID]), address(this))
            )
        );
        aTestableONFT = ITestableONFT721(address(aONFT));

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

    function createIds(uint256 length) internal pure returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](length);
        for (uint i = 0; i < length; i++) {
            ids[i] = i;
        }
        return ids;
    }

    function batch_helper(uint256 numIds, uint16 batchSize) internal {
        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);
        enforcedOptions[0] = EnforcedOptionParam(B_EID, 1, OptionsBuilder.newOptions().addExecutorLzReceiveOption(100_000, 0));
        OAppOptionsType3(address(aONFT)).setEnforcedOptions(enforcedOptions);
        uint256[] memory ids = createIds(numIds);

        uint256 incr = batchSize == 0 ? 1 : batchSize;
        for (uint256 i = 0; i < numIds; i += incr) {
            SendParam memory sendParam = SendParam(
                B_EID,
                addressToBytes32(bob),
                sliceUintArray(ids, i, i + batchSize),
                "", // adding extraOptions is expensive
                "" // composeMsg
            );
            MessagingFee memory fee = aTestableONFT.quoteSend(sendParam, false);
            vm.prank(alice);
            aTestableONFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        }
        uint256 numPackets = packetsQueue[B_EID][addressToBytes32(address(bONFT))].length();
        verifyPackets(B_EID, addressToBytes32(address(bONFT)), numPackets, address(0));
    }

    function test_onft721_batch_one() public {
        batch_helper(10_000, 1);
    }

    // TODO test that fails due to LZ_MessageLib_InvalidMessageSize (~300-310)
}
