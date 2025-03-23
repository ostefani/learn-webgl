# Texturing in WebGL 2

## Introduction to Textures

### What Are Textures?

Textures in computer graphics are 2D images that are mapped onto 3D surfaces to add visual detail, color, and realism to objects. They function like a digital "skin" wrapped around geometric shapes, transforming basic 3D models into visually rich objects. For example, a simple cube with a texture can become a wooden crate, a brick block, or a television.

Textures provide a way to add complex visual details to surfaces without requiring complex geometry. A single texture can contain intricate patterns, colors, and details that would be impractical or impossible to model geometrically.

### Why Use Textures?

Textures are essential in 3D graphics for several reasons:

1. **Detail Without Complexity**: They add visual complexity without increasing geometric complexity. A single flat polygon can appear to have intricate details when textured.

2. **Performance Efficiency**: Using textures to represent details is much more efficient than modeling those details with additional geometry. This leads to better rendering performance and lower memory usage.

3. **Realism**: Textures derived from photographs or realistic artwork contribute significantly to making 3D scenes believable.

4. **Visual Variety**: The same 3D model can look completely different with different textures applied, allowing for greater variety with minimal additional work.

5. **Dynamic Properties**: In modern graphics, textures aren't limited to color information. They can store data like surface normals, reflectivity, roughness, and height information, allowing for advanced rendering effects.

In WebGL, textures are particularly powerful because they're processed in shader programs, which can manipulate and combine texture data in sophisticated ways to create a wide range of visual effects.

## Loading Textures in WebGL 2

### Creating Texture Objects

In WebGL 2, textures are represented by texture objects, which are created and manipulated through the WebGL API. Creating a texture object is the first step in the process:

```javascript
// Create a texture object
const texture = gl.createTexture();
```

This creates an empty texture object, but it doesn't yet contain any image data or configuration.

### Loading an Image

To use a texture effectively, we need to load image data into it. This typically involves loading an external image file, then transferring that data to the GPU:

```javascript
// Create a texture object
const texture = gl.createTexture();

// Bind the texture to the 2D texture target
gl.bindTexture(gl.TEXTURE_2D, texture);

// Initially fill the texture with a single pixel
// This allows us to use the texture before the image loads
gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mipmap level
    gl.RGBA, // internal format
    1,
    1, // width, height
    0, // border (must be 0)
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array([0, 0, 255, 255]) // blue pixel
);

// Create an image element
const image = new Image();
image.crossOrigin = 'anonymous'; // Handle CORS if needed
image.src = 'path/to/your/texture.jpg';
image.onload = function () {
    // Now that the image has loaded, bind the texture
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Upload the image data to the texture
    gl.texImage2D(
        gl.TEXTURE_2D,
        0, // mipmap level
        gl.RGBA, // internal format
        gl.RGBA, // format
        gl.UNSIGNED_BYTE, // type
        image // image data
    );

    // Check if the image dimensions are powers of 2
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Generate mipmaps if dimensions are powers of 2
        gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        // For non-power-of-2 textures, we need to:
        // 1. Disable mipmapping
        // 2. Set wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    // Now that the texture is loaded, we can render
    render();
};

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}
```

This code:

1. Creates and binds a texture
2. Initializes it with a single blue pixel (as a placeholder)
3. Loads an image asynchronously
4. Once the image has loaded, uploads it to the texture
5. Sets appropriate parameters based on whether the image dimensions are powers of 2

### Texture Units

WebGL provides multiple "texture units" that allow you to use multiple textures in a single draw call. Each texture unit can have one bound texture of each type (2D, cube map, etc.). Texture units are referenced by indices (0, 1, 2, etc.) and are activated using `gl.activeTexture()`:

```javascript
// Activate texture unit 0
gl.activeTexture(gl.TEXTURE0);
// Bind our texture to the active texture unit
gl.bindTexture(gl.TEXTURE_2D, texture1);

// Activate texture unit 1
gl.activeTexture(gl.TEXTURE1);
// Bind another texture to this unit
gl.bindTexture(gl.TEXTURE_2D, texture2);

// Tell the shader which texture units to use
const texture1Location = gl.getUniformLocation(program, 'uTexture1');
const texture2Location = gl.getUniformLocation(program, 'uTexture2');
gl.uniform1i(texture1Location, 0); // Use texture unit 0 for uTexture1
gl.uniform1i(texture2Location, 1); // Use texture unit 1 for uTexture2
```

The number of available texture units varies by device but is guaranteed to be at least 16 in WebGL 2. This system allows complex shader effects that combine multiple textures.

## Texture Coordinates

### UV Mapping

Texture coordinates, often called UVs (referring to the 2D coordinate axes), define how a 2D texture image maps onto a 3D surface. They create a relationship between vertices on the 3D model and positions in the 2D texture image.

Key points about texture coordinates:

1. **Range**: Texture coordinates typically range from 0.0 to 1.0, where:

    - (0,0) corresponds to the bottom-left corner of the texture
    - (1,0) corresponds to the bottom-right corner
    - (0,1) corresponds to the top-left corner
    - (1,1) corresponds to the top-right corner

2. **Per-Vertex Data**: Like positions and normals, texture coordinates are specified per vertex and interpolated across faces.

3. **Independence from Geometry**: UV coordinates are independent of the object's actual dimensions and position in 3D space. This allows the same texture to be applied to objects of different sizes and shapes.

Here's how you might specify texture coordinates for a simple quad:

```javascript
// Vertex positions (x, y, z)
const positions = new Float32Array([
    -1.0,
    -1.0,
    0.0, // bottom-left
    1.0,
    -1.0,
    0.0, // bottom-right
    1.0,
    1.0,
    0.0, // top-right
    -1.0,
    1.0,
    0.0, // top-left
]);

// Texture coordinates (u, v)
const texCoords = new Float32Array([
    0.0,
    0.0, // bottom-left
    1.0,
    0.0, // bottom-right
    1.0,
    1.0, // top-right
    0.0,
    1.0, // top-left
]);
```

### Shader Workflow

Texture coordinates follow the same data flow pattern as other vertex attributes in WebGL:

1. **Create and populate a buffer** with texture coordinate data
2. **Configure the vertex attribute** to read from this buffer
3. **Pass the coordinates from the vertex shader to the fragment shader**
4. **Sample the texture** in the fragment shader using these coordinates

Here's an example of this workflow:

```javascript
// Create and bind VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Position buffer setup
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
const positionLoc = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

// Texture coordinate buffer setup
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
const texCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
gl.enableVertexAttribArray(texCoordLoc);
gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

// Unbind VAO
gl.bindVertexArray(null);
```

And the corresponding shaders:

```glsl
// Vertex shader
#version 300 es

in vec3 aPosition;
in vec2 aTexCoord;

// Pass texture coordinates to fragment shader
out vec2 vTexCoord;

uniform mat4 uModelViewProjection;

void main() {
    gl_Position = uModelViewProjection * vec4(aPosition, 1.0);

    // Pass the texture coordinates to the fragment shader
    vTexCoord = aTexCoord;
}
```

```glsl
// Fragment shader
#version 300 es
precision highp float;

// Receive texture coordinates from vertex shader
in vec2 vTexCoord;

// Sampler for the texture
uniform sampler2D uTexture;

// Output color
out vec4 fragColor;

void main() {
    // Sample the texture at the interpolated coordinates
    fragColor = texture(uTexture, vTexCoord);
}
```

This workflow illustrates how texture coordinates are transferred from CPU memory through the vertex shader, where they're interpolated across each primitive, and finally to the fragment shader, where they're used to sample the texture.

## Basic Texture Types

### Diffuse Maps

The most common type of texture is the diffuse map, which provides the base color of a surface. This is the texture that defines what an object literally "looks like" in terms of its color and pattern.

Diffuse maps represent how a surface reflects light evenly in all directions (diffuse reflection). In simplified terms, it's what you would see if you took a photograph of the material under perfect, even lighting.

Examples of diffuse maps include:

-   Wood grain for furniture
-   Bricks for a wall
-   Fabric pattern for clothing
-   Skin tones for characters

In our previous shader example, we were using a diffuse map - the texture was directly contributing to the final color of the fragment.

### Other Texture Types

While diffuse maps are the most basic and common type of texture, modern 3D graphics use many other types of textures to create realistic surfaces. These are beyond the scope of this lesson but worth mentioning for future exploration:

-   **Normal Maps**: Store surface normal direction information to create the illusion of detailed surfaces without adding geometry.
-   **Specular Maps**: Define how shiny different parts of a surface are.
-   **Roughness Maps**: Similar to specular maps but used in physically-based rendering to define surface roughness.
-   **Metallic Maps**: Define which parts of a surface are metallic vs. non-metallic in physically-based rendering.
-   **Ambient Occlusion Maps**: Store information about how exposed each part of a surface is to ambient light.
-   **Height/Displacement Maps**: Store height information for displacing vertices or creating parallax effects.
-   **Emissive Maps**: Define areas of a surface that emit light.

Each of these texture types requires specific shader techniques to interpret and apply correctly. We'll focus on diffuse maps for now, as they are the foundation for texturing and provide immediate visual results.

## Texture Filtering

### Filtering Modes

Texture filtering defines how WebGL samples textures when they're scaled - either when a texture is displayed larger than its actual size (magnification) or smaller (minification). The choice of filtering mode affects both the visual quality and performance of your application.

#### Nearest Neighbor Filtering

Nearest neighbor (or "point") filtering simply selects the texel (texture pixel) that's closest to the calculated texture coordinate:

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
```

Characteristics:

-   **Appearance**: Creates sharp, pixelated edges when zoomed in
-   **Performance**: Very fast, minimal processing required
-   **Use Cases**: Ideal for pixel art and retro-style graphics where a pixelated look is desired

#### Linear Filtering

Linear filtering blends the colors of the nearest texels to create a smoother appearance:

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

Characteristics:

-   **Appearance**: Creates smoother transitions, blurred edges when zoomed in
-   **Performance**: Slightly more expensive than nearest filtering, but still very efficient
-   **Use Cases**: Better for realistic graphics, photographs, and most general-purpose textures

### Mipmapping

Mipmapping is a technique used to improve both performance and visual quality when textures are displayed at smaller scales. A mipmap is a pre-calculated, optimized sequence of images, each one-fourth the size of the previous one.

When a textured object is far from the camera, WebGL can use a smaller mipmap level instead of sampling from the full-size texture, which improves:

-   **Performance**: Fewer texels need to be sampled and processed
-   **Visual Quality**: Reduces aliasing artifacts (shimmering or "sparkling" when textures are viewed at a distance)

To generate mipmaps for a texture:

```javascript
gl.generateMipmap(gl.TEXTURE_2D);
```

To use mipmapping, you need to set an appropriate minification filter:

```javascript
// Nearest filtering between mipmap levels, nearest within each level
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);

// Nearest filtering between mipmap levels, linear within each level
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);

// Linear filtering between mipmap levels, nearest within each level
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

// Linear filtering between mipmap levels, linear within each level (highest quality)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
```

For most applications, `gl.LINEAR_MIPMAP_LINEAR` provides the best visual quality, while `gl.NEAREST_MIPMAP_NEAREST` is most efficient but lowest quality.

Note that mipmapping only applies to minification (when the texture is smaller than its original size), so it only affects the `TEXTURE_MIN_FILTER` setting.

## Texture Wrapping Modes

### Handling Out-of-Range UVs

Texture coordinates typically range from 0.0 to 1.0, but what happens when your texture coordinates fall outside this range? WebGL provides several wrapping modes to control this behavior.

#### Repeat Mode

In repeat mode, the texture repeats infinitely in any direction where the texture coordinate exceeds the [0,1] range:

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
```

For example, texture coordinates of (2.5, 0.7) would sample the same texel as (0.5, 0.7).

Characteristics:

-   **Appearance**: Creates a tiled effect
-   **Use Cases**: Ideal for seamless textures like brick walls, tile floors, or fabric patterns

#### Clamp to Edge Mode

In clamp to edge mode, texture coordinates are clamped to the nearest valid value:

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

Any coordinate less than 0.0 becomes 0.0, and any coordinate greater than 1.0 becomes 1.0.

Characteristics:

-   **Appearance**: Stretches the edge pixels when coordinates exceed the [0,1] range
-   **Use Cases**: Good for textures that should not tile, like photos, UI elements, or sprites

#### Mirror Repeat Mode

Mirror repeat is similar to repeat, but the texture is mirrored every other repetition:

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
```

For example, as the texture coordinate increases past 1.0, the texture inverts and repeats backward from 1.0 to 0.0, then forward again, and so on.

Characteristics:

-   **Appearance**: Creates a mirrored tiling effect
-   **Use Cases**: Useful for textures that need to tile but would have visible seams with regular repetition

### Configuration

The S and T in `TEXTURE_WRAP_S` and `TEXTURE_WRAP_T` refer to the U and V axes of texture coordinates, respectively. You can set different wrapping modes for each axis:

```javascript
// Repeat horizontally, clamp vertically
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

This flexibility allows for creative texture mapping solutions, like creating a texture that repeats horizontally for a continuously scrolling background but doesn't repeat vertically.

## Practical Example: Textured Quad

Let's walk through a complete example of rendering a textured quad in WebGL 2:

```javascript
// Vertex shader
const vertexShaderSource = `#version 300 es
in vec3 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
    gl_Position = vec4(aPosition, 1.0);
    vTexCoord = aTexCoord;
}`;

// Fragment shader
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vTexCoord;
uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
    fragColor = texture(uTexture, vTexCoord);
}`;

// Initialize WebGL
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2 not supported');
    // Fallback or error message
}

// Compile shaders
function compileShader(gl, type, source) {
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

const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// Create program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// Create vertex data
const positions = new Float32Array([
    -0.5,
    -0.5,
    0.0, // bottom-left
    0.5,
    -0.5,
    0.0, // bottom-right
    0.5,
    0.5,
    0.0, // top-right
    -0.5,
    0.5,
    0.0, // top-left
]);

const indices = new Uint16Array([
    0,
    1,
    2, // first triangle
    0,
    2,
    3, // second triangle
]);

const texCoords = new Float32Array([
    0.0,
    0.0, // bottom-left
    1.0,
    0.0, // bottom-right
    1.0,
    1.0, // top-right
    0.0,
    1.0, // top-left
]);

// Create and bind VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Create and bind buffers
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
const positionLoc = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
const texCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
gl.enableVertexAttribArray(texCoordLoc);
gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Unbind VAO
gl.bindVertexArray(null);

// Create texture
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
    new Uint8Array([255, 0, 0, 255]) // Red pixel
);

// Load the texture image
const image = new Image();
image.crossOrigin = 'anonymous';
image.src = 'example-texture.jpg';
image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Upload image data to texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Set texture parameters
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    // Render the scene now that the texture is loaded
    render();
};

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

// Rendering function
function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Bind the texture to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell the shader which texture unit to use
    const textureLoc = gl.getUniformLocation(program, 'uTexture');
    gl.uniform1i(textureLoc, 0);

    // Bind the VAO with our vertex data
    gl.bindVertexArray(vao);

    // Draw the quad
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // Unbind VAO
    gl.bindVertexArray(null);
}
```

This example:

1. Creates and compiles vertex and fragment shaders
2. Sets up a quad with positions and texture coordinates
3. Creates and configures a texture
4. Loads an image asynchronously
5. When the image loads, uploads it to the texture and renders the scene

The result is a quad rendered with the loaded texture, demonstrating the complete workflow from texture creation to rendering.

## Common Pitfalls

### Upside-Down Textures

One of the most common issues when working with textures in WebGL is that textures may appear upside-down. This happens because WebGL's texture coordinate system has (0,0) at the bottom-left corner, while most image formats and the HTML canvas have (0,0) at the top-left corner.

There are several ways to address this:

1. **Flip the texture coordinates**:

    ```javascript
    const texCoords = new Float32Array([
        0.0,
        1.0, // bottom-left (flipped)
        1.0,
        1.0, // bottom-right (flipped)
        1.0,
        0.0, // top-right (flipped)
        0.0,
        0.0, // top-left (flipped)
    ]);
    ```

2. **Flip the image before uploading**:

    ```javascript
    // Create a temporary canvas to flip the image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;

    // Draw the image flipped
    tempCtx.translate(0, image.height);
    tempCtx.scale(1, -1);
    tempCtx.drawImage(image, 0, 0);

    // Use the flipped canvas instead of the original image
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
    ```

3. **Set the pixel storage mode** (WebGL 2 only):
    ```javascript
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    ```
    This tells WebGL to flip the Y-coordinate when uploading textures. Just remember to reset it if you don't want this behavior for all textures.

### Texture Size

WebGL works best with textures whose dimensions are powers of 2 (e.g., 128, 256, 512, 1024, etc.). While WebGL 2 does have better support for non-power-of-two (NPOT) textures, there are still some restrictions to be aware of:

#### Power-of-Two Textures (POT)

-   Can use all wrapping modes (REPEAT, MIRRORED_REPEAT, CLAMP_TO_EDGE)
-   Can use mipmapping
-   Generally offer better performance

#### Non-Power-of-Two Textures (NPOT)

-   In WebGL 2, NPOT textures can use all wrapping modes if the filtering is set to NEAREST or LINEAR (without mipmapping)
-   If you want to use mipmapping with an NPOT texture in WebGL 2, the wrapping mode must be set to CLAMP_TO_EDGE

Best practices for texture sizes:

1. Use power-of-two textures whenever possible
2. If you must use NPOT textures:
    - Resize them to power-of-two dimensions if feasible
    - Set appropriate texture parameters (CLAMP_TO_EDGE and no mipmapping)
    - Be aware of potential performance implications on older hardware

### Other Common Issues

1. **Texture Not Showing at All**:

    - Check that the image has successfully loaded
    - Verify that the texture units and uniform locations are correct
    - Make sure texture coordinates are within the appropriate range
    - Check for WebGL errors using `gl.getError()`

2. **Texture Appearing Black or White**:

    - Check for reversed normal vectors if using lighting
    - Verify that the image format is supported and correctly processed
    - Make sure the alpha channel is handled correctly

3. **Texture Seams Between Triangles**:

    - This can be caused by floating-point precision issues in texture coordinate interpolation
    - Use seamless textures if possible
    - Consider using texture atlas techniques for complex models

4. **Performance Issues**:
    - Textures consume significant GPU memory
    - Large or numerous textures can cause performance problems
    - Use appropriate mipmap filtering for distant textures
    - Consider texture compression formats (though support varies by device)

## Conclusion

Texturing is a powerful technique that adds visual richness to 3D graphics without increasing geometric complexity. In this lesson, we've covered:

-   What textures are and why they're important
-   How to load and configure textures in WebGL
-   How texture coordinates map 2D images onto 3D surfaces
-   Various texture filtering and wrapping modes
-   A complete example of rendering a textured object
-   Common pitfalls and their solutions
