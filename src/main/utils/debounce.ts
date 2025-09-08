export function debounce<T extends (...args: any[]) => void>(func: T, wait: number = 0) {
  let timeout: number | undefined;
  const debounced = function (this: any, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(context, args), wait > 0 ? wait : 300);
  } as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
      func();
    }
  };

  return debounced;
}
