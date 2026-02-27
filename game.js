// ==== ELEMENTE DOM ====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restartBtn");

// MENIU
const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const questsBtn = document.getElementById("questsBtn");
const shopBtn = document.getElementById("shopBtn");
const shopDiv = document.getElementById("shop");
const questsDiv = document.getElementById("quests");
const shopBack = document.getElementById("shopBack");
const questsBack = document.getElementById("questsBack");
const coinsDisplay = document.getElementById("coinsDisplay");

let coins = 0;
let shieldOwned = false;
let magnetOwned = false;
let questProgress = 0;

// ==== INPUT ====
class Input {
    constructor() {
        this.keys = {};
        window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", e => this.keys[e.key.toLowerCase()] = false);

        const buttons = document.querySelectorAll(".button");
        buttons.forEach(btn => {
            let key = btn.getAttribute("data-key").toLowerCase();
            btn.addEventListener("touchstart", e => { e.preventDefault(); this.keys[key]=true; });
            btn.addEventListener("touchend", e => { e.preventDefault(); this.keys[key]=false; });
            btn.addEventListener("mousedown", e => this.keys[key]=true);
            btn.addEventListener("mouseup", e => this.keys[key]=false);
            btn.addEventListener("mouseleave", e => this.keys[key]=false);
        });
    }
    isDown(key){ return this.keys[key.toLowerCase()]; }
}

// ==== BAR ====
class Bar {
    constructor(x,y,width,height){
        this.x=x; this.y=y; this.width=width; this.height=height;
        this.objects=["drink","drink","drink","drink","knife","knife","gun"];
    }
    draw(ctx){
        ctx.fillStyle="#654321";
        ctx.fillRect(this.x,this.y,this.width,this.height);
        ctx.fillStyle="white"; ctx.font="16px Arial";
        ctx.fillText("BAR",this.x+10,this.y+20);
    }
    randomObject(){ return this.objects[Math.floor(Math.random()*this.objects.length)]; }
}

// ==== CENTRAL SHADOW ZONE ====
class CentralShadowZone {
    constructor(x,y,radius){ this.x=x; this.y=y; this.radius=radius; }
    draw(ctx){ ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); }
    contains(entity){ const dx=entity.x-this.x, dy=entity.y-this.y; return Math.sqrt(dx*dx+dy*dy)<this.radius; }
}

// ==== HUMAN ====
class Human {
    constructor(x,y,imgSrc){
        this.x=x; this.y=y; this.width=40; this.height=80; this.alive=true;
        this.img=new Image(); this.img.src=imgSrc;
    }
    draw(ctx){
        if(this.alive) ctx.drawImage(this.img,this.x,this.y,this.width,this.height);
        else { ctx.fillStyle="red"; ctx.fillRect(this.x,this.y,this.width,this.height); }
    }
}

// ==== BUTLER ====
class Butler {
    constructor(x,y,imgSrc,bar){
        this.x=x; this.y=y; this.width=40; this.height=80;
        this.speed=1.2; this.direction=-1; this.state="normal"; this.timer=0; this.attackCounter=0;
        this.img=new Image(); this.img.src=imgSrc;
        this.currentObject=null; this.bar=bar; this.toBar=false; this.hasObject=false;
    }
    update(human, shadowPlayer, game){
        this.timer++;
        if(this.timer>300 && this.state==="normal") this.state="suspicious";
        if(this.timer>500 && this.state==="suspicious") this.state="attack";

        // merge la bar
        if(!this.toBar && !this.hasObject && Math.random()<0.002) this.toBar=true;

        // daca merge la bar
        if(this.toBar){
            const dx=(this.bar.x+this.bar.width/2)-this.x;
            const dy=(this.bar.y+this.bar.height/2)-this.y;
            const dist=Math.sqrt(dx*dx + dy*dy);
            if(dist>1){ this.x+=(dx/dist)*2; this.y+=(dy/dist)*2; }
            else {
                this.currentObject = this.bar.randomObject();
                this.toBar=false; this.hasObject=true;
            }
            return;
        }

        // merge la Human daca are obiect
        if(this.hasObject){
            const dx = human.x-this.x;
            const dy = human.y-this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist>1){ this.x+=(dx/dist)*3; this.y+=(dy/dist)*3; }
            else {
                // MAGNET
                if(magnetOwned && (this.currentObject==="knife" || this.currentObject==="gun")){
                    // obiectul este atras -> nu omoara
                    this.hasObject=false; this.currentObject=null; return;
                }
                // SHIELD
                if(shieldOwned && shadowPlayer.inShadow){
                    // blocheaza atacul
                    this.hasObject=false; this.currentObject=null; return;
                }
                // atac normal
                if(this.currentObject==="knife" || this.currentObject==="gun"){
                    human.alive=false; game.gameOver=true; restartBtn.style.display="block";
                } else if(this.currentObject==="drink"){
                    // succes -> quest progres
                    questProgress++; 
                    if(questProgress>=3){ coins+=5; questProgress=0; coinsDisplay.textContent=coins; }
                }
                this.hasObject=false; this.currentObject=null;
            }
            return;
        }

        // miscarea normala
        if(this.state==="normal" || this.state==="suspicious"){
            this.x+=this.speed*this.direction;
            if(this.x>canvas.width-this.width){ this.x=canvas.width-this.width; this.direction*=-1; }
            if(this.x<0){ this.x=0; this.direction*=-1; }
        } else if(this.state==="attack"){
            if(!shadowPlayer.inShadow) this.attackCounter++;
            else this.attackCounter=0;
            if(this.attackCounter>300) this.state="chase";
        } else if(this.state==="chase"){
            const dx=human.x-this.x;
            const dy=human.y-this.y;
            const dist=Math.sqrt(dx*dx + dy*dy);
            if(dist>1){ this.x+=(dx/dist)*4; this.y+=(dy/dist)*4; }
        }
    }
    draw(ctx){
        ctx.drawImage(this.img,this.x,this.y,this.width,this.height);
        if(this.currentObject){ ctx.fillStyle="yellow"; ctx.font="12px Arial"; ctx.fillText(this.currentObject,this.x,this.y-5); }
    }
}

// ==== SHADOW PLAYER ====
class ShadowPlayer {
    constructor(x,y){ this.x=x; this.y=y; this.radius=15; this.speed=3; this.energy=100; this.inShadow=false; }
    update(input, centralZone){
        if(input.isDown("w")) this.y-=this.speed;
        if(input.isDown("s")) this.y+=this.speed;
        if(input.isDown("a")) this.x-=this.speed;
        if(input.isDown("d")) this.x+=this.speed;
        this.x=Math.max(0,Math.min(canvas.width,this.x));
        this.y=Math.max(0,Math.min(canvas.height,this.y));

        if(centralZone.contains(this)) this.energy+=0.5;
        else if(!this.inShadow) this.energy-=0.2;
        this.energy=Math.max(0,Math.min(100,this.energy));
    }
    draw(ctx){ ctx.fillStyle=this.inShadow?"purple":"black"; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); }
}

// ==== GAME ====
class Game {
    constructor(){
        this.state="menu";
        this.input = new Input();
        this.centralZone = new CentralShadowZone(canvas.width/2,canvas.height/2,100);
        this.bar = new Bar(400,50,100,40);
        this.human = new Human(200,320,"https://i.imgur.com/2Sg7kbM.png");
        this.butler = new Butler(700,320,"https://i.imgur.com/3vA0rO6.png",this.bar);
        this.shadowPlayer = new ShadowPlayer(canvas.width/2,canvas.height/2);
        this.gameOver=false;
    }
    update(){
        if(this.state!=="playing") return;
        if(this.gameOver) return;
        this.butler.update(this.human,this.shadowPlayer,this);
        this.shadowPlayer.update(this.input,this.centralZone);
    }
    draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if(this.state!=="playing") return;
        this.bar.draw(ctx);
        this.centralZone.draw(ctx);
        this.human.draw(ctx);
        this.butler.draw(ctx);
        this.shadowPlayer.draw(ctx);

        // energy bar
        ctx.fillStyle="black"; ctx.fillRect(20,20,this.shadowPlayer.energy*2,10);
        ctx.strokeRect(20,20,200,10);

        if(this.gameOver){
            ctx.fillStyle="black";
            ctx.font="40px Arial";
            ctx.fillText("GAME OVER",canvas.width/2-120,canvas.height/2);
        }
    }
}

// ==== INITIAL GAME ====
let game = new Game();

// ==== MENIU / SHOP / QUEST LOGIC ====
startBtn.addEventListener("click",()=>{
    menu.style.display="none";
    canvas.style.display="block";
    game.state="playing";
});

questsBtn.addEventListener("click",()=>{
    menu.style.display="none";
    questsDiv.style.display="block";
});

questsBack.addEventListener("click",()=>{
    questsDiv.style.display="none";
    menu.style.display="block";
});

shopBtn.addEventListener("click",()=>{
    menu.style.display="none";
    shopDiv.style.display="block";
});

shopBack.addEventListener("click",()=>{
    shopDiv.style.display="none";
    menu.style.display="block";
});

// cumparare iteme
shopDiv.querySelectorAll("button[data-item]").forEach(btn=>{
    btn.addEventListener("click",()=>{
        const item = btn.getAttribute("data-item");
        if(item==="shield" && coins>=3){ shieldOwned=true; coins-=3; coinsDisplay.textContent=coins; }
        if(item==="magnet" && coins>=5){ magnetOwned=true; coins-=5; coinsDisplay.textContent=coins; }
    });
});

// restart
restartBtn.addEventListener("click",()=>{
    game = new Game();
    restartBtn.style.display="none";
    canvas.style.display="block";
    menu.style.display="none";
    game.state="playing";
});

// ==== LOOP ====
function gameLoop(){ game.update(); game.draw(); requestAnimationFrame(gameLoop); }
gameLoop();
