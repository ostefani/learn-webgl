# Advanced Shading & Materials in WebGL 2

## Introduction

Advanced shading and material techniques in WebGL 2 enable the creation of visually realistic surfaces with physically accurate light interaction. This module explores high-quality rendering approaches that leverage the enhanced capabilities of WebGL 2 and GLSL ES 3.0, including physically-based rendering, advanced lighting models, and structured material systems.

## Physically-Based Rendering (PBR)

Physically-Based Rendering (PBR) represents a fundamental shift from ad-hoc lighting models toward physically accurate surface representation. PBR models simulate light-surface interaction using principles from physics to achieve consistent, realistic results across different lighting conditions.

### Key PBR Principles

1. **Energy Conservation**: Surfaces cannot reflect more light than they receive.

    ```glsl
    // Energy conservation in GLSL
    vec3 diffuse = albedo * (1.0 - metallic);
    vec3 specular = mix(vec3(0.04), albedo, metallic);
    // Total reflectance = diffuse + specular, always <= 1.0
    ```

2. **Microsurface Model**: Surface roughness affects light scattering.

    ```glsl
    // Roughness affects specular distribution
    float alpha = roughness * roughness;
    float D = distributionGGX(NoH, alpha);
    ```

3. **Fresnel Effect**: Reflection intensity varies with viewing angle.

    ```glsl
    // Schlick's approximation for Fresnel
    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - clampedDot(H, V), 5.0);
    ```

4. **Metallic-Roughness Workflow**: Parameterization using metallic and roughness values.

### PBR Implementation in WebGL 2

A complete PBR implementation involves several components:

1. **Material Parameterization**:

```glsl
#version 300 es
precision highp float;

// PBR material inputs
uniform sampler2D u_albedoMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_metallicRoughnessMap; // R: metallic, G: roughness
uniform sampler2D u_aoMap;
uniform float u_metallicFactor;
uniform float u_roughnessFactor;

in vec2 v_texCoord;
in vec3 v_position;
in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_bitangent;

out vec4 fragColor;
```

2. **BRDF Implementation**:

```glsl
// Cook-Torrance microfacet specular BRDF
vec3 specularBRDF(vec3 N, vec3 L, vec3 V, float roughness, vec3 F0) {
    vec3 H = normalize(L + V);

    // Distribution (Normal Distribution Function)
    float alpha = roughness * roughness;
    float alphaSq = alpha * alpha;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float denom = NdotH2 * (alphaSq - 1.0) + 1.0;
    float D = alphaSq / (PI * denom * denom);

    // Geometry (Smith model)
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float G1L = NdotL / (NdotL * (1.0 - k) + k);
    float G1V = NdotV / (NdotV * (1.0 - k) + k);
    float G = G1L * G1V;

    // Fresnel (Schlick approximation)
    float HdotV = max(dot(H, V), 0.0);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - HdotV, 5.0);

    return (D * G * F) / (4.0 * NdotV * NdotL + 0.001);
}
```

3. **Main Rendering Equation**:

```glsl
void main() {
    // Sample material textures
    vec4 albedoSample = texture(u_albedoMap, v_texCoord);
    vec3 albedo = albedoSample.rgb;
    float alpha = albedoSample.a;

    vec2 metallicRoughness = texture(u_metallicRoughnessMap, v_texCoord).rg;
    float metallic = metallicRoughness.r * u_metallicFactor;
    float roughness = metallicRoughness.g * u_roughnessFactor;
    float ao = texture(u_aoMap, v_texCoord).r;

    // Calculate normals using normal mapping
    vec3 N = calculateNormalFromMap();
    vec3 V = normalize(u_cameraPosition - v_position);

    // Calculate base reflectivity
    vec3 F0 = mix(vec3(0.04), albedo, metallic);

    // Direct lighting calculation
    vec3 Lo = vec3(0.0);
    for(int i = 0; i < u_numLights; ++i) {
        vec3 L = normalize(u_lightPositions[i] - v_position);
        vec3 radiance = u_lightColors[i] * calculateAttenuation(i);

        // BRDF components
        vec3 specular = specularBRDF(N, L, V, roughness, F0);
        vec3 diffuse = (1.0 - specular) * (1.0 - metallic) * albedo / PI;

        float NdotL = max(dot(N, L), 0.0);
        Lo += (diffuse + specular) * radiance * NdotL;
    }

    // Ambient lighting (IBL if available, otherwise simple ambient)
    vec3 ambient = vec3(0.03) * albedo * ao;

    // Final color
    vec3 color = ambient + Lo;

    // Tone mapping and gamma correction
    color = color / (color + vec3(1.0)); // Reinhard tone mapping
    color = pow(color, vec3(1.0/2.2));   // Gamma correction

    fragColor = vec4(color, alpha);
}
```

## Normal Mapping and Parallax Mapping

These techniques add depth and detail to surfaces without increasing geometric complexity.

### Normal Mapping

Normal mapping perturbs the surface normal using a texture to create the illusion of fine detail:

```glsl
// Calculate normal from normal map in tangent space
vec3 calculateNormalFromMap() {
    vec3 tangentNormal = texture(u_normalMap, v_texCoord).xyz * 2.0 - 1.0;

    // Create TBN matrix for transforming from tangent to world space
    vec3 N = normalize(v_normal);
    vec3 T = normalize(v_tangent);
    vec3 B = normalize(v_bitangent);
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
}
```

JavaScript setup for tangent space calculation:

```js
// Compute tangents for each triangle (simplified)
function computeTangents(positions, normals, texCoords, indices) {
    const tangents = new Float32Array(positions.length);
    const bitangents = new Float32Array(positions.length);

    // For each triangle
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        // Get positions of the triangle vertices
        const p0 = [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]];
        const p1 = [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]];
        const p2 = [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]];

        // Get texture coordinates
        const uv0 = [texCoords[i0 * 2], texCoords[i0 * 2 + 1]];
        const uv1 = [texCoords[i1 * 2], texCoords[i1 * 2 + 1]];
        const uv2 = [texCoords[i2 * 2], texCoords[i2 * 2 + 1]];

        // Calculate edges
        const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

        // Calculate UV deltas
        const deltaUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
        const deltaUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];

        // Compute tangent and bitangent
        const r = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]);
        const t = [
            (edge1[0] * deltaUV2[1] - edge2[0] * deltaUV1[1]) * r,
            (edge1[1] * deltaUV2[1] - edge2[1] * deltaUV1[1]) * r,
            (edge1[2] * deltaUV2[1] - edge2[2] * deltaUV1[1]) * r,
        ];
        const b = [
            (edge2[0] * deltaUV1[0] - edge1[0] * deltaUV2[0]) * r,
            (edge2[1] * deltaUV1[0] - edge1[1] * deltaUV2[0]) * r,
            (edge2[2] * deltaUV1[0] - edge1[2] * deltaUV2[0]) * r,
        ];

        // Add to existing tangents (to be normalized later)
        for (let j of [i0, i1, i2]) {
            tangents[j * 3] += t[0];
            tangents[j * 3 + 1] += t[1];
            tangents[j * 3 + 2] += t[2];

            bitangents[j * 3] += b[0];
            bitangents[j * 3 + 1] += b[1];
            bitangents[j * 3 + 2] += b[2];
        }
    }

    // Normalize tangents and bitangents
    // ...

    return { tangents, bitangents };
}
```

### Parallax Mapping

Parallax mapping (or Parallax Occlusion Mapping - POM) simulates depth by offsetting texture coordinates:

```glsl
// Basic parallax mapping
vec2 parallaxMapping(vec2 texCoords, vec3 viewDir) {
    // Height scale controls the strength of the effect
    const float heightScale = 0.05;

    // Sample the height map
    float height = texture(u_heightMap, texCoords).r;

    // Calculate offset
    vec2 p = viewDir.xy / viewDir.z * height * heightScale;

    // Return offset texture coordinates
    return texCoords - p;
}

// More advanced parallax occlusion mapping
vec2 parallaxOcclusionMapping(vec2 texCoords, vec3 viewDir) {
    // Convert view direction to tangent space (must be passed in from vertex shader)
    vec3 V = normalize(viewDir);

    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), V)));

    // Calculate layer depth
    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;

    // Scale and bias coordinates and view direction
    vec2 P = V.xy * 0.1;
    vec2 deltaTexCoords = P / numLayers;

    // Initial texture coordinates
    vec2 currentTexCoords = texCoords;
    float currentDepthMapValue = texture(u_heightMap, currentTexCoords).r;

    // Step through layers looking for intersection
    while(currentLayerDepth < currentDepthMapValue) {
        // Shift texture coordinates along view direction
        currentTexCoords -= deltaTexCoords;

        // Get depth at current coordinates
        currentDepthMapValue = texture(u_heightMap, currentTexCoords).r;

        // Increase current layer depth
        currentLayerDepth += layerDepth;
    }

    // Parallax occlusion mapping: refine with linear interpolation between layers
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;

    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(u_heightMap, prevTexCoords).r - currentLayerDepth + layerDepth;

    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);

    return finalTexCoords;
}
```

## Advanced Lighting Models

### Area Lights

Unlike point lights, area lights have spatial extent, creating softer, more realistic lighting:

```glsl
// Area light representation
struct AreaLight {
    vec3 position;     // Center position
    vec3 color;        // Light color
    vec3 dimensions;   // Width, height, depth
    mat3 orientation;  // Rotation matrix
};

// Area light shading
vec3 calculateAreaLight(AreaLight light, vec3 worldPos, vec3 normal, vec3 viewDir,
                        vec3 albedo, float metallic, float roughness) {
    // Representative point technique - use multiple sample points
    const int SAMPLE_COUNT = 4;
    vec3 points[SAMPLE_COUNT]; // Sample points on the area light

    // Generate sample points on the light surface
    generateLightSamplePoints(light, points);

    // Calculate BRDF for each sample point
    vec3 radiance = vec3(0.0);
    for(int i = 0; i < SAMPLE_COUNT; i++) {
        vec3 L = normalize(points[i] - worldPos);
        float NdotL = max(dot(normal, L), 0.0);

        if(NdotL > 0.0) {
            // Calculate distance and attenuation
            float distance = length(points[i] - worldPos);
            float attenuation = 1.0 / (distance * distance);

            // Calculate BRDF
            vec3 F0 = mix(vec3(0.04), albedo, metallic);
            vec3 specular = specularBRDF(normal, L, viewDir, roughness, F0);
            vec3 diffuse = (vec3(1.0) - specular) * (1.0 - metallic) * albedo / PI;

            // Add contribution from this sample
            radiance += (diffuse + specular) * light.color * attenuation * NdotL;
        }
    }

    // Average the contributions
    return radiance / float(SAMPLE_COUNT);
}
```

### Image-Based Lighting (IBL)

IBL uses environment maps to simulate global illumination and reflections:

```glsl
// Image-based lighting using split-sum approximation
vec3 calculateIBL(vec3 N, vec3 V, vec3 albedo, float metallic, float roughness, float ao) {
    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 R = reflect(-V, N);

    // Sample from prefiltered environment map based on roughness
    vec3 prefilteredColor = textureLod(u_prefilteredEnvMap, R, roughness * 4.0).rgb;

    // Sample from BRDF LUT texture
    vec2 brdf = texture(u_brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;

    // Split-sum approximation
    vec3 specular = prefilteredColor * (F0 * brdf.x + brdf.y);

    // Diffuse IBL component (irradiance map)
    vec3 irradiance = texture(u_irradianceMap, N).rgb;
    vec3 diffuse = irradiance * albedo;

    // Combine based on metallic (metallic surfaces have no diffuse contribution)
    vec3 ambient = (diffuse * (1.0 - metallic) + specular) * ao;

    return ambient;
}
```

JavaScript setup for IBL precomputation:

```js
// High-level pseudo-code for IBL precomputation
function precomputeIBL(envMap) {
    // 1. Generate cube mipmaps from environment map
    const cubemap = createCubemapFromEquirect(envMap);

    // 2. Prefilter environment map at different roughness levels
    const prefilteredEnvMap = prefilterEnvironmentMap(cubemap);

    // 3. Compute irradiance map for diffuse lighting
    const irradianceMap = computeIrradianceMap(cubemap);

    // 4. Precompute BRDF lookup table
    const brdfLUT = precomputeBRDFLookupTable();

    return {
        prefilteredEnvMap,
        irradianceMap,
        brdfLUT,
    };
}
```

## Procedural Texturing Techniques

Procedural texturing generates texture detail algorithmically rather than from stored images.

### Noise-Based Texturing

```glsl
// Perlin noise implementation in GLSL
float perlinNoise(vec3 p) {
    // Implementation details omitted for brevity
    // ...
    return noise; // Range: [-1, 1]
}

// Fractal Brownian Motion (FBM) for natural-looking noise
float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    // Add multiple octaves of noise
    for(int i = 0; i < 6; i++) {
        value += amplitude * perlinNoise(p * frequency);
        amplitude *= 0.5;        // Decrease amplitude with each octave
        frequency *= 2.0;        // Increase frequency with each octave
    }

    return value;
}

// Procedural wood texture example
vec3 woodTexture(vec3 position) {
    // Parameters for wood grain
    float rings = 10.0;
    float turbulence = 0.1;

    // Add turbulence to position
    vec3 turb = turbulence * vec3(
        perlinNoise(position * 0.01),
        perlinNoise(position * 0.02),
        perlinNoise(position * 0.01)
    );

    // Calculate distance for wood rings
    float dist = length(position.xz + turb.xz);

    // Create rings using sin
    float ring = sin(dist * rings);

    // Map ring value to wood colors
    vec3 darkWood = vec3(0.3, 0.2, 0.1);
    vec3 lightWood = vec3(0.6, 0.4, 0.2);

    return mix(darkWood, lightWood, ring * 0.5 + 0.5);
}
```

### Voronoi Patterns

```glsl
// Voronoi/cellular noise (simplified)
vec2 voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);

    // Minimum distance and cell ID
    float minDist = 1.0;
    vec2 minID = vec2(0.0);

    // Search surrounding cells
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);

            // Random position within cell
            vec2 o = random2(n + g);

            // Compute distance
            vec2 r = g + o - f;
            float d = dot(r, r);

            if(d < minDist) {
                minDist = d;
                minID = n + g + o;
            }
        }
    }

    return vec2(sqrt(minDist), minID.x * 31.0 + minID.y);
}

// Create cracked earth texture
vec3 crackedEarthTexture(vec2 uv) {
    // Base texture color
    vec3 baseColor = vec3(0.6, 0.4, 0.2);

    // Voronoi cells
    vec2 v = voronoi(uv * 10.0);
    float cell = v.y;
    float dist = v.x;

    // Create cracks where cells meet
    float crack = smoothstep(0.04, 0.07, dist);

    // Darker color in cracks
    vec3 crackColor = vec3(0.1, 0.1, 0.1);

    // Add color variation based on cell ID
    vec3 cellColor = baseColor * (0.8 + 0.4 * fract(cell * 0.1));

    // Combine cracks with cell colors
    return mix(crackColor, cellColor, crack);
}
```

## Material Systems Design

A well-structured material system enables efficient management of complex materials across different objects.

### Material Structure

```js
// JavaScript material system with inheritance
class Material {
    constructor() {
        this.uniforms = {};
        this.textures = {};
        this.shaders = {
            vertex: null,
            fragment: null,
        };
    }

    // Set uniform value
    setUniform(name, value) {
        this.uniforms[name] = value;
        return this;
    }

    // Set texture
    setTexture(name, texture) {
        this.textures[name] = texture;
        return this;
    }

    // Bind material for rendering
    bind(gl, program) {
        // Set uniforms
        for (const [name, value] of Object.entries(this.uniforms)) {
            const location = gl.getUniformLocation(program, name);
            setUniformByType(gl, location, value);
        }

        // Bind textures
        let textureUnit = 0;
        for (const [name, texture] of Object.entries(this.textures)) {
            const location = gl.getUniformLocation(program, name);
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(location, textureUnit);
            textureUnit++;
        }
    }
}

// PBR material extending base material
class PBRMaterial extends Material {
    constructor() {
        super();

        // Default PBR values
        this.uniforms = {
            u_metallicFactor: 1.0,
            u_roughnessFactor: 1.0,
            u_baseColorFactor: [1.0, 1.0, 1.0, 1.0],
        };

        // Default vertex shader
        this.shaders.vertex = PBR_VERTEX_SHADER;

        // Default fragment shader
        this.shaders.fragment = PBR_FRAGMENT_SHADER;
    }

    // Specialized setters for PBR properties
    setBaseColor(r, g, b, a = 1.0) {
        this.uniforms.u_baseColorFactor = [r, g, b, a];
        return this;
    }

    setMetallic(value) {
        this.uniforms.u_metallicFactor = value;
        return this;
    }

    setRoughness(value) {
        this.uniforms.u_roughnessFactor = value;
        return this;
    }
}
```

### Material Serialization

```js
// Material serialization/deserialization for scene persistence
function serializeMaterial(material) {
    return JSON.stringify({
        type: material.constructor.name,
        uniforms: material.uniforms,
        textures: Object.fromEntries(Object.entries(material.textures).map(([name, texture]) => [name, texture.id])),
    });
}

function deserializeMaterial(json, textureLibrary) {
    const data = JSON.parse(json);
    let material;

    // Create material instance based on type
    switch (data.type) {
        case 'PBRMaterial':
            material = new PBRMaterial();
            break;
        // Other material types...
        default:
            material = new Material();
    }

    // Restore uniforms
    for (const [name, value] of Object.entries(data.uniforms)) {
        material.setUniform(name, value);
    }

    // Restore textures from library
    for (const [name, id] of Object.entries(data.textures)) {
        if (textureLibrary.has(id)) {
            material.setTexture(name, textureLibrary.get(id));
        }
    }

    return material;
}
```

## Integration Example

```js
// Creating a complete PBR material with textures
function createStoneMaterial(gl, textureLibrary) {
    const material = new PBRMaterial().setBaseColor(0.8, 0.8, 0.8).setMetallic(0.0).setRoughness(0.7);

    // Load and assign textures
    material
        .setTexture('u_albedoMap', textureLibrary.get('stone_albedo'))
        .setTexture('u_normalMap', textureLibrary.get('stone_normal'))
        .setTexture('u_metallicRoughnessMap', textureLibrary.get('stone_mr'))
        .setTexture('u_aoMap', textureLibrary.get('stone_ao'));

    // Create program with material shaders
    const program = createShaderProgram(gl, material.shaders.vertex, material.shaders.fragment);

    return {
        material,
        program,
    };
}

// Render a mesh with PBR material
function renderMeshWithPBR(gl, mesh, material, program, camera, lights) {
    // Use program
    gl.useProgram(program);

    // Set camera and light uniforms
    setCameraUniforms(gl, program, camera);
    setLightUniforms(gl, program, lights);

    // Bind material (textures and uniforms)
    material.bind(gl, program);

    // Bind vertex array object
    gl.bindVertexArray(mesh.vao);

    // Draw mesh
    if (mesh.indexed) {
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
    }
}
```

## Performance Considerations

1. **Texture Sampling Efficiency**

    - Combine multiple material parameters into channels of a single texture
    - Use mipmapping for distant objects
    - Consider texture compression (e.g., ETC2 for WebGL 2)

2. **Shader Complexity**

    - Profile shader performance and optimize hotspots
    - Consider different detail levels for distant objects
    - Use shader permutations for features like shadow mapping or IBL

3. **Memory Management**
    - Implement material instancing for shared properties
    - Unload unused textures when not visible
    - Consider texture atlasing for small material variations

## Conclusion

Advanced shading and material techniques are essential for creating visually compelling WebGL 2 applications. Physically-based rendering provides a systematic approach to realistic materials, while normal mapping and procedural texturing add detail without geometric complexity. Building a structured material system enables efficient management of these techniques across complex scenes.

These approaches leverage the enhanced capabilities of WebGL 2 and GLSL ES 3.0, including multiple render targets, 3D textures, and improved attribute handling, to create rendering solutions that match the quality of dedicated game engines.
