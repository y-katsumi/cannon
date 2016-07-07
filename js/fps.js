
//Blenderのオブジェクトを読み込む
loader = new THREE.JSONLoader();
var obakeGeometry,ogakeMaterial;


var others=[], otherMeshes=[];
var sphereShape, sphereBody, world, physicsMaterial, walls=[], balls=[], ballMeshes=[], boxes=[], boxMeshes=[];

var camera, scene, renderer, bainbain;
var geometry, material, mesh;
var controls,time = Date.now();

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

var playerConfig = {mass:0.5, radius: 0.6};
var MyPeer = new MyPeer();
var groundMaterial, boxMaterial, ballMaterial, playerMaterial;

if ( havePointerLock ) {

  var element = document.body;

  var pointerlockchange = function ( event ) {

      if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

          controls.enabled = true;

          blocker.style.display = 'none';

      } else {

          controls.enabled = false;

          blocker.style.display = '-webkit-box';
          blocker.style.display = '-moz-box';
          blocker.style.display = 'box';

          instructions.style.display = '';

      }

  }

  var pointerlockerror = function ( event ) {
      instructions.style.display = '';
  }

  // Hook pointer lock state change events
  document.addEventListener( 'pointerlockchange', pointerlockchange, false );
  document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

  document.addEventListener( 'pointerlockerror', pointerlockerror, false );
  document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
  document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

  instructions.addEventListener( 'click', function ( event ) {
      instructions.style.display = 'none';

      // Ask the browser to lock the pointer
      element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

      if ( /Firefox/i.test( navigator.userAgent ) ) {

          var fullscreenchange = function ( event ) {

              if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

                  document.removeEventListener( 'fullscreenchange', fullscreenchange );
                  document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

                  element.requestPointerLock();
              }

          }

          document.addEventListener( 'fullscreenchange', fullscreenchange, false );
          document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

          element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

          element.requestFullscreen();

      } else {

          element.requestPointerLock();

      }

  }, false );

} else {

  instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';

}

initCannon();
init();
animate();

function initCannon(){
  groundMaterial = new CANNON.Material();
  boxMaterial = new CANNON.Material();
  ballMaterial = new CANNON.Material();
  playerMaterial = new CANNON.Material();

  playerConfig.mesh = new THREE.MeshLambertMaterial( { color: 0xFC635D } );
  playerConfig.geometry = new THREE.SphereGeometry(playerConfig.radius, 32, 32);


  // Setup our world
  world = new CANNON.World();
  world.quatNormalizeSkip = 0;
  world.quatNormalizeFast = false;

  var solver = new CANNON.GSSolver();

  world.defaultContactMaterial.contactEquationStiffness = 1e9;
  world.defaultContactMaterial.contactEquationRelaxation = 4;

  solver.iterations = 7;
  solver.tolerance = 0.1;
  var split = true;
  if(split)
      world.solver = new CANNON.SplitSolver(solver);
  else
      world.solver = solver;

  world.gravity.set(0,-9.8,0);
  world.broadphase = new CANNON.NaiveBroadphase();

  // Create a slippery material (friction coefficient = 0.0)
  physicsMaterial = new CANNON.Material("slipperyMaterial");
  var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
                                                          physicsMaterial,
                                                          0.0, // friction coefficient
                                                          0.3  // restitution
                                                          );
  // We must add the contact materials to the world
  world.addContactMaterial(physicsContactMaterial);

  // Create a sphere
  sphereShape = new CANNON.Sphere(playerConfig.radius);
  sphereBody = new CANNON.Body({ mass: playerConfig.mass,material: playerMaterial});
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(0,2,0);
  sphereBody.linearDamping = 0.9;
  world.addBody(sphereBody);

  // Create a plane
  var groundShape = new CANNON.Plane();
  var groundBody = new CANNON.Body({ mass: 0, material: groundMaterial});
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
  world.addBody(groundBody);

  //摩擦と反発
  var selfGround = new CANNON.ContactMaterial(ballMaterial, boxMaterial, {
    friction: 0,
    restitution: 10
  });
  world.addContactMaterial(selfGround);
  var selfGround = new CANNON.ContactMaterial(groundMaterial, ballMaterial, {
    friction: 0,
    restitution: 10
  });
  var selfGround = new CANNON.ContactMaterial(ballMaterial, ballMaterial, {
    friction: 1,
    restitution: 3
  });
  world.addContactMaterial(selfGround);
  var selfGround = new CANNON.ContactMaterial(ballMaterial, playerMaterial, {
    friction: 1,
    restitution: 6
  });
  world.addContactMaterial(selfGround);
}

function init() {

  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0xaaaaaa, 0, 500 );

  var ambient = new THREE.AmbientLight( 0x555555 );
  scene.add( ambient );

  light = new THREE.SpotLight( 0xaaaaaa );
  light.position.set( 0, 50, 10 );
  light.target.position.set( 0, 0, 0 );
  if(true){
      light.castShadow = true;

      light.shadowCameraNear = 20;
      light.shadowCameraFar = 60;//camera.far;
      light.shadowCameraFov = 40;

      light.shadowMapBias = 0.1;
      light.shadowMapDarkness = 0.7;
      light.shadowMapWidth = 2*512;
      light.shadowMapHeight = 2*512;

      //light.shadowCameraVisible = true;
  }
  scene.add( light );



  controls = new PointerLockControls( camera , sphereBody );
  scene.add( controls.getObject() );

  // floor
  geometry = new THREE.PlaneGeometry( 300, 300, 50, 50 );
  geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

  material = new THREE.MeshLambertMaterial( { color: 0xdddddd } );
  ballColor = new THREE.MeshLambertMaterial( { color: 0x91CCFC } );

  mesh = new THREE.Mesh( geometry, material );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add( mesh );

  renderer = new THREE.WebGLRenderer();
  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( scene.fog.color, 1 );

  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );

  // Add boxes
  var halfExtents = new CANNON.Vec3(1,1,1);
  var boxShape = new CANNON.Box(halfExtents);
  var boxGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);
  for(var i=0; i<7; i++){
      var x = (Math.random()-0.5)*20;
      var y = 1 + (Math.random()-0.5)*1;
      var z = (Math.random()-0.5)*20;
      var boxBody = new CANNON.Body({ mass: 5, material: boxMaterial});
      boxBody.addShape(boxShape);
      var boxMesh = new THREE.Mesh( boxGeometry, material );
      world.addBody(boxBody);
      scene.add(boxMesh);
      boxBody.position.set(x,y,z);
      boxMesh.position.set(x,y,z);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      boxes.push(boxBody);
      boxMeshes.push(boxMesh);
  }


  // Add linked boxes
  var size = 0.5;
  var he = new CANNON.Vec3(size,size,size*0.1);
  var boxShape = new CANNON.Box(he);
  var mass = 0;
  var space = 0.1 * size;
  var N = 5, last;
  var boxGeometry = new THREE.BoxGeometry(he.x*2,he.y*2,he.z*2);
  for(var i=0; i<N; i++){
      var boxbody = new CANNON.Body({ mass: mass, material: boxMaterial});
      boxbody.addShape(boxShape);
      var boxMesh = new THREE.Mesh(boxGeometry, material);
      boxbody.position.set(5,(N-i)*(size*2+2*space) + size*2+space,0);
      boxbody.linearDamping = 0.01;
      boxbody.angularDamping = 0.01;
      // boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      world.addBody(boxbody);
      scene.add(boxMesh);
      boxes.push(boxbody);
      boxMeshes.push(boxMesh);

      if(i!=0){
          // Connect this body to the last one
          var c1 = new CANNON.PointToPointConstraint(boxbody,new CANNON.Vec3(-size,size+space,0),last,new CANNON.Vec3(-size,-size-space,0));
          var c2 = new CANNON.PointToPointConstraint(boxbody,new CANNON.Vec3(size,size+space,0),last,new CANNON.Vec3(size,-size-space,0));
          world.addConstraint(c1);
          world.addConstraint(c2);
      } else {
          mass=0.3;
      }
      last = boxbody;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

var dt = 1/60;
function animate() {
  requestAnimationFrame( animate );
  if(controls.enabled){
      world.step(dt);

      // Update ball positions
      for(var i=0; i<balls.length; i++){
          ballMeshes[i].position.copy(balls[i].position);
          ballMeshes[i].quaternion.copy(balls[i].quaternion);
      }

      // Update box positions
      for(var i=0; i<boxes.length; i++){
          boxMeshes[i].position.copy(boxes[i].position);
          boxMeshes[i].quaternion.copy(boxes[i].quaternion);
      }

      for(var id in others){
        otherMeshes[id].last_frame = otherMeshes[id].current_frame;
        otherMeshes[id].current_frame++;
        if (30 <= otherMeshes[id].current_frame) {
          otherMeshes[id].current_frame = 0;
        }
        otherMeshes[id].morphTargetInfluences[otherMeshes[id].last_frame] = 0;
        otherMeshes[id].morphTargetInfluences[otherMeshes[id].current_frame] = 1;

        otherMeshes[id].position.copy(others[id].position);
        otherMeshes[id].quaternion.copy(others[id].quaternion);
      }
  }

  controls.update( Date.now() - time );
  renderer.render( scene, camera );
  time = Date.now();

}

var ballShape = new CANNON.Sphere(0.1);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 15;
var projector = new THREE.Projector();
function getShootDir(targetVec, data){
  var vector = targetVec;
  targetVec.set(0,0,1);
  projector.unprojectVector(vector, camera);
  var ray = new THREE.Ray(data.position, vector.sub(data.position).normalize() );
  targetVec.copy(ray.direction);
}

window.addEventListener("click",function(e){
  createBall({position: sphereBody.position,radius: sphereShape.radius});
  MyPeer.sendData({
    type: 'createBall'
    ,position: sphereBody.position
    ,radius: sphereShape.radius
    ,shootDirection: shootDirection
  });
});
function createBall(data){
  var x = data.position.x;
  var y = data.position.y;
  var z = data.position.z;
  var ballBody = new CANNON.Body({ mass: 2, material: ballMaterial});
  ballBody.addShape(ballShape);
  var ballMesh = new THREE.Mesh( ballGeometry, ballColor );
  world.addBody(ballBody);
  scene.add(ballMesh);
  ballMesh.castShadow = true;
  ballMesh.receiveShadow = true;
  balls.push(ballBody);
  ballMeshes.push(ballMesh);

  if (data.shootDirection !== undefined) {
    var vel = data.shootDirection;
  } else {
    getShootDir(shootDirection, data);
    var vel = shootDirection;
  }

  ballBody.velocity.set(  vel.x * shootVelo,
                          vel.y * shootVelo + 5,
                          vel.z * shootVelo);

  // ballBody.initVelocity.set(0,1000,0);
  // ballBody.angularDamping = 0.00001;
// console.log(ballBody.force);
  // Move the ball outside the player sphere
  x += vel.x * (data.radius*1.02 + ballShape.radius);
  y += vel.y * (data.radius*1.02 + ballShape.radius);
  z += vel.z * (data.radius*1.02 + ballShape.radius);
  ballBody.position.set(x,y,z);
  ballMesh.position.set(x,y,z);
}

function sendSelfPotision(peerId){
  MyPeer.sendData({
    type: 'moveOtherPlayer'
    ,position: sphereBody.position
    ,peerId: peerId
  });
}
function moveOtherPlayer(data){
  if (data.peerId === undefined) {
    return false;
  }
  if (others[data.peerId] === undefined) {
    var ballBody = new CANNON.Body({ mass: playerConfig.mass,material: playerConfig.Material});
    ballBody.addShape(sphereShape);
    world.addBody(ballBody);


    //モーフアニメーションメッシュ生成
    var obakeMesh = new THREE.MorphAnimMesh(obakeGeometry, new THREE.MeshFaceMaterial(ogakeMaterial));
    obakeMesh.scale.set( 0.3, 0.3, 0.3 );
    scene.add(obakeMesh);

    otherMeshes[data.peerId] = obakeMesh;
    otherMeshes[data.peerId].current_frame = 1;

    others[data.peerId] = ballBody;
  }

  var x = data.position.x;
  var y = data.position.y;
  var z = data.position.z;

  others[data.peerId].position.set(x,y,z);
  otherMeshes[data.peerId].position.set(x,y,z);
}
function destroyPlayer(peerId){
  world.removeBody(others[peerId]);
  scene.remove(otherMeshes[peerId]);
  delete otherMeshes[peerId];
  delete others[peerId];
}

loader.load( 'json/obake3d.json', function ( geometry, materials ) { //第１引数はジオメトリー、第２引数はマテリアルが自動的に取得）
  //全てのマテリアルのモーフターゲットの値をtrueにする
  for (var i = 0, l = materials.length; i < l; i++) {
       materials[i].morphTargets = true;
  }
  obakeGeometry = geometry;
  ogakeMaterial = materials;
});