# Advanced Buffer Techniques in WebGL 2

WebGL 2 introduced powerful new buffer techniques that unlock advanced rendering capabilities previously unavailable in browser-based graphics. This document explores these techniques, providing conceptual understanding and practical implementation guidance.

## Table of Contents

1. [Geometry Instancing](#geometry-instancing)
2. [Transform Feedback](#transform-feedback)
3. [Compute-like Operations](#compute-like-operations)
4. [GPGPU Techniques](#gpgpu-techniques)
5. [Particle Systems](#particle-systems)

<a id="geometry-instancing"></a>

## 1. Geometry Instancing

### Concept

Instancing allows rendering multiple copies of the same geometry with different transformations or properties in a single draw call, dramatically reducing CPU overhead. Before instancing, developers had to issue a separate draw call for each object, even if they shared the same geometry:

```js
// Without instancing (inefficient)
for (let i = 0; i < 1000; i++) {
    // Update uniforms for each instance
    gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrices[i]);
    gl.uniform3fv(colorLocation, colors[i]);

    // Draw each instance separately
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}
```

The key insights behind instancing:

1. **Performance bottleneck**: Draw calls have significant CPU overhead
2. **Redundancy**: Many objects share the same vertices but differ in position, orientation, color, etc.
3. **Parallelism opportunity**: GPUs can efficiently process many similar operations

### Implementation

WebGL 2 implements instancing through:

1. **Instance attributes**: Per-instance data (like position, color, scale)
2. **Attribute divisors**: Controls how attribute data is used per instance
3. **Instanced draw calls**: Renders all instances in one operation

Here's how to implement instancing:

```js
// 1. Create buffer for instance data
const instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);

// Create data for 1000 instances (e.g., positions as vec3)
const instancePositions = new Float32Array(1000 * 3);
for (let i = 0; i < 1000; i++) {
    const offset = i * 3;
    // Position instances in a grid pattern
    instancePositions[offset] = (i % 32) - 16; // x
    instancePositions[offset + 1] = Math.floor(i / 32) - 16; // y
    instancePositions[offset + 2] = 0; // z
}

// Upload instance data
gl.bufferData(gl.ARRAY_BUFFER, instancePositions, gl.STATIC_DRAW);

// 2. Configure the instance attribute
const instancePosLocation = 1; // Attribute location in shader
gl.enableVertexAttribArray(instancePosLocation);
gl.vertexAttribPointer(instancePosLocation, 3, gl.FLOAT, false, 0, 0);

// 3. Set the attribute divisor
// 0 = per-vertex data (default)
// 1 = per-instance data
gl.vertexAttribDivisor(instancePosLocation, 1);

// 4. Draw all instances in a single call!
gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, 1000);
```

In the vertex shader:

```glsl
#version 300 es

// Per-vertex attributes
in vec3 a_position;
in vec3 a_normal;

// Per-instance attributes
in vec3 a_instancePosition;  // Unique for each instance

// Uniforms
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

// Outputs
out vec3 v_normal;

void main() {
  // Create a model matrix for this instance
  mat4 modelMatrix = mat4(1.0); // Identity matrix

  // Apply instance-specific translation
  modelMatrix[3].xyz = a_instancePosition;

  // Calculate final position
  gl_Position = u_projectionMatrix * u_viewMatrix * modelMatrix * vec4(a_position, 1.0);

  // Pass normal to fragment shader
  v_normal = a_normal;
}
```

### Advanced Usage: Multiple Instance Attributes

Real applications often need more than just position per instance:

```js
// Position buffer (as before)
const instancePositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instancePositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instancePositions, gl.STATIC_DRAW);
gl.vertexAttribPointer(instancePosLocation, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(instancePosLocation, 1);

// Color buffer (one color per instance)
const instanceColorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instanceColors, gl.STATIC_DRAW);
gl.vertexAttribPointer(instanceColorLocation, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(instanceColorLocation, 1);

// Scale buffer (one scale per instance)
const instanceScaleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceScaleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instanceScales, gl.STATIC_DRAW);
gl.vertexAttribPointer(instanceScaleLocation, 1, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(instanceScaleLocation, 1);

// Rotation buffer (one rotation per instance)
const instanceRotationBuffer = gl.createBuffer();
// ... and so on
```

### Efficiency Considerations

Instancing is most efficient when:

1. The **base geometry** is moderately complex (50+ vertices)
2. You have **many instances** (100+)
3. **Updates are infrequent** or can be batched

For frequently changing instance data, consider:

```js
// Update only changed instances
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, offset, updatedInstanceData);
```

<a id="transform-feedback"></a>

## 2. Transform Feedback

### Concept

Transform feedback is a powerful feature that captures the output of vertex shaders back into buffer objects. This enables GPU-driven simulations and data transformations without readbacks to the CPU.

The key principles:

1. **Vertex shader as processor**: Leverages vertex shaders for general computation
2. **Feedback loop**: Outputs from one frame become inputs for the next
3. **Zero CPU intervention**: Computation stays on the GPU

Transform feedback is ideal for:

-   Particle systems
-   Physics simulations
-   Data transformations
-   Mesh deformations

### Implementation

Transform feedback implementation involves several steps:

1. **Specify variables to capture** from the vertex shader
2. **Set up feedback buffers** to receive the output
3. **Perform the draw operation** with transform feedback enabled
4. **Swap buffers** for the next frame

Here's a step-by-step example:

```js
// 1. Create shader program with varyings for feedback
const feedbackVaryings = ['v_position', 'v_velocity'];
gl.transformFeedbackVaryings(program, feedbackVaryings, gl.SEPARATE_ATTRIBS);
gl.linkProgram(program);

// 2. Create transform feedback object
const tf = gl.createTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);

// 3. Create source buffers (current state)
const positionBuffer1 = gl.createBuffer();
const velocityBuffer1 = gl.createBuffer();

// 4. Create destination buffers (next state)
const positionBuffer2 = gl.createBuffer();
const velocityBuffer2 = gl.createBuffer();

// Initialize buffers with initial data
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer1);
gl.bufferData(gl.ARRAY_BUFFER, initialPositions, gl.DYNAMIC_COPY);

gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffer1);
gl.bufferData(gl.ARRAY_BUFFER, initialVelocities, gl.DYNAMIC_COPY);

// Allocate space for destination buffers (same size)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer2);
gl.bufferData(gl.ARRAY_BUFFER, initialPositions.byteLength, gl.DYNAMIC_COPY);

gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffer2);
gl.bufferData(gl.ARRAY_BUFFER, initialVelocities.byteLength, gl.DYNAMIC_COPY);

// Simulation loop
function simulate() {
    // Use program for simulation
    gl.useProgram(simulationProgram);

    // Bind VAO that describes our simulation input
    gl.bindVertexArray(simulationVAO);

    // Bind transform feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);

    // Bind output buffers to capture shader results
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffer2);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffer2);

    // Disable rasterization (optional optimization)
    gl.enable(gl.RASTERIZER_DISCARD);

    // Begin transform feedback
    gl.beginTransformFeedback(gl.POINTS);

    // Draw/process the data (one vertex per particle)
    gl.drawArrays(gl.POINTS, 0, particleCount);

    // End transform feedback
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    // Unbind transform feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // Swap buffers for next frame
    [positionBuffer1, positionBuffer2] = [positionBuffer2, positionBuffer1];
    [velocityBuffer1, velocityBuffer2] = [velocityBuffer2, velocityBuffer1];

    // Update VAO to use the new "current state" buffers
    // (This would need to be reconfigured for the next frame)

    requestAnimationFrame(simulate);
}
```

The vertex shader for this simulation might look like:

```glsl
#version 300 es

// Inputs (current state)
in vec3 a_position;
in vec3 a_velocity;

// Simulation parameters
uniform float u_deltaTime;
uniform vec3 u_gravity;
uniform float u_damping;

// Outputs for transform feedback
out vec3 v_position;
out vec3 v_velocity;

void main() {
  // Update velocity with gravity and damping
  vec3 newVelocity = a_velocity + u_gravity * u_deltaTime;
  newVelocity *= u_damping;

  // Update position with velocity
  vec3 newPosition = a_position + newVelocity * u_deltaTime;

  // Simple boundary: bounce off "floor" at y=0
  if (newPosition.y < 0.0) {
    newPosition.y = 0.0;
    newVelocity.y = -newVelocity.y * 0.8; // Bounce with energy loss
  }

  // Output new state via transform feedback
  v_position = newPosition;
  v_velocity = newVelocity;

  // This gl_Position is not used for rendering since we have
  // enabled RASTERIZER_DISCARD, but we need to set it anyway
  gl_Position = vec4(newPosition, 1.0);
}
```

### Transform Feedback with Rendering

To visualize the results of transform feedback, you typically:

1. Perform simulation with transform feedback
2. Bind the output buffer as an input for rendering
3. Draw with a different shader that visualizes the data

```js
// After simulation step...

// Switch to rendering program
gl.useProgram(renderProgram);

// Bind the position buffer from simulation for rendering
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer1);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);

// Draw particles
gl.drawArrays(gl.POINTS, 0, particleCount);
```

<a id="compute-like-operations"></a>

## 3. Compute-like Operations

### Concept

While WebGL 2 lacks dedicated compute shaders (available in WebGPU), you can still perform compute-like operations using creative combinations of rendering techniques. The fundamental insight is that fragment shaders can be repurposed for general computation.

Key approaches include:

1. **Render-to-texture**: Use fragment shaders to compute values and write to a texture
2. **Multiple render targets**: Output multiple result values per computation
3. **Texture lookups**: Access arbitrary memory locations via texture sampling

### Data Representation

To perform computation, we need to store data in textures:

```js
// Create a texture to hold data
const dataTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, dataTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    gl.RGBA32F, // internal format (high precision)
    width, // data width
    height, // data height
    0, // border
    gl.RGBA, // format
    gl.FLOAT, // type
    initialData // initial data or null
);

// Set sampling parameters (important!)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

### Computation

The computation process involves:

1. Rendering to a framebuffer with attached result texture
2. Using a full-screen quad to trigger fragment shader execution
3. Performing computation in the fragment shader

```js
// Create framebuffer for computation output
const computeFBO = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, computeFBO);

// Create output texture
const outputTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, outputTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

// Perform computation
gl.useProgram(computeProgram);

// Bind input data texture
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, dataTexture);
gl.uniform1i(gl.getUniformLocation(computeProgram, 'u_data'), 0);

// Draw full-screen quad to trigger fragment shader
gl.bindVertexArray(fullscreenQuadVAO);
gl.drawArrays(gl.TRIANGLES, 0, 6);

// Result is now in outputTexture
```

The fragment shader might look like:

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_data;
uniform float u_factor;

in vec2 v_texCoord;

out vec4 outColor;

void main() {
  // Read input data
  vec4 value = texture(u_data, v_texCoord);

  // Perform computation (example: simple scaling)
  vec4 result = value * u_factor;

  // Output result
  outColor = result;
}
```

### Example: Image Processing

Image processing is a natural fit for compute-like operations:

```glsl
#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_kernel[9];

in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));

  vec4 sum = vec4(0.0);

  // Apply 3x3 convolution kernel
  sum += texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0];
  sum += texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1];
  sum += texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2];
  sum += texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3];
  sum += texture(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[4];
  sum += texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5];
  sum += texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6];
  sum += texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7];
  sum += texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8];

  outColor = sum;
}
```

### Ping-Pong Technique

For iterative computations, use ping-pong between two textures:

```js
// Create two textures/framebuffers
const texA = createFloatTexture(gl, width, height);
const texB = createFloatTexture(gl, width, height);
const fboA = createFramebuffer(gl, texA);
const fboB = createFramebuffer(gl, texB);

// Initialize texA with initial data
// ...

// For each iteration
let input = texA;
let output = texB;
let inputFBO = fboA;
let outputFBO = fboB;

for (let i = 0; i < iterations; i++) {
    // Bind output framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO);

    // Use input texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, input);
    gl.uniform1i(inputLocation, 0);

    // Render to compute next state
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Swap for next iteration
    [input, output] = [output, input];
    [inputFBO, outputFBO] = [outputFBO, inputFBO];
}

// Final result is in 'input' texture
```

<a id="gpgpu-techniques"></a>

## 4. GPGPU Techniques

### Concept

General-Purpose GPU (GPGPU) computing is the practice of using graphics hardware for non-graphical calculations. In WebGL 2, this means creatively leveraging the graphics pipeline for computation.

The basic workflow:

1. **Input**: Encode input data in textures
2. **Process**: Use fragment shaders to perform calculations
3. **Output**: Read results back from textures/framebuffers

### Data Packing and Unpacking

Efficiently encoding data in textures is crucial for GPGPU:

```js
// Pack a 1D array of floats into RGBA texture
function packFloatsToRGBA(data) {
    const rgbaData = new Float32Array(data.length * 4);

    for (let i = 0; i < data.length; i++) {
        // Store one float per texel (in R channel only for simplicity)
        const value = data[i];
        rgbaData[i * 4] = value; // R
        rgbaData[i * 4 + 1] = 0.0; // G
        rgbaData[i * 4 + 2] = 0.0; // B
        rgbaData[i * 4 + 3] = 0.0; // A
    }

    return rgbaData;
}

// Upload to WebGL
const dataTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, dataTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32F, // High precision float format
    textureWidth,
    textureHeight,
    0,
    gl.RGBA,
    gl.FLOAT,
    packedData
);
```

For more advanced packing, you can store different data in each RGBA channel.

### Reading Results

Reading results back to JavaScript is the slowdown in GPGPU, so minimize it:

```js
// Bind the framebuffer containing result
gl.bindFramebuffer(gl.FRAMEBUFFER, resultFramebuffer);

// Create buffer for results
const resultBuffer = new Float32Array(width * height * 4);

// Read pixels from framebuffer
gl.readPixels(
    0,
    0, // x, y offset
    width,
    height, // width, height
    gl.RGBA, // format
    gl.FLOAT, // type
    resultBuffer // output array
);

// Extract data from packed format
const results = new Float32Array(width * height);
for (let i = 0; i < width * height; i++) {
    // Assuming we stored data in red channel
    results[i] = resultBuffer[i * 4];
}
```

### Example: Matrix Multiplication

Matrix multiplication demonstrates GPGPU techniques well:

```glsl
#version 300 es
precision highp float;

// Matrices stored as textures
uniform sampler2D u_matrixA;
uniform sampler2D u_matrixB;

// Matrix dimensions
uniform vec2 u_dimensionsA; // (width, height) of A
uniform vec2 u_dimensionsB; // (width, height) of B

in vec2 v_texCoord;
out vec4 outColor;

void main() {
  // Each fragment computes one element of result matrix

  // Get row and column indices
  float row = v_texCoord.y;
  float col = v_texCoord.x;

  // Inner product calculation
  float sum = 0.0;
  for (int i = 0; i < 1024; i++) { // Assume max dimension of 1024
    // Break if we exceed the common dimension
    if (float(i) >= u_dimensionsA.x)
      break;

    // Calculate texture coordinates for both matrices
    vec2 texCoordsA = vec2(float(i) / u_dimensionsA.x, row);
    vec2 texCoordsB = vec2(col, float(i) / u_dimensionsB.y);

    // Get matrix elements from textures
    float elementA = texture(u_matrixA, texCoordsA).r;
    float elementB = texture(u_matrixB, texCoordsB).r;

    // Multiply and accumulate
    sum += elementA * elementB;
  }

  // Output result for this position
  outColor = vec4(sum, 0.0, 0.0, 0.0);
}
```

### Example Applications

GPGPU in WebGL 2 enables:

-   **Fast Fourier Transforms (FFT)**
-   **Image processing pipelines**
-   **Machine learning inference**
-   **Physical simulations**
-   **Pathfinding algorithms**

### Limitations

WebGL 2 GPGPU has constraints:

1. **Texture size limits**: Max texture dimensions cap problem size
2. **Limited atomics**: No atomic operations restrict parallel algorithms
3. **Precision limitations**: Even with high-precision formats
4. **Readback overhead**: Reading results to CPU is expensive

<a id="particle-systems"></a>

## 5. Particle Systems

### Concept

Particle systems simulate and render many similar objects (particles) that follow procedural rules. They're ideal for effects like fire, smoke, water, and magic. WebGL 2's advanced buffer techniques make efficient particle systems possible in the browser.

Key components:

1. **Particle data storage**: Positions, velocities, lifetimes
2. **Simulation**: Physics, behavior, and lifecycle management
3. **Rendering**: Efficient visualization techniques

### Data Structure

Particles need several attributes:

1. **Position**: 3D location (x, y, z)
2. **Velocity**: Direction and speed (vx, vy, vz)
3. **Color**: RGBA values, often with alpha for transparency
4. **Size**: Particle scale, may vary with lifetime
5. **Life**: Current age and total lifetime
6. **Additional parameters**: Rotation, type, etc.

### Implementation with Transform Feedback

Transform feedback enables GPU-based particle simulation:

```js
// Create buffers for position (current and next frame)
const positionBuffer1 = gl.createBuffer();
const positionBuffer2 = gl.createBuffer();

// Create buffers for velocity (current and next frame)
const velocityBuffer1 = gl.createBuffer();
const velocityBuffer2 = gl.createBuffer();

// Create buffers for lifetime/parameters
const paramBuffer1 = gl.createBuffer();
const paramBuffer2 = gl.createBuffer();

// Initialize with starting data
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer1);
gl.bufferData(gl.ARRAY_BUFFER, initialPositions, gl.DYNAMIC_COPY);
// ... initialize other buffers similarly

// Set up transform feedback varyings
gl.transformFeedbackVaryings(simulationProgram, ['v_position', 'v_velocity', 'v_params'], gl.SEPARATE_ATTRIBS);
gl.linkProgram(simulationProgram);
```

### Simulation Shader

The vertex shader performs particle simulation:

```glsl
#version 300 es

// Inputs - current particle state
in vec3 a_position;
in vec3 a_velocity;
in vec4 a_params;  // x: lifetime, y: max life, z: size, w: type

// Simulation parameters
uniform float u_deltaTime;
uniform vec3 u_gravity;
uniform vec3 u_windDirection;
uniform float u_windStrength;
uniform vec3 u_emitterPosition;
uniform float u_randomSeed;

// Outputs - next particle state (for transform feedback)
out vec3 v_position;
out vec3 v_velocity;
out vec4 v_params;

// Pseudo-random number generation
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // Extract params
  float lifetime = a_params.x;
  float maxLife = a_params.y;
  float size = a_params.z;
  float type = a_params.w;

  // Update lifetime
  lifetime += u_deltaTime;

  // Check if particle should be reset
  if (lifetime >= maxLife) {
    // Reset position to emitter
    v_position = u_emitterPosition;

    // Generate new random velocity
    float angle = rand(vec2(lifetime, gl_VertexID)) * 6.28318;
    float speed = rand(vec2(gl_VertexID, lifetime)) * 5.0 + 1.0;
    v_velocity = vec3(cos(angle) * speed, speed * 3.0, sin(angle) * speed);

    // Reset lifetime
    lifetime = 0.0;
  } else {
    // Apply forces
    vec3 acceleration = u_gravity;

    // Apply wind based on particle type
    if (type < 0.5) { // Light particles affected by wind
      acceleration += u_windDirection * u_windStrength;
    }

    // Update velocity
    v_velocity = a_velocity + acceleration * u_deltaTime;

    // Update position
    v_position = a_position + v_velocity * u_deltaTime;

    // Boundary check (optional)
    if (v_position.y < 0.0) {
      v_position.y = 0.0;
      v_velocity.y = -v_velocity.y * 0.3; // Bounce with energy loss
    }
  }

  // Pass through other parameters
  v_params = vec4(lifetime, maxLife, size, type);

  // Required for transform feedback, but not used for rendering
  gl_Position = vec4(v_position, 1.0);
  gl_PointSize = size;
}
```

### Render Shader

A separate shader pair visualizes the particles:

```glsl
#version 300 es

// Vertex shader for particle rendering
in vec3 a_position;
in vec4 a_params; // lifetime, maxLife, size, type

uniform mat4 u_viewProjection;
uniform float u_pointScale;

out float v_lifetime;
out float v_maxLife;
out float v_type;

void main() {
  // Extract params
  v_lifetime = a_params.x;
  v_maxLife = a_params.y;
  float size = a_params.z;
  v_type = a_params.w;

  // Calculate size based on lifetime and distance
  float lifeRatio = v_lifetime / v_maxLife;
  float sizeScale = sin(lifeRatio * 3.14159); // Grow then shrink

  // Position in clip space
  gl_Position = u_viewProjection * vec4(a_position, 1.0);

  // Set point size (adjusted for perspective)
  float pointSize = size * sizeScale * u_pointScale;
  gl_PointSize = pointSize / gl_Position.w; // Adjust for depth
}
```

```glsl
#version 300 es
precision mediump float;

// Fragment shader for particle rendering
in float v_lifetime;
in float v_maxLife;
in float v_type;

out vec4 fragColor;

void main() {
  // Calculate distance from center of point (for circular particles)
  vec2 coord = gl_PointCoord - 0.5;
  float distance = length(coord);

  // Discard fragments outside the circle
  if (distance > 0.5)
    discard;

  // Calculate particle color based on lifetime and type
  float lifeRatio = v_lifetime / v_maxLife;

  vec4 color;
  if (v_type < 0.5) {
    // Fire particle: yellow → orange → red → transparent
    color = mix(
      vec4(1.0, 1.0, 0.0, 1.0),
      mix(
        vec4(1.0, 0.0, 0.0, 0.0),
        vec4(1.0, 0.5, 0.0, 0.7),
        lifeRatio
      ),
      lifeRatio
    );
  } else {
    // Smoke particle: white → gray → transparent
    color = mix(
      vec4(1.0, 1.0, 1.0, 0.2),
      vec4(0.2, 0.2, 0.2, 0.0),
      lifeRatio
    );
  }

  // Fade edges for softer particles
  float alpha = smoothstep(0.5, 0.2, distance);

  fragColor = color * alpha;
}
```

### Rendering Loop

The main loop ties it all together:

```js
function render() {
    // 1. Particle Simulation (Transform Feedback)
    gl.useProgram(simulationProgram);

    // Set simulation uniforms
    gl.uniform1f(deltaTimeLocation, deltaTime);
    gl.uniform3fv(gravityLocation, [0, -9.8, 0]);
    gl.uniform3fv(emitterPosLocation, emitterPosition);
    gl.uniform1f(randomSeedLocation, Math.random());
    // ... other simulation uniforms

    // Set up VAO with current particle state
    gl.bindVertexArray(simulationVAO);

    // Set up transform feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffer2);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffer2);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, paramBuffer2);

    // Disable rasterization for simulation pass
    gl.enable(gl.RASTERIZER_DISCARD);

    // Run simulation
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, particleCount);
    gl.endTransformFeedback();

    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // 2. Particle Rendering
    gl.useProgram(renderProgram);

    // Clear the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set rendering uniforms
    gl.uniformMatrix4fv(viewProjLocation, false, viewProjectionMatrix);
    gl.uniform1f(pointScaleLocation, canvas.height / 1000);

    // Set up VAO with new particle state (from simulation)
    gl.bindVertexArray(renderVAO);

    // Enable blending for transparent particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw particles
    gl.drawArrays(gl.POINTS, 0, particleCount);

    // Swap buffers for next frame
    [positionBuffer1, positionBuffer2] = [positionBuffer2, positionBuffer1];
    [velocityBuffer1, velocityBuffer2] = [velocityBuffer2, velocityBuffer1];
    [paramBuffer1, paramBuffer2] = [paramBuffer2, paramBuffer1];

    // Update VAOs to use the new buffers
    updateSimulationVAO();
    updateRenderVAO();

    requestAnimationFrame(render);
}
```

### Advanced Techniques

For production particle systems:

1. **Instanced quads instead of points**: Better looking billboarded particles
2. **Texture atlasing**: Different particle appearances from the same texture
3. **Depth sorting**: For more accurate transparency
4. **LOD system**: Reduce particle count at distance
5. **Batched updates**: Update parameters only once per frame

These advanced buffer techniques enable rich, efficient visual effects that were once impossible in browser-based applications. As WebGL 2 approaches universal support, these techniques represent the cutting edge of real-time web graphics.
