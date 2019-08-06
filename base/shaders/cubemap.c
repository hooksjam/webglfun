<script type="x-shader/x-vertex" id="cubemap-vshader-source">
     uniform mat4 projection;
     uniform mat4 modelview;
     attribute vec3 a_coords;
     attribute vec3 a_normal;
     varying vec3 v_eyeCoords;
     varying vec3 v_normal;
     void main() {
        vec4 eyeCoords = modelview * vec4(a_coords,1.0);
        gl_Position = projection * eyeCoords;
        v_eyeCoords = eyeCoords.xyz;
        v_normal = normalize(a_normal);
     }
</script>
<script type="x-shader/x-fragment" id="cubemap-fshader-source">
     precision mediump float;
     varying vec3 vCoords;
     varying vec3 v_normal;
     varying vec3 v_eyeCoords;
     uniform samplerCube skybox;
     uniform mat3 normalMatrix;
     uniform mat3 inverseViewTransform;
     void main() {
          vec3 N = normalize(normalMatrix * v_normal);
          vec3 V = -v_eyeCoords;
          vec3 R = -reflect(V,N);
          vec3 T = inverseViewTransform * R; // Transform by inverse of the view transform that was applied to the skybox
          gl_FragColor = textureCube(skybox, T);
     }
</script>
