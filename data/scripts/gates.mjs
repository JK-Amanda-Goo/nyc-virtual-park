// The Conservancy's 20 named gates (https://www.centralparknyc.org/named-gates, read 2026-11-02),
// each with the two streets that meet at the gate. "ref" is the Conservancy's wording.
export const GATES = [
  { name: "Scholars' Gate", main: '5th Avenue', cross: 'East 60th Street', ref: 'Fifth Avenue and 60th Street' },
  { name: "Artists' Gate", main: 'Central Park South', cross: '6th Avenue', ref: 'Sixth Avenue and 59th Street' },
  { name: "Artisans' Gate", main: 'Central Park South', cross: '7th Avenue', ref: 'Seventh Avenue and 59th Street' },
  { name: "Merchants' Gate", main: 'Central Park South', cross: 'Columbus Circle', ref: 'Eighth Avenue and 59th Street' },
  { name: "Women's Gate", main: 'Central Park West', cross: 'West 72nd Street', ref: 'Central Park West and 72nd Street' },
  { name: "Hunters' Gate", main: 'Central Park West', cross: 'West 81st Street', ref: 'Central Park West and 81st Street' },
  { name: "Mariners' Gate", main: 'Central Park West', cross: 'West 85th Street', ref: 'Central Park West and 85th Street' },
  { name: 'Gate of All Saints', main: 'Central Park West', cross: 'West 96th Street', ref: 'Central Park West and 96th Street' },
  { name: "Boys' Gate", main: 'Central Park West', cross: 'West 100th Street', ref: 'Central Park West and 100th Street' },
  { name: "Strangers' Gate", main: 'Central Park West', cross: 'West 106th Street', ref: 'Central Park West and 106th Street' },
  // The Conservancy page says "Seventh Avenue and 100th Street"; north of 59th, 7th Ave is Adam Clayton Powell Jr. Blvd,
  // which meets the park at 110th Street (Central Park North). Treated as a typo; flagged in the output.
  { name: "Warriors' Gate", main: 'Central Park North', cross: 'Adam Clayton Powell Jr. Boulevard', ref: 'Seventh Avenue and 100th Street', note: 'page says 100th St; placed at 110th St (Central Park North)' },
  { name: "Farmers' Gate", main: 'East 110th Street', cross: 'Malcolm X Boulevard', ref: 'Sixth Avenue and 110th Street' },
  { name: "Pioneers' Gate", main: 'East 110th Street', cross: 'Duke Ellington Circle', ref: 'Fifth Avenue and 110th Street' },
  { name: "Girls' Gate", main: '5th Avenue', cross: 'East 102nd Street', ref: 'Fifth Avenue and 102nd Street' },
  { name: "Engineers' Gate", main: '5th Avenue', cross: 'East 90th Street', ref: 'Fifth Avenue and 90th Street' },
  { name: "Miners' Gate", main: '5th Avenue', cross: 'East 79th Street', ref: 'Fifth Avenue and 79th Street' },
  { name: "Children's Gate", main: '5th Avenue', cross: 'East 76th Street', ref: 'Fifth Avenue and 76th Street' },
  { name: "Inventors' Gate", main: '5th Avenue', cross: 'East 72nd Street', ref: 'Fifth Avenue and 72nd Street' },
  { name: "Woodman's Gate", main: '5th Avenue', cross: 'East 96th Street', ref: 'Fifth Avenue and 96th Street' },
  // "East Side at 110th Street; Fifth Avenue and Malcolm X Boulevard": the two avenues are blocks apart, so the spot is ambiguous.
  { name: 'Gate of the Exonerated', main: null, cross: null, ref: 'Fifth Avenue and Malcolm X Boulevard (East Side at 110th Street)' },
];
