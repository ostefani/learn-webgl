// Get the canvas element and set its size
const canvas = document.getElementById('webgl-canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// Get the WebGL2 context
const gl = canvas.getContext('webgl2');

// Fall back to WebGL 1 if WebGL 2 is not available
if (!gl) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        document.getElementById('capabilities').innerHTML =
            '<p class="error">WebGL not supported. Please use a browser that supports WebGL.</p>';
        throw new Error('WebGL not supported');
    }
    document.getElementById('capabilities').innerHTML = '<p class="warning">Using WebGL 1. WebGL 2 not available.</p>';
}

const capabilitiesElement = document.getElementById('capabilities');
const vendor = gl.getParameter(gl.VENDOR);
const renderer = gl.getParameter(gl.RENDERER);
const version = gl.getParameter(gl.VERSION);
const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

capabilitiesElement.innerHTML = `
    <p><strong>Vendor:</strong> ${vendor}</p>
    <p><strong>Renderer:</strong> ${renderer}</p>
    <p><strong>WebGL Version:</strong> ${version}</p>
    <p><strong>GLSL Version:</strong> ${shadingLanguageVersion}</p>
    <p><strong>Max Texture Size:</strong> ${maxTextureSize}px</p>
`;

gl.clearColor(0.2, 0.0, 0.4, 1.0);

gl.clear(gl.COLOR_BUFFER_BIT);
