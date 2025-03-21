# Advanced Lighting Techniques in WebGL 2

## Introduction

In our previous lessons, we explored the foundations of WebGL 2 rendering and implemented basic lighting with the Blinn-Phong model. While this provides a good starting point for creating 3D scenes, modern graphics demand more sophisticated lighting techniques to achieve realism and visual appeal.

In this lesson, we'll explore several advanced lighting techniques that dramatically enhance the visual quality of WebGL applications. We'll focus on practical implementations with performance considerations, recognizing that WebGL runs in browsers where efficiency is crucial.

## Shadow Mapping

### Why Shadows Matter

Shadows are essential for creating believable 3D scenes. They provide crucial visual cues about:

-   The spatial relationship between objects
-   The direction and properties of light sources
-   The scale and positioning of objects in the environment

Without shadows, objects appear to float unnaturally, disconnected from their surroundings.

### How Shadow Mapping Works

Shadow mapping is a two-pass technique:

1. **First Pass (Shadow Pass)**: Render the scene from the light's perspective, storing depth information.
2. **Second Pass (Regular Pass)**: Render the scene normally, comparing each fragment's depth from the light's perspective to determine if it's in shadow.

The key insight is that if an object isn't the closest thing to the light from the light's perspective, then it must be in shadow.

### Implementation

#### 1. Create a Depth Texture and Framebuffer

First, we need to create a texture to store the depth information from the light's perspective:

```javascript
// Create a framebuffer for the shadow map
const shadowFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);

// Create a depth texture
const shadowDepthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture);

// Define texture parameters
const shadowMapSize = 1024; // Size of shadow map (power of 2)
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

// Set texture parameters
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// Attach the depth texture to the framebuffer
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowDepthTexture, 0);

// No color attachment needed for shadow map
gl.drawBuffers([gl.NONE]);
gl.readBuffer(gl.NONE);

// Check framebuffer is complete
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer not complete');
}

gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

#### 2. Create the Shadow Map (First Pass)

Next, we need a special shadow shader to render the depth from the light's perspective:

```glsl
// Shadow map vertex shader
#version 300 es

in vec3 aPosition;

uniform mat4 uLightSpaceMatrix; // Projection * view from light's perspective
uniform mat4 uModelMatrix;

void main() {
  // Transform vertex to light space
  gl_Position = uLightSpaceMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
```

```glsl
// Shadow map fragment shader
#version 300 es
precision highp float;

// No output needed - we only care about depth
out vec4 fragColor;

void main() {
  // Depth is automatically written
  fragColor = vec4(1.0); // This doesn't matter as we're not writing color
}
```

Now we render the scene using this shader:

```javascript
// Bind the shadow framebuffer
gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
gl.viewport(0, 0, shadowMapSize, shadowMapSize);

// Clear the depth buffer
gl.clear(gl.DEPTH_BUFFER_BIT);

// Use shadow shader program
gl.useProgram(shadowProgram);

// Set up light space matrix
// For a directional light, this is a projection * view matrix
// looking from the light's direction
const lightProjection = mat4.ortho(
    mat4.create(),
    -10,
    10,
    -10,
    10, // Left, right, bottom, top
    0.1,
    30 // Near, far
);
const lightView = mat4.lookAt(
    mat4.create(),
    [lightPos[0], lightPos[1], lightPos[2]], // Light position
    [0, 0, 0], // Look at center of scene
    [0, 1, 0] // Up vector
);
const lightSpaceMatrix = mat4.multiply(mat4.create(), lightProjection, lightView);

// Set uniform
const lightSpaceMatrixLoc = gl.getUniformLocation(shadowProgram, 'uLightSpaceMatrix');
gl.uniformMatrix4fv(lightSpaceMatrixLoc, false, lightSpaceMatrix);

// Draw all objects in the scene
renderScene(shadowProgram);

// Unbind the framebuffer
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

#### 3. Use the Shadow Map (Second Pass)

Now we need to modify our regular shader to use the shadow map:

```glsl
// Vertex shader
#version 300 es

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uLightSpaceMatrix;
uniform mat3 uNormalMatrix;

out vec3 vFragPos;
out vec3 vNormal;
out vec4 vFragPosLightSpace; // Position in light space

void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vFragPos = worldPos.xyz;
  vNormal = uNormalMatrix * aNormal;

  // Calculate position in light space for shadow calculation
  vFragPosLightSpace = uLightSpaceMatrix * worldPos;

  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
```

```glsl
// Fragment shader
#version 300 es
precision highp float;

in vec3 vFragPos;
in vec3 vNormal;
in vec4 vFragPosLightSpace;

uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uLightColor;
uniform sampler2D uShadowMap;

uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;

out vec4 fragColor;

float ShadowCalculation(vec4 fragPosLightSpace) {
  // Perform perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

  // Transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;

  // Get closest depth from light's perspective
  float closestDepth = texture(uShadowMap, projCoords.xy).r;

  // Get current depth
  float currentDepth = projCoords.z;

  // Add bias to avoid shadow acne
  float bias = 0.005;

  // Check if fragment is in shadow
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
  // Normalize vectors
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPos - vFragPos);
  vec3 viewDir = normalize(uViewPos - vFragPos);
  vec3 halfwayDir = normalize(lightDir + viewDir);

  // Calculate shadow
  float shadow = ShadowCalculation(vFragPosLightSpace);

  // Ambient component
  float ambientStrength = 0.2;
  vec3 ambient = ambientStrength * uLightColor;

  // Diffuse component
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * uLightColor;

  // Specular component
  float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
  vec3 specular = spec * uSpecularColor * uLightColor;

  // Apply shadow - ambient light still contributes, but diffuse and specular
  // are reduced by shadow factor
  vec3 lighting = ambient + (1.0 - shadow) * (diffuse + specular);

  fragColor = vec4(lighting * uDiffuseColor, 1.0);
}
```

In our regular rendering pass, we need to bind the shadow map:

```javascript
// Regular rendering pass
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

gl.useProgram(mainProgram);

// Set all regular uniforms...

// Add shadow-specific uniforms
gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uLightSpaceMatrix'), false, lightSpaceMatrix);

// Bind shadow map texture
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture);
gl.uniform1i(gl.getUniformLocation(mainProgram, 'uShadowMap'), 0);

// Render the scene
renderScene(mainProgram);
```

### Improving Shadow Quality

Several techniques can improve shadow quality:

1. **Shadow Bias**: As shown above, we add a small bias to depth comparisons to prevent shadow acne (surface self-shadowing artifacts).

2. **Percentage Closer Filtering (PCF)**: Sample the shadow map multiple times and average the results to soften shadow edges:

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

3. **Cascade Shadow Maps**: For large scenes, use multiple shadow maps at different resolutions based on distance from the camera.

## Environment Mapping

### Why Environment Mapping Matters

Environment mapping creates the illusion that objects are reflecting their surroundings, essential for:

-   Realistic shiny surfaces like metals, glass, and polished materials
-   Immersive environments with skyboxes
-   Visual richness that grounds objects in their environment

### Cube Mapping

Cube maps are six textures arranged in a cube around the object. They're ideal for environment mapping because they:

-   Provide a full 360° environment
-   Allow for efficient reflection vector lookups
-   Work well with modern graphics hardware

### Implementation

#### 1. Create a Cube Map Texture

```javascript
// Create a cubemap texture
const cubeMapTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);

// Define the 6 faces of the cube map
const faces = [
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, url: 'right.jpg' },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, url: 'left.jpg' },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, url: 'top.jpg' },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: 'bottom.jpg' },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, url: 'front.jpg' },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: 'back.jpg' },
];

// Load a placeholder pixel for each face
faces.forEach((face) => {
    gl.texImage2D(
        face.target,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]) // Blue placeholder
    );
});

// Set texture parameters
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

// Load the actual images
let imagesLoaded = 0;
faces.forEach((face) => {
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
        gl.texImage2D(face.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        imagesLoaded++;
        if (imagesLoaded === 6) {
            // All images loaded, generate mipmaps and render
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            render();
        }
    };
    image.src = face.url;
});
```

#### 2. Create a Skybox

A skybox renders the environment map as a background:

```glsl
// Skybox vertex shader
#version 300 es

in vec3 aPosition;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vTexCoord;

void main() {
  vTexCoord = aPosition;

  // Remove translation from view matrix
  mat4 viewNoTranslation = uViewMatrix;
  viewNoTranslation[3][0] = 0.0;
  viewNoTranslation[3][1] = 0.0;
  viewNoTranslation[3][2] = 0.0;

  // Note: We use the position directly as texture coordinates
  vec4 pos = uProjectionMatrix * viewNoTranslation * vec4(aPosition, 1.0);

  // Ensure the skybox is always at maximum depth
  gl_Position = pos.xyww;
}
```

```glsl
// Skybox fragment shader
#version 300 es
precision highp float;

in vec3 vTexCoord;

uniform samplerCube uSkybox;

out vec4 fragColor;

void main() {
  fragColor = texture(uSkybox, vTexCoord);
}
```

Create a cube for the skybox and render it:

```javascript
// Create skybox vertices (a cube centered at the origin)
const skyboxVertices = new Float32Array([
    // positions
    -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
    // ... remaining faces of the cube
]);

// Create and bind VAO for skybox
const skyboxVao = gl.createVertexArray();
gl.bindVertexArray(skyboxVao);

// Create and populate buffer
const skyboxVbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVbo);
gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW);

// Setup vertex attributes
const posLocation = gl.getAttribLocation(skyboxProgram, 'aPosition');
gl.enableVertexAttribArray(posLocation);
gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);

// Unbind VAO
gl.bindVertexArray(null);

// Rendering function
function renderSkybox() {
    // Change depth function to pass when depth is equal (for skybox)
    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(skyboxProgram);

    // Remove translation from view matrix to keep skybox centered
    const viewMatrixNoTranslation = mat4.clone(viewMatrix);
    viewMatrixNoTranslation[12] = 0;
    viewMatrixNoTranslation[13] = 0;
    viewMatrixNoTranslation[14] = 0;

    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, 'uViewMatrix'), false, viewMatrixNoTranslation);
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, 'uProjectionMatrix'), false, projectionMatrix);

    // Bind cubemap texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
    gl.uniform1i(gl.getUniformLocation(skyboxProgram, 'uSkybox'), 0);

    // Draw skybox
    gl.bindVertexArray(skyboxVao);
    gl.drawArrays(gl.TRIANGLES, 0, 36); // 6 faces * 2 triangles * 3 vertices
    gl.bindVertexArray(null);

    // Reset depth function
    gl.depthFunc(gl.LESS);
}
```

#### 3. Implement Reflective Objects

To make objects reflect the environment:

```glsl
// Reflective object vertex shader
#version 300 es

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec3 vFragPos;
out vec3 vNormal;

void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vFragPos = worldPos.xyz;
  vNormal = uNormalMatrix * aNormal;

  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
```

```glsl
// Reflective object fragment shader
#version 300 es
precision highp float;

in vec3 vFragPos;
in vec3 vNormal;

uniform vec3 uViewPos;
uniform samplerCube uSkybox;
uniform float uReflectivity;

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vFragPos - uViewPos);

  // Calculate reflection vector
  vec3 reflection = reflect(viewDir, normal);

  // Sample from the cubemap
  vec4 reflectionColor = texture(uSkybox, reflection);

  // For a partially reflective object, mix with a base color
  vec3 baseColor = vec3(0.1, 0.1, 0.1); // Dark base
  vec3 finalColor = mix(baseColor, reflectionColor.rgb, uReflectivity);

  fragColor = vec4(finalColor, 1.0);
}
```

In the render loop:

```javascript
// Render reflective object
gl.useProgram(reflectiveProgram);

// Set up uniforms
gl.uniformMatrix4fv(gl.getUniformLocation(reflectiveProgram, 'uModelMatrix'), false, modelMatrix);
gl.uniformMatrix4fv(gl.getUniformLocation(reflectiveProgram, 'uViewMatrix'), false, viewMatrix);
gl.uniformMatrix4fv(gl.getUniformLocation(reflectiveProgram, 'uProjectionMatrix'), false, projectionMatrix);

// Normal matrix (inverse transpose of model matrix)
const normalMatrix = mat3.create();
mat3.normalFromMat4(normalMatrix, modelMatrix);
gl.uniformMatrix3fv(gl.getUniformLocation(reflectiveProgram, 'uNormalMatrix'), false, normalMatrix);

gl.uniform3fv(gl.getUniformLocation(reflectiveProgram, 'uViewPos'), cameraPosition);
gl.uniform1f(
    gl.getUniformLocation(reflectiveProgram, 'uReflectivity'),
    0.85 // Reflectivity factor
);

// Bind cubemap texture
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
gl.uniform1i(gl.getUniformLocation(reflectiveProgram, 'uSkybox'), 0);

// Draw the object
gl.bindVertexArray(objectVao);
gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
gl.bindVertexArray(null);
```

### Refraction

Refraction simulates light bending through transparent materials like glass or water. To implement refraction, we modify our fragment shader:

```glsl
// Refraction fragment shader
#version 300 es
precision highp float;

in vec3 vFragPos;
in vec3 vNormal;

uniform vec3 uViewPos;
uniform samplerCube uSkybox;
uniform float uRefractionRatio; // Air to glass ratio approximately 1.0/1.52 ≈ 0.658

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vFragPos - uViewPos);

  // Calculate refraction vector
  vec3 refraction = refract(viewDir, normal, uRefractionRatio);

  // Sample from the cubemap using refraction vector
  vec4 refractionColor = texture(uSkybox, refraction);

  fragColor = refractionColor;
}
```

## Normal Mapping

### Why Normal Mapping Matters

Normal mapping adds surface detail without increasing geometry complexity by:

-   Simulating bumps, dents, scratches, and texture
-   Enhancing lighting interactions to make surfaces appear more detailed
-   Achieving high visual fidelity with minimal performance impact

### Understanding Tangent Space

Normal maps work in tangent space, a local coordinate system aligned with the surface:

-   X-axis (tangent) runs along the U texture direction
-   Y-axis (bitangent) runs along the V texture direction
-   Z-axis is the surface normal

This coordinate system allows normal maps to work regardless of the object's orientation in world space.

### Implementation

#### 1. Prepare Vertex Data

For normal mapping, we need additional vertex attributes:

```javascript
// Vertex data with tangents
const vertices = [
    // pos.x, pos.y, pos.z, normal.x, normal.y, normal.z, texcoord.u, texcoord.v, tangent.x, tangent.y, tangent.z
    -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0,
];
```

For complex meshes, tangents can be calculated from texture coordinates:

```javascript
function calculateTangents(positions, normals, texCoords, indices) {
    // Initialize tangents and bitangents arrays
    const tangents = new Array(positions.length).fill(0);
    const bitangents = new Array(positions.length).fill(0);

    // For each face (triangle)
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        // Get vertices
        const p0 = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
        const p1 = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
        const p2 = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

        // Get texture coordinates
        const uv0 = [texCoords[indices[i] * 2], texCoords[indices[i] * 2 + 1]];
        const uv1 = [texCoords[indices[i + 1] * 2], texCoords[indices[i + 1] * 2 + 1]];
        const uv2 = [texCoords[indices[i + 2] * 2], texCoords[indices[i + 2] * 2 + 1]];

        // Calculate edges
        const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

        // Calculate differences in texture coordinates
        const deltaUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
        const deltaUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];

        // Calculate the tangent and bitangent
        const r = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]);

        const tangent = [
            r * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
            r * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
            r * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2]),
        ];

        const bitangent = [
            r * (-deltaUV2[0] * edge1[0] + deltaUV1[0] * edge2[0]),
            r * (-deltaUV2[0] * edge1[1] + deltaUV1[0] * edge2[1]),
            r * (-deltaUV2[0] * edge1[2] + deltaUV1[0] * edge2[2]),
        ];

        // Add to existing values (will normalize later)
        tangents[i0] += tangent[0];
        tangents[i0 + 1] += tangent[1];
        tangents[i0 + 2] += tangent[2];
        tangents[i1] += tangent[0];
        tangents[i1 + 1] += tangent[1];
        tangents[i1 + 2] += tangent[2];
        tangents[i2] += tangent[0];
        tangents[i2 + 1] += tangent[1];
        tangents[i2 + 2] += tangent[2];

        bitangents[i0] += bitangent[0];
        bitangents[i0 + 1] += bitangent[1];
        bitangents[i0 + 2] += bitangent[2];
        bitangents[i1] += bitangent[0];
        bitangents[i1 + 1] += bitangent[1];
        bitangents[i1 + 2] += bitangent[2];
        bitangents[i2] += bitangent[0];
        bitangents[i2 + 1] += bitangent[1];
        bitangents[i2 + 2] += bitangent[2];
    }

    // Normalize all tangents and ensure they're orthogonal to normals
    for (let i = 0; i < positions.length; i += 3) {
        const n = [normals[i], normals[i + 1], normals[i + 2]];
        const t = [tangents[i], tangents[i + 1], tangents[i + 2]];

        // Gram-Schmidt orthogonalize
        const dot = t[0] * n[0] + t[1] * n[1] + t[2] * n[2];
        tangents[i] = t[0] - n[0] * dot;
        tangents[i + 1] = t[1] - n[1] * dot;
        tangents[i + 2] = t[2] - n[2] * dot;

        // Normalize
        const len = Math.sqrt(
            tangents[i] * tangents[i] + tangents[i + 1] * tangents[i + 1] + tangents[i + 2] * tangents[i + 2]
        );
        if (len > 0) {
            tangents[i] /= len;
            tangents[i + 1] /= len;
            tangents[i + 2] /= len;
        }
    }

    return tangents;
}
```

#### 2. Load the Normal Map Texture

```javascript
// Create and configure normal map texture
const normalMapTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);

// Load a placeholder pixel
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([127, 127, 255, 255]) // Flat normal (pointing up in tangent space)
);

// Set texture parameters
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// Load normal map image
const normalMapImage = new Image();
normalMapImage.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, normalMapImage);
    gl.generateMipmap(gl.TEXTURE_2D);
};
normalMapImage.src = 'normal_map.jpg';
```

#### 3. Modify Shaders for Normal Mapping

```glsl
// Vertex shader with normal mapping
#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;
in vec3 aTangent;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec2 vTexCoord;
out vec3 vFragPos;
out mat3 vTBN; // Tangent-Bitangent-Normal matrix

void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vFragPos = worldPos.xyz;
  vTexCoord = aTexCoord;

  // Calculate TBN matrix for normal mapping
  vec3 T = normalize(uNormalMatrix * aTangent);
  vec3 N = normalize(uNormalMatrix * aNormal);
  // Re-orthogonalize T with respect to N
  T = normalize(T - dot(T, N) * N);
  // Calculate bitangent
  vec3 B = cross(N, T);

  // Create TBN matrix to transform from tangent space to world space
  vTBN = mat3(T, B, N);

  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
```

```glsl
// Fragment shader with normal mapping
#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec3 vFragPos;
in mat3 vTBN;

uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uLightColor;
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;

out vec4 fragColor;

void main() {
  // Sample normal map and transform from [0,1] to [-1,1] range
  vec3 tangentNormal = texture(uNormalMap, vTexCoord).rgb * 2.0 - 1.0;

  // Transform normal from tangent space to world space
  vec3 normal = normalize(vTBN * tangentNormal);

  // Calculate lighting vectors
  vec3 lightDir = normalize(uLightPos - vFragPos);
  vec3 viewDir = normalize(uViewPos - vFragPos);
  vec3 halfwayDir = normalize(lightDir + viewDir);

  // Sample diffuse texture
  vec3 diffuseColor = texture(uDiffuseMap, vTexCoord).rgb;

  // Ambient
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * uLightColor;

  // Diffuse
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * uLightColor;

  // Specular
  float specularStrength = 0.5;
  float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
  vec3 specular = specularStrength * spec * uLightColor;

  // Combine
  vec3 result = (ambient + diffuse + specular) * diffuseColor;

  fragColor = vec4(result, 1.0);
}
```

When rendering:

```javascript
// Bind textures
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
gl.uniform1i(gl.getUniformLocation(program, 'uDiffuseMap'), 0);

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
gl.uniform1i(gl.getUniformLocation(program, 'uNormalMap'), 1);
```

### Normal Mapping Tips

1. **Texture Format**: Normal maps are typically stored in RGB format where:

    - Red channel = X component (tangent direction)
    - Green channel = Y component (bitangent direction)
    - Blue channel = Z component (normal direction)

2. **Common Issues**:

    - Inverted normals: If the lighting looks incorrect, try flipping the Y component
    - Inconsistent tangents: Ensure tangents are calculated correctly for the entire mesh

3. **Enhancing with Height Maps**:
    - Parallax mapping adds a 3D offset based on a height map
    - Parallax occlusion mapping improves this by adding self-shadowing
    - These techniques create more convincing depth at minimal geometry cost

## Ambient Occlusion

### Why Ambient Occlusion Matters

Ambient occlusion adds subtle shadows in corners, crevices, and areas where objects are close together, which:

-   Enhances depth perception
-   Improves the readability of complex shapes
-   Grounds objects in the scene
-   Makes lighting feel more realistic

### Screen Space Ambient Occlusion (SSAO)

SSAO calculates occlusion in screen space, making it compatible with dynamic scenes in WebGL. It works by:

1. Sampling depth around each fragment
2. Determining how occluded each point is based on depth differences
3. Applying this occlusion to the ambient lighting component

### Implementation

#### 1. Set Up SSAO Framebuffer and Textures

```javascript
// Create a framebuffer for SSAO
const ssaoFBO = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, ssaoFBO);

// Position texture (to store view-space positions)
const positionTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, positionTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, canvas.width, canvas.height, 0, gl.RGBA, gl.FLOAT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, positionTexture, 0);

// Normal texture (to store view-space normals)
const normalTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, normalTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, canvas.width, canvas.height, 0, gl.RGBA, gl.FLOAT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTexture, 0);

// Depth texture
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.DEPTH_COMPONENT24,
    canvas.width,
    canvas.height,
    0,
    gl.DEPTH_COMPONENT,
    gl.UNSIGNED_INT,
    null
);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

// Tell WebGL we're rendering to multiple targets
gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

// SSAO framebuffer for storing occlusion result
const ssaoColorFBO = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, ssaoColorFBO);
const ssaoColorTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, ssaoColorTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, canvas.width, canvas.height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ssaoColorTexture, 0);

// Reset framebuffer
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

#### 2. Generate Sample Kernels and Noise Texture

```javascript
// Generate random sample points within a hemisphere
function generateSampleKernel(size) {
    const kernel = [];
    for (let i = 0; i < size; i++) {
        // Random direction in tangent hemisphere
        const sample = [Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random()];

        // Normalize
        const scale = i / size;
        const len = Math.sqrt(sample[0] * sample[0] + sample[1] * sample[1] + sample[2] * sample[2]);

        // Scale samples towards the center for more occlusion
        // Samples further from center contribute less
        const bias = 0.1;
        const scale_factor = scale * (1.0 - bias) + bias;

        sample[0] = (sample[0] / len) * scale_factor;
        sample[1] = (sample[1] / len) * scale_factor;
        sample[2] = (sample[2] / len) * scale_factor;

        kernel.push(...sample);
    }
    return new Float32Array(kernel);
}

const sampleKernel = generateSampleKernel(64); // 64 samples

// Create a random noise texture for rotating the sample kernel
function generateNoiseTexture() {
    const size = 4; // 4x4 texture
    const noise = new Float32Array(size * size * 3);

    for (let i = 0; i < size * size; i++) {
        // Random rotation vectors around the z-axis
        const x = Math.random() * 2.0 - 1.0;
        const y = Math.random() * 2.0 - 1.0;
        const z = 0.0; // Keep z=0 for rotations in tangent space

        noise[i * 3] = x;
        noise[i * 3 + 1] = y;
        noise[i * 3 + 2] = z;
    }

    const noiseTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, size, size, 0, gl.RGB, gl.FLOAT, noise);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    return noiseTexture;
}

const noiseTexture = generateNoiseTexture();
```

#### 3. Geometry Pass Shader for Position and Normal

```glsl
// Geometry pass vertex shader
#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec3 vFragPos;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
  vec4 viewPos = uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
  vFragPos = viewPos.xyz;
  vNormal = uNormalMatrix * aNormal;
  vTexCoord = aTexCoord;

  gl_Position = uProjectionMatrix * viewPos;
}
```

```glsl
// Geometry pass fragment shader
#version 300 es
precision highp float;

in vec3 vFragPos;
in vec3 vNormal;
in vec2 vTexCoord;

layout (location = 0) out vec4 gPosition;
layout (location = 1) out vec4 gNormal;

void main() {
  // Store view-space position in RGB
  gPosition = vec4(vFragPos, 1.0);

  // Store view-space normal in RGB
  gNormal = vec4(normalize(vNormal), 1.0);
}
```

#### 4. SSAO Shader

```glsl
// SSAO vertex shader
#version 300 es

in vec2 aPosition; // Full-screen quad positions

out vec2 vTexCoord;

void main() {
  vTexCoord = aPosition * 0.5 + 0.5; // Convert from [-1,1] to [0,1]
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
```

```glsl
// SSAO fragment shader
#version 300 es
precision highp float;

in vec2 vTexCoord;

uniform sampler2D uPositionTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uNoiseTexture;
uniform vec3 uSamples[64]; // Our sample kernel
uniform mat4 uProjectionMatrix;
uniform vec2 uNoiseScale; // Scales noise texture based on screen size

out float fragColor; // Single channel output for occlusion

void main() {
  // Get view-space position and normal
  vec3 position = texture(uPositionTexture, vTexCoord).xyz;
  vec3 normal = normalize(texture(uNormalTexture, vTexCoord).rgb);

  // Get random rotation vector for our sample kernel
  vec3 randomVec = texture(uNoiseTexture, vTexCoord * uNoiseScale).xyz;

  // Create TBN matrix from the normal and random vector
  vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
  vec3 bitangent = cross(normal, tangent);
  mat3 TBN = mat3(tangent, bitangent, normal);

  // Parameters
  float radius = 0.5;
  float bias = 0.025;
  float occlusion = 0.0;

  // Sample around the position
  for(int i = 0; i < 64; ++i) {
    // Transform sample from tangent to view space
    vec3 samplePos = TBN * uSamples[i];
    samplePos = position + samplePos * radius;

    // Project sample position
    vec4 offset = vec4(samplePos, 1.0);
    offset = uProjectionMatrix * offset;
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5; // To [0,1] range

    // Get sample depth
    float sampleDepth = texture(uPositionTexture, offset.xy).z;

    // Check if sample is occluded (with range check and bias)
    float rangeCheck = smoothstep(0.0, 1.0, radius / abs(position.z - sampleDepth));
    occlusion += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0) * rangeCheck;
  }

  // Average and invert (1.0 = no occlusion, 0.0 = fully occluded)
  occlusion = 1.0 - (occlusion / 64.0);

  fragColor = occlusion;
}
```

#### 5. Apply SSAO in Lighting Shader

```glsl
// Lighting pass fragment shader (excerpt)
#version 300 es
precision highp float;

// ... other inputs

uniform sampler2D uSSAOTexture;

// ... main function and other calculations

void main() {
  // ... other lighting calculations

  // Get ambient occlusion factor
  float ao = texture(uSSAOTexture, vTexCoord).r;

  // Apply AO to ambient lighting only
  vec3 ambient = ambientStrength * ao * uLightColor;

  // Final result
  vec3 result = ambient + diffuse + specular;

  fragColor = vec4(result, 1.0);
}
```

#### 6. Optional: Blur Pass for SSAO

To reduce noise in the SSAO result, add a blur pass:

```glsl
// SSAO blur fragment shader
#version 300 es
precision highp float;

in vec2 vTexCoord;

uniform sampler2D uSSAOInput;

out float fragColor;

void main() {
  vec2 texelSize = 1.0 / vec2(textureSize(uSSAOInput, 0));
  float result = 0.0;

  for (int x = -2; x < 2; ++x) {
    for (int y = -2; y < 2; ++y) {
      vec2 offset = vec2(float(x), float(y)) * texelSize;
      result += texture(uSSAOInput, vTexCoord + offset).r;
    }
  }

  fragColor = result / 16.0;
}
```

## Global Illumination Approximations

### Why Global Illumination Matters

Global illumination simulates how light bounces and scatters throughout a scene, which:

-   Creates realistic light distribution
-   Allows objects to be illuminated by reflected light
-   Produces subtle color bleeding from one surface to another
-   Enhances the integration of objects in their environment

Full global illumination is computationally expensive, but we can use approximations in WebGL.

### Light Probes

Light probes capture indirect lighting information at specific points in a scene:

1. **Spherical Harmonics**: Store pre-computed lighting environment as mathematical coefficients
2. **Reflection Probes**: Use cube maps at strategic locations to capture local lighting
3. **Ambient Cubes**: Sample lighting from six directions at grid points

### Implementation: Image-Based Lighting (IBL)

The most common global illumination approximation in WebGL is image-based lighting, which uses environment maps to simulate light coming from all directions:

#### 1. Prepare Environment Maps

For IBL, we need two specialized maps derived from our environment:

1. **Diffuse Irradiance Map**: A pre-filtered environment map for diffuse lighting
2. **Specular Prefiltered Map**: A pre-filtered environment map for specular reflections at different roughness levels
3. **BRDF Integration Lookup Texture**: A 2D lookup table for efficient specular calculations

These are usually pre-computed offline and loaded as textures:

```javascript
// Load diffuse irradiance cubemap
const irradianceMap = loadCubeMapTexture([
    'irradiance/px.jpg',
    'irradiance/nx.jpg',
    'irradiance/py.jpg',
    'irradiance/ny.jpg',
    'irradiance/pz.jpg',
    'irradiance/nz.jpg',
]);

// Load prefiltered specular cubemap with mipmaps for different roughness levels
const prefilterMap = loadCubeMapTexture(
    [
        'prefilter/px.jpg',
        'prefilter/nx.jpg',
        'prefilter/py.jpg',
        'prefilter/ny.jpg',
        'prefilter/pz.jpg',
        'prefilter/nz.jpg',
    ],
    true
); // Generate mipmaps

// Load BRDF integration lookup texture
const brdfLUT = loadTexture('brdf_lut.png');
```

#### 2. Modify PBR Shader to Use IBL

```glsl
// Fragment shader with PBR and IBL
#version 300 es
precision highp float;

in vec3 vFragPos;
in vec3 vNormal;
in vec2 vTexCoord;

uniform vec3 uCameraPos;

// PBR material properties
uniform vec3 uAlbedo;
uniform float uMetallic;
uniform float uRoughness;
uniform float uAO;

// IBL textures
uniform samplerCube uIrradianceMap;
uniform samplerCube uPrefilterMap;
uniform sampler2D uBRDFLUT;

out vec4 fragColor;

// PBR calculations - simplified for example
vec3 calculateLo(vec3 N, vec3 V, vec3 L, vec3 albedo, float metallic, float roughness) {
  // PBR calculations here (similar to what we calculated before for direct lighting)
  // ...
  return vec3(0.0); // Replace with actual calculation result
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vFragPos);
  vec3 R = reflect(-V, N);

  // Calculate direct lighting contribution
  // ... (similar to what we did before)
  vec3 Lo = vec3(0.0); // Sum of direct lighting

  // Calculate indirect diffuse lighting from irradiance map
  vec3 kS = fresnelSchlick(max(dot(N, V), 0.0), F0, roughness);
  vec3 kD = (1.0 - kS) * (1.0 - uMetallic);
  vec3 irradiance = texture(uIrradianceMap, N).rgb;
  vec3 diffuse = irradiance * uAlbedo;

  // Calculate indirect specular lighting
  const float MAX_REFLECTION_LOD = 4.0;
  vec3 prefilteredColor = textureLod(uPrefilterMap, R, uRoughness * MAX_REFLECTION_LOD).rgb;
  vec2 brdf = texture(uBRDFLUT, vec2(max(dot(N, V), 0.0), uRoughness)).rg;
  vec3 specular = prefilteredColor * (kS * brdf.x + brdf.y);

  // Combine direct and indirect lighting
  vec3 ambient = (kD * diffuse + specular) * uAO;
  vec3 color = ambient + Lo;

  // Tone mapping and gamma correction
  color = color / (color + vec3(1.0)); // Reinhard tone mapping
  color = pow(color, vec3(1.0/2.2)); // Gamma correction

  fragColor = vec4(color, 1.0);
}
```

### Baked Lighting

For static scenes, baking lighting information into textures provides efficient global illumination:

1. **Lightmaps**: Store precomputed lighting in UV textures
2. **Ambient Occlusion Maps**: Capture crevice shadowing
3. **Emissive Maps**: Identify self-illuminating surfaces

```glsl
// Fragment shader with baked lighting
#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec2 vLightmapCoord; // Second UV set for lightmap

uniform sampler2D uDiffuseMap;
uniform sampler2D uLightmap;
uniform sampler2D uEmissiveMap;

out vec4 fragColor;

void main() {
  vec3 diffuse = texture(uDiffuseMap, vTexCoord).rgb;
  vec3 lightmap = texture(uLightmap, vLightmapCoord).rgb;
  vec3 emissive = texture(uEmissiveMap, vTexCoord).rgb;

  // Combine diffuse with baked lighting and add emission
  vec3 color = diffuse * lightmap + emissive;

  fragColor = vec4(color, 1.0);
}
```

## Performance Considerations

### Shader Optimization

1. **Minimize Texture Lookups**:

    - Combine textures where possible (e.g., store roughness, metallic, and AO in RGB channels of one texture)
    - Use texture arrays for similar textures in WebGL 2
    - Cache texture lookup results if used multiple times

2. **Simplify Math**:

    - Use built-in functions when available (they're often hardware-accelerated)
    - Use lower precision when possible (e.g., `mediump` instead of `highp`)
    - Precompute constants in JavaScript

3. **Branch Reduction**:
    - GPU architectures often execute both sides of branches for large pixel groups
    - Replace if-else with mathematical equivalents where possible:

        ```glsl
        // Instead of:
        if (condition) {
          result = valueA;
        } else {
          result = valueB;
        }

        // Use:
        result = mix(valueB, valueA, float(condition));
        ```

### Level of Detail (LOD)

Implement LOD systems to reduce detail for distant objects:

1. **Shader Complexity Reduction**:

    - Use simpler lighting models for distant objects
    - Skip normal mapping beyond certain distances
    - Reduce sample counts for effects like SSAO

2. **Smart Material System**:
    ```javascript
    // Pseudo-code for a LOD material system
    function setupMaterialForObject(object, camera) {
        const distance = calculateDistance(object, camera);
        let shaderProgram;

        if (distance < nearThreshold) {
            // Full-detail shader with PBR, normal mapping, etc.
            shaderProgram = fullDetailProgram;
        } else if (distance < midThreshold) {
            // Medium-detail shader with simplified lighting
            shaderProgram = mediumDetailProgram;
        } else {
            // Low-detail shader with basic lighting only
            shaderProgram = lowDetailProgram;
        }

        gl.useProgram(shaderProgram);
        // Set up uniforms based on selected detail level
    }
    ```

### Efficient Multi-Light Handling

Handling many lights efficiently requires special techniques:

1. **Light Culling**:

    - Only process lights that affect the current fragment
    - Use spatial data structures to find relevant lights

2. **Deferred Shading**:

    - Render geometry data (position, normal, material properties) to textures
    - Process lighting in a second pass using these textures
    - Avoids running expensive fragment shaders for occluded fragments

3. **Light Proxies**:
    - Render simplified geometry for each light's area of influence
    - Only calculates lighting inside relevant volume

For WebGL 2, a simpler approach works well:

```javascript
// Process lights in batches in forward rendering
function renderWithLights(objects, lights) {
    // Maximum lights per batch
    const MAX_LIGHTS = 8;

    // Render each object
    for (const object of objects) {
        // Bind object VAO, set material uniforms, etc.
        gl.bindVertexArray(object.vao);

        // Process lights in batches
        for (let i = 0; i < lights.length; i += MAX_LIGHTS) {
            // Get current batch of lights
            const lightBatch = lights.slice(i, i + MAX_LIGHTS);

            // Set light uniforms
            for (let j = 0; j < lightBatch.length; j++) {
                const light = lightBatch[j];
                gl.uniform3fv(gl.getUniformLocation(program, `uLights[${j}].position`), light.position);
                gl.uniform3fv(gl.getUniformLocation(program, `uLights[${j}].color`), light.color);
                gl.uniform1f(gl.getUniformLocation(program, `uLights[${j}].intensity`), light.intensity);
                // Other light properties...
            }

            // Set light count
            gl.uniform1i(gl.getUniformLocation(program, 'uLightCount'), lightBatch.length);

            // For first batch, render with ambient
            const useAmbient = i === 0;
            gl.uniform1i(gl.getUniformLocation(program, 'uUseAmbient'), useAmbient ? 1 : 0);

            // Enable additive blending for subsequent batches
            if (i > 0) {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);
            } else {
                gl.disable(gl.BLEND);
            }

            // Draw the object
            gl.drawElements(gl.TRIANGLES, object.indexCount, gl.UNSIGNED_SHORT, 0);
        }
    }
}
```

## Conclusion

In this lesson, we've explored advanced lighting techniques that significantly enhance the visual quality of WebGL applications:

1. **Shadow Mapping**: Creates realistic shadows that provide depth and context
2. **Environment Mapping**: Simulates reflections and environment lighting
3. **Normal Mapping**: Adds surface detail without increasing geometry complexity
4. **Ambient Occlusion**: Enhances depth perception with subtle shadowing
5. **Global Illumination Approximations**: Simulates indirect lighting effects

Remember that these techniques should be applied judiciously based on your performance requirements. Modern WebGL 2 applications often use these techniques selectively:

-   Essential: Shadows and normal mapping for most applications
-   Recommended: Environment mapping for reflective surfaces
-   Consider: SSAO for architectural visualization or detailed scenes
-   Advanced: Image-based lighting for high-quality visuals
