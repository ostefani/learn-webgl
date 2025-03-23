# Multi-Pass Rendering in WebGL 2

## Introduction

Multi-pass rendering refers to techniques that render a scene multiple times in different ways before producing the final image. Each pass serves a specific purpose and builds upon the results of previous passes. Unlike single-pass rendering, which computes all lighting and effects in one step, multi-pass rendering separates complex operations into manageable stages, enabling sophisticated visual effects that would otherwise be computationally prohibitive.

### The Conceptual Shift

At its core, multi-pass rendering represents a fundamental shift in how we think about computer graphics. Traditional rendering attempts to compute everything at once - geometry, lighting, shadows, reflections - in a single calculation per pixel. This mirrors how we initially think about images: as complete, unified entities.

However, photography and film production have long understood that creating compelling images often requires decomposing them into layers, passes, and channels that are captured or processed separately before being combined. Multi-pass rendering brings this same philosophy to real-time graphics.

The key insight is that by breaking down complex rendering problems into simpler, focused steps, we can:

1. **Solve problems that are computationally intractable in a single pass**
2. **Reuse intermediate results** across multiple calculations
3. **Apply effects that depend on the complete scene** rather than just local geometry
4. **Better utilize the parallel processing power of GPUs**

In WebGL 2, multi-pass rendering is primarily implemented using Framebuffer Objects (FBOs), which allow rendering to textures instead of directly to the screen. These techniques form the foundation of modern real-time graphics, enabling advanced effects like shadows, reflections, ambient occlusion, post-processing, and physically-based lighting.

## Framebuffer Objects (FBOs) in Depth

### What are FBOs?

A Framebuffer Object (FBO) represents one of the most powerful conceptual tools in modern graphics programming: the ability to render to texture rather than directly to screen. This capability fundamentally transforms the rendering pipeline from a one-way street into a network where output can become input for subsequent passes.

Conceptually, an FBO is a collection point for rendering results - a virtual "canvas" that captures what would normally be displayed on screen. It serves as a container for attachments, which can include:

-   **Color Attachments**: Store color information (typically as textures)
-   **Depth Attachments**: Store depth information for depth testing
-   **Stencil Attachments**: Store stencil values for stencil testing

When you render to an FBO instead of the screen, you're essentially taking a "snapshot" of your scene from a particular view, with particular properties, to use later in your rendering process. This concept mirrors how photographers might take multiple exposures or use different filters to later compose a final image.

This capability enables three fundamental categories of techniques in modern 3D graphics:

-   **New Viewpoints**: Rendering scenes from different perspectives (shadow maps, reflections, portals)
-   **Image Processing**: Manipulating already-rendered images (post-processing, filters)
-   **Deferred Calculations**: Storing geometric/material data to use later (deferred rendering)

### FBO Structure and Creation

Creating an FBO involves several conceptual steps:

1. Create a container (the framebuffer itself)
2. Create destinations for the rendered outputs (textures or renderbuffers)
3. Attach these destinations to specific attachment points in the container
4. Verify that the configuration is valid for rendering

```javascript
// Create framebuffer
const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

// Create and attach a texture for color information
const colorTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, colorTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    gl.RGBA, // internal format
    width,
    height, // dimensions
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    null // data (null for empty texture)
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    colorTexture,
    0 // mip level
);

// Create and attach a renderbuffer for depth information
const depthRenderBuffer = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);

// Check if framebuffer is complete
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer incomplete');
}
```

### Texture vs. Renderbuffer Attachments

WebGL 2 allows two types of attachments for FBOs, each serving a different conceptual purpose:

1. **Texture Attachments**:

    - **Primary purpose**: Store rendering results that need to be read later
    - **Key concept**: Versatile but sometimes less efficient
    - **Analogous to**: Taking a photo that you'll edit later
    - Can be sampled in shaders
    - Support various formats (including floating-point in WebGL 2)
    - Ideal for render-to-texture scenarios and when results need to be read

2. **Renderbuffer Attachments**:
    - **Primary purpose**: Store rendering data that only needs to exist during rendering
    - **Key concept**: More efficient but less flexible
    - **Analogous to**: A painter's palette - useful while working but not part of the final image
    - More efficient when you don't need to read the data in shaders
    - Often used for depth and stencil attachments
    - Cannot be directly sampled in shaders

The choice between them resembles deciding whether you need to save your work at an intermediate stage (textures) or are just using it temporarily to help create the final result (renderbuffers).

### Multiple Render Targets (MRTs)

One of the most powerful concepts in modern rendering is the ability to output multiple pieces of information simultaneously from a single rendering pass. This is called Multiple Render Targets (MRTs), and it's conceptually similar to a printer that can print several different pages at once, each with different information.

In traditional rendering, a fragment shader outputs a single color. With MRTs, a single shader pass can output various types of data to different textures - positions, normals, material properties, etc. This is crucial for techniques like deferred rendering where we want to capture multiple properties of each visible surface in a single geometry pass.

```javascript
// Create multiple color attachments
const colorTextures = [];
for (let i = 0; i < 4; i++) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
    colorTextures.push(texture);
}

// Tell WebGL which attachments to draw to
gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
```

In fragment shaders, you define outputs for each attachment:

```glsl
#version 300 es
precision highp float;

// Multiple outputs
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outNormal;
layout(location = 2) out vec4 outPosition;
layout(location = 3) out vec4 outMaterial;

void main() {
  outColor = vec4(1.0, 0.0, 0.0, 1.0);      // Color
  outNormal = vec4(normal * 0.5 + 0.5, 1.0); // Encoded normal
  outPosition = vec4(worldPos, 1.0);         // World position
  outMaterial = vec4(metallic, roughness, ao, 1.0); // Material properties
}
```

### Common FBO Formats and Considerations

WebGL 2 supports various texture formats, each designed for specific needs. Choosing the right format is like selecting the right film type in photography:

-   **Standard formats**: `gl.RGBA8`, `gl.RGB8` - Good for general color storage, like standard photo film
-   **High precision**: `gl.RGBA16F`, `gl.RGBA32F` - For HDR rendering and calculations, like specialized high-dynamic-range photography
-   **Depth formats**: `gl.DEPTH_COMPONENT24`, `gl.DEPTH24_STENCIL8` - For depth attachments, like a depth sensor
-   **Specialized formats**: `gl.R11F_G11F_B10F` - Optimized for specific cases, like custom scientific instruments

Selecting appropriate formats is crucial for performance and memory consumption, just as choosing the right medium is important in traditional arts.

## Render-to-Texture Techniques

### Basic Render-to-Texture Workflow

Render-to-texture is a foundational concept that enables most advanced rendering techniques. At its core, it represents the ability to capture a "virtual photograph" of your scene, which can then be used as an input for further rendering.

This powerful capability fundamentally changes how we approach rendering problems. Instead of being limited to rendering directly to the screen, we can:

1. Render scenes from different viewpoints
2. Capture intermediate stages of complex effects
3. Process image data in multiple steps
4. Store specialized information for later use

The standard render-to-texture workflow follows these conceptual steps:

1. **Create and bind an FBO** - Set up your "virtual camera" to capture the scene
2. **Render the scene** to the FBO - Take the "photograph"
3. **Unbind the FBO** - Return to rendering to the real screen
4. **Use the generated texture** - Apply the captured image as input for another rendering pass

```javascript
// First pass: Render to texture
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.viewport(0, 0, textureWidth, textureHeight);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// Draw scene
drawScene(sceneShader);

// Second pass: Use the rendered texture
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.viewport(0, 0, canvasWidth, canvasHeight);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

gl.useProgram(effectShader);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, colorTexture);
gl.uniform1i(gl.getUniformLocation(effectShader, 'u_texture'), 0);

// Draw full-screen quad to apply effect
drawFullScreenQuad();
```

### Dynamic Scene Capture

One of the most compelling applications of render-to-texture is capturing parts of your scene dynamically for use within the same scene. This enables visual effects that would be impossible otherwise, creating a richer, more immersive environment.

Conceptually, this is similar to how movies use screens-within-screens or mirrors to show different perspectives:

-   **Reflections**: Render the scene from a reflected viewpoint, creating realistic mirror or water reflections
-   **Portals**: Render what's visible through a portal or window, allowing glimpses into different locations
-   **Security Cameras**: Create in-game monitors showing other parts of the scene, enhancing immersion

Each of these effects fundamentally works by temporarily shifting the virtual camera to a new position or orientation, capturing what it sees, and then using that capture as a texture within the main view.

### Ping-Pong Rendering

Some effects require iterative processing, where the output of one step becomes the input to the next. This is conceptually similar to a chef who repeatedly transforms an ingredient - marinating, then cooking, then seasoning - with each step building on the previous one.

In computer graphics, this iterative approach is implemented using a technique called ping-pong rendering, where we alternate between two framebuffers:

```javascript
// Create two framebuffers with textures
const fboA = createFramebuffer(gl, width, height);
const fboB = createFramebuffer(gl, width, height);
let sourceTexture = inputTexture;
let sourceFBO = fboA;
let destFBO = fboB;

// Perform multiple passes, swapping source and destination
for (let i = 0; i < iterationCount; i++) {
    // Bind destination framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, destFBO);
    gl.viewport(0, 0, width, height);

    // Use source texture as input
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(iterativeShader, 'u_texture'), 0);

    // Draw full-screen quad to apply effect
    drawFullScreenQuad();

    // Swap source and destination for next iteration
    const tempFBO = sourceFBO;
    sourceFBO = destFBO;
    destFBO = tempFBO;
    sourceTexture = sourceFBO.texture;
}
```

This technique is essential for effects like:

-   **Gaussian blur**: Achieving natural-looking blur by multiple blur passes
-   **Water simulation**: Updating water physics in steps for realistic flow
-   **Particle systems**: Evolving particle positions and behaviors over time
-   **Iterative algorithms**: Any effect that improves with repeated application

The key concept is that each iteration refines the result, like layers of paint building up a final image.

## Post-Processing Effects Chain

Post-processing has revolutionized real-time graphics by bringing film and photography techniques into the 3D rendering pipeline. These effects operate on the already-rendered image rather than on the 3D geometry itself.

This conceptual shift is powerful because:

1. It separates visual styling from scene geometry
2. It allows for effects that consider the entire image
3. It mimics how cameras, films, and photo editing create compelling images

### Setting Up a Post-Processing Pipeline

A flexible post-processing system manages a sequence of effects, similar to how photo editors use adjustment layers or how film is processed through multiple chemical baths:

```javascript
class PostProcessor {
    constructor(gl, width, height) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.effects = [];

        // Create ping-pong FBOs
        this.fboA = createFramebuffer(gl, width, height);
        this.fboB = createFramebuffer(gl, width, height);

        // Create shared full-screen quad for all effects
        this.quadVAO = createFullScreenQuad(gl);
    }

    addEffect(name, shader, uniforms = {}) {
        this.effects.push({ name, shader, uniforms });
    }

    process(inputTexture) {
        const gl = this.gl;

        // If no effects, return input texture
        if (this.effects.length === 0) return inputTexture;

        let sourceTexture = inputTexture;
        let sourceFBO = this.fboA;
        let destFBO = this.fboB;

        // Process each effect in sequence
        for (let i = 0; i < this.effects.length; i++) {
            const effect = this.effects[i];
            const isLastEffect = i === this.effects.length - 1;

            // Last effect renders to canvas, others to destination FBO
            if (isLastEffect) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, destFBO);
            }

            gl.viewport(0, 0, this.width, this.height);

            // Use effect shader
            gl.useProgram(effect.shader);

            // Bind source texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
            gl.uniform1i(gl.getUniformLocation(effect.shader, 'u_texture'), 0);

            // Set any additional uniforms for this effect
            for (const [name, value] of Object.entries(effect.uniforms)) {
                setUniform(gl, effect.shader, name, value);
            }

            // Draw full-screen quad
            gl.bindVertexArray(this.quadVAO);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // If not the last effect, prepare for next iteration
            if (!isLastEffect) {
                // Swap FBOs for next effect
                const tempFBO = sourceFBO;
                sourceFBO = destFBO;
                destFBO = tempFBO;
                sourceTexture = sourceFBO.texture;
            }
        }

        // Return the texture containing the final result
        return sourceTexture;
    }
}
```

The key insight here is that each effect is a transformation applied to the entire image, with effects building on each other to create a rich visual result. This chains together simple operations to achieve complex looks, similar to how Instagram filters combine multiple adjustments into a single visual style.

### Common Post-Processing Effects

#### 1. Gaussian Blur

Gaussian blur is based on the bell-shaped statistical distribution and creates natural-looking blur by:

1. Weighting pixels by their distance from the center using a Gaussian distribution
2. Separating horizontal and vertical blur for efficiency
3. Using multiple samples with carefully calculated weights

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_textureSize;
uniform vec2 u_direction; // (1,0) for horizontal, (0,1) for vertical

out vec4 fragColor;

void main() {
  vec2 texelSize = 1.0 / u_textureSize;
  // Gaussian kernel weights (approximated)
  float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  vec3 result = texture(u_texture, v_texCoord).rgb * weights[0];

  for(int i = 1; i < 5; i++) {
    vec2 offset = u_direction * texelSize * float(i);
    result += texture(u_texture, v_texCoord + offset).rgb * weights[i];
    result += texture(u_texture, v_texCoord - offset).rgb * weights[i];
  }

  fragColor = vec4(result, 1.0);
}
```

#### 2. Bloom Effect

Bloom creates the glow around bright objects that's seen in photography, film, and human vision. It simulates light scattering in the eye and camera lenses by:

1. Extracting bright areas from the image
2. Blurring these bright areas
3. Adding the blurred brightness back to the original image

```javascript
// Add bloom to post-processing chain
postProcessor.addEffect('brightness', brightnessFilterShader, { threshold: 0.7 });
postProcessor.addEffect('blurH', blurShader, { direction: [1, 0] });
postProcessor.addEffect('blurV', blurShader, { direction: [0, 1] });
postProcessor.addEffect('combine', combineShader, { originalTexture: sceneTexture });
```

The combination shader blends the original image with the blurred bright areas:

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture; // Blurred bright areas
uniform sampler2D u_originalTexture; // Original scene
uniform float u_bloomStrength;

out vec4 fragColor;

void main() {
  vec3 bloomColor = texture(u_texture, v_texCoord).rgb;
  vec3 originalColor = texture(u_originalTexture, v_texCoord).rgb;

  // Add bloom to original
  vec3 finalColor = originalColor + bloomColor * u_bloomStrength;

  fragColor = vec4(finalColor, 1.0);
}
```

#### 3. Tone Mapping

Tone mapping bridges the gap between high dynamic range (HDR) rendering and standard display capabilities, similar to how photographers adapt high-contrast scenes to work in print. It compresses the wide range of light intensities into a displayable range while preserving as much detail as possible.

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_exposure;

out vec4 fragColor;

void main() {
  vec3 hdrColor = texture(u_texture, v_texCoord).rgb;

  // Reinhard tone mapping
  vec3 mapped = vec3(1.0) - exp(-hdrColor * u_exposure);

  // Gamma correction
  mapped = pow(mapped, vec3(1.0 / 2.2));

  fragColor = vec4(mapped, 1.0);
}
```

## Deferred Rendering & Deferred Lighting

Deferred rendering represents a fundamental paradigm shift in how lighting is calculated in complex scenes. Instead of calculating lighting as we render geometry (forward rendering), deferred rendering:

1. **First captures geometric and material data** (positions, normals, colors, material properties)
2. **Then calculates lighting** using this data in a separate pass

The key insight is that this approach only calculates expensive lighting for visible pixels, rather than for all geometry (much of which may be occluded). It separates the question of "what surfaces are visible?" from "how are these surfaces lit?"

This separation is conceptually similar to how a photographer might first compose and capture an image, then adjust the exposure and lighting in post-processing.

### G-Buffer Structure

The Geometry Buffer (G-buffer) is the collection of textures that stores the intermediate scene data. Think of it as capturing different "channels" of information about the visible surfaces, similar to how photographers might capture color, infrared, and depth separately.

A typical G-buffer includes:

1. **Position buffer**: World or view-space position of each fragment (where is this pixel in 3D space?)
2. **Normal buffer**: Surface normal vectors (which direction does this surface face?)
3. **Albedo buffer**: Diffuse/base color (what color is this surface?)
4. **Material properties**: Metallic, roughness, ambient occlusion, etc. (how does this surface respond to light?)

Each of these represents a different aspect of the visible geometry, separated so that the lighting pass can use precisely the data it needs.

### G-Buffer Creation

```javascript
// Create framebuffer
const gBuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);

// Create G-buffer textures
const positions = createTexture(gl, width, height, gl.RGBA16F); // High precision for positions
const normals = createTexture(gl, width, height, gl.RGBA16F); // High precision for normals
const albedo = createTexture(gl, width, height, gl.RGBA8); // Standard precision for colors
const material = createTexture(gl, width, height, gl.RGBA8); // Material properties
const depthTexture = createDepthTexture(gl, width, height); // Depth buffer

// Attach textures to framebuffer
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, positions, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normals, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, albedo, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, material, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

// Set draw buffers
gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
```

### Geometry Pass

In the first pass, we render each object in the scene, but instead of calculating lighting, we output its geometric and material properties to the G-buffer. This records the "what" of our scene without yet dealing with the "how it's lit" question:

```glsl
#version 300 es
precision highp float;

// Input from vertex shader
in vec3 v_position;
in vec3 v_normal;
in vec2 v_texCoord;

// Material uniforms
uniform sampler2D u_albedoMap;
uniform sampler2D u_metallicRoughnessMap;
uniform sampler2D u_normalMap;

// G-buffer outputs
layout(location = 0) out vec4 g_position;
layout(location = 1) out vec4 g_normal;
layout(location = 2) out vec4 g_albedo;
layout(location = 3) out vec4 g_material;

void main() {
  // Get material properties from textures
  vec4 albedo = texture(u_albedoMap, v_texCoord);
  vec2 metallicRoughness = texture(u_metallicRoughnessMap, v_texCoord).rg;
  vec3 normal = normalize(v_normal);

  // Apply normal mapping if needed
  // [normal mapping code would go here]

  // Output to G-buffer
  g_position = vec4(v_position, 1.0);
  g_normal = vec4(normal * 0.5 + 0.5, 1.0); // Pack normal to [0,1] range
  g_albedo = vec4(albedo.rgb, 1.0);
  g_material = vec4(metallicRoughness.r, metallicRoughness.g, 0.0, 1.0);
}
```

### Lighting Pass

In the second pass, we utilize the G-buffer to calculate lighting for each pixel. This process examines each visible pixel (rather than each 3D triangle), retrieves its properties from the G-buffer, and applies lighting calculations:

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;

// G-buffer textures
uniform sampler2D u_positions;
uniform sampler2D u_normals;
uniform sampler2D u_albedo;
uniform sampler2D u_material;

// Light information
uniform vec3 u_lightPositions[16];
uniform vec3 u_lightColors[16];
uniform int u_lightCount;
uniform vec3 u_viewPos;

out vec4 fragColor;

// PBR lighting functions would be defined here

void main() {
  // Retrieve data from G-buffer
  vec3 position = texture(u_positions, v_texCoord).rgb;
  vec3 normal = texture(u_normals, v_texCoord).rgb * 2.0 - 1.0; // Unpack from [0,1] to [-1,1]
  vec3 albedo = texture(u_albedo, v_texCoord).rgb;
  vec2 material = texture(u_material, v_texCoord).rg;
  float metallic = material.r;
  float roughness = material.g;

  // Calculate lighting
  vec3 viewDir = normalize(u_viewPos - position);
  vec3 totalLight = vec3(0.0);

  // Add ambient term
  vec3 ambient = vec3(0.03) * albedo;

  // Process each light
  for(int i = 0; i < u_lightCount; i++) {
    vec3 lightPos = u_lightPositions[i];
    vec3 lightColor = u_lightColors[i];

    // Calculate light direction and distance
    vec3 lightDir = normalize(lightPos - position);
    float distance = length(lightPos - position);
    float attenuation = 1.0 / (distance * distance);

    // Calculate PBR terms
    // [PBR calculation code would go here]

    // Add contribution from this light
    totalLight += (diffuse + specular) * attenuation;
  }

  vec3 finalColor = ambient + totalLight;

  // Tone mapping and gamma correction if needed

  fragColor = vec4(finalColor, 1.0);
}
```

### Light Volumes for Optimization

For scenes with many lights, calculating every light for every pixel becomes inefficient. The key insight for optimization is that most lights only affect a limited area.

Light volumes address this by:

1. Representing each light's area of influence as a 3D shape (sphere for point lights, cone for spotlights)
2. Rendering only these volumes, accumulating lighting contributions
3. Limiting calculations to pixels actually affected by each light

```javascript
// Render each light as a volume (sphere or cone)
for (const light of lights) {
    if (!isLightInView(light)) continue; // Cull lights outside view

    // Bind light volume geometry (sphere for point lights, cone for spotlights)
    bindLightVolumeGeometry(light);

    // Set light properties
    gl.uniform3fv(gl.getUniformLocation(lightingShader, 'u_lightPos'), light.position);
    gl.uniform3fv(gl.getUniformLocation(lightingShader, 'u_lightColor'), light.color);
    gl.uniform1f(gl.getUniformLocation(lightingShader, 'u_lightRadius'), light.radius);

    // Enable additive blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Draw light volume
    gl.drawElements(gl.TRIANGLES, lightVolumeIndexCount, gl.UNSIGNED_SHORT, 0);
}
```

This approach conceptually matches how real light works - a light source only illuminates objects within its reach, and its influence diminishes with distance.

### Benefits of Deferred Rendering

1. **Efficient handling of many lights**: The most significant advantage is how deferred rendering handles scenes with numerous light sources. By only calculating lighting for visible fragments, it avoids wasting computation on objects that might be occluded by others.

2. **Decoupling of scene complexity from lighting complexity**: In forward rendering, complex scenes with many objects AND many lights create a multiplicative relationship (objects × lights). Deferred rendering breaks this relationship by separating geometry and lighting calculations.

3. **Easy implementation of screen-space effects**: Since the G-buffer already contains geometric information like positions and normals, it's straightforward to implement effects like screen-space ambient occlusion, screen-space reflections, and edge detection.

4. **Reduced overdraw**: In forward rendering, complex overlapping transparent objects can cause the same pixel to be shaded multiple times. Deferred rendering ensures each visible pixel is shaded exactly once.

### Limitations of Deferred Rendering

1. **Transparency handling**: Because deferred rendering only stores the frontmost surface at each pixel, transparent objects require special handling, often through a separate forward rendering pass.

2. **Memory consumption**: The G-buffer requires significant GPU memory to store multiple full-screen textures with geometric and material data.

3. **Bandwidth requirements**: Reading and writing multiple textures can create bandwidth bottlenecks, especially at high resolutions.

4. **Anti-aliasing**: Standard multi-sample anti-aliasing (MSAA) doesn't work directly with deferred rendering because it operates during rasterization, before fragment shading, but deferred lighting happens after the G-buffer is already created.

## Screen-Space Effects

Screen-space effects represent a conceptual breakthrough in real-time graphics: performing calculations based on the already-rendered 2D image and depth buffer, rather than requiring full 3D scene data. This approach enables sophisticated effects with reasonable performance by working with a simplified representation of the scene.

The key insight is that the depth buffer, combined with the camera's view and projection matrices, allows us to reconstruct the 3D position of each rendered pixel. With this position data (and often normal vectors as well), we can implement effects that would be prohibitively expensive if calculated in world space for the entire scene.

### Screen-Space Ambient Occlusion (SSAO)

SSAO approximates how much ambient light a pixel receives based on surrounding geometry. It's based on the observation that corners, crevices, and closely-spaced objects receive less ambient light than exposed surfaces.

The core concept is to:

1. Sample points in a hemisphere around each pixel
2. Check if these sample points are occluded by other geometry
3. Darken areas that appear more occluded

#### Implementation Steps:

1. **Render geometry data** (position and normal)
2. **Generate sample kernel and noise texture**
3. **Compute occlusion** by sampling positions around each pixel
4. **Blur the result** to reduce noise
5. **Apply to lighting** calculation

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_positionTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_noiseTexture;
uniform vec3 u_samples[64]; // Sample kernel in tangent space
uniform mat4 u_projection;
uniform vec2 u_noiseScale; // Scales noise texture based on screen size

out float fragColor; // Occlusion factor

void main() {
  // Get position and normal from G-buffer
  vec3 position = texture(u_positionTexture, v_texCoord).xyz;
  vec3 normal = normalize(texture(u_normalTexture, v_texCoord).xyz);

  // Get random rotation vector for this fragment
  vec3 randomVec = texture(u_noiseTexture, v_texCoord * u_noiseScale).xyz;

  // Create TBN matrix (tangent space to view space)
  vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
  vec3 bitangent = cross(normal, tangent);
  mat3 TBN = mat3(tangent, bitangent, normal);

  // Parameters
  float radius = 0.5;
  float bias = 0.025;

  // Calculate occlusion
  float occlusion = 0.0;
  for(int i = 0; i < 64; i++) {
    // Get sample position in view space
    vec3 samplePos = TBN * u_samples[i]; // Transform sample to view space
    samplePos = position + samplePos * radius;

    // Project sample position
    vec4 offset = vec4(samplePos, 1.0);
    offset = u_projection * offset;
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5; // To [0,1] range

    // Sample depth at projected position
    float sampleDepth = texture(u_positionTexture, offset.xy).z;

    // Range check with smoothing
    float rangeCheck = smoothstep(0.0, 1.0, radius / abs(position.z - sampleDepth));

    // Accumulate occlusion
    occlusion += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0) * rangeCheck;
  }

  // Average and invert (1.0 = no occlusion, 0.0 = fully occluded)
  occlusion = 1.0 - (occlusion / 64.0);

  fragColor = occlusion;
}
```

### Screen-Space Reflections (SSR)

SSR creates reflections by tracing rays through the depth buffer, rather than requiring explicit reflection information from the scene. This allows dynamic reflections without re-rendering the scene from reflected viewpoints or using expensive cubemaps.

The fundamental concept is:

1. Calculate a reflection vector for each pixel
2. March along this vector in screen space
3. Check the depth buffer to find intersections with geometry
4. Sample the color at the intersection point to create the reflection

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_positionTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_colorTexture;
uniform vec3 u_viewPos;
uniform mat4 u_viewProjection;
uniform vec2 u_screenSize;

out vec4 fragColor;

void main() {
  // Get data from G-buffer
  vec3 position = texture(u_positionTexture, v_texCoord).xyz;
  vec3 normal = normalize(texture(u_normalTexture, v_texCoord).xyz);
  vec4 currentColor = texture(u_colorTexture, v_texCoord);

  // Calculate view direction and reflection vector
  vec3 viewDir = normalize(position - u_viewPos);
  vec3 reflectionDir = reflect(viewDir, normal);

  // Reject if reflection is pointing away from camera
  if(reflectionDir.z >= 0.0) {
    fragColor = currentColor;
    return;
  }

  // Ray march parameters
  const int MAX_STEPS = 64;
  const float MAX_DISTANCE = 50.0;
  const float THICKNESS = 0.1;

  vec3 step = reflectionDir * (MAX_DISTANCE / float(MAX_STEPS));
  vec3 currentPos = position + normal * 0.01; // Bias to avoid self-intersection

  // Ray march to find intersection
  vec2 hitPixel = vec2(-1.0);
  float hitDistance = MAX_DISTANCE;

  for(int i = 0; i < MAX_STEPS; i++) {
    currentPos += step;

    // Project current position to screen space
    vec4 projectedPos = u_viewProjection * vec4(currentPos, 1.0);
    projectedPos.xyz /= projectedPos.w;
    vec2 screenPos = projectedPos.xy * 0.5 + 0.5;

    // Check if we're still on screen
    if(screenPos.x < 0.0 || screenPos.x > 1.0 || screenPos.y < 0.0 || screenPos.y > 1.0)
      break;

    // Sample depth at projected position
    float sampledDepth = texture(u_positionTexture, screenPos).z;
    float currentDepth = currentPos.z;

    // Check for intersection
    float depthDiff = currentDepth - sampledDepth;
    if(depthDiff > 0.0 && depthDiff < THICKNESS) {
      hitPixel = screenPos;
      hitDistance = length(currentPos - position);
      break;
    }
  }

  // If we found an intersection, blend the reflection
  if(hitPixel.x > 0.0) {
    vec3 reflectionColor = texture(u_colorTexture, hitPixel).rgb;

    // Calculate reflection intensity based on fresnel
    float fresnel = pow(1.0 - max(0.0, dot(-viewDir, normal)), 5.0);

    // Fade reflection based on distance
    float fadeFactor = 1.0 - (hitDistance / MAX_DISTANCE);
    fadeFactor = fadeFactor * fadeFactor; // Quadratic falloff

    // Combine with original color
    vec3 finalColor = mix(currentColor.rgb, reflectionColor, fresnel * fadeFactor * 0.5);
    fragColor = vec4(finalColor, currentColor.a);
  } else {
    fragColor = currentColor;
  }
}
```

### Volumetric Lighting

Volumetric lighting simulates how light interacts with participating media like fog, dust, or smoke. It creates atmospheric effects like light shafts (god rays) and enhances scene depth.

The core concept is:

1. For each pixel, trace a ray from the camera to the visible surface
2. Sample points along this ray
3. At each sample, calculate if the point is lit or in shadow
4. Accumulate light scattering based on the medium's density

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_depthTexture;
uniform sampler2D u_shadowMap;
uniform vec3 u_lightPos;
uniform vec3 u_lightColor;
uniform vec3 u_cameraPos;
uniform mat4 u_viewToWorld;
uniform mat4 u_lightSpaceMatrix;
uniform vec3 u_fogParams; // density, start, end

out vec4 fragColor;

void main() {
  // Reconstruct view-space position from depth
  float depth = texture(u_depthTexture, v_texCoord).r;

  // Ray march parameters
  const int SAMPLE_COUNT = 64;

  // Calculate ray direction in view space
  vec4 rayStart = vec4(0.0, 0.0, 0.0, 1.0); // Camera position in view space

  // Calculate position at maximum depth in view space
  vec4 rayEnd = vec4(
    v_texCoord.x * 2.0 - 1.0,
    v_texCoord.y * 2.0 - 1.0,
    depth * 2.0 - 1.0,
    1.0
  );

  // Transform to world space
  rayStart = u_viewToWorld * rayStart;
  rayEnd = u_viewToWorld * rayEnd;

  // Ray direction and length
  vec3 rayDir = normalize(rayEnd.xyz - rayStart.xyz);
  float rayLength = length(rayEnd.xyz - rayStart.xyz);

  // Step size
  float stepSize = rayLength / float(SAMPLE_COUNT);

  // Accumulate scattering
  vec3 scattering = vec3(0.0);
  float transmittance = 1.0; // How much light passes through

  for(int i = 0; i < SAMPLE_COUNT; i++) {
    // Current position along ray
    vec3 currentPos = rayStart.xyz + rayDir * (float(i) * stepSize);

    // Check if position is in shadow
    vec4 posLightSpace = u_lightSpaceMatrix * vec4(currentPos, 1.0);
    vec3 projCoords = posLightSpace.xyz / posLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    float closestDepth = texture(u_shadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;

    // In shadow if current depth is greater than closest depth
    bool inShadow = currentDepth > closestDepth + 0.005;

    // Calculate light intensity at this point
    vec3 lightDir = normalize(u_lightPos - currentPos);
    float distToLight = length(u_lightPos - currentPos);
    float attenuation = 1.0 / (distToLight * distToLight);

    // Apply extinction based on fog density
    float density = u_fogParams.x;
    float fogFactor = exp(-density * stepSize);
    transmittance *= fogFactor;

    // Add scattered light if not in shadow
    if(!inShadow) {
      float scatterAmount = (1.0 - fogFactor) * transmittance * attenuation;
      scattering += u_lightColor * scatterAmount;
    }

    // Early exit if transmittance gets very low
    if(transmittance < 0.01)
      break;
  }

  fragColor = vec4(scattering, 1.0 - transmittance);
}
```

This technique creates atmospheric effects by simulating how light interacts with particles in the air, creating the illuminated shafts we see in foggy or dusty environments when light filters through openings.

## Optimizing Multi-Pass Rendering

Effective optimization requires understanding not just what techniques can be applied, but why they work relative to the underlying hardware architecture and rendering pipeline.

### Memory Management

GPU memory is a precious resource, especially for large scenes and high-resolution effects. The core principles for optimization include:

1. **Reuse textures when possible**: Rather than creating new textures for each effect, reuse existing ones by:

    - Using ping-pong buffers for iterative effects
    - Repurposing intermediate textures after they're no longer needed
    - Sharing framebuffers between different passes with similar requirements

2. **Choose appropriate formats**: Each texture format uses different amounts of memory:

    - Use lower precision (e.g., 8-bit per channel instead of 16-bit or 32-bit) for visual data where subtle differences aren't noticeable
    - Reserve floating-point formats for data that requires high precision (positions, HDR lighting)
    - Pack multiple pieces of information into a single texture when possible (e.g., using RGB channels for different data)

3. **Mipmap selectively**: Mipmaps consume additional memory (about 33% more):

    - Only use mipmaps for textures that will be sampled at varying scales
    - Avoid mipmaps for render targets that are only sampled at their native resolution

4. **Account for mobile constraints**: Mobile GPUs often have much less memory than desktop counterparts:
    - Consider implementing quality settings that adjust texture sizes
    - Implement graceful fallbacks for memory-intensive effects
    - Test on representative low-end devices

### Bandwidth Optimization

Data movement between GPU memory and processors is often a primary bottleneck in multi-pass rendering. Optimize bandwidth by:

1. **Minimize texture resolution** when full resolution isn't needed:

    - Certain effects (like bloom and blur) can work at half or quarter resolution
    - Consider the visual impact versus performance gain of resolution reduction

2. **Use compressed texture formats** where appropriate:

    - Modern GPUs support various compression schemes
    - Consider using formats like ETC2 or ASTC where supported
    - Compress source textures, not just render targets

3. **Combine data in fewer textures**:

    - Pack multiple pieces of information into RGBA channels
    - Common combinations: roughness, metallic, and AO in RGB; normal XY with roughness in RGB
    - Use bit packing for discrete values (flags, indices)

4. **Use MRTs effectively**:
    - Generate multiple outputs in a single pass rather than rendering multiple times
    - When using deferred rendering, capture all G-buffer data in one geometry pass
    - Think about what data can be generated simultaneously without redundant calculations

### Rendering Order Optimization

The sequence and structure of rendering operations can significantly impact performance:

1. **Sort effects by dependency**:

    - Construct a dependency graph of effects
    - Minimize state changes and texture bindings
    - Group effects that use similar shaders or textures

2. **Consider effect importance**:

    - Implement quality tiers for effects
    - Allow selective disabling of expensive effects on lower-end hardware
    - Develop fallback shaders for complex effects

3. **Implement effect level-of-detail**:
    - Reduce effect complexity based on distance or screen space
    - Use simpler shaders for small or distant objects
    - Adjust sample counts dynamically based on performance metrics

By understanding these optimization principles in context, you can develop multi-pass rendering systems that achieve both impressive visual quality and responsive performance across a range of devices.

## Conclusion

Multi-pass rendering represents a fundamental paradigm shift in computer graphics, breaking away from the limitations of drawing everything in a single pass. This approach transforms the rendering pipeline into a flexible network of interconnected stages, each building upon the results of previous passes to create effects that would be impossible to achieve otherwise.

As we've explored in this document, WebGL 2 provides all the tools necessary to implement sophisticated multi-pass techniques:

-   **Framebuffer Objects (FBOs)** enable rendering to textures, the cornerstone of multi-pass rendering
-   **Render-to-texture techniques** allow capturing and reusing rendered content within the same scene
-   **Post-processing effects** transform already-rendered images to create film-like visual styles
-   **Deferred rendering** separates geometry and lighting for efficient handling of complex scenes
-   **Screen-space effects** leverage the depth buffer and rendered scene to approximate complex lighting phenomena

These techniques aren't merely technical tricks—they represent a deeper understanding of how visual information can be decomposed, processed, and recombined to create compelling imagery. They mirror approaches used in traditional art forms like photography and film, where capturing, processing, and compositing different elements creates a cohesive final image.

The multi-pass approach allows for a divide-and-conquer strategy, breaking complex rendering problems into manageable pieces that can each be optimized independently. This modularity also facilitates experimentation and artistic expression, as effects can be combined in various ways to achieve different visual styles.

While implementing these techniques effectively requires careful consideration of GPU capabilities and performance constraints, the results can transform basic WebGL scenes into professional-quality renderings that rival those found in modern games and interactive applications.

The future of real-time graphics lies in increasingly sophisticated combinations of these techniques, pushing the boundaries of what's possible in web-based 3D applications. By mastering multi-pass rendering in WebGL 2, you'll be well-equipped to create visually stunning experiences that captivate and engage users across a wide range of devices.
