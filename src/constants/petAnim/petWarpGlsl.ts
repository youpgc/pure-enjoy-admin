/**
 * 分层弯曲着色器原文（**生成物，勿手改**）。
 * 生成：`node pet_anim_demo/tools/export_admin_preview.mjs --yes`
 * 源：`pet_anim_demo/render/pet_warp_glsl.mjs`（其源为冻结件 `cat_gl_warp.mjs` 的 `glWarpSrc()`，
 *     由 `render/build_portable.mjs` 抽取并已由 `render/check_portable.mjs` 逐字符对拍）。
 *
 * 两条不许动的口径：
 * · 两轴各两抽头、算式与判据一字未改；
 * · 档位走 uniform（uGeo.w 横向核、uRes.w 竖向档），不在文本里拼分支。
 */

export const vert = "attribute vec2 ap;\nvoid main(){gl_Position=vec4(ap,0.0,1.0);}";
export const frag = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform vec3 uPose;uniform vec4 uGeo;uniform vec4 uXf;uniform vec4 uRes;uniform sampler2D uTex;\nfloat ss(float u){u=clamp(u,0.0,1.0);return u*u*(3.0-2.0*u);}\nfloat cr(float q){return q<1.0?((1.5*q-2.5)*q*q+1.0):(((-0.5*q+2.5)*q-4.0)*q+2.0);}\nfloat l2(float d){if(d<0.000001)return 1.0;if(d>=2.0)return 0.0;float x=3.14159265*d;float h=x*0.5;return sin(x)*sin(h)/(x*h);}\nvec4 wxw(float f,float m){vec4 lin=vec4(0.0,1.0-f,f,0.0);\nvec4 c=vec4(cr(1.0+f),cr(f),cr(1.0-f),cr(2.0-f));\nvec4 l=vec4(l2(1.0+f),l2(f),l2(1.0-f),l2(2.0-f));\nreturn m<0.5?lin:(m<1.5?c:l);}\nvec4 f1(float x,float y){return texture2D(uTex,(vec2(x,y)+0.5)*uRes.z);}\nvoid main(){\nfloat X=gl_FragCoord.x-0.5;float Y=uRes.x-0.5-gl_FragCoord.y;\nfloat v=(Y-uXf.w)/uXf.y;float u=(X-uXf.z)/uXf.x;\nfloat a=uPose.x*ss((uGeo.x-v-0.5)*uGeo.y);\nfloat dv=uPose.y*ss((uGeo.x-v)*uGeo.z);\nfloat xs=u+a*(v-uPose.z);\nfloat ys=v-dv;\nfloat cx=xs+uRes.y;float cy=ys+uRes.y;\nfloat bx=floor(cx);float by=floor(cy);float fr=cy-by;\nfloat g=uRes.w<0.5?fr:(fr>=0.5?1.0:0.0);\nvec4 w=wxw(cx-bx,uGeo.w);\nvec4 ca=w.x*f1(bx-1.0,by)+w.y*f1(bx,by)+w.z*f1(bx+1.0,by)+w.w*f1(bx+2.0,by);\nvec4 cb=w.x*f1(bx-1.0,by+1.0)+w.y*f1(bx,by+1.0)+w.z*f1(bx+1.0,by+1.0)+w.w*f1(bx+2.0,by+1.0);\ngl_FragColor=(1.0-g)*ca+g*cb;\n}";
export const glsl = { vert, frag };
