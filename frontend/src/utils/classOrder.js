// School grade progression is not alphabetical (e.g. "10" would sort before
// "2"), so classes are ordered: Kindergarten, Nursery, Prep, then numerically
// by any digit found in the name (covers "1".."10", "Grade 1", "Class 5",
// etc). Anything that doesn't match falls to the end, alphabetically.
const SPECIAL_ORDER = ['kindergarten', 'nursery', 'prep'];

export function getClassRank(className) {
  const name = (className || '').trim().toLowerCase();
  const specialIndex = SPECIAL_ORDER.indexOf(name);
  if (specialIndex !== -1) return specialIndex;

  const match = name.match(/(\d+)/);
  if (match) return 100 + Number(match[1]);

  return 10000;
}

export function compareClassNames(a, b) {
  const rankDiff = getClassRank(a) - getClassRank(b);
  if (rankDiff !== 0) return rankDiff;
  return a.localeCompare(b);
}
