import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';
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
document.addEventListener("keydown", (e)=>{
	if(e.key==="ArrowRight") controller[1].pressed=true;
	if(e.key==="ArrowLeft") controller[2].pressed=true;
	if(e.key==="ArrowUp") controller[3].pressed=true;
	if(e.key==="ArrowDown") controller[4].pressed=true;
	if(e.key==="Shift") controller[5].pressed=true;
	if(e.key==="Enter") controller[6].pressed=true;
	if(e.key===" ") toggleWork();
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
function bodyMake(): void{
	for(let i=0; i<n; i++){
		const pos=new THREE.Vector3(5*i,0,0);
		const mesh=new THREE.Mesh(sphereGeos[0], sphereMats[i%3]);
		mesh.receiveShadow=true;
		mesh.castShadow=true;
		mesh.position.copy(pos);
		scene.add(mesh);
		bodies.push(new Body(1, pos, new THREE.Vector3(), mesh, false));
	}
	bodies[0].v.set(0,0.1,0.1);
	bodies[2].v.set(-0.1,-0.1,0);
	controls.target.x=5*(n-1)/2;
	camera.position.x=5*(n-1)/2;
}
function trailMake(): void{
	for(let i=0; i<bodies.length; i++){
		const points=[bodies[i].obj.position.clone()];
		const geometry=new THREE.BufferGeometry();
		geometry.setFromPoints(points);
		const line=new THREE.Line(geometry, lineMaterials[i%3]);
		line.frustumCulled=false;
		scene.add(line);
		trails.push(new Trail(points, line));
	}
}
bodyMake();
trailMake();
function grav(o: number): THREE.Vector3{
	const force=new THREE.Vector3();
	for(let i=0; i<bodies.length; i++){
		if(i!==o && !bodies[o].test){
			const o0=bodies[o].obj.position;
			const o1=bodies[i].obj.position;
			const dir=new THREE.Vector3().subVectors(o1, o0).normalize();
			const distSq=o0.distanceToSquared(o1);
			force.add(dir.multiplyScalar(bodies[o].m*bodies[i].m/distSq));
		}
	}
	return force;
}
function physics(): void{
	for(let i=0; i<bodies.length; i++){
		bodies[i].obj.position.add(bodies[i].v);
	}
	for(let i=0; i<bodies.length; i++){
		bodies[i].v.add(grav(i).multiplyScalar(1/(20*bodies[i].m)));
	}
}
function cameraControl(): void{
	const com=new THREE.Vector3();
	let totalMass=0;
	for(let i=0; i<bodies.length; i++){
		com.add(bodies[i].obj.position.clone().multiplyScalar(bodies[i].m));
		totalMass+=bodies[i].m;
	}
	com.divideScalar(totalMass);
	controls.target.copy(com);
}
function trailControl(): void{
	for(let i=0; i<trails.length; i++){
		trails[i].pos.unshift(bodies[i].obj.position.clone());
		if(trails[i].pos.length>200) trails[i].pos.pop();
		const oldGeo=trails[i].line.geometry;
		const newGeo=new THREE.BufferGeometry();
		newGeo.setFromPoints(trails[i].pos);
		trails[i].line.geometry=newGeo;
		oldGeo.dispose();
	}
}
let work=false;
let creative=true;
let showT=true;
let showO=true;
let showB=true;
let showPS=false;
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
function toggleWork(): void{ work=!work; }
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
let testIndex=bodies.length;
let testing=false;
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
	bodies[testIndex].obj.position.add(bodies[testIndex].v);
	bodies[testIndex].v.add(grav(testIndex).multiplyScalar(1/(20*bodies[testIndex].m)));
	trails[testIndex].pos.unshift(bodies[testIndex].obj.position.clone());
	if(trails[testIndex].pos.length>200) trails[testIndex].pos.pop();
	const oldGeo=trails[testIndex].line.geometry;
	const newGeo=new THREE.BufferGeometry();
	newGeo.setFromPoints(trails[testIndex].pos);
	trails[testIndex].line.geometry=newGeo;
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
for(let i=0; i<n; i++) genSlider(i);
for(let i=0; i<n; i++){
	$(`input-s-${i}`).addEventListener("input", ()=>{
		$(`input-n-${i}`).innerHTML=Number($(`input-s-${i}`).value).toFixed(1);
		bodies[i].m=Number($(`input-s-${i}`).value);
	});
	$(`input-s-${i}x`).addEventListener("input", ()=>{
		const val=Number($(`input-s-${i}x`).value);
		$(`input-n-${i}x`).innerHTML=(val>=0?"+":"")+val.toFixed(1);
		bodies[i].v.x=val;
	});
	$(`input-s-${i}y`).addEventListener("input", ()=>{
		const val=Number($(`input-s-${i}y`).value);
		$(`input-n-${i}y`).innerHTML=(val>=0?"+":"")+val.toFixed(1);
		bodies[i].v.y=val;
	});
	$(`input-s-${i}z`).addEventListener("input", ()=>{
		const val=Number($(`input-s-${i}z`).value);
		$(`input-n-${i}z`).innerHTML=(val>=0?"+":"")+val.toFixed(1);
		bodies[i].v.z=val;
	});
}
$("begin").addEventListener("click", run);
$("b-s").addEventListener("click", toggleWork);
$("b-t").addEventListener("click", toggleTrails);
$("b-o").addEventListener("click", toggleObjects);
$("b-b").addEventListener("click", toggleBkg);
$("b-tm").addEventListener("click", addTestMass);
$("b-ps").addEventListener("click", toggleSetter);
$("setter").style.display="none";
function animate(): void{
	requestAnimationFrame(animate);
	stats.begin();
	if(work){
		physics();
		cameraControl();
		trailControl();
		if(testing) testMass();
	}
	stats.end();
	controls.update();
	renderer.render(scene, camera);
}
// TODO:
// keyboard flying around
// better test masses
// user input
// more optimization