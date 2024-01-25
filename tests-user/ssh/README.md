To avoid manually needing to verify known hosts when connecting to GitHub in our user tests
(see `docker-compose.registry.yaml`) we add public key fingerprints to our known hosts.

These should only be used in the user tests.

See [GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints) for more information.