# WebGL 2 Scene Management: Building Complex 3D Worlds

## Introduction to Scene Management

When building 3D applications, managing a single object is straightforward. However, as your projects grow in complexity—incorporating multiple objects, lights, cameras, and interactive elements—you need a systematic approach to organize, update, and render these components efficiently.

### What is a Scene?

A scene in computer graphics is a collection of all elements that make up your 3D environment:

-   **Objects/Meshes**: The 3D models in your world
-   **Lights**: Sources that illuminate your objects
-   **Cameras**: Viewpoints from which the scene is observed
-   **Materials**: Surface properties defining how objects reflect light
-   **Effects**: Post-processing and environmental effects

Think of a scene as a virtual movie set where you arrange all your actors (objects) and equipment (lights, cameras) to create a cohesive environment.

### Why Scene Management Matters

Without proper scene management:

-   **Performance suffers** as your application tries to render everything, even objects that aren't visible
-   **Code becomes unmanageable** with calculations and state scattered throughout
-   **Memory usage increases** as resources aren't properly shared or cleaned up
-   **Development slows** as adding new features becomes progressively harder

A well-designed scene management system provides:

-   **Organizational structure** for logical grouping of objects
-   **Performance optimizations** through techniques like culling and batching
-   **Memory efficiency** through resource sharing and proper cleanup
-   **Intuitive relationships** between objects that interact with or depend on each other

### Core Concepts in Scene Management

1. **Object Representation**: How individual objects are defined and stored
2. **Hierarchical Structures**: Parent-child relationships between objects
3. **Transformation Management**: Handling position, rotation, and scale efficiently
4. **Rendering Strategies**: Determining what to draw and in what order
5. **Update Cycles**: How the scene changes over time

Let's examine each of these aspects in detail to build a comprehensive scene management system for WebGL 2.

## Rendering Multiple Objects

The first step to creating a complex scene is rendering multiple objects. This requires organizing object data, managing state changes, and optimizing draw calls.

### Managing Multiple Meshes

Each object in your scene typically requires:

-   Vertex data (positions, normals, texture coordinates)
-   Indices for efficient triangulation
-   Material properties
-   Transformation information

Here's a basic implementation of an object class:

```javascript
class SceneObject {
    constructor(gl, geometry, material) {
        this.gl = gl;
        this.geometry = geometry;
        this.material = material;
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scale = [1, 1, 1];
        this.modelMatrix = new Float32Array(16);
        this.updateModelMatrix();

        // Create VAO for this object
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Set up buffers
        this.setupBuffers(gl, geometry);

        gl.bindVertexArray(null);
    }

    setupBuffers(gl, geometry) {
        // Position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        // Normal buffer
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        // Texture coordinate buffer (if available)
        if (geometry.texCoords) {
            const texBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.texCoords), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        }

        // Index buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

        this.indexCount = geometry.indices.length;
    }

    updateModelMatrix() {
        // Create model matrix from position, rotation, and scale
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation[0]);
        mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation[1]);
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.rotation[2]);
        mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
    }

    render(gl, programInfo, viewMatrix, projectionMatrix) {
        gl.useProgram(programInfo.program);
        gl.bindVertexArray(this.vao);

        // Update uniforms
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, this.modelMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // Set material properties
        this.material.apply(gl, programInfo);

        // Draw the object
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

        gl.bindVertexArray(null);
    }
}
```

### Efficient Rendering Techniques

As the number of objects increases, rendering them one by one becomes inefficient. Two key techniques help optimize this process:

#### 1. Batching

Batching combines similar objects to reduce draw calls. Objects sharing the same material and shader can be rendered together:

```javascript
class BatchManager {
    constructor() {
        this.batches = new Map(); // Material ID -> Array of objects
    }

    addObject(object) {
        const materialId = object.material.id;
        if (!this.batches.has(materialId)) {
            this.batches.set(materialId, []);
        }
        this.batches.get(materialId).push(object);
    }

    render(gl, programInfo, viewMatrix, projectionMatrix) {
        // Render each batch
        for (const [materialId, objects] of this.batches) {
            // Set up material only once
            const material = objects[0].material;
            gl.useProgram(programInfo.program);
            material.apply(gl, programInfo);

            // Render all objects with this material
            for (const object of objects) {
                gl.bindVertexArray(object.vao);
                gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, object.modelMatrix);
                gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
                gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
                gl.drawElements(gl.TRIANGLES, object.indexCount, gl.UNSIGNED_SHORT, 0);
            }
        }
    }
}
```

#### 2. Instancing

For scenarios where you need many copies of the same object (e.g., trees, stars, particles), instancing is more efficient:

```javascript
class InstancedObject {
    constructor(gl, geometry, material, instanceCount) {
        this.gl = gl;
        this.geometry = geometry;
        this.material = material;
        this.instanceCount = instanceCount;

        // Array to store transformation matrices for each instance
        this.instanceMatrices = new Float32Array(instanceCount * 16);

        // Create VAO
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Set up geometry buffers (same as before)
        this.setupBuffers(gl, geometry);

        // Set up instance buffer for transformation matrices
        this.instanceBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instanceMatrices, gl.DYNAMIC_DRAW);

        // Set up attribute pointers for matrix (4 vec4s = 1 mat4)
        for (let i = 0; i < 4; i++) {
            const loc = 3 + i; // Start after position, normal, texcoord
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 16 * 4, i * 4 * 4);
            gl.vertexAttribDivisor(loc, 1); // This attribute advances once per instance
        }

        gl.bindVertexArray(null);
    }

    updateInstanceData(instances) {
        // Update instance matrices based on positions, rotations, scales
        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            const matrix = mat4.create();

            mat4.identity(matrix);
            mat4.translate(matrix, matrix, instance.position);
            mat4.rotateX(matrix, matrix, instance.rotation[0]);
            mat4.rotateY(matrix, matrix, instance.rotation[1]);
            mat4.rotateZ(matrix, matrix, instance.rotation[2]);
            mat4.scale(matrix, matrix, instance.scale);

            // Copy to the instance data array
            for (let j = 0; j < 16; j++) {
                this.instanceMatrices[i * 16 + j] = matrix[j];
            }
        }

        // Update the buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceMatrices);
    }

    render(gl, programInfo, viewMatrix, projectionMatrix) {
        gl.useProgram(programInfo.program);
        gl.bindVertexArray(this.vao);

        // Set view and projection matrices
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // Set material properties
        this.material.apply(gl, programInfo);

        // Draw all instances at once!
        gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.instanceCount);

        gl.bindVertexArray(null);
    }
}
```

### Example: Rendering Two Cubes

Here's a complete example demonstrating how to render two cubes with different positions, rotations, and materials:

```javascript
// Scene setup
const scene = {
    objects: [],
    camera: {
        position: [0, 0, 5],
        target: [0, 0, 0],
        up: [0, 1, 0],
    },
    lights: [
        {
            position: [5, 5, 5],
            color: [1, 1, 1],
            intensity: 1.0,
        },
    ],
};

// Create cube geometry
const cubeGeometry = createCubeGeometry();

// Create materials
const redMaterial = new Material({
    diffuse: [1, 0, 0],
    specular: [1, 1, 1],
    shininess: 32,
});

const blueMaterial = new Material({
    diffuse: [0, 0, 1],
    specular: [1, 1, 1],
    shininess: 16,
});

// Create objects
const cube1 = new SceneObject(gl, cubeGeometry, redMaterial);
cube1.position = [-1.5, 0, 0];
cube1.rotation = [0, Math.PI / 4, 0];
cube1.updateModelMatrix();

const cube2 = new SceneObject(gl, cubeGeometry, blueMaterial);
cube2.position = [1.5, 0, 0];
cube2.rotation = [0, -Math.PI / 4, 0];
cube2.updateModelMatrix();

// Add to scene
scene.objects.push(cube1, cube2);

// Rendering function
function render() {
    // Clear screen
    gl.clearColor(0.2, 0.3, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create view and projection matrices
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, scene.camera.position, scene.camera.target, scene.camera.up);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

    // Render each object
    for (const object of scene.objects) {
        object.render(gl, programInfo, viewMatrix, projectionMatrix);
    }

    requestAnimationFrame(render);
}

// Start rendering
requestAnimationFrame(render);
```

## Scene Graphs

To manage complex objects and their relationships, we need a hierarchical structure called a scene graph. This tree-like structure lets objects be attached to other objects, with transformations cascading from parent to child.

### Building a Scene Graph Node System

Let's implement a scene graph where each node can have a transformation, children, and optionally, a renderable object:

```javascript
class SceneNode {
    constructor(name) {
        this.name = name;
        this.children = [];
        this.parent = null;
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0]; // In radians
        this.scale = [1, 1, 1];
        this.object = null; // Optional renderable object
        this.updateLocalMatrix();
    }

    addChild(childNode) {
        if (childNode.parent) {
            childNode.parent.removeChild(childNode);
        }
        childNode.parent = this;
        this.children.push(childNode);
    }

    removeChild(childNode) {
        const index = this.children.indexOf(childNode);
        if (index !== -1) {
            childNode.parent = null;
            this.children.splice(index, 1);
        }
    }

    updateLocalMatrix() {
        mat4.identity(this.localMatrix);
        mat4.translate(this.localMatrix, this.localMatrix, this.position);
        mat4.rotateX(this.localMatrix, this.localMatrix, this.rotation[0]);
        mat4.rotateY(this.localMatrix, this.localMatrix, this.rotation[1]);
        mat4.rotateZ(this.localMatrix, this.localMatrix, this.rotation[2]);
        mat4.scale(this.localMatrix, this.localMatrix, this.scale);
    }

    updateWorldMatrix(parentWorldMatrix = null) {
        if (parentWorldMatrix) {
            // Multiply local by parent
            mat4.multiply(this.worldMatrix, parentWorldMatrix, this.localMatrix);
        } else {
            // Root node - world matrix is the same as local
            mat4.copy(this.worldMatrix, this.localMatrix);
        }

        // Update all children with this node's world matrix
        for (const child of this.children) {
            child.updateWorldMatrix(this.worldMatrix);
        }
    }

    setPosition(x, y, z) {
        this.position = [x, y, z];
        this.updateLocalMatrix();
    }

    setRotation(x, y, z) {
        this.rotation = [x, y, z];
        this.updateLocalMatrix();
    }

    setScale(x, y, z) {
        this.scale = [x, y, z];
        this.updateLocalMatrix();
    }

    traverse(callback) {
        callback(this);
        for (const child of this.children) {
            child.traverse(callback);
        }
    }
}
```

### Scene Graph Example: Creating a Robot

Scene graphs are particularly useful for objects with movable parts. Let's build a simple robot where moving the body also moves the head and arms, but the arms can move independently of the head:

```javascript
// Create the scene graph
const robotRoot = new SceneNode('robot');

// Create body node
const bodyNode = new SceneNode('body');
bodyNode.object = new SceneObject(gl, createBoxGeometry(1, 1.5, 0.5), robotBodyMaterial);
robotRoot.addChild(bodyNode);

// Create head, positioned on top of the body
const headNode = new SceneNode('head');
headNode.object = new SceneObject(gl, createSphereGeometry(0.4), robotHeadMaterial);
headNode.setPosition(0, 1.1, 0); // Position relative to parent (body)
bodyNode.addChild(headNode);

// Create left arm
const leftArmNode = new SceneNode('leftArm');
leftArmNode.object = new SceneObject(gl, createBoxGeometry(0.25, 0.8, 0.25), robotArmMaterial);
leftArmNode.setPosition(-0.65, 0, 0); // Position relative to parent (body)
bodyNode.addChild(leftArmNode);

// Create right arm
const rightArmNode = new SceneNode('rightArm');
rightArmNode.object = new SceneObject(gl, createBoxGeometry(0.25, 0.8, 0.25), robotArmMaterial);
rightArmNode.setPosition(0.65, 0, 0); // Position relative to parent (body)
bodyNode.addChild(rightArmNode);

// Function to render the scene graph
function renderSceneGraph(rootNode, programInfo, viewMatrix, projectionMatrix) {
    // Update world matrices starting from the root
    rootNode.updateWorldMatrix();

    // Render all objects in the graph
    rootNode.traverse((node) => {
        if (node.object) {
            // Use the node's world matrix for rendering
            gl.useProgram(programInfo.program);
            gl.bindVertexArray(node.object.vao);

            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, node.worldMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

            node.object.material.apply(gl, programInfo);

            gl.drawElements(gl.TRIANGLES, node.object.indexCount, gl.UNSIGNED_SHORT, 0);
        }
    });
}
```

### Animating the Scene Graph

To animate the robot, we can update various nodes in the scene graph:

```javascript
function animate(time) {
    // Move entire robot by updating the root node
    robotRoot.setPosition(Math.sin(time / 1000) * 3, 0, 0);

    // Make the robot face its direction of motion
    const lookDirection = Math.cos(time / 1000) > 0 ? -Math.PI / 2 : Math.PI / 2;
    robotRoot.setRotation(0, lookDirection, 0);

    // Swing the arms as it moves
    const armSwing = Math.sin(time / 500) * 0.5;
    leftArmNode.setRotation(armSwing, 0, 0);
    rightArmNode.setRotation(-armSwing, 0, 0);

    // Nod the head
    headNode.setRotation(Math.sin(time / 800) * 0.2, 0, 0);

    // Update matrices and render
    renderSceneGraph(robotRoot, programInfo, viewMatrix, projectionMatrix);

    requestAnimationFrame(animate);
}

// Start animation
requestAnimationFrame(animate);
```

This scene graph structure makes complex animations much easier, as changes propagate naturally through the hierarchy.

## Culling and Visibility Determination

In large scenes, not everything is visible to the camera at once. Culling techniques help identify and skip rendering for objects that aren't visible, dramatically improving performance.

### Bounding Volumes

First, we need to define bounding volumes for our objects to simplify visibility checks:

```javascript
// Axis-Aligned Bounding Box (AABB)
class AABB {
    constructor(min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]) {
        this.min = min;
        this.max = max;
    }

    // Expand to include a point
    expandByPoint(point) {
        this.min[0] = Math.min(this.min[0], point[0]);
        this.min[1] = Math.min(this.min[1], point[1]);
        this.min[2] = Math.min(this.min[2], point[2]);

        this.max[0] = Math.max(this.max[0], point[0]);
        this.max[1] = Math.max(this.max[1], point[1]);
        this.max[2] = Math.max(this.max[2], point[2]);
    }

    // Expand to include another AABB
    expandByAABB(aabb) {
        this.expandByPoint(aabb.min);
        this.expandByPoint(aabb.max);
    }

    // Get center point
    getCenter() {
        return [(this.min[0] + this.max[0]) / 2, (this.min[1] + this.max[1]) / 2, (this.min[2] + this.max[2]) / 2];
    }

    // Get dimensions
    getSize() {
        return [this.max[0] - this.min[0], this.max[1] - this.min[1], this.max[2] - this.min[2]];
    }

    // Transform AABB by matrix (creates a new AABB that encompasses the transformed box)
    transform(matrix) {
        // Get the 8 corners of the box
        const corners = [
            [this.min[0], this.min[1], this.min[2]],
            [this.min[0], this.min[1], this.max[2]],
            [this.min[0], this.max[1], this.min[2]],
            [this.min[0], this.max[1], this.max[2]],
            [this.max[0], this.min[1], this.min[2]],
            [this.max[0], this.min[1], this.max[2]],
            [this.max[0], this.max[1], this.min[2]],
            [this.max[0], this.max[1], this.max[2]],
        ];

        // Transform each corner
        const transformedAABB = new AABB();
        corners.forEach((corner) => {
            const transformedCorner = vec3.create();
            vec3.transformMat4(transformedCorner, corner, matrix);
            transformedAABB.expandByPoint(transformedCorner);
        });

        return transformedAABB;
    }
}

// Bounding Sphere
class BoundingSphere {
    constructor(center = [0, 0, 0], radius = 0) {
        this.center = center;
        this.radius = radius;
    }

    // Create from AABB
    static fromAABB(aabb) {
        const center = aabb.getCenter();
        const size = aabb.getSize();
        const radius = Math.sqrt(size[0] * size[0] + size[1] * size[1] + size[2] * size[2]) / 2;
        return new BoundingSphere(center, radius);
    }

    // Transform sphere by matrix
    transform(matrix) {
        // Transform center
        const transformedCenter = vec3.create();
        vec3.transformMat4(transformedCenter, this.center, matrix);

        // Get scale factor (approximate for non-uniform scaling)
        const scaleX = vec3.length([matrix[0], matrix[1], matrix[2]]);
        const scaleY = vec3.length([matrix[4], matrix[5], matrix[6]]);
        const scaleZ = vec3.length([matrix[8], matrix[9], matrix[10]]);
        const maxScale = Math.max(scaleX, scaleY, scaleZ);

        return new BoundingSphere(transformedCenter, this.radius * maxScale);
    }
}
```

Next, let's extend our `SceneObject` class to include bounding volumes:

```javascript
class SceneObject {
    constructor(gl, geometry, material) {
        // ... existing constructor code ...

        // Create bounding volumes
        this.aabb = this.calculateAABB(geometry);
        this.boundingSphere = BoundingSphere.fromAABB(this.aabb);

        // Transformed bounding volumes (updated on render)
        this.worldAABB = this.aabb;
        this.worldBoundingSphere = this.boundingSphere;
    }

    calculateAABB(geometry) {
        const aabb = new AABB();

        // Loop through all vertex positions
        for (let i = 0; i < geometry.positions.length; i += 3) {
            const point = [geometry.positions[i], geometry.positions[i + 1], geometry.positions[i + 2]];
            aabb.expandByPoint(point);
        }

        return aabb;
    }

    updateWorldBounds() {
        this.worldAABB = this.aabb.transform(this.modelMatrix);
        this.worldBoundingSphere = this.boundingSphere.transform(this.modelMatrix);
    }

    render(gl, programInfo, viewMatrix, projectionMatrix) {
        // Update model matrix and world bounds
        this.updateModelMatrix();
        this.updateWorldBounds();

        // ... existing render code ...
    }
}
```

### Frustum Culling

Now, let's implement frustum culling to skip rendering objects that are outside the camera's view:

```javascript
class Frustum {
    constructor() {
        // Define six planes (left, right, bottom, top, near, far)
        this.planes = new Array(6).fill().map(() => ({
            normal: [0, 0, 0],
            distance: 0,
        }));
    }

    // Extract frustum planes from combined view-projection matrix
    fromViewProjectionMatrix(viewProjectionMatrix) {
        const m = viewProjectionMatrix;

        // Left plane
        this.planes[0].normal[0] = m[3] + m[0];
        this.planes[0].normal[1] = m[7] + m[4];
        this.planes[0].normal[2] = m[11] + m[8];
        this.planes[0].distance = m[15] + m[12];

        // Right plane
        this.planes[1].normal[0] = m[3] - m[0];
        this.planes[1].normal[1] = m[7] - m[4];
        this.planes[1].normal[2] = m[11] - m[8];
        this.planes[1].distance = m[15] - m[12];

        // Bottom plane
        this.planes[2].normal[0] = m[3] + m[1];
        this.planes[2].normal[1] = m[7] + m[5];
        this.planes[2].normal[2] = m[11] + m[9];
        this.planes[2].distance = m[15] + m[13];

        // Top plane
        this.planes[3].normal[0] = m[3] - m[1];
        this.planes[3].normal[1] = m[7] - m[5];
        this.planes[3].normal[2] = m[11] - m[9];
        this.planes[3].distance = m[15] - m[13];

        // Near plane
        this.planes[4].normal[0] = m[3] + m[2];
        this.planes[4].normal[1] = m[7] + m[6];
        this.planes[4].normal[2] = m[11] + m[10];
        this.planes[4].distance = m[15] + m[14];

        // Far plane
        this.planes[5].normal[0] = m[3] - m[2];
        this.planes[5].normal[1] = m[7] - m[6];
        this.planes[5].normal[2] = m[11] - m[10];
        this.planes[5].distance = m[15] - m[14];

        // Normalize all planes
        for (let i = 0; i < 6; i++) {
            const len = Math.sqrt(
                this.planes[i].normal[0] * this.planes[i].normal[0] +
                    this.planes[i].normal[1] * this.planes[i].normal[1] +
                    this.planes[i].normal[2] * this.planes[i].normal[2]
            );

            this.planes[i].normal[0] /= len;
            this.planes[i].normal[1] /= len;
            this.planes[i].normal[2] /= len;
            this.planes[i].distance /= len;
        }
    }

    // Test if a bounding sphere is within or intersects the frustum
    intersectsSphere(sphere) {
        for (let i = 0; i < 6; i++) {
            const plane = this.planes[i];
            const distance =
                sphere.center[0] * plane.normal[0] +
                sphere.center[1] * plane.normal[1] +
                sphere.center[2] * plane.normal[2] +
                plane.distance;

            if (distance < -sphere.radius) {
                return false; // Outside
            }
        }

        return true; // Inside or intersecting
    }

    // Test if an AABB is within or intersects the frustum
    intersectsAABB(aabb) {
        for (let i = 0; i < 6; i++) {
            const plane = this.planes[i];

            // Find the point of the AABB furthest away from the plane
            const p = [0, 0, 0];

            if (plane.normal[0] >= 0) {
                p[0] = aabb.max[0];
            } else {
                p[0] = aabb.min[0];
            }

            if (plane.normal[1] >= 0) {
                p[1] = aabb.max[1];
            } else {
                p[1] = aabb.min[1];
            }

            if (plane.normal[2] >= 0) {
                p[2] = aabb.max[2];
            } else {
                p[2] = aabb.min[2];
            }

            // Check if the point is outside
            const distance = p[0] * plane.normal[0] + p[1] * plane.normal[1] + p[2] * plane.normal[2] + plane.distance;

            if (distance < 0) {
                return false; // Outside
            }
        }

        return true; // Inside or intersecting
    }
}
```

Now let's use the frustum in our rendering loop:

```javascript
function render() {
    // Clear screen
    gl.clearColor(0.2, 0.3, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create view and projection matrices
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

    // Create view-projection matrix for frustum
    const viewProjectionMatrix = mat4.create();
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    // Create and update frustum
    const frustum = new Frustum();
    frustum.fromViewProjectionMatrix(viewProjectionMatrix);

    // Counter for statistics
    let renderedObjects = 0;
    let culledObjects = 0;

    // Render each object (with frustum culling)
    for (const object of scene.objects) {
        // Update object's world bounds
        object.updateModelMatrix();
        object.updateWorldBounds();

        // Check if object is visible
        if (frustum.intersectsSphere(object.worldBoundingSphere)) {
            object.render(gl, programInfo, viewMatrix, projectionMatrix);
            renderedObjects++;
        } else {
            culledObjects++;
        }
    }

    // Debug info
    console.log(`Rendered: ${renderedObjects}, Culled: ${culledObjects}`);

    requestAnimationFrame(render);
}
```

This culling system dramatically improves performance in scenes with many objects, especially when only a fraction are visible at any time.

## Basic Collision Detection

Collision detection allows objects to interact with each other, which is essential for games and interactive applications. We'll implement simple collision detection using bounding volumes.

### AABB-AABB Collision

The simplest form of collision detection is between two axis-aligned bounding boxes:

```javascript
function aabbVsAabb(a, b) {
    // Check if boxes overlap in all three dimensions
    return (
        a.min[0] <= b.max[0] &&
        a.max[0] >= b.min[0] &&
        a.min[1] <= b.max[1] &&
        a.max[1] >= b.min[1] &&
        a.min[2] <= b.max[2] &&
        a.max[2] >= b.min[2]
    );
}
```

### Sphere-Sphere Collision

Collision between spheres is also straightforward:

```javascript
function sphereVsSphere(a, b) {
    // Calculate distance between centers
    const dx = b.center[0] - a.center[0];
    const dy = b.center[1] - a.center[1];
    const dz = b.center[2] - a.center[2];
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    // Check if distance is less than sum of radii
    const radiusSum = a.radius + b.radius;
    return distanceSquared <= radiusSum * radiusSum;
}
```

### Sphere-AABB Collision

Testing between spheres and AABBs is also useful:

```javascript
function sphereVsAabb(sphere, aabb) {
    // Find closest point on AABB to sphere center
    const closestPoint = [
        Math.max(aabb.min[0], Math.min(sphere.center[0], aabb.max[0])),
        Math.max(aabb.min[1], Math.min(sphere.center[1], aabb.max[1])),
        Math.max(aabb.min[2], Math.min(sphere.center[2], aabb.max[2])),
    ];

    // Calculate squared distance
    const dx = closestPoint[0] - sphere.center[0];
    const dy = closestPoint[1] - sphere.center[1];
    const dz = closestPoint[2] - sphere.center[2];
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    // Check if distance is less than radius
    return distanceSquared <= sphere.radius * sphere.radius;
}
```

### Integrating Collision Detection

Let's create a simple collision manager to detect and respond to collisions:

```javascript
class CollisionManager {
    constructor() {
        this.colliders = [];
    }

    addCollider(object, type = 'aabb', callback = null) {
        this.colliders.push({
            object,
            type,
            callback, // Function to call when collision occurs
        });
    }

    checkCollisions() {
        const collisions = [];

        // Check all pairs of colliders
        for (let i = 0; i < this.colliders.length; i++) {
            for (let j = i + 1; j < this.colliders.length; j++) {
                const a = this.colliders[i];
                const b = this.colliders[j];

                let collision = false;

                // Check collision based on collider types
                if (a.type === 'sphere' && b.type === 'sphere') {
                    collision = sphereVsSphere(a.object.worldBoundingSphere, b.object.worldBoundingSphere);
                } else if (a.type === 'aabb' && b.type === 'aabb') {
                    collision = aabbVsAabb(a.object.worldAABB, b.object.worldAABB);
                } else if (a.type === 'sphere' && b.type === 'aabb') {
                    collision = sphereVsAabb(a.object.worldBoundingSphere, b.object.worldAABB);
                } else if (a.type === 'aabb' && b.type === 'sphere') {
                    collision = sphereVsAabb(b.object.worldBoundingSphere, a.object.worldAABB);
                }

                if (collision) {
                    collisions.push([a, b]);

                    // Call collision callbacks if provided
                    if (a.callback) a.callback(b.object);
                    if (b.callback) b.callback(a.object);
                }
            }
        }

        return collisions;
    }
}
```

### Example: Simple Collision Response

Here's how to use the collision system to make objects bounce off each other:

```javascript
// Create objects
const sphere1 = new SceneObject(gl, createSphereGeometry(1), redMaterial);
sphere1.position = [-2, 0, 0];
sphere1.velocity = [0.05, 0, 0]; // Moving right

const sphere2 = new SceneObject(gl, createSphereGeometry(1), blueMaterial);
sphere2.position = [2, 0, 0];
sphere2.velocity = [-0.05, 0, 0]; // Moving left

// Set up collision detection
const collisionManager = new CollisionManager();

collisionManager.addCollider(sphere1, 'sphere', (other) => {
    // Reverse velocity on collision
    sphere1.velocity[0] *= -1;

    // Add a bit of randomness to prevent sticking
    sphere1.velocity[1] = (Math.random() - 0.5) * 0.02;
});

collisionManager.addCollider(sphere2, 'sphere', (other) => {
    // Reverse velocity on collision
    sphere2.velocity[0] *= -1;

    // Add a bit of randomness to prevent sticking
    sphere2.velocity[1] = (Math.random() - 0.5) * 0.02;
});

// Update and render
function update(deltaTime) {
    // Update positions
    sphere1.position[0] += sphere1.velocity[0] * deltaTime;
    sphere1.position[1] += sphere1.velocity[1] * deltaTime;
    sphere1.updateModelMatrix();
    sphere1.updateWorldBounds();

    sphere2.position[0] += sphere2.velocity[0] * deltaTime;
    sphere2.position[1] += sphere2.velocity[1] * deltaTime;
    sphere2.updateModelMatrix();
    sphere2.updateWorldBounds();

    // Check and respond to collisions
    collisionManager.checkCollisions();

    // Bounce off boundaries
    const boundary = 10;

    if (Math.abs(sphere1.position[0]) > boundary) {
        sphere1.velocity[0] *= -1;
    }

    if (Math.abs(sphere2.position[0]) > boundary) {
        sphere2.velocity[0] *= -1;
    }
}

function render(now) {
    const deltaTime = now - lastTime || 0;
    lastTime = now;

    // Update physics
    update(deltaTime);

    // Render scene
    // ... rendering code as before ...

    requestAnimationFrame(render);
}
```

## Updating the Scene Over Time

Most 3D applications are dynamic, with objects moving, rotating, or changing in other ways. Let's implement a proper game loop that handles scene updates.

### Game Loop Structure

The game loop is the heart of real-time 3D applications:

```javascript
class SceneManager {
    constructor(gl) {
        this.gl = gl;
        this.scenes = {};
        this.activeScene = null;
        this.lastTime = 0;
        this.running = false;

        // Animation frame request ID
        this.animationFrameId = null;
    }

    createScene(name) {
        const scene = {
            root: new SceneNode(name),
            camera: {
                position: [0, 0, 5],
                target: [0, 0, 0],
                up: [0, 1, 0],
                fov: Math.PI / 4,
                near: 0.1,
                far: 1000,
            },
            lights: [],
            collisionManager: new CollisionManager(),
            userData: {}, // For application-specific data
        };

        this.scenes[name] = scene;

        if (!this.activeScene) {
            this.activeScene = name;
        }

        return scene;
    }

    setActiveScene(name) {
        if (this.scenes[name]) {
            this.activeScene = name;
        } else {
            console.warn(`Scene "${name}" doesn't exist.`);
        }
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.lastTime = 0;
            this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        }
    }

    stop() {
        if (this.running) {
            this.running = false;
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
    }

    loop(now) {
        // Convert time to seconds
        const timeInSeconds = now * 0.001;
        const deltaTime = timeInSeconds - (this.lastTime || timeInSeconds);
        this.lastTime = timeInSeconds;

        if (this.running) {
            // Get active scene
            const scene = this.scenes[this.activeScene];

            if (scene) {
                // Update scene
                this.update(scene, deltaTime, timeInSeconds);

                // Render scene
                this.render(scene);
            }

            // Continue the loop
            this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        }
    }

    update(scene, deltaTime, time) {
        // Update all nodes (custom method for each node type)
        scene.root.traverse((node) => {
            if (node.update) {
                node.update(deltaTime, time);
            }
        });

        // Check collisions
        if (scene.collisionManager) {
            scene.collisionManager.checkCollisions();
        }
    }

    render(scene) {
        // Clear the canvas
        this.gl.clearColor(0.2, 0.3, 0.3, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Set up camera
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, scene.camera.position, scene.camera.target, scene.camera.up);

        const projectionMatrix = mat4.create();
        mat4.perspective(
            projectionMatrix,
            scene.camera.fov,
            this.gl.canvas.width / this.gl.canvas.height,
            scene.camera.near,
            scene.camera.far
        );

        // Create view-projection matrix for frustum culling
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

        // Create frustum for culling
        const frustum = new Frustum();
        frustum.fromViewProjectionMatrix(viewProjectionMatrix);

        // Update all world matrices
        scene.root.updateWorldMatrix();

        // Render visible objects
        scene.root.traverse((node) => {
            if (node.object) {
                // Check if object is visible using its bounding volume
                const isVisible = frustum.intersectsSphere(node.object.worldBoundingSphere);

                if (isVisible) {
                    // Render the object using the node's world matrix
                    node.object.renderWithMatrix(
                        this.gl,
                        this.programInfo,
                        node.worldMatrix,
                        viewMatrix,
                        projectionMatrix
                    );
                }
            }
        });
    }
}
```

### Using the Scene Manager for Animation

Now let's use the scene manager to create animated objects:

```javascript
// Create a scene manager
const sceneManager = new SceneManager(gl);

// Create a scene
const scene = sceneManager.createScene('main');

// Add a rotating cube
const cubeNode = new SceneNode('cube');
cubeNode.object = new SceneObject(gl, createCubeGeometry(), redMaterial);

// Add custom update method
cubeNode.update = function (deltaTime, time) {
    // Rotate cube
    this.rotation[1] += deltaTime * 1.0; // Rotate 1 radian per second
    this.updateLocalMatrix();

    // Make it bob up and down
    this.position[1] = Math.sin(time * 2.0) * 0.5;
    this.updateLocalMatrix();
};

scene.root.addChild(cubeNode);

// Add an orbiting sphere
const sphereNode = new SceneNode('sphere');
sphereNode.object = new SceneObject(gl, createSphereGeometry(0.5), blueMaterial);

// Add custom update method
sphereNode.update = function (deltaTime, time) {
    // Orbit around the scene
    const radius = 3.0;
    this.position[0] = Math.cos(time) * radius;
    this.position[2] = Math.sin(time) * radius;
    this.updateLocalMatrix();
};

scene.root.addChild(sphereNode);

// Start the scene manager
sceneManager.start();
```

### Delta Time for Consistent Animation

Note the use of `deltaTime` in the update methods. This ensures animations run at consistent speeds regardless of frame rate:

```javascript
// Bad: Frame-rate dependent movement
object.position[0] += 0.1; // Moves faster on higher FPS

// Good: Frame-rate independent movement
object.position[0] += 0.5 * deltaTime; // Moves at 0.5 units per second
```

## Putting It All Together: A Complete Scene Management System

Let's combine everything we've learned into a comprehensive example that demonstrates all the key concepts:

```javascript
// Create WebGL context
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl2');

// Resize canvas to match display size
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Enable depth testing
gl.enable(gl.DEPTH_TEST);

// Enable culling of back faces
gl.enable(gl.CULL_FACE);

// Create shaders and program
// ... (Shader and program setup code from previous examples)

// Create scene manager
const sceneManager = new SceneManager(gl);
const mainScene = sceneManager.createScene('main');

// Set up camera
mainScene.camera.position = [0, 5, 10];
mainScene.camera.target = [0, 0, 0];
mainScene.camera.up = [0, 1, 0];

// Create materials
const basicMaterial = new BasicMaterial({
    program: basicProgram,
    diffuse: [0.8, 0.8, 0.8],
    specular: [1.0, 1.0, 1.0],
    shininess: 32,
});

// Create floor
const floorNode = new SceneNode('floor');
floorNode.object = new SceneObject(gl, createPlaneGeometry(20, 20), basicMaterial);
floorNode.setPosition(0, -1, 0);
floorNode.setRotation(-Math.PI / 2, 0, 0); // Rotate to horizontal
mainScene.root.addChild(floorNode);

// Create some cubes
for (let i = 0; i < 50; i++) {
    const cubeNode = new SceneNode(`cube${i}`);

    // Random position, rotation, and scale
    const x = (Math.random() - 0.5) * 15;
    const z = (Math.random() - 0.5) * 15;
    const scale = 0.2 + Math.random() * 0.8;

    // Create cube with random color
    const r = Math.random();
    const g = Math.random();
    const b = Math.random();
    const material = new BasicMaterial({
        program: basicProgram,
        diffuse: [r, g, b],
        specular: [1.0, 1.0, 1.0],
        shininess: 32,
    });

    cubeNode.object = new SceneObject(gl, createCubeGeometry(), material);
    cubeNode.setPosition(x, scale / 2, z); // Place on floor
    cubeNode.setScale(scale, scale, scale);

    // Add a spin animation
    const spinSpeed = (Math.random() - 0.5) * 2;
    cubeNode.update = function (deltaTime) {
        this.rotation[1] += spinSpeed * deltaTime;
        this.updateLocalMatrix();
    };

    mainScene.root.addChild(cubeNode);

    // Add to collision system if it's in the center area
    if (Math.abs(x) < 5 && Math.abs(z) < 5) {
        mainScene.collisionManager.addCollider(cubeNode.object, 'aabb');
    }
}

// Create a player object that can be controlled
const playerNode = new SceneNode('player');
playerNode.object = new SceneObject(
    gl,
    createSphereGeometry(0.5),
    new BasicMaterial({
        program: basicProgram,
        diffuse: [1.0, 0.0, 0.0],
        specular: [1.0, 1.0, 1.0],
        shininess: 64,
    })
);
playerNode.setPosition(0, 0.5, 0);

// Add movement controls
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

playerNode.update = function (deltaTime) {
    const speed = 5.0 * deltaTime;
    let moved = false;

    if (keys['w'] || keys['ArrowUp']) {
        this.position[2] -= speed;
        moved = true;
    }
    if (keys['s'] || keys['ArrowDown']) {
        this.position[2] += speed;
        moved = true;
    }
    if (keys['a'] || keys['ArrowLeft']) {
        this.position[0] -= speed;
        moved = true;
    }
    if (keys['d'] || keys['ArrowRight']) {
        this.position[0] += speed;
        moved = true;
    }

    // Keep player on the floor
    this.position[1] = 0.5;

    if (moved) {
        this.updateLocalMatrix();

        // Check for collisions
        const collisions = mainScene.collisionManager.checkCollisions();

        // Simple collision response - revert position on collision
        if (collisions.length > 0) {
            this.position = this.prevPosition || [0, 0.5, 0];
            this.updateLocalMatrix();
        } else {
            // Store last valid position
            this.prevPosition = [...this.position];
        }
    }

    // Make camera follow player
    mainScene.camera.target = [...this.position];
    mainScene.camera.position = [this.position[0], this.position[1] + 5, this.position[2] + 10];
};

mainScene.root.addChild(playerNode);
mainScene.collisionManager.addCollider(playerNode.object, 'sphere');

// Start the scene manager
sceneManager.start();
```

## Conclusion

Effective scene management is essential for building complex WebGL applications. By structuring your code around these fundamental concepts:

1. **Proper Object Organization**: Using classes to encapsulate geometry, materials, and transformations
2. **Scene Graphs**: For managing object hierarchies and parent-child relationships
3. **Culling and Optimization**: To render only what's visible and improve performance
4. **Collision Detection**: For object interactions
5. **Time-Based Animation**: Using delta time for smooth, consistent movement

You can create scalable, performant 3D applications that are easier to maintain and extend. As your projects grow in complexity, these foundations will help you add advanced features like physics, particle effects, or complex animations without having to completely refactor your codebase.

Remember that while this lesson covers the essentials, each project has unique requirements. Feel free to adapt these concepts to suit your specific needs, and don't be afraid to experiment with alternative approaches as you grow your WebGL expertise.
