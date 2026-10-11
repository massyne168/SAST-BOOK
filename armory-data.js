// Transcribed from the existing issue forms, file pages 02–26. Originals remain authoritative.
// Historical names/badges are intentionally not reconciled with the current roster.
const forms = [
  ['MATEO VARGAS','300','979738BTC536132','2026-09-26'],
  ['TOMMY VARGAS','301','940024OTJ725429','2026-09-26'],
  ['LUCAS MULLEN','333','251685ZNA666873','2026-09-26'],
  ['NACER MARTIN','323','469658JAJ143372','2026-09-26'],
  ['JUSEF KANE','377','241365TXJ313913','2026-09-26'],
  ['BENJY TESTA','363','385458KQM314097','2026-09-26'],
  ['JAY STERLING','321','220432KYG116732','2026-09-26'],
  ['SHANE WALSH','777','435144MDZ631603','2026-09-28'],
  ['LEON RAMIREZ','705','921636JVN267414','2026-09-28'],
  ['EDGARD ICEQU','702','722072GZY562878','2026-09-28'],
  ['ALEX LAZAREVICH PARVUS','666','465695XAY338496','2026-09-28'],
  ['HUNTER LAWSON','606','757593QGQ804359','2026-09-28'],
  ['ROBERT BOB','409','674455TSZ436301','2026-09-29'],
  ['ROBERT PARVUS',null,'474395TYL835838','2026-09-29'],
  ['MESUT ROBINSON','125','880664DJL610456','2026-10-01'],
  ['RICARDO GAMBINO','112','136739PAA252882','2026-10-01'],
  ['KINGO MEDOS','133','366011HAC943311','2026-10-01'],
  ['ALLISON DICAPRIO','305','354320RQH444270','2026-10-01'],
  ['KAITO NAGATA','197','754232CJT150747','2026-10-07'],
  ['RAY GROSSMAN','455','553832DTM350431','2026-10-07'],
  ['ALEXANDRA CHAVANE','499','588286BXF112123','2026-10-07'],
  ['CASSIUS PRINCETON','362','790688KAS254943','2026-10-07'],
  ['JONS GREEK','205','215358VNA301319','2026-10-07'],
  ['PABLO SANTOS','355','525032KBC430768','2026-10-07'],
  ['ORTEGAAA TREET','217','218316OKH101594','2026-10-08']
];
export const weapons = Object.freeze(forms.map(([assignedName, assignedBadgeNumber, serialNumber, issuedAt], index) => Object.freeze({
  id: `EL-TD-ARM-${String(index + 1).padStart(3, '0')}`,
  name: 'PD GLOCK', category: null, serialNumber, assignedOfficerId: null,
  assignedName, assignedBadgeNumber, issuedAt, returnedAt: null, notes: null,
  status: 'ISSUED', sourceStatus: 'ACTIVE / RETURN PENDING',
  sourcePage: index + 2, sourceUrl: `page-designs/page-${String(index + 2).padStart(2, '0')}.webp`
})));
// No historical audit trail exists. Importing source forms is not a new issue event.
export const activities = Object.freeze([]);
