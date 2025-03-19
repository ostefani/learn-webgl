/**
 * TextureGenerator Module - Creates procedural textures for WebGL
 */
const TextureGenerator = (function () {
    // Texture reference
    let texture;

    /**
     * Initialize a procedural texture
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    function initTexture(gl) {
        // Create a texture
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Create a procedural checkerboard pattern
        const size = 256;
        const data = new Uint8Array(size * size * 4);

        // Fill the texture with a checkerboard pattern
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;

                // Checkerboard pattern - 32x32 pixel squares
                const isCheckerboard = (Math.floor(x / 32) % 2 === 0) !== (Math.floor(y / 32) % 2 === 0);

                // Additional circular gradient
                const dx = x - size / 2;
                const dy = y - size / 2;
                const distance = Math.sqrt(dx * dx + dy * dy) / (size / 2);
                const circle = 1.0 - Math.min(1.0, distance);

                // Combine patterns
                data[index] = isCheckerboard ? 200 : 50; // R
                data[index + 1] = Math.round((isCheckerboard ? 50 : 200) * circle); // G
                data[index + 2] = isCheckerboard ? 50 : 200; // B
                data[index + 3] = 255; // A
            }
        }

        // Upload the texture data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Generate mipmaps
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    /**
     * Get the created texture
     * @returns {WebGLTexture} The generated texture
     */
    function getTexture() {
        return texture;
    }

    // Public API
    return {
        initTexture: initTexture,
        getTexture: getTexture,
    };
})();
