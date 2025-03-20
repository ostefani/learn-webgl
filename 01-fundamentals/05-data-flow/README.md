# WebGL 2 Data Flow: CPU-GPU Communication Architecture

The WebGL 2 rendering pipeline depends fundamentally on efficient data transfer between the CPU (JavaScript execution environment) and the GPU (graphics processing hardware). This document examines the mechanisms, constraints, and optimization strategies for this data transfer process.

## CPU-GPU Memory Architecture

JavaScript code and shader programs execute in distinct memory domains:

1. **CPU Memory**: Contains JavaScript variables, arrays, and objects
2. **GPU Memory**: Contains buffers, textures, and shader variables

These memory spaces are physically separated with distinct access patterns and performance characteristics. Data transfer between them requires explicit operations through the WebGL 2 API.

## WebGL 2 Data Categories

WebGL 2 applications transfer several principal categories of data to the GPU:

1. **Geometry Data**: Vertex positions, normals, texture coordinates, colors
2. **Shader Programs**: GLSL ES 3.0 code for vertex and fragment processing
3. **Uniform Data**: Constants used by shaders during rendering
4. **Texture Data**: Image information for surface details

Each category follows specific transfer mechanisms and usage patterns.

## Geometry Data Transfer Process

The transfer of geometry data follows a well-defined sequence:

```
JavaScript Arrays → WebGL Buffer Objects → Vertex Array Objects → Shader Inputs → Vertex Shader
```

### 1. Source Data Preparation

Efficient geometry transfer begins with properly structured data in JavaScript:

```js
// Vertex position data for a triangle
const positions = new Float32Array([
    0.0,
    0.5, // Vertex 1: (x,y)
    -0.5,
    -0.5, // Vertex 2: (x,y)
    0.5,
    -0.5, // Vertex 3: (x,y)
]);
```

TypedArrays are essential for efficient data transfer because they:

-   Provide memory layouts compatible with GPU expectations
-   Eliminate conversion overhead during transfer
-   Enable direct memory mapping in some implementations

### 2. Buffer Object Allocation

Buffer objects represent allocated memory blocks in GPU memory:

```js
const positionBuffer = gl.createBuffer();
```

This operation requests a buffer allocation in GPU memory but does not yet specify size or content.

### 3. Buffer Binding

Before operating on a buffer, it must be bound to a target binding point:

```js
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
```

The `gl.ARRAY_BUFFER` binding point designates that the buffer will contain vertex attribute data.

### 4. Data Transfer

The `bufferData` operation transfers data from JavaScript to the GPU:

```js
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
```

This function:

-   Allocates GPU memory according to the size of the provided data
-   Copies data from the TypedArray to GPU memory
-   Provides a usage hint (`gl.STATIC_DRAW`) for optimization

Usage hints inform the GPU about expected access patterns:

-   `gl.STATIC_DRAW`: Data modified once, used many times
-   `gl.DYNAMIC_DRAW`: Data modified repeatedly, used many times
-   `gl.STREAM_DRAW`: Data modified once, used few times

### 5. Vertex Array Object Creation and Configuration

WebGL 2 uses Vertex Array Objects (VAOs) to encapsulate attribute state:

```js
// Create a VAO to store all vertex attribute configurations
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
```

### 6. Attribute Configuration

Attribute configuration establishes how buffer data maps to shader inputs:

```js
// Locate the position attribute in the shader program
const positionAttributeLocation = gl.getAttribLocation(program, 'position');

// Enable the attribute array
gl.enableVertexAttribArray(positionAttributeLocation);

// Specify attribute data format
gl.vertexAttribPointer(
    positionAttributeLocation, // Target attribute
    2, // Components per vertex (2 for x,y)
    gl.FLOAT, // Data type
    false, // Normalization flag
    0, // Stride (0 = auto-calculated)
    0 // Offset from buffer start
);
```

The `vertexAttribPointer` call is critical as it defines:

-   The mapping between buffer data and shader attribute
-   The number of components per attribute instance
-   The data type interpretation
-   The memory layout parameters (stride and offset)

### 7. Shader Input Usage

When a draw call executes, the vertex shader receives values from the configured attributes:

```glsl
#version 300 es

// Shader input (previously 'attribute' in WebGL 1)
in vec2 position;  // Receives data from the position buffer

// Shader output to fragment shader
out vec4 vColor;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vColor = vec4(position * 0.5 + 0.5, 0.0, 1.0); // Example computation
}
```

## Understanding Vertex Array Objects (VAOs) in WebGL 2

### Definition

A Vertex Array Object (VAO) in WebGL 2 is a state object that encapsulates all the vertex attribute state required to specify vertex data for rendering. It stores the configuration of vertex attributes—such as their format, location in buffer objects, and enabled/disabled status—acting as a container that simplifies the process of preparing vertex data for the GPU.

## Conceptual Purpose of VAOs

The primary purpose of VAOs is to streamline vertex attribute management. In WebGL 1, developers had to manually configure vertex attributes (e.g., via vertexAttribPointer) before every draw call, which was inefficient and prone to errors, especially when switching between different vertex data sets. VAOs solve this by allowing you to preconfigure and save all attribute state in a single object. Once configured, binding a VAO with gl.bindVertexArray(vao) restores the entire attribute setup instantly, reducing repetitive setup code and enhancing rendering efficiency.

## How They Encapsulate Attribute State

A VAO encapsulates the following vertex attribute state:
Enabled Attributes: Which attributes are active, as set by gl.enableVertexAttribArray.

Attribute Pointers: The configuration defined by vertexAttribPointer or vertexAttribIPointer, including buffer binding, data type, stride, offset, and normalization settings.

Element Array Buffer Binding: The buffer bound to gl.ELEMENT_ARRAY_BUFFER for indexed rendering, stored as part of the VAO’s state.

When a VAO is bound, this state is applied automatically, instructing the GPU how to fetch vertex data from buffers without additional configuration calls.

## Relationship to the WebGL 2 State Machine

VAOs are integral to WebGL 2’s state machine, which tracks the current rendering context. The active VAO is part of this state: binding a VAO with gl.bindVertexArray(vao) makes it the current VAO, and subsequent attribute-related calls (e.g., enabling attributes or setting pointers) modify that VAO’s state. Multiple VAOs can coexist, each with its own configuration, allowing quick switches between setups. Without a bound VAO (i.e., using the default state), WebGL 2 behaves like WebGL 1 with global attribute state, but this is discouraged as it forgoes VAO benefits and risks inconsistent behavior.

## How They Improve Performance and Simplify State Management

VAOs offer significant advantages:
Fewer API Calls: By storing attribute state, VAOs eliminate the need to reconfigure attributes before each draw call—binding a VAO suffices.

Efficient State Switching: Switching between vertex data sets (e.g., different meshes) requires only a VAO bind, faster than manual reconfiguration.

Reduced Errors: Preconfigured VAOs minimize the chance of misconfiguring attributes, improving code reliability.

These benefits are most evident in complex scenes requiring frequent vertex data changes, where VAOs reduce overhead and simplify the rendering pipeline.

## Best Practices for Using VAOs

To maximize VAO effectiveness in WebGL 2, adhere to these guidelines:
Always Use VAOs: Create and bind a VAO before configuring attributes, even in simple applications, to ensure consistency and leverage their benefits.

One VAO per Configuration: Use a unique VAO for each distinct attribute setup (e.g., per mesh or render pass).

Minimize Bindings: Batch draw calls using the same VAO to reduce bind operations.

Configure Upfront: Set up VAOs during initialization, not in the render loop, to avoid redundant state changes.

Unbind After Configuration: Call gl.bindVertexArray(null) after setup to prevent unintended modifications.

## Advanced Use Cases

VAOs support sophisticated rendering techniques in WebGL 2:
Instanced Rendering: For gl.drawArraysInstanced or gl.drawElementsInstanced, VAOs can store both per-vertex and per-instance attribute configurations (e.g., using gl.vertexAttribDivisor), enabling efficient rendering of multiple object instances.

Multiple Render Targets: In deferred rendering or similar techniques, VAOs facilitate switching attribute setups across render passes targeting different framebuffers.

Dynamic Geometry: When updating vertex data frequently (e.g., via gl.bufferSubData), VAOs maintain attribute mappings, simplifying buffer updates.

Shader Switching: VAOs ensure consistent attribute state when switching shaders that share vertex inputs, avoiding reconfiguration.

By mastering VAOs, developers can optimize WebGL 2 applications for performance and maintainability, leveraging their full potential in diverse rendering scenarios.

## Multiple Attribute Configuration with VAOs

Real-world applications typically use multiple attributes per vertex, organized with VAOs:

```js
// Vertex positions (x,y)
const positions = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);

// Vertex colors (r,g,b)
const colors = new Float32Array([
    1.0,
    0.0,
    0.0, // Red
    0.0,
    1.0,
    0.0, // Green
    0.0,
    0.0,
    1.0, // Blue
]);

// Create and bind a VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Position buffer setup
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const positionAttributeLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

// Color buffer setup
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

const colorAttributeLocation = gl.getAttribLocation(program, 'color');
gl.enableVertexAttribArray(colorAttributeLocation);
gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);

// Unbind the VAO when configuration is complete
gl.bindVertexArray(null);

// Later, to draw using this configuration:
gl.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

The corresponding vertex shader must declare each input:

```glsl
#version 300 es

// Inputs from vertex buffers
in vec2 position;
in vec3 color;

// Output to fragment shader
out vec3 vColor;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vColor = color;  // Pass to fragment shader
}
```

Fragment shader to receive the interpolated values:

```glsl
#version 300 es
precision mediump float;

// Input from vertex shader
in vec3 vColor;

// Output to framebuffer (required in WebGL 2)
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
```

## Uniform Data Transfer

Uniforms provide constant values accessible to all shader invocations:

```js
// Locate the uniform in the shader program
const rotationUniformLocation = gl.getUniformLocation(program, 'uRotation');

// Set the uniform value
gl.uniform2f(rotationUniformLocation, Math.cos(angle), Math.sin(angle));
```

Uniform setting methods correspond to GLSL data types:

| GLSL Type        | WebGL Method                                  | Description                 |
| ---------------- | --------------------------------------------- | --------------------------- |
| `float`          | `gl.uniform1f(location, v)`                   | Single floating-point value |
| `vec2`           | `gl.uniform2f(location, v0, v1)`              | 2-component vector          |
| `vec3`           | `gl.uniform3f(location, v0, v1, v2)`          | 3-component vector          |
| `vec4`           | `gl.uniform4f(location, v0, v1, v2, v3)`      | 4-component vector          |
| `int`, `bool`    | `gl.uniform1i(location, v)`                   | Integer or boolean value    |
| `ivec2`, `bvec2` | `gl.uniform2i(location, v0, v1)`              | 2-component integer vector  |
| `mat2`           | `gl.uniformMatrix2fv(location, false, array)` | 2×2 matrix                  |
| `mat3`           | `gl.uniformMatrix3fv(location, false, array)` | 3×3 matrix                  |
| `mat4`           | `gl.uniformMatrix4fv(location, false, array)` | 4×4 matrix                  |

Uniforms access in shaders:

```glsl
#version 300 es

in vec3 position;

// Uniform declarations
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

// Output to fragment shader
out vec3 vPosition;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
  vPosition = position;
}
```

## Uniform Buffer Objects (UBOs)

WebGL 2 introduces Uniform Buffer Objects for efficient management of groups of uniforms:

```js
// Define uniform block data
const matricesData = new Float32Array([
    // Model matrix (16 floats)
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,

    // View matrix (16 floats)
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -5, 1,

    // Projection matrix (16 floats)
    2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1,
]);

// Create and bind uniform buffer
const matricesUBO = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUBO);
gl.bufferData(gl.UNIFORM_BUFFER, matricesData, gl.DYNAMIC_DRAW);

// Connect to shader uniform block
const blockIndex = gl.getUniformBlockIndex(program, 'Matrices');
gl.uniformBlockBinding(program, blockIndex, 0); // Binding point 0
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matricesUBO);

// Later, to update a specific matrix:
gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUBO);
gl.bufferSubData(gl.UNIFORM_BUFFER, 64, newViewMatrix); // Offset 64 bytes (after model matrix)
```

The corresponding GLSL uniform block:

```glsl
#version 300 es

// Uniform block definition
uniform Matrices {
    mat4 model;
    mat4 view;
    mat4 projection;
};

in vec3 position;
out vec3 vPosition;

void main() {
    gl_Position = projection * view * model * vec4(position, 1.0);
    vPosition = position;
}
```

## Texture Data Transfer

Textures represent two-dimensional or three-dimensional data arrays:

```js
// Create a texture object
const texture = gl.createTexture();

// Bind it to the 2D texture target
gl.bindTexture(gl.TEXTURE_2D, texture);

// Transfer image data to the GPU
gl.texImage2D(
    gl.TEXTURE_2D, // Target
    0, // Mipmap level
    gl.RGBA, // Internal format
    gl.RGBA, // Source format
    gl.UNSIGNED_BYTE, // Source type
    imageElement // Source data
);

// Configure sampling parameters
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// Bind texture to texture unit
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

// Tell shader which texture unit to use
gl.uniform1i(textureUniformLocation, 0);
```

Texture sampling in fragment shaders:

```glsl
#version 300 es
precision mediump float;

uniform sampler2D uTexture;
in vec2 vTexCoord;
out vec4 outColor;

void main() {
  // Use texture() instead of texture2D() in WebGL 2
  outColor = texture(uTexture, vTexCoord);
}
```

## WebGL 2 Enhanced Texture Features

WebGL 2 adds support for additional texture types and formats:

```js
// 3D Texture
const texture3D = gl.createTexture();
gl.bindTexture(gl.TEXTURE_3D, texture3D);
gl.texImage3D(
    gl.TEXTURE_3D,
    0, // level
    gl.RGBA8, // internalFormat
    width,
    height,
    depth, // dimensions
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    data // ArrayBufferView or null
);

// 2D Array Texture
const textureArray = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);
gl.texImage3D(
    gl.TEXTURE_2D_ARRAY,
    0, // level
    gl.RGBA8, // internalFormat
    width,
    height,
    layers, // dimensions
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    data // ArrayBufferView or null
);

// Integer Textures
const intTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, intTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R32I, // Integer internal format
    width,
    height,
    0,
    gl.RED_INTEGER, // Integer format
    gl.INT, // Integer type
    data
);
```

Sampling these textures in shaders:

```glsl
#version 300 es
precision mediump float;
precision highp int;

// Different sampler types
uniform sampler2D uTexture2D;
uniform sampler3D uTexture3D;
uniform sampler2DArray uTextureArray;
uniform isampler2D uIntegerTexture;

in vec2 vTexCoord;
in float vDepth;
in float vLayer;
out vec4 outColor;

void main() {
    // Sample 2D texture
    vec4 color2D = texture(uTexture2D, vTexCoord);

    // Sample 3D texture
    vec4 color3D = texture(uTexture3D, vec3(vTexCoord, vDepth));

    // Sample texture array
    vec4 colorArray = texture(uTextureArray, vec3(vTexCoord, vLayer));

    // Sample integer texture
    ivec4 intValues = texture(uIntegerTexture, vTexCoord);

    // Use the results
    outColor = color2D * color3D;
}
```

## Integrated Data Flow Architecture

The complete data flow architecture demonstrates the interconnections between all data types:

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│    JavaScript       │      │     GPU Memory      │      │   GPU Processing    │
│                     │      │                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Vertex Data   │──┼──────┼─▶│    Buffers    │──┼──────┼─▶│ Vertex Shader │  │
│  └───────────────┘  │      │  └───────┬───────┘  │      │  └───────┬───────┘  │
│                     │      │          │          │      │          │          │
│  ┌───────────────┐  │      │  ┌───────▼───────┐  │      │          │          │
│  │ Attribute     │──┼──────┼─▶│  Vertex Array │  │      │          │          │
│  │ Configuration │  │      │  │    Objects    │  │      │          │          │
│  └───────────────┘  │      │  └───────────────┘  │      │          │          │
│                     │      │                     │      │          │          │
│  ┌───────────────┐  │      │  ┌───────────────┐  │      │          │          │
│  │ Image Data    │──┼──────┼─▶│   Textures    │──┼──────┼───┐      │          │
│  └───────────────┘  │      │  └───────────────┘  │      │   │      │          │
│                     │      │                     │      │   │      │          │
│  ┌───────────────┐  │      │  ┌───────────────┐  │      │   │      │          │
│  │ Uniform Data  │──┼──────┼─▶│   Uniforms    │──┼──────┼───┼──────┘          │
│  └───────────────┘  │      │  └───────────────┘  │      │   │                 │
│                     │      │                     │      │   │                 │
│  ┌───────────────┐  │      │  ┌───────────────┐  │      │   │                 │
│  │ Uniform Block │──┼──────┼─▶│ Uniform Buffer│──┼──────┼───┘                 │
│  │     Data      │  │      │  │    Objects    │  │      │                     │
│  └───────────────┘  │      │  └───────────────┘  │      │                     │
│                     │      │                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │      │   ┌───────────────┐ │
│  │ Shader Code   │──┼──────┼─▶│    Program    │──┼──────┼──▶│Fragment Shader│ │
│  └───────────────┘  │      │  └───────────────┘  │      │   └───────────────┘ │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

## Optimized Data Organization Strategies

### Interleaved Vertex Attributes

Interleaving attributes in a single buffer improves memory locality and reduces binding operations:

```js
// Interleaved data: [x,y,r,g,b, x,y,r,g,b, ...]
const interleavedData = new Float32Array([
    // x,   y,   r,   g,   b
    0.0,
    0.5,
    1.0,
    0.0,
    0.0, // Vertex 1
    -0.5,
    -0.5,
    0.0,
    1.0,
    0.0, // Vertex 2
    0.5,
    -0.5,
    0.0,
    0.0,
    1.0, // Vertex 3
]);

// Create and bind VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Upload to a single buffer
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.STATIC_DRAW);

// Position attribute configuration
const positionLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
    positionLocation,
    2, // 2 components (x,y)
    gl.FLOAT,
    false,
    5 * 4, // Stride: 5 floats * 4 bytes
    0 // Offset: 0 bytes
);

// Color attribute configuration
const colorLocation = gl.getAttribLocation(program, 'color');
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(
    colorLocation,
    3, // 3 components (r,g,b)
    gl.FLOAT,
    false,
    5 * 4, // Stride: 5 floats * 4 bytes
    2 * 4 // Offset: 2 floats * 4 bytes
);

// Unbind VAO when done
gl.bindVertexArray(null);

// When rendering, just bind the VAO
gl.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

### Indexed Rendering

Indexed rendering reduces vertex data duplication by referencing vertices via index:

```js
// Create and bind VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Vertex data (without duplication)
const vertexData = new Float32Array([
    // x,   y,   r,   g,   b
    -0.5,
    0.5,
    1.0,
    0.0,
    0.0, // Vertex 0
    0.5,
    0.5,
    0.0,
    1.0,
    0.0, // Vertex 1
    0.5,
    -0.5,
    0.0,
    0.0,
    1.0, // Vertex 2
    -0.5,
    -0.5,
    1.0,
    1.0,
    0.0, // Vertex 3
]);

// Index data (defines two triangles)
const indices = new Uint16Array([
    0,
    1,
    2, // Triangle 1
    0,
    2,
    3, // Triangle 2
]);

// Upload vertex data
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Configure attributes (as in interleaved example)
const positionLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 5 * 4, 0);

const colorLocation = gl.getAttribLocation(program, 'color');
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 5 * 4, 2 * 4);

// Upload index data
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Complete VAO configuration
gl.bindVertexArray(null);

// Draw using indices
gl.bindVertexArray(vao);
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
```

### Buffer Update Strategies

For dynamic geometry, strategic buffer updates improve performance:

```js
// Initial buffer creation with pre-allocated size
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, maxBufferSize, gl.DYNAMIC_DRAW);

// Partial update (avoid reallocating buffer)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, offset, newData);
```

### Integer Attributes (WebGL 2)

WebGL 2 supports integer attributes with dedicated functions:

```js
// Integer data
const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);

// Create and bind VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Upload integer data
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Configure integer attribute
const indexLocation = gl.getAttribLocation(program, 'vertexIndex');
gl.enableVertexAttribArray(indexLocation);
// Use vertexAttribIPointer for integer data, not vertexAttribPointer
gl.vertexAttribIPointer(indexLocation, 1, gl.UNSIGNED_SHORT, 0, 0);

gl.bindVertexArray(null);
```

The corresponding vertex shader:

```glsl
#version 300 es

// Integer input
in uint vertexIndex;

// Other attributes
in vec2 position;

out vec3 vColor;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);

    // Use integer directly, no normalization needed
    vColor = vec3(float(vertexIndex) / 10.0, 0.0, 0.0);
}
```

### Transform Feedback (WebGL 2)

Transform feedback captures vertex shader outputs back to buffers:

```js
// Create transform feedback object
const tf = gl.createTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);

// Create buffer to capture outputs
const outputBuffer = gl.createBuffer();
gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, outputBuffer);
gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, new Float32Array(1000), gl.DYNAMIC_COPY);

// Set up transform feedback varyings before linking program
gl.transformFeedbackVaryings(program, ['outPosition', 'outVelocity'], gl.SEPARATE_ATTRIBS);
gl.linkProgram(program);

// Before drawing with transform feedback
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);
gl.beginTransformFeedback(gl.POINTS);

// Draw call
gl.drawArrays(gl.POINTS, 0, numVertices);

// End transform feedback
gl.endTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
```

Vertex shader with transform feedback outputs:

```glsl
#version 300 es

in vec3 position;
in vec3 velocity;

// Outputs for transform feedback
out vec3 outPosition;
out vec3 outVelocity;

uniform float deltaTime;

void main() {
    // Calculate new position and velocity
    vec3 newPosition = position + velocity * deltaTime;
    vec3 newVelocity = velocity;

    // Apply gravity
    newVelocity.y -= 9.8 * deltaTime;

    // Output to transform feedback buffers
    outPosition = newPosition;
    outVelocity = newVelocity;

    // Normal rendering
    gl_Position = vec4(newPosition, 1.0);
    gl_PointSize = 5.0;
}
```

## Performance Considerations

Data transfer operations can significantly impact WebGL 2 performance:

1. **Minimize Transfer Frequency**:

    - Avoid creating new buffers for static data
    - Use `bufferSubData` rather than `bufferData` for partial updates
    - Batch multiple small updates into single larger updates

2. **Optimize Memory Layout**:

    - Interleave vertex attributes for better cache coherency
    - Use indexed rendering for shared vertices
    - Align data to avoid unaligned memory access

3. **Reduce Data Size**:

    - Use appropriate data types (`BYTE`, `SHORT` vs. `FLOAT`)
    - Apply normalized attributes where appropriate
    - Consider compressed texture formats

4. **Leverage WebGL 2 Features**:
    - Use Vertex Array Objects (VAOs) to minimize state changes
    - Group related uniforms into Uniform Buffer Objects
    - Use transform feedback to keep data on GPU
    - Take advantage of instanced rendering for repeated geometry

## WebGL 2-specific Performance Enhancements

1. **Vertex Array Objects**:
   VAOs significantly reduce state change overhead. Instead of reconfiguring all attributes between draw calls, just bind different VAOs.

2. **Uniform Buffer Objects**:
   UBOs allow updating blocks of uniforms in a single operation and sharing uniform data between programs.

3. **Sync Objects and Fences**:

    ```js
    // Create a sync object
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    // Later, check if GPU has completed
    const status = gl.clientWaitSync(sync, 0, 0);
    if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
        // GPU has finished
    }
    ```

4. **Instanced Rendering**:

    ```js
    // Configure instance attribute
    gl.vertexAttribDivisor(instanceAttribLoc, 1); // Advance once per instance

    // Draw 100 instances of the geometry
    gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, 100);
    ```

5. **Multiple Render Targets**:

    ```js
    // Set up framebuffer with multiple attachments
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTexture, 0);

    // Specify which attachments to render to
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    ```

## Conclusion

Efficient data transfer between CPU and GPU is fundamental to WebGL 2 performance. Understanding the mechanisms, constraints, and optimization strategies for this data flow enables the development of high-performance WebGL 2 applications.

WebGL 2 improves upon WebGL 1 with significant new features that affect data flow, including Vertex Array Objects, Uniform Buffer Objects, transform feedback, and multiple render targets. By applying these features along with appropriate buffer management techniques and attribute organization strategies, developers can minimize the inherent overhead of cross-processor communication and maximize rendering efficiency.
