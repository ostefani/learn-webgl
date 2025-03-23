# Advanced State & Memory Management in WebGL 2

## Introduction

Efficient state and memory management are crucial aspects of high-performance WebGL applications. While basic WebGL applications may function with naive approaches to resource management, advanced techniques become essential as scene complexity increases and performance requirements become more demanding.

This document explores strategies for optimizing WebGL 2 applications through better state management, memory usage, draw call organization, scene culling, and performance analysis.

## WebGL 2 State Caching Strategies

### Understanding WebGL's State Machine Architecture

As established in the core concepts, WebGL functions as a state machine where commands operate based on the current state rather than explicit parameters. This architecture creates specific challenges and opportunities for optimization.

### Key State Management Challenges

1. **State Leakage**: States set for one operation affect all subsequent operations
2. **Redundant State Changes**: Repeatedly setting the same state wastes CPU time
3. **Order Dependencies**: State changes must occur in specific sequences
4. **Context Switching**: Frequent state changes cause pipeline stalls

### Implementing Effective State Caching

A comprehensive state caching system tracks the current WebGL state to avoid redundant API calls:

```javascript
class WebGLStateCache {
    constructor(gl) {
        this.gl = gl;

        // Current state tracking
        this.currentProgram = null;
        this.enabledAttributes = new Set();
        this.activeTexture = gl.TEXTURE0;
        this.boundTextures = new Map(); // Unit -> texture mapping
        this.boundBuffers = new Map(); // Target -> buffer mapping
        this.boundVAO = null;
        this.blendingEnabled = false;
        this.depthTestEnabled = true;
        this.cullFaceEnabled = false;
        this.viewport = { x: 0, y: 0, width: gl.canvas.width, height: gl.canvas.height };
        // Additional states as needed...
    }

    // Example of a cached function
    useProgram(program) {
        if (program !== this.currentProgram) {
            this.gl.useProgram(program);
            this.currentProgram = program;
            return true; // State changed
        }
        return false; // No change needed
    }

    // Other cached functions for various WebGL state changes...
}
```

### High-Impact State Changes to Cache

Some state changes are more expensive than others. Focus your caching efforts on:

1. **Program Switching**: Changing shader programs is typically expensive
2. **VAO Binding**: Encapsulates multiple state changes
3. **Texture Binding**: Switching textures and samplers
4. **Framebuffer Binding**: Changing render targets
5. **Blend State Toggling**: Especially when toggling between transparent and opaque rendering

### Program-Specific State Contexts

For complex applications, consider organizing state by program context:

```javascript
class ProgramContext {
    constructor(program, attributes, uniforms) {
        this.program = program;
        this.attributes = attributes; // Required attributes
        this.uniforms = uniforms; // Required uniforms
        this.requiredState = {
            // GL state requirements
            blending: false,
            depthTest: true,
            // etc.
        };
    }

    // Apply all state for this program context
    apply(stateCache) {
        // Set program
        stateCache.useProgram(this.program);

        // Apply GL state
        stateCache.enableDepthTest(this.requiredState.depthTest);
        stateCache.enableBlending(this.requiredState.blending);
        // etc.
    }
}
```

### Leveraging WebGL 2's Features for State Management

WebGL 2 provides features that reduce state management overhead:

1. **Vertex Array Objects (VAOs)**: Encapsulate attribute state
2. **Uniform Buffer Objects (UBOs)**: Group related uniforms
3. **Multiple Render Targets (MRTs)**: Reduce passes and state changes
4. **Transform Feedback Objects**: Encapsulate transform feedback state
5. **Sampler Objects**: Separate texture data from sampling state

### VAO Management for Efficient State

Vertex Array Objects are particularly powerful for state management:

```javascript
// One-time setup
function setupMesh(gl, mesh) {
    // Create and bind VAO
    mesh.vao = gl.createVertexArray();
    gl.bindVertexArray(mesh.vao);

    // Set up all vertex attributes
    for (const attribute of mesh.attributes) {
        gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
        gl.enableVertexAttribArray(attribute.location);
        gl.vertexAttribPointer(
            attribute.location,
            attribute.size,
            attribute.type,
            attribute.normalized,
            attribute.stride,
            attribute.offset
        );
    }

    // Bind index buffer if present
    if (mesh.indexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        // Index buffer binding is part of VAO state
    }

    // Unbind VAO after setup
    gl.bindVertexArray(null);
}

// During rendering - only one call to restore all attribute state
function renderMesh(gl, mesh) {
    gl.bindVertexArray(mesh.vao);
    // Draw call here...
}
```

### Avoiding Anti-Patterns

Common state management mistakes to avoid:

1. **Global State Pollution**: Failing to track state across systems
2. **Over-Caching**: Caching rarely changing states may add overhead
3. **Incomplete Reset**: Not restoring important states for other code
4. **Unnecessary State Changes**: Setting states that don't affect the current operation
5. **Redundant Queries**: Repeatedly querying the WebGL state (always track in your cache)

## Memory Optimization Techniques

### Understanding WebGL Memory Hierarchy

WebGL memory management involves multiple memory spaces:

1. **JavaScript Heap Memory**: Client-side data structures
2. **WebGL/Browser Memory**: Intermediate driver memory
3. **GPU Memory**: VRAM for textures, buffers, and framebuffers
4. **GPU Cache Hierarchy**: Various levels of cache affecting performance

### Buffer Management Strategies

Optimizing buffer usage can significantly improve performance:

#### Buffer Creation and Updating

1. **Pre-Allocation**: Allocate buffers to their maximum expected size:

```javascript
// Pre-allocate a buffer with expected maximum size
const maxVertices = 10000;
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, maxVertices * floatSize * componentsPerVertex, gl.DYNAMIC_DRAW);

// Later, update only the portion needed
function updateBuffer(newData, count) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData, 0, count * floatSize * componentsPerVertex);
}
```

2. **Appropriate Usage Hints**:

    - `gl.STATIC_DRAW`: Data updated rarely, used often
    - `gl.DYNAMIC_DRAW`: Data updated frequently, used often
    - `gl.STREAM_DRAW`: Data updated each frame, used once

3. **Buffer Data Consolidation**: Combine multiple small buffers into larger ones:

```javascript
// Instead of many small buffers
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

// Use one consolidated buffer with strided access
const combinedBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, combinedBuffer);
gl.bufferData(gl.ARRAY_BUFFER, combinedData, gl.STATIC_DRAW);

// Position attribute
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, stride, 0);

// Normal attribute at offset
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, stride, positionSize);
```

4. **Orphaning for Dynamic Buffers**: Avoid stalls in dynamic updates:

```javascript
// Orphan buffer before updating
gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.DYNAMIC_DRAW); // Allocate new storage
gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData); // Upload new data
```

### Texture Memory Management

Textures typically consume the most GPU memory in WebGL applications:

#### Optimal Texture Format Selection

Choose formats based on actual requirements:

1. **Color Precision Requirements**:

    - `gl.RGBA8` (32bpp) for standard color
    - `gl.RGB565` (16bpp) for basic color with reduced memory
    - `gl.RGBA4` (16bpp) for when alpha is needed but precision can be lower

2. **Special Format Considerations**:
    - `gl.R8` for single-channel data (e.g., heightmaps)
    - `gl.RG8` for two-channel data (e.g., normal maps in a compressed format)
    - `gl.RGBA16F` or `gl.RGBA32F` only when HDR or high precision is absolutely necessary

#### Mipmapping Considerations

Mipmaps enhance quality but impact memory usage:

1. **Memory Overhead**: A complete mipchain adds approximately 33% more memory
2. **Selective Mipmapping**: Use mipmaps only for textures that change scale in the scene
3. **Mipmap Generation Timing**: Generate mipmaps after texture uploads but before rendering

```javascript
// Generate mipmaps only when needed
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, useMipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
if (useMipmaps) {
    gl.generateMipmap(gl.TEXTURE_2D);
}
```

#### Texture Atlasing

Combine multiple textures into one larger texture to reduce binding operations:

1. **Atlas Packing**: Efficiently arrange smaller textures in one texture
2. **UV Transformation**: Adjust texture coordinates to map to the correct region
3. **Padding Considerations**: Add padding to prevent filtering artifacts at edges

#### Texture Object Lifecycle Management

Proper management of texture resources prevents memory leaks:

1. **Lazy Loading**: Load textures only when needed
2. **Unloading Distant Textures**: Release textures for distant objects
3. **Reference Counting**: Track texture usage across multiple objects

```javascript
class TextureManager {
    constructor(gl) {
        this.gl = gl;
        this.textures = new Map(); // path → texture info
        this.pendingLoads = new Map(); // path → promise
    }

    async getTexture(path) {
        // Return existing texture if loaded
        if (this.textures.has(path)) {
            const textureInfo = this.textures.get(path);
            textureInfo.lastUsed = performance.now();
            textureInfo.refCount++;
            return textureInfo.texture;
        }

        // Return pending texture if loading
        if (this.pendingLoads.has(path)) {
            return this.pendingLoads.get(path);
        }

        // Load new texture
        const loadPromise = this.loadTexture(path);
        this.pendingLoads.set(path, loadPromise);

        try {
            const texture = await loadPromise;
            this.pendingLoads.delete(path);
            return texture;
        } catch (error) {
            this.pendingLoads.delete(path);
            throw error;
        }
    }

    releaseTexture(path) {
        if (this.textures.has(path)) {
            const textureInfo = this.textures.get(path);
            textureInfo.refCount--;

            // Delete if no more references
            if (textureInfo.refCount <= 0) {
                this.gl.deleteTexture(textureInfo.texture);
                this.textures.delete(path);
            }
        }
    }

    // Clean up unused textures (e.g., call periodically)
    pruneUnusedTextures(maxAge = 30000) {
        const now = performance.now();
        for (const [path, info] of this.textures.entries()) {
            if (info.refCount <= 0 && now - info.lastUsed > maxAge) {
                this.gl.deleteTexture(info.texture);
                this.textures.delete(path);
            }
        }
    }

    // Actual texture loading implementation...
    async loadTexture(path) {
        // Load image and create texture...
    }
}
```

### Framebuffer Object Management

Framebuffer Objects (FBOs) consume significant memory, especially at high resolutions:

1. **Framebuffer Pooling**: Reuse framebuffers of the same configuration
2. **Resolution Management**: Render effects at appropriate (often lower) resolutions
3. **Format Selection**: Use appropriate precision for each FBO attachment
4. **Attachment Sharing**: Share depth attachments between framebuffers when possible

```javascript
class FramebufferPool {
    constructor(gl) {
        this.gl = gl;
        this.available = []; // Available FBOs by configuration
        this.inUse = new Set(); // Currently checked out FBOs
    }

    // Get a framebuffer with specific configuration
    getFBO(width, height, colorFormat = gl.RGBA8, useDepth = true) {
        const key = `${width}x${height}-${colorFormat}-${useDepth}`;

        // Check for available FBO
        const availableList = this.available[key] || [];
        if (availableList.length > 0) {
            const fbo = availableList.pop();
            this.inUse.add(fbo);
            return fbo;
        }

        // Create new FBO if none available
        const newFBO = this.createFBO(width, height, colorFormat, useDepth);
        this.inUse.add(newFBO);
        return newFBO;
    }

    // Return framebuffer to pool
    releaseFBO(fbo) {
        if (this.inUse.has(fbo)) {
            this.inUse.delete(fbo);
            const key = fbo.key;
            this.available[key] = this.available[key] || [];
            this.available[key].push(fbo);
        }
    }

    // Create new framebuffer
    createFBO(width, height, colorFormat, useDepth) {
        // Implementation...
    }

    // Clear pool when resizing or context loss
    releaseAll() {
        // Implementation...
    }
}
```

### Shader Program Memory Considerations

While shader programs typically consume less memory than textures and buffers, they still require management:

1. **Shader Compilation Timing**: Compile shaders during loading screens, not during gameplay
2. **Program Linking Strategy**: Balance between too many specialized programs vs. too few complex ones
3. **Uniform Management**: Use uniform buffers to reduce uniform setup overhead

### Handling Context Loss

WebGL contexts can be lost due to system events, requiring recovery:

1. **Resource Tracking**: Keep track of all created resources
2. **Resource Recreation**: Recreate resources when context is restored
3. **Restoration Priorities**: Restore essential resources first
4. **Progressive Loading**: Re-establish quality gradually after restoration

```javascript
class WebGLResourceTracker {
    constructor(gl) {
        this.gl = gl;
        this.resources = {
            buffers: new Set(),
            textures: new Set(),
            framebuffers: new Set(),
            // Other resource types...
        };

        // Listen for context lost/restored events
        this.gl.canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this));
        this.gl.canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this));
    }

    trackBuffer(buffer) {
        this.resources.buffers.add(buffer);
        return buffer;
    }

    trackTexture(texture) {
        this.resources.textures.add(texture);
        return texture;
    }

    // More tracking methods...

    handleContextLost(event) {
        event.preventDefault();
        // Notify application of context loss
    }

    handleContextRestored(event) {
        // Clear all resource tracking
        for (const category in this.resources) {
            this.resources[category].clear();
        }

        // Notify application to recreate resources
    }

    deleteAllResources() {
        // Implementation...
    }
}
```

## Draw Call Batching and Sorting

### Understanding Draw Call Overhead

Each draw call incurs overhead from:

1. **Command Buffer Submission**: CPU cost of submitting commands
2. **State Validation**: Driver checking current state
3. **Pipeline Synchronization**: Ensuring dependencies are met
4. **Driver Thread Switching**: Context switches in the driver

### Effective Batching Strategies

#### Static Geometry Batching

Combine multiple static objects into unified geometry:

1. **Pre-processing**: Merge meshes during load time
2. **Transformation Baking**: Apply static transformations to vertices
3. **Attribute Preservation**: Maintain necessary per-object attributes

```javascript
function batchGeometry(meshes) {
    let totalVertices = 0;
    let totalIndices = 0;

    // Calculate total buffer sizes
    for (const mesh of meshes) {
        totalVertices += mesh.vertices.length;
        totalIndices += mesh.indices.length;
    }

    // Create combined buffers
    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const indices = new Uint32Array(totalIndices);

    // Fill combined buffers
    let vertexOffset = 0;
    let indexOffset = 0;

    for (const mesh of meshes) {
        // Copy vertex attributes
        positions.set(mesh.positions, vertexOffset * 3);
        normals.set(mesh.normals, vertexOffset * 3);
        uvs.set(mesh.uvs, vertexOffset * 2);

        // Adjust and copy indices
        for (let i = 0; i < mesh.indices.length; i++) {
            indices[indexOffset + i] = mesh.indices[i] + vertexOffset;
        }

        vertexOffset += mesh.positions.length / 3;
        indexOffset += mesh.indices.length;
    }

    // Create batched mesh
    return {
        positions,
        normals,
        uvs,
        indices,
    };
}
```

#### Dynamic Batching

Group similar dynamic objects when static batching is impossible:

1. **Instance Attributes**: Use per-instance attributes for transforms
2. **Instanced Rendering**: Draw multiple instances with a single call
3. **Uniform Buffer Sharing**: Share common data with UBOs

```javascript
// Setup for instanced rendering
function setupInstancedRendering(gl, baseGeometry, instanceCount) {
    // Create and bind VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Setup standard vertex attributes
    // ...

    // Create instance matrix buffer
    const instanceMatrixBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceMatrixBuffer);

    // Allocation for instance matrices (4x4 matrix = 16 floats)
    const instanceMatrixData = new Float32Array(instanceCount * 16);
    gl.bufferData(gl.ARRAY_BUFFER, instanceMatrixData, gl.DYNAMIC_DRAW);

    // Setup the instance matrix attributes (4 vec4s for matrix columns)
    const bytesPerMatrix = 16 * 4; // 16 floats per matrix
    for (let i = 0; i < 4; i++) {
        const loc = matrixAttribLocation + i;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(
            loc, // attribute location
            4, // size (vec4)
            gl.FLOAT, // type
            false, // normalized
            bytesPerMatrix, // stride
            i * 16 // offset (16 bytes per vec4)
        );
        gl.vertexAttribDivisor(loc, 1); // one per instance
    }

    // Unbind VAO
    gl.bindVertexArray(null);

    return {
        vao,
        instanceMatrixBuffer,
        instanceMatrixData,
        updateData(matrices) {
            // Update instance data
            gl.bindBuffer(gl.ARRAY_BUFFER, instanceMatrixBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceMatrixData);
        },
        draw() {
            // Draw all instances
            gl.bindVertexArray(vao);
            gl.drawElementsInstanced(gl.TRIANGLES, baseGeometry.indexCount, gl.UNSIGNED_SHORT, 0, instanceCount);
        },
    };
}
```

### State Change Minimization

Organize draws to minimize state changes:

#### Material- and Shader-Based Sorting

Group draw calls by shader program and material properties:

```javascript
// Example draw list sorting
function sortDrawCalls(drawCalls) {
    // Sort by program ID first (major state change)
    drawCalls.sort((a, b) => {
        // Primary sort by program
        if (a.program !== b.program) {
            return a.program - b.program;
        }

        // Secondary sort by material
        if (a.material !== b.material) {
            return a.material - b.material;
        }

        // Tertiary sort by texture
        if (a.texture !== b.texture) {
            return a.texture - b.texture;
        }

        // Finally sort by depth for transparency
        return b.depth - a.depth; // Back-to-front for transparent objects
    });
}
```

#### Front-to-Back Sorting

Sort opaque objects front-to-back to leverage early depth culling:

```javascript
// Calculate object depth
function calculateDepth(modelMatrix, cameraPosition) {
    // Extract object position from matrix
    const objectPosition = [modelMatrix[12], modelMatrix[13], modelMatrix[14]];

    // Calculate squared distance to camera
    return (
        (objectPosition[0] - cameraPosition[0]) ** 2 +
        (objectPosition[1] - cameraPosition[1]) ** 2 +
        (objectPosition[2] - cameraPosition[2]) ** 2
    );
}

// Sort opaque objects front-to-back
opaqueObjects.sort((a, b) => {
    return calculateDepth(a.modelMatrix, cameraPosition) - calculateDepth(b.modelMatrix, cameraPosition);
});

// Sort transparent objects back-to-front
transparentObjects.sort((a, b) => {
    return calculateDepth(b.modelMatrix, cameraPosition) - calculateDepth(a.modelMatrix, cameraPosition);
});
```

### Texture Atlas and Array Techniques

Reduce texture binding operations by consolidating textures:

1. **Texture Atlasing**: Combine multiple textures into a single large texture
2. **Texture Arrays**: Use WebGL 2's texture arrays for similar-sized textures
3. **Array Textures vs. Atlases**: Arrays maintain mipmapping quality better than atlases

```javascript
// Using texture arrays
function createTextureArray(gl, images) {
    if (images.length === 0) return null;

    // All images must have the same dimensions
    const width = images[0].width;
    const height = images[0].height;

    // Create texture array
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

    // Allocate storage for the array
    gl.texImage3D(
        gl.TEXTURE_2D_ARRAY,
        0, // level
        gl.RGBA, // internalFormat
        width,
        height,
        images.length, // depth = number of images
        0, // border
        gl.RGBA, // format
        gl.UNSIGNED_BYTE, // type
        null // data (null for allocation)
    );

    // Upload each image to the array
    for (let i = 0; i < images.length; i++) {
        gl.texSubImage3D(
            gl.TEXTURE_2D_ARRAY,
            0, // level
            0, // xoffset
            0, // yoffset
            i, // zoffset (array index)
            width,
            height,
            1, // depth
            gl.RGBA, // format
            gl.UNSIGNED_BYTE, // type
            images[i] // data
        );
    }

    // Generate mipmaps (if needed)
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}
```

### Uniform Management for Reduced Overhead

Optimize uniform updates to minimize CPU-GPU communication:

1. **Uniform Caching**: Track uniform values to avoid redundant updates
2. **Uniform Buffer Objects**: Use UBOs for related uniforms
3. **Shared Uniform Blocks**: Share blocks between programs

```javascript
// Using uniform buffer objects (UBOs)
function createSharedUniforms(gl) {
    // Create buffer
    const ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

    // Allocate storage (e.g., for view and projection matrices)
    const matrixBlockSize = 2 * 16 * 4; // 2 4x4 matrices, 4 bytes per float
    gl.bufferData(gl.UNIFORM_BUFFER, matrixBlockSize, gl.DYNAMIC_DRAW);

    // Function to update common matrices
    function updateMatrices(viewMatrix, projectionMatrix) {
        gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

        // Update view matrix
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, viewMatrix);

        // Update projection matrix
        gl.bufferSubData(gl.UNIFORM_BUFFER, 16 * 4, projectionMatrix);
    }

    // Link with shader programs
    function bindToProgram(program, blockIndex) {
        // Get uniform block index from program
        const uniformBlockIndex = gl.getUniformBlockIndex(program, 'Matrices');

        // Bind uniform block to binding point
        gl.uniformBlockBinding(program, uniformBlockIndex, blockIndex);
    }

    return {
        buffer: ubo,
        updateMatrices,
        bindToProgram,
        bind(bindingPoint) {
            gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, ubo);
        },
    };
}
```

## Occlusion Culling and LOD Systems

### Fundamental Culling Techniques

Basic visibility determination to avoid processing invisible objects:

#### Frustum Culling Implementation

Eliminate objects completely outside the view frustum:

```javascript
class Frustum {
    constructor() {
        this.planes = [
            // Left, right, bottom, top, near, far planes
            new Float32Array(4),
            new Float32Array(4),
            new Float32Array(4),
            new Float32Array(4),
            new Float32Array(4),
            new Float32Array(4),
        ];
    }

    // Update frustum planes from view-projection matrix
    updateFromMatrix(viewProjectionMatrix) {
        // Extract planes from matrix
        const m = viewProjectionMatrix;

        // Left plane
        this.planes[0][0] = m[3] + m[0];
        this.planes[0][1] = m[7] + m[4];
        this.planes[0][2] = m[11] + m[8];
        this.planes[0][3] = m[15] + m[12];
        this.normalizePlane(0);

        // Right plane
        this.planes[1][0] = m[3] - m[0];
        this.planes[1][1] = m[7] - m[4];
        this.planes[1][2] = m[11] - m[8];
        this.planes[1][3] = m[15] - m[12];
        this.normalizePlane(1);

        // Similar calculation for other planes...
    }

    // Check if sphere is visible
    sphereInFrustum(x, y, z, radius) {
        for (let i = 0; i < 6; i++) {
            const plane = this.planes[i];

            // Distance from sphere center to plane
            const distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];

            // If sphere is behind this plane, it's outside the frustum
            if (distance < -radius) {
                return false;
            }
        }

        // Sphere is visible or intersects the frustum
        return true;
    }

    // Check if AABB is visible
    aabbInFrustum(minX, minY, minZ, maxX, maxY, maxZ) {
        // Implementation...
    }

    // Normalize plane for more efficient distance calculations
    normalizePlane(index) {
        const plane = this.planes[index];
        const len = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);

        plane[0] /= len;
        plane[1] /= len;
        plane[2] /= len;
        plane[3] /= len;
    }
}
```

#### Hierarchical View Frustum Culling

Organize scene into a hierarchy to accelerate culling:

1. **Bounding Volume Hierarchy (BVH)**: Tree structure of bounding volumes
2. **Quadtrees/Octrees**: Space-division structures for scene organization
3. **Early-Out Strategies**: Skip entire branches when parent volumes are culled

```javascript
class OctreeNode {
    constructor(center, halfSize) {
        this.center = center;
        this.halfSize = halfSize;
        this.objects = [];
        this.children = null;

        // Bounds for quick frustum checks
        this.minBounds = [center[0] - halfSize, center[1] - halfSize, center[2] - halfSize];
        this.maxBounds = [center[0] + halfSize, center[1] + halfSize, center[2] + halfSize];
    }

    // Add object to octree
    add(object) {
        // If node has children, add to appropriate child
        if (this.children) {
            const childIndex = this.getChildIndex(object.position);
            this.children[childIndex].add(object);
            return;
        }

        // Add to this node
        this.objects.push(object);

        // Split if needed
        if (this.objects.length > MAX_OBJECTS && this.halfSize > MIN_SIZE) {
            this.split();
        }
    }

    // Split node into 8 children
    split() {
        const halfChildSize = this.halfSize * 0.5;
        this.children = [];

        // Create 8 child octants
        for (let x = 0; x < 2; x++) {
            for (let y = 0; y < 2; y++) {
                for (let z = 0; z < 2; z++) {
                    const childCenter = [
                        this.center[0] + (x === 0 ? -halfChildSize : halfChildSize),
                        this.center[1] + (y === 0 ? -halfChildSize : halfChildSize),
                        this.center[2] + (z === 0 ? -halfChildSize : halfChildSize),
                    ];
                    this.children.push(new OctreeNode(childCenter, halfChildSize));
                }
            }
        }

        // Redistribute objects to children
        for (const object of this.objects) {
            const childIndex = this.getChildIndex(object.position);
            this.children[childIndex].add(object);
        }

        // Clear objects from this node
        this.objects = [];
    }

    // Get visible objects
    getVisibleObjects(frustum, visibleObjects) {
        // Check if node is in frustum
        if (
            !frustum.aabbInFrustum(
                this.minBounds[0],
                this.minBounds[1],
                this.minBounds[2],
                this.maxBounds[0],
                this.maxBounds[1],
                this.maxBounds[2]
            )
        ) {
            return;
        }

        // Add objects from this node
        for (const object of this.objects) {
            if (
                frustum.sphereInFrustum(
                    object.position[0],
                    object.position[1],
                    object.position[2],
                    object.boundingRadius
                )
            ) {
                visibleObjects.push(object);
            }
        }

        // Recursively check children
        if (this.children) {
            for (const child of this.children) {
                child.getVisibleObjects(frustum, visibleObjects);
            }
        }
    }

    // Get child index for a position
    getChildIndex(position) {
        let index = 0;
        if (position[0] > this.center[0]) index |= 1;
        if (position[1] > this.center[1]) index |= 2;
        if (position[2] > this.center[2]) index |= 4;
        return index;
    }
}
```

### Hardware Occlusion Queries

Use GPU-assisted techniques to determine visibility:

1. **Hierarchical Z-Buffer**: Test against depth buffer for visibility
2. **Occlusion Query Objects**: GPU queries for visibility testing
3. **Conservative vs. Precise Testing**: Performance vs. accuracy tradeoffs

WebGL 2 supports occlusion queries via the `EXT_disjoint_timer_query_webgl2` extension:

```javascript
// Check for occlusion query support
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
if (!ext) {
    console.warn('Occlusion queries not supported');
    return;
}

// Create query object
const occlusionQuery = gl.createQuery();

// Draw bounding box with query
gl.colorMask(false, false, false, false); // Disable color writing
gl.depthMask(false); // Disable depth writing

gl.beginQuery(gl.ANY_SAMPLES_PASSED, occlusionQuery);
drawBoundingBox(object); // Draw simplified geometry
gl.endQuery(gl.ANY_SAMPLES_PASSED);

gl.colorMask(true, true, true, true); // Re-enable color writing
gl.depthMask(true); // Re-enable depth writing

// Later, check query result (asynchronous)
function checkQueryResult() {
    // Is result available?
    const available = gl.getQueryParameter(occlusionQuery, gl.QUERY_RESULT_AVAILABLE);

    if (available) {
        // Get query result
        const visible = gl.getQueryParameter(occlusionQuery, gl.QUERY_RESULT);

        // If visible, draw the actual object
        if (visible) {
            drawDetailedObject(object);
        }
    } else {
        // Result not yet available, check again later
        setTimeout(checkQueryResult, 0);
    }
}
```

### Software Occlusion Culling Alternatives

When hardware queries aren't practical, software alternatives can help:

1. **Portal Culling**: For indoor environments with distinct rooms
2. **Potentially Visible Set (PVS)**: Precomputed visibility data
3. **Occlusion Horizons**: 2D representation of visibility

### Level of Detail (LOD) Systems

Adjust detail based on visibility importance:

#### Distance-Based LOD

Simplify objects based on distance from camera:

```javascript
class LODModel {
    constructor() {
        this.levels = []; // Array of detail levels
    }

    addLevel(mesh, distance) {
        this.levels.push({ mesh, distance });

        // Sort levels by distance (highest detail first)
        this.levels.sort((a, b) => a.distance - b.distance);
    }

    // Get appropriate mesh for distance
    getMeshForDistance(distance) {
        // Find the first level suitable for this distance
        for (let i = 0; i < this.levels.length; i++) {
            if (distance < this.levels[i].distance || i === this.levels.length - 1) {
                return this.levels[i].mesh;
            }
        }

        // Fallback to lowest detail
        return this.levels[this.levels.length - 1].mesh;
    }
}

// Usage during rendering
function drawLODObject(object, cameraPosition) {
    // Calculate distance to camera
    const dx = object.position[0] - cameraPosition[0];
    const dy = object.position[1] - cameraPosition[1];
    const dz = object.position[2] - cameraPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Get appropriate mesh
    const mesh = object.model.getMeshForDistance(distance);

    // Draw mesh
    drawMesh(mesh, object.transform);
}
```

#### LOD Transition Techniques

Avoid popping artifacts when switching detail levels:

1. **Geomorphing**: Gradual vertex position interpolation
2. **Alpha Blending**: Cross-fade between detail levels
3. **Hysteresis**: Delay switching to avoid oscillation
4. **Discrete LOD vs Continuous LOD**: Tradeoffs between implementation complexity and visual quality

#### Shader Complexity LOD

Adjust shader complexity based on distance:

```javascript
// Simplified shader program selection based on distance
function selectShaderForObject(object, cameraDistance) {
    if (cameraDistance < NEAR_DISTANCE) {
        return highQualityShader; // Full PBR, normal mapping, etc.
    } else if (cameraDistance < MID_DISTANCE) {
        return mediumQualityShader; // Simplified lighting, basic texturing
    } else {
        return lowQualityShader; // Flat shading, minimal effects
    }
}
```

### View-Dependent Techniques

Adjust rendering based on view-specific factors:

1. **Silhouette Enhancement**: Maintain edge detail while simplifying interior
2. **Screen-Space Error Metrics**: Base detail on projected size
3. **Perceptual Optimization**: Adjust detail based on visual importance and motion

## Performance Profiling and Debugging

### WebGL Performance Metrics

Key metrics for WebGL performance analysis:

1. **Frame Time**: Total time to render a frame
2. **CPU Time**: JavaScript execution time
3. **GPU Time**: Graphics processing time
4. **Memory Usage**: Texture, buffer, and other GPU resources
5. **Draw Call Count**: Number of rendering commands
6. **Triangle Count**: Geometry complexity
7. **State Changes**: Expensive binding operations

### Browser Developer Tools

Leverage built-in browser tools for initial profiling:

1. **Performance Panel**: Timeline of events and JavaScript execution
2. **Memory Panel**: JavaScript memory usage
3. **Canvas Profiler**: Basic WebGL profiling information
4. **Frame Rendering Stats**: Chrome's frame timing information

### WebGL Extensions for Profiling

Use extensions to gather GPU-specific metrics:

#### EXT_disjoint_timer_query

Measure precise GPU operation time:

```javascript
// Get timer query extension
const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
if (!timerExt) {
    console.warn('Timer queries not supported');
    return;
}

// Create query object
const timeQuery = gl.createQuery();

// Begin timing a sequence of operations
gl.beginQuery(timerExt.TIME_ELAPSED_EXT, timeQuery);

// Render operations to measure
drawScene();

// End timing
gl.endQuery(timerExt.TIME_ELAPSED_EXT);

// Later, retrieve the result
function checkTimeQuery() {
    // Check if result is available
    const available = gl.getQueryParameter(timeQuery, gl.QUERY_RESULT_AVAILABLE);
    const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT);

    if (available && !disjoint) {
        // Get the elapsed time in nanoseconds
        const elapsedTimeNs = gl.getQueryParameter(timeQuery, gl.QUERY_RESULT);
        const elapsedTimeMs = elapsedTimeNs / 1000000;

        console.log(`Render time: ${elapsedTimeMs.toFixed(2)} ms`);
    } else if (disjoint) {
        console.warn('Timer query results are disjoint, timing data unreliable');
    } else {
        // Not available yet, check again later
        setTimeout(checkTimeQuery, 10);
    }
}
```

#### Measuring Individual Operations

Isolate performance of specific rendering phases:

```javascript
// Create multiple query objects
const queries = {
    geometry: gl.createQuery(),
    shadowMap: gl.createQuery(),
    lighting: gl.createQuery(),
    postProcessing: gl.createQuery(),
};

function renderFrameWithTimers() {
    // Measure shadow map generation
    gl.beginQuery(timerExt.TIME_ELAPSED_EXT, queries.shadowMap);
    renderShadowMap();
    gl.endQuery(timerExt.TIME_ELAPSED_EXT);

    // Measure geometry pass
    gl.beginQuery(timerExt.TIME_ELAPSED_EXT, queries.geometry);
    renderGeometryPass();
    gl.endQuery(timerExt.TIME_ELAPSED_EXT);

    // Measure lighting pass
    gl.beginQuery(timerExt.TIME_ELAPSED_EXT, queries.lighting);
    renderLightingPass();
    gl.endQuery(timerExt.TIME_ELAPSED_EXT);

    // Measure post-processing
    gl.beginQuery(timerExt.TIME_ELAPSED_EXT, queries.postProcessing);
    renderPostProcessing();
    gl.endQuery(timerExt.TIME_ELAPSED_EXT);
}
```

### Custom Performance HUD

Create a real-time overlay for monitoring performance:

```javascript
class PerformanceHUD {
    constructor() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            drawCalls: 0,
            triangles: 0,
            textureMemory: 0,
            bufferMemory: 0,
        };

        this.frameCount = 0;
        this.lastUpdateTime = performance.now();
        this.lastFrameTime = this.lastUpdateTime;

        this.createHUDElement();
    }

    createHUDElement() {
        // Create DOM elements for HUD
        this.hudElement = document.createElement('div');
        this.hudElement.className = 'performance-hud';
        this.hudElement.style.position = 'absolute';
        this.hudElement.style.top = '10px';
        this.hudElement.style.left = '10px';
        this.hudElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.hudElement.style.color = 'white';
        this.hudElement.style.padding = '10px';
        this.hudElement.style.fontFamily = 'monospace';
        this.hudElement.style.fontSize = '12px';
        this.hudElement.style.borderRadius = '5px';
        this.hudElement.style.zIndex = '1000';

        document.body.appendChild(this.hudElement);
    }

    updateMetrics(frameMetrics) {
        // Update metrics provided by the renderer
        for (const key in frameMetrics) {
            if (this.metrics.hasOwnProperty(key)) {
                this.metrics[key] = frameMetrics[key];
            }
        }

        // Calculate FPS and frame time
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        this.lastFrameTime = now;
        this.metrics.frameTime = elapsed;

        this.frameCount++;

        // Update HUD at a throttled rate (once per second)
        if (now - this.lastUpdateTime > 1000) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastUpdateTime));
            this.frameCount = 0;
            this.lastUpdateTime = now;
            this.updateHUDElement();
        }
    }

    updateHUDElement() {
        this.hudElement.innerHTML = `
            FPS: ${this.metrics.fps}<br>
            Frame Time: ${this.metrics.frameTime.toFixed(2)} ms<br>
            Draw Calls: ${this.metrics.drawCalls}<br>
            Triangles: ${this.metrics.triangles.toLocaleString()}<br>
            Texture Memory: ${(this.metrics.textureMemory / 1024 / 1024).toFixed(2)} MB<br>
            Buffer Memory: ${(this.metrics.bufferMemory / 1024 / 1024).toFixed(2)} MB
        `;
    }

    show() {
        this.hudElement.style.display = 'block';
    }

    hide() {
        this.hudElement.style.display = 'none';
    }
}
```

### Debugging WebGL State

Techniques for diagnosing WebGL state issues:

1. **State Dumping**: Log current WebGL state
2. **Context Wrappers**: Wrap WebGL functions to track calls
3. **Validation**: Check for error states
4. **Visual Debugging**: Render intermediate buffers

#### WebGL State Inspector

Create a utility to inspect WebGL state:

```javascript
class WebGLInspector {
    constructor(gl) {
        this.gl = gl;
        this.wrapGLContext();
    }

    wrapGLContext() {
        // Wrap key functions to track state
        const originalUseProgram = this.gl.useProgram;
        this.gl.useProgram = (program) => {
            this.currentProgram = program;
            return originalUseProgram.call(this.gl, program);
        };

        // Wrap other state-changing functions...
    }

    getState() {
        const gl = this.gl;

        // Get current state
        return {
            viewport: gl.getParameter(gl.VIEWPORT),
            clearColor: gl.getParameter(gl.COLOR_CLEAR_VALUE),
            depthTest: gl.getParameter(gl.DEPTH_TEST),
            blendEnabled: gl.getParameter(gl.BLEND),
            cullFaceEnabled: gl.getParameter(gl.CULL_FACE),
            activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
            currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
            // More state parameters...
        };
    }

    compareStates(stateA, stateB) {
        const differences = {};

        for (const key in stateA) {
            if (!this.areEqual(stateA[key], stateB[key])) {
                differences[key] = {
                    from: stateA[key],
                    to: stateB[key],
                };
            }
        }

        return differences;
    }

    logState() {
        console.table(this.getState());
    }

    // Check for context errors
    checkErrors() {
        const gl = this.gl;
        let error;
        const errors = [];

        while ((error = gl.getError()) !== gl.NO_ERROR) {
            let errorName;

            switch (error) {
                case gl.INVALID_ENUM:
                    errorName = 'INVALID_ENUM';
                    break;
                case gl.INVALID_VALUE:
                    errorName = 'INVALID_VALUE';
                    break;
                case gl.INVALID_OPERATION:
                    errorName = 'INVALID_OPERATION';
                    break;
                case gl.INVALID_FRAMEBUFFER_OPERATION:
                    errorName = 'INVALID_FRAMEBUFFER_OPERATION';
                    break;
                case gl.OUT_OF_MEMORY:
                    errorName = 'OUT_OF_MEMORY';
                    break;
                case gl.CONTEXT_LOST_WEBGL:
                    errorName = 'CONTEXT_LOST_WEBGL';
                    break;
                default:
                    errorName = `Unknown (${error})`;
                    break;
            }

            errors.push(errorName);
        }

        if (errors.length > 0) {
            console.error('WebGL Errors:', errors);
            return errors;
        }

        return null;
    }

    // Helper function to compare values/arrays/objects
    areEqual(a, b) {
        // Implementation...
    }
}
```

### Identifying Common Performance Bottlenecks

#### CPU Bottlenecks

Signs and solutions for CPU limitations:

1. **Symptoms**:

    - High JavaScript execution time
    - Low GPU utilization
    - Performance improves with simpler JavaScript logic

2. **Common Causes**:

    - Excessive state changes
    - JavaScript-heavy calculations
    - Inefficient scene management
    - Many small draw calls

3. **Solutions**:
    - Implement state caching
    - Move calculations to shaders
    - Reduce draw call count through batching
    - Optimize JavaScript algorithms
    - Use Web Workers for heavy computations

#### GPU Bottlenecks

Signs and solutions for GPU limitations:

1. **Symptoms**:

    - High GPU time
    - Performance scales with resolution
    - Performance improves with simpler shaders

2. **Common Causes**:

    - Complex fragment shaders
    - High overdraw
    - High-resolution textures
    - Too many texture lookups
    - Excessive shader instructions

3. **Solutions**:
    - Simplify shaders for distant objects
    - Implement occlusion culling to reduce overdraw
    - Optimize texture sizes and formats
    - Combine texture lookups when possible
    - Implement LOD for shaders

#### Memory Bottlenecks

Signs and solutions for memory limitations:

1. **Symptoms**:

    - Stuttering or hitching
    - Performance degrades over time
    - Crashes on mobile devices

2. **Common Causes**:

    - Texture leaks
    - Buffer leaks
    - Excessive texture size or resolution
    - Unnecessary mipmaps
    - Inefficient texture formats

3. **Solutions**:
    - Implement resource management
    - Track and release unused resources
    - Resize textures appropriately
    - Use compressed texture formats
    - Generate mipmaps only when necessary

#### Bandwidth Bottlenecks

Signs and solutions for data transfer limitations:

1. **Symptoms**:

    - Performance issues with high-resolution textures
    - Slow buffer updates
    - Performance improves with fewer textures

2. **Common Causes**:

    - Frequent texture uploads
    - Large buffer updates
    - Multiple render targets at high resolution
    - Excessive reading from the framebuffer

3. **Solutions**:
    - Batch buffer updates
    - Use appropriate texture formats
    - Limit render target resolution
    - Avoid reading from framebuffers when possible
    - Use compression for textures and buffers

### Debugging Tools and Extensions

Useful tools for debugging WebGL applications:

1. **WebGL Inspector**: Chrome extension for capturing WebGL calls
2. **Spector.js**: Detailed WebGL capture and analysis
3. **Shader Editor Extensions**: Edit shaders in real-time
4. **WebGL Insight**: Visualize WebGL information
5. **RenderDoc**: Cross-platform graphics debugger (requires setup)

## Conclusion

Implementing advanced state and memory management techniques is essential for creating high-performance WebGL applications. By carefully managing WebGL state, organizing memory, batching draw calls, implementing culling techniques, and using performance profiling tools, developers can dramatically improve rendering efficiency and user experience.

Remember that optimization should be guided by measurement rather than assumption. Use the profiling tools described in this document to identify actual bottlenecks before implementing specific optimizations.

The techniques presented here form a foundation for performance optimization, but each application may require specific adjustments based on its unique requirements and constraints. Start with the fundamentals—state caching, efficient memory usage, and basic culling—then implement more advanced techniques as needed based on performance analysis.
