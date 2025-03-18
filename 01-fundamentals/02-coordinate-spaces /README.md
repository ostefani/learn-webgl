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
-   In WebGL, uses a right-handed coordinate system with z-range from -1.0 to 1.0
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

### Mathematical and Geometric Perspective of the W-Component

The w-component in homogeneous coordinates has deep mathematical significance beyond its computational utility:

#### Mathematical Foundation

-   **Projective Geometry**: Homogeneous coordinates arise from projective geometry, which extends Euclidean space to include "points at infinity"
-   **Representation Power**: The 4D homogeneous space can represent both finite points and directions (points at infinity) in a unified framework
-   **Equivalence Classes**: Points (x,y,z,w) and (kx,ky,kz,kw) for any non-zero k represent the same projective point, forming equivalence classes

#### Geometric Interpretation

-   **Geometric Distance Encoding**: The w value can be interpreted as a scaling factor that encodes distance information
-   **Hyperplane Model**: The 3D Cartesian space we're familiar with can be viewed as the w=1 hyperplane in 4D projective space
-   **Projective Lines**: Each point in 3D projective space represents an entire line through the origin in 4D space
-   **Dual Role**: w serves both as a homogenizing factor for translations and as a depth-encoding component for perspective

#### Practical Significance in Graphics

-   **Unified Transformation Framework**: All affine and projective transformations (including translations, which aren't linear in 3D) become linear in 4D homogeneous space
-   **Depth Information**: During perspective projection, w naturally encodes view-space depth, creating the perspective foreshortening effect
-   **Interpolation Behavior**: When vertex attributes are interpolated in screen space, using 1/w as an interpolation weight creates perspective-correct texturing
-   **Clipping Mathematics**: The w-component enables mathematically elegant frustum clipping against planes defined in terms of w

This deeper understanding of the w-component explains why homogeneous coordinates aren't merely a computational convenience but a mathematically elegant foundation for 3D graphics.

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

## The View Frustum

The view frustum is a 3D volume that defines the visible portion of your 3D scene:

-   For **perspective projection**: It's shaped like a truncated pyramid (narrower near the camera, wider farther away)
-   For **orthographic projection**: It's a rectangular box (same width near and far)

The frustum is bounded by six planes:

-   Near plane (closest to camera)
-   Far plane (farthest from camera)
-   Left, right, top, and bottom planes (the sides of the frustum)

In clip space, these six planes are defined relative to the w-component:

-   Left plane: x = -w
-   Right plane: x = w
-   Bottom plane: y = -w
-   Top plane: y = w
-   Near plane: z = -w
-   Far plane: z = w

## Primitive Clipping

Primitive clipping is a GPU operation that handles geometry that intersects the view frustum boundaries:

1. When a triangle (or other primitive) crosses any frustum plane, the GPU:

    - Calculates the exact intersection points where the primitive crosses the plane
    - Creates new vertices at these intersection points
    - Reconstructs the primitive using these new vertices
    - Discards parts that are outside the frustum

2. Clipping occurs automatically in the GPU pipeline:

    - After the vertex shader transforms vertices to clip space
    - Before perspective division and rasterization
    - Without any explicit programming by the developer

3. Performance implications:
    - Clipping requires additional GPU computation
    - More intersections with frustum planes = more clipping work
    - Complex scenes with many primitives crossing frustum boundaries can experience performance impacts

## Frustum Culling

Frustum culling is a CPU-side optimization technique completely different from clipping:

1. The application checks if an entire object (or group of objects) is completely outside the view frustum
2. If so, it doesn't send that object to the GPU at all
3. This completely bypasses both the vertex processing and clipping stages for those objects

## Key Differences

-   **Clipping** (GPU operation):

    -   Handles individual primitives that intersect frustum planes
    -   Creates new geometry at the intersection points
    -   Is necessary for visual correctness
    -   Happens automatically in the graphics pipeline

-   **Frustum Culling** (CPU optimization):
    -   Works with entire objects or groups of objects
    -   Completely skips rendering objects outside the frustum
    -   Is an optional optimization technique
    -   Must be explicitly implemented by the developer

## Relationship Between Them

-   Good frustum culling reduces the need for extensive clipping
-   They work together: culling prevents invisible objects from being processed, clipping handles partially visible ones
-   Both are essential for optimal performance in complex 3D scenes

An efficient WebGL application needs both:

-   Frustum culling to avoid sending invisible objects to the GPU
-   Clipping to handle objects that are partially visible at the edges of the view

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

Back-face culling and frustum culling are two completely different optimization techniques:

### Back-face Culling

-   **What it does**: Discards polygons that face away from the viewer
-   **How it works**: Uses triangle winding order (clockwise/counter-clockwise) to determine which side faces the camera
-   **Where it happens**: GPU pipeline, after vertices are transformed but before fragment processing
-   **Level of operation**: Works on individual triangles
-   **Purpose**: Avoids processing pixels that would be occluded by the front faces of closed objects

### Frustum Culling

-   **What it does**: Discards entire objects that are completely outside the view frustum
-   **How it works**: Tests object bounds (usually bounding boxes/spheres) against the six frustum planes
-   **Where it happens**: CPU side, before sending draw calls to the GPU
-   **Level of operation**: Works on entire objects or batches
-   **Purpose**: Prevents sending geometry to the GPU that couldn't possibly be visible

They're complementary techniques that operate at different stages and scales in the rendering pipeline. A typical renderer would use both:

1. Frustum culling to avoid sending invisible objects to the GPU
2. Back-face culling to avoid processing invisible polygons on visible objects

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
