# What is WebGL?

WebGL is a JavaScript API that gives you direct access to GPU hardware acceleration from within the browser. This example shows the minimal amount of code needed to display a single triangle using WebGL.

Unlike DOM manipulation, WebGL provides low-level access to your GPU through the canvas element, allowing hardware-accelerated graphics rendering

By leveraging GPU hardware acceleration, WebGL can render complex 3D scenes at 60fps or higher.

<img width="400" alt="Screenshot 2025-03-15 at 2 32 59 PM" src="https://github.com/user-attachments/assets/82914f25-d98e-4d35-9290-5ab55b04f7f3" />

## How It Works

This is a simple WebGL2 program that sets up a canvas, creates shaders, uploads vertex data, and finally draws a colored triangle. Here’s a step-by-step breakdown:

---

### 1. Canvas and WebGL Context Setup

-   **Getting the Canvas:**

    ```js
    const canvas = document.getElementById('webgl-canvas');
    ```

    The code retrieves an HTML `<canvas>` element with the ID `webgl-canvas`.

-   **Setting Dimensions:**

    ```js
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ```

    It sets the canvas's drawing buffer size to match its CSS size, ensuring that the rendered image isn’t stretched or distorted.

-   **Getting the WebGL2 Context:**
    ```js
    const gl = canvas.getContext('webgl2');
    ```
    This line initializes the WebGL2 context, which is the interface through which you interact with the GPU for rendering.

---

### 2. Clearing the Canvas

-   **Setting the Clear Color:**

    ```js
    gl.clearColor(0.2, 0.0, 0.4, 1.0);
    ```

    This command selects the clear color (dark purple) by defining the RGBA values. It doesn't immediately draw the color — it stores this value for later use.

-   **Clearing the Color Buffer:**
    ```js
    gl.clear(gl.COLOR_BUFFER_BIT);
    ```
    This command clears the canvas by filling the entire color buffer with the previously chosen clear color, effectively resetting the drawing area.

---

### 3. Creating and Compiling Shaders

#### Vertex Shader

-   **Creating the Shader:**

    ```js
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    ```

    A vertex shader is created. This type of shader runs for each vertex and is responsible for determining its position on the screen.

-   **Setting the Shader Source:**

    ```js
    gl.shaderSource(
        vertexShader,
        `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `
    );
    ```

    The shader code does the following:

    -   Declares an attribute called `position` (a 2D vector).
    -   In the `main` function, it converts this 2D position into a 4D vector by adding `0.0` for the z-coordinate and `1.0` for the w-coordinate (required for homogeneous coordinates in graphics).
    -   The result is assigned to the built-in variable `gl_Position`, which determines where each vertex appears in the final rendered scene.

-   **Compiling the Shader:**
    ```js
    gl.compileShader(vertexShader);
    ```
    This compiles the vertex shader, making it ready for use.

#### Fragment Shader

-   **Creating the Shader:**

    ```js
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    ```

    A fragment shader is created. It runs for every pixel (fragment) that the triangle covers.

-   **Setting the Shader Source:**

    ```js
    gl.shaderSource(
        fragmentShader,
        `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
      }
    `
    );
    ```

    The shader code does the following:

    -   Sets a default precision for floating point numbers.
    -   In the `main` function, it sets the color of each fragment to a solid orange (red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0).

-   **Compiling the Shader:**
    ```js
    gl.compileShader(fragmentShader);
    ```
    This compiles the fragment shader.

---

### 4. Creating the Shader Program

-   **Program Creation and Attachment:**

    ```js
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    ```

    A shader program is created and both the compiled vertex and fragment shaders are attached to it.

-   **Linking and Using the Program:**
    ```js
    gl.linkProgram(program);
    gl.useProgram(program);
    ```
    The shaders are linked together into an executable program that runs on the GPU. Then, `gl.useProgram` sets this program as the current active one.

---

### 5. Defining the Triangle’s Geometry

-   **Vertex Data:**

    ```js
    const positions = new Float32Array([
        0.0,
        0.5, // Top vertex
        -0.5,
        -0.5, // Bottom left vertex
        0.5,
        -0.5, // Bottom right vertex
    ]);
    ```

    An array of vertex positions is defined. This creates three 2D points for the vertices of a triangle.

-   **Creating and Binding a Buffer:**

    ```js
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    ```

    A buffer is created to store these vertex positions on the GPU. Binding it to the `ARRAY_BUFFER` target means it will be used for vertex attributes.

-   **Uploading the Data:**
    ```js
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    ```
    The vertex data is uploaded to the GPU. The `STATIC_DRAW` hint indicates that the data will not change frequently.

---

### 6. Linking the Vertex Data to the Shader

-   **Getting the Attribute Location:**

    ```js
    const positionLocation = gl.getAttribLocation(program, 'position');
    ```

    This retrieves the location of the `position` attribute defined in the vertex shader.

-   **Enabling the Attribute:**

    ```js
    gl.enableVertexAttribArray(positionLocation);
    ```

    This tells WebGL to use the buffer data for this attribute.

-   **Describing the Data Layout:**
    ```js
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    ```
    This line defines how the vertex data is organized:
    -   **2:** Each vertex has 2 components (x and y).
    -   **gl.FLOAT:** The data type of each component.
    -   **false:** No normalization is applied.
    -   **0:** No extra data between vertices (stride).
    -   **0:** Data starts at the beginning of the buffer (offset).

---

### 7. Drawing the Triangle

-   **Issuing the Draw Call:**
    ```js
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    ```
    Finally, this command tells WebGL to draw primitives from the vertex data:
    -   **gl.TRIANGLES:** The mode specifies that every group of three vertices will form a triangle.
    -   **0:** Start at the first vertex.
    -   **3:** Draw 3 vertices (which form a single triangle).

---

### Summary

In summary, the code:

1. **Sets up the canvas and WebGL2 context** to enable GPU rendering.
2. **Clears the canvas** with a dark purple background.
3. **Creates and compiles shaders**:
    - The **vertex shader** transforms 2D positions into clip space.
    - The **fragment shader** colors every pixel of the triangle in orange.
4. **Creates a shader program**, links the shaders, and activates the program.
5. **Uploads vertex data** for a triangle to the GPU.
6. **Associates the vertex data with the shader’s attribute** so that the GPU knows how to read the data.
7. **Draws the triangle** on the canvas.

This is a fundamental example to demonstrate how to use WebGL for rendering graphics. Each step builds upon the previous one, showing how to set up the rendering context, write shaders, and draw simple shapes.
