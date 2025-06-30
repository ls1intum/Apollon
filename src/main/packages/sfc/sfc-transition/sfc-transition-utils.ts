export function getParsedName(name: string | undefined): { isNegated: boolean; displayName: string } {
  return name == undefined || name.length === 0 ? { isNegated: false, displayName: '' } : JSON.parse(name);
}
