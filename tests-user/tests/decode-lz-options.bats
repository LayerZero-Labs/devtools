# This will be run at the start of this testing suite,
# similar to beforeAll() in jest
setup() {
    # Load bats-assert and bats-support
    load "../lib/bats-support/load.bash"
    load "../lib/bats-assert/load.bash"

    # Install the binary so that we avoid race conditions
    npm install -g decode-lz-options
}

@test "should output version" {
    npx --yes decode-lz-options --version
}