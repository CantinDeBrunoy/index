# Protocole de synchronisation Mithril (MSYN1)

Référence commune à Mithril Windows (`src/Synchro.cs`) et Mithril Android
(`synchro/`). Toute divergence entre les deux implémentations se tranche ici, et toute
modification de ce document est une modification de protocole (changer le numéro).

## Ce que ça promet, et ce que ça ne promet pas

- Mithril ne parle **qu'à des appareils appairés par l'utilisateur**, sur un réseau
  privé (adresses RFC 1918, lien-local, ou plage 100.64/10 de Tailscale). Jamais
  d'adresse publique, jamais de relais, jamais de DNS, jamais de HTTP.
- Le fichier transporté est le coffre portable `MITHRIL3` : il est **déjà chiffré par
  la phrase de passe**. Le canal ajoute une seconde couche, et surtout garantit que
  l'on parle au bon appareil et que rien n'est altéré en route.
- **Rien n'est jamais perdu silencieusement** : l'ancienne version passe en `.bak`, et
  un conflit (modifications des deux côtés) produit un fichier `.conflit-…` signalé à
  l'utilisateur. Aucune fusion d'entrées en v1.
- Le PC écoute ; le téléphone initie (à l'ouverture, après chaque sauvegarde, au retour
  au premier plan). Une modification faite sur le PC arrive donc sur le téléphone à
  la prochaine ouverture de Mithril Android.

## Identités

Chaque appareil possède une paire de clés **ECDSA P-256** de longue durée, générée dans le
magasin de clés de la plate-forme et **jamais exportée** : CNG (Microsoft Software Key
Storage Provider, portée utilisateur, nom `Mithril.Identite`) sous Windows, AndroidKeyStore
(alias `mithril.identite`) sur Android. L'empreinte d'un appareil est
`SHA-256(clé publique en forme non compressée, 65 octets 04‖X‖Y)`.

Un appareil appairé est mémorisé par : nom, empreinte, clé publique, dernières adresses
connues. Sur Windows dans `%APPDATA%\Mithril\appareils.mithril` (chiffré DPAPI) ; sur
Android dans les préférences chiffrées de l'application.

## Trame

Tout message TCP est une trame : `longueur` (uint32 grand-boutiste, ≤ 4 MiB) puis
`type` (4 octets ASCII) puis `charge`. Une trame mal formée, trop longue ou d'un type
inattendu ferme la connexion sans réponse. Le port TCP et UDP est **27027**.

Les entiers sont grand-boutistes, les chaînes en UTF-8 préfixées d'un uint16, les
clés publiques en forme non compressée (65 octets), les signatures ECDSA en `r‖s`
(64 octets), les secrets ECDH réduits par `SHA-256(Z)` (Z = abscisse du point partagé).

## Découverte (UDP, diffusion locale)

- Le téléphone diffuse `DECO` ‖ nonce (16 octets) sur 255.255.255.255:27027.
- Le PC répond en unicast, uniquement si l'expéditeur est une adresse privée :
  `DECO` ‖ nonce ‖ nom ‖ empreinte (32) ‖ port TCP (uint16).
- Rien n'est authentifié ici ; la découverte ne sert qu'à proposer des candidats. Un
  faux « DJ » ne passera pas l'appairage ni la session.

Hors du réseau local, le téléphone essaie les dernières adresses connues du PC (il en
reçoit la liste à chaque session, dont une éventuelle adresse Tailscale).

## Appairage (une fois par couple d'appareils)

Le PC n'accepte un appairage que lorsque l'utilisateur a ouvert « Appairer un
téléphone » (mode actif 2 minutes, 3 échecs → fermeture). Le code à 6 chiffres n'est
pas un secret tapé des deux côtés : il est **calculé à partir de l'échange**, affiché par
le PC et saisi sur le téléphone, qui le compare au sien (méthode « comparaison
numérique » de Bluetooth LE Secure Connections). Un intrus actif a une chance sur
10⁶ par tentative et aucune attaque hors-ligne possible, contrairement à un code qui
servirait de mot de passe.

1. Téléphone → PC `APP1` : engagement `SHA-256(E_t ‖ N_t)` (E_t clé ECDH éphémère,
   N_t nonce 16 octets).
2. PC → téléphone `APP2` : `E_p ‖ N_p`.
3. Téléphone → PC `APP3` : `E_t ‖ N_t`. Le PC vérifie l'engagement, sinon abandon.
4. Chacun calcule `K = SHA-256(ECDH(E_t, E_p))` et
   `code = HMAC-SHA256(K, "MSYN1 code" ‖ N_t ‖ N_p)` lu comme uint32 grand-boutiste
   des 4 premiers octets, modulo 1 000 000, affiché sur 6 chiffres.
5. Le PC affiche le code. L'utilisateur le tape sur le téléphone ; le téléphone compare
   (temps constant) et, si égal, envoie `APP4` : `HMAC-SHA256(K, "MSYN1 tel" ‖ N_t ‖ N_p)`.
   Sinon il s'arrête et le signale.
6. Le PC vérifie `APP4`, puis chacun envoie à l'autre son identité, chiffrée avec les
   clés dérivées de K (voir « Canal ») : `IDEN` : nom ‖ clé publique ‖
   `Sig(identité, "MSYN1 appairage" ‖ N_t ‖ N_p ‖ E_t ‖ E_p)`. Chacun vérifie la
   signature avec la clé reçue et mémorise l'autre (nom, empreinte, clé, adresse).

Le PC n'affiche le code qu'après l'étape 3 : un téléphone inconnu ne peut pas faire
apparaître de code sans que l'utilisateur ait lui-même ouvert le mode appairage.

## Session (à chaque synchronisation)

Authentification mutuelle par les identités, confidentialité avant par ECDH éphémère.

1. Téléphone → PC `SES1` : `E_t ‖ N_t ‖ empreinte_tel`.
2. PC : refuse si l'empreinte n'est pas appairée. Répond `SES2` :
   `E_p ‖ N_p ‖ Sig_pc("MSYN1 session" ‖ N_t ‖ N_p ‖ E_t ‖ E_p ‖ empreinte_tel)`.
3. Téléphone : vérifie la signature avec la clé mémorisée du PC (sinon abandon, et
   l'utilisateur est prévenu : « l'identité du PC a changé »). Répond `SES3` :
   `Sig_tel("MSYN1 session" ‖ N_t ‖ N_p ‖ E_t ‖ E_p ‖ empreinte_pc)`.
4. PC : vérifie. À partir d'ici, tout passe par le canal.

## Canal

`K = SHA-256(ECDH)`, puis HKDF-SHA256 (RFC 5869), sel `N_t ‖ N_p`, info
`"MSYN1 " ‖ sens`, 64 octets par sens (`tel→pc`, `pc→tel`) : 32 pour AES-256, 32 pour
HMAC-SHA256. Une trame chiffrée `CHIF` contient :
`seq` (uint32, démarre à 0 par sens, jamais réutilisé) ‖ `IV` (16, aléatoire) ‖
`AES-256-CBC(PKCS7, message intérieur)` ‖ `HMAC-SHA256(seq ‖ IV ‖ chiffré)`.

Réception : vérifier le MAC en temps constant **avant** tout déchiffrement, exiger
`seq` strictement croissant, sinon fermer. Le message intérieur est lui-même
`type` (4) ‖ `charge`.

## Synchronisation du coffre

Chaque appareil garde, pour le coffre, l'empreinte SHA-256 du contenu **au dernier
échange réussi** (`dernier-echange`). La décision ne dépend d'aucune horloge.

1. Téléphone → PC `ETAT` : `empreinte_actuelle ‖ dernier-echange ‖ taille`.
   PC → téléphone `ETAT` : idem.
2. Décision (identique des deux côtés) :
   - empreintes actuelles égales → rien à faire, mettre à jour `dernier-echange` ;
   - un seul côté a changé depuis `dernier-echange` → il envoie, l'autre reçoit ;
   - les deux ont changé → **conflit** : le fichier le plus récent (mtime, seule
     utilisation de l'horloge, à titre de départage) est retenu des deux côtés, l'autre
     est conservé chez son propriétaire sous `coffre-portable.conflit-AAAAMMJJ-HHMMSS.mithril`,
     et les deux applis le signalent. Rien n'est effacé.
3. Transfert `FICH` : `mtime (int64, ms UTC)` ‖ contenu. Le récepteur vérifie la magie
   `MITHRIL3` et la cohérence de l'en-tête, écrit `.tmp`, pose `.bak`, remplace
   atomiquement, puis les deux mettent à jour `dernier-echange` à l'empreinte commune.
4. `ADRS` (PC → téléphone) : liste des adresses IP locales du PC, pour les prochaines
   tentatives hors réseau local. `FIN` ferme proprement.

Un transfert interrompu ne laisse qu'un `.tmp`, ignoré et nettoyé.

## Garde-fous

- Le PC n'accepte que les connexions d'adresses privées ; le reste est fermé sans lire.
- Aucun message non chiffré après `SES3` ; aucun secret de longue durée ne quitte les
  magasins de clés ; les clés de session sont effacées (`Array.Clear`) à la fermeture.
- Tous les MAC et toutes les comparaisons de codes passent par une comparaison en temps
  constant.
- Limites : 4 MiB par trame, 10 s sans trame → fermeture, une session à la fois par
  appareil distant.
- Le pare-feu Windows demande l'autorisation la première fois que Mithril écoute ;
  refuser revient à désactiver la synchronisation, rien d'autre.
