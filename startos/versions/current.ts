import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const FRIGATE_VERSION = '1.6.1'

export const current = VersionInfo.of({
  version: '1.6.1:4',
  releaseNotes: {
    en_US:
      'Requires StartOS 0.4.2 or later. Fixes the sync progress and syncing status, which could occasionally fail to update.',
    es_ES:
      'Requiere StartOS 0.4.2 o posterior. Corrige el progreso y el estado de sincronización, que a veces no se actualizaban.',
    de_DE:
      'Erfordert StartOS 0.4.2 oder neuer. Behebt Synchronisierungsfortschritt und -status, die sich gelegentlich nicht aktualisierten.',
    pl_PL:
      'Wymaga StartOS 0.4.2 lub nowszego. Naprawia postęp i stan synchronizacji, które czasem się nie aktualizowały.',
    fr_FR:
      'Nécessite StartOS 0.4.2 ou une version ultérieure. Corrige la progression et l’état de synchronisation, qui ne se mettaient parfois pas à jour.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
