export const uuid = (): string => {
  return window.crypto.randomUUID().toString();
};
