// Get WebGL context
const canvas = document.getElementById('webgl-canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported');
    throw new Error('WebGL not supported');
}

// Clear canvas with dark background
gl.clearColor(0.1, 0.1, 0.15, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// VERTEX SHADER: demonstrates position calculation and varying data
const vertexShaderSource = `
  // Input: vertex position
  attribute vec2 position;
  
  // Output: data to fragment shader
  varying vec2 fragPos;
  
  void main() {
    // Stage 3: Vertex Processing
    // Transform positions to clip space
    gl_Position = vec4(position, 0.0, 1.0);
    
    // Pass position to fragment shader
    // This will be interpolated across the primitive
    fragPos = position;
  }
`;

// FRAGMENT SHADER: demonstrates fragment coloring
const fragmentShaderSource = `
  precision mediump float;
  
  // Input: interpolated data from vertex shader
  varying vec2 fragPos;
  
  void main() {
    // Stage 5: Fragment Processing
    // Map position to color (x => red, y => green)
    gl_FragColor = vec4(fragPos.x + 0.5, fragPos.y + 0.5, 0.5, 1.0);
  }
`;

// Create and compile shaders
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// Create program and link shaders
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    throw new Error('Program linking error');
}

gl.useProgram(program);

// Stage 1: JavaScript Setup - Create vertex data
const positions = new Float32Array([
    0.0,
    0.5, // Top vertex
    -0.5,
    -0.5, // Bottom-left vertex
    0.5,
    -0.5, // Bottom-right vertex
]);

// Stage 2: Buffer Data Transfer - Create and populate buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// Connect position buffer to shader attribute
const positionLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Stage 4: Primitive Assembly and Rasterization - Draw the triangle
gl.drawArrays(gl.TRIANGLES, 0, 3);

// Highlight the current stage in the pipeline display
document.querySelectorAll('.pipeline-stage').forEach((el, index) => {
    setTimeout(() => {
        el.classList.add('active');
    }, index * 500);
});
