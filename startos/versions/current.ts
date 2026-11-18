import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const FRIGATE_VERSION = '1.6.1'

export const current = VersionInfo.of({
  version: '1.6.1:5',
  releaseNotes: {
    en_US: 'Mitigates Java4Shell (CVE-2026-114938) on affected x86-64 servers.',
    es_ES:
      'Mitiga Java4Shell (CVE-2026-114938) en los servidores x86-64 afectados.',
    de_DE:
      'Entschärft Java4Shell (CVE-2026-114938) auf betroffenen x86-64-Servern.',
    pl_PL:
      'Ogranicza podatność Java4Shell (CVE-2026-114938) na podatnych serwerach x86-64.',
    fr_FR:
      'Atténue Java4Shell (CVE-2026-114938) sur les serveurs x86-64 concernés.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
