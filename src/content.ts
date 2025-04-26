// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="chrome" />

// Handle double clicks on images
document.addEventListener('dblclick', (event) => {
  // Check if the clicked element is an image
  const target = event.target as HTMLElement;
  if (target.tagName === 'IMG') {
    const imgElement = target as HTMLImageElement;
    const imageUrl = imgElement.src;
    
    // Send message to background script to save the image
    chrome.runtime.sendMessage({
      action: 'saveImage',
      imageUrl: imageUrl
    });
    
    // Prevent default action and stop propagation
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

// Add visual feedback when hovering over images
document.addEventListener('mouseover', (event) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'IMG') {
    // Save original cursor style
    const originalCursor = target.style.cursor;
    
    // Set cursor to indicate the image can be saved
    target.style.cursor = 'pointer';
    
    // Add a subtle outline
    const originalOutline = target.style.outline;
    target.style.outline = '2px solid rgba(0, 128, 255, 0.5)';
    
    // Function to handle mouseout event
    const handleMouseOut = () => {
      // Restore original styles
      target.style.cursor = originalCursor;
      target.style.outline = originalOutline;
      
      // Remove event listener
      target.removeEventListener('mouseout', handleMouseOut);
    };
    
    // Add mouseout event listener
    target.addEventListener('mouseout', handleMouseOut);
  }
}); 