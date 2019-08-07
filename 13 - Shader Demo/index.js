var projection = mat4.create()  // projection matrix
var modelview = mat4.create()   // modelview matrix; value comes from rotator
var normalMatrix = mat3.create()    // matrix, derived from modelview matrix, for transforming normal vectors

var scale = 1
var dt = 1000/60
var time = 0
var loopTimeout
var G = 20

var framebuffer

var base
var baseSize = 8
var balls = []
var ballMat

var lights = []
var lightMesh
var lightSpeed = 0.0001

var textures = []

/* Initialize the WebGL context.  Called from init() */
function init() {
    glInit(() => {

        rotator = new TrackballRotator(canvas, draw, 20)
        zoomer = new Zoomer(canvas) 
 
        var urls = ['space.jpg']
        var complete = 0
        for(let i = 0; i < urls.length; i++) {
            textures[urls[i]] = gl.createTexture()
            loadTexture(urls[i], textures[urls[i]], () => {
                complete++
                if(complete == urls.length)
                    reset()
            });  // load the texture image 
        }
    })

    document.body.onkeyup = function(e){
        if(e.keyCode == 32){
            reset()
        }
    }   
}

/*function createBall(radius, mat, position) {
    var id = balls.length
    var obj = initObject({
        mat:mat,
        model:uvSphere(radius, 64, 32)
    }) 

    balls.push({
        id:id,
        obj:obj,
        position:position,
        radius:radius,
    })
}*/

function randomColor() {
    var f = 0.5
    var r = Math.pow(Math.random(), f)
    var g = Math.pow(Math.random(), f)
    var b = Math.pow(Math.random(), f)
    return [r, g, b, 1]
}

function reset() {
    // 
    var testMaterials = []

    // Unlit color
    var unlitUniformMat = initMaterial("unlitUniformColor", {color: randomColor()})
    testMaterials.push({
        mat:unlitUniformMat
    })

    // Unlit texture
    testMaterials.push({
        mat:initMaterial("unlitTexture"),
        update:() => { 
            gl.bindTexture(gl.TEXTURE_2D, textures["space.jpg"]);
        }
    })

    // Phong color
    var phongColorMat = initMaterial("phongColor", {
        diffuseColor: randomColor(),
        specularColor: [1,1,1,1], 
        specularExponent: 1,
        ambientLighting:0.2
    })
    // testMaterials.push({mat:phongColorMat})

    // Phong texture

    // Toon

    // Stencil

    // Sizzle
    shaders["sizzle"] = {
        attributes: {
            "coords":"vec3", 
            "color":"vec3"
        },
        uniforms: {
            "modelview":"mat4", 
            "projection":"mat4",
            "normalMatrix":"mat3",
            "lightPosition":"vec4",
            "diffuseColor":"vec4",
            "specularColor":"vec3",
            "specularExponent":"float",
            "time":"float"
        }
    }
    var sizzleMat = initMaterial("sizzle", {
        diffuseColor:randomColor(),
        specularColor: [1,1,1,1],
        specularExponent:1
    })
    // testMaterials.push({mat:sizzleMat})

    ballMesh = initObject({
        mat:testMaterials[0].mat,
        model:uvSphere(0.5, 64, 32)
    })  

    balls = []

    for(let i = 0; i < testMaterials.length; i++) {
        var rot = i*(2*Math.PI/testMaterials.length)
        var radius = 1
        var distance = 2
        var position = vec3.fromValues(Math.cos(rot)*distance, -2+radius, Math.sin(rot)*distance)

        balls.push({
            mat:testMaterials[i].mat,
            radius:radius,
            position:position,
            update: testMaterials[i].update
        })
        // console.log(testMaterials[i])
        // createBall(radius, testMaterials[i], position)
    }
    console.log("BALLS")
    console.log(balls)

    // Light
    var lightMat = initMaterial("unlitUniformColor", {name: "lightMat"})
    lightMesh = initObject({mat:lightMat, model:uvSphere(0.5)})
    var numLights = 1
    for(let i = 0; i < numLights; i++) {
        var lightColor = [1, 0.8, 0.8, 1]
        var light = {
            position:vec4.create(),
            color:lightColor
        }
        lights.push(light)
    }

    // Base
    var baseMat = initMaterial("unlitUniformColor", {color: [0.5, 0.5, 0.5, 1], name: "baseMat"})
    base = initObject({
        mat:baseMat,
        model:plane(baseSize)
    }) 

    if(loopTimeout != null)
        clearTimeout(loopTimeout)
    loop()
}

function loop() {
    draw()


    // Animate light in a halo
    var lightHeight = 3
    var lightDistance = 4
    for(let i = 0; i < lights.length; i++) {
        var rot = i*2*Math.PI/lights.length + lightSpeed*time*Math.PI
        vec4.set(lights[i].position, Math.cos(rot)*lightDistance, lightHeight, Math.sin(rot)*lightDistance, 1)
    }

    loopTimeout = setTimeout(loop, dt)

    time += dt
}

function draw() { 
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    gl.enable(gl.DEPTH_TEST) 

    // Draw perspective object
    mat4.perspective(projection, Math.PI/3, 1, 5, 80);
    if(zoomer) {
        var zoom = zoomer.getZoomScale()
        rotator.setViewDistance(lerp(10, 40, (1-clamp(zoom, 0, 1))))
    }

    modelview = rotator.getViewMatrix();
    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))
    mat3.normalFromMat4(normalMatrix, modelview);

    for(let i = 0; i < balls.length; i++) {
        pushTransform(modelview)
        // var bScale = balls[i].radius/0.5
        mat4.translate(modelview, modelview, balls[i].position);
        // mat4.scale(modelview, modelview, vec3.fromValues(bScale, bScale, bScale))
        ballMesh.mat = balls[i].mat
        console.log("MAT " + balls[i].mat.name)
        ballMesh.mat.loadProgram()

        // Update uniforms for mat
        ballMesh.mat.setUniform("lightPosition", lights[0].position)
        ballMesh.mat.setUniform("time", time)

        if(balls[i].update != null)
            balls[i].update()

        ballMesh.draw(modelview, projection, normalMatrix)
        popTransform(modelview) 
    }

    pushTransform(modelview)
    mat4.translate(modelview, modelview, vec3.fromValues(0, -2, 0))
    base.draw(modelview, projection)
    popTransform(modelview)
}