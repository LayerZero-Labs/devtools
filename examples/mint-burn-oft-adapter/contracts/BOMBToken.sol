// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.16;

import "@openzeppelin-v4/contracts/access/AccessControlDefaultAdminRules.sol";
import "@openzeppelin-v4/contracts/token/ERC20/extensions/ERC20Votes.sol";

string constant NAME = "Bombie";
string constant SYMBOL = "BOMB";

contract BOMBToken is ERC20Votes, AccessControlDefaultAdminRules {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor() ERC20Permit(NAME) ERC20(NAME, SYMBOL) AccessControlDefaultAdminRules(3 days, msg.sender) {}

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
    }

    function _maxSupply() internal view virtual override returns (uint224) {
        return 10_000_000_000 * 1e18;
    }
}
