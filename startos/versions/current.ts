import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const FRIGATE_VERSION = '1.6.1'

export const current = VersionInfo.of({
  version: '1.6.1:2',
  releaseNotes: {
    en_US: `Wallets can now connect to Frigate over your server's IPv6 addresses.`,
    es_ES: `Las billeteras ahora pueden conectarse a Frigate a través de las direcciones IPv6 de tu servidor.`,
    de_DE: `Wallets können sich jetzt über die IPv6-Adressen deines Servers mit Frigate verbinden.`,
    pl_PL: `Portfele mogą teraz łączyć się z Frigate przez adresy IPv6 twojego serwera.`,
    fr_FR: `Les portefeuilles peuvent désormais se connecter à Frigate via les adresses IPv6 de votre serveur.`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
