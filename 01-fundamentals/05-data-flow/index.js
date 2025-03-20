// WebGL 2 Data Flow examples
document.addEventListener('DOMContentLoaded', function () {
    // Initialize all examples
    setupBasicExample();
    setupInterleavedExample();
    setupUniformExample();
});

// ===== SHADER CODE =====
// Basic shaders used for examples 1 and 2
const basicVertexShaderSource = `#version 300 es
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}`;

const basicFragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 fragColor;

void main() {
    fragColor = vec4(v_color, 1.0);
}`;

// Uniform shaders used for example 3
const uniformVertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_position = a_position;
}`;

const uniformFragmentShaderSource = `#version 300 es
precision mediump float;
in vec2 v_position;
uniform vec3 u_colorMultiplier;
uniform float u_time;
out vec4 fragColor;

void main() {
    // Generate color based on position and time
    vec3 color = vec3(
        v_position.x * 0.5 + 0.5, 
        v_position.y * 0.5 + 0.5,
        sin(u_time) * 0.5 + 0.5
    );
    
    // Apply uniform color multiplier
    fragColor = vec4(color * u_colorMultiplier, 1.0);
}`;

// ===== UTILITY FUNCTIONS =====
// Utility function for shader compilation
function compileShader(gl, source, type) {
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

// Utility function for program creation
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

// ===== EXAMPLE IMPLEMENTATIONS =====
// Example 1: Basic Buffer Data Transfer with VAO
function setupBasicExample() {
    // Get canvas and initialize WebGL 2 context
    const canvas = document.getElementById('basic-example');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        console.error('WebGL 2 not supported');
        const fallbackMessage = document.createElement('div');
        fallbackMessage.className = 'error-message';
        fallbackMessage.textContent = 'WebGL 2 is not supported in your browser';
        canvas.parentNode.replaceChild(fallbackMessage, canvas);
        return;
    }

    // ------ SHADER SETUP ------
    // Compile shaders
    const vertexShader = compileShader(gl, basicVertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, basicFragmentShaderSource, gl.FRAGMENT_SHADER);

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // ------ VERTEX DATA SETUP ------
    // 1. Create JavaScript arrays in CPU memory
    const positions = new Float32Array([
        0.0,
        0.5, // Top vertex
        -0.5,
        -0.5, // Bottom-left
        0.5,
        -0.5, // Bottom-right
    ]);

    const colors = new Float32Array([
        1.0,
        0.0,
        0.0, // Red (top)
        0.0,
        1.0,
        0.0, // Green (bottom-left)
        0.0,
        0.0,
        1.0, // Blue (bottom-right)
    ]);

    // ------ VAO CREATION AND BUFFER SETUP ------
    // 2. Create and bind VAO (WebGL 2 feature)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // 3. Create position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // 4. Transfer position data to GPU
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // 5. Configure position attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 6. Create color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // 7. Transfer color data to GPU
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    // 8. Configure color attribute
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    // 9. Unbind VAO (good practice)
    gl.bindVertexArray(null);

    // ------ RENDER ------
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use the VAO that contains all our attribute state
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Example 2: Interleaved Buffer Data
function setupInterleavedExample() {
    // Get canvas and initialize WebGL 2 context
    const canvas = document.getElementById('interleaved-example');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        console.error('WebGL 2 not supported');
        const fallbackMessage = document.createElement('div');
        fallbackMessage.className = 'error-message';
        fallbackMessage.textContent = 'WebGL 2 is not supported in your browser';
        canvas.parentNode.replaceChild(fallbackMessage, canvas);
        return;
    }

    // ------ SHADER SETUP ------
    // Compile shaders
    const vertexShader = compileShader(gl, basicVertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, basicFragmentShaderSource, gl.FRAGMENT_SHADER);

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // ------ INTERLEAVED VERTEX DATA SETUP ------
    // 1. Create interleaved data array in CPU memory (position and color combined)
    const interleavedData = new Float32Array([
        // x,   y,   r,   g,   b
        0.0,
        0.5,
        1.0,
        0.0,
        0.0, // Top vertex (red)
        -0.5,
        -0.5,
        0.0,
        1.0,
        0.0, // Bottom-left (green)
        0.5,
        -0.5,
        0.0,
        0.0,
        1.0, // Bottom-right (blue)
    ]);

    // ------ VAO AND BUFFER SETUP ------
    // 2. Create and bind VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // 3. Create a single buffer for all vertex data
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // 4. Transfer interleaved data to GPU
    gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.STATIC_DRAW);

    // 5. Configure position attribute with stride and offset
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(
        positionLocation,
        2, // 2 components (x, y)
        gl.FLOAT,
        false,
        5 * 4, // Stride: 5 floats * 4 bytes per float
        0 // Offset: 0 bytes from start of each vertex
    );

    // 6. Configure color attribute with stride and offset
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(
        colorLocation,
        3, // 3 components (r, g, b)
        gl.FLOAT,
        false,
        5 * 4, // Stride: 5 floats * 4 bytes per float
        2 * 4 // Offset: 2 floats * 4 bytes from start of each vertex
    );

    // 7. Unbind VAO
    gl.bindVertexArray(null);

    // ------ RENDER ------
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use the VAO that contains all attribute configuration
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Example 3: Uniform Data Transfer
function setupUniformExample() {
    // Get canvas and initialize WebGL 2 context
    const canvas = document.getElementById('uniform-example');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        console.error('WebGL 2 not supported');
        const fallbackMessage = document.createElement('div');
        fallbackMessage.className = 'error-message';
        fallbackMessage.textContent = 'WebGL 2 is not supported in your browser';
        canvas.parentNode.replaceChild(fallbackMessage, canvas);
        return;
    }

    // ------ SHADER SETUP ------
    // Compile shaders
    const vertexShader = compileShader(gl, uniformVertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, uniformFragmentShaderSource, gl.FRAGMENT_SHADER);

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // ------ VAO AND VERTEX DATA SETUP ------
    // 1. Create and bind VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // 2. Create position data array
    const positions = new Float32Array([
        0.0,
        0.5, // Top vertex
        -0.5,
        -0.5, // Bottom-left
        0.5,
        -0.5, // Bottom-right
    ]);

    // 3. Create and bind buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // 4. Transfer position data to GPU
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // 5. Configure position attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 6. Unbind VAO
    gl.bindVertexArray(null);

    // ------ UNIFORM SETUP ------
    // 7. Get uniform locations
    const colorMultiplierLocation = gl.getUniformLocation(program, 'u_colorMultiplier');
    const timeLocation = gl.getUniformLocation(program, 'u_time');

    // ------ ANIMATION LOOP ------
    function render() {
        // 8. Calculate uniform values in CPU memory
        const time = performance.now() * 0.001;
        const colorMultiplier = [
            Math.sin(time * 0.3) * 0.5 + 0.5,
            Math.sin(time * 0.5) * 0.5 + 0.5,
            Math.sin(time * 0.7) * 0.5 + 0.5,
        ];

        // 9. Clear canvas
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 10. Use program and bind VAO
        gl.useProgram(program);
        gl.bindVertexArray(vao);

        // 11. Transfer uniform data to GPU
        gl.uniform3f(colorMultiplierLocation, colorMultiplier[0], colorMultiplier[1], colorMultiplier[2]);
        gl.uniform1f(timeLocation, time);

        // 12. Draw the triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Request next frame
        requestAnimationFrame(render);
    }

    // Start the rendering loop
    render();
}
