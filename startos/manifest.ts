import { setupManifest } from '@start9labs/start-sdk'
import { ImageSource } from '@start9labs/start-sdk/base/lib/osBindings'
import { SDKImageInputSpec } from '@start9labs/start-sdk/base/lib/types/ManifestTypes'
import { FRIGATE_VERSION } from './install/versions'

const BUILD = process.env.BUILD || ''

const architectures =
  BUILD === 'x86_64' || BUILD === 'aarch64' ? [BUILD] : ['x86_64', 'aarch64']

export const manifest = setupManifest({
  id: 'frigate-testnet',
  title: 'Frigate Electrum Server (testnet4)',
  license: 'Apache 2.0',
  wrapperRepo: 'https://github.com/remcoros/frigate-startos/tree/testnet4',
  upstreamRepo: 'https://github.com/sparrowwallet/frigate',
  supportSite: 'https://github.com/sparrowwallet/frigate/issues',
  docsUrl:
    'https://github.com/remcoros/frigate-startos/blob/main/instructions.md',
  marketingSite: 'https://github.com/sparrowwallet/frigate',
  donationUrl: 'https://sparrowwallet.com/donate/',
  description: {
    short: 'Frigate Electrum Server (testnet4)',
    long: 'Frigate is an experimental Electrum Server testing Silent Payments scanning with ephemeral client keys.',
  },
  volumes: ['main'],
  images: {
    main: {
      arch: architectures,
      source: {
        dockerTag: 'ghcr.io/remcoros/frigate-docker:' + FRIGATE_VERSION,
      } as ImageSource,
    } as SDKImageInputSpec,
  },
  hardwareRequirements: {
    arch: architectures,
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {
    'bitcoind-testnet': {
      description: 'Used to subscribe to new block events.',
      optional: false,
      metadata: {
        title: 'A Bitcoin Full Node (testnet4)',
        icon: 'https://bitcoin.org/img/icons/opengraph.png',
      },
    },
    'electrs-testnet': {
      description: 'Electrs (testnet4)',
      optional: true,
      metadata: {
        title: 'Electrs (testnet4)',
        icon: 'https://github.com/Start9Labs/electrs-startos/blob/master/icon.png?raw=true',
      },
    },
    fulcrum: {
      description: 'Fulcrum',
      optional: true,
      metadata: {
        title: 'Fulcrum',
        icon: 'https://github.com/linkinparkrulz/fulcrum-startos/blob/master/icon.png?raw=true',
      },
    },
  },
})
