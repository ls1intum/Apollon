/**
 * touchend events are always invoked on the elements which also have the touchstart event.
 * This function creates a synthetic touchend event which is invoked on the actual target
 * @param event originally invoked touchend event
 * @returns synthetic touchend event on target
 */
export function createTouchEndEvent(event: TouchEvent) {
  // create own touch events in order to follow connection logic
  // own touch event has the element at the end of touch as target, not the start element
  // -> connection logic for desktop can be applied
  if (event instanceof TouchEvent && event.changedTouches.length > 0) {
    const target = document.elementFromPoint(
      event.changedTouches[event.changedTouches.length - 1].pageX,
      event.changedTouches[event.changedTouches.length - 1].pageY,
    );

    if (!target) {
      return;
    }

    // copy the last touch that happened
    // only replace target and add identifier (must have)
    const touch = new Touch({
      ...event.changedTouches[event.changedTouches.length - 1],
      identifier: 999,
      target: target,
    });

    // creating touchend event
    const touchEvent = new TouchEvent('touchend', {
      touches: [touch],
      view: window,
      cancelable: true,
      bubbles: true,
    });

    // dispatching on target
    // when it bubbles up -> it reaches the connectable HOC of the target (that we actually want)
    target.dispatchEvent(touchEvent);
    return;
  }
}

export function getClientEventCoordinates(event: PointerEvent | TouchEvent): { clientX: number; clientY: number } {
  // touch events are our own created touch events, see above
  const eventClientX = event instanceof PointerEvent ? event.clientX : event.touches[0].clientX;
  const eventClientY = event instanceof PointerEvent ? event.clientY : event.touches[0].clientY;
  return { clientX: eventClientX, clientY: eventClientY };
}
