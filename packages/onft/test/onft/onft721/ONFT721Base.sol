// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { ERC721Mock } from "./mocks/ERC721Mock.sol";
import { ONFT721Mock } from "./mocks/ONFT721Mock.sol";
import { ONFT721AdapterMock } from "./mocks/ONFT721AdapterMock.sol";
import { InspectorMock, IOAppMsgInspector } from "../../mocks/InspectorMock.sol";

import { ONFTBaseTestHelper } from "../ONFTBaseTestHelper.sol";

abstract contract ONFT721Base is ONFTBaseTestHelper {
    string internal constant A_ONFT_NAME = "aONFT";
    string internal constant A_ONFT_SYMBOL = "aONFT";
    string internal constant B_ONFT_NAME = "bONFT";
    string internal constant B_ONFT_SYMBOL = "bONFT";
    string internal constant C_TOKEN_NAME = "cONFT";
    string internal constant C_TOKEN_SYMBOL = "cONFT";

    uint256 internal constant DEFAULT_INITIAL_ONFTS_PER_EID = 256;

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
    function _deployONFTs() internal virtual;

    /// @dev the initial number of ONFTS to mint per EID
    /// @dev Implementations may override this function to change the number of ONFTs minted per EID.
    function _initialNumONFTsPerEID() internal pure virtual returns (uint256) {
        return DEFAULT_INITIAL_ONFTS_PER_EID;
    }

    /// @dev wire the ONFTs and mint the initial ONFTs
    function _wireAndMintInitial() internal {
        // wire the onfts
        address[] memory onfts = new address[](3);
        uint256 onftIndex = 0;
        onfts[onftIndex++] = address(aONFT);
        onfts[onftIndex++] = address(bONFT);
        onfts[onftIndex++] = address(cONFTAdapter);
        this.wireOApps(onfts);

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
}
