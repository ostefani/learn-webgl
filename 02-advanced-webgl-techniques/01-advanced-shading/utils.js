// WebGL utility functions

/**
 * Creates and compiles a shader.
 * @param {WebGL2RenderingContext} gl - The WebGL context
 * @param {string} source - The GLSL source code for the shader
 * @param {number} type - The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @returns {WebGLShader} The compiled shader, or null if compilation failed
 */
function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Check if compilation succeeded
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * Creates a shader program from vertex and fragment shader sources.
 * @param {WebGL2RenderingContext} gl - The WebGL context
 * @param {string} vsSource - The vertex shader source code
 * @param {string} fsSource - The fragment shader source code
 * @returns {WebGLProgram} The created shader program, or null if creation failed
 */
function createProgram(gl, vsSource, fsSource) {
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check if linking succeeded
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return null;
    }

    return program;
}

/**
 * Creates a texture from an image URL
 * @param {WebGL2RenderingContext} gl - The WebGL context
 * @param {string} url - URL of the image
 * @returns {Promise<WebGLTexture>} Promise resolving to the created texture
 */
function loadTexture(gl, url) {
    return new Promise((resolve, reject) => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Fill with a placeholder pixel until the image loads
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255])
        );

        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            // Check if the image is a power of 2 in both dimensions
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                // Not a power of 2, disable mipmap and set wrapping to clamp to edge
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }

            resolve(texture);
        };

        image.onerror = () => {
            reject(new Error(`Failed to load texture: ${url}`));
        };

        image.src = url;
    });
}

/**
 * Check if a number is a power of 2
 * @param {number} value - The value to check
 * @returns {boolean} True if value is a power of 2
 */
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

/**
 * Creates a buffer and loads it with data
 * @param {WebGL2RenderingContext} gl - The WebGL context
 * @param {ArrayBuffer} data - The data to load into the buffer
 * @param {number} usage - The usage pattern (e.g., gl.STATIC_DRAW)
 * @returns {WebGLBuffer} The created buffer
 */
function createBuffer(gl, data, usage) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    return buffer;
}

/**
 * Creates a Vertex Array Object (VAO) and configures vertex attributes
 * @param {WebGL2RenderingContext} gl - The WebGL context
 * @param {Object} attributeInfo - Information about attributes and their configurations
 * @returns {WebGLVertexArrayObject} The created VAO
 */
function createVAO(gl, attributeInfo) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    for (const [attrib, config] of Object.entries(attributeInfo)) {
        const { buffer, size, type, normalized = false, stride = 0, offset = 0 } = config;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(attrib);
        gl.vertexAttribPointer(attrib, size, type, normalized, stride, offset);
    }

    gl.bindVertexArray(null);
    return vao;
}

/**
 * Calculate tangent vectors for normal mapping
 * @param {Float32Array} positions - Vertex positions (x,y,z triplets)
 * @param {Float32Array} normals - Vertex normals (x,y,z triplets)
 * @param {Float32Array} texCoords - Texture coordinates (u,v pairs)
 * @param {Uint16Array} indices - Vertex indices
 * @returns {Float32Array} Tangent vectors (x,y,z triplets)
 */
function calculateTangents(positions, normals, texCoords, indices) {
    const numVertices = positions.length / 3;
    const tangents = new Float32Array(numVertices * 3);
    const tempTangents = new Array(numVertices).fill().map(() => [0, 0, 0]);

    // For each face
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        // Positions of the vertices in the face
        const p0 = [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]];
        const p1 = [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]];
        const p2 = [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]];

        // Texture coordinates of the face
        const u0 = [texCoords[i0 * 2], texCoords[i0 * 2 + 1]];
        const u1 = [texCoords[i1 * 2], texCoords[i1 * 2 + 1]];
        const u2 = [texCoords[i2 * 2], texCoords[i2 * 2 + 1]];

        // Calculate edges and deltas
        const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

        const deltaU1 = u1[0] - u0[0];
        const deltaV1 = u1[1] - u0[1];
        const deltaU2 = u2[0] - u0[0];
        const deltaV2 = u2[1] - u0[1];

        // Calculate tangent (T)
        const denominator = deltaU1 * deltaV2 - deltaU2 * deltaV1;

        // Avoid division by zero
        if (Math.abs(denominator) < 0.0001) continue;

        const scale = 1.0 / denominator;
        const T = [
            (deltaV2 * edge1[0] - deltaV1 * edge2[0]) * scale,
            (deltaV2 * edge1[1] - deltaV1 * edge2[1]) * scale,
            (deltaV2 * edge1[2] - deltaV1 * edge2[2]) * scale,
        ];

        // Add to each vertex of the face
        tempTangents[i0] = vectorAdd(tempTangents[i0], T);
        tempTangents[i1] = vectorAdd(tempTangents[i1], T);
        tempTangents[i2] = vectorAdd(tempTangents[i2], T);
    }

    // Normalize and create final tangent array
    for (let i = 0; i < numVertices; i++) {
        const n = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
        let t = tempTangents[i];

        // Gram-Schmidt orthogonalize
        const dot = vectorDot(n, t);
        t = vectorNormalize(vectorSubtract(t, vectorScale(n, dot)));

        tangents[i * 3] = t[0];
        tangents[i * 3 + 1] = t[1];
        tangents[i * 3 + 2] = t[2];
    }

    return tangents;
}

// Vector helper functions
function vectorAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vectorSubtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vectorScale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function vectorDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vectorLength(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vectorNormalize(v) {
    const length = vectorLength(v);
    if (length < 0.0001) return [0, 0, 0];
    return [v[0] / length, v[1] / length, v[2] / length];
}
