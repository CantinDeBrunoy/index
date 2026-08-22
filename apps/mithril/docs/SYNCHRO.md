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

## Le moins de crypto maison possible

Le canal est **TLS 1.2 mutuel** (Schannel sous Windows, Conscrypt sur Android) : on
n'écrit ni échange de clés de session, ni chiffrement de trames, ni anti-rejeu. La seule
partie écrite à la main est l'**appairage**, parce que TLS ne sait pas qui est en face la
première fois — et elle tient en quatre messages.

## Identités

Chaque appareil possède une clé **ECDSA P-256** de longue durée et un **certificat
auto-signé** qui la porte, générés dans le magasin de clés de la plate-forme et **jamais
exportés** : CNG (Microsoft Software Key Storage Provider, portée utilisateur, nom
`Mithril.Identite`, certificat fabriqué par `CertCreateSelfSignCertificate` de `crypt32`)
sous Windows ; AndroidKeyStore (alias `mithril.identite`, certificat auto-signé produit à
la génération) sur Android. Validité : 20 ans ; le sujet est `CN=Mithril`. Le contenu du
certificat n'a aucune importance : seule compte son **empreinte**,
`SHA-256(certificat DER)`, épinglée des deux côtés à l'appairage.

Un appareil appairé est mémorisé par : nom, empreinte, dernières adresses connues. Sur
Windows dans `%APPDATA%\Mithril\appareils.mithril` (chiffré DPAPI) ; sur Android dans les
préférences chiffrées de l'application.

## TLS

- TLS 1.2 exactement (pas de 1.0/1.1 ; 1.3 accepté s'il est négocié des deux côtés).
- Suites ECDHE avec AES-GCM ou AES-CBC + SHA-256 ; ce que la plate-forme propose par défaut,
  sans suite RSA statique ni RC4/3DES (exclues par l'OS moderne).
- Les **deux** pairs présentent leur certificat. La validation ne passe jamais par le
  magasin de confiance système : c'est une comparaison d'empreinte, en temps constant.
  - En **session** : l'empreinte reçue doit être celle d'un appareil appairé, sinon la
    connexion est fermée et l'utilisateur prévenu (« l'identité de DJ a changé »).
  - En **appairage** : l'empreinte est acceptée provisoirement ; c'est le code qui la valide.
- Le port TCP et UDP est **27027**.

## Trame

À l'intérieur du TLS, tout message est une trame : `longueur` (uint32 grand-boutiste,
≤ 4 MiB) puis `type` (4 octets ASCII) puis `charge`. Une trame mal formée, trop longue ou
d'un type inattendu ferme la connexion sans réponse. Les entiers sont grand-boutistes, les
chaînes en UTF-8 préfixées d'un uint16, les clés ECDH éphémères en forme non compressée
(65 octets `04‖X‖Y`), les secrets ECDH réduits par `SHA-256(Z)` (Z = abscisse du point).

## Découverte (UDP, diffusion locale, hors TLS)

- Le téléphone diffuse `DECO` ‖ nonce (16 octets) sur 255.255.255.255:27027.
- Le PC répond en unicast, uniquement si l'expéditeur est une adresse privée :
  `DECO` ‖ nonce ‖ nom ‖ empreinte (32) ‖ port TCP (uint16).
- Rien n'est authentifié ici ; la découverte ne sert qu'à proposer des candidats. Un
  faux « DJ » ne passera pas l'appairage ni la session.

Hors du réseau local, le téléphone essaie les dernières adresses connues du PC (il en
reçoit la liste à chaque session, dont une éventuelle adresse Tailscale).

## Appairage (une fois par couple d'appareils)

Le PC n'accepte un appairage que lorsque l'utilisateur a ouvert « Appairer un
téléphone » (mode actif 2 minutes, 3 échecs → fermeture). Le code à 6 chiffres n'est pas
un secret tapé des deux côtés : il est **calculé à partir de l'échange**, affiché par le
PC et saisi sur le téléphone, qui le compare au sien (méthode « comparaison numérique »
de Bluetooth LE Secure Connections). Un intrus actif a une chance sur 10⁶ par tentative
et aucune attaque hors-ligne possible, contrairement à un code qui servirait de mot de
passe. L'engagement de l'étape 1 est indispensable : sans lui, un intrus qui tient deux
connexions (une avec chaque appareil) choisirait son nonce pour faire coïncider les deux
codes en un million d'essais, soit une seconde.

Tout se passe dans une connexion TLS dont les deux certificats sont encore inconnus ;
`F_p` et `F_t` désignent les empreintes des certificats PC et téléphone telles que
chacun les voit dans sa connexion — c'est ce qui lie le code au TLS : si un intrus
s'interpose, les empreintes vues de chaque côté diffèrent et les codes aussi.

1. Téléphone → PC `APP1` : engagement `SHA-256(E_t ‖ N_t)` (E_t clé ECDH éphémère,
   N_t nonce 16 octets).
2. PC → téléphone `APP2` : `E_p ‖ N_p`.
3. Téléphone → PC `APP3` : `E_t ‖ N_t`. Le PC vérifie l'engagement, sinon abandon.
4. Chacun calcule `K = SHA-256(ECDH(E_t, E_p))` et
   `code = HMAC-SHA256(K, "MSYN1 code" ‖ N_t ‖ N_p ‖ F_p ‖ F_t)` lu comme uint32
   grand-boutiste des 4 premiers octets, modulo 1 000 000, affiché sur 6 chiffres.
5. Le PC affiche le code. L'utilisateur le tape sur le téléphone ; le téléphone compare
   (temps constant) et, si égal, envoie `APP4` :
   `HMAC-SHA256(K, "MSYN1 tel" ‖ N_t ‖ N_p ‖ F_p ‖ F_t)`. Sinon il s'arrête et le signale.
6. Le PC vérifie `APP4` (temps constant) et répond `APP5` :
   `HMAC-SHA256(K, "MSYN1 pc" ‖ N_t ‖ N_p ‖ F_p ‖ F_t)` ‖ nom du PC. Le téléphone vérifie,
   envoie `NOM` ‖ nom du téléphone, et chacun mémorise l'autre (nom, empreinte, adresse).

Le PC n'affiche le code qu'après l'étape 3 : un téléphone inconnu ne peut pas faire
apparaître de code sans que l'utilisateur ait lui-même ouvert le mode appairage. Les
clés éphémères et K sont effacés dès la fin de l'appairage.

## Session (à chaque synchronisation)

Une connexion TLS mutuelle où chaque côté a reconnu l'empreinte de l'autre. Rien d'autre :
pas de message d'ouverture, la première trame est déjà `ETAT`.

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
- Aucun octet applicatif hors TLS, sauf la découverte UDP qui ne porte rien de secret ;
  aucune clé privée ne quitte les magasins de clés.
- Toutes les comparaisons d'empreintes, de MAC et de codes passent par une comparaison
  en temps constant.
- Limites : 4 MiB par trame, 10 s sans trame → fermeture, une session à la fois par
  appareil distant, poignée de main TLS bornée à 5 s.
- Le pare-feu Windows demande l'autorisation la première fois que Mithril écoute ;
  refuser revient à désactiver la synchronisation, rien d'autre.
