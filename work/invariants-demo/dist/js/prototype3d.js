import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBot, createHand, createPaddle, createWorkshop } from './models3d.js';
import { sampleMotion, DURATION, PHASES } from './motion3d.js';
import { runOperation, evaluate } from './model.js';

const $ = id => document.getElementById(id);
const viewport=$('viewport'),canvas=$('scene');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,playing=!media.matches,speed=1,lastTimestamp=null,previousPhase='',autoCamera=true;
let reducedMotion=media.matches,sound=false,quality='high',visible=true,disposed=false;
let renderer,scene,camera,controls,bot,hand,paddle,set,shadow,keyLight,helperA,helperB;
let audioContext,frameId,previousImpact=0;
const groundOffset=.035;
const clockOutcome=runOperation('unchecked',5,8);
const validation=evaluate('unchecked');
const repairedValidation=evaluate('safe');
const cameraBase=new THREE.Vector3(10.2,8.2,13.8);
const cameraTarget=new THREE.Vector3(0,1.65,-.45);
const pointerTarget=new THREE.Vector2();

$('motion').checked=reducedMotion;
$('phaseList').innerHTML=PHASES.map((phase,i)=>`<button class="phase-button" data-phase="${phase.id}" aria-label="Inspect ${phase.label}"><span class="phase-index">${String(i+1).padStart(2,'0')}</span><span>${phase.label}</span><span class="phase-check" aria-hidden="true">✓</span></button>`).join('');

function initializeScene(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor(0xe5e8da);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.24;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xe5e8da);
  scene.fog=new THREE.Fog(0xe5e8da,29,55);
  camera=new THREE.PerspectiveCamera(36,1,.1,90);
  camera.position.copy(cameraBase);camera.lookAt(cameraTarget);
  controls=new OrbitControls(camera,canvas);
  controls.target.copy(cameraTarget);
  controls.enableDamping=true;controls.dampingFactor=.085;
  controls.enableZoom=false;controls.enablePan=false;
  controls.minPolarAngle=.45;controls.maxPolarAngle=1.44;
  controls.minAzimuthAngle=-.9;controls.maxAzimuthAngle=1.1;
  controls.addEventListener('start',()=>{autoCamera=false;});

  const hemisphere=new THREE.HemisphereLight(0xfff6dc,0x64795e,2.4);scene.add(hemisphere);
  keyLight=new THREE.DirectionalLight(0xffedcb,3.5);
  keyLight.position.set(-5,12,7);keyLight.castShadow=true;
  keyLight.shadow.mapSize.set(1024,1024);
  Object.assign(keyLight.shadow.camera,{left:-9,right:9,top:10,bottom:-7,near:.5,far:35});
  keyLight.shadow.normalBias=.035;keyLight.shadow.bias=-.0003;
  keyLight.target.position.set(0,1,0);scene.add(keyLight,keyLight.target);
  const fill=new THREE.DirectionalLight(0xe7f3df,1.1);fill.position.set(7,6,-6);scene.add(fill);

  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xe5e8da,roughness:1}));
  backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.37;backdrop.receiveShadow=true;scene.add(backdrop);
  set=createWorkshop();scene.add(set.root);
  bot=createBot();scene.add(bot.root);
  hand=createHand();scene.add(hand.root);
  paddle=createPaddle();scene.add(paddle.root);
  helperA=createBot({color:0x9caf83});helperA.root.scale.setScalar(.5);helperA.root.position.set(-4.9,.73,-1);helperA.root.rotation.y=.5;scene.add(helperA.root);
  helperB=createBot({color:0xa4bd98});helperB.root.scale.setScalar(.55);helperB.root.position.set(4.7,.8,.65);helperB.root.rotation.y=-.3;scene.add(helperB.root);

  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;
  const ctx=textureCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,4,64,64,61);
  gradient.addColorStop(0,'rgba(12,30,13,.55)');gradient.addColorStop(.45,'rgba(12,30,13,.28)');gradient.addColorStop(1,'rgba(12,30,13,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(textureCanvas),transparent:true,depthWrite:false,opacity:.45}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.055;scene.add(shadow);
  const observer=new ResizeObserver(resize);observer.observe(viewport);
  window.addEventListener('pagehide',event=>{playing=false;lastTimestamp=null;if(!event.persisted){observer.disconnect();dispose();}});
  resize();
  $('renderStatus').innerHTML='<i></i> LIVE WEBGL 2 · REAL 3D';
}

function resize(){
  if(!renderer)return;
  const width=viewport.clientWidth,height=viewport.clientHeight;
  const ratio=Math.min(window.devicePixelRatio||1,quality==='high'?1.65:1);
  const maxPixels=quality==='high'?1500000:650000;
  const resolutionScale=Math.min(ratio,Math.sqrt(maxPixels/Math.max(1,width*height)));
  renderer.setPixelRatio(resolutionScale);renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.fov=width<500?43:36;camera.updateProjectionMatrix();
  cameraBase.set(width<500?9.4:10.2,width<500?9.1:8.2,width<500?15.9:13.8);
  if(autoCamera){camera.position.copy(cameraBase);controls.target.copy(cameraTarget);}
}

function setSkin(value){
  if(!bot)return;
  const color={orange:0xe57748,mint:0x8ebfa5,blue:0x8ba7ae}[value]??0xe57748;
  const mainShell=bot.body.children[0].material;
  mainShell.color.setHex(color);
  const inset=bot.body.children[1].material;
  inset.color.setHex(color).multiplyScalar(.76);
}

const BUBBLES={notice:'It compiles. Probably fine.',approach:'Wait. What’s that?',grip:'Okay, you have my attention.',lift:'I can explain the shortcut.',swing:'So… stock can’t go negative?',tap:'BONK!',carry:'Right. Let’s fix that.',land:'Back on solid ground.',release:'Promise understood.',retract:'Guards before shortcuts.',repair:'Contract kept. Ship it.'};

function updateUI(pose){
  $('scrub').value=String(time);$('time').textContent=`${time.toFixed(2)} / ${DURATION.toFixed(2)}`;
  $('playLabel').textContent=playing?'Pause':time>=DURATION?'Replay':'Play sequence';
  $('playIcon').textContent=playing?'Ⅱ':'▶';
  $('play').setAttribute('aria-label',playing?'Pause sequence':time>=DURATION?'Replay sequence':'Play sequence');
  $('step').disabled=time>=DURATION;
  const phase=PHASES.find(p=>p.id===pose.phase);
  if(previousPhase!==pose.phase){
    previousPhase=pose.phase;
    $('phaseHeading').textContent=phase.label;$('phaseDescription').textContent=phase.description;
    $('bubble').textContent=reducedMotion&&pose.phase==='tap'?'Rejected. Repair required.':BUBBLES[pose.phase];
    document.querySelectorAll('.phase-button[data-phase]').forEach((button,index)=>{
      const current=button.dataset.phase===pose.phase;
      button.classList.toggle('current',current);button.classList.toggle('complete',time>=PHASES[index].end);
      button.setAttribute('aria-current',current?'step':'false');
    });
    if(['grip','tap','repair'].includes(pose.phase))$('announcement').textContent=`${phase.label}. ${phase.description}`;
  }
  $('gripDot').classList.toggle('attached',pose.attached);
  $('gripStatus').textContent=pose.attached?'Grip connected':pose.phase==='release'?'Release after landing':pose.phase==='repair'||pose.phase==='retract'?'Back on the floor':'Grip open';
  $('gripDetail').textContent=pose.attached?'Backpack handle and hand share one grip point.':time>=7.2?'The bot lands before the hand lets go.':'The hand approaches before making contact.';
  $('impactText').style.opacity=String(reducedMotion?0:pose.impact);
  $('impactText').style.transform=`rotate(-14deg) scale(${.75+pose.impact*.3})`;
  const repaired=pose.repair&&repairedValidation.pass;
  $('verdict').textContent=repaired?'CHECKS PASS':'INV-01';$('verdict').classList.toggle('good',repaired);
  $('contractTitle').textContent=repaired?'A better implementation. Same promise.':'Stock must never be negative.';
  $('contractDescription').textContent=repaired?'The bot restores the guards before changing stock. Oversized requests return an error and leave inventory intact.':'The proposed change satisfies the Go interface, but breaks the package contract. The check rejects the patch before it reaches accepted code.';
  $('contractNote').textContent=repaired?'Repair complete. The contract still holds.':'Patch rejected. Accepted code stays intact.';
  $('contractIcon').textContent=repaired?'✓':'×';
  $('trigger').textContent=time>0?'Trigger another violation ↗':'Trigger a violation ↗';
}

function renderAt(t){
  const phase=PHASES.find(p=>t<p.end)??PHASES.at(-1);
  const sampleTime=reducedMotion?(phase.start+phase.end)/2:t;
  const pose=sampleMotion(sampleTime);
  if(renderer){
    bot.root.position.fromArray(pose.bot.position);bot.root.position.y+=groundOffset;
    bot.root.rotation.set(...pose.bot.rotation);
    bot.body.scale.set(1/Math.sqrt(pose.bot.squash),pose.bot.squash,1/Math.sqrt(pose.bot.squash));
    bot.armL.rotation.x=pose.bot.armL;bot.armR.rotation.x=pose.bot.armR;
    bot.armL.rotation.z=-.1-pose.bot.eyeWide*.13;bot.armR.rotation.z=.1+pose.bot.eyeWide*.13;
    bot.legL.rotation.x=pose.bot.legL;bot.legR.rotation.x=pose.bot.legR;
    bot.eyes.forEach((eye,i)=>{const blink=pose.phase==='repair'&&Math.sin(t*7+i*.1)>.98;eye.scale.y=blink?.15:1+pose.bot.eyeWide*.3;});
    hand.root.position.fromArray(pose.hand.position);hand.root.position.y+=groundOffset;
    hand.root.rotation.set(...pose.hand.rotation);hand.setGrip(pose.hand.grip);
    hand.root.visible=!reducedMotion||['grip','lift','swing','carry','land'].includes(pose.phase);
    paddle.root.position.set(pose.bot.position[0]+1.85,pose.bot.position[1]+.95,pose.bot.position[2]-.45);
    paddle.pivot.rotation.z=pose.paddle.swing;
    const padScale=Math.min(1,Math.max(0,(t-3.75)/.23))*Math.min(1,Math.max(0,(5.1-t)/.23));
    paddle.root.scale.setScalar(Math.max(.001,padScale));paddle.root.visible=pose.paddle.visible&&!reducedMotion;
    shadow.position.x=pose.bot.position[0];shadow.position.z=pose.bot.position[2];shadow.scale.setScalar(.8+(1-pose.shadow)*.8);shadow.material.opacity=.36*pose.shadow;
    helperA.armR.rotation.x=-.7+Math.sin(sampleTime*15)*.18;
    helperA.root.position.y=.73+Math.sin(sampleTime*3)*.025;
    helperB.armL.rotation.z=time>2.1&&time<7.2?-1.4:-.1;
    helperB.root.rotation.y=-.3-Math.sin(sampleTime*.7)*.15;
    helperB.root.position.y=.8+Math.sin(sampleTime*3+1.7)*.02;
    set.screenMaterial.emissive.setHex(pose.repair?0xa8d58b:0xd88b64);set.screenMaterial.emissiveIntensity=pose.repair?.36:.13;
    set.updateStock(5);
    if(autoCamera){
      const push=reducedMotion?0:pose.cameraPush;
      const focus=new THREE.Vector3(pose.bot.position[0]*.75,2.05+Math.max(0,pose.bot.position[1]-1.4)*.62,0);
      controls.target.copy(cameraTarget).lerp(focus,push*.8);
      camera.position.copy(cameraBase).sub(cameraTarget).multiplyScalar(1-push*.25).add(controls.target);
    }
    controls.update();
    renderer.render(scene,camera);
    // A real scene-graph check used by development QA, independent of the UI.
    if(pose.attached){const grip=bot.handle.getWorldPosition(new THREE.Vector3());const socket=hand.root.getWorldPosition(new THREE.Vector3());canvas.dataset.gripError=grip.distanceTo(socket).toFixed(6);}else canvas.dataset.gripError='not-attached';
    canvas.dataset.phase=pose.phase;canvas.dataset.triangles=String(renderer.info.render.triangles);
  }
  updateUI(pose);
  if(sound&&playing&&pose.impact>.35&&previousImpact<=.35)playBonk();
  previousImpact=pose.impact;
}

function playBonk(){
  try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.type='sine';oscillator.frequency.setValueAtTime(240,audioContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(70,audioContext.currentTime+.16);gain.gain.setValueAtTime(.07,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.2);oscillator.start();oscillator.stop(audioContext.currentTime+.21);}catch{}
}

function frame(timestamp){
  if(disposed)return;
  const delta=lastTimestamp===null?0:Math.min(.1,Math.max(0,(timestamp-lastTimestamp)/1000));lastTimestamp=timestamp;
  if(playing&&visible&&!document.hidden){time=Math.min(DURATION,time+delta*speed);if(time>=DURATION)playing=false;}
  if(visible&&!document.hidden)renderAt(time);
  frameId=requestAnimationFrame(frame);
}

function seek(value){time=Math.min(DURATION,Math.max(0,value));playing=false;previousPhase='';previousImpact=0;renderAt(time);}
function start(){if(time>=DURATION)time=0;playing=true;previousImpact=0;lastTimestamp=null;renderAt(time);}
function reset(){playing=false;time=0;previousPhase='';previousImpact=0;autoCamera=true;renderAt(time);}

$('play').addEventListener('click',()=>{if(playing){playing=false;renderAt(time);}else start();});
$('restart').addEventListener('click',reset);
$('trigger').addEventListener('click',()=>{time=0;previousPhase='';autoCamera=true;start();});
$('step').addEventListener('click',()=>{const next=PHASES.find(phase=>phase.start>time+.025);seek(next?next.start+.01:DURATION);});
$('scrub').addEventListener('input',e=>seek(Number(e.target.value)));
$('speed').addEventListener('change',e=>{speed=Number(e.target.value);lastTimestamp=null;});
$('skin').addEventListener('change',e=>{setSkin(e.target.value);renderAt(time);});
$('quality').addEventListener('change',e=>{quality=e.target.value;if(renderer){renderer.shadowMap.enabled=quality==='high';resize();renderAt(time);}});
$('viewReset').addEventListener('click',()=>{autoCamera=true;if(controls){controls.target.copy(cameraTarget);camera.position.copy(cameraBase);controls.update();}renderAt(time);});
$('motion').addEventListener('change',e=>{reducedMotion=e.target.checked;previousPhase='';renderAt(time);});
$('sound').addEventListener('change',e=>{sound=e.target.checked;if(sound){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();}catch{}}});
media.addEventListener('change',e=>{reducedMotion=e.matches;$('motion').checked=e.matches;previousPhase='';renderAt(time);});
document.querySelectorAll('.phase-button[data-phase]').forEach(button=>button.addEventListener('click',()=>{const phase=PHASES.find(p=>p.id===button.dataset.phase);seek(phase.id==='tap'?4.47:(phase.start+phase.end)/2);}));
canvas.tabIndex=0;canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(playing){playing=false;renderAt(time);}else start();}if(e.key==='ArrowRight'){e.preventDefault();seek(time+.1);}if(e.key==='ArrowLeft'){e.preventDefault();seek(time-.1);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)playing=false;lastTimestamp=null;});
const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTimestamp=null;},{threshold:.01});intersection.observe(viewport);

function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frameId);intersection.disconnect();controls?.dispose();if(scene){const geometries=new Set(),mats=new Set(),textures=new Set();scene.traverse(item=>{if(item.geometry)geometries.add(item.geometry);const ms=Array.isArray(item.material)?item.material:[item.material];for(const mat of ms){if(!mat)continue;mats.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}});for(const g of geometries)g.dispose();for(const mat of mats)mat.dispose();for(const tex of textures)tex.dispose();}renderer?.dispose();audioContext?.close();}

try{initializeScene();}catch(error){console.warn('3D workshop could not initialize:',error.message);renderer=null;playing=false;$('fallback').hidden=false;$('renderStatus').innerHTML='<i></i> TEXT STORYBOARD';}
if(clockOutcome.after!==-3||validation.pass)throw Error('The prototype fixture must demonstrate a rejected negative-stock proposal.');
renderAt(0);frameId=requestAnimationFrame(frame);
