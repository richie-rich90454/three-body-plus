import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats-js';
import starmap from '/starmap.png';
interface ControllerMap{
	[key: number]: { pressed: boolean };
}
class Trail{
	pos: THREE.Vector3[];
	line: THREE.Line;
	constructor(pos: THREE.Vector3[], line: THREE.Line){
		this.pos=pos;
		this.line=line;
	}
}
class Body{
	m: number;
	s: THREE.Vector3;
	v: THREE.Vector3;
	obj: THREE.Mesh;
	test: boolean;
	constructor(m: number, s: THREE.Vector3, v: THREE.Vector3, obj: THREE.Mesh, test: boolean){
		this.m=m;
		this.s=s.clone();
		this.v=v.clone();
		this.obj=obj;
		this.test=test;
	}
}
const n=3;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer=new THREE.WebGLRenderer({antialias: true, powerPreference: "high-performance"});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
const loader=new THREE.TextureLoader();
const stars=loader.load(starmap, ()=>{
	stars.mapping=THREE.EquirectangularReflectionMapping;
	stars.colorSpace=THREE.SRGBColorSpace;
	scene.background=stars;
});
const dark=new THREE.Color(0,0,0);
scene.background=stars;
const controls=new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.update();
const light=new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0,2,5);
light.castShadow=true;
light.shadow.mapSize.width=512;
light.shadow.mapSize.height=512;
light.shadow.camera.near=0.5;
light.shadow.camera.far=500;
scene.add(light);
const ambientLight=new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
scene.add(camera);
camera.position.z=15;
const controller: ControllerMap={
	1: {pressed: false},
	2: {pressed: false},
	3: {pressed: false},
	4: {pressed: false},
	5: {pressed: false},
	6: {pressed: false},
};
let flyMode=false;
const flySpeed=0.5;
let work=false;
let stepMode=false;
let creative=true;
let showT=true;
let showO=true;
let showB=true;
let showPS=false;
let testIndex=3;
let testing=false;
const bodies: Body[]=[];
const trails: Trail[]=[];
const lineMaterials=[
	new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.9 }),
	new THREE.LineBasicMaterial({ color: 0x88ff88, transparent: true, opacity: 0.9 }),
	new THREE.LineBasicMaterial({ color: 0xff8888, transparent: true, opacity: 0.9 }),
];
const sphereGeos=[
	new THREE.SphereGeometry(0.25,8,8),
	new THREE.SphereGeometry(0.05,8,8),
];
const sphereMats=[
	new THREE.MeshLambertMaterial({ color: 0xddddff, transparent: true, opacity: 0.9 }),
	new THREE.MeshLambertMaterial({ color: 0xddffdd, transparent: true, opacity: 0.9 }),
	new THREE.MeshLambertMaterial({ color: 0xffdddd, transparent: true, opacity: 0.9 }),
];
function resetSimulation(positions?: THREE.Vector3[], velocities?: THREE.Vector3[], masses?: number[]): void{
	while(bodies.length){
		scene.remove(bodies[0].obj);
		bodies.shift();
	}
	while(trails.length){
		scene.remove(trails[0].line);
		trails.shift();
	}
	const p=positions||[new THREE.Vector3(5,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(-5,0,0)];
	const v=velocities||[new THREE.Vector3(0,0.1,0.1), new THREE.Vector3(0,0,0), new THREE.Vector3(-0.1,-0.1,0)];
	const m=masses||[1,1,1];
	for(let i=0;i<n;i++){
		const mesh=new THREE.Mesh(sphereGeos[0], sphereMats[i%3]);
		mesh.receiveShadow=true;
		mesh.castShadow=true;
		mesh.position.copy(p[i]);
		scene.add(mesh);
		bodies.push(new Body(m[i], p[i], v[i], mesh, false));
	}
	for(let i=0;i<bodies.length;i++){
		const points=[bodies[i].obj.position.clone()];
		const geometry=new THREE.BufferGeometry();
		geometry.setFromPoints(points);
		const line=new THREE.Line(geometry, lineMaterials[i%3]);
		line.frustumCulled=false;
		scene.add(line);
		trails.push(new Trail(points, line));
	}
	const com=new THREE.Vector3();
	let totalMass=0;
	for(let i=0;i<bodies.length;i++){
		com.add(bodies[i].obj.position.clone().multiplyScalar(bodies[i].m));
		totalMass+=bodies[i].m;
	}
	com.divideScalar(totalMass);
	controls.target.copy(com);
	camera.position.copy(com.clone().add(new THREE.Vector3(0,0,15)));
	work=false;
	stepMode=false;
	if(testing){
		testing=false;
		testIndex=bodies.length;
	}
}
document.addEventListener("keydown", (e)=>{
	if(e.key==="ArrowRight"||e.key.toLowerCase()==="d") controller[1].pressed=true;
	if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a") controller[2].pressed=true;
	if(e.key==="ArrowUp"||e.key.toLowerCase()==="w") controller[3].pressed=true;
	if(e.key==="ArrowDown"||e.key.toLowerCase()==="s") controller[4].pressed=true;
	if(e.key==="Shift") controller[5].pressed=true;
	if(e.key==="Enter") controller[6].pressed=true;
	if(e.key===" ") toggleWork();
	if(e.key.toLowerCase()==="f") flyMode=!flyMode;
});
document.addEventListener("keyup", (e)=>{
	if(e.key==="ArrowRight") controller[1].pressed=false;
	if(e.key==="ArrowLeft") controller[2].pressed=false;
	if(e.key==="ArrowUp") controller[3].pressed=false;
	if(e.key==="ArrowDown") controller[4].pressed=false;
	if(e.key==="Shift") controller[5].pressed=false;
	if(e.key==="Enter") controller[6].pressed=false;
});
const stats=new Stats();
stats.showPanel(0);
document.getElementById("stats")!.appendChild(stats.dom);
stats.dom.style.position="relative";
resetSimulation();
const MAX_TRAIL=200000;
const _tempDir=new THREE.Vector3();
function grav(o: number): THREE.Vector3{
	const force=new THREE.Vector3();
	const o0=bodies[o].obj.position;
	const oMass=bodies[o].m;
	for(let i=0;i<bodies.length;i++){
		if(i!==o && !bodies[o].test){
			const o1=bodies[i].obj.position;
			const dir=_tempDir.subVectors(o1, o0).normalize();
			const distSq=o0.distanceToSquared(o1);
			force.add(dir.multiplyScalar(oMass*bodies[i].m/distSq));
		}
	}
	return force;
}
function physics(): void{
	const len=bodies.length;
	for(let i=0;i<len;i++) bodies[i].obj.position.add(bodies[i].v);
	const inv=1/20;
	for(let i=0;i<len;i++){
		const f=grav(i);
		bodies[i].v.add(f.multiplyScalar(inv/bodies[i].m));
	}
}
function cameraControl(): void{
	const com=new THREE.Vector3();
	let totalMass=0;
	for(let i=0;i<bodies.length;i++){
		com.add(bodies[i].obj.position.clone().multiplyScalar(bodies[i].m));
		totalMass+=bodies[i].m;
	}
	com.divideScalar(totalMass);
	controls.target.copy(com);
}
function trailControl(): void{
	const len=trails.length;
	for(let i=0;i<len;i++){
		const trail=trails[i];
		trail.pos.unshift(bodies[i].obj.position.clone());
		if(trail.pos.length>MAX_TRAIL) trail.pos.pop();
		const oldGeo=trail.line.geometry;
		const newGeo=new THREE.BufferGeometry();
		newGeo.setFromPoints(trail.pos);
		trail.line.geometry=newGeo;
		oldGeo.dispose();
	}
}
function computeStats(): { energy: number, angMom: THREE.Vector3, com: THREE.Vector3 }{
	let totalKinetic=0;
	let totalPotential=0;
	const comPos=new THREE.Vector3();
	let totalMass=0;
	for(let i=0;i<bodies.length;i++){
		const bi=bodies[i];
		totalKinetic+=0.5*bi.m*bi.v.lengthSq();
		comPos.add(bi.obj.position.clone().multiplyScalar(bi.m));
		totalMass+=bi.m;
	}
	comPos.divideScalar(totalMass);
	for(let i=0;i<bodies.length;i++){
		for(let j=i+1;j<bodies.length;j++){
			const r=bodies[i].obj.position.distanceTo(bodies[j].obj.position);
			totalPotential-=bodies[i].m*bodies[j].m/r;
		}
	}
	const angMom=new THREE.Vector3();
	for(let i=0;i<bodies.length;i++){
		const r=bodies[i].obj.position.clone();
		const p=bodies[i].v.clone().multiplyScalar(bodies[i].m);
		angMom.add(r.cross(p));
	}
	return { energy: totalKinetic+totalPotential, angMom, com: comPos };
}
function updateStatsDisplay(): void{
	const { energy, angMom, com }=computeStats();
	const div=document.getElementById("phys-stats");
	if(div){
		div.innerHTML=`E = ${energy.toFixed(3)} &nbsp; |L| = ${angMom.length().toFixed(3)}<br>COM = (${com.x.toFixed(2)}, ${com.y.toFixed(2)}, ${com.z.toFixed(2)})`;
	}
}
function presetLagrange(): void{
	const pos=[
		new THREE.Vector3(1,0,0),
		new THREE.Vector3(-1,0,0),
		new THREE.Vector3(0,0,0)
	];
	const vel=[
		new THREE.Vector3(0,0.5,0),
		new THREE.Vector3(0,-0.5,0),
		new THREE.Vector3(0,0,0)
	];
	const masses=[1,1,0.01];
	resetSimulation(pos, vel, masses);
}
function presetFigure8(): void{
	const pos=[
		new THREE.Vector3(0.970,-0.243,0),
		new THREE.Vector3(-0.970,-0.243,0),
		new THREE.Vector3(0,0.486,0)
	];
	const vel=[
		new THREE.Vector3(0.466,0.433,0),
		new THREE.Vector3(0.466,0.433,0),
		new THREE.Vector3(-0.932,-0.866,0)
	];
	const masses=[1,1,1];
	resetSimulation(pos, vel, masses);
}
function $(id: string): HTMLElement{
	return document.getElementById(id)!;
}
function run(): void{
	if(creative){
		$("begin").style.opacity="0";
		$("control-panel").style.opacity="1";
		setTimeout(()=>animate(), 1000);
		setTimeout(()=>hide(), 1000);
		creative=false;
	}
}
function hide(): void{
	$("begin").style.display="none";
}
function toggleWork(): void{
	if(stepMode){
		stepMode=false;
		work=false;
	}
	else{
		work=!work;
	}
}
function step(): void{
	if(!work){
		stepMode=true;
		physics();
		cameraControl();
		trailControl();
		if(testing) testMass();
		updateStatsDisplay();
	}
}
function reset(): void{
	resetSimulation();
}
function toggleTrails(): void{
	showT=!showT;
	for(const t of trails) t.line.visible=showT;
}
function toggleObjects(): void{
	showO=!showO;
	for(const b of bodies) b.obj.visible=showO;
}
function toggleBkg(): void{
	showB=!showB;
	scene.background=showB?stars:dark;
}
function toggleSetter(): void{
	showPS=!showPS;
	$("setter").style.display=showPS?"block":"none";
}
function addTestMass(): void{
	testing=true;
	const pos=new THREE.Vector3(-5,0,0);
	const vel=new THREE.Vector3(0,0.05,0.05);
	const mesh=new THREE.Mesh(sphereGeos[1], new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
	mesh.position.copy(pos);
	scene.add(mesh);
	bodies.push(new Body(1, pos, vel, mesh, true));
	const points=[pos.clone()];
	const geometry=new THREE.BufferGeometry();
	geometry.setFromPoints(points);
	const line=new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
	line.frustumCulled=false;
	scene.add(line);
	trails.push(new Trail(points, line));
	testIndex=bodies.length-1;
}
function testMass(): void{
	const idx=testIndex;
	bodies[idx].obj.position.add(bodies[idx].v);
	bodies[idx].v.add(grav(idx).multiplyScalar(1/(20*bodies[idx].m)));
	const trail=trails[idx];
	trail.pos.unshift(bodies[idx].obj.position.clone());
	if(trail.pos.length>MAX_TRAIL) trail.pos.pop();
	const oldGeo=trail.line.geometry;
	const newGeo=new THREE.BufferGeometry();
	newGeo.setFromPoints(trail.pos);
	trail.line.geometry=newGeo;
	oldGeo.dispose();
}
function genSlider(i: number): void{
	const b=bodies[i];
	let str="";
	str+=`<div class="slider-collect"><div class="slider-wrap"><span class="o8 m-l l col-${i%3}">m<sub>${i+1}</sub></span><input type="range" min="0.1" max="9.9" step="0.1" value="1" class="slider" id="input-s-${i}"><span id="input-n-${i}" class="o8 number l col-${i%3}">1.0</span></div>`;
	str+=`<div class="slider-wrap"><span class="o5 m-l l col-${i%3}">v<sub>${i+1}<sub>x</sub></sub></span><input type="range" min="-1.5" max="1.5" step="0.1" value="${b.v.x}" class="slider" id="input-s-${i}x"><span id="input-n-${i}x" class="o5 number l col-${i%3}">${b.v.x>=0?"+":""}${b.v.x.toFixed(1)}</span></div>`;
	str+=`<div class="slider-wrap"><span class="o5 m-l l col-${i%3}">v<sub>${i+1}<sub>y</sub></sub></span><input type="range" min="-1.5" max="1.5" step="0.1" value="${b.v.y}" class="slider" id="input-s-${i}y"><span id="input-n-${i}y" class="o5 number l col-${i%3}">${b.v.y>=0?"+":""}${b.v.y.toFixed(1)}</span></div>`;
	str+=`<div class="slider-wrap"><span class="o5 m-l l col-${i%3}">v<sub>${i+1}<sub>z</sub></sub></span><input type="range" min="-1.5" max="1.5" step="0.1" value="${b.v.z}" class="slider" id="input-s-${i}z"><span id="input-n-${i}z" class="o5 number l col-${i%3}">${b.v.z>=0?"+":""}${b.v.z.toFixed(1)}</span></div></div>`;
	$("setter").innerHTML+=str;
}
for(let i=0;i<n;i++) genSlider(i);
for(let i=0;i<n;i++){
	const massInput=$(`input-s-${i}`) as HTMLInputElement;
	const massSpan=$(`input-n-${i}`);
	massInput.addEventListener("input", ()=>{
		massSpan.innerHTML=Number(massInput.value).toFixed(1);
		bodies[i].m=Number(massInput.value);
	});
	const vxInput=$(`input-s-${i}x`) as HTMLInputElement;
	const vxSpan=$(`input-n-${i}x`);
	vxInput.addEventListener("input", ()=>{
		const val=Number(vxInput.value);
		vxSpan.innerHTML=(val>=0?"+":"")+val.toFixed(1);
		bodies[i].v.x=val;
	});
	const vyInput=$(`input-s-${i}y`) as HTMLInputElement;
	const vySpan=$(`input-n-${i}y`);
	vyInput.addEventListener("input", ()=>{
		const val=Number(vyInput.value);
		vySpan.innerHTML=(val>=0?"+":"")+val.toFixed(1);
		bodies[i].v.y=val;
	});
	const vzInput=$(`input-s-${i}z`) as HTMLInputElement;
	const vzSpan=$(`input-n-${i}z`);
	vzInput.addEventListener("input", ()=>{
		const val=Number(vzInput.value);
		vzSpan.innerHTML=(val>=0?"+":"")+val.toFixed(1);
		bodies[i].v.z=val;
	});
}
$("begin").addEventListener("click", run);
$("b-s").addEventListener("click", toggleWork);
$("b-step").addEventListener("click", step);
$("b-reset").addEventListener("click", reset);
$("b-t").addEventListener("click", toggleTrails);
$("b-o").addEventListener("click", toggleObjects);
$("b-b").addEventListener("click", toggleBkg);
$("b-tm").addEventListener("click", addTestMass);
$("b-ps").addEventListener("click", toggleSetter);
$("b-lagrange").addEventListener("click", presetLagrange);
$("b-figure8").addEventListener("click", presetFigure8);
$("setter").style.display="none";
function animate(): void{
	requestAnimationFrame(animate);
	stats.begin();
	if(work){
		physics();
		cameraControl();
		trailControl();
		if(testing) testMass();
		updateStatsDisplay();
	}
	if(flyMode){
		const forward=new THREE.Vector3();
		const right=new THREE.Vector3();
		camera.getWorldDirection(forward);
		right.crossVectors(forward, camera.up).normalize();
		const move=new THREE.Vector3();
		if(controller[1].pressed) move.add(right);
		if(controller[2].pressed) move.sub(right);
		if(controller[3].pressed) move.add(forward);
		if(controller[4].pressed) move.sub(forward);
		if(controller[5].pressed) move.y+=1;
		if(controller[6].pressed) move.y-=1;
		if(move.length()>0) move.normalize();
		camera.position.add(move.multiplyScalar(flySpeed));
		controls.target.copy(camera.position.clone().add(forward));
	}
	stats.end();
	controls.update();
	renderer.render(scene, camera);
}
// TODO:
// better test masses
// user input
// more optimization
// visual improvements