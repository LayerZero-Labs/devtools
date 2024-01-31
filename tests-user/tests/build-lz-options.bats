

@test "should output version" {
    npx --yes build-lz-options --version
}

@test "should not have binding problems" {
    run npx --yes build-lz-options --version

    refute_output --partial "Failed to load bindings"
}