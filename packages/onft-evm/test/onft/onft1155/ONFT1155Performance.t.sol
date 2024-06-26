// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { DoubleEndedQueue } from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

import { ONFTBaseTestHelper } from "../ONFTBaseTestHelper.sol";

import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import { EnforcedOptionParam } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import { SendParam, MessagingFee } from "../../../contracts/onft1155/interfaces/IONFT1155.sol";
import { ONFT1155Mock } from "./mocks/ONFT1155Mock.sol";
import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ONFT1155Performance is ONFTBaseTestHelper {
    using OptionsBuilder for bytes;
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;

    string internal constant A_URI = "http://a.com";
    string internal constant B_URI = "http://b.com";

    ONFT1155Mock internal aONFT;
    ONFT1155Mock internal bONFT;

    function setUp() public override {
        super.setUp();
        aONFT = new ONFT1155Mock(A_URI, endpoints[A_EID], address(this));
        bONFT = new ONFT1155Mock(B_URI, endpoints[B_EID], address(this));
        _wire();

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);
        enforcedOptions[0] = EnforcedOptionParam(
            B_EID,
            1,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(50_000_000, 0)
        );
        aONFT.setEnforcedOptions(enforcedOptions);
    }

    function _wire() internal {
        // wire the onfts
        address[] memory onfts = new address[](2);
        uint256 onftIndex = 0;
        onfts[onftIndex++] = address(aONFT);
        onfts[onftIndex++] = address(bONFT);
        wireOApps(onfts);
    }

    function _createIds(uint256 _startId, uint256 _numIds) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](_numIds);
        for (uint256 i = 0; i < _numIds; i++) {
            ids[i] = _startId + i;
        }
        return ids;
    }

    function _createCounts(uint256 _count, uint256 _numCounts) internal pure returns (uint256[] memory counts) {
        counts = new uint256[](_numCounts);
        for (uint256 i = 0; i < _numCounts; i++) {
            counts[i] = _count;
        }
        return counts;
    }

    function _mint(address _to, uint256 _startId, uint256 _numIds, uint256 _count) internal {
        aONFT.mintBatch(_to, _createIds(_startId, _numIds), _createCounts(_count, _numIds), "");
    }

    function test_one() public {
        _mint(alice, 0, 1, 5);
        assertEq(ERC1155(aONFT).balanceOf(alice, 0), 5);
        assertEq(ERC1155(aONFT).balanceOf(bob, 1), 0);
        _mint(bob, 1, 1, 2);
        assertEq(ERC1155(aONFT).balanceOf(bob, 1), 2);
    }

    function batch_helper(uint256 numIds, uint16 batchSize) internal {
        //        aONFT.setCost(B_EID, ONFT_TRANSFER_FIXED_COST, ONFT_TRANSFER_COST_PER_TOKEN);
        uint256[] memory ids = _createIds(0, numIds);

        uint256 incr = batchSize == 0 ? 1 : batchSize;
        for (uint256 i = 0; i < numIds; i += incr) {
            SendParam memory sendParam = SendParam(
                B_EID,
                addressToBytes32(bob),
                sliceUintArray(ids, i, i + batchSize),
                _createCounts(1, batchSize),
                "", // adding extraOptions is expensive
                "",
                ""
            );
            MessagingFee memory fee = aONFT.quoteSend(sendParam, false);
            vm.prank(alice);
            aONFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        }
        uint256 numPackets = packetsQueue[B_EID][addressToBytes32(address(bONFT))].length();
        verifyPackets(B_EID, addressToBytes32(address(bONFT)), numPackets, address(0));
    }
}
