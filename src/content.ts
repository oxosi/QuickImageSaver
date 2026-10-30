// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="chrome" />

function getImageFromEventTarget(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null;
  if (target instanceof HTMLImageElement) return target;
  return target.closest('img');
}

/** True when the element is inside an <a href="..."> (middle-click should open new tab). */
function isInsideAnchorLink(element: Element): boolean {
  const anchor = element.closest('a');
  return anchor instanceof HTMLAnchorElement && Boolean(anchor.getAttribute('href'));
}

function saveImageFromEvent(event: Event, imgElement: HTMLImageElement) {
  chrome.runtime.sendMessage({
    action: 'saveImage',
    imageUrl: imgElement.src
  });

  event.preventDefault();
  event.stopPropagation();
}

// Handle double clicks on images
document.addEventListener('dblclick', (event) => {
  const imgElement = getImageFromEventTarget(event.target);
  if (imgElement) {
    saveImageFromEvent(event, imgElement);
  }
}, true);

// Middle / scroll-wheel button is button === 1 (MDN).
// On scrollable pages Chrome starts autoscroll on mousedown and may never
// fire auxclick, so save on mousedown and cancel the default there.
// Linked images: leave default behavior (open href in a new tab).
document.addEventListener('mousedown', (event) => {
  if (event.button !== 1) return;

  const imgElement = getImageFromEventTarget(event.target);
  if (!imgElement || isInsideAnchorLink(imgElement)) return;

  saveImageFromEvent(event, imgElement);
}, true);

// Also handle auxclick (fires after mouseup when autoscroll did not take over)
document.addEventListener('auxclick', (event) => {
  if (event.button !== 1) return;

  const imgElement = getImageFromEventTarget(event.target);
  if (!imgElement || isInsideAnchorLink(imgElement)) return;

  // Default (open-in-new-tab etc.) only — save already ran on mousedown
  event.preventDefault();
  event.stopPropagation();
}, true);
