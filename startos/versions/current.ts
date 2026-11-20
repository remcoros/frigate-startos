import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const FRIGATE_VERSION = '1.6.1'

export const current = VersionInfo.of({
  version: '1.6.1:7',
  releaseNotes: {
    en_US:
      'With a Bitcoin too old to publish the RPC credential Frigate reads, Frigate no longer fails to start: it waits and tells you to update Bitcoin.',
    es_ES:
      'Con un Bitcoin demasiado antiguo para publicar la credencial RPC que Frigate lee, Frigate ya no falla al iniciarse: espera y le indica que actualice Bitcoin.',
    de_DE:
      'Mit einem Bitcoin, das zu alt ist, um die von Frigate gelesenen RPC-Zugangsdaten bereitzustellen, startet Frigate nicht mehr fehlerhaft: Es wartet und fordert Sie auf, Bitcoin zu aktualisieren.',
    pl_PL:
      'Gdy Bitcoin jest zbyt stary, by udostępniać dane uwierzytelniające RPC odczytywane przez Frigate, Frigate nie kończy już uruchamiania błędem: czeka i prosi o aktualizację Bitcoina.',
    fr_FR:
      "Avec un Bitcoin trop ancien pour publier l'identifiant RPC que Frigate lit, Frigate n'échoue plus au démarrage : il attend et vous invite à mettre Bitcoin à jour.",
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
