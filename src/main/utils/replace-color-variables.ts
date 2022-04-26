const colorVariableRegex = /var\(--apollon-[\S]+, #[0-9a-fA-F]+\)/g;
const colorRegex = /#[0-9a-fA-F]+/;

export const replaceColorVariables = (innerHTML: string): string => {
  const variablesToReplace = innerHTML.match(colorVariableRegex);
  const matchesAndColors = variablesToReplace?.map((match) => {
    return {
      match,
      color: match.match(colorRegex),
    };
  });

  matchesAndColors?.forEach((element) => {
    innerHTML = innerHTML.replace(element.match, element.color ? element.color[0] : '');
  });

  return innerHTML;
};
