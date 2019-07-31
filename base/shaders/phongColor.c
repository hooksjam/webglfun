#BEGIN VERT

attribute vec3 a_coords;
attribute vec3 a_normal;

uniform mat4 modelview;
uniform mat4 projection; 
varying vec3 v_normal;
varying vec3 v_eyeCoords; 

void main() {
	vec4 coords = vec4(a_coords, 1.0);
	vec4 eyeCoords = modelview * coords;
	gl_Position = projection * eyeCoords;

	v_normal = a_normal;
	v_eyeCoords = eyeCoords.xyz/eyeCoords.w; // (Note: eyeCoords.w is 1 unless modelview is weird) 
} 

#END VERT


#BEGIN FRAG


#ifdef GL_FRAGMENT_PRECISION_HIGH
	precision highp float;
#else
	precision mediump float;
#endif
uniform mat3 normalMatrix; 
uniform vec4 lightPosition;
uniform vec4 diffuseColor;
uniform vec3 specularColor;
uniform float specularExponent; 
varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_eyeCoords;

void main() {
	vec3 N, L, R, V;  // vectors for lighting equation
	N = normalize( normalMatrix*v_normal );
	if ( lightPosition.w == 0.0 ) {
	    L = normalize( lightPosition.xyz );
	} else {
	    L = normalize( lightPosition.xyz/lightPosition.w - v_eyeCoords );
	}
	R = -reflect(L,N);
	V = normalize( -v_eyeCoords);  // (Assumes a perspective projection.)
	if ( dot(L,N) <= 0.0 ) {
	    gl_FragColor = vec4(0,0,0,1);
	} else {
        vec3 color = 0.8*dot(L,N) * diffuseColor.rgb;
	    if (dot(R,V) > 0.0) {
	        color += 0.4*pow(dot(R,V),specularExponent) * specularColor;
	    } 
	    gl_FragColor = vec4(color, diffuseColor.a);
	} 
}    
#END FRAG