# Shadow Techniques in WebGL

Shadow implementation is one of the most important aspects of realistic 3D rendering. This document explores various shadow techniques, from fundamental shadow mapping to advanced methods like cascaded shadow maps and ambient occlusion.

## Shadow Mapping Fundamentals

Shadow mapping is a two-pass technique that determines which surfaces are visible from a light's perspective and uses this information to cast shadows.

### Basic Principle

The core idea behind shadow mapping comes from a fundamental observation about shadows: **A point is in shadow if it can't "see" the light source directly**. This insight allows us to create shadows through a two-pass algorithm:

1. **First Pass (Shadow Pass)**: Render the scene from the light's perspective, storing only depth information. This tells us what surfaces the light can "see" directly.
2. **Second Pass (Regular Pass)**: Render from the camera's perspective, comparing each point's depth from the light's view with the stored shadow map depth.

If a point's depth (from the light's perspective) is greater than what's stored in the shadow map, it means something else is closer to the light - therefore, this point must be in shadow. It's conceptually similar to asking: "Is there something between this point and the light source?"

This elegant approach doesn't require any special knowledge about scene geometry or complex intersection calculations - it works with any 3D scene.

### Implementation

To implement basic shadow mapping in WebGL, you need to:

1. **Create a depth texture and framebuffer:**

```javascript
// Create a framebuffer for the shadow map
const shadowFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);

// Create a depth texture
const shadowDepthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture);

// Set up the texture
const shadowMapSize = 1024; // Typically a power of 2
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.DEPTH_COMPONENT24, // WebGL 2 supports depth textures directly
    shadowMapSize,
    shadowMapSize,
    0,
    gl.DEPTH_COMPONENT,
    gl.UNSIGNED_INT,
    null
);

// Configure texture parameters
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// Attach the depth texture to the framebuffer
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowDepthTexture, 0);

// For a depth-only framebuffer, we need to explicitly tell WebGL we're not using color attachments
gl.drawBuffers([gl.NONE]);
gl.readBuffer(gl.NONE);
```

2. **Shadow pass shaders** - These are simple shaders that only write depth information:

```glsl
// Shadow pass vertex shader
#version 300 es
in vec3 aPosition;

uniform mat4 uLightSpaceMatrix; // projection * view from light's perspective
uniform mat4 uModelMatrix;

void main() {
  // Transform vertex to light space
  gl_Position = uLightSpaceMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
```

```glsl
// Shadow pass fragment shader
#version 300 es
precision highp float;

// No output needed - we only care about depth which is automatically written
out vec4 fragColor;

void main() {
  // The depth is automatically written to the depth buffer
  // We can just output a dummy color since we're not using a color attachment
  fragColor = vec4(1.0);
}
```

3. **Regular rendering pass** - Checks the shadow map to determine if fragments are in shadow:

```glsl
// Fragment shader excerpt for shadow mapping
#version 300 es
precision highp float;

in vec3 vFragPos;
in vec4 vFragPosLightSpace; // Position in light space coordinates

uniform sampler2D uShadowMap;
// ... other uniforms

out vec4 fragColor;

float ShadowCalculation(vec4 fragPosLightSpace) {
  // Perform perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

  // Transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;

  // Get closest depth from light's perspective (using shadow map)
  float closestDepth = texture(uShadowMap, projCoords.xy).r;

  // Get current fragment's depth
  float currentDepth = projCoords.z;

  // Check if fragment is in shadow
  float bias = 0.005; // Adjust based on your scene
  float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;

  // Check if projection is outside the shadow map
  if(projCoords.x < 0.0 || projCoords.x > 1.0 ||
     projCoords.y < 0.0 || projCoords.y > 1.0 ||
     projCoords.z > 1.0) {
    shadow = 0.0;
  }

  return shadow;
}

void main() {
  // ... standard lighting calculations

  // Calculate shadow factor
  float shadow = ShadowCalculation(vFragPosLightSpace);

  // Apply shadow to lighting
  // Ambient light is typically unaffected by shadows
  vec3 lighting = ambient + (1.0 - shadow) * (diffuse + specular);

  fragColor = vec4(lighting * objectColor, 1.0);
}
```

### Common Issues in Basic Shadow Mapping

While ingenious, shadow mapping suffers from several inherent issues that require specific solutions:

1. **Shadow Acne**: These are moiré-like pattern artifacts that appear on surfaces. They occur because of limited depth precision - the shadow map's discrete nature means a surface might incorrectly shadow itself.

    - This happens when the light views a surface at a shallow angle, creating depth precision conflicts
    - Solution: Add a small depth bias when comparing depths (pushing shadows slightly away)

2. **Peter Panning**: When bias is too large, shadows detach from their casters, making objects appear to float above their shadows (like Peter Pan!).

    - This visual discrepancy breaks the connection between objects and their shadows
    - Solution: Find the minimal bias that eliminates acne without causing detachment, or use front-face culling during the shadow pass

3. **Resolution Limitations**: The shadow map has a fixed resolution that must cover the entire visible area from the light's perspective.

    - Distant objects receive the same shadow resolution as close objects, wasting precious resolution
    - When a shadow map covers a large area, individual shadows become pixelated
    - Solution: Use larger shadow maps (performance cost) or techniques like cascaded shadow maps (discussed later)

4. **Hard Shadow Edges**: Basic shadow mapping produces unrealistically hard edges because it's a binary test - points are either fully in shadow or fully lit.
    - Real-world shadows have soft edges due to partial light occlusion and light scattering
    - Solution: Use filtering techniques like PCF or VSM (discussed next)

## PCF and Variance Shadow Maps

### Percentage Closer Filtering (PCF)

PCF improves shadow quality by sampling the shadow map multiple times around the current texel and averaging the results to soften shadow edges.

The name "Percentage Closer Filtering" describes exactly what it does: rather than a binary in/out shadow test, it determines what percentage of nearby samples are in shadow. This creates a gradual transition at shadow edges, simulating the penumbra effect of real-world shadows.

The key insight of PCF is that we can't simply filter the shadow map directly (which would just blur depth values and produce incorrect results). Instead, we must:

1. Sample the shadow map at multiple nearby points
2. Perform the depth comparison for each sample
3. Average the comparison results (not the depth values themselves)

This distinction is crucial - we're filtering the comparison results, not the raw depth data.

#### Implementation

```glsl
float ShadowCalculation(vec4 fragPosLightSpace) {
  // Perspective divide and transform to [0,1]
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  projCoords = projCoords * 0.5 + 0.5;

  float currentDepth = projCoords.z;
  float bias = 0.005;

  // PCF: Sample multiple times around the current position
  float shadow = 0.0;
  vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));

  for(int x = -1; x <= 1; ++x) {
    for(int y = -1; y <= 1; ++y) {
      float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
      shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
    }
  }

  shadow /= 9.0; // Average the samples

  // Check boundaries
  if(projCoords.x < 0.0 || projCoords.x > 1.0 ||
     projCoords.y < 0.0 || projCoords.y > 1.0 ||
     projCoords.z > 1.0) {
    shadow = 0.0;
  }

  return shadow;
}
```

#### Advantages of PCF

-   Relatively simple to implement
-   Creates softer, more realistic shadow edges
-   Can be customized by varying kernel size and sampling pattern

#### Limitations of PCF

-   Performance cost increases with larger kernel sizes
-   Still susceptible to aliasing artifacts
-   Limited softness control without more advanced techniques

### Variance Shadow Maps (VSM)

VSM is an alternative approach that stores the first and second moments (mean and variance) of depth rather than just the depth value itself. It represents a fundamentally different way of thinking about shadow determination.

#### How VSM Works

VSM applies statistical principles to shadow calculation through these key conceptual steps:

1. **Store statistical moments instead of raw depth**:

    - During the shadow pass, store both depth (first moment) and depth-squared (second moment)
    - These two values let us calculate the mean and variance of depth at any point

2. **Apply Chebyshev's inequality**: This mathematical principle allows us to estimate an upper bound on the probability that a point is in shadow:

    - If the current fragment's depth is less than the recorded mean depth, it's definitely lit
    - Otherwise, we use variance to calculate how likely it is to be in shadow

3. **Enable pre-filtering**: The most powerful advantage of VSM is that we can filter the shadow map directly:
    - Normal shadow maps can't be filtered (blurring depth values produces incorrect results)
    - With VSM, we can apply standard texture filtering, blur, and even mipmaps to the shadow map
    - This is possible because the statistical properties (mean and variance) remain valid after filtering

This statistical approach allows for efficient filtering and softer shadows with fewer samples than PCF requires. The trade-off is some light leaking in high-contrast areas, where the statistical model becomes less accurate.

#### Implementation

First, modify the shadow pass to store both moments:

```glsl
// VSM shadow pass fragment shader
#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  // Get linear depth in [0,1] range
  float depth = gl_FragCoord.z;

  // Store depth and depth-squared in the shadow map
  fragColor = vec4(depth, depth * depth, 0.0, 0.0);
}
```

Then, in the rendering pass:

```glsl
float VSMShadowCalculation(vec4 fragPosLightSpace) {
  // Perspective divide and transform to [0,1]
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  projCoords = projCoords * 0.5 + 0.5;

  // Current fragment depth
  float currentDepth = projCoords.z;

  // Sample the shadow map (moments)
  vec2 moments = texture(uShadowMap, projCoords.xy).xy;

  // VSM calculation
  float p = step(currentDepth, moments.x); // 1 if depth is less than mean

  // Calculate variance
  float variance = max(moments.y - moments.x * moments.x, 0.00002);

  // Chebyshev's inequality for upper bound on the probability
  float d = currentDepth - moments.x;
  float pMax = variance / (variance + d * d);

  // Prevent light leaking by using p when fragment is definitely lit
  return p == 1.0 ? 1.0 : max(p, pMax);
}
```

#### Advantages of VSM

-   Allows for pre-filtering of shadow maps (can use hardware mipmapping and bilinear filtering)
-   Generates smoother shadows with less sampling
-   Works well with large blur kernels

#### Limitations of VSM

-   Light leaking issues in high-contrast areas
-   Higher memory requirements (storing two values per texel)
-   Numerical precision issues in some cases

## Cascaded Shadow Maps

Cascaded Shadow Maps (CSM) address the limited resolution problem by using multiple shadow maps with different frustums to cover different depth ranges in the view.

### Core Principle

Cascaded Shadow Maps solve a fundamental limitation of traditional shadow mapping: the inefficient distribution of shadow resolution across the scene. The technique recognizes that nearby objects need more detailed shadows than distant ones, just as our eyes perceive more detail in close objects.

The elegant solution works through these steps:

1. **Split the view frustum into several parts (cascades)**:

    - Divide the camera's view into sections based on distance (near, middle, far)
    - Each cascade covers a specific depth range, with smaller cascades for nearby areas
    - This concentrates shadow resolution where it matters most - close to the viewer

2. **Render a separate shadow map for each cascade**:

    - Each shadow map covers only its portion of the scene
    - Near cascades cover small areas with high detail
    - Far cascades cover large areas with less detail per unit area

3. **Select the appropriate shadow map cascade based on fragment depth**:
    - During rendering, determine which cascade contains each fragment
    - Use the corresponding shadow map for that fragment's shadow test
    - Optionally blend between cascades at boundaries to avoid visible transitions

This approach is analogous to having multiple cameras with different zoom levels all focused on the light's view, each optimized for different distances from the viewer.

### Implementation

First, define cascade splits based on depth:

```javascript
// Calculate logarithmic split depths for cascades
function calculateCascadeSplits(nearClip, farClip, cascadeCount, lambda = 0.5) {
    const splits = [];

    for (let i = 0; i < cascadeCount; i++) {
        const p = (i + 1) / cascadeCount;
        const log = nearClip * Math.pow(farClip / nearClip, p);
        const uniform = nearClip + (farClip - nearClip) * p;

        // Mix log and uniform
        const d = lambda * log + (1 - lambda) * uniform;
        splits.push(d);
    }

    return splits;
}

// Example: 3 cascades with near = 0.1, far = 100
const splits = calculateCascadeSplits(0.1, 100, 3);
```

Next, create shadow maps for each cascade:

```javascript
// Create multiple shadow framebuffers and textures
const cascadeShadowMaps = [];
const cascadeLightMatrices = [];
const SHADOW_MAP_SIZE = 2048;

for (let i = 0; i < 3; i++) {
    const { fbo, texture } = createShadowFramebuffer(gl, SHADOW_MAP_SIZE);
    cascadeShadowMaps.push({ fbo, texture });
}
```

For each frame, calculate view frustum corners for each cascade:

```javascript
// Calculate frustum corners for each cascade
function calculateFrustumCorners(viewMatrix, projectionMatrix, near, far) {
    // Create inverse matrices
    const invViewProj = mat4.multiply(mat4.create(), projectionMatrix, viewMatrix);
    mat4.invert(invViewProj, invViewProj);

    // Frustum corners in NDC space
    const corners = [
        [-1, -1, -1, 1], // Near bottom left
        [1, -1, -1, 1], // Near bottom right
        [1, 1, -1, 1], // Near top right
        [-1, 1, -1, 1], // Near top left
        [-1, -1, 1, 1], // Far bottom left
        [1, -1, 1, 1], // Far bottom right
        [1, 1, 1, 1], // Far top right
        [-1, 1, 1, 1], // Far top left
    ];

    // Transform corners to world space
    return corners.map((corner) => {
        const transformed = vec4.transformMat4(vec4.create(), corner, invViewProj);
        return vec3.scale(vec3.create(), [transformed[0], transformed[1], transformed[2]], 1 / transformed[3]);
    });
}
```

Then, for each cascade, render a shadow map:

```javascript
// For each cascade
for (let i = 0; i < cascadeCount; i++) {
    const nearSplit = i === 0 ? nearClip : splits[i - 1];
    const farSplit = splits[i];

    // Get frustum corners for this cascade
    const frustumCorners = calculateFrustumCorners(viewMatrix, projectionMatrix, nearSplit, farSplit);

    // Calculate orthographic projection that encompasses all corners
    const lightView = calculateLightViewMatrix(lightPos, lightTarget);
    const lightProj = calculateOrthographicProjection(frustumCorners, lightView);

    // Store the combined light matrix for this cascade
    cascadeLightMatrices[i] = mat4.multiply(mat4.create(), lightProj, lightView);

    // Render shadow map for this cascade
    gl.bindFramebuffer(gl.FRAMEBUFFER, cascadeShadowMaps[i].fbo);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Use shadow shader program
    gl.useProgram(shadowProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, 'uLightSpaceMatrix'), false, cascadeLightMatrices[i]);

    // Draw scene
    renderScene(shadowProgram);
}
```

Finally, select the appropriate cascade in the fragment shader:

```glsl
// Fragment shader with CSM
#version 300 es
precision highp float;

// Fragment position in view space
in vec3 vFragPosViewSpace;

// Fragment position in world space
in vec3 vFragPosWorldSpace;

// Cascade shadow maps
uniform sampler2D uShadowMaps[3];

// Light matrices for each cascade
uniform mat4 uLightMatrices[3];

// Cascade splits in view space
uniform float uCascadeSplits[3];

// Determine which cascade to use
int getCascadeIndex(float viewSpaceZ) {
  // Convert to absolute depth (positive value)
  float absZ = abs(viewSpaceZ);

  for (int i = 0; i < 3; i++) {
    if (absZ < uCascadeSplits[i]) {
      return i;
    }
  }

  return 2; // Use the last cascade if beyond all splits
}

float ShadowCalculation() {
  // Get cascade index based on view space depth
  int cascadeIndex = getCascadeIndex(vFragPosViewSpace.z);

  // Get light space position for the selected cascade
  vec4 fragPosLightSpace = uLightMatrices[cascadeIndex] * vec4(vFragPosWorldSpace, 1.0);

  // Perform perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

  // Transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;

  // Get depth of current fragment from light's perspective
  float currentDepth = projCoords.z;

  // Sample the shadow map
  float closestDepth = texture(uShadowMaps[cascadeIndex], projCoords.xy).r;

  // Check if in shadow
  float bias = 0.005;
  float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;

  // Debug: visualize cascades with different colors
  // if (cascadeIndex == 0) return shadow * 0.5;
  // if (cascadeIndex == 1) return shadow * 0.75;
  // return shadow;

  return shadow;
}
```

### Advantages of CSM

-   Efficient use of shadow map resolution
-   High-quality shadows for both near and far objects
-   Can be combined with other techniques like PCF for better quality

### Challenges and Optimizations

1. **Cascade Transitions**: Visible "seams" can appear at cascade boundaries

    - Solution: Blend between cascades in the transition zones

2. **Performance Cost**: Rendering multiple shadow maps increases overhead

    - Optimization: Use fewer cascades for simple scenes or lower-quality settings

3. **Storage Requirements**: Multiple shadow maps consume more texture memory
    - Optimization: Use a texture array in WebGL 2 instead of separate textures

## Shadow Volumes

Shadow volumes provide an alternative approach to shadow mapping by using actual 3D geometry to define the volume of space that lies in shadow. Unlike image-based techniques like shadow mapping, shadow volumes are an object-space approach.

### Core Principle

The shadow volume algorithm relies on the mathematical concept that a point is in shadow if any ray from that point to the light source intersects an object. This leads to a geometric implementation:

1. **Construct shadow volumes**:

    - For each shadow-casting object, identify its silhouette edges (edges where a face facing the light meets a face facing away)
    - Extrude these edges away from the light, potentially to infinity, creating a volume
    - This volume precisely encloses all the space that should be in shadow

2. **Use the stencil buffer as a counter**:

    - Initially set all stencil values to 0
    - Render the shadow volumes (not to the color buffer, only to the stencil buffer)
    - Increment the stencil value when entering a shadow volume (front face)
    - Decrement when exiting (back face)

3. **Determine shadow from stencil values**:
    - After processing all shadow volumes, points with a stencil value of 0 are outside all shadows
    - Points with non-zero values are inside at least one shadow volume

The key insight is that if we shoot a ray from the camera to any point in the scene, the number of shadow volume boundaries it crosses determines if that point is in shadow. This elegant mathematical property creates pixel-perfect shadows with no resolution-dependent artifacts.

### Stencil Shadow Volume Implementation

The technique often uses the Stencil Shadow Volume algorithm (also known as Carmack's Reverse):

```javascript
// Pseudo-code for stencil shadow volumes
function renderWithShadowVolumes(gl, scene, lights) {
    // 1. Render scene from camera's view with only ambient lighting
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    renderScene(ambientOnlyShader);

    // 2. For each light, render shadow volumes into stencil buffer
    gl.colorMask(false, false, false, false); // Don't write to color buffer
    gl.depthMask(false); // Don't write to depth buffer

    for (const light of lights) {
        // Clear stencil buffer
        gl.clear(gl.STENCIL_BUFFER_BIT);

        // First pass: increment stencil when front faces are drawn
        gl.stencilFunc(gl.ALWAYS, 0, 0xff);
        gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
        gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.DECR_WRAP);

        // Render shadow volumes
        for (const object of scene.shadowCasters) {
            // Generate shadow volume for this object and light
            const shadowVolume = generateShadowVolume(object, light);
            renderShadowVolume(shadowVolume);
        }

        // 3. Render lighting only where stencil is zero (not in shadow)
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.EQUAL, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        // Render scene with this light's contribution
        renderScene(lightingShader, light);
    }

    // Restore state
    gl.depthMask(true);
}
```

The key part is generating the shadow volume:

```javascript
function generateShadowVolume(object, light) {
    const shadowVolume = { vertices: [], indices: [] };

    // Get silhouette edges (edges where one face faces the light and one faces away)
    const silhouetteEdges = findSilhouetteEdges(object, light.position);

    // For each silhouette edge, create a quad extending to infinity
    for (const edge of silhouetteEdges) {
        // Get the two vertices of this edge
        const v1 = object.vertices[edge[0]];
        const v2 = object.vertices[edge[1]];

        // Calculate direction from light to vertices
        const lightToV1 = vec3.subtract(vec3.create(), v1, light.position);
        const lightToV2 = vec3.subtract(vec3.create(), v2, light.position);

        // Normalize and scale to "infinity" (large number)
        vec3.normalize(lightToV1, lightToV1);
        vec3.normalize(lightToV2, lightToV2);
        vec3.scale(lightToV1, lightToV1, INFINITY_SCALE);
        vec3.scale(lightToV2, lightToV2, INFINITY_SCALE);

        // Add extruded points
        const v1Ext = vec3.add(vec3.create(), v1, lightToV1);
        const v2Ext = vec3.add(vec3.create(), v2, lightToV2);

        // Add vertices and create quad
        const baseIndex = shadowVolume.vertices.length;
        shadowVolume.vertices.push(v1, v2, v1Ext, v2Ext);
        shadowVolume.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 1, baseIndex + 3, baseIndex + 2);
    }

    // Cap the shadow volume (add original object's faces that face away from light)
    // ... (implementation details)

    return shadowVolume;
}
```

### Advantages of Shadow Volumes

-   Pixel-perfect shadows (no resolution-dependent artifacts)
-   No shadow acne or bias problems
-   Works well with any light type
-   Correct self-shadowing

### Limitations of Shadow Volumes

-   Complex to implement correctly
-   Performance scales with geometric complexity and number of silhouette edges
-   Can be inefficient for complex scenes with many shadow casters
-   Requires robust silhouette edge detection

## Contact Shadows and Ambient Occlusion

Contact shadows and ambient occlusion represent local shadowing techniques that improve visual quality, especially for close-up details. These techniques add critical depth cues that significantly enhance scene realism.

### Screen-Space Contact Shadows

Screen-space contact shadows address a common limitation of shadow mapping: the inability to capture small, detailed shadows due to resolution constraints. They operate on a simple but powerful idea:

1. **Ray march from surface points in the light direction**:

    - Start at each visible surface point
    - Take small steps in the direction of the light
    - Project each step position back to screen space

2. **Check for intersections with scene geometry**:

    - Compare the depth at each step with the scene depth at that screen position
    - If we hit geometry (our ray's depth is greater than the stored depth), we've found an occluder
    - This indicates a shadow should be cast

3. **Add high-fidelity local shadows**:
    - These fine contact shadows add crucial visual cues, especially in crevices and where objects meet
    - They enhance the perception of contact between objects, grounding them in the scene
    - They're particularly effective for shadows that would be missed by regular shadow maps

The beauty of this technique is that it can capture extremely small shadow details using the full screen resolution, regardless of the shadow map resolution.

```glsl
// Fragment shader excerpt for contact shadows
float CalculateContactShadow(vec3 position, vec3 lightDir, float maxDistance) {
  const int STEPS = 16;
  const float STEP_SIZE = 0.05; // Adjusted based on scene scale

  // Calculate ray in view space
  vec3 ray = lightDir * STEP_SIZE;
  vec3 currentPos = position;

  // Ray march along light direction
  for (int i = 0; i < STEPS; i++) {
    // Step along ray
    currentPos += ray;

    // Project to screen space
    vec4 samplePos = uProjectionMatrix * vec4(currentPos, 1.0);
    samplePos.xyz /= samplePos.w;
    vec2 sampleUV = samplePos.xy * 0.5 + 0.5;

    // Sample depth at this position
    float sampledDepth = texture(uDepthTexture, sampleUV).r;
    sampledDepth = linearizeDepth(sampledDepth);

    // Current projected depth
    float currentDepth = samplePos.z * 0.5 + 0.5;
    currentDepth = linearizeDepth(currentDepth);

    // Check for intersection (object closer to camera than expected)
    if (currentDepth > sampledDepth + 0.01) {
      return 1.0; // In shadow
    }

    // Exit if we've gone too far
    if (length(currentPos - position) > maxDistance) {
      break;
    }
  }

  return 0.0; // Not in shadow
}
```

### Screen-Space Ambient Occlusion (SSAO)

SSAO approximates how much ambient light reaches a surface based on surrounding geometry, creating subtle shadowing in corners and crevices. It's based on the observation that ambient light reaches points differently depending on how occluded they are by nearby geometry.

#### The Concept Behind SSAO

SSAO simulates an important aspect of global illumination: ambient light tends to reach exposed surfaces more than it reaches corners, crevices, and areas surrounded by other geometry. This creates subtle but critical shadowing that significantly improves depth perception.

The algorithm simulates this by:

1. **Sampling the hemisphere around each point**:

    - Generate semi-random sample points in a hemisphere oriented along the surface normal
    - These samples represent potential directions from which ambient light could arrive

2. **Testing for occlusion from surrounding geometry**:

    - For each sample point, check if it's inside other geometry by comparing depths
    - Closer samples contribute more to occlusion than distant ones
    - Samples outside the view frustum are ignored (a limitation of screen-space techniques)

3. **Calculating an occlusion factor**:
    - More occluded points receive less ambient light
    - This creates darkening in corners, under objects, and between close surfaces
    - The effect subtly enhances the perception of depth and object relationships

What makes SSAO particularly useful is that it only affects ambient lighting, not direct lighting. This means shadows from direct lights remain sharp and well-defined, while SSAO adds subtle depth cues throughout the scene.

#### Core SSAO Implementation

```glsl
// SSAO fragment shader
#version 300 es
precision highp float;

uniform sampler2D uPositionTexture; // View-space positions
uniform sampler2D uNormalTexture;   // View-space normals
uniform sampler2D uNoiseTexture;    // Random rotation texture
uniform vec3 uSamples[64];          // Hemisphere samples
uniform mat4 uProjectionMatrix;
uniform float uRadius;
uniform float uBias;
uniform vec2 uNoiseScale;           // Screen space scaling for noise texture

in vec2 vTexCoord;
out float fragColor;                // Occlusion factor

void main() {
  // Get position and normal from G-buffer
  vec3 position = texture(uPositionTexture, vTexCoord).xyz;
  vec3 normal = normalize(texture(uNormalTexture, vTexCoord).xyz);

  // Get random rotation vector
  vec3 randomVec = texture(uNoiseTexture, vTexCoord * uNoiseScale).xyz;

  // Create TBN matrix
  vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
  vec3 bitangent = cross(normal, tangent);
  mat3 TBN = mat3(tangent, bitangent, normal);

  // Calculate occlusion factor
  float occlusion = 0.0;

  for (int i = 0; i < 64; i++) {
    // Transform sample to view space
    vec3 sample = TBN * uSamples[i];
    sample = position + sample * uRadius;

    // Project sample to screen space
    vec4 offset = vec4(sample, 1.0);
    offset = uProjectionMatrix * offset;
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5;

    // Sample depth at this location
    float sampleDepth = texture(uPositionTexture, offset.xy).z;

    // Range check
    float rangeCheck = smoothstep(0.0, 1.0, uRadius / abs(position.z - sampleDepth));

    // Check if sample point is occluded
    occlusion += (sampleDepth >= sample.z + uBias ? 1.0 : 0.0) * rangeCheck;
  }

  // Average and invert (1.0 = no occlusion, 0.0 = fully occluded)
  occlusion = 1.0 - (occlusion / 64.0);

  fragColor = occlusion;
}
```

#### Generating Sample Kernel

```javascript
function generateSSAOKernel(sampleCount = 64) {
    const kernel = [];

    for (let i = 0; i < sampleCount; i++) {
        // Create sample in hemisphere
        const sample = [Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random()];

        // Normalize
        const length = Math.sqrt(sample[0] * sample[0] + sample[1] * sample[1] + sample[2] * sample[2]);

        sample[0] /= length;
        sample[1] /= length;
        sample[2] /= length;

        // Scale samples to distribute more samples closer to origin
        let scale = i / sampleCount;
        scale = 0.1 + scale * scale * 0.9; // lerp(0.1, 1.0, scale²)

        sample[0] *= scale;
        sample[1] *= scale;
        sample[2] *= scale;

        kernel.push(...sample);
    }

    return new Float32Array(kernel);
}
```

#### Creating a Noise Texture

```javascript
function createSSAONoiseTexture(gl) {
    // Create random rotation vectors (16 vectors)
    const noiseSize = 4; // 4x4 texture
    const noiseData = new Float32Array(noiseSize * noiseSize * 3);

    for (let i = 0; i < noiseSize * noiseSize; i++) {
        // Random vectors on XY plane (rotation around Z)
        noiseData[i * 3] = Math.random() * 2.0 - 1.0;
        noiseData[i * 3 + 1] = Math.random() * 2.0 - 1.0;
        noiseData[i * 3 + 2] = 0.0;
    }

    // Create texture
    const noiseTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, noiseSize, noiseSize, 0, gl.RGB, gl.FLOAT, noiseData);

    // Set up texture for tiling
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    return noiseTexture;
}
```

#### Post-Processing for SSAO

```javascript
// Blur the SSAO result to reduce noise
function blurSSAO(gl, ssaoTexture, width, height) {
    // Bind blur framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO);
    gl.viewport(0, 0, width, height);

    // Clear
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use blur shader
    gl.useProgram(blurProgram);

    // Bind SSAO texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ssaoTexture);
    gl.uniform1i(gl.getUniformLocation(blurProgram, 'uSSAOInput'), 0);

    // Draw full-screen quad
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Return the blurred texture
    return blurTexture;
}
```

### Advantages of Contact Shadows and SSAO

-   Adds critical small-scale occlusion cues
-   Improves perception of scene depth and object relationships
-   Works well in combination with other shadow techniques
-   SSAO is relatively computationally efficient for the visual improvement it provides

### Limitations and Optimizations

1. **Screen-space limitations**: Can't account for off-screen geometry

    - Optimization: Use wider camera frustum for shadow calculations

2. **Performance considerations**:

    - Reduce sample count for performance-critical applications
    - Apply at half or quarter resolution and upscale
    - Use temporal accumulation to distribute samples across frames

3. **Integration with other shadow techniques**:
    - Apply ambient occlusion only to ambient lighting term
    - Combine with shadow mapping for both local and global shadowing

## Combining Multiple Shadow Techniques

Real-world applications often combine multiple shadow techniques for the best visual results:

1. **Shadow maps for global shadows**: Use CSM for distant shadows from primary lights
2. **Contact shadows for details**: Add fine detail in areas where shadow maps lack resolution
3. **SSAO for ambient lighting**: Apply to ambient term for improved scene depth
4. **Shadow volumes for special cases**: Use for specific objects requiring pixel-perfect shadows

### Example: Combined Shadow Pipeline

```javascript
function renderWithCombinedShadows(scene, camera, lights) {
    // 1. Render shadow maps for main directional light (CSM)
    renderCascadedShadowMaps(scene, mainLight);

    // 2. Render scene to G-buffer for deferred shading
    renderSceneToGBuffer(scene, camera);

    // 3. Compute SSAO
    const ssaoTexture = computeSSAO(gBuffer.position, gBuffer.normal);
    const blurredSSAO = blurSSAO(ssaoTexture);

    // 4. Perform lighting with shadows
    renderLighting(gBuffer, cascadeShadowMaps, blurredSSAO, lights);

    // 5. Apply post-processing effects
    applyPostProcessing(renderTarget);
}
```

## Conclusion

Shadow techniques have evolved significantly, from basic shadow mapping to sophisticated combinations of global and local shadowing. Each approach has its strengths and optimal use cases:

-   **Shadow Mapping**: Efficient, versatile, and the foundation of most real-time shadow systems
-   **PCF and VSM**: Essential filtering techniques for higher quality shadow edges
-   **Cascaded Shadow Maps**: Crucial for large outdoor environments with distant shadows
-   **Shadow Volumes**: Useful for specific cases requiring pixel-perfect accuracy
-   **Contact Shadows and SSAO**: Vital for close-range visual quality and scene grounding

The right shadow implementation for your WebGL application depends on the specific requirements, performance constraints, and visual goals. Often, a combination of techniques yields the best results, with cascaded shadow maps handling the global lighting, contact shadows adding detail, and SSAO providing subtle ambient occlusion cues.
