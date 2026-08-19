// BG Manager — multiple WebGL shader backgrounds with toggle
(function () {
  "use strict";

  var container = document.getElementById("pageBgContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "pageBgContainer";
    container.style.cssText =
      "position:fixed;inset:0;z-index:-2;pointer-events:none;overflow:hidden";
    document.body.insertBefore(container, document.body.firstChild);
  }

  var toggleBtn = document.getElementById("bgToggle");
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var currentBg = 0;
  var canvases = [];
  var cleanups = [];
  var bgNames = ["darkveil", "grainient", "plasma"];

  // ── Load saved preference ──
  try {
    var saved = localStorage.getItem("mpw-bg");
    if (saved) {
      var idx = bgNames.indexOf(saved);
      if (idx >= 0) currentBg = idx;
    }
  } catch (e) {}

  // ── Helpers ──
  function hexToRgb(hex) {
    var r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!r) return [1, 1, 1];
    return [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255];
  }

  function compileShader(gl, src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("BG shader:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function linkProgram(gl, vs, fs) {
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("BG program:", gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function fullScreenQuad(gl, prog, attrib) {
    var data = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, attrib || "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return buf;
  }

  function makeCanvas(glType) {
    var c = document.createElement("canvas");
    c.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    c.width = 1;
    c.height = 1;
    container.appendChild(c);

    var gl = c.getContext(glType);
    if (!gl) {
      console.warn("BG: " + glType + " not available");
      c.remove();
      return null;
    }
    return { canvas: c, gl: gl };
  }

  function setCanvasSize(gl, w, h, dprCap) {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap || 2);
    w = Math.round(w * dpr);
    h = Math.round(h * dpr);
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.viewport(0, 0, w, h);
    return { w: w, h: h };
  }

  // ═══════════════════════════════════════════════
  //  DarkVeil — CPPN (WebGL 1)
  // ═══════════════════════════════════════════════
  function initDarkVeil() {
    var ctx = makeCanvas("webgl") || makeCanvas("experimental-webgl");
    if (!ctx) return null;
    var gl = ctx.gl;

    var vs = [
      "attribute vec2 position;",
      "void main(){gl_Position=vec4(position,0.0,1.0);}",
    ].join("\n");

    var fs = [
      "precision highp float;",
      "uniform vec2 uResolution;",
      "uniform float uTime;",
      "uniform float uHueShift;",
      "vec4 buf[8];",
      "float rand(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);}",
      "mat3 rgb2yiq=mat3(0.299,0.587,0.114,0.596,-0.274,-0.322,0.211,-0.523,0.312);",
      "mat3 yiq2rgb=mat3(1.0,0.956,0.621,1.0,-0.272,-0.647,1.0,-1.106,1.703);",
      "vec3 hueShiftRGB(vec3 col,float deg){vec3 yiq=rgb2yiq*col;float rad=radians(deg);float cosh=cos(rad),sinh=sin(rad);vec3 yiqShift=vec3(yiq.x,yiq.y*cosh-yiq.z*sinh,yiq.y*sinh+yiq.z*cosh);return clamp(yiq2rgb*yiqShift,0.0,1.0);}",
      "vec4 sigmoid(vec4 x){return 1./(1.+exp(-x));}",
      "vec4 cppn_fn(vec2 c,float i0,float i1,float i2){",
      "buf[6]=vec4(c.x,c.y,0.3948333106474662+i0,0.36+i1);buf[7]=vec4(0.14+i2,sqrt(c.x*c.x+c.y*c.y),0.,0.);",
      "buf[0]=mat4(6.5404263,-3.6126034,0.7590882,-1.13613,2.4582713,3.1660357,1.2219609,0.06276096,-5.478085,-6.159632,1.8701609,-4.7742867,6.039214,-5.542865,-0.90925294,3.251348)*buf[6]+mat4(0.8473259,-5.722911,3.975766,1.6522468,-0.24321538,0.5839259,-1.7661959,-5.350116,0.,0.,0.,0.,0.,0.,0.,0.)*buf[7]+vec4(0.21808943,1.1243913,-1.7969975,5.0294676);",
      "buf[1]=mat4(-3.3522482,-6.0612736,0.55641043,-4.4719114,0.8631464,1.7432913,5.643898,1.6106541,2.4941394,-3.5012043,1.7184316,6.357333,3.310376,8.209261,1.1355612,-1.165539)*buf[6]+mat4(5.24046,-13.034365,0.009859298,15.870829,2.987511,3.129433,-0.89023495,-1.6822904,0.,0.,0.,0.,0.,0.,0.,0.)*buf[7]+vec4(-5.9457836,-6.573602,-0.8812491,1.5436668);",
      "buf[0]=sigmoid(buf[0]);buf[1]=sigmoid(buf[1]);",
      "buf[2]=mat4(-15.219568,8.095543,-2.429353,-1.9381982,-5.951362,4.3115187,2.6393783,1.274315,-7.3145227,6.7297835,5.2473326,5.9411426,5.0796127,8.979051,-1.7278991,-1.158976)*buf[6]+mat4(-11.967154,-11.608155,6.1486754,11.237008,2.124141,-6.263192,-1.7050359,-0.7021966,0.,0.,0.,0.,0.,0.,0.,0.)*buf[7]+vec4(-4.17164,-3.2281182,-4.576417,-3.6401186);",
      "buf[3]=mat4(3.1832156,-13.738922,1.879223,3.233465,0.64300746,12.768129,1.9141049,0.50990224,-0.049295485,4.4807224,1.4733979,1.801449,5.0039253,13.000481,3.3991797,-4.5561905)*buf[6]+mat4(-0.1285731,7.720628,-3.1425676,4.742367,0.6393625,3.714393,-0.8108378,-0.39174938,0.,0.,0.,0.,0.,0.,0.,0.)*buf[7]+vec4(-1.1811101,-21.621881,0.7851888,1.2329718);",
      "buf[2]=sigmoid(buf[2]);buf[3]=sigmoid(buf[3]);",
      "buf[4]=mat4(5.214916,-7.183024,2.7228765,2.6592617,-5.601878,-25.3591,4.067988,0.4602802,-10.57759,24.286327,21.102104,37.546658,4.3024497,-1.9625226,2.3458803,-1.372816)*buf[0]+mat4(-17.6526,-10.507558,2.2587414,12.462782,6.265566,-502.75443,-12.642513,0.9112289,-10.983244,20.741234,-9.701768,-0.7635988,5.383626,1.4819539,-4.1911616,-4.8444734)*buf[1]+mat4(12.785233,-16.345072,-0.39901125,1.7955981,-30.48365,-1.8345358,1.4542528,-1.1118771,19.872723,-7.337935,-42.941723,-98.52709,8.337645,-2.7312303,-2.2927687,-36.142323)*buf[2]+mat4(-16.298317,3.5471997,-0.44300047,-9.444417,57.5077,-35.609753,16.163465,-4.1534753,-0.07470326,-3.8656476,-7.0901804,3.1523974,-12.559385,-7.077619,1.490437,-0.8211543)*buf[3]+vec4(-7.67914,15.927437,1.3207729,-1.6686112);",
      "buf[5]=mat4(-1.4109162,-0.372762,-3.770383,-21.367174,-6.2103205,-9.35908,0.92529047,8.82561,11.460242,-22.348068,13.625772,-18.693201,-0.3429052,-3.9905605,-2.4626114,-0.45033523)*buf[0]+mat4(7.3481627,-4.3661838,-6.3037653,-3.868115,1.5462853,6.5488915,1.9701879,-0.58291394,6.5858274,-2.2180402,3.7127688,-1.3730392,-5.7973905,10.134961,-2.3395722,-5.965605)*buf[1]+mat4(-2.5132585,-6.6685553,-1.4029363,-0.16285264,-0.37908727,0.53738135,4.389061,-1.3024765,-0.70647055,2.0111287,-5.1659346,-3.728635,-13.562562,10.487719,-0.9173751,-2.6487076)*buf[2]+mat4(-8.645013,6.5546675,-6.3944063,-5.5933375,-0.57783127,-1.077275,36.91025,5.736769,14.283112,3.7146652,7.1452246,-4.5958776,2.7192075,3.6021907,-4.366337,-2.3653464)*buf[3]+vec4(-5.9000807,-4.329569,1.2427121,8.59503);",
      "buf[4]=sigmoid(buf[4]);buf[5]=sigmoid(buf[5]);",
      "buf[6]=mat4(-1.61102,0.7970257,1.4675229,0.20917463,-28.793737,-7.1390953,1.5025433,4.656581,-10.94861,39.66238,0.74318546,-10.095605,-0.7229728,-1.5483948,0.7301322,2.1687684)*buf[0]+mat4(3.2547753,21.489103,-1.0194173,-3.3100595,-3.7316632,-3.3792162,-7.223193,-0.23685838,13.1804495,0.7916005,5.338587,5.687114,-4.167605,-17.798311,-6.815736,-1.6451967)*buf[1]+mat4(0.604885,-7.800309,-7.213122,-2.741014,-3.522382,-0.12359311,-0.5258442,0.43852118,9.6752825,-22.853785,2.062431,0.099892326,-4.3196306,-17.730087,2.5184598,5.30267)*buf[2]+mat4(-6.545563,-15.790176,-6.0438633,-5.415399,-43.591583,28.551912,-16.00161,18.84728,4.212382,8.394307,3.0958717,8.657522,-5.0237565,-4.450633,-4.4768,-5.5010443)*buf[3]+mat4(1.6985557,-67.05806,6.897715,1.9004834,1.8680354,2.3915145,2.5231109,4.081538,11.158006,1.7294737,2.0738268,7.386411,-4.256034,-306.24686,8.258898,-17.132736)*buf[4]+mat4(1.6889864,-4.5852966,3.8534803,-6.3482175,1.3543309,-1.2640043,9.932754,2.9079645,-5.2770967,0.07150358,-0.13962056,3.3269649,28.34703,-4.918278,6.1044083,4.085355)*buf[5]+vec4(6.6818056,12.522166,-3.7075126,-4.104386);",
      "buf[7]=mat4(-8.265602,-4.7027016,5.098234,0.7509808,8.6507845,-17.15949,16.51939,-8.884479,-4.036479,-2.3946867,-2.6055532,-1.9866527,-2.2167742,-1.8135649,-5.9759874,4.8846445)*buf[0]+mat4(6.7790847,3.5076547,-2.8191125,-2.7028968,-5.743024,-0.27844876,1.4958696,-5.0517144,13.122226,15.735168,-2.9397483,-4.101023,-14.375265,-5.030483,-6.2599335,2.9848232)*buf[1]+mat4(4.0950394,-0.94011575,-5.674733,4.755022,4.3809423,4.8310084,1.7425908,-3.437416,2.117492,0.16342592,-104.56341,16.949184,-5.22543,-2.994248,3.8350096,-1.9364246)*buf[2]+mat4(-5.900337,1.7946124,-13.604192,-3.8060522,6.6583457,31.911177,25.164474,91.81147,11.840538,4.1503043,-0.7314397,6.768467,-6.3967767,4.034772,6.1714606,-0.32874924)*buf[3]+mat4(3.4992442,-196.91893,-8.923708,2.8142626,3.4806502,-3.1846354,5.1725626,5.1804223,-2.4009497,15.585794,1.2863957,2.0252278,-71.25271,-62.441242,-8.138444,0.50670296)*buf[4]+mat4(-12.291733,-11.176166,-7.3474145,4.390294,10.805477,5.6337385,-0.9385842,-4.7348723,-12.869276,-7.039391,5.3029537,7.5436664,1.4593618,8.91898,3.5101583,5.840625)*buf[5]+vec4(2.2415268,-6.705987,-0.98861027,-2.117676);",
      "buf[6]=sigmoid(buf[6]);buf[7]=sigmoid(buf[7]);",
      "buf[0]=mat4(1.6794263,1.3817469,2.9625452,0.,-1.8834411,-1.4806935,-3.5924516,0.,-1.3279216,-1.0918057,-2.3124623,0.,0.2662234,0.23235129,0.44178495,0.)*buf[0]+mat4(-0.6299101,-0.5945583,-0.9125601,0.,0.17828953,0.18300213,0.18182953,0.,-2.96544,-2.5819945,-4.9001055,0.,1.4195864,1.1868085,2.5176322,0.)*buf[1]+mat4(-1.2584374,-1.0552157,-2.1688404,0.,-0.7200217,-0.52666044,-1.438251,0.,0.15345335,0.15196142,0.272854,0.,0.945728,0.8861938,1.2766753,0.)*buf[2]+mat4(-2.4218085,-1.968602,-4.35166,0.,-22.683098,-18.0544,-41.954372,0.,0.63792,0.5470648,1.1078634,0.,-1.5489894,-1.3075932,-2.6444845,0.)*buf[3]+mat4(-0.49252132,-0.39877754,-0.91366625,0.,0.95609266,0.7923952,1.640221,0.,0.30616966,0.15693925,0.8639857,0.,1.1825981,0.94504964,2.176963,0.)*buf[4]+mat4(0.35446745,0.3293795,0.59547555,0.,-0.58784515,-0.48177817,-1.0614829,0.,2.5271258,1.9991658,4.6846647,0.,0.13042648,0.08864098,0.30187556,0.)*buf[5]+mat4(-1.7718065,-1.4033192,-3.3355875,0.,3.1664357,2.638297,5.378702,0.,-3.1724713,-2.6107926,-5.549295,0.,-2.851368,-2.249092,-5.3013067,0.)*buf[6]+mat4(1.5203838,1.2212278,2.8404984,0.,1.5210563,1.2651345,2.683903,0.,2.9789467,2.4364579,5.2347264,0.,2.2270417,1.8825914,3.8028636,0.)*buf[7]+vec4(-1.5468478,-3.6171484,0.24762098,0.);",
      "buf[0]=sigmoid(buf[0]);",
      "return vec4(buf[0].x,buf[0].y,buf[0].z,1.);}",
      "void main(){",
      "vec2 uv=gl_FragCoord.xy/uResolution.xy*2.-1.;uv.y*=-1.;uv*=1.3;uv.y-=0.25;",
      "vec4 col=cppn_fn(uv,0.1*sin(0.3*uTime),0.1*sin(0.69*uTime),0.1*sin(0.44*uTime));",
      "col.rgb=hueShiftRGB(col.rgb,uHueShift);",
      "gl_FragColor=vec4(clamp(col.rgb,0.0,1.0),1.0);}",
    ].join("\n");

    var vs = compileShader(gl, vs, gl.VERTEX_SHADER);
    var frag = compileShader(gl, fs, gl.FRAGMENT_SHADER);
    if (!vs || !frag) return null;
    var prog = linkProgram(gl, vs, frag);
    if (!prog) return null;
    gl.useProgram(prog);
    var quadBuffer = fullScreenQuad(gl, prog);

    var uRes = gl.getUniformLocation(prog, "uResolution");
    var uTime = gl.getUniformLocation(prog, "uTime");
    var uHue = gl.getUniformLocation(prog, "uHueShift");

    function resize() {
      var s = setCanvasSize(gl, window.innerWidth, window.innerHeight);
      gl.uniform2f(uRes, s.w, s.h);
    }
    window.addEventListener("resize", resize);
    resize();
    gl.uniform1f(uHue, 280);

    var start = performance.now();
    var running = true;
    var pausedAt = null;
    var frameId = null;
    (function loop() {
      if (!running) return;
      if (!document.hidden && gl.canvas.style.display !== "none") {
        if (pausedAt !== null) {
          start += performance.now() - pausedAt;
          pausedAt = null;
        }
        gl.uniform1f(uTime, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else if (pausedAt === null) {
        pausedAt = performance.now();
      }
      if (REDUCED_MOTION || window.MPW_RENDER_TEST?.disableWebglRaf) return;
      frameId = requestAnimationFrame(loop);
    })();

    return function () {
      running = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(quadBuffer);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(frag);
      ctx.canvas.remove();
    };
  }

  // ═══════════════════════════════════════════════
  //  Grainient — noise gradient (WebGL 2)
  // ═══════════════════════════════════════════════
  function initGrainient() {
    var ctx = makeCanvas("webgl2");
    if (!ctx) return null;
    var gl = ctx.gl;
    var c1 = hexToRgb("#FF9FFC"),
      c2 = hexToRgb("#5227FF"),
      c3 = hexToRgb("#B497CF");

    var vs = [
      "#version 300 es",
      "in vec2 position;",
      "void main(){gl_Position=vec4(position,0.0,1.0);}",
    ].join("\n");

    var fs = [
      "#version 300 es", "precision highp float;",
      "uniform vec2 iResolution;uniform float iTime;",
      "uniform float uTimeSpeed;uniform float uColorBalance;",
      "uniform float uWarpStrength;uniform float uWarpFrequency;",
      "uniform float uWarpSpeed;uniform float uWarpAmplitude;",
      "uniform float uBlendAngle;uniform float uBlendSoftness;",
      "uniform float uRotationAmount;uniform float uNoiseScale;",
      "uniform float uGrainAmount;uniform float uGrainScale;",
      "uniform float uGrainAnimated;uniform float uContrast;",
      "uniform float uGamma;uniform float uSaturation;",
      "uniform vec2 uCenterOffset;uniform float uZoom;",
      "uniform vec3 uColor1;uniform vec3 uColor2;uniform vec3 uColor3;",
      "out vec4 fragColor;",
      "#define S(a,b,t) smoothstep(a,b,t)",
      "mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}",
      "vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}",
      "float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return 0.5+0.5*mix(mix(dot(-1.0+2.0*hash(i+vec2(0,0)),f-vec2(0,0)),dot(-1.0+2.0*hash(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0,1)),f-vec2(0,1)),dot(-1.0+2.0*hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}",
      "void main(){",
      "float t=iTime*uTimeSpeed;",
      "vec2 uv=gl_FragCoord.xy/iResolution.xy;",
      "float ratio=iResolution.x/iResolution.y;",
      "vec2 tuv=uv-0.5+uCenterOffset;tuv/=max(uZoom,.001);",
      "float degree=noise(vec2(t*.1,tuv.x*tuv.y)*uNoiseScale);",
      "tuv.y*=1./ratio;tuv*=Rot(radians((degree-.5)*uRotationAmount+180.));tuv.y*=ratio;",
      "tuv.x+=sin(tuv.y*uWarpFrequency+t*uWarpSpeed)/(uWarpAmplitude/max(uWarpStrength,.001));",
      "tuv.y+=sin(tuv.x*(uWarpFrequency*1.5)+t*uWarpSpeed)/(uWarpAmplitude*.5/max(uWarpStrength,.001));",
      "vec3 l1=mix(uColor3,uColor2,S(-.3-uColorBalance-uBlendSoftness,.2-uColorBalance+uBlendSoftness,(tuv*Rot(radians(uBlendAngle))).x));",
      "vec3 l2=mix(uColor2,uColor1,S(-.3-uColorBalance-uBlendSoftness,.2-uColorBalance+uBlendSoftness,(tuv*Rot(radians(uBlendAngle))).x));",
      "vec3 col=mix(l1,l2,S(.5-uColorBalance+uBlendSoftness,-.3-uColorBalance-uBlendSoftness,tuv.y));",
      "vec2 grainUv=uv*max(uGrainScale,.001);",
      "if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}",
      "float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);",
      "col+=(grain-0.5)*uGrainAmount;",
      "col=(col-.5)*uContrast+.5;",
      "col=mix(vec3(dot(col,vec3(.2126,.7152,.0722))),col,uSaturation);",
      "col=pow(max(col,0.),vec3(1./max(uGamma,.001)));",
      "fragColor=vec4(clamp(col,0.,1.),1.);}",
    ].join("\n");

    var vs = compileShader(gl, vs, gl.VERTEX_SHADER);
    var frag = compileShader(gl, fs, gl.FRAGMENT_SHADER);
    if (!vs || !frag) return null;
    var prog = linkProgram(gl, vs, frag);
    if (!prog) return null;
    gl.useProgram(prog);
    var quadBuffer = fullScreenQuad(gl, prog);

    function uloc(n) { return gl.getUniformLocation(prog, n); }
    gl.uniform1f(uloc("uTimeSpeed"), .25);
    gl.uniform1f(uloc("uColorBalance"), 0);
    gl.uniform1f(uloc("uWarpStrength"), 1);
    gl.uniform1f(uloc("uWarpFrequency"), 5);
    gl.uniform1f(uloc("uWarpSpeed"), 2);
    gl.uniform1f(uloc("uWarpAmplitude"), 50);
    gl.uniform1f(uloc("uBlendAngle"), 0);
    gl.uniform1f(uloc("uBlendSoftness"), .05);
    gl.uniform1f(uloc("uRotationAmount"), 500);
    gl.uniform1f(uloc("uNoiseScale"), 2);
    gl.uniform1f(uloc("uGrainAmount"), .1);
    gl.uniform1f(uloc("uGrainScale"), 2);
    gl.uniform1f(uloc("uGrainAnimated"), 0);
    gl.uniform1f(uloc("uContrast"), 1.5);
    gl.uniform1f(uloc("uGamma"), 1);
    gl.uniform1f(uloc("uSaturation"), 1);
    gl.uniform2f(uloc("uCenterOffset"), 0, 0);
    gl.uniform1f(uloc("uZoom"), .9);
    gl.uniform3f(uloc("uColor1"), c1[0], c1[1], c1[2]);
    gl.uniform3f(uloc("uColor2"), c2[0], c2[1], c2[2]);
    gl.uniform3f(uloc("uColor3"), c3[0], c3[1], c3[2]);
    var uRes = uloc("iResolution"),
      uTime = uloc("iTime");

    function resize() {
      var s = setCanvasSize(gl, window.innerWidth, window.innerHeight);
      gl.uniform2f(uRes, s.w, s.h);
    }
    window.addEventListener("resize", resize);
    resize();

    var start = performance.now();
    var running = true;
    var pausedAt = null;
    var frameId = null;
    (function loop() {
      if (!running) return;
      if (!document.hidden && gl.canvas.style.display !== "none") {
        if (pausedAt !== null) {
          start += performance.now() - pausedAt;
          pausedAt = null;
        }
        gl.uniform1f(uTime, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else if (pausedAt === null) {
        pausedAt = performance.now();
      }
      if (REDUCED_MOTION || window.MPW_RENDER_TEST?.disableWebglRaf) return;
      frameId = requestAnimationFrame(loop);
    })();

    return function () {
      running = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(quadBuffer);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(frag);
      ctx.canvas.remove();
    };
  }

  // ═══════════════════════════════════════════════
  //  Plasma — WebGL 2 plasma effect (from React Bits)
  // ═══════════════════════════════════════════════
  function initPlasma() {
    var ctx = makeCanvas("webgl2");
    if (!ctx) return null;
    var gl = ctx.gl;
    var canvas = ctx.canvas;

    // Configuration
    var color = "#A855F7";
    var speed = 0.6;
    var direction = "forward";
    var scale = 1.1;
    var opacity = 0.8;
    var mouseInteractive = true;

    var customColorRgb = hexToRgb(color);
    var useCustomColor = color ? 1.0 : 0.0;
    var directionMultiplier = direction === "reverse" ? -1.0 : 1.0;

    var vs = [
      "#version 300 es",
      "precision highp float;",
      "in vec2 position;",
      "in vec2 uv;",
      "out vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = vec4(position, 0.0, 1.0);",
      "}",
    ].join("\n");

    var fs = [
      "#version 300 es",
      "precision highp float;",
      "uniform vec2 iResolution;",
      "uniform float iTime;",
      "uniform vec3 uCustomColor;",
      "uniform float uUseCustomColor;",
      "uniform float uSpeed;",
      "uniform float uDirection;",
      "uniform float uScale;",
      "uniform float uOpacity;",
      "uniform vec2 uMouse;",
      "uniform float uMouseInteractive;",
      "out vec4 fragColor;",
      "",
      "void mainImage(out vec4 o, vec2 C) {",
      "  vec2 center = iResolution.xy * 0.5;",
      "  C = (C - center) / uScale + center;",
      "  ",
      "  vec2 mouseOffset = (uMouse - center) * 0.0002;",
      "  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);",
      "  ",
      "  float i, d, z, T = iTime * uSpeed * uDirection;",
      "  vec3 O, p, S;",
      "",
      "  for (vec2 r = iResolution.xy, Q; ++i < 32.; O += o.w/d*o.xyz) {",
      "    p = z*normalize(vec3(C-.5*r,r.y)); ",
      "    p.z -= 4.; ",
      "    S = p;",
      "    d = p.y-T;",
      "    ",
      "    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); ",
      "    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); ",
      "    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4; ",
      "    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));",
      "  }",
      "  ",
      "  o.xyz = tanh(O/1e4);",
      "}",
      "",
      "bool finite1(float x){ return !(isnan(x) || isinf(x)); }",
      "vec3 sanitize(vec3 c){",
      "  return vec3(",
      "    finite1(c.r) ? c.r : 0.0,",
      "    finite1(c.g) ? c.g : 0.0,",
      "    finite1(c.b) ? c.b : 0.0",
      "  );",
      "}",
      "",
      "void main() {",
      "  vec4 o = vec4(0.0);",
      "  mainImage(o, gl_FragCoord.xy);",
      "  vec3 rgb = sanitize(o.rgb);",
      "  ",
      "  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;",
      "  vec3 customColor = intensity * uCustomColor;",
      "  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));",
      "  ",
      "  float alpha = length(rgb) * uOpacity;",
      "  fragColor = vec4(finalColor, alpha);",
      "}",
    ].join("\n");

    var vsShader = compileShader(gl, vs, gl.VERTEX_SHADER);
    var fsShader = compileShader(gl, fs, gl.FRAGMENT_SHADER);
    if (!vsShader || !fsShader) return null;
    var prog = linkProgram(gl, vsShader, fsShader);
    if (!prog) return null;
    gl.useProgram(prog);

    // Create fullscreen triangle (not quad - ogl uses Triangle)
    var vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
    var uvs = new Float32Array([0, 0, 2, 0, 0, 2]);
    var posLoc = gl.getAttribLocation(prog, "position");
    var uvLoc = gl.getAttribLocation(prog, "uv");

    var posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    function uloc(n) { return gl.getUniformLocation(prog, n); }
    var uTime = uloc("iTime");
    var uResolution = uloc("iResolution");
    var uCustomColor = uloc("uCustomColor");
    var uUseCustomColor = uloc("uUseCustomColor");
    var uSpeed = uloc("uSpeed");
    var uDirection = uloc("uDirection");
    var uScale = uloc("uScale");
    var uOpacity = uloc("uOpacity");
    var uMouse = uloc("uMouse");
    var uMouseInteractive = uloc("uMouseInteractive");

    // Set initial uniforms
    gl.uniform3f(uCustomColor, customColorRgb[0], customColorRgb[1], customColorRgb[2]);
    gl.uniform1f(uUseCustomColor, useCustomColor);
    gl.uniform1f(uSpeed, speed * 0.4);
    gl.uniform1f(uDirection, directionMultiplier);
    gl.uniform1f(uScale, scale);
    gl.uniform1f(uOpacity, opacity);
    gl.uniform2f(uMouse, 0, 0);
    gl.uniform1f(uMouseInteractive, mouseInteractive ? 1.0 : 0.0);

    // Mouse interaction
    var mousePos = { x: 0, y: 0 };
    function handleMouseMove(e) {
      if (!mouseInteractive) return;
      var rect = canvas.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
      gl.uniform2f(uMouse, mousePos.x, mousePos.y);
    }
    if (mouseInteractive) {
      canvas.style.pointerEvents = "auto";
      canvas.addEventListener("mousemove", handleMouseMove);
    }

    // Resize handler
    function resize() {
      var s = setCanvasSize(gl, window.innerWidth, window.innerHeight, 1);
      gl.uniform2f(uResolution, s.w, s.h);
    }
    window.addEventListener("resize", resize);
    resize();

    // Animation loop
    var start = performance.now();
    var running = true;
    var pausedAt = null;
    var pingpongDuration = 10;

    function loop() {
      if (!running) return;
      if (!document.hidden && canvas.style.display !== "none") {
        if (pausedAt !== null) {
          start += performance.now() - pausedAt;
          pausedAt = null;
        }
        var timeValue = (performance.now() - start) * 0.001;
        if (direction === "pingpong") {
          var segmentTime = timeValue % pingpongDuration;
          var isForward = Math.floor(timeValue / pingpongDuration) % 2 === 0;
          var u = segmentTime / pingpongDuration;
          var smooth = u * u * (3 - 2 * u);
          var pingpongTime = isForward
            ? smooth * pingpongDuration
            : (1 - smooth) * pingpongDuration;
          gl.uniform1f(uDirection, 1.0);
          gl.uniform1f(uTime, pingpongTime);
        } else {
          gl.uniform1f(uTime, timeValue);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (pausedAt === null) {
        pausedAt = performance.now();
      }
      if (REDUCED_MOTION) return;
      frameId = requestAnimationFrame(loop);
    }

    var frameId = null;
    if (REDUCED_MOTION || window.MPW_RENDER_TEST?.disableWebglRaf) {
      loop();
    } else {
      frameId = requestAnimationFrame(loop);
    }

    return function () {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      if (mouseInteractive) {
        canvas.removeEventListener("mousemove", handleMouseMove);
      }
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(uvBuf);
      gl.deleteProgram(prog);
      gl.deleteShader(vsShader);
      gl.deleteShader(fsShader);
      canvas.remove();
    };
  }

  // ═══════════════════════════════════════════════
  //  Background switcher
  // ═══════════════════════════════════════════════
  var inits = [initDarkVeil, initGrainient, initPlasma];

  function initializeBackground(idx) {
    if (canvases[idx]) {
      return true;
    }

    var initialChildCount = container.children.length;
    try {
      var cleanup = inits[idx]();
      var canvas = container.children[initialChildCount] || null;

      if (!cleanup || !canvas) {
        canvas?.remove();
        return false;
      }

      canvases[idx] = canvas;
      cleanups[idx] = cleanup;
      canvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        if (cleanups[idx] !== cleanup) return;

        cleanup();
        cleanups[idx] = null;
        canvases[idx] = null;
        window.setTimeout(function () {
          if (idx === currentBg) showBg(currentBg);
        }, 0);
      }, { once: true });
      return true;
    } catch (e) {
      var createdCanvas = container.children[initialChildCount];
      createdCanvas?.remove();
      console.warn("BG init " + idx + ":", e);
      return false;
    }
  }

  function showBg(idx) {
    if (idx !== currentBg) {
      cleanups.forEach(function (cleanup, i) {
        if (i !== idx && (cleanup || canvases[i])) {
          cleanupBackground(i);
        }
      });
    }

    if (!initializeBackground(idx)) {
      return;
    }

    canvases.forEach(function (canvas, i) {
      if (canvas) canvas.style.display = i === idx ? "block" : "none";
    });

    currentBg = idx;
    try { localStorage.setItem("mpw-bg", bgNames[idx]); } catch (e) {}

    if (toggleBtn) {
      var label = bgNames[idx];
      if (idx === 1 || idx === 2) label += " (WebGL 2)";
      toggleBtn.title = label;
      toggleBtn.setAttribute("aria-label", "切换背景效果，当前 " + bgNames[idx]);
    }
  }

  function cleanupBackground(idx) {
    var cleanup = cleanups[idx];
    if (cleanup) cleanup();
    cleanups[idx] = null;
    canvases[idx] = null;
  }

  showBg(currentBg);

  function cleanupAll() {
    cleanups.forEach(function (cleanup, idx) {
      if (cleanup || canvases[idx]) cleanupBackground(idx);
    });
  }

  window.addEventListener("pagehide", function (event) {
    if (!event.persisted) cleanupAll();
  });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && !canvases[currentBg]) showBg(currentBg);
  });

  // ── Toggle ──
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var next = (currentBg + 1) % inits.length;
      showBg(next);
    });
  }
})();
