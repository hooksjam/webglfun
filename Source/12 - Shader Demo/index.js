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
var balls = []
var ballMat

var ambient = 0.1

var light
var lightMesh
var lightSpeed = 0.0001

var textures = []

/* Initialize the WebGL context.  Called from init() */
function init() {
    glInit(() => {

        rotator = new TrackballRotator(canvas, draw, 20)
        zoomer = new Zoomer(canvas, 0.8) 

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
        reset()
    })

    document.body.onkeyup = function(e){
        if(e.keyCode == 32){
            reset()
        }
    }   
}

function createBall(radius, matDef, position, res = 1) {
    var id = balls.length
    var obj = initObject({
        mat:matDef.mat,
        model:uvSphere(radius, 32*res, 16*res)
    }) 

    balls.push({
        id:id,
        obj:obj,
        update:matDef.update,
        position:position,
        radius:radius,
    })
}

function randomColor() {
    var f = 0.5
    var min = 0.0
    var max = 1
    var r = Math.pow(lerp(min, max, Math.random()), f)
    var g = Math.pow(lerp(min, max, Math.random()), f)
    var b = Math.pow(lerp(min, max, Math.random()), f)
    return [r, g, b, 1]
}

function reset() {
    var testMaterials = []

    // Unlit color
    var unlitUniformMat = initMaterial("unlitUniformColor", {color: randomColor()})
    testMaterials.push({mat:unlitUniformMat})

    // Lambert color
    var lambertColorMat = initMaterial("lambertColor", {
        diffuseColor: randomColor(), 
        ambientLighting: ambient
    })
    testMaterials.push({mat:lambertColorMat})

    // Phong color
    var phongColorMat = initMaterial("phongColor", {
        diffuseColor: randomColor(),
        specularColor: [1,1,1,1], 
        specularExponent: 1,
        ambientLighting: ambient
    })
    testMaterials.push({mat:phongColorMat})

    // Toon
    var toonMat = initMaterial("toon", {
        diffuseColor: randomColor(),
        ambientLighting: ambient,
        factor: 1.5
    })
    testMaterials.push({mat:toonMat})

    var toonPhongMat = initMaterial("toonPhong", {
        diffuseColor: randomColor(),
        ambientLighting: ambient,
        factor: 2
    })
    testMaterials.push({mat:toonPhongMat})

    // Sizzle
    var sizzleMat = initMaterial("sizzle", {
        diffuseColor:randomColor(),
        specularColor: [1,1,1,1],
        specularExponent:1
    })
    testMaterials.push({mat:sizzleMat})

    // Remove
    var removeMat = initMaterial("phongRemove", {
        diffuseColor:randomColor(),
        ambientLighting:ambient
    })
    testMaterials.push({mat:removeMat})

    balls = []
        
    var radius = 1
    var spacing = 1
    var circumference = (radius*2 + spacing)*testMaterials.length
    var distance = circumference/(2*Math.PI)
    if(testMaterials.length == 0)
        distance = 0

    for(let i = 0; i < testMaterials.length; i++) {
        var rot = i*(2*Math.PI/testMaterials.length)
        var position = vec3.fromValues(Math.cos(rot)*distance, -2+radius, Math.sin(rot)*distance)
        createBall(radius, testMaterials[i], position)
    }

    // Light
    var lightColor = [1, 1, 1, 1]
    var lightMat = initMaterial("unlitUniformColor", {color:lightColor, name: "lightMat"})
    var lightMesh = initObject({mat:lightMat, model:uvSphere(0.5)})
    light = {
        position:vec4.create(),
        obj: lightMesh,
        color:lightColor
    }

    // Base
    var baseMat = initMaterial("unlitUniformColorCircle", {color: randomColor(), name: "baseMat"})
    base = initObject({
        mat:baseMat,
        model:plane(distance*3)
    }) 

    if(loopTimeout != null)
        clearTimeout(loopTimeout)
    loop()
}

function loop() {
    // Animate light in a halo
    var lightHeight = 3
    var lightDistance = 4
    var rot = lightSpeed*time*Math.PI
    vec4.set(light.position, Math.cos(rot)*lightDistance, lightHeight, Math.sin(rot)*lightDistance, 1)

    draw()
    loopTimeout = setTimeout(loop, dt)

    time += dt
}

function draw() { 
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    gl.enable(gl.DEPTH_TEST) 

    // Draw perspective object
    mat4.perspective(projection, Math.PI/3, 1, 2, 80);
    if(zoomer) {
        var zoom = zoomer.getZoomScale()
        rotator.setViewDistance(lerp(5, 30, (1-clamp(zoom, 0, 1))))
    }

    modelview = rotator.getViewMatrix();
    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))
    mat3.normalFromMat4(normalMatrix, modelview);

    for(let i = 0; i < balls.length; i++) {
        pushTransform(modelview)
        // var bScale = balls[i].radius/0.5
        mat4.translate(modelview, modelview, balls[i].position);
        // mat4.scale(modelview, modelview, vec3.fromValues(bScale, bScale, bScale))
        // balls[i].obj.mat = balls[i].mat
        // ballMesh.mat.loadProgram()

        // Update uniforms for mat
        balls[i].obj.mat.setUniform("lightPosition", light.position)
        balls[i].obj.mat.setUniform("time", time)

        if(balls[i].update != null)
            balls[i].update()

        balls[i].obj.draw(modelview, projection, normalMatrix)
        popTransform(modelview) 
    }

    pushTransform(modelview)
    mat4.translate(modelview, modelview, light.position);
    light.obj.draw(modelview, projection)
    popTransform(modelview)

    pushTransform(modelview)
    mat4.translate(modelview, modelview, vec3.fromValues(0, -2, 0))
    base.draw(modelview, projection)
    popTransform(modelview)
}