import { setupManifest } from '@start9labs/start-sdk'
import { DeviceFilter } from '@start9labs/start-sdk/base/lib/osBindings/DeviceFilter'
import { FRIGATE_VERSION } from '../versions'

const variant = process.env.VARIANT || 'generic'

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const mutable = <T>(value: T): Mutable<T> => value as Mutable<T>

const defaultImage = {
  dockerTag: 'ghcr.io/remcoros/frigate-docker:' + FRIGATE_VERSION,
}

const amdImage = {
  dockerTag: 'ghcr.io/remcoros/frigate-docker:' + FRIGATE_VERSION + '-amd',
}

const rocmImage = {
  dockerTag: 'ghcr.io/remcoros/frigate-docker:' + FRIGATE_VERSION + '-rocm',
}

const imageConfigs = {
  generic: {
    arch: ['x86_64', 'aarch64'],
    source: defaultImage,
  },
  nvidia: {
    arch: ['x86_64'],
    nvidiaContainer: true,
    source: defaultImage,
  },
  amd: {
    arch: ['x86_64'],
    source: amdImage,
  },
  rocm: {
    arch: ['x86_64'],
    source: rocmImage,
  },
} as const

const deviceRequirements: Record<string, DeviceFilter[]> = {
  generic: [],
  nvidia: [
    {
      class: 'display',
      product: null,
      vendor: null,
      driver: 'nvidia',
      description: 'An NVIDIA GPU',
    },
  ],
  amd: [
    {
      class: 'display',
      product: null,
      vendor: null,
      driver: 'amdgpu',
      description: 'An AMD GPU supported by Mesa Rusticl/radeonsi',
    },
  ],
  rocm: [
    {
      class: 'display',
      product: null,
      vendor: null,
      driver: 'amdgpu',
      description: 'An AMD GPU supported by ROCm (discrete RDNA2/3/4)',
    },
  ],
}

export const manifest = setupManifest({
  id: 'frigate',
  title: 'Frigate Electrum Server',
  license: 'Apache 2.0',
  packageRepo: 'https://github.com/remcoros/frigate-startos',
  upstreamRepo: 'https://github.com/sparrowwallet/frigate',
  supportSite: 'https://github.com/sparrowwallet/frigate/issues',
  marketingUrl: 'https://github.com/sparrowwallet/frigate',
  donationUrl: 'https://sparrowwallet.com/donate/',
  description: {
    short: { en_US: 'Frigate Electrum Server' },
    long: {
      en_US:
        'Frigate is an experimental Electrum Server testing Silent Payments scanning with ephemeral client keys.',
    },
  },
  volumes: ['main'],
  images: {
    main: mutable(
      imageConfigs[variant as keyof typeof imageConfigs] ??
        imageConfigs.generic,
    ),
  },
  hardwareAcceleration: true,
  hardwareRequirements: {
    device: deviceRequirements[variant] ?? [],
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
    bitcoind: {
      description: { en_US: 'Used to subscribe to new block events.' },
      optional: false,
      metadata: {
        title: 'A Bitcoin Full Node',
        icon: 'https://bitcoin.org/img/icons/opengraph.png',
      },
    },
    electrs: {
      description: { en_US: 'Electrs Electrum server backend (optional).' },
      optional: true,
      metadata: {
        title: 'Electrs',
        icon: 'https://raw.githubusercontent.com/Start9Labs/electrs-startos/master/icon.svg',
      },
    },
    fulcrum: {
      description: { en_US: 'Fulcrum Electrum server backend (optional).' },
      optional: true,
      metadata: {
        title: 'Fulcrum',
        icon: 'https://raw.githubusercontent.com/Start9Labs/fulcrum-startos/next/icon.png',
      },
    },
  },
})
