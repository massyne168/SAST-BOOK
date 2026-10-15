// Official officer roster. Edit name, rank, and badge here; keep badges as strings.
const sourcePersonnel = [
  {
    "id": "trooper-001",
    "name": "AGRZAM MAZRGA",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-002",
    "name": "AIDEN MORGAN MORGAN",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-003",
    "name": "ALEX ARTHUR",
    "rankId": "OFFICER 1",
    "badge": "0126"
  },
  {
    "id": "trooper-004",
    "name": "AYOUB TAZI",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-005",
    "name": "AZIX NOPA",
    "rankId": "CADET",
    "badge": "0113"
  },
  {
    "id": "trooper-006",
    "name": "ALBERTO MARTINEZ",
    "rankId": "CADET",
    "badge": "0111"
  },
  {
    "id": "trooper-007",
    "name": "ALCAPONE MARA",
    "rankId": "OFFICER 1",
    "badge": "0244"
  },
  {
    "id": "trooper-008",
    "name": "ALEX L PARVUS",
    "rankId": "CHIEF OF POLICE",
    "badge": "0666"
  },
  {
    "id": "trooper-009",
    "name": "ALEXANDRA CHAVANE",
    "rankId": "OFFICER 2",
    "badge": "0499"
  },
  {
    "id": "trooper-010",
    "name": "ALLISON DICAPRIO",
    "rankId": "OFFICER 2",
    "badge": "0305"
  },
  {
    "id": "trooper-011",
    "name": "ANGEL HANSEN",
    "rankId": "SERGEANT 1",
    "badge": "0000"
  },
  {
    "id": "trooper-012",
    "name": "BENJY TESTA",
    "rankId": "OFFICER 2",
    "badge": "0363"
  },
  {
    "id": "trooper-013",
    "name": "BLEECKER GUZMAN",
    "rankId": "SENIOR OFFICER",
    "badge": "0000"
  },
  {
    "id": "trooper-014",
    "name": "CAMERON MADDOX",
    "rankId": "SENIOR OFFICER",
    "badge": "0366"
  },
  {
    "id": "trooper-015",
    "name": "CARLOSS LAALIOUI",
    "rankId": "CADET",
    "badge": "0000"
  },
  {
    "id": "trooper-016",
    "name": "CASSIUS PRINCETON",
    "rankId": "SENIOR OFFICER",
    "badge": "0362"
  },
  {
    "id": "trooper-017",
    "name": "CONNOR MORGAN",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-018",
    "name": "DANILO MARTINEZ",
    "rankId": "OFFICER 1",
    "badge": "0512"
  },
  {
    "id": "trooper-019",
    "name": "DARK MILO",
    "rankId": "SENIOR OFFICER",
    "badge": "0399"
  },
  {
    "id": "trooper-020",
    "name": "DAVID NATCHO",
    "rankId": "OFFICER 1",
    "badge": "0220"
  },
  {
    "id": "trooper-021",
    "name": "EDWARD JIDOUN",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-022",
    "name": "EDGARD ICEQU",
    "rankId": "CAPTAIN",
    "badge": "0702"
  },
  {
    "id": "trooper-023",
    "name": "EVALO MARTINEZ",
    "rankId": "CADET",
    "badge": "0114"
  },
  {
    "id": "trooper-024",
    "name": "GARCIA ZAK",
    "rankId": "OFFICER 1",
    "badge": "0396"
  },
  {
    "id": "trooper-025",
    "name": "GLITCH HICKS",
    "rankId": "OFFICER 1",
    "badge": "0133"
  },
  {
    "id": "trooper-026",
    "name": "GUSTAVO ELPATCHO",
    "rankId": "CADET",
    "badge": "0000"
  },
  {
    "id": "trooper-027",
    "name": "HANK VOIGHT",
    "rankId": "LIEUTENANT",
    "badge": "0401"
  },
  {
    "id": "trooper-028",
    "name": "HASSAN ZEBDA",
    "rankId": "OFFICER 1",
    "badge": "0377"
  },
  {
    "id": "trooper-029",
    "name": "HUNTER LAWSON",
    "rankId": "LIEUTENANT",
    "badge": "0606"
  },
  {
    "id": "trooper-030",
    "name": "IBRAHIM ALQURACHI",
    "rankId": "OFFICER 1",
    "badge": "0127"
  },
  {
    "id": "trooper-031",
    "name": "IGNACIO CASSIDY",
    "rankId": "OFFICER 2",
    "badge": "0308"
  },
  {
    "id": "trooper-032",
    "name": "JAMES RAMIREZ",
    "rankId": "SENIOR OFFICER",
    "badge": "0000"
  },
  {
    "id": "trooper-033",
    "name": "JAKE MRV",
    "rankId": "CADET",
    "badge": "0000"
  },
  {
    "id": "trooper-034",
    "name": "JAXSON REED",
    "rankId": "OFFICER 1",
    "badge": "0220"
  },
  {
    "id": "trooper-035",
    "name": "JAY STERLING",
    "rankId": "SERGEANT 3",
    "badge": "0605"
  },
  {
    "id": "trooper-036",
    "name": "JONS GREEK",
    "rankId": "OFFICER 1",
    "badge": "0205"
  },
  {
    "id": "trooper-037",
    "name": "JOSEPH STALINE",
    "rankId": "OFFICER 1",
    "badge": "0206"
  },
  {
    "id": "trooper-038",
    "name": "JOSH BROWN",
    "rankId": "OFFICER 1",
    "badge": "0311"
  },
  {
    "id": "trooper-039",
    "name": "KAI MARTINEZ",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-040",
    "name": "KAITO NAGATA",
    "rankId": "OFFICER 1",
    "badge": "0297"
  },
  {
    "id": "trooper-041",
    "name": "KALVIN PHILIPS",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-042",
    "name": "KANE JUSEF",
    "rankId": "OFFICER 2",
    "badge": "0377"
  },
  {
    "id": "trooper-043",
    "name": "LANDER SADAM",
    "rankId": "OFFICER 1",
    "badge": "0267"
  },
  {
    "id": "trooper-044",
    "name": "LEON RAMIREZ",
    "rankId": "CHIEF OF POLICE",
    "badge": "0000"
  },
  {
    "id": "trooper-045",
    "name": "LIL CARTER",
    "rankId": "CADET",
    "badge": "0199"
  },
  {
    "id": "trooper-046",
    "name": "LUCAS VOIGHT",
    "rankId": "SERGEANT 3",
    "badge": "0444"
  },
  {
    "id": "trooper-047",
    "name": "MATEO VARGAS",
    "rankId": "OFFICER 2",
    "badge": "0300"
  },
  {
    "id": "trooper-048",
    "name": "MESUT ROBINSON",
    "rankId": "OFFICER 1",
    "badge": "0125"
  },
  {
    "id": "trooper-049",
    "name": "MIKASA ANGEL",
    "rankId": "SERGEANT 1",
    "badge": "0322"
  },
  {
    "id": "trooper-050",
    "name": "MORO MORGAN",
    "rankId": "OFFICER 1",
    "badge": "0210"
  },
  {
    "id": "trooper-051",
    "name": "NACER MARTIN",
    "rankId": "SENIOR OFFICER",
    "badge": "0323"
  },
  {
    "id": "trooper-052",
    "name": "ORTEGAA TREEET",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-053",
    "name": "OZMA VON",
    "rankId": "SENIOR OFFICER",
    "badge": "0000"
  },
  {
    "id": "trooper-054",
    "name": "PABLO SANTOS",
    "rankId": "OFFICER 1",
    "badge": "0355"
  },
  {
    "id": "trooper-055",
    "name": "PETER SALAMONCA",
    "rankId": "CADET",
    "badge": "0177"
  },
  {
    "id": "trooper-056",
    "name": "RICARDO GAMBINO",
    "rankId": "OFFICER 1",
    "badge": "0112"
  },
  {
    "id": "trooper-057",
    "name": "ROBERT BOB",
    "rankId": "SERGEANT 3",
    "badge": "0409"
  },
  {
    "id": "trooper-058",
    "name": "RAMIREZ ALEJANDRO",
    "rankId": "SENIOR OFFICER",
    "badge": "0000"
  },
  {
    "id": "trooper-059",
    "name": "RICO ALVAREZ",
    "rankId": "OFFICER 1",
    "badge": "0123"
  },
  {
    "id": "trooper-060",
    "name": "RIFI SOLO",
    "rankId": "OFFICER 1",
    "badge": "0000"
  },
  {
    "id": "trooper-061",
    "name": "RIO NAZARO",
    "rankId": "CADET",
    "badge": "0106"
  },
  {
    "id": "trooper-062",
    "name": "ROBERT HICKS",
    "rankId": "SERGEANT 3",
    "badge": "0507"
  },
  {
    "id": "trooper-063",
    "name": "ROBERT PARVUS",
    "rankId": "COMMISSIONER",
    "badge": "0800"
  },
  {
    "id": "trooper-064",
    "name": "SHIROX MARTINEZ",
    "rankId": "OFFICER 1",
    "badge": "0345"
  },
  {
    "id": "trooper-065",
    "name": "SCOTT GUZMAN",
    "rankId": "LIEUTENANT",
    "badge": "0000"
  },
  {
    "id": "trooper-066",
    "name": "SHANE WALSH",
    "rankId": "CHIEF OF POLICE",
    "badge": "0777"
  },
  {
    "id": "trooper-067",
    "name": "TAHA THEPLUG",
    "rankId": "CADET",
    "badge": "0000"
  },
  {
    "id": "trooper-068",
    "name": "TARIC FILALI",
    "rankId": "OFFICER 1",
    "badge": "0279"
  },
  {
    "id": "trooper-069",
    "name": "TOMMY VARGAS",
    "rankId": "OFFICER 2",
    "badge": "0301"
  },
  {
    "id": "trooper-070",
    "name": "XAVRO SANTOS",
    "rankId": "OFFICER 2",
    "badge": "0355"
  },
  {
    "id": "trooper-071",
    "name": "YOUNG DIESEL",
    "rankId": "OFFICER 1",
    "badge": "0467"
  },
  {
    "id": "trooper-072",
    "name": "ZAKHAR ARSSENI",
    "rankId": "ASSISTANT CHIEF OF POLICE",
    "badge": "0601"
  },
  {
    "id": "trooper-073",
    "name": "ASHA BILLCLINTON",
    "rankId": "OFFICER 1",
    "badge": "0243"
  },
  {
    "id": "trooper-074",
    "name": "DIEGO JOSE",
    "rankId": "CADET",
    "badge": "0000"
  },
  {
    "id": "trooper-075",
    "name": "DOLLAR ODEE",
    "rankId": "OFFICER 2",
    "badge": "0000"
  },
  {
    "id": "trooper-076",
    "name": "JESTER LBOGOS",
    "rankId": "OFFICER 1",
    "badge": "0524"
  },
  {
    "id": "trooper-077",
    "name": "JUAN JOSI",
    "rankId": "SENIOR OFFICER",
    "badge": "0000"
  },
  {
    "id": "trooper-078",
    "name": "LIONEL PASCAL",
    "rankId": "FREELANCER",
    "badge": "0706"
  },
  {
    "id": "trooper-079",
    "name": "MEDOS KINGO",
    "rankId": "OFFICER 2",
    "badge": "0233"
  },
  {
    "id": "trooper-080",
    "name": "RAY GROSSMAN",
    "rankId": "SENIOR OFFICER",
    "badge": "0455"
  }
];

// Rank order and page capacity are kept with the editable roster.
export const directoryRanks = [
  "COMMISSIONER",
  "CHIEF OF POLICE",
  "ASSISTANT CHIEF OF POLICE",
  "CAPTAIN",
  "LIEUTENANT",
  "SERGEANT 3",
  "SERGEANT 1",
  "SENIOR OFFICER",
  "OFFICER 2",
  "OFFICER 1",
  "CADET",
  "FREELANCER"
];
export let rankDirectoryData = sourcePersonnel.map(person => ({...person}));
export const officersPerPage = 7;
export const rankById = Object.freeze(Object.fromEntries(directoryRanks.map(rankId => [rankId, {id: rankId, label: rankId}])));
export const buildDirectoryPages = (people = rankDirectoryData) => directoryRanks.flatMap(rankId => {
  const assigned = people.filter(person => person.rankId === rankId)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return Array.from({length: Math.max(1, Math.ceil(assigned.length / officersPerPage))}, (_, index) => ({
    rankId,
    rank: rankById[rankId].label,
    continued: index > 0,
    people: assigned.slice(index * officersPerPage, (index + 1) * officersPerPage)
  }));
});
export let directoryPages = buildDirectoryPages();
export let directoryPageCount = directoryPages.length;
export const replaceDirectoryPersonnel = people => {
  if (!Array.isArray(people)) throw new TypeError('Personnel must be an array.');
  rankDirectoryData = people.map(person => ({...person, rankId: person.rankId ?? person.rank}));
  directoryPages = buildDirectoryPages(rankDirectoryData);
  directoryPageCount = directoryPages.length;
};
