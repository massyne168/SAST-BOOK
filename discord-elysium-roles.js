/*
 * ELYSIUM Discord snowflakes provided by the SAST project owner (2026-10-16).
 * Discord IDs are public identifiers, NOT authentication secrets.
 *
 * Access is the union of explicitly listed role IDs per book. A user only needs
 * one matching role for a book. Backend still verifies active guild membership
 * from Discord on each protected request.
 *
 * Conservative default: command-only books are limited to the three named top
 * command roles until the owner explicitly expands those permissions.
 * The optional DISCORD_BOOK_ROLES_JSON server variable replaces these defaults.
 */
export const ELYSIUM_DISCORD_GUILD_ID='1541899063501529178';

export const ELYSIUM_ROLE_IDS=Object.freeze({
  HIGH_COMMAND:'1541899063736274960',
  CHIEF_OF_POLICE:'1541899063782543485',
  ASSISTANT_CHIEF_OF_POLICE:'1542362114436505640',
  CAPTAIN:'1541899063782543482',
  LIEUTENANT:'1541899063748726843',
  MASTER_SERGEANT:'1542638181063860224',
  STAFF_SERGEANT:'1541899063748726842',
  SERGEANT:'1541899063748726841',
  MASTER_TROOPER:'1542361904197009490',
  SENIOR_TROOPER:'1542362699030331402',
  TROOPER_FIRST_CLASS:'1541899063748726838',
  TROOPER:'1541899063748726837',
  LAW_ENFORCEMENT_TROOPER:'1541899063623163996'
});

const TOP_COMMAND=[
  ELYSIUM_ROLE_IDS.HIGH_COMMAND,
  ELYSIUM_ROLE_IDS.CHIEF_OF_POLICE,
  ELYSIUM_ROLE_IDS.ASSISTANT_CHIEF_OF_POLICE
];

const ALL_TROOPER_ROLES=Object.values(ELYSIUM_ROLE_IDS);

export const ELYSIUM_BOOK_ROLE_IDS=Object.freeze({
  // Command books: restricted until a dedicated Armory/Intelligence role is supplied.
  archive:Object.freeze([...TOP_COMMAND]),
  classified:Object.freeze([...TOP_COMMAND]),

  // Shared reference / personnel / order books: any registered listed rank.
  directory:Object.freeze([...ALL_TROOPER_ROLES]),
  resignation:Object.freeze([...ALL_TROOPER_ROLES]),
  bulletins:Object.freeze([...ALL_TROOPER_ROLES])
});
