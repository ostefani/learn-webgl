/**
 * Matrix Mathematics Module
 * Provides matrix operations for WebGL graphics
 */
const Matrix = (function () {
    /**
     * Create a 4x4 identity matrix
     * @returns {Float32Array} 4x4 identity matrix
     */
    function identity() {
        const mat = new Float32Array(16);
        mat[0] = 1;
        mat[4] = 0;
        mat[8] = 0;
        mat[12] = 0;
        mat[1] = 0;
        mat[5] = 1;
        mat[9] = 0;
        mat[13] = 0;
        mat[2] = 0;
        mat[6] = 0;
        mat[10] = 1;
        mat[14] = 0;
        mat[3] = 0;
        mat[7] = 0;
        mat[11] = 0;
        mat[15] = 1;
        return mat;
    }

    /**
     * Translate a matrix by the given vector
     * @param {Float32Array} mat - Matrix to translate
     * @param {number} x - X translation
     * @param {number} y - Y translation
     * @param {number} z - Z translation
     */
    function translate(mat, x, y, z) {
        mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
        mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
    }

    /**
     * Rotate a matrix around the X axis
     * @param {Float32Array} mat - Matrix to rotate
     * @param {number} angle - Rotation angle in radians
     */
    function rotateX(mat, angle) {
        const s = Math.sin(angle);
        const c = Math.cos(angle);

        const a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7];
        const a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        // Rotate the matrix
        mat[4] = a10 * c + a20 * s;
        mat[5] = a11 * c + a21 * s;
        mat[6] = a12 * c + a22 * s;
        mat[7] = a13 * c + a23 * s;

        mat[8] = a20 * c - a10 * s;
        mat[9] = a21 * c - a11 * s;
        mat[10] = a22 * c - a12 * s;
        mat[11] = a23 * c - a13 * s;
    }

    /**
     * Rotate a matrix around the Y axis
     * @param {Float32Array} mat - Matrix to rotate
     * @param {number} angle - Rotation angle in radians
     */
    function rotateY(mat, angle) {
        const s = Math.sin(angle);
        const c = Math.cos(angle);

        const a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3];
        const a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        // Rotate the matrix
        mat[0] = a00 * c - a20 * s;
        mat[1] = a01 * c - a21 * s;
        mat[2] = a02 * c - a22 * s;
        mat[3] = a03 * c - a23 * s;

        mat[8] = a00 * s + a20 * c;
        mat[9] = a01 * s + a21 * c;
        mat[10] = a02 * s + a22 * c;
        mat[11] = a03 * s + a23 * c;
    }

    /**
     * Rotate a matrix around the Z axis
     * @param {Float32Array} mat - Matrix to rotate
     * @param {number} angle - Rotation angle in radians
     */
    function rotateZ(mat, angle) {
        const s = Math.sin(angle);
        const c = Math.cos(angle);

        const a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3];
        const a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7];

        // Rotate the matrix
        mat[0] = a00 * c + a10 * s;
        mat[1] = a01 * c + a11 * s;
        mat[2] = a02 * c + a12 * s;
        mat[3] = a03 * c + a13 * s;

        mat[4] = a10 * c - a00 * s;
        mat[5] = a11 * c - a01 * s;
        mat[6] = a12 * c - a02 * s;
        mat[7] = a13 * c - a03 * s;
    }

    /**
     * Create a perspective projection matrix
     * @param {number} fov - Field of view in radians
     * @param {number} aspect - Aspect ratio (width / height)
     * @param {number} near - Near clipping plane
     * @param {number} far - Far clipping plane
     * @returns {Float32Array} Perspective projection matrix
     */
    function perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const rangeInv = 1.0 / (near - far);

        const mat = new Float32Array(16);
        mat[0] = f / aspect;
        mat[1] = 0;
        mat[2] = 0;
        mat[3] = 0;

        mat[4] = 0;
        mat[5] = f;
        mat[6] = 0;
        mat[7] = 0;

        mat[8] = 0;
        mat[9] = 0;
        mat[10] = (far + near) * rangeInv;
        mat[11] = -1;

        mat[12] = 0;
        mat[13] = 0;
        mat[14] = 2 * far * near * rangeInv;
        mat[15] = 0;

        return mat;
    }

    /**
     * Extract the normal matrix from a 4x4 model-view matrix
     * @param {Float32Array} modelViewMatrix - 4x4 model-view matrix
     * @returns {Float32Array} 3x3 normal matrix
     */
    function extractNormalMatrix(modelViewMatrix) {
        const normalMatrix = new Float32Array(9);

        // Extract the rotation part of the model-view matrix
        normalMatrix[0] = modelViewMatrix[0];
        normalMatrix[1] = modelViewMatrix[1];
        normalMatrix[2] = modelViewMatrix[2];
        normalMatrix[3] = modelViewMatrix[4];
        normalMatrix[4] = modelViewMatrix[5];
        normalMatrix[5] = modelViewMatrix[6];
        normalMatrix[6] = modelViewMatrix[8];
        normalMatrix[7] = modelViewMatrix[9];
        normalMatrix[8] = modelViewMatrix[10];

        // For a proper normal matrix, we should compute the inverse transpose,
        // but for simple rotations without non-uniform scaling, this is sufficient

        return normalMatrix;
    }

    // Public API
    return {
        identity: identity,
        translate: translate,
        rotateX: rotateX,
        rotateY: rotateY,
        rotateZ: rotateZ,
        perspective: perspective,
        extractNormalMatrix: extractNormalMatrix,
    };
})();
