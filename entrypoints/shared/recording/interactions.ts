import type { InteractionEventInput, InteractionTarget } from './types';

const MOVE_INTERVAL_MS = 32;
const SCROLL_INTERVAL_MS = 50;
const DRAG_THRESHOLD_PX = 3;

interface Point {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  start: Point;
  dragging: boolean;
}

function getTarget(event: Event): InteractionTarget | undefined {
  const path = event.composedPath();
  if (path.some((item) => item instanceof Element && item.matches('rio-recording-panel, rio-region-selector'))) return undefined;
  const element = path.find((item): item is Element => item instanceof Element);
  if (!element) return undefined;
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    role: element.getAttribute('role') || undefined,
    name: element.getAttribute('name') || undefined,
    type: element.getAttribute('type') || undefined,
  };
}

function getPointerData(event: MouseEvent | PointerEvent) {
  return {
    x: event.clientX,
    y: event.clientY,
    normalizedX: window.innerWidth > 0 ? event.clientX / window.innerWidth : 0,
    normalizedY: window.innerHeight > 0 ? event.clientY / window.innerHeight : 0,
    pageX: event.pageX,
    pageY: event.pageY,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pointerType: event instanceof PointerEvent ? event.pointerType : 'mouse',
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  };
}

function distance(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function startInteractionTracking(onEvent: (event: InteractionEventInput) => void) {
  let drag: DragState | undefined;
  let lastMoveAt = 0;
  let lastScrollAt = 0;

  const emitPointer = (kind: InteractionEventInput['kind'], event: MouseEvent | PointerEvent, target = getTarget(event)) => {
    if (!target) return;
    onEvent({ kind, occurredAt: performance.timeOrigin + performance.now(), target, ...getPointerData(event) });
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!getTarget(event)) return;
    drag = { pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, dragging: false };
  };

  const onPointerMove = (event: PointerEvent) => {
    const now = performance.now();
    if (now - lastMoveAt < MOVE_INTERVAL_MS) return;
    lastMoveAt = now;
    const target = getTarget(event);
    if (!target) return;

    if (drag?.pointerId === event.pointerId && event.buttons !== 0) {
      if (!drag.dragging && distance(drag.start, { x: event.clientX, y: event.clientY }) >= DRAG_THRESHOLD_PX) {
        drag.dragging = true;
        emitPointer('drag-start', event, target);
      }
      if (drag.dragging) emitPointer('drag-move', event, target);
      return;
    }

    emitPointer('pointer-move', event, target);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId && drag.dragging) emitPointer('drag-end', event);
    if (drag?.pointerId === event.pointerId) drag = undefined;
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) drag = undefined;
  };

  const onClick = (event: MouseEvent) => emitPointer('click', event);
  const onDoubleClick = (event: MouseEvent) => emitPointer('double-click', event);
  const onScroll = (event: Event) => {
    const now = performance.now();
    if (now - lastScrollAt < SCROLL_INTERVAL_MS) return;
    lastScrollAt = now;
    const target = getTarget(event) ?? { tagName: 'document' };
    const eventTarget = event.target;
    const scrollingElement = eventTarget instanceof Element
      ? eventTarget
      : document.scrollingElement ?? document.documentElement;
    onEvent({
      kind: 'scroll',
      occurredAt: performance.timeOrigin + performance.now(),
      target,
      scrollX: scrollingElement === document.documentElement || scrollingElement === document.body
        ? window.scrollX
        : scrollingElement.scrollLeft,
      scrollY: scrollingElement === document.documentElement || scrollingElement === document.body
        ? window.scrollY
        : scrollingElement.scrollTop,
      scrollWidth: scrollingElement.scrollWidth,
      scrollHeight: scrollingElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerCancel, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('dblclick', onDoubleClick, true);
  document.addEventListener('scroll', onScroll, true);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerCancel, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('dblclick', onDoubleClick, true);
    document.removeEventListener('scroll', onScroll, true);
  };
}
