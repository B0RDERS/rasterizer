@group(1) @binding(1) var<uniform> cameraPos : vec4<f32>;
@group(2) @binding(0) var<storage> lightPosition : array<vec4<f32>>;
@group(2) @binding(1) var<storage> lightColor : array<vec4<f32>>;

@fragment
fn main(
    @location(0) fragPosition : vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragColor: vec4<f32>
) -> @location(0) vec4<f32> {
    

    return fragColor;
}