export function debounce<TArgs extends unknown[], TThis>(
  func: (this: TThis, ...args: TArgs) => unknown,
  wait: number = 0,
) {
  let timeout: number | undefined;
  return function (this: TThis, ...args: TArgs) {
    const context = this;
    clearTimeout(timeout);
    const delay = wait > 0 ? wait : 300;
    timeout = window.setTimeout(() => {
      return func.apply(context, args);
    }, delay);
  };
}
