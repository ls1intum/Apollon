export function debounce<TArgs extends unknown[], TThis>(
  func: (this: TThis, ...args: TArgs) => unknown,
  wait: number = 0,
) {
  let timeout: number | undefined;
  // Allow passing additional, unused arguments without type errors
  return function (this: TThis, ...args: [...TArgs, ...unknown[]]) {
    const context = this;
    clearTimeout(timeout);
    const delay = wait > 0 ? wait : 300;
    timeout = window.setTimeout(() => {
      // Only pass the arguments expected by the wrapped function
      return func.apply(context, args as unknown as TArgs);
    }, delay);
  };
}
