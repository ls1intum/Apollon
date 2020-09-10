var keys: { [key: number]: number } = { 37: 1, 38: 1, 39: 1, 40: 1 };

function preventDefault(e: Event) {
  window.scrollTo(0, 1);
  e.preventDefault();
  e.stopPropagation();
}

function preventDefaultForScrollKeys(e: KeyboardEvent) {
  if (keys[e.keyCode]) {
    preventDefault(e);
    return false;
  }
}

// modern Chrome requires { passive: false } when adding event
var supportsPassive = false;
try {
  window.addEventListener(
    'test' as any,
    null as any,
    Object.defineProperty({}, 'passive', {
      get: function () {
        supportsPassive = true;
      },
    }),
  );
} catch (e) {}

var wheelOpt: boolean | AddEventListenerOptions = supportsPassive ? { passive: false } : false;
var wheelEvent: 'wheel' | 'mousewheel' = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

// call this to Disable
export function disableScroll() {
  // window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
  // window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  document.addEventListener('touchmove', preventDefault); // mobile
  // window.addEventListener('scroll', preventDefault); // mobile
  // window.addEventListener('keydown', preventDefaultForScrollKeys, false);
  document.body.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.style.height = '100%';
}

// call this to Enable
export function enableScroll() {
  // window.removeEventListener('DOMMouseScroll', preventDefault, false);
  // window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
  document.removeEventListener('touchmove', preventDefault);
  // window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
  document.body.style.overflow = 'auto';
}
