// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import { EnforcedOptionParam, OAppOptionsType3 } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";

import { IONFT721 } from "../../../contracts/onft721/interfaces/IONFT721.sol";

import { ERC721Mock } from "./mocks/ERC721Mock.sol";
import { ONFT721Mock } from "./mocks/ONFT721Mock.sol";
import { ONFT721AdapterMock } from "./mocks/ONFT721AdapterMock.sol";
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

    uint256 internal constant DEFAULT_INITIAL_ONFTS_PER_EID = 256;

    address[] public onfts;
    ONFT721Mock internal aONFT;
    ONFT721Mock internal bONFT;
    ONFT721AdapterMock internal cONFTAdapter;
    ERC721Mock internal cERC721Mock;

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
    }

    /// @dev the initial number of ONFTS to mint per EID
    /// @dev Implementations may override this function to change the number of ONFTs minted per EID.
    function _initialNumONFTsPerEID() internal pure virtual returns (uint256) {
        return DEFAULT_INITIAL_ONFTS_PER_EID;
    }

    /// @dev wire the ONFTs and mint the initial ONFTs
    function _wireAndMintInitial() internal {
        // wire the onfts
        onfts = new address[](3);
        uint256 onftIndex = 0;
        onfts[onftIndex++] = address(aONFT);
        onfts[onftIndex++] = address(bONFT);
        onfts[onftIndex++] = address(cONFTAdapter);
        wireOApps(onfts);

        uint256 numONFTsPerEID = _initialNumONFTsPerEID();
        for (uint256 i = 0; i < numONFTsPerEID; i++) {
            aONFT.mint(alice, i);
        }
        for (uint256 i = numONFTsPerEID; i < numONFTsPerEID * 2; i++) {
            bONFT.mint(bob, i);
        }
        for (uint256 i = numONFTsPerEID * 2; i < numONFTsPerEID * 3; i++) {
            cERC721Mock.mint(charlie, i);
        }
    }

    function _setMeshDefaultEnforcedSendOption() internal {
        for (uint32 i = 0; i <= 3; i++) {
            _setDefaultEnforcedSendOption(address(aONFT), i);
            _setDefaultEnforcedSendOption(address(bONFT), i);
            _setDefaultEnforcedSendOption(address(cONFTAdapter), i);
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
