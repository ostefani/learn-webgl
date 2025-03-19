// Main WebGL variables
let gl;
let canvas;
let currentProgram;
let currentExample = 'basic';
let startTime;
let lastRenderTime = 0;

// Animation frame request ID
let animationId;

// Initialize when the page loads
window.onload = function () {
    // Set up WebGL
    initWebGL();

    // Check for successful context creation
    if (!gl) {
        return;
    }

    // Initialize resources
    GeometryManager.initBuffers(gl);
    TextureGenerator.initTexture(gl);

    // Set up event listeners
    document.getElementById('example-select').addEventListener('change', function (e) {
        currentExample = e.target.value;
        showExplanation(currentExample);
        loadShaders(currentExample);
    });

    // Start with the first example
    currentExample = 'basic';
    showExplanation(currentExample);
    loadShaders(currentExample);

    // Start the rendering loop
    startTime = performance.now();
    requestAnimationFrame(render);
};

// Initialize WebGL context
function initWebGL() {
    canvas = document.getElementById('webgl-canvas');

    // Try to get WebGL 2 context first, then fall back to WebGL 1
    gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    // Set canvas dimensions
    resizeCanvasToDisplaySize(canvas);

    // Set the viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color to a dark gray
    gl.clearColor(0.15, 0.15, 0.15, 1.0);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);

    // Enable culling of back faces
    gl.enable(gl.CULL_FACE);
}

// Show the explanation for the current example
function showExplanation(exampleName) {
    // Hide all explanations
    const explanations = document.querySelectorAll('.explanation-content');
    for (const explanation of explanations) {
        explanation.style.display = 'none';
    }

    // Show the current explanation
    const currentExplanation = document.getElementById(`${exampleName}-explanation`);
    if (currentExplanation) {
        currentExplanation.style.display = 'block';
    }
}

// Compile shader from source
function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Check for errors
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Create shader program from vertex and fragment shaders
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check for linking errors
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
        return null;
    }

    return program;
}

// Load shaders for the current example
function loadShaders(exampleName) {
    // Get shader sources from ShaderSources module
    const vertexSource = ShaderSources[exampleName].vertex;
    const fragmentSource = ShaderSources[exampleName].fragment;

    // Compile shaders
    const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
        return;
    }

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
        return;
    }

    // Update current program
    currentProgram = {
        program: program,
        example: exampleName,
    };

    // Update shader display
    document.getElementById('vertex-shader-display').textContent = vertexSource;
    document.getElementById('fragment-shader-display').textContent = fragmentSource;
}

// Render the scene
function render(now) {
    // Calculate time in seconds
    const time = (now - startTime) * 0.001;

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Make sure the canvas dimensions match the display size
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Ensure we have a shader program
    if (currentProgram && currentProgram.program) {
        // Use the current program
        gl.useProgram(currentProgram.program);

        // Set up shader parameters based on the current example
        setupShaderParameters(currentProgram.program, time);

        // Draw the geometry
        GeometryManager.drawGeometry(gl);
    }

    // Request the next frame
    animationId = requestAnimationFrame(render);
}

// Set up shader parameters for the current program
function setupShaderParameters(program, time) {
    // Common attributes for all examples
    GeometryManager.setupAttributes(gl, program);

    // Example-specific uniforms
    switch (currentExample) {
        case 'basic':
            // Basic shader doesn't need any special uniforms
            break;

        case 'varying':
            // Varying example uses per-vertex colors, already set in geometry manager
            break;

        case 'uniform':
            setupUniformExample(program, time);
            break;

        case 'lighting':
            setupLightingExample(program, time);
            break;

        case 'texture':
            setupTextureExample(program, time);
            break;
    }
}

// Set up uniforms for the uniform example
function setupUniformExample(program, time) {
    // Get uniform locations
    const modelViewLocation = gl.getUniformLocation(program, 'u_modelView');
    const projectionLocation = gl.getUniformLocation(program, 'u_projection');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const timeLocation = gl.getUniformLocation(program, 'u_time');

    // Set transformation matrices
    if (modelViewLocation !== null) {
        const modelViewMatrix = Matrix.identity();
        Matrix.translate(modelViewMatrix, 0.0, 0.0, -3.0);
        Matrix.rotateY(modelViewMatrix, time * 0.7);
        Matrix.rotateX(modelViewMatrix, time * 0.4);

        gl.uniformMatrix4fv(modelViewLocation, false, modelViewMatrix);
    }

    if (projectionLocation !== null) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const projectionMatrix = Matrix.perspective((45.0 * Math.PI) / 180.0, aspect, 0.1, 100.0);

        gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
    }

    // Set color and time uniforms
    if (colorLocation !== null) {
        gl.uniform4f(colorLocation, 1.0, 0.7, 0.3, 1.0); // Orange-ish color
    }

    if (timeLocation !== null) {
        gl.uniform1f(timeLocation, time);
    }
}

// Set up uniforms for the lighting example
function setupLightingExample(program, time) {
    // Set matrices
    const modelViewLocation = gl.getUniformLocation(program, 'u_modelView');
    const projectionLocation = gl.getUniformLocation(program, 'u_projection');
    const normalMatrixLocation = gl.getUniformLocation(program, 'u_normalMatrix');

    // Create model-view matrix with rotation
    if (modelViewLocation !== null) {
        const modelViewMatrix = Matrix.identity();
        Matrix.translate(modelViewMatrix, 0.0, 0.0, -3.0);
        Matrix.rotateY(modelViewMatrix, time * 0.7);
        Matrix.rotateX(modelViewMatrix, time * 0.4);

        gl.uniformMatrix4fv(modelViewLocation, false, modelViewMatrix);

        // Create normal matrix (simplified - just extract rotation part)
        if (normalMatrixLocation !== null) {
            const normalMatrix = Matrix.extractNormalMatrix(modelViewMatrix);
            gl.uniformMatrix3fv(normalMatrixLocation, false, normalMatrix);
        }
    }

    // Set projection matrix
    if (projectionLocation !== null) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const projectionMatrix = Matrix.perspective((45.0 * Math.PI) / 180.0, aspect, 0.1, 100.0);

        gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
    }

    // Set lighting parameters
    const lightPositionLocation = gl.getUniformLocation(program, 'u_lightPosition');
    const diffuseColorLocation = gl.getUniformLocation(program, 'u_diffuseColor');
    const ambientColorLocation = gl.getUniformLocation(program, 'u_ambientColor');

    if (lightPositionLocation !== null) {
        // Rotating light position
        const lightX = Math.sin(time) * 2.0;
        const lightY = 1.0;
        const lightZ = Math.cos(time) * 2.0;
        gl.uniform3f(lightPositionLocation, lightX, lightY, lightZ);
    }

    if (diffuseColorLocation !== null) {
        gl.uniform3f(diffuseColorLocation, 0.8, 0.8, 0.8);
    }

    if (ambientColorLocation !== null) {
        gl.uniform3f(ambientColorLocation, 0.2, 0.2, 0.2);
    }
}

// Set up uniforms for the texture example
function setupTextureExample(program, time) {
    // Set texture uniforms
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    const timeLocation = gl.getUniformLocation(program, 'u_time');

    if (textureLocation !== null) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, TextureGenerator.getTexture());
        gl.uniform1i(textureLocation, 0);
    }

    if (timeLocation !== null) {
        gl.uniform1f(timeLocation, time);
    }
}

// Make sure the canvas size matches its display size
function resizeCanvasToDisplaySize(canvas) {
    // Get the browser-displayed width and height of the canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size as its display size
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        return true;
    }

    return false;
}
