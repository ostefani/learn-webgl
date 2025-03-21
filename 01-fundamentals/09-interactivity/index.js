// Get the WebGL canvas element
const canvas = document.getElementById('webgl-canvas');

// Set canvas size to match container
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// Initialize WebGL context
const gl = canvas.getContext('webgl2');
if (!gl) {
    console.error('WebGL 2 not supported in your browser!');
    document.body.innerHTML = '<p>Your browser does not support WebGL 2. Please try a different browser.</p>';
}

// Vertex shader source
const vertexShaderSource = `#version 300 es
// Input vertex data
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

// Output to fragment shader
out vec3 vNormal;
out vec3 vFragPos;
out vec2 vTexCoord;

// Uniforms for transformations
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

void main() {
    // Transform vertex position to clip space
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    
    // Calculate fragment position in world space (for lighting)
    vFragPos = vec3(uModel * vec4(aPosition, 1.0));
    
    // Transform normal to world space
    vNormal = uNormalMatrix * aNormal;
    
    // Pass texture coordinates
    vTexCoord = aTexCoord;
}`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
precision highp float;

// Input from vertex shader
in vec3 vNormal;
in vec3 vFragPos;
in vec2 vTexCoord;

// Uniforms for lighting and material
uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform float uLightIntensity;
uniform float uAmbientStrength;
uniform vec3 uAlbedo;
uniform float uRoughness;
uniform float uMetalness;
uniform vec3 uObjectColor;
uniform sampler2D uTextureMap;

// Output fragment color
out vec4 fragColor;

// For skybox
uniform samplerCube uSkybox;
uniform bool uRenderSkybox;
uniform bool uUseTexture;

void main() {
    // Material properties
    vec3 albedo = uObjectColor;
    
    // Apply texture if enabled
    if (uUseTexture) {
        albedo *= texture(uTextureMap, vTexCoord).rgb;
    }
    
    // Ambient light component
    vec3 ambient = uAmbientStrength * albedo;
    
    // Diffuse light component
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPos - vFragPos);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * albedo * uLightIntensity;
    
    // Specular light component (Blinn-Phong)
    vec3 viewDir = normalize(uViewPos - vFragPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0 * (1.0 - uRoughness));
    
    // Adjust specular color based on metalness
    vec3 specularColor = mix(vec3(1.0), albedo, uMetalness);
    vec3 specular = spec * specularColor * uLightIntensity;
    
    // Combine lighting components
    vec3 result = ambient + diffuse + specular;
    
    // Add some reflections for metallic objects
    if (uMetalness > 0.5 && uRenderSkybox) {
        vec3 reflectDir = reflect(-viewDir, normal);
        vec3 reflectionColor = texture(uSkybox, reflectDir).rgb;
        result = mix(result, reflectionColor, uMetalness * 0.4);
    }
    
    fragColor = vec4(result, 1.0);
}`;

// Skybox vertex shader source
const skyboxVertexShaderSource = `#version 300 es
in vec3 aPosition;

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vTexCoord;

void main() {
    vTexCoord = aPosition;
    
    // Remove translation from the view matrix
    mat4 viewNoTranslation = mat4(mat3(uView));
    
    vec4 pos = uProjection * viewNoTranslation * vec4(aPosition, 1.0);
    
    // Make sure skybox is always at max depth
    gl_Position = pos.xyww;
}`;

// Skybox fragment shader source
const skyboxFragmentShaderSource = `#version 300 es
precision mediump float;

in vec3 vTexCoord;

uniform samplerCube uSkybox;

out vec4 fragColor;

void main() {
    fragColor = texture(uSkybox, vTexCoord);
}`;

// Gradient background vertex shader source
const gradientVertexShaderSource = `#version 300 es
in vec2 aPosition;

out vec2 vPosition;

void main() {
    vPosition = aPosition;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Gradient background fragment shader source
const gradientFragmentShaderSource = `#version 300 es
precision mediump float;

in vec2 vPosition;

out vec4 fragColor;

void main() {
    // Create a gradient from top to bottom
    vec3 topColor = vec3(0.2, 0.4, 0.7); // Blue-ish
    vec3 bottomColor = vec3(0.7, 0.4, 0.2); // Orange-ish
    
    // Mix based on y position
    vec3 color = mix(bottomColor, topColor, (vPosition.y + 1.0) * 0.5);
    
    fragColor = vec4(color, 1.0);
}`;

// Utility function to compile a shader
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

// Utility function to create a shader program
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

// Create main shader program
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

// Create skybox shader program
const skyboxVertexShader = createShader(gl, gl.VERTEX_SHADER, skyboxVertexShaderSource);
const skyboxFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, skyboxFragmentShaderSource);
const skyboxProgram = createProgram(gl, skyboxVertexShader, skyboxFragmentShader);

// Create gradient background shader program
const gradientVertexShader = createShader(gl, gl.VERTEX_SHADER, gradientVertexShaderSource);
const gradientFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, gradientFragmentShaderSource);
const gradientProgram = createProgram(gl, gradientVertexShader, gradientFragmentShader);

// Generate sphere geometry
function createSphere(radius, latBands, longBands) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    // Generate vertices, normals, and texture coordinates
    for (let lat = 0; lat <= latBands; lat++) {
        const theta = (lat * Math.PI) / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let long = 0; long <= longBands; long++) {
            const phi = (long * 2 * Math.PI) / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // Position
            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            // Normal (same as position for a sphere centered at origin)
            normals.push(x, y, z);

            // Position scaled by radius
            vertices.push(radius * x, radius * y, radius * z);

            // Texture coordinates
            texCoords.push(1 - long / longBands, 1 - lat / latBands);
        }
    }

    // Generate indices
    for (let lat = 0; lat < latBands; lat++) {
        for (let long = 0; long < longBands; long++) {
            const first = lat * (longBands + 1) + long;
            const second = first + longBands + 1;

            // First triangle
            indices.push(first, second, first + 1);

            // Second triangle
            indices.push(second, second + 1, first + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

// Create skybox vertices (a cube)
function createSkybox() {
    // Define the 8 corners of the cube
    const vertices = new Float32Array([
        // Front face
        -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0,

        // Back face
        -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,

        // Left face
        -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,

        // Right face
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0,

        // Top face
        -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0,
    ]);

    return vertices;
}

// Create a fullscreen quad for gradient background
function createFullscreenQuad() {
    const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0]);

    return vertices;
}

// Generate sphere mesh
const sphere = createSphere(1.0, 32, 32);

// Create and setup VAO for main object (sphere)
const sphereVAO = gl.createVertexArray();
gl.bindVertexArray(sphereVAO);

// Position buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aPosition'));
gl.vertexAttribPointer(gl.getAttribLocation(program, 'aPosition'), 3, gl.FLOAT, false, 0, 0);

// Normal buffer
const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aNormal'));
gl.vertexAttribPointer(gl.getAttribLocation(program, 'aNormal'), 3, gl.FLOAT, false, 0, 0);

// Texture coordinate buffer
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sphere.texCoords, gl.STATIC_DRAW);
gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aTexCoord'));
gl.vertexAttribPointer(gl.getAttribLocation(program, 'aTexCoord'), 2, gl.FLOAT, false, 0, 0);

// Index buffer
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

gl.bindVertexArray(null);

// Create and setup VAO for skybox
const skyboxVAO = gl.createVertexArray();
gl.bindVertexArray(skyboxVAO);

const skyboxVertices = createSkybox();
const skyboxBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(gl.getAttribLocation(skyboxProgram, 'aPosition'));
gl.vertexAttribPointer(gl.getAttribLocation(skyboxProgram, 'aPosition'), 3, gl.FLOAT, false, 0, 0);

gl.bindVertexArray(null);

// Create and setup VAO for gradient background
const gradientVAO = gl.createVertexArray();
gl.bindVertexArray(gradientVAO);

const quadVertices = createFullscreenQuad();
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(gl.getAttribLocation(gradientProgram, 'aPosition'));
gl.vertexAttribPointer(gl.getAttribLocation(gradientProgram, 'aPosition'), 2, gl.FLOAT, false, 0, 0);

gl.bindVertexArray(null);

// Load skybox textures
function loadCubemap() {
    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-x.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-x.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-y.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-y.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-z.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-z.jpg',
        },
    ];

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    // Set initial pixel color for each face
    faceInfos.forEach((faceInfo) => {
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // Fill with blue
        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(faceInfo.target, level, internalFormat, width, height, 0, format, type, pixel);

        // Load the actual texture
        const image = new Image();
        image.src = faceInfo.url;

        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(faceInfo.target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        };
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

// Create a basic texture for the sphere
function createTexturePattern() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Create a pattern (checker)
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;

            // Create checker pattern
            const isEvenRow = Math.floor(y / 32) % 2 === 0;
            const isEvenCol = Math.floor(x / 32) % 2 === 0;
            const isLight = isEvenRow === isEvenCol;

            // Slightly vary colors for more interesting pattern
            const r = isLight ? 200 + (x % 56) : 100 + (x % 56);
            const g = isLight ? 200 + (y % 56) : 100 + (y % 56);
            const b = isLight ? 200 : 100;

            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255; // Alpha
        }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

// Load skybox texture
const skyboxTexture = loadCubemap();

// Create pattern texture for the sphere
const sphereTexture = createTexturePattern();

// Declare scene variables
let selectedObject = {
    color: [0.3, 0.5, 0.8], // Default blue-ish color
}; // Currently selected object
let renderSkybox = true;
let useGradientBackground = false;
let useTexture = false;

// Camera and light setup
const cameraPosition = [0, 0, 5];
const lightPosition = [5, 5, 5];

// Matrix for transformations
let modelMatrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

let viewMatrix = new Float32Array(16);
let projectionMatrix = new Float32Array(16);

// Function to invert a 4x4 matrix
function invertMatrix(out, a) {
    // Implementation of a matrix inverse for a 4x4 matrix
    // This is a simplified version - use a proper math library in production

    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11],
        a30 = a[12],
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

// Create normal matrix from model matrix
function createNormalMatrix(out, modelMatrix) {
    // Compute inverse transpose of model matrix for normal transformation
    const invModel = new Float32Array(16);
    invertMatrix(invModel, modelMatrix);

    // Extract the upper 3x3 submatrix
    out[0] = invModel[0];
    out[1] = invModel[1];
    out[2] = invModel[2];
    out[3] = invModel[4];
    out[4] = invModel[5];
    out[5] = invModel[6];
    out[6] = invModel[8];
    out[7] = invModel[9];
    out[8] = invModel[10];

    return out;
}

// Function to create a perspective projection matrix
function perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);

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
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) / (near - far);
    out[15] = 0;

    return out;
}

// Function to create a view matrix from a position and target
function lookAt(out, eye, center, up) {
    const z = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];

    // Normalize z
    let len = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
    if (len > 0) {
        z[0] /= len;
        z[1] /= len;
        z[2] /= len;
    }

    // Cross product to get x axis
    const x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]];

    // Normalize x
    len = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
    if (len > 0) {
        x[0] /= len;
        x[1] /= len;
        x[2] /= len;
    }

    // Recompute y to ensure orthogonality
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];

    // Set the matrix values
    out[0] = x[0];
    out[1] = y[0];
    out[2] = z[0];
    out[3] = 0;
    out[4] = x[1];
    out[5] = y[1];
    out[6] = z[1];
    out[7] = 0;
    out[8] = x[2];
    out[9] = y[2];
    out[10] = z[2];
    out[11] = 0;
    out[12] = -x[0] * eye[0] - x[1] * eye[1] - x[2] * eye[2];
    out[13] = -y[0] * eye[0] - y[1] * eye[1] - y[2] * eye[2];
    out[14] = -z[0] * eye[0] - z[1] * eye[1] - z[2] * eye[2];
    out[15] = 1;

    return out;
}

// Function to create a rotation matrix
function rotateY(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);

    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
}

// Initialize settings
const settings = {
    lightIntensity: 1.0,
    ambientStrength: 0.3,
    material: 'plastic',
    background: 'skybox',
};

// Light intensity slider
document.getElementById('lightIntensity').addEventListener('input', (event) => {
    settings.lightIntensity = parseFloat(event.target.value);
    requestAnimationFrame(render);
});

// Ambient light slider
document.getElementById('ambientStrength').addEventListener('input', (event) => {
    settings.ambientStrength = parseFloat(event.target.value);
    requestAnimationFrame(render);
});

// Material buttons
document.getElementById('materialMetal').addEventListener('click', () => {
    settings.material = 'metal';
    updateMaterial();
    requestAnimationFrame(render);
});

document.getElementById('materialPlastic').addEventListener('click', () => {
    settings.material = 'plastic';
    updateMaterial();
    requestAnimationFrame(render);
});

document.getElementById('materialWood').addEventListener('click', () => {
    settings.material = 'wood';
    updateMaterial();
    requestAnimationFrame(render);
});

// Background selection
document.getElementById('backgroundSelect').addEventListener('change', (event) => {
    settings.background = event.target.value;
    updateBackground();
    requestAnimationFrame(render);
});

// Update material properties
function updateMaterial() {
    // Material parameters
    let roughness, metalness, albedo;

    switch (settings.material) {
        case 'metal':
            roughness = 0.2;
            metalness = 0.9;
            useTexture = false;
            break;
        case 'plastic':
            roughness = 0.7;
            metalness = 0.0;
            useTexture = false;
            break;
        case 'wood':
            roughness = 0.9;
            metalness = 0.0;
            useTexture = true;
            break;
    }

    // Store for use in render function
    settings.roughness = roughness;
    settings.metalness = metalness;
}

// Update background settings
function updateBackground() {
    switch (settings.background) {
        case 'skybox':
            renderSkybox = true;
            useGradientBackground = false;
            gl.clearColor(0, 0, 0, 0);
            break;
        case 'solid':
            renderSkybox = false;
            useGradientBackground = false;
            gl.clearColor(0.2, 0.3, 0.4, 1.0);
            break;
        case 'gradient':
            renderSkybox = false;
            useGradientBackground = true;
            gl.clearColor(0, 0, 0, 0);
            break;
    }
}

// Example of a simple custom color picker
class ColorPicker {
    constructor(container, options) {
        this.container = container;
        this.options = options || {};
        this.color = options.color || '#FF0000';

        this._createElements();
        this._setupListeners();
    }

    _createElements() {
        // Create the color input
        this.input = document.createElement('input');
        this.input.type = 'color';
        this.input.value = this.color;
        this.input.style.width = '100%';
        this.input.style.marginBottom = '10px';

        // Create color swatches
        this.swatches = document.createElement('div');
        this.swatches.className = 'color-swatches';
        this.swatches.style.display = 'flex';
        this.swatches.style.flexWrap = 'wrap';
        this.swatches.style.gap = '5px';

        // Add some preset colors
        const presets = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

        presets.forEach((color) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.width = '20px';
            swatch.style.height = '20px';
            swatch.style.backgroundColor = color;
            swatch.style.cursor = 'pointer';
            swatch.style.border = '1px solid #ccc';
            swatch.addEventListener('click', () => {
                this.setColor(color);
            });
            this.swatches.appendChild(swatch);
        });

        // Append to container
        this.container.appendChild(this.input);
        this.container.appendChild(this.swatches);
    }

    _setupListeners() {
        this.input.addEventListener('input', () => {
            this.color = this.input.value;
            if (this.options.onChange) {
                this.options.onChange(this.color);
            }
        });
    }

    setColor(color) {
        this.color = color;
        this.input.value = color;

        if (this.options.onChange) {
            this.options.onChange(this.color);
        }
    }
}

// Setup a color picker for object color
const colorPickerContainer = document.getElementById('colorPicker');
const colorPicker = new ColorPicker(colorPickerContainer, {
    color: '#3080FF',
    onChange: (color) => {
        // Convert hex to RGB [0-1]
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;

        // Update selected object color
        selectedObject.color = [r, g, b];
        requestAnimationFrame(render);
    },
});

// Animation variables
let rotation = 0;
let lastTime = 0;

// Rendering function
function render(now) {
    // Handle canvas resizing
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        resizeCanvas();
    }

    // Calculate time delta for animations
    const deltaTime = now - lastTime;
    lastTime = now;

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update rotation (simple animation)
    rotation += deltaTime * 0.001;

    // Update matrices
    // View matrix - position the camera
    lookAt(
        viewMatrix,
        cameraPosition,
        [0, 0, 0], // Look at the origin
        [0, 1, 0] // Up vector
    );

    // Projection matrix - perspective projection
    perspective(
        projectionMatrix,
        Math.PI / 4, // 45 degrees field of view
        canvas.width / canvas.height, // Aspect ratio
        0.1, // Near plane
        100.0 // Far plane
    );

    // Model matrix - rotate the object
    rotateY(modelMatrix, rotation);

    // Calculate normal matrix
    const normalMatrix = new Float32Array(9);
    createNormalMatrix(normalMatrix, modelMatrix);

    // If gradient background is enabled, render it
    if (useGradientBackground && !renderSkybox) {
        gl.useProgram(gradientProgram);
        gl.bindVertexArray(gradientVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // If skybox is enabled, render it first
    if (renderSkybox) {
        gl.depthFunc(gl.LEQUAL);
        gl.useProgram(skyboxProgram);

        // Remove translation from view matrix
        const skyboxViewMatrix = new Float32Array(16);
        // Copy view matrix but remove translation
        for (let i = 0; i < 16; i++) {
            skyboxViewMatrix[i] = viewMatrix[i];
        }
        skyboxViewMatrix[12] = 0;
        skyboxViewMatrix[13] = 0;
        skyboxViewMatrix[14] = 0;

        gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, 'uView'), false, skyboxViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, 'uProjection'), false, projectionMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
        gl.uniform1i(gl.getUniformLocation(skyboxProgram, 'uSkybox'), 0);

        gl.bindVertexArray(skyboxVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        gl.depthFunc(gl.LESS);
    }

    // Use the main program for object rendering
    gl.useProgram(program);

    // Set uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, modelMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projectionMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, normalMatrix);

    gl.uniform3fv(gl.getUniformLocation(program, 'uLightPos'), lightPosition);
    gl.uniform3fv(gl.getUniformLocation(program, 'uViewPos'), cameraPosition);
    gl.uniform1f(gl.getUniformLocation(program, 'uLightIntensity'), settings.lightIntensity);
    gl.uniform1f(gl.getUniformLocation(program, 'uAmbientStrength'), settings.ambientStrength);

    gl.uniform3fv(gl.getUniformLocation(program, 'uObjectColor'), selectedObject.color);
    gl.uniform1f(gl.getUniformLocation(program, 'uRoughness'), settings.roughness || 0.5);
    gl.uniform1f(gl.getUniformLocation(program, 'uMetalness'), settings.metalness || 0.0);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sphereTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uTextureMap'), 0);

    // Bind skybox for reflections
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uSkybox'), 1);

    // Set flags
    gl.uniform1i(gl.getUniformLocation(program, 'uRenderSkybox'), renderSkybox ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(program, 'uUseTexture'), useTexture ? 1 : 0);

    // Draw the sphere
    gl.bindVertexArray(sphereVAO);
    gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);

    // Request the next frame
    requestAnimationFrame(render);
}

// Initially update all settings
updateMaterial();
updateBackground();
resizeCanvas();

// Handle UI panel toggle
const controlsPanel = document.querySelector('.controls-panel');
const toggleUI = document.querySelector('.toggle-ui');

if (toggleUI) {
    toggleUI.addEventListener('click', () => {
        controlsPanel.classList.toggle('visible');
        toggleUI.textContent = controlsPanel.classList.contains('visible') ? '−' : '+';
    });
}

// Also close UI when clicking outside on mobile
canvas.addEventListener('click', (event) => {
    if (window.innerWidth <= 768 && controlsPanel.classList.contains('visible')) {
        controlsPanel.classList.remove('visible');
        toggleUI.textContent = '+';
    }
});

// Start the render loop
requestAnimationFrame(render);
