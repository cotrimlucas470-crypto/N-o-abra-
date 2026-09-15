import{q as we,G as T,r as R,m as U,D as Z,A as J,P as W,s as ae,M as z,t as be,u as ye,v as ve,w as ne,h as Me,x as Ae,a as d,V as D,f as _e,g as ue,l as I,k as oe,y as De,z as V,Q as B,F as w,H as Fe,T as Se,J as Re,R as Ce,K as ge,W as K,N as de,U as Ee,X as Be,Y as Te,Z as ze,d as Ue,c as fe,_ as Pe,$ as qe,p as Oe,a0 as Ve,a1 as Ie,a2 as Ge}from"./three-4FLR0lB0.js";import{G as $,a as se,r as n,b as Le,c as Ne,d as ce,e as g,m as Q,P as xe,f as P,g as $e,s as ke,l as je,h as We,t as C}from"./index-DsStDjCM.js";import"./gsap-Bxtl4DJ9.js";function Qe(){const l=new ne,a=new z(new Me(60,32,24),new U({side:Ae,depthWrite:!1,uniforms:{},vertexShader:`
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        varying vec3 vDir;
        ${$}
        ${se}
        void main(){
          float h = vDir.y * 0.5 + 0.5;
          vec3 base = mix(vec3(0.016,0.028,0.062), vec3(0.008,0.012,0.028), smoothstep(0.35,1.0,h));
          base = mix(vec3(0.020,0.010,0.046), base, smoothstep(0.0,0.45,h));

          // duas fontes frias, uma quente-espectral: é o que aparece nos reflexos
          float a = pow(max(0.0, dot(normalize(vDir), normalize(vec3( 0.75, 0.32,-0.55)))), 22.0);
          float b = pow(max(0.0, dot(normalize(vDir), normalize(vec3(-0.68, 0.12, 0.42)))), 16.0);
          float c = pow(max(0.0, dot(normalize(vDir), normalize(vec3( 0.05,-0.85, 0.20)))), 9.0);
          base += vec3(0.00,0.62,0.86) * a * 1.35;
          base += vec3(0.42,0.30,1.00) * b * 1.05;
          base += vec3(0.10,0.16,0.34) * c * 0.55;

          // faixas verticais frias: paredes de vidro do salão vistas de longe
          float faixa = fbm(vec2(atan(vDir.z, vDir.x) * 3.2, vDir.y * 2.4));
          base += vec3(0.05,0.12,0.22) * smoothstep(0.55, 0.95, faixa) * 0.7;
          gl_FragColor = vec4(base, 1.0);
        }
      `}));l.add(a);const e=(o,s,t,i,r)=>{const u=new z(new W(1,1),new _e({color:new R(o).multiplyScalar(s)}));u.position.copy(t),u.scale.set(i.x,i.y,1),u.rotation.set(r.x,r.y,r.z),l.add(u)};return e(58879,5,new d(14,6,-10),new D(3,26),new d(0,-.9,.2)),e(8086015,3.8,new d(-16,2,8),new D(3.4,22),new d(0,1.1,-.15)),e(15266303,2.6,new d(0,18,-18),new D(20,3),new d(-1.1,0,0)),l}function He(l,a=256){const e=new we(l);e.compileEquirectangularShader();const o=Qe(),s=e.fromScene(o,.02,.1,120);return o.traverse(t=>{t.geometry?.dispose?.(),t.material?.dispose?.()}),e.dispose(),s.texture}function Ze(l,a=7){const e=new T;e.name="nevoa";const o={uTempo:{value:0},uOpacidade:{value:1},uCorA:{value:new R(797261)},uCorB:{value:new R(2759253)}},s=new U({transparent:!0,depthWrite:!1,blending:J,side:Z,uniforms:o,vertexShader:`
      varying vec2 vUv; varying float vSeed;
      attribute float aSeed;
      void main(){
        vUv = uv; vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      varying vec2 vUv; varying float vSeed;
      uniform float uTempo; uniform float uOpacidade;
      uniform vec3 uCorA; uniform vec3 uCorB;
      ${$}
      ${se}
      void main(){
        vec2 p = vUv * vec2(2.6, 1.6) + vec2(uTempo * 0.012 + vSeed * 9.0, uTempo * 0.006);
        float n = fbm(p);
        n = smoothstep(0.34, 0.92, n);
        float borda = smoothstep(0.0, 0.42, vUv.x) * (1.0 - smoothstep(0.58, 1.0, vUv.x))
                    * smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
        vec3 cor = mix(uCorA, uCorB, fbm(p * 0.6 + 4.0));
        gl_FragColor = vec4(cor, n * borda * 0.20 * uOpacidade);
      }
    `}),t=new W(1,1);for(let i=0;i<a;i++){const r=t.clone();r.setAttribute("aSeed",new ae(new Float32Array([i,i,i,i].map(c=>c*.37)),1));const u=new z(r,s);u.position.set(n(l,-22,22),n(l,-8,12),n(l,-90,14)),u.scale.set(n(l,26,52),n(l,16,30),1),u.rotation.z=n(l,-.5,.5),u.renderOrder=-5,e.add(u)}return e.userData.uniforms=o,e}function Je(l,a=5){const e=new T;e.name="feixes";const o={uTempo:{value:0},uForca:{value:1}},s=new U({transparent:!0,depthWrite:!1,blending:J,side:Z,uniforms:o,vertexShader:`
      varying vec2 vUv; varying float vSeed;
      attribute float aSeed;
      void main(){ vUv = uv; vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,fragmentShader:`
      varying vec2 vUv; varying float vSeed;
      uniform float uTempo; uniform float uForca;
      void main(){
        float centro = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float feixe = pow(clamp(centro, 0.0, 1.0), 3.0);
        float desce = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        float pulso = 0.55 + 0.45 * sin(uTempo * 0.35 + vSeed * 6.0);
        vec3 cor = mix(vec3(0.0,0.72,0.95), vec3(0.45,0.34,1.0), fract(vSeed * 1.7));
        gl_FragColor = vec4(cor, feixe * desce * 0.13 * pulso * uForca);
      }
    `});for(let t=0;t<a;t++){const i=new W(1,1),r=new Float32Array(4).fill(t*.61);i.setAttribute("aSeed",new ae(r,1));const u=new z(i,s);u.position.set(n(l,-18,18),n(l,2,10),n(l,-80,6)),u.scale.set(n(l,3,7),n(l,26,44),1),u.rotation.set(n(l,-.25,.25),n(l,-.6,.6),n(l,-.3,.3)),u.renderOrder=-4,u.userData.baseX=u.position.x,u.userData.vel=n(l,.05,.16)*(l()<.5?-1:1),e.add(u)}return e.userData.uniforms=o,e}function Xe(l){const a=new be(1054507,1.2);l.add(a);const e=[],o=[{cor:58879,int:17,dist:46,raio:11,alt:5.5,vel:.12,fase:0},{cor:8086015,int:15,dist:44,raio:14,alt:-2.5,vel:-.09,fase:2.1},{cor:15266303,int:7,dist:30,raio:7,alt:9,vel:.17,fase:4.3}];for(const i of o){const r=new ye(i.cor,i.int,i.dist,2);r.userData=i,l.add(r),e.push(r)}const s=new ve(12577279,.8);s.position.set(6,12,8),l.add(s);const t=new ve(8086015,.6);return t.position.set(-8,-4,-12),l.add(t),{luzes:e,atualizar(i,r){for(const u of e){const c=u.userData;u.position.set(Math.cos(i*c.vel+c.fase)*c.raio,c.alt+Math.sin(i*c.vel*1.7+c.fase)*2.2,r+Math.sin(i*c.vel*.8+c.fase)*c.raio*.8-4)}}}}function te({envMap:l,transmissao:a=!1,cor:e=725026,rugosidade:o=.12,metalico:s=1,opacidade:t=1}={}){const i=new ue({color:new R(e),metalness:s,roughness:o,envMap:l||null,envMapIntensity:a?2.4:1.9,transparent:t<1||a,opacity:t,side:Z,clearcoat:.85,clearcoatRoughness:.12,iridescence:a?.45:.22,iridescenceIOR:1.35,reflectivity:.9,premultipliedAlpha:!1});a&&(i.transmission=.72,i.thickness=.55,i.ior=1.52,i.attenuationColor=new R(8378623),i.attenuationDistance=3.5,i.roughness=.06,i.metalness=.25);const r={uTempo:{value:0},uMouse:{value:new D(0,0)},uMouseForca:{value:.35},uDeriva:{value:.32},uScroll:{value:0},uDissolve:{value:0},uOnda:{value:0},uEscurecer:{value:0},uRimA:{value:new R(58879)},uRimB:{value:new R(8086015)},uRimForca:{value:1},uRachadura:{value:1}};return i.userData.uniforms=r,i.onBeforeCompile=u=>{Object.assign(u.uniforms,r),u.vertexShader=u.vertexShader.replace("#include <common>",`
        #include <common>
        attribute float aSeed;
        attribute float aVel;
        attribute float aBrilho;
        attribute float aRug;
        attribute float aEscalaInv;
        attribute vec3  aEixo;
        uniform float uTempo;
        uniform vec2  uMouse;
        uniform float uMouseForca;
        uniform float uDeriva;
        uniform float uScroll;
        uniform float uOnda;
        varying float vSeed;
        varying float vBrilho;
        varying float vRug;
        varying vec3  vLocal;
        ${$}
        ${Le}
        mat3 fragRot;
      `).replace("#include <beginnormal_vertex>",`
        float faseF = uTempo * aVel + aSeed * 6.2831853;
        fragRot = rotAxis(aEixo, faseF);
        vec3 objectNormal = fragRot * vec3( normal );
        #ifdef USE_TANGENT
          vec3 objectTangent = fragRot * vec3( tangent.xyz );
        #endif
      `).replace("#include <begin_vertex>",`
        vSeed = aSeed; vBrilho = aBrilho; vRug = aRug; vLocal = position;
        vec3 transformed = fragRot * vec3( position );

        // deriva própria: cada caco flutua no seu ritmo
        float d1 = sin(uTempo * 0.43 * aVel + aSeed * 11.0);
        float d2 = cos(uTempo * 0.37 * aVel + aSeed * 7.3);
        float d3 = sin(uTempo * 0.29 * aVel + aSeed * 4.1);
        transformed += vec3(d1, d2 * 1.4, d3) * uDeriva * aEscalaInv;

        // mouse e scroll empurram o campo com peso diferente por caco
        float peso = 0.45 + 0.55 * hash11(aSeed * 3.1);
        transformed += vec3(uMouse.x, uMouse.y, 0.0) * uMouseForca * peso * aEscalaInv;
        transformed.y += uScroll * 0.12 * peso * aEscalaInv;

        // onda de choque ao quebrar o tempo: empurrão radial curto
        transformed += normalize(position + vec3(0.001)) * uOnda * 0.55 * peso * aEscalaInv;
      `),u.fragmentShader=u.fragmentShader.replace("#include <common>",`
        #include <common>
        uniform float uDissolve;
        uniform float uEscurecer;
        uniform float uOnda;
        uniform float uRimForca;
        uniform float uRachadura;
        uniform vec3  uRimA;
        uniform vec3  uRimB;
        uniform float uTempo;
        varying float vSeed;
        varying float vBrilho;
        varying float vRug;
        varying vec3  vLocal;
        ${$}
        ${se}
        ${Ne}
      `).replace("#include <clipping_planes_fragment>",`
        #include <clipping_planes_fragment>
        float dissolveRuido = fbm(vLocal.xy * 4.5 + vSeed * 20.0);
        float corteD = uDissolve * 1.25;
        if (dissolveRuido < corteD - 0.12) discard;
        float bordaDissolve = (1.0 - smoothstep(corteD - 0.12, corteD, dissolveRuido)) * step(0.001, uDissolve);
      `).replace("#include <roughnessmap_fragment>",`
        #include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * vRug, 0.015, 0.95);
      `).replace("#include <normal_fragment_maps>",`
        #include <normal_fragment_maps>
        // rachaduras: poucas peças, linhas finíssimas, leitura de vidro trincado
        float temRachadura = step(0.80, hash11(vSeed * 37.13)) * uRachadura;
        vec2 rq = rachaduras(vLocal.xy * (1.6 + 2.2 * hash11(vSeed * 5.0)) + vSeed * 13.0);
        float linha = (1.0 - smoothstep(0.0, 0.012, rq.x)) * temRachadura;
        float fio = (1.0 - smoothstep(0.012, 0.030, rq.x)) * temRachadura * 0.5;
        normal = normalize(normal + vec3(linha * 0.35 * (rq.y - 0.5), linha * 0.35 * (rq.y - 0.5), 0.0));
      `).replace("#include <emissivemap_fragment>",`
        #include <emissivemap_fragment>
        vec3 vDirF = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(dot(normalize(normal), vDirF), 0.0, 1.0), 3.2);
        vec3 corRim = mix(uRimA, uRimB, hash11(vSeed * 91.7));
        totalEmissiveRadiance += corRim * fres * (0.22 + vBrilho * 0.85) * uRimForca;
        totalEmissiveRadiance += corRim * 0.035 * (0.35 + vBrilho) * uRimForca;
        // a trinca é uma fenda ESCURA com um fio de luz ao lado
        diffuseColor.rgb *= (1.0 - linha * 0.75);
        totalEmissiveRadiance += corRim * fio * 0.12 * (0.4 + vBrilho);
        totalEmissiveRadiance += mix(uRimA, vec3(1.0), 0.4) * bordaDissolve * 2.6;
        totalEmissiveRadiance += corRim * uOnda * 0.5 * fres;
      `).replace("#include <dithering_fragment>",`
        #include <dithering_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.16, uEscurecer);
      `)},i.customProgramCacheKey=()=>`caco-${a?"t":"o"}`,i}const Ye=[{nome:"longe",parallax:.4,raio:[16,42],escala:[.9,2.4],vel:[.05,.22],brilho:[.05,.4],deriva:.5},{nome:"medio",parallax:.7,raio:[9,21],escala:[.45,1.45],vel:[.12,.45],brilho:[.15,.7],deriva:.34},{nome:"perto",parallax:1,raio:[2.2,9.5],escala:[.22,1.15],vel:[.2,.75],brilho:[.3,1],deriva:.22}];class Ke{constructor({envMap:a,perfil:e,zInicio:o=22,zFim:s=-168}){this.envMap=a,this.zInicio=o,this.zFim=s,this.grupo=new T,this.grupo.name="fragmentos",this.camadas=[],this.vidros=[],this.materiais=[],this._mouse=new D,this._mouseSuave=new D,this.construir(e)}construir(a){this.destruir();const e=Q(20260915),o=ce(e,7);this._formasBase=o;for(const t of Ye){const i=a.fragmentos[t.nome]||0;if(!i)continue;const r=te({envMap:this.envMap,rugosidade:t.nome==="longe"?.2:.09,metalico:1});r.userData.uniforms.uDeriva.value=t.deriva,r.userData.uniforms.uRimForca.value=t.nome==="longe"?1.6:1.2,r.userData.uniforms.uMouseForca.value=.18*t.parallax,this.materiais.push(r);const u=new T;u.name=`camada-${t.nome}`,u.userData.parallax=t.parallax;const c=Math.max(1,Math.floor(i/o.length)),f=new I,v=new B,h=new V,x=new d,_=new d;for(let p=0;p<o.length;p++){const m=p===o.length-1?i-c*(o.length-1):c;if(m<=0)continue;const M=o[p].clone(),A=new oe(M,r,m);A.frustumCulled=!1,A.instanceMatrix.setUsage(De);const S=new Float32Array(m),F=new Float32Array(m),b=new Float32Array(m),q=new Float32Array(m),G=new Float32Array(m),E=new Float32Array(m*3),L=new R;for(let y=0;y<m;y++){const O=e()*Math.PI*2,N=n(e,t.raio[0],t.raio[1]),k=n(e,this.zFim,this.zInicio);x.set(Math.cos(O)*N,Math.sin(O)*N*.62+n(e,-3,4),k),h.set(e()*6.28,e()*6.28,e()*6.28),v.setFromEuler(h);const j=n(e,t.escala[0],t.escala[1]);_.set(j,j*n(e,.7,1.35),j*n(e,.7,1.2)),f.compose(x,v,_),A.setMatrixAt(y,f),S[y]=e(),F[y]=n(e,t.vel[0],t.vel[1]),b[y]=n(e,t.brilho[0],t.brilho[1]),q[y]=n(e,.35,2.6),G[y]=1/j;const H=new d(n(e,-1,1),n(e,-1,1),n(e,-1,1)).normalize();E[y*3]=H.x,E[y*3+1]=H.y,E[y*3+2]=H.z;const X=e();L.setHSL(X<.2?.72:.56,.32+e()*.3,.06+e()*.1),A.setColorAt(y,L)}M.setAttribute("aSeed",new w(S,1)),M.setAttribute("aVel",new w(F,1)),M.setAttribute("aBrilho",new w(b,1)),M.setAttribute("aRug",new w(q,1)),M.setAttribute("aEscalaInv",new w(G,1)),M.setAttribute("aEixo",new w(E,3)),A.instanceMatrix.needsUpdate=!0,A.instanceColor&&(A.instanceColor.needsUpdate=!0),u.add(A)}this.grupo.add(u),this.camadas.push({def:t,grupo:u,material:r})}const s=a.transmissao?a.heroVidro:0;if(s>0){const t=te({envMap:this.envMap,transmissao:!0,cor:9427199,opacidade:.92});t.userData.uniforms.uDeriva.value=.1,t.userData.uniforms.uMouseForca.value=.5,this.materiais.push(t);for(let i=0;i<s;i++){const r=o[i%o.length].clone(),u=new Float32Array([e()]);r.setAttribute("aSeed",new w(u,1)),r.setAttribute("aVel",new w(new Float32Array([n(e,.08,.3)]),1)),r.setAttribute("aBrilho",new w(new Float32Array([n(e,.4,1)]),1)),r.setAttribute("aRug",new w(new Float32Array([n(e,.3,1.2)]),1)),r.setAttribute("aEscalaInv",new w(new Float32Array([1]),1)),r.setAttribute("aEixo",new w(new Float32Array([e()-.5,1,e()-.5]),3));const c=new z(r,t),f=i/s*Math.PI*2+e(),v=n(e,3.6,8.2);c.position.set(Math.cos(f)*v,Math.sin(f)*v*.55+n(e,-1,2.5),n(e,-6,7)),c.rotation.set(e()*6.28,e()*6.28,e()*6.28);const h=n(e,.75,2.1);c.scale.setScalar(h),c.userData.vel=n(e,.05,.16)*(e()<.5?-1:1),c.userData.base=c.position.clone(),c.renderOrder=2,this.grupo.add(c),this.vidros.push(c)}}}set mouse(a){this._mouse.set(a.x,a.y)}atualizar(a,e,o){this._mouseSuave.x=g(this._mouseSuave.x,this._mouse.x,.002,a),this._mouseSuave.y=g(this._mouseSuave.y,this._mouse.y,.002,a);for(const{def:s,grupo:t,material:i}of this.camadas){const r=i.userData.uniforms;r.uTempo.value=e,r.uMouse.value.set(this._mouseSuave.x,this._mouseSuave.y),r.uScroll.value=o.scroll,r.uOnda.value=o.onda,r.uDissolve.value=o.dissolve,r.uEscurecer.value=o.escurecer;const u=s.parallax;t.position.x=g(t.position.x,this._mouseSuave.x*-1.9*u,.0015,a),t.position.y=g(t.position.y,this._mouseSuave.y*-1.2*u,.0015,a),t.rotation.z=g(t.rotation.z,this._mouseSuave.x*.035*u,.002,a)}for(const s of this.vidros){const t=s.material.userData.uniforms;t.uTempo.value=e,t.uMouse.value.set(this._mouseSuave.x,this._mouseSuave.y),t.uOnda.value=o.onda,t.uDissolve.value=o.dissolve,t.uEscurecer.value=o.escurecer,s.rotation.y+=a*s.userData.vel,s.rotation.x+=a*s.userData.vel*.6,s.position.x=g(s.position.x,s.userData.base.x-this._mouseSuave.x*2.4,.002,a),s.position.y=g(s.position.y,s.userData.base.y-this._mouseSuave.y*1.6+Math.sin(e*.4+s.userData.base.x)*.25,.002,a)}}destruir(){for(const{grupo:a}of this.camadas)a.traverse(e=>e.geometry?.dispose?.()),this.grupo.remove(a);for(const a of this.vidros)a.geometry.dispose(),this.grupo.remove(a);for(const a of this.materiais)a.dispose();this.camadas=[],this.vidros=[],this.materiais=[],this._formasBase?.forEach(a=>a.dispose?.())}}class ea{constructor({perfil:a}){this.caixa=new d(52,34,96),this._mouse=new D,this._mouseSuave=new D,this.grupo=new T,this.grupo.name="particulas",this.construir(a)}construir(a){this.destruir();const e=a.particulas,o=Q(77123),s=new W(1,1),t=new Fe;t.index=s.index,t.attributes.position=s.attributes.position,t.attributes.uv=s.attributes.uv,t.instanceCount=e;const i=new Float32Array(e*3),r=new Float32Array(e*3),u=new Float32Array(e),c=new Float32Array(e),f=new Float32Array(e),v=new Float32Array(e);for(let x=0;x<e;x++){i[x*3]=n(o,-this.caixa.x/2,this.caixa.x/2),i[x*3+1]=n(o,-this.caixa.y/2,this.caixa.y/2),i[x*3+2]=n(o,-this.caixa.z/2,this.caixa.z/2),r[x*3]=o()*10,r[x*3+1]=o()*10,r[x*3+2]=o()*10;const _=o()<.06;u[x]=_?n(o,.09,.2):n(o,.012,.05),c[x]=n(o,.3,2.4),f[x]=n(o,.02,.22)*(o()<.3?-1:1),v[x]=o()}t.setAttribute("aPos",new w(i,3)),t.setAttribute("aSeed",new w(r,3)),t.setAttribute("aTam",new w(u,1)),t.setAttribute("aAmp",new w(c,1)),t.setAttribute("aSub",new w(f,1)),t.setAttribute("aTom",new w(v,1)),this.uniforms={uTempo:{value:0},uCam:{value:new d},uCaixa:{value:this.caixa.clone()},uMouse:{value:new D},uRastro:{value:0},uOpacidade:{value:1},uEscurecer:{value:0},uOnda:{value:0},uCorA:{value:new R(10480127)},uCorB:{value:new R(10521855)}};const h=new U({uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:J,vertexShader:`
        attribute vec3 aPos; attribute vec3 aSeed;
        attribute float aTam; attribute float aAmp; attribute float aSub; attribute float aTom;
        uniform float uTempo; uniform vec3 uCam; uniform vec3 uCaixa;
        uniform vec2 uMouse; uniform float uRastro; uniform float uOnda;
        varying vec2 vUvP; varying float vTom; varying float vFade; varying float vEstica;
        ${$}

        vec3 deriva(float t){
          return vec3(
            sin(t * 0.21 + aSeed.x) * aAmp,
            cos(t * 0.17 + aSeed.y) * aAmp * 0.6 + t * aSub,
            sin(t * 0.13 + aSeed.z) * aAmp * 0.8
          );
        }

        void main(){
          vTom = aTom;
          vUvP = uv;

          vec3 p = aPos + deriva(uTempo);
          // o campo persegue a câmera: wrap toroidal em torno dela
          vec3 rel = p - uCam;
          rel = mod(rel + uCaixa * 0.5, uCaixa) - uCaixa * 0.5;

          // parallax das partículas: 0.2x — a camada mais lenta de todas
          rel.xy += uMouse * 0.2 * (0.4 + aTom);
          rel += normalize(rel + vec3(0.001)) * uOnda * 1.4;

          vec3 mundo = uCam + rel;
          vec4 mv = viewMatrix * vec4(mundo, 1.0);

          // velocidade analítica -> direção do rastro
          vec3 v = vec3(
            cos(uTempo * 0.21 + aSeed.x) * 0.21 * aAmp,
            -sin(uTempo * 0.17 + aSeed.y) * 0.102 * aAmp + aSub,
            cos(uTempo * 0.13 + aSeed.z) * 0.104 * aAmp
          );
          vec3 vView = (viewMatrix * vec4(v, 0.0)).xyz;
          float vel = length(vView.xy);
          vec2 dir = vel > 0.0001 ? vView.xy / vel : vec2(1.0, 0.0);
          float estica = 1.0 + uRastro * min(vel * 9.0, 7.0);
          vEstica = estica;

          vec2 q = position.xy * aTam;
          q.x *= estica;
          vec2 ap = vec2(q.x * dir.x - q.y * dir.y, q.x * dir.y + q.y * dir.x);
          mv.xy += ap;

          vFade = 1.0 - smoothstep(uCaixa.z * 0.16, uCaixa.z * 0.5, -rel.z + uCaixa.z * 0.5);
          gl_Position = projectionMatrix * mv;
        }
      `,fragmentShader:`
        precision highp float;
        varying vec2 vUvP; varying float vTom; varying float vFade; varying float vEstica;
        uniform float uOpacidade; uniform float uEscurecer;
        uniform vec3 uCorA; uniform vec3 uCorB;
        void main(){
          vec2 c = (vUvP - 0.5) * 2.0;
          c.x *= 1.0 / max(vEstica, 0.001) * vEstica; // mantém o núcleo redondo no rastro
          float d = length(vec2(c.x / max(vEstica * 0.35, 1.0), c.y));
          float nucleo = 1.0 - smoothstep(0.0, 1.0, d);
          float brilho = pow(nucleo, 3.0);
          vec3 cor = mix(uCorA, uCorB, vTom);
          float a = (nucleo * 0.35 + brilho * 0.9) * vFade * uOpacidade * (1.0 - uEscurecer * 0.75);
          if (a < 0.003) discard;
          gl_FragColor = vec4(cor * (0.5 + brilho), a);
        }
      `});this.malha=new z(t,h),this.malha.frustumCulled=!1,this.malha.renderOrder=3,this.grupo.add(this.malha)}set mouse(a){this._mouse.set(a.x,a.y)}atualizar(a,e,o,s){this._mouseSuave.x=g(this._mouseSuave.x,this._mouse.x,.004,a),this._mouseSuave.y=g(this._mouseSuave.y,this._mouse.y,.004,a);const t=this.uniforms;t.uTempo.value=e,t.uCam.value.copy(s),t.uMouse.value.set(this._mouseSuave.x*-3.2,this._mouseSuave.y*-2),t.uRastro.value=g(t.uRastro.value,o.rastro,.002,a),t.uOnda.value=o.onda,t.uEscurecer.value=o.escurecer}destruir(){this.malha&&(this.malha.geometry.dispose(),this.malha.material.dispose(),this.grupo.remove(this.malha),this.malha=null)}}const aa=`
  varying vec2 vUvP;
  void main(){
    vUvP = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,ta=`
  precision highp float;
  varying vec2 vUvP;
  uniform float uTempo;
  uniform float uAparicao;    // 0..1 entrada
  uniform float uDissolve;    // 0..1 saída fragmentada
  uniform float uEco;         // 0 = principal, >0 = reflexo temporal
  uniform float uAberracao;
  uniform float uEspelhado;   // 1 = é o reflexo no chão
  uniform float uForca;       // some quando a câmera deixa o hero
  uniform vec3  uCorNucleo;
  uniform vec3  uCorBorda;
  uniform sampler2D uMapa;
  uniform float uTemMapa;
  ${$}
  ${se}

  // Silhueta de LUZ: um volume vertical com inclinação de pose.
  // Deliberadamente abstrata — nenhum traço de rosto, arma ou roupa.
  float volume(vec2 p){
    float y = p.y;
    float inclina = (y - 0.5) * 0.14;      // peso jogado à frente
    float x = p.x - 0.5 - inclina;
    float largura =
        mix(0.10, 0.23, 1.0 - smoothstep(0.66, 0.92, y))     // acima dos ombros
      * mix(1.0,  1.30, 1.0 - smoothstep(0.44, 0.66, y))     // tronco
      * mix(1.0,  0.58, 1.0 - smoothstep(0.06, 0.36, y));    // base se afinando
    largura = max(largura, 0.004);
    float corpo = 1.0 - smoothstep(0.0, largura, abs(x));
    float halo  = (1.0 - smoothstep(0.0, largura * 2.6, abs(x))) * 0.42;
    float alt = smoothstep(0.0, 0.10, y) * (1.0 - smoothstep(0.86, 1.0, y));
    float nucleo = pow(max(1.0 - smoothstep(0.0, largura * 0.45, abs(x)), 0.0), 3.0);
    return clamp((corpo * 0.5 + halo) * alt + nucleo * alt * 0.3, 0.0, 1.0);
  }

  void main(){
    vec2 uv = vUvP;
    if (uEspelhado > 0.5) uv.y = 1.0 - uv.y;

    float ab = uAberracao * (0.004 + uEco * 0.01);
    float r = volume(uv + vec2( ab, 0.0));
    float g = volume(uv);
    float b = volume(uv + vec2(-ab, 0.0));

    vec3 cor = mix(uCorBorda, uCorNucleo, g);
    vec3 rgb = vec3(r, g, b);

    // varredura vertical lenta: o volume "respira"
    float varre = 0.80 + 0.20 * sin(uv.y * 9.0 - uTempo * 0.75 + uEco * 2.0);

    // fragmentação na saída: o eco se desfaz em lascas
    float ruido = fbm(uv * vec2(7.0, 14.0) + uEco * 13.0);
    float corte = uDissolve * 1.2;
    float sobra = smoothstep(corte - 0.16, corte + 0.02, ruido);
    float frenteDissolve = (1.0 - smoothstep(0.0, 0.14, abs(ruido - corte))) * step(0.001, uDissolve);

    float alpha = g * varre * sobra * uAparicao;
    if (uTemMapa > 0.5) {
      vec4 tex = texture2D(uMapa, uv);
      vec3 texRgb = tex.rgb;
      // mesma aberração aplicada à arte, quando ela existe
      texRgb.r = texture2D(uMapa, uv + vec2( ab, 0.0)).r;
      texRgb.b = texture2D(uMapa, uv + vec2(-ab, 0.0)).b;
      cor = mix(cor, texRgb, tex.a * 0.94);
      alpha = max(alpha * 0.35, tex.a * varre * sobra * uAparicao);
      rgb = vec3(1.0);
    }

    vec3 saida = cor * (0.26 + rgb * 0.34) * (uEco > 0.5 ? 0.62 : 1.0);
    saida += mix(uCorNucleo, vec3(1.0), 0.5) * frenteDissolve * 2.2;
    alpha *= (uEspelhado > 0.5 ? 0.26 : 0.62) * (uEco > 0.5 ? 0.55 : 1.0) * uForca;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(saida, alpha);
  }
`;let ee=null;function oa(){return ee||(ee=new Re(new Uint8Array([0,0,0,0]),1,1,Ce),ee.needsUpdate=!0),ee}function ie({eco:l=0,espelhado:a=0,mapa:e=null}){const o={uTempo:{value:0},uAparicao:{value:0},uDissolve:{value:0},uEco:{value:l},uAberracao:{value:1},uEspelhado:{value:a},uForca:{value:1},uCorNucleo:{value:new R(11134207)},uCorBorda:{value:new R(l?8086015:3057919)},uMapa:{value:e||oa()},uTemMapa:{value:e?1:0}},s=new U({uniforms:o,vertexShader:aa,fragmentShader:ta,transparent:!0,depthWrite:!1,blending:J,side:Z}),t=xe.alturaMundo,i=new z(new W(t*.62,t,1,1),s);return i.userData.uniforms=o,i}class sa{constructor({envMap:a,perfil:e,posicao:o=new d(0,.6,-7)}){this.grupo=new T,this.grupo.name="presenca",this.grupo.position.copy(o),this.envMap=a,this.uniformes=[],this._mouse=new D,this._mouseSuave=new D,this.tempoEco=0,this.principal=ie({}),this.principal.renderOrder=6,this.grupo.add(this.principal),this.uniformes.push(this.principal.userData.uniforms),this.reflexo=ie({espelhado:1}),this.reflexo.position.y=-7.2-.1,this.reflexo.renderOrder=5,this.grupo.add(this.reflexo),this.uniformes.push(this.reflexo.userData.uniforms),this.ecos=[];for(let i=0;i<xe.ecos;i++){const r=ie({eco:i+1});r.position.set((i%2?-1:1)*(1.5+i*.85),.12*i,-1.4-i*1.5),r.scale.setScalar(1-i*.06),r.renderOrder=4,r.userData.fase=i*2.1,this.grupo.add(r),this.ecos.push(r),this.uniformes.push(r.userData.uniforms)}const s=new Se(3.5,.035,6,96,Math.PI*1.15);this.arcoUniforms={uTempo:{value:0},uAparicao:{value:0},uForca:{value:1},uCor:{value:new R(10481663)}};const t=new U({uniforms:this.arcoUniforms,transparent:!0,depthWrite:!1,blending:J,vertexShader:`
        varying vec2 vUvP;
        void main(){ vUvP = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,fragmentShader:`
        varying vec2 vUvP; uniform float uTempo; uniform float uAparicao; uniform float uForca; uniform vec3 uCor;
        void main(){
          float cauda = smoothstep(0.0, 0.22, vUvP.x) * (1.0 - smoothstep(0.45, 1.0, vUvP.x));
          float corre = 0.45 + 0.55 * sin(vUvP.x * 10.0 - uTempo * 1.6);
          float a = cauda * corre * uAparicao * 0.7 * uForca;
          gl_FragColor = vec4(uCor * (1.0 + corre), a);
        }
      `});this.arco=new z(s,t),this.arco.rotation.set(.35,.2,-.75),this.arco.position.set(.4,.2,-.4),this.arco.renderOrder=7,this.grupo.add(this.arco),this._montarEspiral(e),this._carregarArte()}_montarEspiral(a){const e=Q(4242),o=ce(e,4,.05),s=Math.max(10,Math.round((a.fragmentos.perto||20)*.75)),t=new ue({color:660006,metalness:1,roughness:.07,envMap:this.envMap,envMapIntensity:2.6,clearcoat:1,side:Z,transparent:!0,opacity:1});this.espiralMat=t,this.espiral=new T,this.espiralDados=[];const i=Math.ceil(s/o.length),r=new I,u=new B,c=new V,f=new d,v=new d;for(let h=0;h<o.length;h++){const x=Math.min(i,s-h*i);if(x<=0)break;const _=new oe(o[h],t,x);_.frustumCulled=!1;const p=[];for(let m=0;m<x;m++){const M=(h*i+m)/s,A=M*Math.PI*5.2+e()*.5,S=1.9+M*3.4+n(e,-.5,.7),F=-2.6+M*6.2+n(e,-.5,.5),b=n(e,.22,.72)*(1-M*.35);p.push({ang:A,raio:S,alt:F,esc:b,vel:n(e,.1,.4)*(e()<.5?-1:1),giro:new d(e()-.5,e()-.5,e()-.5).normalize(),fase:e()*6.28}),f.set(Math.cos(A)*S,F,Math.sin(A)*S*.55),c.set(e()*6.28,e()*6.28,e()*6.28),u.setFromEuler(c),v.setScalar(b),r.compose(f,u,v),_.setMatrixAt(m,r)}_.instanceMatrix.needsUpdate=!0,_.userData.dados=p,this.espiral.add(_),this.espiralDados.push(_)}this.grupo.add(this.espiral)}_carregarArte(){}set mouse(a){this._mouse.set(a.x,a.y)}revelar(a){const e=[this.principal.userData.uniforms.uAparicao,this.reflexo.userData.uniforms.uAparicao];a.to(e,{value:1,duration:2.4,ease:"power2.out",delay:.1}),a.to(this.arcoUniforms.uAparicao,{value:1,duration:1.6,ease:"power3.out",delay:1.1}),this.ecos.forEach((o,s)=>{a.to(o.userData.uniforms.uAparicao,{value:1,duration:1.2,ease:"power2.out",delay:1.5+s*.55})})}atualizar(a,e,o){this._mouseSuave.x=g(this._mouseSuave.x,this._mouse.x,.0025,a),this._mouseSuave.y=g(this._mouseSuave.y,this._mouse.y,.0025,a),this.tempoEco+=a;const s=P(1-(o.progresso||0)/.16,0,1);for(const t of this.uniformes)t.uTempo.value=e,t.uAberracao.value=1+o.distorcao*6+o.onda*4,t.uForca.value=g(t.uForca.value,s,.004,a);this.arcoUniforms.uTempo.value=e,this.arcoUniforms.uForca.value=g(this.arcoUniforms.uForca.value,s,.004,a),this.espiral.visible=s>.02,this.espiralMat&&(this.espiralMat.opacity=s),this.principal.position.x=g(this.principal.position.x,this._mouseSuave.x*.42,.003,a),this.principal.rotation.y=g(this.principal.rotation.y,this._mouseSuave.x*-.22,.003,a),this.reflexo.position.x=this.principal.position.x,this.reflexo.rotation.y=this.principal.rotation.y,this.ecos.forEach((t,i)=>{const r=t.userData.uniforms,u=(this.tempoEco*.42+t.userData.fase)%6.283,c=P(Math.sin(u)*1.6,-1,1),f=c>0?0:Math.min(.95,-c*1.1);r.uDissolve.value=g(r.uDissolve.value,Math.max(f,o.dissolve),.004,a),t.position.x=g(t.position.x,(i%2?-1:1)*(1.5+i*.85)+this._mouseSuave.x*(.9+i*.5),.004,a),t.position.y=.12*i+Math.sin(e*.5+i)*.16}),this.principal.userData.uniforms.uDissolve.value=g(this.principal.userData.uniforms.uDissolve.value,o.dissolve,.004,a);for(const t of this.espiralDados){const i=t.userData.dados,r=new I,u=new B,c=new d,f=new d;for(let v=0;v<i.length;v++){const h=i[v];h.ang+=a*h.vel*.22;const x=h.raio+Math.sin(e*.3+h.fase)*.22;c.set(Math.cos(h.ang)*x+this._mouseSuave.x*.6,h.alt+Math.sin(e*.45+h.fase)*.3+this._mouseSuave.y*.3,Math.sin(h.ang)*x*.55),u.setFromAxisAngle(h.giro,e*h.vel+h.fase),f.setScalar(h.esc*(1-o.dissolve*.85)),r.compose(c,u,f),t.setMatrixAt(v,r)}t.instanceMatrix.needsUpdate=!0}this.arcoUniforms.uAparicao.value=g(this.arcoUniforms.uAparicao.value,(1-o.dissolve)*(o.presencaVisivel?1:.12),.004,a)}destruir(){this.grupo.traverse(a=>{a.geometry?.dispose?.(),a.material&&a.material!==this.espiralMat&&a.material.dispose?.()}),this.espiralMat?.dispose()}}class ia{constructor({envMap:a,perfil:e,zInicio:o=14,zFim:s=-170}){this.grupo=new T,this.grupo.name="corredor",this.envMap=a,this.zInicio=o,this.zFim=s,this.giroAlvo=0,this.construir(e)}construir(a){this.destruir();const e=Q(9091),o=a.placas*2,s=te({envMap:this.envMap,rugosidade:.05,metalico:1,cor:461850,opacidade:.62});s.userData.uniforms.uDeriva.value=.04,s.userData.uniforms.uMouseForca.value=.05,s.userData.uniforms.uRachadura.value=.1,s.userData.uniforms.uRimForca.value=1.35,this.material=s;const t=$e(),i=new oe(t,s,o);i.frustumCulled=!1;const r=new Float32Array(o),u=new Float32Array(o),c=new Float32Array(o),f=new Float32Array(o),v=new Float32Array(o),h=new Float32Array(o*3),x=new I,_=new B,p=new V,m=new d,M=new d;this.dados=[];for(let b=0;b<o;b++){const q=b%2===0?-1:1,G=Math.floor(b/2)/Math.max(1,a.placas-1),E=this.zInicio+(this.zFim-this.zInicio)*G+n(e,-3,3),L=q*n(e,17,31),y=n(e,-2,3),O=n(e,14,30),N=n(e,3.2,8.5),k=q*n(e,.15,.62);m.set(L,y,E),p.set(n(e,-.08,.08),k,n(e,-.06,.06)),_.setFromEuler(p),M.set(N,O,.14),x.compose(m,_,M),i.setMatrixAt(b,x),this.dados.push({pos:m.clone(),rotY:k,altura:O,largura:N,fase:e()*6.28}),r[b]=e(),u[b]=n(e,.01,.05),c[b]=n(e,.05,.3),f[b]=n(e,.5,1.8),v[b]=1/O,h[b*3]=0,h[b*3+1]=1,h[b*3+2]=0}t.setAttribute("aSeed",new w(r,1)),t.setAttribute("aVel",new w(u,1)),t.setAttribute("aBrilho",new w(c,1)),t.setAttribute("aRug",new w(f,1)),t.setAttribute("aEscalaInv",new w(v,1)),t.setAttribute("aEixo",new w(h,3)),i.instanceMatrix.needsUpdate=!0,i.instanceMatrix.setUsage(ge),this.placas=i,this.grupo.add(i);const A=new W(220,Math.abs(this.zFim-this.zInicio)+60,1,1),S=new ue({color:263951,metalness:.95,roughness:.28,envMap:this.envMap,envMapIntensity:1.4,transparent:!0,opacity:.85});S.onBeforeCompile=b=>{b.vertexShader=b.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vPiso;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPiso = uv;`),b.fragmentShader=b.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vPiso;`).replace("#include <dithering_fragment>",`#include <dithering_fragment>
           float fadeP = smoothstep(0.0, 0.18, vPiso.x) * (1.0 - smoothstep(0.82, 1.0, vPiso.x));
           gl_FragColor.a *= fadeP;`)};const F=new z(A,S);F.rotation.x=-Math.PI/2,F.position.set(0,-7.4,(this.zInicio+this.zFim)/2),F.renderOrder=-2,this.piso=F,this.pisoMat=S,this.grupo.add(F)}set giro(a){this.giroAlvo=a}atualizar(a,e,o){const s=this.material.userData.uniforms;if(s.uTempo.value=e,s.uOnda.value=o.onda,s.uDissolve.value=o.dissolve*.5,s.uEscurecer.value=o.escurecer,s.uMouse.value.set(o.mouse.x,o.mouse.y),this._giro=g(this._giro??0,this.giroAlvo,.004,a),Math.abs(this._giro-(this._giroAplicado??-1))>.0015){this._giroAplicado=this._giro;const t=new I,i=new B,r=new V,u=new d,c=new d;for(let f=0;f<this.dados.length;f++){const v=this.dados[f];u.copy(v.pos),r.set(0,v.rotY+this._giro*(1.15+Math.sin(v.fase)*.5),this._giro*.12*Math.sin(v.fase)),i.setFromEuler(r),c.set(v.largura,v.altura,.14),t.compose(u,i,c),this.placas.setMatrixAt(f,t)}this.placas.instanceMatrix.needsUpdate=!0}}destruir(){this.placas&&(this.placas.geometry.dispose(),this.grupo.remove(this.placas)),this.piso&&(this.piso.geometry.dispose(),this.pisoMat.dispose(),this.grupo.remove(this.piso)),this.material?.dispose(),this.placas=null,this.piso=null}}class ra{constructor({envMap:a,perfil:e}){this.grupo=new T,this.grupo.name="espelho-final",this.grupo.visible=!1,this.grupo.position.z=-17,this.ativo=!1,this.fase=0,this.quebra=0,this.envMap=a,this.construir(e)}construir(a){this.destruir();const e=Q(31415),o=ce(e,5,.04);this._formas=o;const s=P(Math.round((a.fragmentos.longe+a.fragmentos.medio)*.55),40,240),t=te({envMap:this.envMap,rugosidade:.03,metalico:1,cor:659488});t.envMapIntensity=3.4,t.userData.uniforms.uDeriva.value=.02,t.userData.uniforms.uMouseForca.value=.05,t.userData.uniforms.uRimForca.value=.7,t.userData.uniforms.uRachadura.value=.45,this.material=t;const i=Math.ceil(Math.sqrt(s*1.7)),r=Math.ceil(s/i),u=34,c=20;this.instancias=[];const f=Math.ceil(s/o.length),v=new I,h=new B,x=new V;let _=0;for(let p=0;p<o.length;p++){const m=Math.min(f,s-p*f);if(m<=0)break;const M=o[p].clone(),A=new oe(M,t,m);A.frustumCulled=!1,A.instanceMatrix.setUsage(ge);const S=new Float32Array(m),F=new Float32Array(m),b=new Float32Array(m),q=new Float32Array(m),G=new Float32Array(m),E=new Float32Array(m*3),L=[];for(let y=0;y<m;y++,_++){const O=_%i,N=Math.floor(_/i)%r,k=new d(-u/2+(O+.5)/i*u+n(e,-.35,.35),-c/2+(N+.5)/r*c+n(e,-.3,.3),n(e,-.06,.06)),j=new d(u/i*n(e,.85,1.25),c/r*n(e,.85,1.25),1),H=new V(0,0,n(e,-.25,.25)),X=e()*Math.PI*2,le=n(e,10,46),he=new d(Math.cos(X)*le,Math.sin(X)*le*.7,n(e,-46,16)),me=new V(e()*6.28,e()*6.28,e()*6.28),Y=n(e,.6,2.4);L.push({alvoPos:k,alvoEsc:j,alvoRot:H,dispPos:he,dispRot:me,dispEsc:Y,atraso:e()*.45,saida:new d(n(e,-1,1),n(e,-1,1),n(e,.3,1.6)).normalize(),giroSaida:new d(e()-.5,e()-.5,e()-.5).normalize()}),S[y]=e(),F[y]=n(e,.02,.12),b[y]=n(e,.06,.3),q[y]=n(e,.35,.8),G[y]=.6,E[y*3]=0,E[y*3+1]=1,E[y*3+2]=0,x.copy(me),h.setFromEuler(x),v.compose(he,h,new d(Y,Y,Y)),A.setMatrixAt(y,v)}M.setAttribute("aSeed",new w(S,1)),M.setAttribute("aVel",new w(F,1)),M.setAttribute("aBrilho",new w(b,1)),M.setAttribute("aRug",new w(q,1)),M.setAttribute("aEscalaInv",new w(G,1)),M.setAttribute("aEixo",new w(E,3)),A.instanceMatrix.needsUpdate=!0,A.userData.dados=L,this.instancias.push(A),this.grupo.add(A)}}set ativa(a){this.ativo=a,this.grupo.visible=a}definirFase(a){this.fase=P(a,0,1)}quebrar(){return this._quebrando?!1:(this._quebrando=!0,this._tQuebra=0,!0)}religar(){this._quebrando=!1,this.quebra=0}atualizar(a,e,o){if(!this.ativo)return;const s=this.material.userData.uniforms;s.uTempo.value=e,s.uOnda.value=o.onda,s.uEscurecer.value=o.escurecer,s.uMouse.value.set(o.mouse.x,o.mouse.y),this._quebrando?(this._tQuebra+=a,this.quebra=P(this._tQuebra/1.6,0,1),s.uDissolve.value=Math.max(0,(this.quebra-.55)/.45)*.35):(this.quebra=Math.max(0,this.quebra-a*.6),s.uDissolve.value=0);const t=new I,i=new B,r=new d,u=new d,c=new V,f=new B,v=new B;for(const h of this.instancias){const x=h.userData.dados;for(let _=0;_<x.length;_++){const p=x[_],m=ke(p.atraso,p.atraso+.55,this.fase);if(r.lerpVectors(p.dispPos,p.alvoPos,m),f.setFromEuler(c.copy(p.dispRot)),v.setFromEuler(c.copy(p.alvoRot)),i.copy(f).slerp(v,m),u.set(p.dispEsc+(p.alvoEsc.x-p.dispEsc)*m,p.dispEsc+(p.alvoEsc.y-p.dispEsc)*m,p.dispEsc+(1-p.dispEsc)*m),this.quebra>0){const A=this.quebra*this.quebra;r.addScaledVector(p.saida,A*26),v.setFromAxisAngle(p.giroSaida,A*7),i.multiply(v)}const M=Math.sin(e*.8+p.atraso*12)*.03*m;r.z+=M,t.compose(r,i,u),h.setMatrixAt(_,t)}h.instanceMatrix.needsUpdate=!0}}get inteiro(){return this.fase>.985&&!this._quebrando}destruir(){if(this.instancias){for(const a of this.instancias)a.geometry.dispose(),this.grupo.remove(a);this.material?.dispose(),this._formas?.forEach(a=>a.dispose()),this.instancias=[]}}}const re=`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;class na{constructor(){this.cam=new ze(-1,1,1,-1,0,1),this.geo=new Ue,this.geo.setAttribute("position",new ae(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),this.geo.setAttribute("uv",new ae(new Float32Array([0,0,2,0,0,2]),2)),this.mesh=new z(this.geo,null),this.cena=new ne,this.cena.add(this.mesh)}render(a,e,o){this.mesh.material=e,a.setRenderTarget(o||null),a.render(this.cena,this.cam)}dispose(){this.geo.dispose()}}class ua{constructor(a,e,o,s){this.renderer=a,this.cena=e,this.camera=o,this.perfil=s,this.quad=new na,this.tamanho=new D(1,1),this.pixelRatio=1,this._aberracao=0,this._glitch=0,this.matBrilho=new U({uniforms:{tDif:{value:null},uCorte:{value:.58},uJoelho:{value:.38},uTexel:{value:new D}},vertexShader:re,fragmentShader:`
        precision highp float;
        varying vec2 vUv; uniform sampler2D tDif; uniform float uCorte; uniform float uJoelho;
        uniform vec2 uTexel;
        vec3 amostra(vec2 o){ return texture2D(tDif, vUv + o * uTexel).rgb; }
        void main(){
          vec3 c = amostra(vec2(0.0)) * 0.5
                 + amostra(vec2( 1.0, 0.0)) * 0.125 + amostra(vec2(-1.0, 0.0)) * 0.125
                 + amostra(vec2( 0.0, 1.0)) * 0.125 + amostra(vec2( 0.0,-1.0)) * 0.125;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float s = clamp((l - uCorte) / max(uJoelho, 0.0001), 0.0, 1.0);
          gl_FragColor = vec4(c * s * s, 1.0);
        }
      `,depthTest:!1,depthWrite:!1}),this.matBorrao=new U({uniforms:{tDif:{value:null},uDir:{value:new D}},vertexShader:re,fragmentShader:`
        precision highp float;
        varying vec2 vUv; uniform sampler2D tDif; uniform vec2 uDir;
        void main(){
          vec3 c = texture2D(tDif, vUv).rgb * 0.227027;
          c += texture2D(tDif, vUv + uDir * 1.3846).rgb * 0.316216;
          c += texture2D(tDif, vUv - uDir * 1.3846).rgb * 0.316216;
          c += texture2D(tDif, vUv + uDir * 3.2308).rgb * 0.070270;
          c += texture2D(tDif, vUv - uDir * 3.2308).rgb * 0.070270;
          gl_FragColor = vec4(c, 1.0);
        }
      `,depthTest:!1,depthWrite:!1}),this.matFinal=new U({defines:{USAR_DOF:s.dof?1:0,USAR_BLOOM:s.bloom?1:0},uniforms:{tCena:{value:null},tBloom:{value:null},tProf:{value:null},uTexel:{value:new D},uTempo:{value:0},uBloom:{value:s.bloomForca},uAberracao:{value:0},uGlitch:{value:0},uOnda:{value:0},uOndaCentro:{value:new D(.5,.5)},uVinheta:{value:1},uGrao:{value:.028},uFoco:{value:12},uFaixaFoco:{value:9},uMaxBorrao:{value:1.6},uNear:{value:.1},uFar:{value:400},uEscurecer:{value:0},uFade:{value:0}},vertexShader:re,fragmentShader:`
        precision highp float;
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tCena, tBloom, tProf;
        uniform vec2 uTexel, uOndaCentro;
        uniform float uTempo, uBloom, uAberracao, uGlitch, uOnda, uVinheta, uGrao;
        uniform float uFoco, uFaixaFoco, uMaxBorrao, uNear, uFar, uEscurecer, uFade;
        ${$}

        float profundidadeVista(vec2 uv){
          float d = texture2D(tProf, uv).x;
          return -perspectiveDepthToViewZ(d, uNear, uFar);
        }

        vec3 corDeCena(vec2 uv, float raio){
          #if USAR_DOF
            if (raio > 0.35) {
              vec3 soma = vec3(0.0);
              float ang = hash21(uv * 137.0) * 6.2831853;
              for (int i = 0; i < 8; i++){
                float fi = float(i);
                float a = ang + fi * 0.7853982;
                float r = raio * (0.35 + 0.65 * fract(fi * 0.37));
                soma += texture2D(tCena, uv + vec2(cos(a), sin(a)) * r * uTexel).rgb;
              }
              return soma * 0.125;
            }
          #endif
          return texture2D(tCena, uv).rgb;
        }

        vec3 paraSRGB(vec3 c){
          c = max(c, vec3(0.0));
          return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
        }

        void main(){
          vec2 uv = vUv;
          vec2 dc = uv - 0.5;
          float r2 = dot(dc, dc);

          // onda de choque: anel que empurra os pixels para fora
          if (uOnda > 0.001){
            vec2 d = uv - uOndaCentro;
            float dist = length(d);
            float anel = smoothstep(0.06, 0.0, abs(dist - (1.0 - uOnda) * 0.9));
            uv += normalize(d + 1e-6) * anel * uOnda * 0.045;
          }

          // glitch temporal: blocos horizontais deslocados
          if (uGlitch > 0.001){
            float faixa = floor(uv.y * 38.0);
            float salto = (hash11(faixa + floor(uTempo * 11.0)) - 0.5);
            float ativa = step(0.72, hash11(faixa * 1.7 + floor(uTempo * 7.0)));
            uv.x += salto * 0.06 * uGlitch * ativa;
          }

          float prof = profundidadeVista(uv);
          float coc = 0.0;
          #if USAR_DOF
            coc = clamp(abs(prof - uFoco) / max(uFaixaFoco, 0.001), 0.0, 1.0);
            coc = pow(coc, 1.45) * uMaxBorrao * 6.0;
          #endif

          // aberração cromática radial: forte só nos momentos que pedem
          float ab = (uAberracao * 0.0035 + uGlitch * 0.006) * (0.35 + r2 * 2.4);
          vec3 cor;
          cor.r = corDeCena(uv + dc * ab, coc).r;
          cor.g = corDeCena(uv, coc).g;
          cor.b = corDeCena(uv - dc * ab, coc).b;

          #if USAR_BLOOM
            vec3 bl = texture2D(tBloom, uv).rgb;
            cor += bl * uBloom;
          #endif

          // o escurecimento é aplicado aos materiais do salão, não ao quadro
          // inteiro: assim o objeto em foco continua aceso enquanto o
          // ambiente ao redor apaga.
          // vinheta
          float vin = 1.0 - smoothstep(0.18, 0.95, r2 * 1.9);
          cor *= mix(1.0, vin, uVinheta);

          // scanline quase invisível + grão cinematográfico
          cor *= 1.0 - 0.025 * step(0.5, fract(gl_FragCoord.y * 0.5));
          float g = hash21(gl_FragCoord.xy + fract(uTempo) * 133.0) - 0.5;
          float lum = dot(cor, vec3(0.2126, 0.7152, 0.0722));
          cor += g * uGrao * (0.35 + lum * 1.3);

          cor = mix(cor, vec3(0.0), uFade);
          gl_FragColor = vec4(paraSRGB(cor), 1.0);
        }
      `,depthTest:!1,depthWrite:!1})}get ativo(){return this.perfil.posFinal}definirPerfil(a){this.perfil=a,this.matFinal.defines.USAR_DOF=a.dof?1:0,this.matFinal.defines.USAR_BLOOM=a.bloom?1:0,this.matFinal.uniforms.uBloom.value=a.bloomForca,this.matFinal.needsUpdate=!0,this.redimensionar(this.tamanho.x,this.tamanho.y,this.pixelRatio)}redimensionar(a,e,o){this.tamanho.set(a,e),this.pixelRatio=o;const s=Math.max(2,Math.floor(a*o)),t=Math.max(2,Math.floor(e*o));if(this._w=s,this._h=t,this.descartarAlvos(),!this.ativo)return;const i={type:Ee,minFilter:de,magFilter:de,depthBuffer:!0};if(this.rtCena=new K(s,t,i),this.rtCena.depthTexture=new Be(s,t),this.rtCena.depthTexture.type=Te,this.perfil.bloom){const r=Math.max(2,Math.floor(s/2)),u=Math.max(2,Math.floor(t/2)),c=Math.max(2,Math.floor(s/4)),f=Math.max(2,Math.floor(t/4));this.rtBrilho=new K(r,u,i),this.rtA=new K(c,f,i),this.rtB=new K(c,f,i),this.matBrilho.uniforms.uTexel.value.set(1/s,1/t)}this.matFinal.uniforms.uTexel.value.set(1/s,1/t),this.matFinal.uniforms.uNear.value=this.camera.near,this.matFinal.uniforms.uFar.value=this.camera.far}descartarAlvos(){for(const a of["rtCena","rtBrilho","rtA","rtB"])this[a]&&(this[a].dispose(),this[a]=null)}render(a,e){const o=this.renderer;if(!this.ativo||!this.rtCena){o.setRenderTarget(null),o.render(this.cena,this.camera);return}o.setRenderTarget(this.rtCena),o.clear(),o.render(this.cena,this.camera),this.perfil.bloom&&this.rtBrilho&&(this.matBrilho.uniforms.tDif.value=this.rtCena.texture,this.quad.render(o,this.matBrilho,this.rtBrilho),this.matBorrao.uniforms.tDif.value=this.rtBrilho.texture,this.matBorrao.uniforms.uDir.value.set(1.2/this.rtA.width,0),this.quad.render(o,this.matBorrao,this.rtA),this.matBorrao.uniforms.tDif.value=this.rtA.texture,this.matBorrao.uniforms.uDir.value.set(0,1.2/this.rtA.height),this.quad.render(o,this.matBorrao,this.rtB),this.matBorrao.uniforms.tDif.value=this.rtB.texture,this.matBorrao.uniforms.uDir.value.set(2.6/this.rtA.width,0),this.quad.render(o,this.matBorrao,this.rtA),this.matBorrao.uniforms.tDif.value=this.rtA.texture,this.matBorrao.uniforms.uDir.value.set(0,2.6/this.rtA.height),this.quad.render(o,this.matBorrao,this.rtB),this.matFinal.uniforms.tBloom.value=this.rtB.texture);const s=this.matFinal.uniforms;s.tCena.value=this.rtCena.texture,s.tProf.value=this.rtCena.depthTexture,s.uTempo.value=e.tempoReal,this._aberracao=g(this._aberracao,e.aberracao,.002,a),this._glitch=g(this._glitch,e.glitch,.0015,a),s.uAberracao.value=this._aberracao,s.uGlitch.value=this._glitch,s.uOnda.value=e.onda,s.uEscurecer.value=e.escurecer,s.uFade.value=e.fade||0,s.uFoco.value=g(s.uFoco.value,e.foco??12,.004,a),s.uNear.value=this.camera.near,s.uFar.value=this.camera.far,this.quad.render(o,this.matFinal,null)}dispose(){this.descartarAlvos(),this.matBrilho.dispose(),this.matBorrao.dispose(),this.matFinal.dispose(),this.quad.dispose()}}const pe=[[0,[0,.8,15.5],[0,.6,-7]],[.09,[.6,1,8],[.2,.7,-12]],[.2,[1.6,1.5,-2],[.4,.9,-22]],[.32,[-2,.4,-18],[-.8,.3,-38]],[.44,[1.8,-.5,-38],[.8,-.3,-58]],[.57,[-1.4,-3,-58],[-.5,-2.2,-78]],[.68,[1.2,-1.4,-80],[.6,-1.1,-99]],[.8,[-1,.5,-102],[-.4,.6,-121]],[.9,[.8,1.2,-118],[.3,.9,-137]],[1,[0,.7,-132],[0,.7,-152]]];class ca{constructor(a){this.camera=a,this.curvaPos=new fe(pe.map(e=>new d(...e[1])),!1,"catmullrom",.3),this.curvaAlvo=new fe(pe.map(e=>new d(...e[2])),!1,"catmullrom",.3),this.progresso=0,this.progressoSuave=0,this.mouse=new D,this.mouseSuave=new D,this.intro=0,this.fovBase=a.fov,this.fovExtra=0,this.balanco=0,this._pos=new d,this._alvo=new d,this._up=new d(0,1,0),this._m=new I,this._q=new B,this.rolagem=0,this.tremor=0}definirProgresso(a){this.progresso=P(a,0,1)}impulso({fov:a=-6,tremor:e=.5}={}){this.fovExtra+=a,this.tremor=Math.min(1,this.tremor+e)}atualizar(a,e){this.progressoSuave=g(this.progressoSuave,this.progresso,1e-4,a),this.mouseSuave.x=g(this.mouseSuave.x,this.mouse.x,.0012,a),this.mouseSuave.y=g(this.mouseSuave.y,this.mouse.y,.0012,a);const o=P(this.progressoSuave,0,1);if(this.curvaPos.getPointAt(o,this._pos),this.curvaAlvo.getPointAt(o,this._alvo),this.intro>5e-4){const i=this.intro*this.intro;this._pos.z+=i*26,this._pos.y+=i*3.2,this._pos.x+=Math.sin(this.intro*3.1)*i*5.5}if(this.balanco+=a*.35,this._pos.x+=Math.sin(this.balanco*.7)*.22,this._pos.y+=Math.cos(this.balanco*.53)*.16,this.tremor>.001){this.tremor=Math.max(0,this.tremor-a*1.6);const i=this.tremor*this.tremor*.22;this._pos.x+=(Math.random()-.5)*i,this._pos.y+=(Math.random()-.5)*i}this.camera.position.copy(this._pos);const s=e.reduzirMovimento?.25:1;this._alvo.x+=this.mouseSuave.x*3.4*s,this._alvo.y+=this.mouseSuave.y*2*s,this._m.lookAt(this.camera.position,this._alvo,this._up),this._q.setFromRotationMatrix(this._m),this.camera.quaternion.slerp(this._q,1-Math.pow(6e-4,a)),this.rolagem=g(this.rolagem,this.mouseSuave.x*-.035*s,.002,a),this.camera.rotateZ(this.rolagem),this.fovExtra=g(this.fovExtra,0,.004,a);const t=this.fovBase+this.fovExtra+Math.sin(this.balanco*.31)*.6+this.intro*14;Math.abs(this.camera.fov-t)>.01&&(this.camera.fov=g(this.camera.fov,t,.002,a),this.camera.updateProjectionMatrix())}get distanciaFoco(){return je(9,16,Math.abs(Math.sin(this.balanco*.2)))}}class va{constructor({canvas:a,perf:e}){this.perf=e,this.perfil=e.perfil,this.rodando=!1,this.pronto=!1,this.renderer=new Pe({canvas:a,antialias:this.perfil.tier>=2,alpha:!1,powerPreference:"high-performance",stencil:!1,depth:!0}),this.renderer.setClearColor(329748,1),this.renderer.toneMapping=qe,this.renderer.toneMappingExposure=1.05,this.renderer.outputColorSpace=Oe,this.renderer.info.autoReset=!0,this.cena=new ne,this.cena.fog=new Ve(329748,.0165),this.camera=new Ie(46,1,.1,400),this.cena.add(this.camera),this.rig=new ca(this.camera),this.estado={scroll:0,progresso:0,onda:0,dissolve:0,escurecer:0,rastro:0,distorcao:0,aberracao:.35,glitch:0,foco:12,fade:0,presencaVisivel:!0,tempoReal:0,reduzirMovimento:e.reduzirMovimento,mouse:new D},this.mouseAlvo=new D,this.estruturas=new Set,this.ganchos=new Set,this.escurecerAlvo=0,this.dissolveAlvo=0,this.envMap=He(this.renderer,this.perfil.envRes),this.cena.environment=this.envMap,this._montar(),this.pos=new ua(this.renderer,this.cena,this.camera,this.perfil),this.redimensionar(),this._onResize=We(()=>this.redimensionar(),140),window.addEventListener("resize",this._onResize,{passive:!0}),window.addEventListener("orientationchange",this._onResize,{passive:!0}),document.addEventListener("visibilitychange",()=>{document.hidden?this.pausar():this.retomar()}),a.addEventListener("webglcontextlost",o=>{o.preventDefault(),this.rodando=!1,document.documentElement.dataset.contexto="perdido"}),a.addEventListener("webglcontextrestored",()=>{document.documentElement.dataset.contexto="ok",this.retomar()}),this.perf.onMudanca(o=>this.trocarPerfil(o)),this._relogio=new Ge,this.pronto=!0}_montar(){const a=Q(20250101);this.fragmentos=new Ke({envMap:this.envMap,perfil:this.perfil}),this.cena.add(this.fragmentos.grupo),this.particulas=new ea({perfil:this.perfil}),this.cena.add(this.particulas.grupo),this.corredor=new ia({envMap:this.envMap,perfil:this.perfil}),this.cena.add(this.corredor.grupo),this.presenca=new sa({envMap:this.envMap,perfil:this.perfil}),this.cena.add(this.presenca.grupo),this.nevoa=Ze(a,this.perfil.tier>=2?7:3),this.cena.add(this.nevoa),this.feixes=Je(a,this.perfil.tier>=2?5:2),this.cena.add(this.feixes),this.luzes=Xe(this.cena),this.espelhoFinal=new ra({envMap:this.envMap,perfil:this.perfil}),this.camera.add(this.espelhoFinal.grupo),this.ancoras=new T,this.ancoras.name="ancoras",this.camera.add(this.ancoras)}trocarPerfil(a){this.perfil=a,this.fragmentos.construir(a),this.particulas.construir(a),this.corredor.construir(a),this.espelhoFinal.construir(a),this.pos.definirPerfil(a),this.redimensionar()}aoQuadro(a){return this.ganchos.add(a),()=>this.ganchos.delete(a)}escurecer(a){this.escurecerAlvo=P(a,0,1)}registrarEstrutura(a){return this.estruturas.add(a),this.ancoras.add(a.raiz),()=>{this.estruturas.delete(a),this.ancoras.remove(a.raiz),a.destruir()}}redimensionar(){const a=window.innerWidth,e=window.innerHeight,o=Math.min(window.devicePixelRatio||1,this.perfil.maxPixelRatio);this.largura=a,this.altura=e,this.renderer.setPixelRatio(o),this.renderer.setSize(a,e,!1),this.camera.aspect=a/e,this.rig.fovBase=a/e<.85?62:a/e<1.3?54:46,this.camera.updateProjectionMatrix(),this.pos?.redimensionar(a,e,o)}definirMouse(a,e){this.mouseAlvo.set(a,e)}iniciar(){if(this.rodando)return;this.rodando=!0,this._relogio.getDelta();const a=()=>{this.rodando&&(this._raf=requestAnimationFrame(a),this._quadro())};this._raf=requestAnimationFrame(a)}pausar(){this.rodando=!1,cancelAnimationFrame(this._raf)}retomar(){document.hidden||(this._relogio.getDelta(),this.iniciar())}_quadro(){const a=this._relogio.getDelta(),e=Math.min(a,.066);this.perf.amostrar(e);const o=C.passo(e),s=C.tempo,t=this.estado;t.tempoReal=C.tempoReal,t.escurecer=g(t.escurecer,this.escurecerAlvo,.004,e),t.dissolve=g(t.dissolve,this.dissolveAlvo,.004,e),t.onda=C.onda,t.distorcao=C.distorcao,t.glitch=C.distorcao*.9+C.onda*.5,t.aberracao=.3+C.distorcao*2.6+C.onda*2.2+Math.abs(C.atual-1)*.8,t.rastro=P(Math.max(0,C.atual-1)*.8+C.onda*.6,0,1.6),t.mouse.set(this.mouseAlvo.x,this.mouseAlvo.y),t.foco=this.rig.distanciaFoco,this.rig.mouse.copy(this.mouseAlvo),this.rig.atualizar(e,t),this.fragmentos.mouse=this.mouseAlvo,this.particulas.mouse=this.mouseAlvo,this.presenca.mouse=this.mouseAlvo,this.fragmentos.atualizar(o,s,t),this.particulas.atualizar(o,s,t,this.camera.position),this.corredor.atualizar(o,s,t),this.presenca.atualizar(o,s,t),this.espelhoFinal.atualizar(o,s,t),this.luzes.atualizar(s,this.camera.position.z),this.nevoa.userData.uniforms.uTempo.value=s,this.feixes.userData.uniforms.uTempo.value=s,this._atmos=g(this._atmos??1,1-t.escurecer*.82,.004,e),this.nevoa.userData.uniforms.uOpacidade.value*=this._atmos,this.feixes.userData.uniforms.uForca.value*=this._atmos;for(const i of this.feixes.children)i.position.x+=o*i.userData.vel,i.position.x>24&&(i.position.x=-24),i.position.x<-24&&(i.position.x=24);for(const i of this.estruturas)i.atualizar(o,s,this.camera,this.largura,this.altura);for(const i of this.ganchos)i(e,o,s,a);this.pos.render(e,t)}dispose(){this.pausar(),window.removeEventListener("resize",this._onResize),this.fragmentos.destruir(),this.particulas.destruir(),this.corredor.destruir(),this.presenca.destruir(),this.espelhoFinal.destruir(),this.pos.dispose(),this.renderer.dispose()}}export{va as Stage};
