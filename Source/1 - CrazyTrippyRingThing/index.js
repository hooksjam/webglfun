
"use strict";

var shaders = {}

var gl;   // The webgl context.

var a_coords_loc;       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer;    // Buffer to hold the values for a_coords.
var a_normal_loc;       // Location of a_normal attribute.
var a_normal_buffer;    // Buffer for a_normal.
var index_buffer;       // Buffer to hold vetex indices from model.
var a_color_loc;
var a_color_buffer;

var u_diffuseColor;     // Locations of uniform variables in the shader program
var u_specularColor;
var u_specularExponent;
var u_lightPosition;
var u_modelview;
var u_projection;
var u_normalMatrix;    
var u_shift;

var projection = mat4.create();    // projection matrix
var modelview;                     // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();  // matrix, derived from modelview matrix, for transforming normal vectors

var zoomer;
var rotator;  // A TrackballRotator to implement rotation by mouse.
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

var positions = []
var scale = []
var velocity = []
var angularVelocity = []
var transforms = []
var transformStack = []
var coords = new Float32Array();
var colors = new Float32Array();
var normals = new Float32Array();
var points = new Float32Array();

var time = 0.0

var grav = 1//0.01
var ringCount = 1000
var replicants = 5000
var dampZ = 0.1

/* Called when the user changes the selection in the model-selection pop-up.
 * The data for the model are copied into the appropriate buffers, and the
 * scene is redrawn.
 */
function installModel(modelData) {
     gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_coords_loc);

     var colors = new Float32Array(modelData.vertexPositions.length)
     for(let  i = 0; i < colors.length; i++)
        colors[i] = 1

     gl.bindBuffer(gl.ARRAY_BUFFER, a_color_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_color_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_color_loc);
     gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_normal_loc);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index_buffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
}

function setTriangle(position, i) {
    var s = 0.2*scale[i]
    var of = i*9


    var a = vec3.fromValues(-s, -s, 0)
    a = vec3.transformMat4(a, a, transforms[i])
    a = vec3.add(a, a, position)

    var b = vec3.fromValues(s, -s, 0)
    b = vec3.transformMat4(b, b, transforms[i])
    b = vec3.add(b, b, position)

    var c = vec3.fromValues(0, +s, 0)
    c = vec3.transformMat4(c, c, transforms[i])
    c = vec3.add(c, c, position)

    coords[of] = a[0]
    coords[of+1] = a[1]
    coords[of+2] = a[2]

    coords[of+3] = b[0]
    coords[of+4] = b[1]
    coords[of+5] = b[2]

    coords[of+6] = c[0]
    coords[of+7] = c[1]
    coords[of+8] = c[2]

    points[i*3] = position[0]
    points[i*3+1] = position[1]
    points[i*3+2] = position[2]

}

function pushTransform(tran) {
    transformStack.push(tran)
}

function popTransform() {
    return transformStack.pop()
}

function loop() {
    draw()

    var accel = vec3.create()
    var dt = 1/60
    var dx = vec3.create()
    var da = vec3.create()
    for(let i = 0; i < positions.length; i++) {
        // Accelerate
        var mag = vec3.len(positions[i])
        vec3.normalize(accel, positions[i])
        vec3.scale(accel, accel, -(dt*grav)/(mag*mag))
        vec3.add(velocity[i], velocity[i], accel)
        if(dampZ != 0)
            velocity[i][2] = velocity[i][2]*(1-dt*dampZ)

        // Move
        vec3.scale(dx, velocity[i], dt)
        vec3.add(positions[i], positions[i], dx)

        // Rotate
        vec3.scale(da, angularVelocity[i], dt)
        mat4.rotateX(transforms[i], transforms[i], da[0])
        mat4.rotateY(transforms[i], transforms[i], da[1])
        mat4.rotateZ(transforms[i], transforms[i], da[2])
    }
    // mat4.fromRotation(rot, (factor%2)*Math.PI, vec3.fromValues(0, 1, 0))
    // mat4.translate(rot, rot, position)
 
    // setTimeout(Math.Round(1000*dt), loop)
    setTimeout(loop, 1000*dt)

    time += dt
}

function draw() { 
    // Multi Triangle
    gl.clearColor(0.2,0.2,0.2,1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(projection,Math.PI/5,1,5,50);

    var zoom = zoomer.getZoomScale()
    rotator.setViewDistance(lerp(5, 40, 1-zoom))

    modelview = rotator.getViewMatrix();

    // Uniforms
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection ); 
    gl.uniform1f(u_shift, 0); 
    //gl.uniform1f(u_shift, Math.sin(time*1)*5); 
    gl.uniform1f(u_shift, 0.1)


    // Main coordinates
    //normals = new Float32Array(positions.length*9);

    // Add a triangle for each point
    for(let i = 0; i < positions.length; i++) {
        setTriangle(positions[i], i)
    }

    // Set up values for the "coords" attribute 
    gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_coords_loc); 
   
    // Set up values for the "color" attribute 
    gl.bindBuffer(gl.ARRAY_BUFFER, a_color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_color_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_color_loc); 

    gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_normal_loc); 

    
    // Draw the triangle. 
    //gl.drawArrays(gl.TRIANGLES, 0, positions.length*3); 


    pushTransform(mat4.clone(modelview))

    gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_coords_loc); 

    var limit = replicants//5000///2000
    for(let i = 0; i < limit; i++)
    {
        mat4.rotateZ(modelview, modelview, Math.PI*2/limit)
        gl.uniformMatrix4fv(u_modelview, false, modelview);
        gl.drawArrays(gl.Points, 0, positions.length)
    }

    modelview = popTransform()


    // Sphere at center
    installModel(objects[4])
    currentModelNumber = 4

    pushTransform(mat4.clone(modelview))
    var s = 0.2 + Math.sin(time)*0.05
    mat4.scale(modelview, modelview, vec3.fromValues(s,s,s))
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    //gl.uniform1f(u_shift, -1); 
    //mat3.normalFromMat4(normalMatrix, modelview);
    // gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    // gl.uniformMatrix4fv(u_modelview, false, modelview );
    // gl.uniformMatrix4fv(u_projection, false, projection );
    
    /* Draw the model.  The data for the model was set up in installModel() */
    gl.drawElements(gl.TRIANGLES, objects[currentModelNumber].indices.length, gl.UNSIGNED_SHORT, 0); 
    modelview = popTransform()
}

/* Initialize the WebGL context.  Called from init() */
function initGL() {
    /*var prog = createProgram(gl,"phong-vshader-source","phong-fshader-source");
    gl.useProgram(prog);
    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_lightPosition=  gl.getUniformLocation(prog, "lightPosition");
    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");
    a_coords_buffer = gl.createBuffer();
    a_normal_buffer = gl.createBuffer();
    index_buffer = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
    gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);
    gl.uniform1f(u_specularExponent, 10);
    gl.uniform4f(u_lightPosition, 0, 0, 0, 1);*/

    var prog = createProgram(gl,"basic-vshader-source","basic-fshader-source");
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);

    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_coords_buffer = gl.createBuffer();
    a_color_loc =  gl.getAttribLocation(prog, "a_color");
    a_color_buffer = gl.createBuffer();

    a_normal_loc =  gl.getAttribLocation(prog, "a_normal"); 
    console.log("NROMAL" + a_normal_loc)
    console.log("CORD" + a_coords_loc)
    console.log("COLOR" + a_color_loc)
    a_normal_buffer = gl.createBuffer(); 

    index_buffer = gl.createBuffer();

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");    
    u_shift = gl.getUniformLocation(prog, "shift")
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 *    The second and third parameters are the id attributes for <script>
 * elementst that contain the source code for the vertex and fragment
 * shaders.
 */
function createProgram(gl, vertexShaderID, fragmentShaderID) {
    function getTextContent( elementID ) {
            // This nested function retrieves the text content of an
            // element on the web page.  It is used here to get the shader
            // source code from the script elements that contain it.
        var element = document.getElementById(elementID);
        var node = element.firstChild;
        var str = "";
        while (node) {
            if (node.nodeType == 3) // this is a text node
                str += node.textContent;
            node = node.nextSibling;
        }
        return str;
    }

    try {
        var vertexShaderSource = getTextContent( vertexShaderID );
        var fragmentShaderSource = getTextContent( fragmentShaderID );
    }
    catch (e) {
        throw "Error: Could not get shader source code from script elements.";
    }
    var vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vertexShaderSource);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
     }
    var fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    try {
        var canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl") || 
                         canvas.getContext("experimental-webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context:" + e + "</p>";
        return;
    }

    //installModel(objects[1]);
    currentModelNumber = 1;
    rotator = new TrackballRotator(canvas, draw, 15);
    zoomer = new Zoomer(canvas, 0.7)

    var count = ringCount

    var posLimit = 3.5
    // var velLimit = 0.2
    var velLimit = 0.1*grav
    //var speedVar = 0.3
    var speedVar = 0.1*grav
    var angVelLimit = 0.4
    var s = 0.3
    var toScreen = vec3.fromValues(0,0,1)
    var x, y, z
    for(let i = 0; i < count; i++) {
        scale.push(s)

        var pos = vec3.create()
        var dist = 1 + Math.pow(Math.random(), 2)*posLimit
        var angXY = Math.random()*Math.PI*2
        var angZ = 0//Math.random()*
        pos = vec3.fromValues(dist, 0, 0)
        vec3.rotateZ(pos, pos, vec3.create(), angXY)
        vec3.rotateY(pos, pos, vec3.create(), angZ)
        positions.push(pos)

        var vel = vec3.create()
        x = -velLimit + Math.random()*2*velLimit
        y = -velLimit + Math.random()*2*velLimit
        z = -velLimit + Math.random()*2*velLimit
        vec3.cross(vel, pos, toScreen)
        vec3.normalize(vel, vel)

        var speed = Math.sqrt(grav/vec3.len(pos))
        speed = speed*(1-speedVar + Math.random()*speedVar*2)
        vec3.scale(vel, vel, speed)
        vec3.add(vel, vel, vec3.fromValues(x,y,z))
        //velocity.push(vec3.fromValues(x, y, z))
        velocity.push(vel)

        var ang = vec3.create()
        x = -angVelLimit + Math.random()*2*angVelLimit
        y = -angVelLimit + Math.random()*2*angVelLimit
        z = -angVelLimit + Math.random()*2*angVelLimit
        ang = vec3.fromValues(x, y, z)
        angularVelocity.push(ang)

        var mat = mat4.create(mat)
        x = -Math.PI + Math.random()*2*Math.PI
        y = -Math.PI + Math.random()*2*Math.PI
        z = -Math.PI + Math.random()*2*Math.PI
        mat4.rotateX(mat, mat, x)
        mat4.rotateY(mat, mat, y)
        mat4.rotateZ(mat, mat, z)
        transforms.push(mat)

    }
    // positions.push(vec3(0.5, -0.5, 0))
    // positions.push(vec3(0.5, 0.5, 0))
    // positions.push(vec3(-0.5, 0.5, 0))
    coords = new Float32Array(positions.length*9);
    normals = new Float32Array(positions.length*9);
    colors = new Float32Array(positions.length*9);
    points = new Float32Array(positions.length*3);

    var cs = 1
    for(let i = 0; i < positions.length ;i++) {
        var r = Math.random()*cs
        var g = Math.random()*cs
        var b = Math.random()*cs

        r = Math.random()*cs
        g = r
        b = r

        // r = 0
        // g = 0
        // b = 0

        for(let j = 0; j < 3; j++)
        {
            colors[i*9+j*3] = r
            colors[i*9+j*3 + 1] = g
            colors[i*9+j*3 + 2] = b

            normals[i*9+j*3] = 0
            normals[i*9+j*3 + 1] = 0
            normals[i*9+j*3 + 2] = 1
        } 

    }

    loop()
}
