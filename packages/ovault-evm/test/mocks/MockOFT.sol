// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract MockOFT is OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}

contract MockOFTAdapter is OFTAdapter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(msg.sender) {}
}

contract NonPayableContract {
    // No receive() or fallback() function - cannot receive native tokens
}
