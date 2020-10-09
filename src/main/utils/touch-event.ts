/**
 * touchend events are always invoked on the elements which also have the touchstart event.
 * This function creates and dispatches a pointerup event on the actual target
 * @param event originally invoked touchend event
 */
export function convertTouchEndIntoPointerUp(event: TouchEvent) {
  if (event.changedTouches.length > 0) {
    const target = document.elementFromPoint(
      event.changedTouches[event.changedTouches.length - 1].clientX,
      event.changedTouches[event.changedTouches.length - 1].clientY,
    );

    if (!target) {
      return;
    }

    // creating pointerup event
    const pointerEvent = new PointerEvent('pointerup', {
      cancelable: true,
      bubbles: true,
      screenX: event.changedTouches[event.changedTouches.length - 1].pageX,
      screenY: event.changedTouches[event.changedTouches.length - 1].pageY,
      clientX: event.changedTouches[event.changedTouches.length - 1].clientX,
      clientY: event.changedTouches[event.changedTouches.length - 1].clientY,
    });

    // dispatching on target
    // when it bubbles up -> it reaches the connectable HOC of the target (that we actually want)
    target.dispatchEvent(pointerEvent);
    return;
  }
}

export function getClientEventCoordinates(event: PointerEvent | TouchEvent): { clientX: number; clientY: number } {
  // touch events are our own created touch events, see above
  const eventClientX = event instanceof PointerEvent ? event.clientX : event.touches[0].clientX;
  const eventClientY = event instanceof PointerEvent ? event.clientY : event.touches[0].clientY;
  return { clientX: eventClientX, clientY: eventClientY };
}
