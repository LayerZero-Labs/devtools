// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OFTTest } from "@layerzerolabs/oft-evm-upgradeable/test/OFT.t.sol";
import { MyOFTAdapterUpgradeable } from "../../contracts/MyOFTAdapterUpgradeable.sol";
import { EndpointV2Mock } from "@layerzerolabs/test-devtools-evm-foundry/contracts/mocks/EndpointV2Mock.sol";
import { MyOFTUpgradeable } from "../../contracts/MyOFTUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyOFTUpgradeableTest is OFTTest {
    bytes32 internal constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function test_oft_implementation_initialization_disabled() public {
        MyOFTUpgradeable oftUpgradeable = MyOFTUpgradeable(
            _deployContractAndProxy(
                type(MyOFTUpgradeable).creationCode,
                abi.encode(address(endpoints[aEid])),
                abi.encodeWithSelector(MyOFTUpgradeable.initialize.selector, "oftUpgradeable", "oftUpgradeable", address(this))
            )
        );

        bytes32 implementationRaw = vm.load(address(oftUpgradeable), IMPLEMENTATION_SLOT);
        address implementationAddress = address(uint160(uint256(implementationRaw)));

        MyOFTUpgradeable oftUpgradeableImplementation = MyOFTUpgradeable(implementationAddress);

        vm.expectRevert(Initializable.InvalidInitialization.selector);
        oftUpgradeableImplementation.initialize("oftUpgradeable", "oftUpgradeable", address(this));

        EndpointV2Mock endpoint = EndpointV2Mock(address(oftUpgradeable.endpoint()));
        assertEq(endpoint.delegates(address(oftUpgradeable)), address(this));
        assertEq(endpoint.delegates(implementationAddress), address(0));
    }

    function test_oft_adapter_implementation_initialization_disabled() public {
        MyOFTAdapterUpgradeable oftAdapter = MyOFTAdapterUpgradeable(
            _deployContractAndProxy(
                type(MyOFTAdapterUpgradeable).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[cEid])),
                abi.encodeWithSelector(MyOFTAdapterUpgradeable.initialize.selector, address(this))
            )
        );

        bytes32 implementationRaw = vm.load(address(oftAdapter), IMPLEMENTATION_SLOT);
        address implementationAddress = address(uint160(uint256(implementationRaw)));

        MyOFTAdapterUpgradeable oftAdapterImplementation = MyOFTAdapterUpgradeable(implementationAddress);

        vm.expectRevert(Initializable.InvalidInitialization.selector);
        oftAdapterImplementation.initialize(address(this));

        EndpointV2Mock endpoint = EndpointV2Mock(address(oftAdapter.endpoint()));
        assertEq(endpoint.delegates(address(oftAdapter)), address(this));
        assertEq(endpoint.delegates(implementationAddress), address(0));
    }
}
