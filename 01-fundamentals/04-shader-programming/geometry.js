/**
 * GeometryManager Module - Handles WebGL buffer creation and management
 */
const GeometryManager = (function () {
    // Buffer references
    let positionBuffer;
    let colorBuffer;
    let normalBuffer;
    let texCoordBuffer;
    let indicesBuffer;
    let vertexCount;

    /**
     * Initialize geometry buffers
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    function initBuffers(gl) {
        // Create a cube geometry
        createCubeBuffers(gl);
    }

    /**
     * Create buffers for a cube geometry
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    function createCubeBuffers(gl) {
        // Vertex positions (x, y, z) for a cube centered at the origin with width 1
        const positions = new Float32Array([
            // Front face
            -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

            // Back face
            -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

            // Top face
            -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,

            // Bottom face
            -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,

            // Right face
            0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,

            // Left face
            -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
        ]);

        // Vertex colors (r, g, b, a)
        const colors = new Float32Array([
            // Front face (red)
            1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,

            // Back face (green)
            0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,

            // Top face (blue)
            0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,

            // Bottom face (yellow)
            1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,

            // Right face (magenta)
            1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0,

            // Left face (cyan)
            0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0,
        ]);

        // Vertex normals (x, y, z)
        const normals = new Float32Array([
            // Front face
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,

            // Back face
            0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,

            // Top face
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,

            // Bottom face
            0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,

            // Right face
            1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,

            // Left face
            -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
        ]);

        // Texture coordinates (s, t)
        const textureCoordinates = new Float32Array([
            // Front face
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,

            // Back face
            1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,

            // Top face
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,

            // Bottom face
            1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,

            // Right face
            1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,

            // Left face
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ]);

        // Element indices for the triangles
        const indices = new Uint16Array([
            0,
            1,
            2,
            0,
            2,
            3, // Front face
            4,
            5,
            6,
            4,
            6,
            7, // Back face
            8,
            9,
            10,
            8,
            10,
            11, // Top face
            12,
            13,
            14,
            12,
            14,
            15, // Bottom face
            16,
            17,
            18,
            16,
            18,
            19, // Right face
            20,
            21,
            22,
            20,
            22,
            23, // Left face
        ]);

        // Store the number of vertices
        vertexCount = indices.length;

        // Create and bind position buffer
        positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Create and bind color buffer
        colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

        // Create and bind normal buffer
        normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        // Create and bind texture coordinate buffer
        texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);

        // Create and bind index buffer
        indicesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }

    /**
     * Set up attribute pointers for a shader program
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {WebGLProgram} program - Shader program
     */
    function setupAttributes(gl, program) {
        // Position attribute
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        if (positionLocation !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionLocation);
        }

        // Color attribute
        const colorLocation = gl.getAttribLocation(program, 'a_color');
        if (colorLocation !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(colorLocation);
        }

        // Normal attribute
        const normalLocation = gl.getAttribLocation(program, 'a_normal');
        if (normalLocation !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(normalLocation);
        }

        // Texture coordinate attribute
        const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
        if (texCoordLocation !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(texCoordLocation);
        }
    }

    /**
     * Draw the geometry
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    function drawGeometry(gl) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Public API
    return {
        initBuffers: initBuffers,
        setupAttributes: setupAttributes,
        drawGeometry: drawGeometry,
    };
})();
