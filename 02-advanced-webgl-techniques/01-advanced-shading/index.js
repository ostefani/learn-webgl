// Utility Functions for Matrix and Vector Operations
function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function perspective(fov, aspect, near, far) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (near + far) * rangeInv, -1, 0, 0, near * far * rangeInv * 2, 0];
}

function lookAt(eye, center, up) {
    const z = normalize(subtract(eye, center));
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
}

function translate(x, y, z) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// Geometry Generation Functions
function createSphere(radius, latSegments, longSegments) {
    const positions = [];
    const normals = [];
    const texCoords = [];
    const tangents = [];
    const indices = [];

    for (let lat = 0; lat <= latSegments; lat++) {
        const theta = (lat * Math.PI) / latSegments;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let long = 0; long <= longSegments; long++) {
            const phi = (long * 2 * Math.PI) / longSegments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;
            const u = 1 - long / longSegments;
            const v = 1 - lat / latSegments;

            positions.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
            tangents.push(-sinPhi, 0, cosPhi);
            texCoords.push(u, v);
        }
    }

    for (let lat = 0; lat < latSegments; lat++) {
        for (let long = 0; long < longSegments; long++) {
            const first = lat * (longSegments + 1) + long;
            const second = first + longSegments + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { positions, normals, tangents, texCoords, indices };
}

function createCube(size) {
    const s = size / 2;
    const positions = [
        // Front
        -s,
        -s,
        s,
        s,
        -s,
        s,
        s,
        s,
        s,
        -s,
        s,
        s,
        // Back
        -s,
        -s,
        -s,
        -s,
        s,
        -s,
        s,
        s,
        -s,
        s,
        -s,
        -s,
        // Top
        -s,
        s,
        -s,
        -s,
        s,
        s,
        s,
        s,
        s,
        s,
        s,
        -s,
        // Bottom
        -s,
        -s,
        -s,
        s,
        -s,
        -s,
        s,
        -s,
        s,
        -s,
        -s,
        s,
        // Left
        -s,
        -s,
        -s,
        -s,
        -s,
        s,
        -s,
        s,
        s,
        -s,
        s,
        -s,
        // Right
        s,
        -s,
        -s,
        s,
        s,
        -s,
        s,
        s,
        s,
        s,
        -s,
        s,
    ];
    const normals = [
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0,
    ];
    const tangents = [
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    ];
    const texCoords = [
        0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0,
        1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0,
    ];
    const indices = [
        0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21,
        22, 20, 22, 23,
    ];
    return { positions, normals, tangents, texCoords, indices };
}

function createPlane(size) {
    const s = size / 2;
    const positions = [-s, 0, -s, s, 0, -s, s, 0, s, -s, 0, s];
    const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const tangents = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
    const texCoords = [0, 0, 1, 0, 1, 1, 0, 1];
    const indices = [0, 1, 2, 0, 2, 3];
    return { positions, normals, tangents, texCoords, indices };
}

// WebGL Setup
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    alert('WebGL 2 is not supported in this browser.');
    throw new Error('WebGL 2 not supported');
}

gl.enable(gl.DEPTH_TEST);

// Shader Sources
const vertexShaderSource = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec3 a_tangent;
in vec2 a_texCoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat4 u_normalMatrix;

out vec3 v_worldPosition;
out vec3 v_worldNormal;
out vec3 v_worldTangent;
out vec2 v_texCoord;

void main() {
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    v_worldPosition = worldPos.xyz;
    v_worldNormal = mat3(u_normalMatrix) * a_normal;
    v_worldTangent = mat3(u_normalMatrix) * a_tangent;
    v_texCoord = a_texCoord;
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 v_worldPosition;
in vec3 v_worldNormal;
in vec3 v_worldTangent;
in vec2 v_texCoord;

uniform vec3 u_cameraPosition;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform vec3 u_ambientLight;
uniform vec3 u_albedo;
uniform float u_metallic;
uniform float u_roughness;
uniform int u_useNormalMap;
uniform int u_useProceduralTexture;

out vec4 fragColor;

vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

vec2 voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    vec2 minID = vec2(0.0);
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 o = random2(n + g);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if(d < minDist) {
                minDist = d;
                minID = n + g + o;
            }
        }
    }
    return vec2(sqrt(minDist), minID.x * 31.0 + minID.y);
}

float computeHeight(vec2 uv) {
    return sin(uv.x * 10.0) * sin(uv.y * 10.0) * 0.1;
}

vec3 computeProceduralAlbedo(vec2 uv) {
    vec2 v = voronoi(uv * 10.0);
    float cell = v.y;
    float dist = v.x;
    float crack = smoothstep(0.04, 0.07, dist);
    vec3 baseColor = vec3(0.6, 0.4, 0.2);
    vec3 crackColor = vec3(0.1, 0.1, 0.1);
    vec3 cellColor = baseColor * (0.8 + 0.4 * fract(cell * 0.1));
    return mix(crackColor, cellColor, crack);
}

vec3 computeNormalFromHeight(vec2 uv) {
    float a = 10.0;
    float dhdx = a * cos(uv.x * a) * sin(uv.y * a) * 0.1;
    float dhdy = a * sin(uv.x * a) * cos(uv.y * a) * 0.1;
    return normalize(vec3(-dhdx, -dhdy, 1.0));
}

float distributionGGX(float NoH, float alpha) {
    float alpha2 = alpha * alpha;
    float NoH2 = NoH * NoH;
    float den = NoH2 * (alpha2 - 1.0) + 1.0;
    return alpha2 / (3.14159265 * den * den);
}

float geometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(float NdotL, float NdotV, float roughness) {
    return geometrySchlickGGX(NdotL, roughness) * geometrySchlickGGX(NdotV, roughness);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
    vec3 albedo = u_useProceduralTexture == 1 ? computeProceduralAlbedo(v_texCoord) : u_albedo;

    vec3 N = u_useNormalMap == 1 ? normalize(mat3(v_worldTangent, cross(v_worldNormal, v_worldTangent), v_worldNormal) * computeNormalFromHeight(v_texCoord)) : normalize(v_worldNormal);

    vec3 V = normalize(u_cameraPosition - v_worldPosition);
    vec3 L = normalize(u_lightPosition - v_worldPosition);
    vec3 H = normalize(L + V);

    vec3 F0 = mix(vec3(0.04), albedo, u_metallic);
    float alpha = u_roughness * u_roughness;
    float D = distributionGGX(max(dot(N, H), 0.0), alpha);
    float G = geometrySmith(max(dot(N, L), 0.0), max(dot(N, V), 0.0), u_roughness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

    vec3 specular = (D * G * F) / (4.0 * max(dot(N, L), 0.0) * max(dot(N, V), 0.0) + 0.001);
    vec3 diffuse = (1.0 - F) * (1.0 - u_metallic) * albedo / 3.14159265;

    float NdotL = max(dot(N, L), 0.0);
    vec3 radiance = u_lightColor * NdotL;

    vec3 color = (diffuse + specular) * radiance + u_ambientLight * albedo;

    fragColor = vec4(color, 1.0);
}
`;

// Compile and Link Shaders
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}

// Geometry Setup
function createVAO(data) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    buffers.normal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    buffers.tangent = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tangent);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.tangents), gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    buffers.texCoord = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(3);

    buffers.index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, indexCount: data.indices.length };
}

const sphere = createVAO(createSphere(1.0, 20, 20));
const cube = createVAO(createCube(1.0));
const plane = createVAO(createPlane(10.0));

// Scene Objects
const objects = [
    {
        vao: sphere.vao,
        indexCount: sphere.indexCount,
        modelMatrix: translate(0, 1, 0),
        material: { albedo: [0.8, 0.8, 0.8], metallic: 1.0, roughness: 0.1, useNormalMap: 0, useProceduralTexture: 0 },
    },
    {
        vao: cube.vao,
        indexCount: cube.indexCount,
        modelMatrix: translate(2, 1, 0),
        material: { albedo: [0.2, 0.3, 0.8], metallic: 0.0, roughness: 0.5, useNormalMap: 1, useProceduralTexture: 0 },
    },
    {
        vao: plane.vao,
        indexCount: plane.indexCount,
        modelMatrix: identity(),
        material: { albedo: [1.0, 1.0, 1.0], metallic: 0.0, roughness: 0.7, useNormalMap: 0, useProceduralTexture: 1 },
    },
];

// Camera and Lighting
const cameraPosition = [0, 2, 5];
const viewMatrix = lookAt(cameraPosition, [0, 0, 0], [0, 1, 0]);
const projectionMatrix = perspective(Math.PI / 3, canvas.width / canvas.height, 0.1, 100);

const lightPosition = [3, 3, 3];
const lightColor = [1, 1, 1];
const ambientLight = [0.1, 0.1, 0.1];

// Rendering Loop
function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_viewMatrix'), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projectionMatrix'), false, projectionMatrix);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_cameraPosition'), cameraPosition);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_lightPosition'), lightPosition);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_lightColor'), lightColor);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_ambientLight'), ambientLight);

    objects.forEach((obj) => {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_modelMatrix'), false, obj.modelMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_normalMatrix'), false, identity());

        const mat = obj.material;
        gl.uniform3fv(gl.getUniformLocation(program, 'u_albedo'), mat.albedo);
        gl.uniform1f(gl.getUniformLocation(program, 'u_metallic'), mat.metallic);
        gl.uniform1f(gl.getUniformLocation(program, 'u_roughness'), mat.roughness);
        gl.uniform1i(gl.getUniformLocation(program, 'u_useNormalMap'), mat.useNormalMap);
        gl.uniform1i(gl.getUniformLocation(program, 'u_useProceduralTexture'), mat.useProceduralTexture);

        gl.bindVertexArray(obj.vao);
        gl.drawElements(gl.TRIANGLES, obj.indexCount, gl.UNSIGNED_SHORT, 0);
    });

    requestAnimationFrame(render);
}

render();
