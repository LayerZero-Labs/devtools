# None of the targets actually build any binaries so we make them all as phony
.PHONY: clean node_modules git_submodules

clean:
	rm -rf lib

# This is the overarching target that builds the lib/ directory
lib: clean node_modules git_submodules

# This target will get all the libraries from node_modules
# and copy them to the lib/ directory
node_modules:
	# First we create the parent directory
	mkdir -p lib/solidity-bytes-utils/src

	# We copy the contracts from solidity-bytes-utils
	# 
	# FIXME Due to a weird discrepancy between foundry compilation step
	# and forge test, we need to provide the contracts in both src and src/contracts
	cp -R node_modules/solidity-bytes-utils/contracts lib/solidity-bytes-utils/src
	cp -R node_modules/solidity-bytes-utils/contracts lib/solidity-bytes-utils/src/contracts
	
	# We also want to make sure to include the license & package.json
	cp node_modules/solidity-bytes-utils/package.json node_modules/solidity-bytes-utils/LICENSE lib/solidity-bytes-utils

# This target will get all the git submodules installed in src/ directory
# and copy them to lib/ directory
# 
# At this point we only have submodules in src/ so we can just copy everything
git_submodules:
	cp -R src/* lib
