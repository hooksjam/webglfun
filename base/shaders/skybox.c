<script type="x-shader/x-vertex" id="skybox-vshader-source">
     uniform mat4 projection;
     uniform mat4 modelview;
     attribute vec3 a_coords;
     varying vec3 v_coords;
     void main() {
        vec4 eyeCoords = modelview * vec4(a_coords,1.0);
        gl_Position = projection * eyeCoords;
        v_coords = a_coords;
     }
</script>
<script type="x-shader/x-fragment" id="skybox-fshader-source">
     precision mediump float;
     varying vec3 v_coords;
     uniform samplerCube skybox;
     void main() {
          gl_FragColor = textureCube(skybox, v_coords);
     }
</script>