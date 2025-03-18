# Coordinate Spaces and Transformations in WebGL

## Understanding Coordinate Spaces

WebGL applications must transform vertices through several coordinate spaces before rendering. Each space serves a specific purpose in the pipeline:

### Model Space (Object Space)

-   The local coordinate system of individual 3D models
-   Origin typically at the center or base of the model
-   Coordinates defined relative to the model itself
-   Most natural space for defining object geometry

### World Space

-   The common coordinate system for all objects in the scene
-   Models are positioned, rotated, and scaled in this space
-   Enables spatial relationships between different objects
-   Transformation: Model → World using model matrix

### View Space (Camera Space/Eye Space)

-   Coordinates relative to the camera's position and orientation
-   Origin at the camera position
-   Z-axis typically along the viewing direction
-   Transformation: World → View using view matrix
-   Usually uses a right-handed coordinate system in WebGL

### Clip Space

-   The coordinate system where clipping operations occur
-   Visible volume is a cube with coordinates from -1.0 to 1.0 on all axes
-   In WebGL, uses a left-handed coordinate system with z-range from -1.0 to 1.0
-   Represented using homogeneous coordinates (x, y, z, w)
-   Transformation: View → Clip using projection matrix
-   **Critical output of the vertex shader** as `gl_Position`

### Normalized Device Coordinates (NDC)

-   Derived from clip space through perspective division (x/w, y/w, z/w)
-   Visible volume remains a cube with coordinates from -1.0 to 1.0
-   Used for viewport transformation and rasterization
-   Automatically calculated by the GPU after vertex shader execution but before primitive assembly

### Screen Space

-   2D pixel coordinates on the canvas
-   Origin typically at the top-left corner
-   Transformation: NDC → Screen using the viewport function
-   Handled automatically by the GPU

## Homogeneous Coordinates: Definition

Homogeneous coordinates are a coordinate system used in projective geometry that extends the conventional Cartesian coordinate system by adding one extra coordinate. For 3D graphics:

-   A 3D point in Cartesian coordinates (x, y, z) is represented as a 4D point (x', y', z', w) in homogeneous coordinates
-   The relationship between these coordinates is defined as:
    -   x = x'/w
    -   y = y'/w
    -   z = z'/w
-   When w = 1, the homogeneous coordinates (x, y, z, 1) directly correspond to the Cartesian coordinates (x, y, z)
-   Division by w=0 is undefined, representing points at infinity
-   Multiple homogeneous coordinates can represent the same Cartesian point (they are equivalent if they are scalar multiples of each other)

In essence, homogeneous coordinates represent an equivalence class of coordinates where all points (kx, ky, kz, kw) for any non-zero k represent the same point in 3D space.

WebGL uses 4D homogeneous coordinates (x, y, z, w) to represent 3D positions for several critical reasons:

### Mathematical Properties

-   Enables representation of both points and vectors in a unified system
-   Allows expression of all affine transformations (including translation) as matrix operations
-   Facilitates perspective projection through the w-component

### Perspective Division Process

1. Vertex shader outputs clip space position as `gl_Position = vec4(x, y, z, w)`
2. GPU automatically performs perspective division (also called "w-divide"): (x/w, y/w, z/w)
3. This division happens automatically after the vertex shader but before primitive assembly
4. The result is normalized device coordinates (NDC)

### Significance of the w-component

-   For orthographic projection: w is typically 1.0 (no perspective effect)
-   For perspective projection: w represents the depth value and creates perspective effect
-   Larger w values cause vertices to appear smaller after division
-   w=0 represents points at infinity (directional vectors)

### Common w-component values

-   w=1.0: Standard position with no perspective scaling
-   w>1.0: Position appears smaller (further away) after perspective division
-   w<1.0: Position appears larger (closer) after perspective division
-   w=0.0: Direction vector (no position, only orientation)

## Clipping Operations

Primitive clipping is a specific operation in the WebGL pipeline where the GPU trims or discards parts of geometric primitives (points, lines, triangles) that fall outside the visible volume of clip space.

### How Primitive Clipping Works

1. **Complete Discard**: If a primitive (like a triangle) is entirely outside the clip space cube (-1 to +1 in all dimensions), it is completely discarded.

2. **Partial Clipping**: If a primitive crosses one or more boundaries of the clip space cube, the GPU:

    - Calculates the exact intersection points where the primitive crosses the boundary
    - Creates new vertices at these intersection points
    - Reconstructs the primitive by replacing the original vertices that were outside with the new intersection vertices
    - Multiple planes can clip a primitive simultaneously, creating more complex shapes

3. **Visual Example**:
    ```
    Before Clipping:       After Clipping:

       C                      C
      /|                     /|
     / |                    / |
    A--+--B        →       A--I
      \|
       \|
        D
    ```
    In this example, vertices A, B, C, and D form the original shape. The triangle ABD is clipped against the right boundary, creating a new vertex I at the intersection and forming a new triangle ACI.

### Clipping Boundaries

Clipping occurs against six planes in clip space:

-   Left plane (x = -w)
-   Right plane (x = w)
-   Bottom plane (y = -w)
-   Top plane (y = w)
-   Near plane (z = -w)
-   Far plane (z = w)

Note that these boundaries depend on the w-component, which is why proper handling of homogeneous coordinates is crucial.

### Practical Significance and Implementation

-   **Optimization**: Clipping occurs after vertex shader execution but before rasterization
-   **Performance**: Eliminates processing of invisible fragments, conserving GPU resources
-   **Correctness**: Prevents mathematical errors that could occur when trying to rasterize primitives outside the valid coordinate range
-   **Visual Quality**: Ensures objects smoothly appear and disappear at the edges of the view volume rather than abruptly popping in or out
-   **Implementation Notes**: Some GPU implementations may use techniques like guard-band clipping, which postpones some clipping operations until after rasterization for efficiency

## Back-Face Culling

Back-face culling is an optional optimization that discards polygons facing away from the viewer. It is performed in normalized device coordinates after perspective division.

### Face Orientation Determination

-   Triangle winding order (clockwise or counter-clockwise) defines front/back faces
-   Default: Counter-clockwise winding defines front faces
-   Configurable via `gl.frontFace(gl.CW)` or `gl.frontFace(gl.CCW)`

### Culling Process

1. Calculate the orientation of each triangle relative to the viewer
2. If the triangle faces away (back face), discard it
3. If the triangle faces toward the viewer (front face), continue processing

### Configuration

```js
// Enable back-face culling
gl.enable(gl.CULL_FACE);

// Configure which faces to cull
gl.cullFace(gl.BACK); // Cull back faces (default)
gl.cullFace(gl.FRONT); // Cull front faces
gl.cullFace(gl.FRONT_AND_BACK); // Cull both (wireframe mode)
```

### Benefits and Considerations

-   Performance improvement varies by scene complexity but can be significant, especially for closed 3D models
-   Inappropriate for two-sided objects (like planes with visible front and back)
-   May cause issues with models having inconsistent winding order
-   Must be disabled for transparent objects that need rendering from both sides

## Transformation Matrices

Coordinate transformations are typically performed using matrix multiplication:

### Model Matrix

-   Transforms vertices from model space to world space
-   Combines object translation, rotation, and scaling

### View Matrix

-   Transforms vertices from world space to view space
-   Represents the inverse of the camera's position and orientation

### Projection Matrix

-   Transforms vertices from view space to clip space
-   Two common types:
    -   **Perspective projection**: Objects appear smaller with distance (realistic)
    -   **Orthographic projection**: No perspective distortion (technical drawings)

### Combined Transformation

```glsl
// Vertex shader
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
attribute vec3 aPosition;

void main() {
  // Complete transformation pipeline
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
```

## Practical Example: Visualizing Clip Space

```glsl
// Vertex shader demonstrating clip space
attribute vec3 aPosition;  // Model space position
uniform mat4 uMVP;         // Combined model-view-projection matrix

void main() {
  // Transform to clip space
  vec4 clipPos = uMVP * vec4(aPosition, 1.0);

  // Output clip space position
  gl_Position = clipPos;

  // Note: GPU will automatically perform perspective division:
  // NDC = (clipPos.x/clipPos.w, clipPos.y/clipPos.w, clipPos.z/clipPos.w)
}
```

Understanding these coordinate spaces and transformations is essential for effective WebGL programming, as they form the mathematical foundation for all 3D graphics rendering.
