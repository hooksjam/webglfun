var projection = mat4.create()  // projection matrix
var modelview = mat4.create()   // modelview matrix; value comes from rotator
var normalMatrix = mat3.create()    // matrix, derived from modelview matrix, for transforming normal vectors

var scale = 1
var dt = 1000/60
var time = 0
var loopTimeout

var fieldSize = 100000
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

var framebuffer

var numBodies = 1
var bodies = []
var G = 0.001

var field = null
var orb = null
var testCube = null
var skybox = null
var skyboxCubemap; // The static cubemap texture for the skybox, loaded in loadTextureCube()

// Skybox variables 
var inverseViewTransform = mat3.create();  // The inverse of the view transform rotation matrix, used in skybox shader program.

var textureSize = 512
var reflectionCubemap; // The cubemap texture for the teapot, created dynamically.
var cubemapTargets; // For convenience, an array containing the six constants, such as
                    // gl.TEXTURE_CUBE_MAP_POSITIVE_X, that represent the faces of a cubemap texture.
                    // Created in initGL().
var fieldTexture;

/* Initialize the WebGL context.  Called from init() */
function init() {
    glInit(() => {

        rotator = new TrackballRotator(canvas, draw, 30)
        zoomer = new Zoomer(canvas) 

        cubemapTargets = [
           gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
           gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
           gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z 
        ];
 
        reset()
    })

    document.body.onkeyup = function(e){
        if(e.keyCode == 32){
            reset()
        }
    }   
}

function reset() {
    frequencies = [
        lerp(freqMin, freqMax, Math.random()),
        lerp(freqMin, freqMax, Math.random()),
        lerp(freqMin, freqMax, Math.random()),
        4]

    seeds = [Math.random(), Math.random(), Math.random(), Math.random()]

    modelview = mat4.create()

    // Test bodies
    for(let i = 0; i < numBodies; i++) {
        // Test cube
        var color = defaultColors[Math.floor(Math.random()*defaultColors.length)]
        color.push(1)
        var mat = initMaterial("unlitUniformColor", {
            "color": color
        })
        var body = initObject({
            mat:mat,
            model:uvSphere(1)
        })

        // Pick random distance
        var distance = 10
        var scale = 1 //+ Math.random()

        // Pick random rotation
        var rot = Math.random()*2*Math.PI

        var position = vec3.fromValues(Math.cos(rot)*distance, 0, Math.sin(rot)*distance)
        var speed = Math.sqrt(G/distance)
        // var velocity = vec3.fromValues(0,0,0)
        var velocity = vec3.create()
        vec3.cross(velocity, position, vec3.fromValues(0, 1, 0)) 
        vec3.normalize(velocity, velocity)
        vec3.scale(velocity, velocity, speed)



        bodies.push({
            obj:body,
            position:position,
            velocity:velocity,
            scale:scale
        })

    }

    // Test cube
    /*var color = defaultColors[0]
    color.push(1)
    color = [0.4, 0.4, 0.4, 0.4]
    var mat = initMaterial("unlitUniformColor", {
        "color": color
    })
    testCube = initObject({
        mat:mat,
        model:cube(1)
    })*/

    /** Start by creating the cube map **/
    createCubemapAndSkybox();  

    // Create our center object
    orb = initObject({
        shader:"cubemapReflection",
        model:uvSphere(3, 128, 128)
    })

    if(loopTimeout != null)
        clearTimeout(loopTimeout)
    loop()
}

function loop() {
    renderCubemap()

    var dv = vec3.create()
    var dx = vec3.create()
    var normalPos = vec3.create()
    for(let i = 0; i < bodies.length; i++) {
        // Acceleration of body
        var body = bodies[i]
        var distance = vec3.len(body.position)
        vec3.normalize(normalPos, body.position)

        vec3.scale(dv, normalPos, -dt*G/Math.pow(distance, 2))

        vec3.add(body.velocity, body.velocity, dv)
        vec3.scale(dx, body.velocity, dt)
        vec3.add(body.position, body.position, dx)
    }

    draw()

    loopTimeout = setTimeout(loop, dt)

    time += dt
}

function draw() { 
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    gl.enable(gl.DEPTH_TEST) 

    // Draw perspective object
    mat4.perspective(projection, Math.PI/5, 1, 5, 50);
    modelview = rotator.getViewMatrix();

    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))
    if(zoomer) {
        // var zoom = zoomer.getZoomScale()
        // mat4.scale(modelview, modelview, vec3.fromValues(zoom,zoom,zoom))
    }
    mat3.normalFromMat4(normalMatrix, modelview);

    drawSkyboxAndRest()

    if(orb) {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflectionCubemap)

        mat3.fromMat4(inverseViewTransform, modelview);
        mat3.invert(inverseViewTransform,inverseViewTransform);
        // console.log("Setting inverseViewTransform for orb")
        orb.mat.setUniform("inverseViewTransform", inverseViewTransform)

        orb.draw(modelview, projection, normalMatrix)
    }

    /*if(cube) {
        gl.bindTexture(gl.TEXTURE_2D, fieldTexture);    
        cube.draw(modelview, projection, normalMatrix)
    }*/
    //orb.draw()
}

function drawSkyboxAndRest() {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxCubemap);    
    if(skybox) {
        skybox.draw(modelview, projection, normalMatrix)
    }

    // Spheres
    for(let i = 0; i < bodies.length; i++) {
        pushTransform(modelview)

        // mat4.scale(modelview, modelview, bodies[i].scale)
        mat4.translate(modelview, modelview, bodies[i].position);
        bodies[i].obj.draw(modelview, projection)

        popTransform(modelview)
    }
}

function createCubemapAndSkybox() {
    framebuffer = gl.createFramebuffer()

    field = initObject({
        shader:"unlitPoint",
        elements:fieldSize,
        drawMode: gl.POINTS
    })
    // field.draw = () => {}
    generateField()

    // Setup skybox with field texture
    skybox = initObject({
        shader:"skybox",
        model: cube(15)
    })


    renderSkybox()

    // Render cubemap

    // Using our skybox with the newly rendered field texture, render a cubemap from a camera at the center
    renderCubemap()
}

function renderSkybox() {
    // Setup
    skyboxCubemap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxCubemap); 
    for(i = 0; i < 6; i++) {
        gl.texImage2D(cubemapTargets[i], 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    } 

    gl.viewport(0,0,textureSize, textureSize)
    mat4.ortho(projection, -1.0, 1.0, -1.0, 1.0, 0.1, 100);

    mat4.identity(modelview)

    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);

    for (var j = 0; j < 6; j++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, cubemapTargets[j], skyboxCubemap, 0)
        gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        field.draw(modelview, projection, null, true) 
    }

    // Finalize
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxCubemap);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP); 

    // Reset
    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0, canvas.width, canvas.height)
}

function renderCubemap() {
    // Setup
    reflectionCubemap = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflectionCubemap); 
    for (i = 0; i < 6; i++) {
        gl.texImage2D(cubemapTargets[i], 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            //With null as the last parameter, the previous function allocates memory for the texture and fills it with zeros.
    }  

    gl.viewport(0,0,textureSize, textureSize)
    mat4.perspective(projection, Math.PI/2, 1, 1, 100);  // Set projection to give 90-degree field of view.

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

    
    // Render into each of the cubemaps
    mat4.identity(modelview);
    mat4.scale(modelview,modelview,[-1,-1,1]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, reflectionCubemap, 0);
    drawSkyboxAndRest()

    mat4.identity(modelview);
    mat4.scale(modelview,modelview,[-1,-1,1]);
    mat4.rotateY(modelview,modelview,Math.PI/2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X, reflectionCubemap, 0);
    drawSkyboxAndRest()

    mat4.identity(modelview);
    mat4.scale(modelview,modelview,[-1,-1,1]);
    mat4.rotateY(modelview,modelview,Math.PI);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, reflectionCubemap, 0);
    drawSkyboxAndRest()

    mat4.identity(modelview);
    mat4.scale(modelview,modelview,[-1,-1,1]);
    mat4.rotateY(modelview,modelview,-Math.PI/2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, reflectionCubemap, 0);
    drawSkyboxAndRest()
    
    mat4.identity(modelview);
    mat4.rotateX(modelview,modelview,Math.PI/2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, reflectionCubemap, 0);
    drawSkyboxAndRest()
    
    mat4.identity(modelview);
    mat4.rotateX(modelview,modelview,-Math.PI/2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, reflectionCubemap, 0);
    drawSkyboxAndRest()

    // Finalize
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflectionCubemap);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    // Reset
    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0, canvas.width, canvas.height)
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
        var randZ = -4

        var vec = vec3.fromValues(randX, randY, randZ)
        points.push(vec)
    }


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

        field.setValue("coords", i*3 + 0, -1 + 2*points[i][0])
        field.setValue("coords", i*3 + 1, -1 + 2*points[i][1])
        field.setValue("coords", i*3 + 2, 2*points[i][2])

        field.setValue("color", i*3 + 0, Math.min(clearVal + lerp(r, r2, f3)*(1-clearVal), 1))
        field.setValue("color", i*3 + 1, Math.min(clearVal + lerp(g, g2, f3)*(1-clearVal), 1))
        field.setValue("color", i*3 + 2, Math.min(clearVal + lerp(b, b2, f3)*(1-clearVal), 1))

        field.setValue("size", i, s)
        // field.setValue("color", i*3 + 0, 1)
        // field.setValue("color", i*3 + 1, 1)
        // field.setValue("color", i*3 + 2, 1)
        // field.setValue("size", i, 1)
    }

    field.dirtyAttributes()

    //console.log("Min: " + min + " Max: " + max)
}