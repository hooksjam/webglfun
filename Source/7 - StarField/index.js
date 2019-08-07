var a_coords_loc       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer    // Buffer to hold the values for a_coords.
var a_size_loc = -1
var a_size_buffer
var a_color_loc = -1
var a_color_buffer

var u_diffuseColor     // Locations of uniform variables in the shader program
var u_specularColor
var u_specularExponent
var u_lightPosition
var u_modelview
var u_projection
var u_normalMatrix   

var projection = mat4.create()    // projection matrix
var modelview                    // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();  // matrix, derived from modelview matrix, for transforming normal vectors
var rotator  // A TrackballRotator to implement rotation by mouse.
var zoomer
var colors = [  // RGB color arrays for diffuse and specular color values, selected by popup menu
    [1,1,1], [1,0,0], [0,1,0], [0,0,1], [0,1,1], [1,0,1], [1,1,0], [0,0,0], [0.5,0.5,0.5]
];
var lightPositions = [  // values for light position, selected by popup menu
    [0,0,0,1], [0,0,1,0], [0,1,0,0], [0,0,-10,1], [2,3,5,0]
];
var objects = [  // Objects for display, selected by popup menu
    cube(5),
    uvTorus(3,1,64,32),
    uvCylinder(1.5,5.5),
    uvCone(2.5,5.5),
    uvSphere(3),
    uvSphere(3,12,6)
];
var currentModelNumber;  // contains data for the current object

var points = []
var coords = new Float32Array()
var colors = new Float32Array()
var normals = new Float32Array()
var sizes = new Float32Array()

var scale = 1
var dt = 1000/60
var time = 0
var resetTimeout

var loopTimeout

var fieldSize = 100000

var clearVal = 0

var seeds 
var freqMin = 0.1 
var freqMax = 4
var sizeMin = 0.1
var sizeMax = 2
var frequencies = []

var sampleColors = [
    0.349, 0.453, 0.651,
    0.761, 0.592, 0.353,
    0.235, 0.159, 0.159,
    0.110, 0.110, 0.141,
    0.816, 0.816, 0.899,
    0.827, 0.69, 0.384, 
    0.592, 0.701, 0.773]

//'5976a6', 'c2975a', '3c2d2a', '1c1c24', 'd0cee5', 'd3b062', '97b3c5']

function installModel(modelData) {
     gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_coords_loc);
     gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_normal_loc);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index_buffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
}

function loop() {
    draw()

    if(loopTimeout != null)
        clearTimeout(loopTimeout)

    loopTimeout = setTimeout(loop, dt)

    time += dt
}

function reset() {
    console.log("RESET")
    // if(resetTimeout)
        // clearTimeout(resetTimeout)
    // resetTimeout = setTimeout(reset, 1000)
    frequencies = [
        lerp(freqMin, freqMax, Math.random()),
        lerp(freqMin, freqMax, Math.random()),
        lerp(freqMin, freqMax, Math.random()),
        4]

    seeds = [Math.random(), Math.random(), Math.random(), Math.random()]

    generateField()


    draw()
}

function getNoise(x, y, i) {
    noise.seed(seeds[i])
    return 0.5 + noise.simplex2(x*frequencies[i], y*frequencies[i])/2;
}

function generateField() {
    var width = 1;
    var height = 1;
    points = []
    for(let i = 0; i < fieldSize; i++) {
        // Add random point to canvas
        var randX =  Math.random()
        var randY =  Math.random()
        var randZ = 0

        var vec = vec3.fromValues(randX, randY, randZ)
        points.push(vec)
    }

    // Create points
    coords = new Float32Array(fieldSize*3)
    colors = new Float32Array(fieldSize*3)
    sizes = new Float32Array(fieldSize)

    // Update coords from points
    var s = 0
    var c = 0
    var c2 = 0
    var c3 = 0

    var r = 0 
    var g = 0
    var b = 0

    var r2 = 0
    var g2 = 0
    var b2 = 0

    var p = 10
    var p2 = 1 
    var p3 = 3
    var p4 = 1
    var p5 = 5

    var f = 0.1
    var f2 = 1.5
    var f3 = 0

    var freq = 10
    var min = 1
    var max = 0
    for(let i = 0; i < fieldSize; i++) {
        s = lerp(sizeMin, sizeMax, Math.random())
        // c = Math.pow(lerp(Math.random(), getNoise(points[i][0], points[i][1], 3), Math.random()), p)
        c = Math.pow(Math.random(), p)*f
        c2 = Math.pow(getNoise(points[i][0], points[i][1], 3), p2)*f
        /*if(c2 < min)
            min = c2
        if(c2 > max)
            max = c2*/
        r = g = b = lerp(c, c2, Math.pow(Math.random(), p3))


        //r2 = Math.pow(getNoise(points[i][0], points[i][1], 0), p3)
        //g2 = Math.pow(getNoise(points[i][0], points[i][1], 1), p3)
        //b2 = Math.pow(getNoise(points[i][0], points[i][1], 2), p3)



        if(Math.pow(Math.random(), p5) > 0.8)
        {
            var variety = 0
            var test = Math.random()
            if(test > 0.8)
                variety = 2
            else if(test > 0.6)
                variety = 1

            var noise = Math.pow(getNoise(points[i][0], points[i][1], variety), p4);
            switch(variety) {
                case 0:
                    r2 = 0.349*noise
                    g2 = 0.453*noise
                    b2 = 0.651*noise
                break;
                case 1:
                    r2 = 0.761*noise
                    g2 = 0.592*noise
                    b2 = 0.353*noise
                break;
                case 2:
                    r2 = 0.592*noise
                    g2 = 0.701*noise
                    b2 = 0.773*noise 
                break
            }

            f3 = 1
        }
        else 
            f3 = 0

        //0.349, 0.453, 0.651       
        //0.761, 0.592, 0.353
        //0.592, 0.701, 0.773

        // Random
        if(Math.pow(Math.random(), 6) > 0.98) {
            var index = Math.floor(Math.random()*(sampleColors.length/3))
            r = Math.max(sampleColors[index*3+0], 0)*f2
            g = Math.max(sampleColors[index*3+1], 0)*f2
            b = Math.max(sampleColors[index*3+2], 0)*f2
            s += 0.3
            /*r = sma
            g = Math.random()
            b = Math.random()*/
        }

        coords[i*3 + 0] = -1 + 2*points[i][0]
        coords[i*3 + 1] = -1 + 2*points[i][1]
        coords[i*3 + 2] = -1 + 2*points[i][2]


        colors[i*3 + 0] = Math.min(clearVal + lerp(r, r2, f3)*(1-clearVal), 1)
        colors[i*3 + 1] = Math.min(clearVal + lerp(g, g2, f3)*(1-clearVal), 1)
        colors[i*3 + 2] = Math.min(clearVal + lerp(b, b2, f3)*(1-clearVal), 1)

        sizes[i] = s
    }

    //console.log("Min: " + min + " Max: " + max)
}

function draw() { 
    // Multi Triangle
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(projection, Math.PI/5, 1, 0.5, 20);
    // mat4.ortho(projection, -1.0, 1.0, -1.0, 1.0, 0.1, 100); 

    var zoom = zoomer.getZoomScale()
    rotator.setViewDistance(lerp(0.01, 2, 1-zoom))

    modelview = rotator.getViewMatrix();
    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))

    // Uniforms
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection ); 

    // drawModel()
    drawPoints();
}

function drawModel() {
    mat3.normalFromMat4(normalMatrix, modelview);
    
    gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection );
    
    /* Draw the model.  The data for the model was set up in installModel() */
   
    gl.drawElements(gl.TRIANGLES, objects[currentModelNumber].indices.length, gl.UNSIGNED_SHORT, 0); 
}

function drawTris() {

    // Set up values for the "coords" attribute 
    gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_coords_loc); 
   
    // Set up values for the "color" attribute 
    if(a_color_loc != -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, a_color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
        gl.vertexAttribPointer(a_color_loc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_color_loc); 
    }

    if(a_size_loc != -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, a_size_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STREAM_DRAW);
        gl.vertexAttribPointer(a_size_loc, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_size_loc); 
    }

    // Draw the triangles. 
    gl.drawArrays(gl.TRIANGLES, 0, points.length*3);
}

function drawPoints() {

    // Set up values for the "coords" attribute 
    gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_coords_loc); 
   
    // Set up values for the "color" attribute
    if(a_color_loc != -1) { 
        gl.bindBuffer(gl.ARRAY_BUFFER, a_color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
        gl.vertexAttribPointer(a_color_loc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_color_loc); 
    }

    if(a_size_loc != -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, a_size_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STREAM_DRAW);
        gl.vertexAttribPointer(a_size_loc, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_size_loc); 
    }

    // Draw the triangles. 
    gl.drawArrays(gl.POINTS, 0, points.length); 
}


function initBasic(canvas) {
    var prog = createProgram(gl,"basic-vshader-source","basic-fshader-source");
    gl.useProgram(prog);

    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_coords_buffer = gl.createBuffer();
    a_color_loc =  gl.getAttribLocation(prog, "a_color");
    a_color_buffer = gl.createBuffer();
    a_size_loc =  gl.getAttribLocation(prog, "a_size"); 
    a_size_buffer = gl.createBuffer(); 

    index_buffer = gl.createBuffer();

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");    
    u_shift = gl.getUniformLocation(prog, "shift")

    gl.enable(gl.DEPTH_TEST);
}

function initPhong(canvas) {
    var prog = createProgram(gl,"phong-vshader-source","phong-fshader-source");
    gl.useProgram(prog);

    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_coords_buffer = gl.createBuffer();
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    a_normal_buffer = gl.createBuffer();

    index_buffer = gl.createBuffer();

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_lightPosition=  gl.getUniformLocation(prog, "lightPosition");
    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");

    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
    gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);
    gl.uniform1f(u_specularExponent, 10);
    gl.uniform4f(u_lightPosition, 0, 0, 0, 1);	

    installModel(objects[1]);
    currentModelNumber = 1; 
}

function initPoint(canvas) {
    var prog = createProgram(gl,"point-vshader-source","point-fshader-source");
    gl.useProgram(prog);

    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_coords_buffer = gl.createBuffer();
    a_color_loc =  gl.getAttribLocation(prog, "a_color");
    a_color_buffer = gl.createBuffer();
    a_size_loc =  gl.getAttribLocation(prog, "a_size"); 
    a_size_buffer = gl.createBuffer(); 

    console.log("Coords: " + a_coords_loc)
    console.log("Colors: " + a_color_loc)
    console.log("Size: " + a_size_loc)

    index_buffer = gl.createBuffer();

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");    

    gl.enable(gl.DEPTH_TEST);
}

/* Initialize the WebGL context.  Called from init() */
function init() {
    console.log("Init")
    glInit(() => {
        console.log(canvas)
        initPoint(canvas)
        // initBasic(canvas)

        rotator = new TrackballRotator(canvas, draw, 15)
        zoomer = new Zoomer(canvas, 0)

        /*document.getElementById("freqMin").value = freqMin;
        document.getElementById("freqMax").value = freqMax;
        console.log("Field size " + fieldSize)
        document.getElementById("fieldSize").value = fieldSize;
        document.getElementById("freqMin").onchange = function() { freqMin = Number(this.value); reset(); };
        document.getElementById("freqMax").onchange = function() { freqMax = Number(this.value); reset(); };
        document.getElementById("fieldSize").onchange = function() { fieldSize = Number(this.value); reset(); }; */

        reset()
        loop()
    })

    document.body.onkeyup = function(e){
        if(e.keyCode == 32){
            reset()
        }
    }   
}