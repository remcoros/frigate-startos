import { sdk } from './sdk'
import { i18n } from './i18n'
import { electrumHostId, electrumPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const electrumMulti = sdk.MultiHost.of(effects, electrumHostId)
  // secure: null still allocates a plaintext external port. It is reachable
  // over lxcbr0 — the address dependents resolve — and from nowhere else, so
  // off the box the TLS one is all there is.
  const electrumMultiOrigin = await electrumMulti.bindPort(electrumPort, {
    protocol: null,
    addSsl: {
      preferredExternalPort: 50002,
      alpn: null,
    },
    preferredExternalPort: electrumPort,
    secure: null,
  })

  const electrum = sdk.createInterface(effects, {
    name: i18n('Electrum (SSL)'),
    id: 'electrum',
    description: i18n('The Electrum protocol endpoint, served over SSL'),
    type: 'api',
    // protocol: null leaves the origin scheme-less, which renders every address
    // as a bare host:port with nothing marking it as TLS.
    schemeOverride: { ssl: 'ssl', noSsl: 'tcp' },
    masked: false,
    username: null,
    path: '',
    query: {},
  })

  const electrumReceipt = await electrumMultiOrigin.export([electrum])

  return [electrumReceipt]
})
