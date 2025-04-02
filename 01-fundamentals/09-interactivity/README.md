# Interactivity in WebGL 2: Creating Dynamic User Experiences

## Introduction to Interactivity

### Why Interactivity Matters

Interactivity transforms static 3D scenes into dynamic, engaging experiences that respond to user actions. While rendering techniques create visually impressive graphics, it's user interaction that brings these graphics to life, creating a two-way relationship between the viewer and the virtual environment.

Key benefits of adding interactivity include:

1. **Engagement**: Interactive applications capture and maintain user attention by giving them agency and control.
2. **Exploration**: Users can investigate 3D environments from different angles and perspectives.
3. **Functionality**: Interactivity enables practical applications like product configurators, architectural walkthroughs, or data visualizations.
4. **Immersion**: Responsive controls create a more believable and immersive experience.

For WebGL applications, interactivity is the bridge between impressive visuals and practical utility, turning passive viewers into active participants.

### Input Types in Web Applications

WebGL applications can respond to various input mechanisms provided by web browsers:

1. **Mouse Input**:

    - **Clicks**: Selecting objects or triggering actions
    - **Movement**: Rotating the camera, highlighting elements
    - **Wheel**: Zooming or scrolling through content
    - **Drag and Drop**: Moving objects or adjusting view

2. **Keyboard Input**:

    - **Key Presses**: Navigation, shortcuts, text input
    - **Combinations**: Advanced controls or commands
    - **Modifiers**: Shift, Ctrl, Alt for specialized actions

3. **Touch Input** (for mobile and touch-enabled devices):

    - **Taps**: Similar to mouse clicks
    - **Swipes**: Scrolling or changing views
    - **Pinch/Spread**: Zooming
    - **Multi-touch**: Advanced gestures

4. **Other Inputs**:
    - **Gamepad**: For game-like experiences
    - **Device Orientation**: Tilting or rotating the device
    - **VR Controllers**: For WebXR applications

### WebGL and JavaScript Integration

WebGL itself doesn't directly handle user input. Instead, it relies on JavaScript to:

1. Capture user interactions via browser events
2. Process and interpret these events
3. Update the WebGL state (uniforms, attributes, buffers)
4. Trigger new renders to reflect these changes

This separation of concerns means that WebGL focuses on rendering, while JavaScript manages the application logic and user interaction. The challenge is to efficiently connect user actions to meaningful changes in the 3D scene, which we'll explore throughout this lesson.

## Handling User Input

### Setting Up Event Listeners

JavaScript's event system provides the foundation for capturing user input. For WebGL applications, we typically attach event listeners to the canvas element or the document, depending on the scope needed:

```javascript
// Get the WebGL canvas
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl2');

// Mouse event listeners
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('wheel', handleMouseWheel);

// Keyboard event listeners (typically on document)
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

// Touch event listeners
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);
```

### Extracting Useful Information

Each type of event provides different information that needs to be processed for 3D interaction:

#### Mouse Event Data

Mouse events provide coordinates that need to be converted to the appropriate coordinate system:

```javascript
function handleMouseDown(event) {
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to normalized device coordinates (-1 to +1)
    const ndcX = (mouseX / canvas.width) * 2 - 1;
    const ndcY = -((mouseY / canvas.height) * 2 - 1); // Note: Y is flipped

    // Store state for potential drag operations
    isDragging = true;
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    // Check if the user clicked on an object
    checkObjectSelection(ndcX, ndcY);
}

function handleMouseMove(event) {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate the distance moved since last position
    const deltaX = mouseX - lastMouseX;
    const deltaY = mouseY - lastMouseY;

    // Update camera or selected object based on mouse movement
    if (selectedObject) {
        moveSelectedObject(deltaX, deltaY);
    } else {
        rotateCamera(deltaX, deltaY);
    }

    // Update last position
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    // Request a new frame render
    requestAnimationFrame(render);
}

function handleMouseUp(event) {
    isDragging = false;
}

function handleMouseWheel(event) {
    // Prevent default scrolling
    event.preventDefault();

    // Determine zoom direction (positive or negative delta)
    const zoomAmount = event.deltaY * 0.01;

    // Update camera zoom
    zoomCamera(zoomAmount);

    // Request a new frame render
    requestAnimationFrame(render);
}
```

#### Keyboard Event Data

Keyboard events provide information about which keys are pressed:

```javascript
// Track currently pressed keys
const pressedKeys = new Set();

function handleKeyDown(event) {
    // Add key to pressed keys set
    pressedKeys.add(event.code);

    // Prevent default actions for certain keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
}

function handleKeyUp(event) {
    // Remove key from pressed keys set
    pressedKeys.delete(event.code);
}

// In your animation loop, respond to pressed keys
function updateScene() {
    const moveSpeed = 0.1;

    if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
        moveCameraForward(moveSpeed);
    }
    if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
        moveCameraBackward(moveSpeed);
    }
    if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
        moveCameraLeft(moveSpeed);
    }
    if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
        moveCameraRight(moveSpeed);
    }

    requestAnimationFrame(render);
}
```

#### Touch Event Data

Touch events are similar to mouse events but need special handling for multi-touch:

```javascript
// Track touch for potential gestures
let touchStartX, touchStartY;
let prevTouchDistance = 0;

function handleTouchStart(event) {
    event.preventDefault(); // Prevent default behavior like scrolling

    if (event.touches.length === 1) {
        // Single touch - track position for potential drag
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchStartX = touch.clientX - rect.left;
        touchStartY = touch.clientY - rect.top;

        // Convert to NDC for object selection
        const ndcX = (touchStartX / canvas.width) * 2 - 1;
        const ndcY = -((touchStartY / canvas.height) * 2 - 1);

        checkObjectSelection(ndcX, ndcY);
    } else if (event.touches.length === 2) {
        // Two-finger touch - track distance for pinch/zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        prevTouchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
    }
}

function handleTouchMove(event) {
    event.preventDefault();

    if (event.touches.length === 1) {
        // Single touch movement (rotate/pan)
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Calculate delta from initial touch
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // Apply rotation or movement
        if (selectedObject) {
            moveSelectedObject(deltaX, deltaY);
        } else {
            rotateCamera(deltaX * 0.5, deltaY * 0.5);
        }

        // Update position for next delta calculation
        touchStartX = touchX;
        touchStartY = touchY;
    } else if (event.touches.length === 2) {
        // Handle pinch/zoom with two fingers
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        // Calculate zoom based on pinch distance change
        const zoomDelta = (currentDistance - prevTouchDistance) * 0.01;
        zoomCamera(-zoomDelta); // Negative because pinching in should zoom out

        prevTouchDistance = currentDistance;
    }

    requestAnimationFrame(render);
}

function handleTouchEnd(event) {
    // Reset touch state if all touches have ended
    if (event.touches.length === 0) {
        touchStartX = touchStartY = undefined;
        prevTouchDistance = 0;
    }
}
```

### Connecting to WebGL

Once we've processed user input, we need to translate it into changes in our WebGL scene. This typically involves:

1. Updating JavaScript variables that track the state of the scene
2. Translating those changes into matrix transformations
3. Passing the updated matrices to shaders via uniforms

Here's a simplified example of how user input might update a camera's view matrix:

```javascript
// Camera state
const cameraState = {
    position: [0, 0, 5],
    target: [0, 0, 0],
    up: [0, 1, 0],
    // Euler angles for rotation
    rotationX: 0,
    rotationY: 0,
    // Calculate view matrix based on current state
    updateViewMatrix: function () {
        // Convert Euler angles to a new position
        const radius = vec3.distance(this.position, this.target);
        const newX = Math.sin(this.rotationY) * Math.cos(this.rotationX) * radius;
        const newY = Math.sin(this.rotationX) * radius;
        const newZ = Math.cos(this.rotationY) * Math.cos(this.rotationX) * radius;

        // Update position
        this.position = [this.target[0] + newX, this.target[1] + newY, this.target[2] + newZ];

        // Calculate and return the new view matrix
        return mat4.lookAt(mat4.create(), this.position, this.target, this.up);
    },
};

// In the mouse move event handler
function rotateCamera(deltaX, deltaY) {
    const rotationSpeed = 0.01;

    // Update rotation angles
    cameraState.rotationY += deltaX * rotationSpeed;

    // Limit vertical rotation to avoid flipping
    cameraState.rotationX += deltaY * rotationSpeed;
    cameraState.rotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraState.rotationX));

    // Generate new view matrix
    viewMatrix = cameraState.updateViewMatrix();
}

// In the render function
function render() {
    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use our shader program
    gl.useProgram(program);

    // Set view matrix uniform
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, viewMatrix);

    // Set other uniforms and render the scene
    // ...
}
```

## Camera Controls

Camera controls are one of the most common forms of interactivity in 3D applications, allowing users to navigate the scene.

### Orbit Controls

Orbit controls let the user rotate around a fixed point, as if the camera were attached to a sphere surrounding the scene:

```javascript
class OrbitControls {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;

        // Initial state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Orbital parameters
        this.azimuth = 0; // Horizontal angle
        this.polar = Math.PI / 2; // Vertical angle (start at equator)
        this.radius = 5; // Distance from target
        this.target = [0, 0, 0]; // Look-at point

        // Bind event handlers
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);

        // Attach event listeners
        this.canvas.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        this.canvas.addEventListener('wheel', this._onWheel);
    }

    // Event handlers
    _onMouseDown(event) {
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastMouseX = event.clientX - rect.left;
        this.lastMouseY = event.clientY - rect.top;
    }

    _onMouseMove(event) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const deltaX = mouseX - this.lastMouseX;
        const deltaY = mouseY - this.lastMouseY;

        // Update angles
        const rotationSpeed = 0.01;
        this.azimuth -= deltaX * rotationSpeed;
        this.polar = Math.max(
            0.1, // Prevent looking directly from top
            Math.min(Math.PI - 0.1, this.polar + deltaY * rotationSpeed)
        );

        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        this.updateCamera();
    }

    _onMouseUp() {
        this.isDragging = false;
    }

    _onWheel(event) {
        event.preventDefault();

        // Update radius (zoom)
        const zoomSpeed = 0.1;
        this.radius += event.deltaY * zoomSpeed * 0.01;

        // Limit zoom range
        this.radius = Math.max(1, Math.min(20, this.radius));

        this.updateCamera();
    }

    // Update camera position based on orbital parameters
    updateCamera() {
        // Convert spherical to Cartesian coordinates
        const x = this.radius * Math.sin(this.polar) * Math.cos(this.azimuth);
        const y = this.radius * Math.cos(this.polar);
        const z = this.radius * Math.sin(this.polar) * Math.sin(this.azimuth);

        // Update camera position
        this.camera.position = [this.target[0] + x, this.target[1] + y, this.target[2] + z];

        // Generate view matrix looking at target
        this.camera.viewMatrix = mat4.lookAt(
            mat4.create(),
            this.camera.position,
            this.target,
            [0, 1, 0] // Up vector
        );

        // Request a new frame
        requestAnimationFrame(() => this.onUpdate());
    }

    // Callback for when camera updates
    onUpdate() {
        // Override this with your render function
    }

    // Clean up
    dispose() {
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        this.canvas.removeEventListener('wheel', this._onWheel);
    }
}

// Usage:
const camera = {
    position: [0, 0, 5],
    viewMatrix: mat4.create(),
};

const controls = new OrbitControls(canvas, camera);
controls.onUpdate = render; // Your render function
```

### Pan Controls

Panning moves the camera parallel to the view plane, often combined with orbit controls:

```javascript
// Add to OrbitControls class
class OrbitControls {
    // ... existing code ...

    // Add pan support
    enablePan() {
        this.isPanEnabled = true;
        this._onMouseDownWithPan = (event) => {
            if (event.button === 0 && !event.ctrlKey) {
                // Left click without Ctrl: rotate (existing behavior)
                this._onMouseDown(event);
            } else if (event.button === 0 && event.ctrlKey) {
                // Left click + Ctrl: pan
                this.isPanning = true;
                const rect = this.canvas.getBoundingClientRect();
                this.lastMouseX = event.clientX - rect.left;
                this.lastMouseY = event.clientY - rect.top;
            }
        };

        this._onMouseMoveWithPan = (event) => {
            if (this.isPanning) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;

                const deltaX = mouseX - this.lastMouseX;
                const deltaY = mouseY - this.lastMouseY;

                this._pan(deltaX, deltaY);

                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
            } else if (this.isDragging) {
                // Original rotation behavior
                this._onMouseMove(event);
            }
        };

        this._onMouseUpWithPan = () => {
            this.isDragging = false;
            this.isPanning = false;
        };

        // Replace event listeners
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);

        this.canvas.addEventListener('mousedown', this._onMouseDownWithPan);
        document.addEventListener('mousemove', this._onMouseMoveWithPan);
        document.addEventListener('mouseup', this._onMouseUpWithPan);
    }

    _pan(deltaX, deltaY) {
        // Calculate right and up vectors based on camera orientation
        const forward = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.target, this.camera.position));
        const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), forward, [0, 1, 0]));
        const up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), right, forward));

        // Scale movement based on radius (faster pan when zoomed out)
        const panSpeed = 0.01 * this.radius;

        // Move target and camera together
        const rightOffset = vec3.scale(vec3.create(), right, -deltaX * panSpeed);
        const upOffset = vec3.scale(vec3.create(), up, deltaY * panSpeed);

        vec3.add(this.target, this.target, rightOffset);
        vec3.add(this.target, this.target, upOffset);

        this.updateCamera();
    }

    // ... existing code ...
}
```

### First-Person Controls

First-person controls simulate moving through the scene as if the user were a character inside it:

```javascript
class FirstPersonControls {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;

        // Initial state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Movement state
        this.pressedKeys = new Set();

        // Orientation
        this.yaw = 0;
        this.pitch = 0;

        // Bind event handlers
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        // Attach event listeners
        this.canvas.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);

        // Start update loop
        this._previousTime = 0;
        this._updateLoop(0);
    }

    // Mouse handlers for looking around
    _onMouseDown(event) {
        this.isDragging = true;
        this.canvas.requestPointerLock(); // Lock cursor for FPS-style controls

        const rect = this.canvas.getBoundingClientRect();
        this.lastMouseX = event.clientX - rect.left;
        this.lastMouseY = event.clientY - rect.top;
    }

    _onMouseMove(event) {
        if (!this.isDragging) return;

        // In pointer lock mode, movementX/Y gives relative motion
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;

        // Update orientation
        const rotationSpeed = 0.002;
        this.yaw -= deltaX * rotationSpeed;
        this.pitch -= deltaY * rotationSpeed;

        // Limit vertical look
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

        this.updateCamera();
    }

    _onMouseUp() {
        this.isDragging = false;
        document.exitPointerLock();
    }

    // Keyboard handlers for movement
    _onKeyDown(event) {
        this.pressedKeys.add(event.code);
    }

    _onKeyUp(event) {
        this.pressedKeys.delete(event.code);
    }

    // Update loop for smooth movement
    _updateLoop(timestamp) {
        const deltaTime = timestamp - this._previousTime || 0;
        this._previousTime = timestamp;

        this._updateMovement(deltaTime);

        requestAnimationFrame((time) => this._updateLoop(time));
    }

    _updateMovement(deltaTime) {
        if (this.pressedKeys.size === 0) return;

        // Calculate movement direction based on camera orientation
        const moveSpeed = 0.005 * deltaTime;

        // Calculate forward and right directions
        const forward = [
            Math.sin(this.yaw) * Math.cos(this.pitch),
            -Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch),
        ];

        const right = [Math.sin(this.yaw + Math.PI / 2), 0, Math.cos(this.yaw + Math.PI / 2)];

        // Apply movement based on keys
        let moved = false;

        if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) {
            this.camera.position[0] += forward[0] * moveSpeed;
            this.camera.position[1] += forward[1] * moveSpeed;
            this.camera.position[2] += forward[2] * moveSpeed;
            moved = true;
        }
        if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) {
            this.camera.position[0] -= forward[0] * moveSpeed;
            this.camera.position[1] -= forward[1] * moveSpeed;
            this.camera.position[2] -= forward[2] * moveSpeed;
            moved = true;
        }
        if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) {
            this.camera.position[0] -= right[0] * moveSpeed;
            this.camera.position[1] -= right[1] * moveSpeed;
            this.camera.position[2] -= right[2] * moveSpeed;
            moved = true;
        }
        if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) {
            this.camera.position[0] += right[0] * moveSpeed;
            this.camera.position[1] += right[1] * moveSpeed;
            this.camera.position[2] += right[2] * moveSpeed;
            moved = true;
        }

        if (moved) {
            this.updateCamera();
        }
    }

    updateCamera() {
        // Calculate look-at point
        const lookAtPoint = [
            this.camera.position[0] + Math.sin(this.yaw) * Math.cos(this.pitch),
            this.camera.position[1] - Math.sin(this.pitch),
            this.camera.position[2] + Math.cos(this.yaw) * Math.cos(this.pitch),
        ];

        // Generate view matrix
        this.camera.viewMatrix = mat4.lookAt(
            mat4.create(),
            this.camera.position,
            lookAtPoint,
            [0, 1, 0] // Up vector
        );

        // Request a new frame
        this.onUpdate();
    }

    // Callback for when camera updates
    onUpdate() {
        // Override this with your render function
    }

    // Clean up
    dispose() {
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.exitPointerLock();
    }
}
```

## Object Interaction

Beyond camera movement, direct interaction with objects in the scene adds another dimension to user experience.

### Object Picking with Raycasting

Raycasting allows us to determine which object the user clicked on by casting a ray from the camera through the mouse position:

```javascript
class Raycaster {
    constructor(camera) {
        this.camera = camera;
    }

    // Calculate ray from camera through normalized device coordinates
    setFromCamera(ndcX, ndcY) {
        // Create a ray in clip space
        const clipRay = [ndcX, ndcY, -1, 1]; // Near plane point
        const farRay = [ndcX, ndcY, 1, 1]; // Far plane point

        // Get inverse projection-view matrix
        const projViewMatrix = mat4.multiply(mat4.create(), this.camera.projectionMatrix, this.camera.viewMatrix);
        const invProjViewMatrix = mat4.invert(mat4.create(), projViewMatrix);

        // Transform ray to world space
        const nearPoint = vec4.transformMat4(vec4.create(), clipRay, invProjViewMatrix);
        const farPoint = vec4.transformMat4(vec4.create(), farRay, invProjViewMatrix);

        // Divide by w component to get actual positions
        vec4.scale(nearPoint, nearPoint, 1 / nearPoint[3]);
        vec4.scale(farPoint, farPoint, 1 / farPoint[3]);

        // Calculate ray direction
        const origin = [nearPoint[0], nearPoint[1], nearPoint[2]];
        const direction = vec3.normalize(vec3.create(), [
            farPoint[0] - nearPoint[0],
            farPoint[1] - nearPoint[1],
            farPoint[2] - nearPoint[2],
        ]);

        this.ray = { origin, direction };
        return this;
    }

    // Test for intersection with a sphere
    intersectSphere(center, radius) {
        const oc = vec3.subtract(vec3.create(), this.ray.origin, center);
        const a = vec3.dot(this.ray.direction, this.ray.direction);
        const b = 2.0 * vec3.dot(oc, this.ray.direction);
        const c = vec3.dot(oc, oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return null; // No intersection
        }

        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0) return null; // Intersection behind ray origin

        const point = vec3.scaleAndAdd(vec3.create(), this.ray.origin, this.ray.direction, t);

        return {
            distance: t,
            point: point,
        };
    }

    // Test for intersection with a triangle
    intersectTriangle(a, b, c) {
        // Möller–Trumbore algorithm
        const edge1 = vec3.subtract(vec3.create(), b, a);
        const edge2 = vec3.subtract(vec3.create(), c, a);
        const normal = vec3.cross(vec3.create(), edge1, edge2);

        // Check if ray and triangle are parallel
        const rayNormalDot = vec3.dot(this.ray.direction, normal);
        if (Math.abs(rayNormalDot) < 0.000001) return null;

        const invRayNormalDot = 1.0 / rayNormalDot;
        const rayOriginToVertex = vec3.subtract(vec3.create(), this.ray.origin, a);

        // Calculate barycentric U coordinate
        const u = vec3.dot(rayOriginToVertex, vec3.cross(vec3.create(), this.ray.direction, edge2)) * invRayNormalDot;
        if (u < 0 || u > 1) return null;

        // Calculate barycentric V coordinate
        const v = vec3.dot(this.ray.direction, vec3.cross(vec3.create(), rayOriginToVertex, edge1)) * invRayNormalDot;
        if (v < 0 || u + v > 1) return null;

        // Calculate distance to intersection point
        const t = vec3.dot(rayOriginToVertex, normal) * invRayNormalDot;
        if (t < 0) return null; // Intersection behind ray origin

        // Calculate intersection point
        const point = vec3.scaleAndAdd(vec3.create(), this.ray.origin, this.ray.direction, t);

        return {
            distance: t,
            point: point,
            uv: [u, v], // Barycentric coordinates
        };
    }

    // Test against a mesh (collection of triangles)
    intersectMesh(mesh) {
        // This assumes mesh.triangles is an array of triangle vertices
        // and mesh.worldMatrix is the object's transformation matrix

        const invWorldMatrix = mat4.invert(mat4.create(), mesh.worldMatrix);

        // Transform ray to object space
        const localRayOrigin = vec3.transformMat4(vec3.create(), this.ray.origin, invWorldMatrix);

        // Direction needs to be transformed differently (as vector, not point)
        const transformMat3 = mat3.fromMat4(mat3.create(), invWorldMatrix);
        const localRayDirection = vec3.transformMat3(vec3.create(), this.ray.direction, transformMat3);
        vec3.normalize(localRayDirection, localRayDirection);

        // Store original ray
        const originalRay = this.ray;

        // Use local ray for intersection tests
        this.ray = {
            origin: localRayOrigin,
            direction: localRayDirection,
        };

        let closestIntersection = null;
        let closestDistance = Infinity;

        // Test each triangle
        for (let i = 0; i < mesh.triangles.length; i++) {
            const triangle = mesh.triangles[i];
            const intersection = this.intersectTriangle(triangle.a, triangle.b, triangle.c);

            if (intersection && intersection.distance < closestDistance) {
                closestIntersection = intersection;
                closestDistance = intersection.distance;
                closestIntersection.triangleIndex = i;
            }
        }

        // Restore original ray
        this.ray = originalRay;

        if (closestIntersection) {
            // Transform intersection point back to world space
            closestIntersection.point = vec3.transformMat4(vec3.create(), closestIntersection.point, mesh.worldMatrix);

            return {
                object: mesh,
                ...closestIntersection,
            };
        }

        return null;
    }

    // Find nearest object intersected by the ray
    intersectObjects(objects) {
        let closestIntersection = null;
        let closestDistance = Infinity;

        objects.forEach((object) => {
            const intersection = this.intersectMesh(object);

            if (intersection && intersection.distance < closestDistance) {
                closestIntersection = intersection;
                closestDistance = intersection.distance;
            }
        });

        return closestIntersection;
    }
}

// Usage:
function handleMouseClick(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to normalized device coordinates
    const ndcX = (mouseX / canvas.width) * 2 - 1;
    const ndcY = -((mouseY / canvas.height) * 2 - 1);

    // Cast ray
    const raycaster = new Raycaster(camera);
    raycaster.setFromCamera(ndcX, ndcY);

    // Find intersections
    const intersection = raycaster.intersectObjects(objects);

    if (intersection) {
        // Object was clicked
        selectedObject = intersection.object;
        // Highlight or manipulate the selected object
        highlightObject(selectedObject);
    } else {
        // No object was clicked
        selectedObject = null;
        clearHighlights();
    }

    requestAnimationFrame(render);
}
```

### Color-Based Picking

An alternative approach to object picking is to render the scene with unique colors for each object, then read the color of the pixel that was clicked:

```javascript
class ColorPicker {
    constructor(gl, camera, objects) {
        this.gl = gl;
        this.camera = camera;
        this.objects = objects;

        // Create a framebuffer for off-screen rendering
        this.framebuffer = gl.createFramebuffer();

        // Create a texture to render to
        this.colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Create a renderbuffer for depth
        this.depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.canvas.width, gl.canvas.height);

        // Attach texture and renderbuffer to framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);

        // Verify framebuffer is complete
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer not complete');
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Create a program for color-based picking
        this.program = createPickingProgram(gl);

        // Create unique colors for each object
        this.objectColors = objects.map((_, index) => {
            const r = ((index & 0x000000ff) >> 0) / 255;
            const g = ((index & 0x0000ff00) >> 8) / 255;
            const b = ((index & 0x00ff0000) >> 16) / 255;
            return [r, g, b, 1.0];
        });
    }

    pick(ndcX, ndcY) {
        const gl = this.gl;

        // Bind framebuffer and set viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the framebuffer
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Use picking program
        gl.useProgram(this.program);

        // Set view and projection matrices
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uViewMatrix'), false, this.camera.viewMatrix);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            false,
            this.camera.projectionMatrix
        );

        // Render each object with a unique color
        this.objects.forEach((object, index) => {
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uModelMatrix'), false, object.worldMatrix);

            // Set the unique color
            gl.uniform4fv(gl.getUniformLocation(this.program, 'uObjectColor'), this.objectColors[index]);

            // Bind object VAO and draw
            gl.bindVertexArray(object.vao);
            if (object.indices) {
                gl.drawElements(gl.TRIANGLES, object.indexCount, gl.UNSIGNED_SHORT, 0);
            } else {
                gl.drawArrays(gl.TRIANGLES, 0, object.vertexCount);
            }
        });

        // Read the pixel at the mouse position
        const pixelX = Math.floor((ndcX * 0.5 + 0.5) * gl.canvas.width);
        const pixelY = Math.floor((ndcY * -0.5 + 0.5) * gl.canvas.height);

        const pixel = new Uint8Array(4);
        gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        // Unbind framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Calculate object index from color
        const index = pixel[0] | (pixel[1] << 8) | (pixel[2] << 16);

        // Return the picked object or null if background was clicked
        return index === 0 ? null : this.objects[index - 1];
    }
}

// Helper function to create picking shader
function createPickingProgram(gl) {
    const vertexShaderSource = `#version 300 es
    in vec3 aPosition;
    
    uniform mat4 uModelMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    void main() {
      gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
    }
  `;

    const fragmentShaderSource = `#version 300 es
    precision highp float;
    
    uniform vec4 uObjectColor;
    
    out vec4 fragColor;
    
    void main() {
      fragColor = uObjectColor;
    }
  `;

    // Compile and link program
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
    }

    return program;
}

// Usage:
const colorPicker = new ColorPicker(gl, camera, objects);

function handleMouseClick(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to normalized device coordinates
    const ndcX = (mouseX / canvas.width) * 2 - 1;
    const ndcY = -((mouseY / canvas.height) * 2 - 1);

    // Pick object
    const pickedObject = colorPicker.pick(ndcX, ndcY);

    if (pickedObject) {
        // Object was clicked
        selectedObject = pickedObject;
        highlightObject(selectedObject);
    } else {
        // No object was clicked
        selectedObject = null;
        clearHighlights();
    }

    requestAnimationFrame(render);
}
```

### Object Transformations

Once an object is selected, we can implement interactions to transform it:

```javascript
class ObjectTransformControls {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.selectedObject = null;

        // State for drag operation
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.transformMode = 'translate'; // 'translate', 'rotate', or 'scale'

        // Bind event handlers
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        // Attach event listeners
        this.canvas.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('keydown', this._onKeyDown);
    }

    // Set the object to transform
    setSelectedObject(object) {
        this.selectedObject = object;
    }

    // Set transformation mode
    setTransformMode(mode) {
        if (['translate', 'rotate', 'scale'].includes(mode)) {
            this.transformMode = mode;
        }
    }

    _onMouseDown(event) {
        if (!this.selectedObject) return;

        this.isDragging = true;

        const rect = this.canvas.getBoundingClientRect();
        this.lastMouseX = event.clientX - rect.left;
        this.lastMouseY = event.clientY - rect.top;
    }

    _onMouseMove(event) {
        if (!this.isDragging || !this.selectedObject) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const deltaX = mouseX - this.lastMouseX;
        const deltaY = mouseY - this.lastMouseY;

        switch (this.transformMode) {
            case 'translate':
                this._translateObject(deltaX, deltaY);
                break;
            case 'rotate':
                this._rotateObject(deltaX, deltaY);
                break;
            case 'scale':
                this._scaleObject(deltaX, deltaY);
                break;
        }

        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        // Request render update
        this.onUpdate();
    }

    _onMouseUp() {
        this.isDragging = false;
    }

    _onKeyDown(event) {
        // Keyboard shortcuts for transform modes
        if (event.code === 'KeyT') {
            this.setTransformMode('translate');
        } else if (event.code === 'KeyR') {
            this.setTransformMode('rotate');
        } else if (event.code === 'KeyS') {
            this.setTransformMode('scale');
        }
    }

    _translateObject(deltaX, deltaY) {
        // Calculate move direction in world space
        const speed = 0.01;

        // Get camera right and up vectors
        const viewMatrix = this.camera.viewMatrix;
        const right = [viewMatrix[0], viewMatrix[4], viewMatrix[8]];
        const up = [viewMatrix[1], viewMatrix[5], viewMatrix[9]];

        // Scale vectors by delta
        const deltaRight = vec3.scale(vec3.create(), right, deltaX * speed);
        const deltaUp = vec3.scale(vec3.create(), up, -deltaY * speed);

        // Combine movements
        const translation = vec3.add(vec3.create(), deltaRight, deltaUp);

        // Update object position
        vec3.add(this.selectedObject.position, this.selectedObject.position, translation);

        // Update object's world matrix
        this._updateObjectMatrix();
    }

    _rotateObject(deltaX, deltaY) {
        const rotationSpeed = 0.01;

        // Create rotation matrices
        const rotX = mat4.create();
        const rotY = mat4.create();

        // Rotate around world Y axis for X movement
        mat4.fromYRotation(rotY, -deltaX * rotationSpeed);

        // Rotate around local X axis for Y movement
        mat4.fromXRotation(rotX, -deltaY * rotationSpeed);

        // Apply to object
        if (this.selectedObject.rotation) {
            // If using Euler angles
            this.selectedObject.rotation[0] += -deltaY * rotationSpeed;
            this.selectedObject.rotation[1] += -deltaX * rotationSpeed;
        } else {
            // If using a rotation matrix directly
            mat4.multiply(this.selectedObject.rotationMatrix, rotY, this.selectedObject.rotationMatrix);
            mat4.multiply(this.selectedObject.rotationMatrix, this.selectedObject.rotationMatrix, rotX);
        }

        // Update object's world matrix
        this._updateObjectMatrix();
    }

    _scaleObject(deltaX, deltaY) {
        const scaleSpeed = 0.005;

        // Use average of X and Y movement for uniform scaling
        const scaleFactor = 1.0 + (deltaX + deltaY) * scaleSpeed;

        // Apply to object's scale
        vec3.scale(this.selectedObject.scale, this.selectedObject.scale, scaleFactor);

        // Ensure minimum scale
        this.selectedObject.scale[0] = Math.max(0.1, this.selectedObject.scale[0]);
        this.selectedObject.scale[1] = Math.max(0.1, this.selectedObject.scale[1]);
        this.selectedObject.scale[2] = Math.max(0.1, this.selectedObject.scale[2]);

        // Update object's world matrix
        this._updateObjectMatrix();
    }

    _updateObjectMatrix() {
        // Create a new world matrix from TRS components
        mat4.fromRotationTranslationScale(
            this.selectedObject.worldMatrix,
            this.selectedObject.rotationMatrix || quat.fromEuler(quat.create(), ...this.selectedObject.rotation),
            this.selectedObject.position,
            this.selectedObject.scale
        );
    }

    // Callback for when object is updated
    onUpdate() {
        // Override this with your render function
    }

    // Clean up
    dispose() {
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('keydown', this._onKeyDown);
    }
}

// Usage:
const transformControls = new ObjectTransformControls(canvas, camera);
transformControls.onUpdate = render;

// When an object is selected:
transformControls.setSelectedObject(selectedObject);
```

## Integrating UI Elements

HTML UI elements can provide additional ways for users to control the WebGL application.

### Basic HTML Controls

Start by creating HTML controls that can interact with your WebGL scene:

### Connecting UI to WebGL

Link these UI elements to your WebGL scene with event listeners:

### Responsive UI Design

For the best user experience, make your UI responsive and adaptable:

## Conclusion

Interactivity transforms WebGL applications from static visualizations into engaging, dynamic experiences. By implementing proper input handling, camera controls, object interaction, and user interface elements, we create a bridge between the user and the 3D world.

The techniques covered in this lesson form the foundation for a wide range of interactive WebGL applications:

-   **Input Handling**: Mouse, keyboard, and touch events enable the user to communicate with the application.
-   **Camera Controls**: Orbit, pan, zoom, and first-person movement let users explore the scene from different perspectives.
-   **Object Interaction**: Picking and manipulation give users direct control over scene elements.
-   **UI Integration**: HTML controls provide additional ways to adjust scene parameters.

When building your own interactive WebGL applications, remember these key principles:

1. **Responsiveness**: Input handling should feel immediate and natural, with smooth transitions between states.
2. **Intuitiveness**: Controls should be predictable and follow established conventions where possible.
3. **Feedback**: Provide visual cues when users interact with the scene, like highlighting selected objects.
4. **Performance**: Keep interactions fluid by optimizing render loops and minimizing expensive operations during continuous input.
