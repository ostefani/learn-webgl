# WebGL 2 Fundamentals: Core Concepts

## WebGL 2 Architecture

WebGL 2 is a JavaScript API that establishes a direct communication channel between web applications and the graphics processing unit (GPU). Unlike Canvas 2D which executes on the CPU, WebGL 2 leverages the GPU's parallel processing architecture to render complex graphics with high performance in browser environments.

WebGL 2 functions as an interface layer that translates JavaScript instructions into operations executable by specialized graphics hardware. This translation is necessary due to the fundamentally different architectures of CPUs and GPUs.

WebGL 2 is an implementation of the OpenGL ES 3.0 standard for web browsers and represents a significant upgrade over WebGL 1, adding numerous features that enhance rendering capabilities and performance.

## CPU vs. GPU Architecture

**CPU (Central Processing Unit)**:

-   Features a limited number of high-performance cores (typically 4-32)
-   Optimized for sequential processing and complex branching logic
-   High single-threaded performance
-   General-purpose instruction set

**GPU (Graphics Processing Unit)**:

-   Contains thousands of simpler computational cores
-   Optimized for parallel data processing
-   Executes identical operations across multiple data points simultaneously
-   Specialized for vector/matrix mathematics and floating-point operations

Graphics rendering inherently involves performing identical calculations across numerous vertices and pixels. GPUs execute these operations in parallel, achieving orders of magnitude better performance than sequential CPU processing for graphics workloads.

## WebGL 2 System Architecture

WebGL 2 implements a well-defined execution model:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   JavaScript    │──────▶    WebGL 2 API  │──────▶      GPU        │
│   (Application) │      │  (State Machine)│      │  (Execution)    │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

This architecture creates a distinct separation of concerns:

1. **JavaScript** (CPU): Initializes state, defines geometry, manages resources, and orchestrates rendering
2. **WebGL 2 API**: Functions as a state machine and command buffer interface to the GPU
3. **GPU Programs**: Executes shader code and rasterization in parallel

## WebGL 2 Context

The WebGL 2 context serves as the primary interface to the GPU. When initialized via:

```js
const gl = canvas.getContext('webgl2');
```

This operation creates a WebGL 2 state machine associated with the specified canvas element. All subsequent WebGL 2 operations must be performed through this context object, which:

-   Manages all GPU resources (buffers, textures, shaders, programs)
-   Maintains the current state of the rendering pipeline
-   Validates and dispatches commands to the GPU
-   Provides error checking and debugging capabilities

If WebGL 2 is not supported by the browser, the above call returns `null`, allowing developers to implement fallback strategies:

```js
const gl = canvas.getContext('webgl2');
if (!gl) {
    // WebGL 2 not supported, try WebGL 1 fallback
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        throw new Error('WebGL not supported');
    }
    console.warn('Using WebGL 1 fallback');
}
```

## WebGL 2 as a State Machine

WebGL 2 implements a state machine architecture, a foundational design pattern in graphics APIs that determines how the rendering system operates and responds to commands.

### State Machine Definition

A state machine in graphics programming refers to a system that:

1. Maintains a collection of global state variables that define the current configuration
2. Processes commands that modify these states or trigger actions based on current states
3. Performs operations using the currently active states rather than requiring explicit parameters

In WebGL 2, nearly all operations depend on the current state of the context rather than on parameters passed to function calls. This architecture differs significantly from typical JavaScript function-based programming.

### Key WebGL 2 States

The WebGL 2 state machine tracks numerous states, including:

1. **Buffer Bindings**: Which buffer objects are bound to which binding points

    ```js
    // This binding becomes part of the current state
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Subsequent operations reference the bound buffer implicitly
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    ```

2. **Active Texture Unit**: Which texture unit is currently active

    ```js
    // Sets the active texture unit state
    gl.activeTexture(gl.TEXTURE0);
    // Operations reference the active unit implicitly
    gl.bindTexture(gl.TEXTURE_2D, texture);
    ```

3. **Current Program**: Which shader program is active for rendering

    ```js
    gl.useProgram(program);
    ```

4. **Vertex Attribute Configuration**: How vertex data is interpreted

    ```js
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
    ```

5. **Rendering States**: Depth testing, blending, culling, etc.

    ```js
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    ```

6. **Viewport Configuration**: Where rendering output is directed

    ```js
    gl.viewport(0, 0, canvas.width, canvas.height);
    ```

7. **Vertex Array Objects (VAOs)**: WebGL 2-specific state container for vertex attribute configuration

    ```js
    // Create and bind a VAO to store all vertex attribute state
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Configure vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // Later, restore all attribute state at once
    gl.bindVertexArray(vao);
    ```

### State Management Implications

The state machine architecture has several important implications:

1. **Order Dependency**: The sequence of state-changing commands is critical. Executing the same commands in different orders may produce different results.

2. **Implicit State Usage**: Operations use current state implicitly without requiring explicit parameters, making code more concise but potentially less transparent.

3. **State Leakage**: States set for one draw operation affect subsequent operations unless explicitly changed, creating subtle bugs if not managed carefully.

4. **Efficient Batching**: Minimizing state changes improves performance significantly, as each state change may trigger pipeline reconfiguration.

### State Management Best Practices

Effective WebGL 2 programming requires disciplined state management:

1. **State Grouping**: Group similar draw calls that use the same state configurations to minimize changes.

    ```js
    // Group operations by program
    gl.useProgram(programA);
    // Perform all draws using programA

    gl.useProgram(programB);
    // Perform all draws using programB
    ```

2. **State Tracking**: Maintain state awareness in complex applications to avoid redundant state changes.

    ```js
    // Application-level state tracking
    let currentlyBoundBuffer = null;

    function bindBufferIfNeeded(buffer) {
        if (currentlyBoundBuffer !== buffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            currentlyBoundBuffer = buffer;
        }
    }
    ```

3. **State Reset**: Explicitly reset critical states when concluding a rendering sequence to prevent unintended state inheritance.

    ```js
    function resetState() {
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
        gl.useProgram(null);
        // Reset other critical states
    }
    ```

4. **Encapsulation**: Use objects or functions to encapsulate state-dependent operations, ensuring states are properly set before operations and optionally restored afterward.

    ```js
    class Mesh {
        render() {
            // Set all states required for this mesh
            gl.useProgram(this.program);
            gl.bindVertexArray(this.vao);
            // Set other states...

            // Perform draw operation
            gl.drawArrays(this.drawMode, 0, this.vertexCount);

            // Optionally restore previous states
        }
    }
    ```

5. **Use Vertex Array Objects**: In WebGL 2, use VAOs to encapsulate vertex attribute state, reducing state management complexity:

    ```js
    // Set up once
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Configure all attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // Later, just bind the VAO
    gl.bindVertexArray(vao);
    // Ready to draw
    ```

GPUs are stateful processors. They are designed to receive a set of configurations and then execute operations based on that state.

First, WebGL 2's state-based architecture enables direct mapping of API calls to underlying GPU operations, minimizing translation overhead between high-level commands and low-level instructions.

Second, it allows developers to configure rendering parameters once and maintain them across multiple draw operations, modifying only specific states when needed rather than reconfiguring everything for each frame.

This approach significantly reduces rendering overhead and improves performance, particularly for complex animations and real-time graphics applications where efficiency is critical.

Understanding WebGL 2's state machine nature is essential for writing efficient and error-free graphics code. Many common WebGL 2 bugs stem from incorrect assumptions about state, particularly when code does not account for the persistent nature of state changes.

## Shader Programming Model

A fundamental aspect of WebGL 2 is its programmable pipeline, implemented through shader programs. WebGL 2 requires two distinct programs:

1. **Application code** (JavaScript): Executes on the CPU, configures the pipeline and dispatches draw calls
2. **Shader programs** (GLSL ES 3.0): Executes on the GPU, performs vertex transformations and fragment coloring

Shaders are written in GLSL ES 3.0 (OpenGL ES Shading Language 3.0), a C-like language designed for graphics processing. These shader programs operate directly on the GPU and determine the precise rendering behavior.

### Shader Types and Execution Model

WebGL 2's rendering pipeline requires two complementary shader types:

**Vertex Shader**:

-   Executes once per input vertex
-   Primary function: Transformation of vertex positions from object space to clip space
-   Produces mandatory output: `gl_Position` (homogeneous clip-space position)
-   May compute additional interpolated attributes for fragment processing
-   Execution frequency directly correlates with geometric complexity

**Fragment Shader** (Pixel Shader):

-   Executes once per fragment (potential pixel) generated during rasterization
-   Primary function: Computation of final fragment color
-   Produces output to one or more color attachments
-   Handles texturing, lighting calculations, and visual effects
-   Execution frequency directly correlates with output resolution and fill rate

This two-stage programmable pipeline mirrors the physical hardware architecture of modern GPUs and enables efficient parallel execution.

## GLSL ES 3.0: The Shader Programming Language

GLSL ES 3.0 is a strictly typed, specialized language with features designed for graphics computations:

**Primary Data Types**:

-   `vec2`, `vec3`, `vec4`: Vector types containing 2, 3, or 4 floating-point components
-   `mat2`, `mat3`, `mat4`: Matrix types for linear transformations
-   `sampler2D`, `samplerCube`, `sampler3D`: Texture sampling types
-   Standard scalar types: `float`, `int`, `uint`, `bool`

**Variable Qualifiers**:

-   `in`: Per-vertex input data (vertex shader) or interpolated input data (fragment shader)
-   `out`: Output data from a shader stage
-   `uniform`: Constant values set by the application for the duration of a draw call

**Built-in Variables**:

-   `gl_Position`: Mandatory vertex shader output defining clip-space position
-   `gl_FragCoord`: Fragment window-space coordinates
-   `gl_PointSize`: Controls point primitive size (when using point rendering)
-   `gl_VertexID`: Index of the current vertex (WebGL 2 only)
-   `gl_InstanceID`: Instance ID for instanced rendering (WebGL 2 only)

### Example Shader Pair in WebGL 2

```glsl
// Vertex Shader
#version 300 es

in vec3 a_position;
in vec2 a_texcoord;

uniform mat4 u_matrix;

out vec2 v_texcoord;

void main() {
  // Set the position
  gl_Position = u_matrix * vec4(a_position, 1.0);

  // Pass the texcoord to the fragment shader
  v_texcoord = a_texcoord;
}
```

```glsl
// Fragment Shader
#version 300 es
precision highp float;

in vec2 v_texcoord;

uniform sampler2D u_texture;

// WebGL 2 requires explicit output variable
out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_texcoord);
}
```

## WebGL 2 Coordinate System

WebGL 2 employs a normalized device coordinate (NDC) system that differs significantly from the DOM and Canvas 2D:

-   Origin (0,0) positioned at the center of the viewport
-   X-axis oriented rightward
-   Y-axis oriented upward (inverted from DOM)
-   Z-axis oriented into the screen (negative Z is toward the viewer)
-   Visible coordinates constrained to the range [-1.0, 1.0] on all axes

This coordinate system is a consequence of the homogeneous clip-space representation used in 3D graphics pipelines.

## Data Transfer Mechanism

WebGL 2 requires explicit transfer of data from JavaScript to the GPU through buffer objects:

1. **Buffer Creation**: Allocates memory on the GPU

    ```js
    const buffer = gl.createBuffer();
    ```

2. **Buffer Binding**: Selects an active buffer for subsequent operations

    ```js
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    ```

3. **Data Upload**: Transfers data from JavaScript to GPU memory

    ```js
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    ```

4. **Attribute Configuration**: Defines the interpretation of buffer data

    ```js
    const attribLocation = gl.getAttribLocation(program, attributeName);
    gl.enableVertexAttribArray(attribLocation);
    gl.vertexAttribPointer(attribLocation, components, dataType, normalize, stride, offset);
    ```

5. **Using Vertex Array Objects (VAOs)**: In WebGL 2, attribute configurations can be encapsulated in VAOs

    ```js
    // Create and bind a VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Configure attributes (only need to do this once)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // Later, just bind the VAO to restore attribute state
    gl.bindVertexArray(vao);
    ```

This explicit data transfer pipeline is necessary because:

-   GPU and CPU memory spaces are distinct and physically separated
-   GPU requires data in specific memory layouts for efficient processing
-   Buffer configuration enables the GPU to interpret raw binary data correctly

## Draw Call Execution

The rendering process culminates in a draw call that instructs the GPU to process vertices and generate fragments:

```js
gl.drawArrays(primitiveType, startVertex, vertexCount);
```

This commands the GPU to:

1. Fetch `vertexCount` vertices starting from `startVertex`
2. Process each vertex through the current vertex shader
3. Assemble processed vertices into primitives defined by `primitiveType`
4. Rasterize primitives into fragments
5. Process each fragment through the current fragment shader
6. Apply per-fragment operations (depth testing, blending)
7. Write results to the framebuffer

WebGL 2 also provides more efficient draw calls for indexed geometry and instanced rendering:

```js
// Draw using indices
gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, offset);

// Draw multiple instances of the same geometry
gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, instanceCount);

// Draw multiple instances with indices
gl.drawElementsInstanced(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, offset, instanceCount);
```

## WebGL 2 Enhanced Features

WebGL 2 introduces numerous enhancements over WebGL 1:

1. **3D Textures and Array Textures**:

    ```js
    // Create and upload data to a 3D texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, width, height, depth, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    ```

2. **Uniform Buffer Objects**:

    ```js
    // Create and configure a uniform buffer
    const ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, uniformData, gl.DYNAMIC_DRAW);

    // Link to shader
    gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, ubo);
    ```

3. **Transform Feedback**:

    ```js
    // Capture vertex shader outputs back to buffer
    gl.transformFeedbackVaryings(program, ['position', 'velocity'], gl.SEPARATE_ATTRIBS);

    // Setup and enable transform feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();
    ```

4. **Multiple Render Targets**:

    ```js
    // Set up framebuffer with multiple attachments
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTexture, 0);

    // Tell WebGL which attachments to draw to
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    ```

5. **Integer Textures and Attributes**:

    ```js
    // Upload integer data to texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, width, height, 0, gl.RED_INTEGER, gl.INT, data);

    // Set up integer attribute
    gl.vertexAttribIPointer(location, 1, gl.INT, stride, offset);
    ```

## Homogeneous Coordinates

WebGL 2 requires positions in 4D homogeneous coordinates (`vec4`) even for 2D rendering:

```glsl
gl_Position = vec4(position, 0.0, 1.0);
```

The four components represent:

-   `x`, `y`, `z`: Cartesian coordinates in 3D space
-   `w`: Homogeneous component for perspective division

After vertex processing, the GPU performs perspective division (`x/w`, `y/w`, `z/w`) to obtain normalized device coordinates. For orthographic projection, `w=1.0` results in no perspective effect.

Homogeneous coordinates enable unified representation of:

-   Point positions (`w=1.0`)
-   Vectors/directions (`w=0.0`)
-   Perspective transformations (varying `w`)

## Conclusion

WebGL 2 provides enhanced access to GPU acceleration through a programmable rendering pipeline. It builds upon WebGL 1 with significant feature additions from OpenGL ES 3.0, including vertex array objects, uniform buffer objects, transform feedback, 3D textures, multiple render targets, and more.

Understanding the core concepts of GPU architecture, shader programming, coordinate systems, and data transfer mechanisms establishes the foundation for effective graphics programming. These principles reflect the fundamental architecture of modern graphics hardware and enable the development of high-performance visual applications in web environments.
