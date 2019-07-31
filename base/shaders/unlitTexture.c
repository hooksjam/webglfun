#BEGIN VERT

attribute vec3 a_coords;
attribute vec2 a_texcoord;
uniform mat4 modelview;
uniform mat4 projection; 
varying vec2 v_texcoord;

void main() {
	vec4 coords = vec4(a_coords, 1.0);
	vec4 eyeCoords = modelview * coords;
	gl_Position = projection * eyeCoords;
	v_texcoord = a_texcoord;
} 

#END VERT

#BEGIN FRAG

#ifdef GL_FRAGMENT_PRECISION_HIGH
	precision highp float;
#else
	precision mediump float;
#endif
uniform sampler2D u_texture;
varying vec2 v_texcoord;

void main() {
	gl_FragColor = texture2D(u_texture, v_texcoord);
}    

#END FRAG