@group(0) @binding(0) var<uniform> lightCount : i32;
@group(0) @binding(1) var<storage> lightPosition : array<vec3f>;
@group(0) @binding(2) var<storage> lightColor : array<vec4f>;
@group(2) @binding(1) var<uniform> cameraPos : vec4f;


@fragment
fn main(
    @location(0) fragPosition : vec3f,
    @location(1) fragNormal: vec3f,
    @location(2) fragColor: vec4f
) -> @location(0) vec4<f32> {
    const ambient = vec3f(.1);
    const spec: f32 = 4;
    var color: vec4f = vec4f(ambient, 1);
    let toView: vec3f = normalize(cameraPos.xyz - fragPosition);
    for(var i=0; i<lightCount; i+=1){
        let toLight: vec3f = normalize(lightPosition[i] - fragPosition);
        let halfLight: vec3f = normalize(toView + toLight);
        let r: f32 = length(cameraPos.xyz - fragPosition);
        let d: f32 = max(0, dot(fragNormal, toLight)) * lightColor[i].a / (r*r);
        let s: f32 = pow(max(0, dot(fragNormal, halfLight)), spec) * lightColor[i].a / (r*r);
        color += vec4f((d+s)*lightColor[i].xyz, 0);
    }
    return color;
}