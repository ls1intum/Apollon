export const delay = async (t: number) => {
  return await new Promise((res) => setTimeout(res, t));
};
