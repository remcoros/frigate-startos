# Updating the upstream version

This package wraps [sparrowwallet/frigate](https://github.com/sparrowwallet/frigate), which publishes no container image of its own. The image comes from [remcoros/frigate-docker](https://github.com/remcoros/frigate-docker), a third-party build that downloads the upstream `.deb` and verifies it against Craig Raw's PGP signature and the release's sha256 manifest.

So an upstream release is only installable here once that image has been rebuilt and pushed. Check both.

## Determining the upstream version

- **Frigate** ([sparrowwallet/frigate](https://github.com/sparrowwallet/frigate)) — the release the package's `version` tracks:

  ```sh
  gh release view -R sparrowwallet/frigate --json tagName -q .tagName
  ```

- **The image** ([remcoros/frigate-docker](https://github.com/remcoros/frigate-docker)) — the tag `FRIGATE_VERSION` pins. Its tags carry a fourth segment for image rebuilds of one upstream release (`1.5.3` → `1.5.3.1` → `1.5.3.2`), so this is not always equal to the upstream tag:

  ```sh
  gh api repos/remcoros/frigate-docker/tags --jq '.[].name'
  ```

  Each release needs both tags before this package can move: `<tag>` (multi-arch, amd64 + arm64) and `<tag>-rocm` (amd64). Confirm they are on the registry:

  ```sh
  TOKEN=$(curl -sL 'https://ghcr.io/token?scope=repository:remcoros/frigate-docker:pull&service=ghcr.io' | jq -r .token)
  curl -sL -H "Authorization: Bearer $TOKEN" https://ghcr.io/v2/remcoros/frigate-docker/tags/list | jq -r '.tags[]'
  ```

## Re-resolving the digests

**The manifest pins each image by digest, and the digest — not the tag — is what gets pulled.** A bump that changes the tag and leaves the digest alone builds the _old_ image while every version string in the repo reads as the new one, and nothing warns you. So resolve both digests in the same edit as the tag.

```sh
TAG=<new tag>   # e.g. 1.5.3.4
TOKEN=$(curl -sL 'https://ghcr.io/token?scope=repository:remcoros/frigate-docker:pull&service=ghcr.io' | jq -r .token)
for t in "$TAG" "$TAG-rocm"; do
  printf '%-16s ' "$t"
  curl -sIL -H "Authorization: Bearer $TOKEN" \
    -H 'Accept: application/vnd.oci.image.index.v1+json' \
    -H 'Accept: application/vnd.docker.distribution.manifest.list.v2+json' \
    -H 'Accept: application/vnd.oci.image.manifest.v1+json' \
    -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
    "https://ghcr.io/v2/remcoros/frigate-docker/manifests/$t" \
    | grep -i '^docker-content-digest' | tr -d '\r'
done
```

Take the digests from the registry, never from a local `docker images` listing — the local one tells you what you happen to have cached, not what the registry serves. Both should come back as manifest _lists_; confirm the default one still carries `linux/amd64` **and** `linux/arm64`, since the `generic` variant declares both arches:

```sh
curl -sL -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: application/vnd.docker.distribution.manifest.list.v2+json' \
  "https://ghcr.io/v2/remcoros/frigate-docker/manifests/<digest>" \
  | jq -r '.manifests[] | "\(.platform.os)/\(.platform.architecture)"'
```

After editing, re-run the first command against the tags you just pinned and check the digests still match what is in `startos/manifest/index.ts`. That is the one check that catches a tag and digest drifting apart.

## Applying the bump

In `startos/versions/current.ts`:

- Set `FRIGATE_VERSION` to the image tag, without a leading `v`.
- Set `version` to the **upstream** Frigate release plus a packaging revision — `1.5.3:0` for a new upstream release, or `1.5.3:N+1` when only the image or this package changed.

In `startos/manifest/index.ts`, replace the `sha256:` digest in **both** `defaultSource` and `rocmSource` with the ones resolved above.

Then check the upstream release notes for new or renamed `config.toml` keys and reconcile `startos/fileModels/config.toml.ts` against them. Frigate does not reload its config at runtime, so a key this package writes but Frigate no longer reads fails silently.
