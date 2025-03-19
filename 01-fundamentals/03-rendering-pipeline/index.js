// Main WebGL Pipeline Visualization
class PipelineVisualization {
    constructor() {
        // Initialize variables
        this.currentStage = 0;
        this.canvas = document.getElementById('webgl-canvas');
        this.overlay = document.getElementById('visualization-overlay');
        this.primitiveType = 'triangles';
        this.showWireframe = false;
        this.showBackface = true;
        this.showPoints = false;

        // Set up canvas
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.gl = this.canvas.getContext('webgl2');

        if (!this.gl) {
            alert('WebGL 2 not supported');
            throw new Error('WebGL 2 not supported');
        }

        // Set up UI controls
        this.setupControls();

        // Initialize WebGL
        this.initWebGL();

        // Display the first stage
        this.updateStageDisplay();
    }

    setupControls() {
        // Stage navigation
        document.getElementById('prev-stage').addEventListener('click', () => {
            if (this.currentStage > 0) {
                this.currentStage--;
                this.updateStageDisplay();
            }
        });

        document.getElementById('next-stage').addEventListener('click', () => {
            if (this.currentStage < 5) {
                this.currentStage++;
                this.updateStageDisplay();
            }
        });

        // Toggle controls
        document.getElementById('toggle-wireframe').addEventListener('change', (e) => {
            this.showWireframe = e.target.checked;
            this.draw();
        });

        document.getElementById('toggle-backface').addEventListener('change', (e) => {
            this.showBackface = e.target.checked;
            this.draw();
        });

        document.getElementById('toggle-points').addEventListener('change', (e) => {
            this.showPoints = e.target.checked;
            this.draw();
        });

        // Primitive type controls
        document.querySelectorAll('input[name="primitive"]').forEach((radio) => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.primitiveType = e.target.value;
                    this.draw();
                }
            });
        });
    }

    initWebGL() {
        const gl = this.gl;

        // Clear canvas with dark background
        gl.clearColor(0.1, 0.1, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);

        // VERTEX SHADER
        const vertexShaderSource = `#version 300 es
        // Input: vertex position
        in vec2 position;
        
        // Output: data to fragment shader
        out vec2 fragPos;
        
        void main() {
          // Stage 3: Vertex Processing
          // Transform positions to clip space
          gl_Position = vec4(position, 0.0, 1.0);
          
          // Pass position to fragment shader
          // This will be interpolated across the primitive
          fragPos = position;
        }
      `;

        // FRAGMENT SHADER
        const fragmentShaderSource = `#version 300 es
        precision mediump float;
        
        // Input: interpolated data from vertex shader
        in vec2 fragPos;
        
        // Output: fragment color
        out vec4 fragColor;
        
        void main() {
          // Stage 5: Fragment Processing
          // Map position to color (x => red, y => green)
          fragColor = vec4(fragPos.x + 0.5, fragPos.y + 0.5, 0.5, 1.0);
        }
      `;

        // Create and compile shaders
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create program and link shaders
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(this.program));
            throw new Error('Program linking error');
        }

        gl.useProgram(this.program);

        // Stage 1: JavaScript Setup - Create vertex data
        this.positions = new Float32Array([
            0.0,
            0.5, // Top vertex
            -0.5,
            -0.5, // Bottom-left vertex
            0.5,
            -0.5, // Bottom-right vertex
        ]);

        // Stage 2: Buffer Data Transfer - Create and populate buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        // Create a vertex array object (VAO) - WebGL 2 feature
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Connect position buffer to shader attribute
        this.positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Unbind the VAO
        gl.bindVertexArray(null);
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    updateStageDisplay() {
        // Update stage indicators in the UI
        document.querySelectorAll('.pipeline-stage').forEach((stage) => {
            const stageNum = parseInt(stage.dataset.stage);
            if (stageNum === this.currentStage) {
                stage.classList.add('active');
            } else {
                stage.classList.remove('active');
            }
        });

        // Update button states
        document.getElementById('prev-stage').disabled = this.currentStage === 0;
        document.getElementById('next-stage').disabled = this.currentStage === 5;

        // Clear existing overlays
        this.overlay.innerHTML = '';

        // Add stage indicator
        const stageNames = [
            'JavaScript Setup',
            'Buffer Data Transfer',
            'Vertex Shader',
            'Primitive Assembly & Rasterization',
            'Fragment Shader',
            'Fragment Operations & Output',
        ];

        const indicator = document.createElement('div');
        indicator.className = 'stage-indicator';
        indicator.textContent = `Stage ${this.currentStage + 1}: ${stageNames[this.currentStage]}`;
        this.overlay.appendChild(indicator);

        // Add stage-specific visualizations
        this.visualizeCurrentStage();

        // Redraw WebGL
        this.draw();
    }

    visualizeCurrentStage() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Convert normalized device coordinates to canvas coordinates
        const ndcToCanvas = (x, y) => {
            return {
                x: (x + 1) * 0.5 * canvasWidth,
                y: (1 - (y + 1) * 0.5) * canvasHeight,
            };
        };

        switch (this.currentStage) {
            case 0: // JavaScript Setup
                // Show the array data visualization
                const arrayViz = document.createElement('div');
                arrayViz.style.position = 'absolute';
                arrayViz.style.bottom = '10px';
                arrayViz.style.left = '10px';
                arrayViz.style.background = 'rgba(0,0,0,0.7)';
                arrayViz.style.color = 'white';
                arrayViz.style.padding = '10px';
                arrayViz.style.borderRadius = '4px';
                arrayViz.style.fontFamily = 'monospace';
                arrayViz.innerHTML = `positions = [${this.positions.join(', ')}]`;
                this.overlay.appendChild(arrayViz);
                break;

            case 1: // Buffer Data Transfer
                // Visualize data transfer from CPU to GPU
                const transferViz = document.createElement('div');
                transferViz.style.position = 'absolute';
                transferViz.style.top = '50%';
                transferViz.style.left = '20px';
                transferViz.style.transform = 'translateY(-50%)';
                transferViz.style.background = 'rgba(0,0,0,0.7)';
                transferViz.style.color = 'white';
                transferViz.style.padding = '10px';
                transferViz.style.borderRadius = '4px';
                transferViz.innerHTML = 'CPU Memory → GPU Buffer';

                const arrow = document.createElement('div');
                arrow.style.position = 'absolute';
                arrow.style.top = '50%';
                arrow.style.left = '200px';
                arrow.style.width = '100px';
                arrow.style.height = '2px';
                arrow.style.background = 'white';
                arrow.style.transform = 'translateY(-50%)';

                this.overlay.appendChild(transferViz);
                this.overlay.appendChild(arrow);
                break;

            case 2: // Vertex Shader
                // Show vertices as points
                for (let i = 0; i < this.positions.length; i += 2) {
                    const { x, y } = ndcToCanvas(this.positions[i], this.positions[i + 1]);

                    const vertex = document.createElement('div');
                    vertex.className = 'vertex-marker';
                    vertex.style.left = `${x}px`;
                    vertex.style.top = `${y}px`;

                    const label = document.createElement('div');
                    label.style.position = 'absolute';
                    label.style.left = `${x + 15}px`;
                    label.style.top = `${y}px`;
                    label.style.color = 'white';
                    label.style.fontSize = '12px';
                    label.style.fontFamily = 'monospace';
                    label.textContent = `(${this.positions[i]}, ${this.positions[i + 1]})`;

                    this.overlay.appendChild(vertex);
                    this.overlay.appendChild(label);
                }
                break;

            case 3: // Primitive Assembly & Rasterization
                // Show primitive outline
                if (this.primitiveType === 'triangles') {
                    // Draw triangle outline
                    const points = [];
                    for (let i = 0; i < this.positions.length; i += 2) {
                        points.push(ndcToCanvas(this.positions[i], this.positions[i + 1]));
                    }

                    const outline = document.createElement('div');
                    outline.style.position = 'absolute';
                    outline.style.left = '0';
                    outline.style.top = '0';
                    outline.style.width = '100%';
                    outline.style.height = '100%';
                    outline.style.pointerEvents = 'none';

                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', '100%');

                    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    polygon.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
                    polygon.setAttribute('fill', 'rgba(255,255,255,0.1)');
                    polygon.setAttribute('stroke', 'white');
                    polygon.setAttribute('stroke-width', '2');

                    svg.appendChild(polygon);
                    outline.appendChild(svg);
                    this.overlay.appendChild(outline);

                    // Add rasterization grid
                    const gridSize = 20;
                    const minX = Math.min(...points.map((p) => p.x));
                    const maxX = Math.max(...points.map((p) => p.x));
                    const minY = Math.min(...points.map((p) => p.y));
                    const maxY = Math.max(...points.map((p) => p.y));

                    for (let x = Math.floor(minX / gridSize) * gridSize; x <= maxX; x += gridSize) {
                        for (let y = Math.floor(minY / gridSize) * gridSize; y <= maxY; y += gridSize) {
                            // Only show grid cells that intersect with the triangle
                            if (
                                this.pointInTriangle({ x, y }, points[0], points[1], points[2]) ||
                                this.pointInTriangle({ x: x + gridSize, y }, points[0], points[1], points[2]) ||
                                this.pointInTriangle({ x, y: y + gridSize }, points[0], points[1], points[2]) ||
                                this.pointInTriangle(
                                    { x: x + gridSize, y: y + gridSize },
                                    points[0],
                                    points[1],
                                    points[2]
                                )
                            ) {
                                const cell = document.createElement('div');
                                cell.className = 'grid-marker';
                                cell.style.left = `${x}px`;
                                cell.style.top = `${y}px`;
                                cell.style.width = `${gridSize}px`;
                                cell.style.height = `${gridSize}px`;
                                this.overlay.appendChild(cell);
                            }
                        }
                    }
                }
                break;

            case 4: // Fragment Shader
                // Show fragment colors
                if (this.primitiveType === 'triangles') {
                    const points = [];
                    for (let i = 0; i < this.positions.length; i += 2) {
                        points.push(ndcToCanvas(this.positions[i], this.positions[i + 1]));
                    }

                    // Add color visualization
                    const gridSize = 20;
                    const minX = Math.min(...points.map((p) => p.x));
                    const maxX = Math.max(...points.map((p) => p.x));
                    const minY = Math.min(...points.map((p) => p.y));
                    const maxY = Math.max(...points.map((p) => p.y));

                    for (let x = Math.floor(minX / gridSize) * gridSize; x <= maxX; x += gridSize) {
                        for (let y = Math.floor(minY / gridSize) * gridSize; y <= maxY; y += gridSize) {
                            // Only show fragments that intersect with the triangle
                            if (
                                this.pointInTriangle(
                                    { x: x + gridSize / 2, y: y + gridSize / 2 },
                                    points[0],
                                    points[1],
                                    points[2]
                                )
                            ) {
                                // Convert back to NDC coordinates for color calculation
                                const ndcX = ((x + gridSize / 2) / canvasWidth) * 2 - 1;
                                const ndcY = -(((y + gridSize / 2) / canvasHeight) * 2 - 1);

                                // Calculate color based on fragment shader logic
                                const r = ndcX + 0.5;
                                const g = ndcY + 0.5;
                                const b = 0.5;

                                const fragment = document.createElement('div');
                                fragment.className = 'grid-marker';
                                fragment.style.left = `${x}px`;
                                fragment.style.top = `${y}px`;
                                fragment.style.width = `${gridSize}px`;
                                fragment.style.height = `${gridSize}px`;
                                fragment.style.backgroundColor = `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.8)`;
                                fragment.style.border = 'none';
                                this.overlay.appendChild(fragment);
                            }
                        }
                    }
                }
                break;

            case 5: // Fragment Operations & Output
                // Final rendered image is visible
                break;
        }
    }

    pointInTriangle(p, p0, p1, p2) {
        // Helper function to determine if a point is inside a triangle
        const area = 0.5 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
        const s = (1 / (2 * area)) * (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y);
        const t = (1 / (2 * area)) * (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y);

        return s >= 0 && t >= 0 && s + t <= 1;
    }

    draw() {
        const gl = this.gl;

        // Clear canvas
        gl.clearColor(0.1, 0.1, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Set backface culling based on UI
        if (this.showBackface) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        } else {
            gl.disable(gl.CULL_FACE);
        }

        // Don't draw before buffer stage
        if (this.currentStage < 1) return;

        // Set primitive type based on UI
        let glPrimitiveType;
        switch (this.primitiveType) {
            case 'points':
                glPrimitiveType = gl.POINTS;
                break;
            case 'lines':
                glPrimitiveType = this.showWireframe ? gl.LINE_LOOP : gl.LINE_STRIP;
                break;
            case 'triangles':
            default:
                glPrimitiveType = this.showWireframe ? gl.LINE_LOOP : gl.TRIANGLES;
                break;
        }

        // Bind the VAO before drawing
        gl.bindVertexArray(this.vao);

        // Draw based on current stage
        if (this.currentStage >= 3) {
            // Stage 4 and beyond: Draw the primitive
            gl.drawArrays(glPrimitiveType, 0, 3);
        }

        // Draw points if enabled
        if (this.showPoints && this.currentStage >= 2) {
            gl.drawArrays(gl.POINTS, 0, 3);
        }

        // Unbind the VAO
        gl.bindVertexArray(null);
    }
}

// Initialize the visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PipelineVisualization();
});
