/**
 * La mesure d'audience : Cloudflare Web Analytics, sans cookie ni identifiant, qui ne compte que des
 * chiffres d'ensemble (pages vues, pays, navigateur, temps de chargement). Le jeton est public par nature :
 * il figure dans le code de chaque page (dashboard Cloudflare → Web Analytics → le site). Vide, aucun
 * script ne se charge, et les mentions légales disent que le site ne mesure pas l'audience.
 */
export const WEB_ANALYTICS_TOKEN: string | undefined = undefined;
