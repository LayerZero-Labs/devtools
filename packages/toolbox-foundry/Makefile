# None of the targets actually build any binaries so we make them all as phony
.PHONY: node_modules git_submodules

# This is the overarching target that builds the lib/ directory
lib: node_modules git_submodules

# This target will get all the libraries from node_modules
# and copy them to the lib/ directory
node_modules:
	# First we copy the contracts from solidity-bytes-utils
	# 
	# We also want to make sure to include the license & package.json
	mkdir -p lib/solidity-bytes-utils
	cp -R node_modules/solidity-bytes-utils/contracts lib/solidity-bytes-utils/contracts
	cp node_modules/solidity-bytes-utils/package.json node_modules/solidity-bytes-utils/LICENSE lib/solidity-bytes-utils

# This target will get all the git submodules installed in src/ directory
# and copy them to lib/ directory
# 
# At this point we only have submodules in src/ so we can just copy everything
git_submodules:
	cp -R src/* lib
