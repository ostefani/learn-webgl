// 3D Model Definitions

/**
 * Creates a sphere geometry
 * @param {number} radius - Radius of the sphere
 * @param {number} latitudeBands - Number of bands around the sphere vertically
 * @param {number} longitudeBands - Number of bands around the sphere horizontally
 * @returns {Object} Object containing positions, normals, texture coordinates, and indices
 */
function createSphere(radius = 1.0, latitudeBands = 32, longitudeBands = 32) {
    const positions = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    // Generate vertices
    for (let lat = 0; lat <= latitudeBands; lat++) {
        const theta = (lat * Math.PI) / latitudeBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= longitudeBands; lon++) {
            const phi = (lon * 2 * Math.PI) / longitudeBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // Position
            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            // Normal
            normals.push(x, y, z);

            // Position
            positions.push(radius * x, radius * y, radius * z);

            // Texture coordinate
            texCoords.push(1 - lon / longitudeBands, 1 - lat / latitudeBands);
        }
    }

    // Generate indices
    for (let lat = 0; lat < latitudeBands; lat++) {
        for (let lon = 0; lon < longitudeBands; lon++) {
            const first = lat * (longitudeBands + 1) + lon;
            const second = first + longitudeBands + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

/**
 * Creates a cube geometry
 * @param {number} size - Size of the cube
 * @returns {Object} Object containing positions, normals, texture coordinates, and indices
 */
function createCube(size = 1.0) {
    const positions = new Float32Array([
        // Front face
        -size,
        -size,
        size,
        size,
        -size,
        size,
        size,
        size,
        size,
        -size,
        size,
        size,

        // Back face
        -size,
        -size,
        -size,
        -size,
        size,
        -size,
        size,
        size,
        -size,
        size,
        -size,
        -size,

        // Top face
        -size,
        size,
        -size,
        -size,
        size,
        size,
        size,
        size,
        size,
        size,
        size,
        -size,

        // Bottom face
        -size,
        -size,
        -size,
        size,
        -size,
        -size,
        size,
        -size,
        size,
        -size,
        -size,
        size,

        // Right face
        size,
        -size,
        -size,
        size,
        size,
        -size,
        size,
        size,
        size,
        size,
        -size,
        size,

        // Left face
        -size,
        -size,
        -size,
        -size,
        -size,
        size,
        -size,
        size,
        size,
        -size,
        size,
        -size,
    ]);

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

    const texCoords = new Float32Array([
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

    return { positions, normals, texCoords, indices };
}

/**
 * Creates a plane geometry
 * @param {number} width - Width of the plane
 * @param {number} height - Height of the plane
 * @param {number} widthSegments - Number of width segments
 * @param {number} heightSegments - Number of height segments
 * @returns {Object} Object containing positions, normals, texture coordinates, and indices
 */
function createPlane(width = 2.0, height = 2.0, widthSegments = 1, heightSegments = 1) {
    const positions = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    // Generate vertices
    for (let y = 0; y <= heightSegments; y++) {
        const v = y / heightSegments;

        for (let x = 0; x <= widthSegments; x++) {
            const u = x / widthSegments;

            // Position
            positions.push(width * (u - 0.5), 0, height * (v - 0.5));

            // Normal
            normals.push(0, 1, 0);

            // Texture coordinate
            texCoords.push(u, v);
        }
    }

    // Generate indices
    for (let y = 0; y < heightSegments; y++) {
        for (let x = 0; x < widthSegments; x++) {
            const a = x + (widthSegments + 1) * y;
            const b = x + (widthSegments + 1) * (y + 1);
            const c = x + 1 + (widthSegments + 1) * (y + 1);
            const d = x + 1 + (widthSegments + 1) * y;

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

/**
 * Creates a torus geometry
 * @param {number} radius - Outer radius of the torus
 * @param {number} tubeRadius - Radius of the tube
 * @param {number} radialSegments - Number of segments around the tube
 * @param {number} tubularSegments - Number of segments around the torus
 * @returns {Object} Object containing positions, normals, texture coordinates, and indices
 */
function createTorus(radius = 1.0, tubeRadius = 0.4, radialSegments = 32, tubularSegments = 48) {
    const positions = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    // Generate vertices
    for (let j = 0; j <= radialSegments; j++) {
        for (let i = 0; i <= tubularSegments; i++) {
            const u = (i / tubularSegments) * Math.PI * 2;
            const v = (j / radialSegments) * Math.PI * 2;

            // Position
            const x = (radius + tubeRadius * Math.cos(v)) * Math.cos(u);
            const y = tubeRadius * Math.sin(v);
            const z = (radius + tubeRadius * Math.cos(v)) * Math.sin(u);
            positions.push(x, y, z);

            // Normal
            const centerX = radius * Math.cos(u);
            const centerZ = radius * Math.sin(u);
            const nx = (x - centerX) / tubeRadius;
            const ny = y / tubeRadius;
            const nz = (z - centerZ) / tubeRadius;
            normals.push(nx, ny, nz);

            // Texture coordinate
            texCoords.push(i / tubularSegments, j / radialSegments);
        }
    }

    // Generate indices
    for (let j = 1; j <= radialSegments; j++) {
        for (let i = 1; i <= tubularSegments; i++) {
            const a = (tubularSegments + 1) * j + i - 1;
            const b = (tubularSegments + 1) * (j - 1) + i - 1;
            const c = (tubularSegments + 1) * (j - 1) + i;
            const d = (tubularSegments + 1) * j + i;

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}
