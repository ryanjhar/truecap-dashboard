// Registry of all 32 NFL teams
// accent = tertiary highlight color (used for glow / subtle active states)
export const TEAMS = [
  // AFC East
  { code: 'BUF', fileCode: 'buf', name: 'Buffalo Bills',          city: 'Buffalo',        division: 'AFC East',  primary: '#00338D', secondary: '#C60C30', accent: '#C60C30' },
  { code: 'MIA', fileCode: 'mia', name: 'Miami Dolphins',         city: 'Miami',          division: 'AFC East',  primary: '#008E97', secondary: '#FC4C02', accent: '#FC4C02' },
  { code: 'NE',  fileCode: 'ne',  name: 'New England Patriots',   city: 'New England',    division: 'AFC East',  primary: '#002244', secondary: '#C60C30', accent: '#B0B7BC' },
  { code: 'NYJ', fileCode: 'nyj', name: 'New York Jets',          city: 'New York',       division: 'AFC East',  primary: '#125740', secondary: '#000000', accent: '#ffffff' },
  // AFC North
  { code: 'BAL', fileCode: 'bal', name: 'Baltimore Ravens',       city: 'Baltimore',      division: 'AFC North', primary: '#241773', secondary: '#9E7C0C', accent: '#9E7C0C' },
  { code: 'CIN', fileCode: 'cin', name: 'Cincinnati Bengals',     city: 'Cincinnati',     division: 'AFC North', primary: '#FB4F14', secondary: '#000000', accent: '#FB4F14' },
  { code: 'CLE', fileCode: 'cle', name: 'Cleveland Browns',       city: 'Cleveland',      division: 'AFC North', primary: '#FF3C00', secondary: '#311D00', accent: '#FF3C00' },
  { code: 'PIT', fileCode: 'pit', name: 'Pittsburgh Steelers',    city: 'Pittsburgh',     division: 'AFC North', primary: '#FFB612', secondary: '#101820', accent: '#FFB612' },
  // AFC South
  { code: 'HOU', fileCode: 'hou', name: 'Houston Texans',         city: 'Houston',        division: 'AFC South', primary: '#03202F', secondary: '#A71930', accent: '#A71930' },
  { code: 'IND', fileCode: 'ind', name: 'Indianapolis Colts',     city: 'Indianapolis',   division: 'AFC South', primary: '#002C5F', secondary: '#A2AAAD', accent: '#A2AAAD' },
  { code: 'JAX', fileCode: 'jax', name: 'Jacksonville Jaguars',   city: 'Jacksonville',   division: 'AFC South', primary: '#006778', secondary: '#D7A22A', accent: '#D7A22A' },
  { code: 'TEN', fileCode: 'ten', name: 'Tennessee Titans',       city: 'Tennessee',      division: 'AFC South', primary: '#0C2340', secondary: '#4B92DB', accent: '#C8102E' },
  // AFC West
  { code: 'DEN', fileCode: 'den', name: 'Denver Broncos',         city: 'Denver',         division: 'AFC West',  primary: '#FB4F14', secondary: '#002244', accent: '#FB4F14' },
  { code: 'KC',  fileCode: 'kc',  name: 'Kansas City Chiefs',     city: 'Kansas City',    division: 'AFC West',  primary: '#E31837', secondary: '#FFB81C', accent: '#FFB81C' },
  { code: 'LAC', fileCode: 'lac', name: 'Los Angeles Chargers',   city: 'Los Angeles',    division: 'AFC West',  primary: '#0080C6', secondary: '#FFC20E', accent: '#FFC20E' },
  { code: 'LV',  fileCode: 'lv',  name: 'Las Vegas Raiders',      city: 'Las Vegas',      division: 'AFC West',  primary: '#A5ACAF', secondary: '#000000', accent: '#A5ACAF' },
  // NFC East
  { code: 'DAL', fileCode: 'dal', name: 'Dallas Cowboys',         city: 'Dallas',         division: 'NFC East',  primary: '#003594', secondary: '#869397', accent: '#869397' },
  { code: 'NYG', fileCode: 'nyg', name: 'New York Giants',        city: 'New York',       division: 'NFC East',  primary: '#0B2265', secondary: '#A71930', accent: '#A71930' },
  { code: 'PHI', fileCode: 'phi', name: 'Philadelphia Eagles',    city: 'Philadelphia',   division: 'NFC East',  primary: '#004C54', secondary: '#A5ACAF', accent: '#ACC0C6' },
  { code: 'WAS', fileCode: 'was', name: 'Washington Commanders',  city: 'Washington',     division: 'NFC East',  primary: '#5A1414', secondary: '#FFB612', accent: '#FFB612' },
  // NFC North
  { code: 'CHI', fileCode: 'chi', name: 'Chicago Bears',          city: 'Chicago',        division: 'NFC North', primary: '#0B162A', secondary: '#C83803', accent: '#C83803' },
  { code: 'DET', fileCode: 'det', name: 'Detroit Lions',          city: 'Detroit',        division: 'NFC North', primary: '#0076B6', secondary: '#B0B7BC', accent: '#B0B7BC' },
  { code: 'GB',  fileCode: 'gb',  name: 'Green Bay Packers',      city: 'Green Bay',      division: 'NFC North', primary: '#203731', secondary: '#FFB612', accent: '#FFB612' },
  { code: 'MIN', fileCode: 'min', name: 'Minnesota Vikings',      city: 'Minnesota',      division: 'NFC North', primary: '#4F2683', secondary: '#FFC62F', accent: '#FFC62F' },
  // NFC South
  { code: 'ATL', fileCode: 'atl', name: 'Atlanta Falcons',        city: 'Atlanta',        division: 'NFC South', primary: '#A71930', secondary: '#000000', accent: '#A5ACAF' },
  { code: 'CAR', fileCode: 'car', name: 'Carolina Panthers',      city: 'Carolina',       division: 'NFC South', primary: '#0085CA', secondary: '#101820', accent: '#BFC0BF' },
  { code: 'NO',  fileCode: 'no',  name: 'New Orleans Saints',     city: 'New Orleans',    division: 'NFC South', primary: '#9F8958', secondary: '#101820', accent: '#D3BC8D' },
  { code: 'TB',  fileCode: 'tb',  name: 'Tampa Bay Buccaneers',   city: 'Tampa Bay',      division: 'NFC South', primary: '#D50A0A', secondary: '#FF7900', accent: '#FF7900' },
  // NFC West
  { code: 'ARI', fileCode: 'ari', name: 'Arizona Cardinals',      city: 'Arizona',        division: 'NFC West',  primary: '#97233F', secondary: '#FFB612', accent: '#FFB612' },
  { code: 'LAR', fileCode: 'lar', name: 'Los Angeles Rams',       city: 'Los Angeles',    division: 'NFC West',  primary: '#003594', secondary: '#FFA300', accent: '#FFA300' },
  { code: 'SEA', fileCode: 'sea', name: 'Seattle Seahawks',       city: 'Seattle',        division: 'NFC West',  primary: '#002244', secondary: '#69BE28', accent: '#69BE28' },
  { code: 'SF',  fileCode: 'sf',  name: 'San Francisco 49ers',    city: 'San Francisco',  division: 'NFC West',  primary: '#AA0000', secondary: '#B3995D', accent: '#B3995D' },
];

export const TEAM_BY_CODE = Object.fromEntries(TEAMS.map((t) => [t.code, t]));

// Ordered list of divisions for the homepage layout
export const DIVISIONS = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
];
