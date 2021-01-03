// tslint:disable-next-line:ban-types
export function debounce(func: Function, wait: number = 0) {
  let timeout: number | undefined;
  return function (...args: any[]) {
    // @ts-ignore
    const context = this;
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(context, args), wait > 0 ? wait : 300);
  };
}
