const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const coinsDisplay = document.getElementById("coinsDisplay");

let coins = parseInt(localStorage.getItem("coins")) || 0;
coinsDisplay.textContent = coins;

class Input{
    constructor(){
        this.keys={};
        window.addEventListener("keydown",e=>this.keys[e.key.toLowerCase()]=true);
        window.addEventListener("keyup",e=>this.keys[e.key.toLowerCase()]=false);

        document.querySelectorAll(".button").forEach(btn=>{
            let key=btn.getAttribute("data-key");
            btn.addEventListener("mousedown",()=>this.keys[key]=true);
            btn.addEventListener("mouseup",()=>this.keys[key]=false);
            btn.addEventListener("touchstart",e=>{e.preventDefault();this.keys[key]=true});
            btn.addEventListener("touchend",e=>{e.preventDefault();this.keys[key]=false});
        });
    }
    isDown(k){return this.keys[k]}
}

class Human{
    constructor(x,y){
        this.x=x; this.y=y;
        this.width=40; this.height=80;
        this.alive=true;
    }
    draw(){
        ctx.fillStyle=this.alive?"green":"red";
        ctx.fillRect(this.x,this.y,this.width,this.height);
    }
}

class Butler{
    constructor(x,y){
        this.x=x; this.y=y;
        this.width=40; this.height=80;
        this.state="normal";
        this.timer=0;
    }
    update(human){
        this.timer++;

        if(this.timer>400) this.state="attack";

        if(this.state==="normal"){
            this.x+=1;
            if(this.x>canvas.width-40) this.x=0;
        }

        if(this.state==="attack"){
            let dx=human.x-this.x;
            let dy=human.y-this.y;
            let dist=Math.sqrt(dx*dx+dy*dy);

            if(dist>1){
                this.x+=(dx/dist)*3;
                this.y+=(dy/dist)*3;
            }

            if(dist<40){
                human.alive=false;
                gameOver();
            }
        }
    }
    draw(){
        ctx.fillStyle=this.state==="attack"?"darkred":"black";
        ctx.fillRect(this.x,this.y,this.width,this.height);
    }
}

class Shadow{
    constructor(x,y){
        this.x=x; this.y=y;
        this.radius=15;
        this.energy=100;
    }
    update(input,butler){
        if(input.isDown("w")) this.y-=3;
        if(input.isDown("s")) this.y+=3;
        if(input.isDown("a")) this.x-=3;
        if(input.isDown("d")) this.x+=3;

        let dx=this.x-(butler.x+20);
        let dy=this.y-(butler.y+40);
        let dist=Math.sqrt(dx*dx+dy*dy);

        if(dist<50 && input.isDown(" ")){
            butler.state="normal";
            butler.timer=0;
            this.energy-=1;
        }else{
            this.energy-=0.2;
        }

        if(this.energy<=0){
            gameOver();
        }
    }
    draw(){
        ctx.fillStyle="purple";
        ctx.beginPath();
        ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
        ctx.fill();
    }
}

let input=new Input();
let human, butler, shadow;
let running=false;

function startGame(){
    human=new Human(200,300);
    butler=new Butler(600,300);
    shadow=new Shadow(450,250);
    running=true;
}

function gameOver(){
    running=false;
    restartBtn.style.display="block";
    menuBtn.style.display="block";
    localStorage.setItem("coins",coins);
}

function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(running){
        butler.update(human);
        shadow.update(input,butler);

        human.draw();
        butler.draw();
        shadow.draw();

        ctx.fillStyle="black";
        ctx.fillRect(20,20,shadow.energy*2,10);
        ctx.strokeRect(20,20,200,10);
    }

    requestAnimationFrame(loop);
}
loop();

startBtn.onclick=()=>{
    menu.style.display="none";
    canvas.style.display="block";
    startGame();
};

restartBtn.onclick=()=>{
    restartBtn.style.display="none";
    menuBtn.style.display="none";
    startGame();
};

menuBtn.onclick=()=>{
    canvas.style.display="none";
    restartBtn.style.display="none";
    menuBtn.style.display="none";
    menu.style.display="flex";
};
