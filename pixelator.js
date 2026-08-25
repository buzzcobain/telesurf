// pixelator.js - Injected into every page to pixelate SVGs and Images on the fly

function pixelateImage(imgElement) {
  // Prevent double processing
  if (imgElement.dataset.pixelated) return;
  if (imgElement.tagName.toLowerCase() === 'svg') {
    pixelateSVG(imgElement);
    return;
  }
  
  // Ensure it's fully loaded before processing
  if (!imgElement.complete || imgElement.naturalWidth === 0) {
    imgElement.addEventListener('load', () => pixelateImage(imgElement), { once: true });
    return;
  }

  imgElement.dataset.pixelated = 'true';

  const width = imgElement.clientWidth || imgElement.naturalWidth || 100;
  const height = imgElement.clientHeight || imgElement.naturalHeight || 100;

  // We want to reduce the resolution by a factor of e.g. 5
  const scaleFactor = 0.15; 
  const tinyWidth = Math.max(1, Math.floor(width * scaleFactor));
  const tinyHeight = Math.max(1, Math.floor(height * scaleFactor));

  const canvas = document.createElement('canvas');
  canvas.width = tinyWidth;
  canvas.height = tinyHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Disable smoothing for blockiness
  ctx.imageSmoothingEnabled = false;

  try {
    // Draw the image tiny
    ctx.drawImage(imgElement, 0, 0, tinyWidth, tinyHeight);
    
    // Instead of replacing the DOM element (which breaks React/Vue), 
    // we can swap the src if it's an img!
    // But swapping src might trigger another load event.
    // We just replace the src with the base64 of the tiny canvas, 
    // and rely on the CSS `image-rendering: pixelated` (already applied) to scale it up chunkily!
    
    const dataUrl = canvas.toDataURL('image/png');
    
    // If it's a picture element or has srcset, we need to nuke those so it uses our src
    imgElement.removeAttribute('srcset');
    imgElement.removeAttribute('sizes');
    const parent = imgElement.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'picture') {
      const sources = parent.querySelectorAll('source');
      sources.forEach(s => s.remove());
    }

    imgElement.src = dataUrl;
  } catch (e) {
    // Might fail on cross-origin taint, in which case we just leave it alone
    console.error('Teletext Pixelator CORS issue:', e);
  }
}

function pixelateSVG(svgElement) {
  if (svgElement.dataset.pixelated) return;
  svgElement.dataset.pixelated = 'true';

  const width = svgElement.clientWidth || svgElement.getAttribute('width') || 100;
  const height = svgElement.clientHeight || svgElement.getAttribute('height') || 100;

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);
  
  // Ensure xmlns is present otherwise Image() won't load it
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const encodedData = encodeURIComponent(svgString);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedData}`;

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    const scaleFactor = 0.15;
    const tinyWidth = Math.max(1, Math.floor(width * scaleFactor));
    const tinyHeight = Math.max(1, Math.floor(height * scaleFactor));

    const canvas = document.createElement('canvas');
    canvas.width = tinyWidth;
    canvas.height = tinyHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(img, 0, 0, tinyWidth, tinyHeight);
    
    const pixelatedDataUrl = canvas.toDataURL('image/png');
    
    // Create an img to replace the inline SVG visually
    const replacementImg = document.createElement('img');
    replacementImg.src = pixelatedDataUrl;
    replacementImg.style.width = `${width}px`;
    replacementImg.style.height = `${height}px`;
    replacementImg.style.imageRendering = 'pixelated';
    replacementImg.dataset.pixelated = 'true';
    replacementImg.className = svgElement.className.baseVal || '';
    
    // Keep the SVG in the DOM so JS framework doesn't freak out, but hide it
    svgElement.style.display = 'none';
    
    // Insert our blocky img right next to it
    if (svgElement.parentNode) {
      svgElement.parentNode.insertBefore(replacementImg, svgElement.nextSibling);
    }
  };
  img.src = dataUrl;
}

// Initial sweep
function sweep() {
  document.querySelectorAll('img:not([data-pixelated]), svg:not([data-pixelated])').forEach(el => {
    pixelateImage(el);
  });
}

sweep();

// Observe for dynamically added images/svgs
const observer = new MutationObserver((mutations) => {
  let shouldSweep = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldSweep = true;
      break;
    }
  }
  if (shouldSweep) sweep();
});

observer.observe(document.body, { childList: true, subtree: true });
