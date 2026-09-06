use crate::model::{Mat3, Rgb};
pub const ID: Mat3 = [[1.,0.,0.],[0.,1.,0.],[0.,0.,1.]];
pub const XYZ_TO_RGB: Mat3 = [[1.716651,-0.355671,-0.253366],[-0.666684,1.616481,0.015769],[0.01764,-0.042771,0.942103]];
pub const RGB_TO_XYZ: Mat3 = [[0.636958,0.144617,0.168881],[0.2627,0.677998,0.059302],[0.,0.028073,1.060985]];
const XYZ_TO_SRGB: Mat3 = [[3.240454,-1.537139,-0.498531],[-0.969266,1.876011,0.041556],[0.055643,-0.204026,1.057225]];
pub fn mv(m: Mat3, v: Rgb) -> Rgb { m.map(|r| r[0]*v[0]+r[1]*v[1]+r[2]*v[2]) }
pub fn mm(a: Mat3,b: Mat3) -> Mat3 { std::array::from_fn(|i| std::array::from_fn(|j| (0..3).map(|k| a[i][k]*b[k][j]).sum())) }
pub fn inverse(m: Mat3) -> Result<Mat3,String> {
    let [a,b,c]=m;
    let cof=[[b[1]*c[2]-b[2]*c[1],a[2]*c[1]-a[1]*c[2],a[1]*b[2]-a[2]*b[1]],
        [b[2]*c[0]-b[0]*c[2],a[0]*c[2]-a[2]*c[0],a[2]*b[0]-a[0]*b[2]],
        [b[0]*c[1]-b[1]*c[0],a[1]*c[0]-a[0]*c[1],a[0]*b[1]-a[1]*b[0]]];
    let d=a[0]*cof[0][0]+a[1]*cof[1][0]+a[2]*cof[2][0];
    if !d.is_finite() || d.abs()<1e-8 {return Err("DNG 颜色矩阵不可逆".into());}
    Ok(cof.map(|r| r.map(|x|x/d)))
}
pub fn white(temp: f32) -> Rgb {
    let t=temp.clamp(2000.,12000.);
    let x=if t<=4000. {-0.2661239e9/t.powi(3)-0.234358e6/t.powi(2)+0.8776956e3/t+0.179910}
        else {-3.0258469e9/t.powi(3)+2.1070379e6/t.powi(2)+0.2226347e3/t+0.240390};
    let y=if t<=2222. {-1.1063814*x.powi(3)-1.3481102*x*x+2.1855583*x-0.20219683}
        else if t<=4000. {-0.9549476*x.powi(3)-1.3741859*x*x+2.09137*x-0.16748867}
        else {3.081758*x.powi(3)-5.8733864*x*x+3.7511299*x-0.37001483};
    [x/y,1.,(1.-x-y)/y]
}
pub fn adapt(src: Rgb,dst: Rgb) -> Mat3 {
    let bradford=[[0.8951,0.2664,-0.1614],[-0.7502,1.7135,0.0367],[0.0389,-0.0685,1.0296]];
    let s=mv(bradford,src); let d=mv(bradford,dst);
    let scale=[[d[0]/s[0],0.,0.],[0.,d[1]/s[1],0.],[0.,0.,d[2]/s[2]]];
    mm(inverse(bradford).unwrap(),mm(scale,bradford))
}
pub fn camera_matrix(xyz_to_cam: Mat3, wb: Rgb) -> Result<Mat3,String> {
    let cam_to_xyz=inverse(xyz_to_cam)?;
    let neutral=wb.map(|v|1./v.max(1e-6));
    let source=mv(cam_to_xyz,neutral);
    let source=source.map(|v|v/source[1]);
    // White balance and chromatic adaptation are a single transform, applied once.
    Ok(mm(XYZ_TO_RGB,mm(adapt(source,[0.95047,1.,1.08883]),cam_to_xyz)))
}
pub fn encode(rgb: Rgb) -> Rgb {
    mv(mm(XYZ_TO_SRGB,RGB_TO_XYZ),rgb).map(|v| {
        let v=v.clamp(0.,1.); if v<=0.0031308 {12.92*v} else {1.055*v.powf(1./2.4)-0.055}
    })
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn equal_temperatures_are_identity() {
        let v=[0.18,0.3,0.7]; let r=mv(adapt(white(5500.),white(5500.)),v);
        for i in 0..3 {assert!((r[i]-v[i]).abs()<1e-5);}
    }
    #[test] fn matrix_inverse_roundtrip() {
        let v=[0.12,0.3,0.7]; let r=mv(inverse(RGB_TO_XYZ).unwrap(),mv(RGB_TO_XYZ,v));
        for i in 0..3 {assert!((r[i]-v[i]).abs()<1e-5);}
    }
}
