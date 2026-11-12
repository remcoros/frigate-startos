import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const FRIGATE_VERSION = '1.6.1'

export const current = VersionInfo.of({
  version: '1.6.1:3',
  releaseNotes: {
    en_US:
      'Requires StartOS 0.4.2 or later. Fixes a case where Frigate could stop responding until restarted.',
    es_ES:
      'Requiere StartOS 0.4.2 o posterior. Corrige un caso en el que Frigate podía dejar de responder hasta reiniciarlo.',
    de_DE:
      'Erfordert StartOS 0.4.2 oder neuer. Behebt einen Fall, in dem Frigate bis zu einem Neustart nicht mehr reagieren konnte.',
    pl_PL:
      'Wymaga StartOS 0.4.2 lub nowszego. Naprawia przypadek, w którym Frigate mógł przestać odpowiadać aż do ponownego uruchomienia.',
    fr_FR:
      'Nécessite StartOS 0.4.2 ou une version ultérieure. Corrige un cas où Frigate pouvait cesser de répondre jusqu’à son redémarrage.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
