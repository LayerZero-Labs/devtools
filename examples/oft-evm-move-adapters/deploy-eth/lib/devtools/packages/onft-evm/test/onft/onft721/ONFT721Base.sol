// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { EnforcedOptionParam, OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { MessagingFee } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { IONFT721, SendParam } from "../../../contracts/onft721/interfaces/IONFT721.sol";
import { ONFT721Adapter } from "../../../contracts/onft721/ONFT721Adapter.sol";

import { ERC721Mock } from "./mocks/ERC721Mock.sol";
import { ONFT721Mock } from "./mocks/ONFT721Mock.sol";
import { ONFT721AdapterMock } from "./mocks/ONFT721AdapterMock.sol";
import { ONFT721EnumerableMock } from "./mocks/ONFT721EnumerableMock.sol";
import { InspectorMock, IOAppMsgInspector } from "../../mocks/InspectorMock.sol";

import { ONFTBaseTestHelper } from "../ONFTBaseTestHelper.sol";

abstract contract ONFT721Base is ONFTBaseTestHelper {
    using OptionsBuilder for bytes;

    string internal constant A_ONFT_NAME = "aONFT";
    string internal constant A_ONFT_SYMBOL = "aONFT";
    string internal constant B_ONFT_NAME = "bONFT";
    string internal constant B_ONFT_SYMBOL = "bONFT";
    string internal constant C_TOKEN_NAME = "cONFT";
    string internal constant C_TOKEN_SYMBOL = "cONFT";
    string internal constant D_TOKEN_NAME = "dONFTEnumerable";
    string internal constant D_TOKEN_SYMBOL = "dONFT";

    uint256 internal constant DEFAULT_INITIAL_ONFTS_PER_EID = 256;

    address[] public onfts;
    ONFT721Mock internal aONFT;
    ONFT721Mock internal bONFT;
    ONFT721AdapterMock internal cONFTAdapter;
    ERC721Mock internal cERC721Mock;
    ONFT721EnumerableMock internal dONFTEnumerable;

    InspectorMock internal oAppInspector;

    function setUp() public virtual override {
        super.setUp();

        _deployONFTs();
        _wireAndMintInitial();
    }

    /// @dev deploy ONFTs
    /// @notice this function should deploy aONFT, bONFT, cONFTAdapter, and cERC721Mock
    /// @dev Implementations may override this function to deploy TestableONFT721Mock, which contains additional testing functionality.
    function _deployONFTs() internal virtual {
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

        dONFTEnumerable = ONFT721EnumerableMock(
            _deployOApp(
                type(ONFT721EnumerableMock).creationCode,
                abi.encode(D_TOKEN_NAME, D_TOKEN_SYMBOL, address(endpoints[D_EID]), address(this))
            )
        );
    }

    /// @dev the initial number of ONFTS to mint per EID
    /// @dev Implementations may override this function to change the number of ONFTs minted per EID.
    function _initialNumONFTsPerEID() internal pure virtual returns (uint256) {
        return DEFAULT_INITIAL_ONFTS_PER_EID;
    }

    /// @dev wire the ONFTs and mint the initial ONFTs
    function _wireAndMintInitial() internal {
        // wire the onfts
        onfts = new address[](4);
        uint256 onftIndex = 0;
        onfts[onftIndex++] = address(aONFT);
        onfts[onftIndex++] = address(bONFT);
        onfts[onftIndex++] = address(cONFTAdapter);
        onfts[onftIndex++] = address(dONFTEnumerable);
        wireOApps(onfts);

        _mintOnAdapter();
        _distributeAcrossMesh();
    }

    /// @dev mint ONFTs on the adapter
    function _mintOnAdapter() internal {
        uint256 numONFTsPerEID = _initialNumONFTsPerEID();
        for (uint256 i = 0; i < numONFTsPerEID * 4; i++) {
            cERC721Mock.mint(charlie, i);
        }
    }

    function _distributeAcrossMesh() internal {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);
        uint256 numONFTsPerEID = _initialNumONFTsPerEID();

        // C -> A
        for (uint256 i = 0; i < numONFTsPerEID; i++) {
            vm.startPrank(charlie);
            IERC721(cONFTAdapter.token()).approve(address(cONFTAdapter), i);
            vm.stopPrank();
            _sendAndCheck(i, C_EID, A_EID, charlie, alice, options, numONFTsPerEID * 4 - i, i, true, false);
        }

        // C -> B
        for (uint256 i = numONFTsPerEID; i < numONFTsPerEID * 2; i++) {
            vm.startPrank(charlie);
            IERC721(cONFTAdapter.token()).approve(address(cONFTAdapter), i);
            vm.stopPrank();
            _sendAndCheck(
                i,
                C_EID,
                B_EID,
                charlie,
                bob,
                options,
                numONFTsPerEID * 4 - i,
                i - numONFTsPerEID,
                true,
                false
            );
        }

        // C -> D
        for (uint256 i = numONFTsPerEID * 2; i < numONFTsPerEID * 3; i++) {
            vm.startPrank(charlie);
            IERC721(cONFTAdapter.token()).approve(address(cONFTAdapter), i);
            vm.stopPrank();
            _sendAndCheck(
                i,
                C_EID,
                D_EID,
                charlie,
                david,
                options,
                numONFTsPerEID * 4 - i,
                i - (numONFTsPerEID * 2),
                true,
                false
            );
        }
    }

    function _sendAndCheck(
        uint256 _tokenToSend,
        uint32 _srcEid,
        uint32 _dstEid,
        address _from,
        address _to,
        uint256 _srcCount,
        uint256 _dstCount,
        bool _srcIsAdapter,
        bool _dstIsAdapter
    ) internal {
        _sendAndCheck(
            _tokenToSend,
            _srcEid,
            _dstEid,
            _from,
            _to,
            "",
            _srcCount,
            _dstCount,
            _srcIsAdapter,
            _dstIsAdapter
        );
    }

    function _sendAndCheck(
        uint256 _tokenToSend,
        uint32 _srcEid,
        uint32 _dstEid,
        address _from,
        address _to,
        bytes memory _options,
        uint256 _srcCount,
        uint256 _dstCount,
        bool _srcIsAdapter,
        bool _dstIsAdapter
    ) internal {
        SendParam memory sendParam = SendParam(_dstEid, addressToBytes32(_to), _tokenToSend, _options, "", "");
        MessagingFee memory fee = IONFT721(onfts[_srcEid - 1]).quoteSend(sendParam, false);

        vm.prank(_from);
        IONFT721(onfts[_srcEid - 1]).send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        verifyPackets(_dstEid, addressToBytes32(address(onfts[_dstEid - 1])));

        assertEq(
            IERC721(!_srcIsAdapter ? onfts[_srcEid - 1] : ONFT721Adapter(onfts[_srcEid - 1]).token()).balanceOf(_from),
            _srcCount - 1
        );
        assertEq(
            IERC721(!_dstIsAdapter ? onfts[_dstEid - 1] : ONFT721Adapter(onfts[_dstEid - 1]).token()).balanceOf(_to),
            _dstCount + 1
        );
        assertEq(
            IERC721(!_dstIsAdapter ? onfts[_dstEid - 1] : ONFT721Adapter(onfts[_dstEid - 1]).token()).ownerOf(
                _tokenToSend
            ),
            _to
        );
    }

    function _setMeshDefaultEnforcedSendOption() internal {
        for (uint32 i = 0; i <= 4; i++) {
            _setDefaultEnforcedSendOption(address(aONFT), i);
            _setDefaultEnforcedSendOption(address(bONFT), i);
            _setDefaultEnforcedSendOption(address(cONFTAdapter), i);
            _setDefaultEnforcedSendOption(address(dONFTEnumerable), i);
        }
    }

    function _setDefaultEnforcedSendOption(address _onft, uint32 _eid) internal {
        _setEnforcedSendOption(_onft, _eid, 200_000);
    }

    function _setEnforcedSendOption(address _onft, uint32 _eid, uint128 _gas) internal {
        _setEnforcedOption(_onft, _eid, 1, OptionsBuilder.newOptions().addExecutorLzReceiveOption(_gas, 0));
    }

    function _setEnforcedOption(address _onft, uint32 _eid, uint16 _optionId, bytes memory _options) internal {
        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);
        enforcedOptions[0] = EnforcedOptionParam(_eid, _optionId, _options);
        OAppOptionsType3(_onft).setEnforcedOptions(enforcedOptions);
    }
}
