// Main application code for WebGL 2 Advanced Shading demo
// This is a simplified version that works with older and newer browsers

// Global variables
let gl; // WebGL context
let canvas; // Canvas element
let activeShader = 'basic'; // Current shader mode
let rotationSpeed = 20; // Rotation speed in degrees per second
let currentTime = 0; // Current animation time

// Shader programs
let basicProgram;
let normalMapProgram;
let pbrProgram;

// Camera and light properties
const cameraPosition = [0, 0, 5];
const lightPosition = [5, 5, 5];
const lightColor = [1.0, 1.0, 1.0];

// Texture objects
let diffuseTexture;
let normalMapTexture;
let roughnessTexture;
let metallicTexture;
let aoTexture;

// Model geometry
let positionBuffer;
let normalBuffer;
let texCoordBuffer;
let tangentBuffer;
let indexBuffer;
let indexCount;

// Matrices
const modelMatrix = new Float32Array(16);
const viewMatrix = new Float32Array(16);
const projectionMatrix = new Float32Array(16);
const normalMatrix = new Float32Array(16);

// Animation variables
let lastFrameTime = 0;

// Initialize WebGL when the page is loaded
document.addEventListener('DOMContentLoaded', init);

/**
 * Updates the shading mode based on user selection.
 */
function updateShadingMode() {
    activeShader = document.getElementById('shading-mode').value;

    // Update the visible technique description
    document.getElementById('current-technique').textContent = {
        basic: 'Basic Phong Shading',
        'normal-map': 'Normal Mapping',
        pbr: 'PBR (Basic)',
    }[activeShader];

    // Show/hide the appropriate technique description
    document.querySelectorAll('.technique-description').forEach((el) => (el.style.display = 'none'));
    document.getElementById(`${activeShader}-description`).style.display = 'block';
}

/**
 * Updates the rotation speed based on slider value.
 */
function updateRotationSpeed() {
    rotationSpeed = parseFloat(document.getElementById('rotation-speed').value);
}

/**
 * Updates the light position based on slider values.
 */
function updateLightPosition() {
    lightPosition[0] = parseFloat(document.getElementById('light-x').value);
    lightPosition[1] = parseFloat(document.getElementById('light-y').value);
    lightPosition[2] = parseFloat(document.getElementById('light-z').value);
}

/**
 * Initializes the WebGL context and starts loading resources.
 */
function init() {
    // Get the canvas element
    canvas = document.getElementById('webgl-canvas');

    // Try to get a WebGL 2 context first
    gl = canvas.getContext('webgl2');

    // If WebGL 2 isn't available, fall back to WebGL 1
    if (!gl) {
        console.warn('WebGL 2 not available, falling back to WebGL 1');
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }

    // Check if WebGL is supported at all
    if (!gl) {
        displayError('WebGL is not supported by your browser.');
        return;
    }

    // Log WebGL info for debugging
    console.log('WebGL Vendor:', gl.getParameter(gl.VENDOR));
    console.log('WebGL Renderer:', gl.getParameter(gl.RENDERER));
    console.log('WebGL Version:', gl.getParameter(gl.VERSION));
    console.log('GLSL Version:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));

    // Determine WebGL version and adjust shaders accordingly
    const isWebGL2 = gl.getParameter(gl.VERSION).indexOf('WebGL 2.0') >= 0;
    console.log('Using WebGL 2:', isWebGL2);

    // Set up event listeners
    document.getElementById('shading-mode').addEventListener('change', updateShadingMode);
    document.getElementById('rotation-speed').addEventListener('input', updateRotationSpeed);
    document.getElementById('light-x').addEventListener('input', updateLightPosition);
    document.getElementById('light-y').addEventListener('input', updateLightPosition);
    document.getElementById('light-z').addEventListener('input', updateLightPosition);

    // Adjust canvas size on window resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize UI state
    updateShadingMode();

    // Create required resources and start the app
    createShaders();
    createTextures();
    createModel();
    setupMatrices();

    // Hide loading indicator
    document.getElementById('loading').style.display = 'none';

    // Start rendering loop
    requestAnimationFrame(render);
}

/**
 * Resizes the canvas to fit its container and updates projection matrix.
 */
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Update projection matrix with new aspect ratio
    const aspect = canvas.width / canvas.height;
    mat4_perspective(projectionMatrix, (45 * Math.PI) / 180, aspect, 0.1, 100.0);
}

/**
 * Displays an error message to the user.
 * @param {string} message - The error message to display
 */
function displayError(message) {
    document.getElementById('loading').style.display = 'none';
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'flex';
    console.error(message);
}

/**
 * Creates and compiles shader programs.
 */
function createShaders() {
    // Adapt shader sources for compatibility with WebGL 1 if needed
    const isWebGL2 = gl.getParameter(gl.VERSION).indexOf('WebGL 2.0') >= 0;

    let vsBasic = basicVertexShader;
    let fsBasic = basicFragmentShader;
    let vsNormal = normalMapVertexShader;
    let fsNormal = normalMapFragmentShader;
    let vsPbr = pbrVertexShader;
    let fsPbr = pbrFragmentShader;

    // If WebGL 1, strip/modify version directives and change in/out to attribute/varying
    if (!isWebGL2) {
        const webgl1Transform = (source) => {
            return source
                .replace(/#version 300 es/, '')
                .replace(/in /g, 'attribute ')
                .replace(/out /g, 'varying ')
                .replace(/texture\(/g, 'texture2D(')
                .replace(/fragColor/g, 'gl_FragColor');
        };

        vsBasic = webgl1Transform(vsBasic);
        fsBasic = webgl1Transform(fsBasic);
        vsNormal = webgl1Transform(vsNormal);
        fsNormal = webgl1Transform(fsNormal);
        vsPbr = webgl1Transform(vsPbr);
        fsPbr = webgl1Transform(fsPbr);
    }

    // Create shader programs
    basicProgram = createProgram(gl, vsBasic, fsBasic);
    normalMapProgram = createProgram(gl, vsNormal, fsNormal);
    pbrProgram = createProgram(gl, vsPbr, fsPbr);

    // Check if shader compilation and linking succeeded
    if (!basicProgram || !normalMapProgram || !pbrProgram) {
        displayError('Failed to initialize shader programs. Please check the console for more information.');
    }
}

/**
 * Creates placeholder textures since we don't have real texture files.
 */
function createTextures() {
    // Create 2x2 plain white texture for diffuse/albedo
    diffuseTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2,
        2,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([200, 200, 200, 255, 200, 200, 200, 255, 200, 200, 200, 255, 200, 200, 200, 255])
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    // Create 2x2 blue normal map (straight up normals)
    normalMapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2,
        2,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([127, 127, 255, 255, 127, 127, 255, 255, 127, 127, 255, 255, 127, 127, 255, 255])
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    // Create 2x2 medium roughness texture
    roughnessTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, roughnessTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2,
        2,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([127, 127, 127, 255, 127, 127, 127, 255, 127, 127, 127, 255, 127, 127, 127, 255])
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    // Create 2x2 non-metallic texture
    metallicTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, metallicTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2,
        2,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255])
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    // Create 2x2 white AO texture
    aoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, aoTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2,
        2,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])
    );
    gl.generateMipmap(gl.TEXTURE_2D);
}

/**
 * Creates model geometry and sets up buffers.
 */
function createModel() {
    // Create sphere geometry
    const sphere = createSphere(1.0, 32, 32);

    // Create position buffer
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);

    // Create normal buffer
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);

    // Create texture coordinate buffer
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.texCoords, gl.STATIC_DRAW);

    // Calculate tangent vectors for normal mapping
    const tangents = calculateTangents(sphere.positions, sphere.normals, sphere.texCoords, sphere.indices);
    tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);

    // Create index buffer
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    // Store the number of indices for drawing
    indexCount = sphere.indices.length;
}

/**
 * Sets up initial camera and projection matrices.
 */
function setupMatrices() {
    // Set up model matrix (initialized to identity)
    mat4_identity(modelMatrix);

    // Set up view matrix
    mat4_lookAt(viewMatrix, cameraPosition, [0, 0, 0], [0, 1, 0]);

    // Set up projection matrix
    const aspect = canvas.width / canvas.height;
    mat4_perspective(projectionMatrix, (45 * Math.PI) / 180, aspect, 0.1, 100.0);
}

/**
 * Updates the model matrix based on rotation and time.
 * @param {number} deltaTime - Time in seconds since the last frame
 */
function updateModelMatrix(deltaTime) {
    // Update the current time
    currentTime += deltaTime;

    // Reset to identity
    mat4_identity(modelMatrix);

    // Apply rotation based on elapsed time
    const rotationAngle = rotationSpeed * currentTime * 0.05;
    mat4_rotateY(modelMatrix, modelMatrix, (rotationAngle * Math.PI) / 180);
    mat4_rotateX(modelMatrix, modelMatrix, (Math.sin(currentTime * 0.3) * 15 * Math.PI) / 180);

    // Calculate normal matrix (inverse transpose of upper 3x3 part of model matrix)
    const modelViewMatrix = new Float32Array(16);
    mat4_multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4_invert(normalMatrix, modelViewMatrix);
    mat4_transpose(normalMatrix, normalMatrix);
}

/**
 * Main rendering function that runs on each animation frame.
 * @param {number} timestamp - Current time in milliseconds
 */
function render(timestamp) {
    // Calculate time between frames in seconds
    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    // Update model matrix
    updateModelMatrix(deltaTime);

    // Clear the canvas and depth buffer
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Use the appropriate shader program based on current mode
    if (activeShader === 'basic') {
        renderWithBasicShader();
    } else if (activeShader === 'normal-map') {
        renderWithNormalMapShader();
    } else if (activeShader === 'pbr') {
        renderWithPbrShader();
    }

    // Request the next frame
    requestAnimationFrame(render);
}

/**
 * Renders the model using the basic Phong shader.
 */
function renderWithBasicShader() {
    // Use the shader program
    gl.useProgram(basicProgram);

    // Set uniform values
    const uModelMatrix = gl.getUniformLocation(basicProgram, 'uModelMatrix');
    const uViewMatrix = gl.getUniformLocation(basicProgram, 'uViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(basicProgram, 'uProjectionMatrix');
    const uNormalMatrix = gl.getUniformLocation(basicProgram, 'uNormalMatrix');
    const uCameraPosition = gl.getUniformLocation(basicProgram, 'uCameraPosition');
    const uLightPosition = gl.getUniformLocation(basicProgram, 'uLightPosition');
    const uLightColor = gl.getUniformLocation(basicProgram, 'uLightColor');
    const uDiffuseMap = gl.getUniformLocation(basicProgram, 'uDiffuseMap');

    // Pass transformation matrices
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

    // Pass camera and light information
    gl.uniform3fv(uCameraPosition, cameraPosition);
    gl.uniform3fv(uLightPosition, lightPosition);
    gl.uniform3fv(uLightColor, lightColor);

    // Set active texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(uDiffuseMap, 0);

    // Set up attribute pointers
    setupBasicAttributes();

    // Draw
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * Sets up the attributes for the basic shader.
 */
function setupBasicAttributes() {
    const positionLoc = gl.getAttribLocation(basicProgram, 'aPosition');
    const normalLoc = gl.getAttribLocation(basicProgram, 'aNormal');
    const texCoordLoc = gl.getAttribLocation(basicProgram, 'aTexCoord');

    // Position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Normal attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    // Texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
}

/**
 * Renders the model using the normal mapping shader.
 */
function renderWithNormalMapShader() {
    // Use the shader program
    gl.useProgram(normalMapProgram);

    // Set uniform values
    const uModelMatrix = gl.getUniformLocation(normalMapProgram, 'uModelMatrix');
    const uViewMatrix = gl.getUniformLocation(normalMapProgram, 'uViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(normalMapProgram, 'uProjectionMatrix');
    const uNormalMatrix = gl.getUniformLocation(normalMapProgram, 'uNormalMatrix');
    const uCameraPosition = gl.getUniformLocation(normalMapProgram, 'uCameraPosition');
    const uLightPosition = gl.getUniformLocation(normalMapProgram, 'uLightPosition');
    const uLightColor = gl.getUniformLocation(normalMapProgram, 'uLightColor');
    const uDiffuseMap = gl.getUniformLocation(normalMapProgram, 'uDiffuseMap');
    const uNormalMap = gl.getUniformLocation(normalMapProgram, 'uNormalMap');

    // Pass transformation matrices
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

    // Pass camera and light information
    gl.uniform3fv(uCameraPosition, cameraPosition);
    gl.uniform3fv(uLightPosition, lightPosition);
    gl.uniform3fv(uLightColor, lightColor);

    // Set active textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(uDiffuseMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.uniform1i(uNormalMap, 1);

    // Set up attribute pointers
    setupNormalMapAttributes();

    // Draw
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * Sets up the attributes for the normal map shader.
 */
function setupNormalMapAttributes() {
    const positionLoc = gl.getAttribLocation(normalMapProgram, 'aPosition');
    const normalLoc = gl.getAttribLocation(normalMapProgram, 'aNormal');
    const texCoordLoc = gl.getAttribLocation(normalMapProgram, 'aTexCoord');
    const tangentLoc = gl.getAttribLocation(normalMapProgram, 'aTangent');

    // Position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Normal attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    // Texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Tangent attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.enableVertexAttribArray(tangentLoc);
    gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);

    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
}

/**
 * Renders the model using the PBR shader.
 */
function renderWithPbrShader() {
    // Use the shader program
    gl.useProgram(pbrProgram);

    // Set uniform values
    const uModelMatrix = gl.getUniformLocation(pbrProgram, 'uModelMatrix');
    const uViewMatrix = gl.getUniformLocation(pbrProgram, 'uViewMatrix');
    const uProjectionMatrix = gl.getUniformLocation(pbrProgram, 'uProjectionMatrix');
    const uNormalMatrix = gl.getUniformLocation(pbrProgram, 'uNormalMatrix');
    const uCameraPosition = gl.getUniformLocation(pbrProgram, 'uCameraPosition');
    const uLightPosition = gl.getUniformLocation(pbrProgram, 'uLightPosition');
    const uLightColor = gl.getUniformLocation(pbrProgram, 'uLightColor');
    const uAlbedoMap = gl.getUniformLocation(pbrProgram, 'uAlbedoMap');
    const uMetallicMap = gl.getUniformLocation(pbrProgram, 'uMetallicMap');
    const uRoughnessMap = gl.getUniformLocation(pbrProgram, 'uRoughnessMap');
    const uAoMap = gl.getUniformLocation(pbrProgram, 'uAoMap');

    // Pass transformation matrices
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

    // Pass camera and light information
    gl.uniform3fv(uCameraPosition, cameraPosition);
    gl.uniform3fv(uLightPosition, lightPosition);
    gl.uniform3fv(uLightColor, lightColor);

    // Set active textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(uAlbedoMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, metallicTexture);
    gl.uniform1i(uMetallicMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, roughnessTexture);
    gl.uniform1i(uRoughnessMap, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, aoTexture);
    gl.uniform1i(uAoMap, 3);

    // Set up attribute pointers
    setupPbrAttributes();

    // Draw
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * Sets up the attributes for the PBR shader.
 */
function setupPbrAttributes() {
    const positionLoc = gl.getAttribLocation(pbrProgram, 'aPosition');
    const normalLoc = gl.getAttribLocation(pbrProgram, 'aNormal');
    const texCoordLoc = gl.getAttribLocation(pbrProgram, 'aTexCoord');

    // Position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Normal attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    // Texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
}

// Simple matrix functions (in place of gl-matrix)

/**
 * Sets a 4x4 matrix to the identity matrix.
 * @param {Float32Array} out - The matrix to set
 */
function mat4_identity(out) {
    out[0] = 1;
    out[4] = 0;
    out[8] = 0;
    out[12] = 0;
    out[1] = 0;
    out[5] = 1;
    out[9] = 0;
    out[13] = 0;
    out[2] = 0;
    out[6] = 0;
    out[10] = 1;
    out[14] = 0;
    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;
}

/**
 * Creates a perspective projection matrix.
 * @param {Float32Array} out - The result matrix
 * @param {number} fovy - Field of view in radians
 * @param {number} aspect - Aspect ratio (width/height)
 * @param {number} near - Near clipping plane
 * @param {number} far - Far clipping plane
 */
function mat4_perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);

    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;
}

/**
 * Multiplies two matrices.
 * @param {Float32Array} out - The result matrix
 * @param {Float32Array} a - The first matrix
 * @param {Float32Array} b - The second matrix
 */
function mat4_multiply(out, a, b) {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    let b0 = b[0],
        b1 = b[1],
        b2 = b[2],
        b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
}

/**
 * Rotates a matrix around the X axis.
 * @param {Float32Array} out - The result matrix
 * @param {Float32Array} a - The matrix to rotate
 * @param {number} rad - The angle in radians
 */
function mat4_rotateX(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    // Copy the unchanged parts of the matrix
    if (a !== out) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform rotation-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
}

/**
 * Rotates a matrix around the Y axis.
 * @param {Float32Array} out - The result matrix
 * @param {Float32Array} a - The matrix to rotate
 * @param {number} rad - The angle in radians
 */
function mat4_rotateY(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    // Copy the unchanged parts of the matrix
    if (a !== out) {
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
}

/**
 * Creates a "look at" view matrix.
 * @param {Float32Array} out - The result matrix
 * @param {Array} eye - The position of the viewer
 * @param {Array} center - The point the viewer is looking at
 * @param {Array} up - The up vector
 */
function mat4_lookAt(out, eye, center, up) {
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    const centerx = center[0];
    const centery = center[1];
    const centerz = center[2];

    // If eye and center are the same, return identity
    if (
        Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001
    ) {
        mat4_identity(out);
        return;
    }

    // Calculate z axis (normalized vector from eye to center)
    let z0 = eyex - centerx;
    let z1 = eyey - centery;
    let z2 = eyez - centerz;

    // Normalize z
    let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    // Calculate x axis as cross product of up and z
    let x0 = upy * z2 - upz * z1;
    let x1 = upz * z0 - upx * z2;
    let x2 = upx * z1 - upy * z0;

    // Normalize x
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (len) {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    // Calculate y axis as cross product of z and x
    let y0 = z1 * x2 - z2 * x1;
    let y1 = z2 * x0 - z0 * x2;
    let y2 = z0 * x1 - z1 * x0;

    // Normalize y
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (len) {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
}

/**
 * Transposes a matrix.
 * @param {Float32Array} out - The result matrix
 * @param {Float32Array} a - The matrix to transpose
 */
function mat4_transpose(out, a) {
    // If out === a, we'll handle that specially
    if (out === a) {
        const a01 = a[1],
            a02 = a[2],
            a03 = a[3];
        const a12 = a[6],
            a13 = a[7];
        const a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }

    return out;
}

/**
 * Inverts a matrix.
 * @param {Float32Array} out - The result matrix
 * @param {Float32Array} a - The matrix to invert
 */
function mat4_invert(out, a) {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    // Calculate determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }

    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}
