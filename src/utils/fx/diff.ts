export const diff = <T extends object>(lhs: T, rhs: T): Partial<T> => {
  const deletedValues = Object.keys(lhs).reduce((acc, key) => {
    return rhs.hasOwnProperty(key) ? acc : { ...acc, [key]: undefined };
  }, {});

  return (Object.keys(rhs) as Array<keyof T>).reduce((acc, key) => {
    if (!lhs.hasOwnProperty(key)) return { ...acc, [key]: rhs[key] };
    if (lhs[key] === rhs[key]) return acc;

    return { ...acc, [key]: rhs[key] };
  }, deletedValues);
};
