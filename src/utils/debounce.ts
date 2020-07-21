export function debounce(func: (...args: any[]) => any, wait: number = 0) {
  let timeout: number | undefined;
  return function (...args: any[]) {
    // @ts-ignore
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait > 0 ? wait : 300);
  };
}
