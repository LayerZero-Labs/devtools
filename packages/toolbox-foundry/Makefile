# None of the targets actually build any binaries so we make them all as phony
.PHONY: clean node_modules git_submodules

clean:
	rm -rf lib

# This is the overarching target that builds the lib/ directory
lib: clean node_modules git_submodules

# This target will get all the libraries from node_modules
# and copy them to the lib/ directory
node_modules:
	#
	# solidity-bytes-utils
	#

	# First we make sure the target directory exists
	mkdir -p lib/solidity-bytes-utils

	# We copy the contracts
	cp -R node_modules/solidity-bytes-utils/contracts/. lib/solidity-bytes-utils/.

	# And we include the licenses & package.json
	cp node_modules/solidity-bytes-utils/package.json node_modules/solidity-bytes-utils/LICENSE* lib/solidity-bytes-utils/

# This target will get all the git submodules installed in src/ directory
# and copy them to lib/ directory
# 
# At this point we only have submodules in src/ so we can just copy everything
git_submodules:
	#
	# ds-test
	#

	# First we make sure the target directory exists
	mkdir -p lib/ds-test

	# We copy the contracts
	# 
	# The . at the end is important since GNU and BSD
	# have a different implementation of the cp command
	# 
	# Without the ., the command has different behavior on BSD (local, macOSX) and GNU (remote, CI/CD):
	# 
	# - on BSD, it will copy the contents of src folder into ds-test
	# - on GNU, it will copy the src folder into ds-test
	cp -R src/ds-test/src/. lib/ds-test/.

	# And we include the licenses & package.json
	cp src/ds-test/package.json src/ds-test/LICENSE lib/ds-test/

	# 
	# forge-std
	# 
	
	# First we make sure the target directory exists
	mkdir -p lib/forge-std
	
	# We copy the contracts
	cp -R src/forge-std/src/. lib/forge-std/.

	# And we include the licenses & package.json
	cp src/forge-std/package.json src/forge-std/LICENSE* lib/forge-std/
