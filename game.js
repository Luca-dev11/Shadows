const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const playBtn = document.getElementById("playBtn");
const menu = document.getElementById("menu");
const shopBtn = document.getElementById("shopBtn");

let inMenu = true;
let shopOpen = false;

// ===== ECONOMIE =====
let coins = 0;

let quests = {
    progress: 0,
    goal: 5,
    reward: 15
};

let upgrades = {
    energy: 0,
    speed: 0,
    range: 0
};

// ===== INPUT =====
class Input {
    constructor() {
        this.keys = {};

        window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", e => this.keys[e.key.toLowerCase()] = false);

        document.querySelectorAll(".button").forEach(btn => {
            const key = btn.getAttribute("data-key").toLowerCase();

            btn.addEventListener("touchstart", e => { e.preventDefault(); this.keys[key]=true; });
            btn.addEventListener("touchend", e => { e.preventDefault(); this.keys[key]=false; });
            btn.addEventListener("mousedown", () => this.keys[key]=true);
            btn.addEventListener("mouseup", () => this.keys[key]=false);
            btn.addEventListener("mouseleave", () => this.keys[key]=false);
        });
    }

    isDown(key){ return this.keys[key.toLowerCase()]; }
}

// ===== BAR =====
class Bar {
    constructor(x,y,w,h){
        this.x=x; this.y=y; this.width=w; this.height=h;
        this.objects=["bautura","bautura","cutit","pistol"];
    }

    draw(ctx){
        ctx.fillStyle="#654321";
        ctx.fillRect(this.x,this.y,this.width,this.height);

        ctx.fillStyle="white";
        ctx.font="16px Arial";
        ctx.fillText("BAR",this.x+10,this.y+20);
    }

    randomObject(){
        const r = Math.random();

if(r < 0.8) return "bautura";
else if(r < 0.9) return "cutit";
else return "pistol";
    }
}

// ===== ZONA =====
class CentralShadowZone {
    constructor(x,y,r){ this.x=x; this.y=y; this.radius=r; }

    draw(ctx){
        ctx.fillStyle="rgba(0,0,0,0.7)";
        ctx.beginPath();
        ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
        ctx.fill();
    }

    contains(e){
        const dx=e.x-this.x, dy=e.y-this.y;
        return Math.sqrt(dx*dx+dy*dy)<this.radius;
    }
}

// ===== HUMAN =====
class Human {
    constructor(x,y,img){
        this.x=x; this.y=y; this.width=40; this.height=80; this.alive=true;
        this.img=new Image(); this.img.src=img;
    }

    draw(ctx){
        if(this.alive){
            ctx.drawImage(this.img,this.x,this.y,this.width,this.height);
        } else {
            ctx.fillStyle="red";
            ctx.fillRect(this.x,this.y,this.width,this.height);
        }
    }
}

// ===== BUTLER =====
class Butler {
    constructor(x,y,img,bar){
        this.x=x; this.y=y; this.width=40; this.height=80;
        this.speed=1.2; this.direction=-1;

        this.state="normal";
        this.timer=0;
        this.attackCounter=0;

        this.img=new Image(); this.img.src=img;

        this.bar=bar;
        this.toBar=false;
        this.hasObject=false;
        this.currentObject=null;
    }

    update(human, shadowPlayer, game){
        this.timer++;

        if(this.timer>300 && this.state==="normal") this.state="suspicious";
        if(this.timer>500 && this.state==="suspicious") this.state="attack";

        if(!this.toBar && !this.hasObject && Math.random()<0.002) this.toBar=true;

        // ===== BAR =====
        if(this.toBar){
            const dx=(this.bar.x+50)-this.x;
            const dy=(this.bar.y+20)-this.y;
            const dist=Math.sqrt(dx*dx+dy*dy);

            if(dist>1){
                this.x+=(dx/dist)*2;
                this.y+=(dy/dist)*2;
            } else {
                this.currentObject=this.bar.randomObject();

                if(this.currentObject==="bautura") this.state="normal";
                if(this.currentObject==="cutit") this.state="suspicious";
                if(this.currentObject==="pistol") this.state="attack";

                this.toBar=false;
                this.hasObject=true;
            }
            return;
        }

        // ===== MERGE LA OM =====
        if(this.hasObject){
            const dx=human.x-this.x;
            const dy=human.y-this.y;
            const dist=Math.sqrt(dx*dx+dy*dy);

            if(dist>1){
                this.x+=(dx/dist)*3;
                this.y+=(dy/dist)*3;
            } else {
                if(this.currentObject==="cutit" || this.currentObject==="pistol"){
                    human.alive=false;
                    game.gameOver=true;
                    restartBtn.style.display="block";
                    menuBtn.style.display="block";
                }

                this.hasObject=false;
                this.currentObject=null;
                this.direction*=-1;
            }
            return;
        }

        // ===== ATTACK =====
        if(this.state==="attack"){
            if(!shadowPlayer.inShadow) this.attackCounter++;
            else this.attackCounter=0;

            if(this.attackCounter>300) this.state="chase";
        }

        // ===== MISCARE =====
        if(this.state==="normal" || this.state==="suspicious"){
            this.x+=this.speed*this.direction;

            if(this.x>canvas.width-this.width || this.x<0){
                this.direction*=-1;
            }
} else if(this.state==="chase"){
    const dx = human.x - this.x;
    const dy = human.y - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist > 20){
        this.x += (dx/dist)*4;
        this.y += (dy/dist)*4;
    } else {
        // 💀 omoară omul
        human.alive = false;
        game.gameOver = true;

        restartBtn.style.display="block";
        menuBtn.style.display="block";
    }
}
    }

    draw(ctx){
        ctx.drawImage(this.img,this.x,this.y,this.width,this.height);

        if(this.currentObject){
            ctx.fillStyle="yellow";
            ctx.font="12px Arial";
            ctx.fillText(this.currentObject,this.x,this.y-5);
        }
    }
}

// ===== SHADOW BUTLER =====
class ShadowButler {
    constructor(b){ this.b=b; this.offsetX=20; this.offsetY=20; }

    get x(){ return this.b.x+this.offsetX; }
    get y(){ return this.b.y+this.offsetY; }

    draw(ctx){
        ctx.fillStyle="black";
        ctx.fillRect(this.x,this.y,this.b.width,this.b.height);

        if(this.b.state==="suspicious" || this.b.state==="attack" || this.b.state==="chase"){
            ctx.fillStyle="red";
            ctx.fillRect(this.x+10,this.y+20,5,5);
            ctx.fillRect(this.x+25,this.y+20,5,5);
        }
    }
}

// ===== PLAYER =====
class ShadowPlayer {
    constructor(x,y){
        this.x=x; this.y=y;
        this.radius=15;

        this.speed = 3 + upgrades.speed;
        this.maxEnergy = 100 + upgrades.energy*20;
        this.energy = this.maxEnergy;
        this.range = 40 + upgrades.range*10;

        this.inShadow=false;
    }

    update(input, zone, shadowButler, butler, game){
        if(shopOpen) return;

        if(input.isDown("w")) this.y-=this.speed;
        if(input.isDown("s")) this.y+=this.speed;
        if(input.isDown("a")) this.x-=this.speed;
        if(input.isDown("d")) this.x+=this.speed;

        const dx=this.x-(shadowButler.x+20);
        const dy=this.y-(shadowButler.y+40);
        const dist=Math.sqrt(dx*dx+dy*dy);

        if(dist<this.range && input.isDown(" ")){
            this.inShadow=true;
            this.energy-=0.5;

            if(butler.state==="attack"){
                butler.state="normal";
                butler.timer=0;
                butler.attackCounter=0;

                quests.progress++;
                if(quests.progress>=quests.goal){
                    coins+=quests.reward;
                    quests.progress=0;
                }
            }

        } else this.inShadow=false;

        if(zone.contains(this)) this.energy+=0.5;
        else if(!this.inShadow) this.energy-=0.2;

        this.energy=Math.max(0,Math.min(this.maxEnergy,this.energy));

        if(this.energy<=0){
            game.gameOver=true;
            restartBtn.style.display="block";
            menuBtn.style.display="block";
        }
    }

    draw(ctx){
        ctx.fillStyle=this.inShadow?"purple":"black";
        ctx.beginPath();
        ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
        ctx.fill();
    }
}

// ===== GAME =====
class Game {
    constructor(){
        this.input=new Input();
        this.zone=new CentralShadowZone(canvas.width/2,canvas.height/2,100);
        this.bar=new Bar(400,50,100,40);
        this.human=new Human(200,320,"https://i.imgur.com/2Sg7kbM.png");
        this.butler=new Butler(700,320,"https://i.imgur.com/3vA0rO6.png",this.bar);
        this.shadowButler=new ShadowButler(this.butler);
        this.player=new ShadowPlayer(canvas.width/2,canvas.height/2);
        this.gameOver=false;
    }

    update(){
        if(this.gameOver || shopOpen) return;

        this.butler.update(this.human,this.player,this);
        this.player.update(this.input,this.zone,this.shadowButler,this.butler,this);
    }

    draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);

        this.bar.draw(ctx);
        this.zone.draw(ctx);
        this.human.draw(ctx);
        this.butler.draw(ctx);
        this.shadowButler.draw(ctx);
        this.player.draw(ctx);

        // ENERGY
        ctx.fillStyle="black";
        ctx.fillRect(20,20,this.player.energy*2,10);
        ctx.strokeRect(20,20,200,10);

        ctx.font="18px Arial";

        ctx.fillStyle="black";
        ctx.fillText(`Quest: ${quests.progress}/5`,20,60);

        ctx.fillStyle="#b8860b";
        ctx.fillText(`Bani: ${coins}`,canvas.width-150,40);

        if(shopOpen){
            ctx.fillStyle="rgba(0,0,0,0.9)";
            ctx.fillRect(0,0,canvas.width,canvas.height);

            ctx.fillStyle="white";
            ctx.font="28px Arial";
            ctx.fillText("SHOP",canvas.width/2-50,80);

            ctx.font="18px Arial";
            ctx.fillText("Energy +20 (10)",100,150);
            ctx.fillText("Speed +1 (10)",100,200);
            ctx.fillText("Range +10 (10)",100,250);
        }

        if(this.gameOver){
            ctx.fillStyle="black";
            ctx.font="40px Arial";
            ctx.fillText("GAME OVER",350,250);
        }
    }
}

// ===== SHOP CLICK =====
canvas.addEventListener("click", e => {
    if(!shopOpen) return;

    const y=e.offsetY;

    if(y>130 && y<170 && coins>=10){ coins-=10; upgrades.energy++; }
    if(y>180 && y<220 && coins>=10){ coins-=10; upgrades.speed++; }
    if(y>230 && y<270 && coins>=10){ coins-=10; upgrades.range++; }
});

// ===== BUTTONS =====
shopBtn.onclick = () => shopOpen=!shopOpen;

let game=new Game();

playBtn.onclick=()=>{
    inMenu=false;
    menu.style.display="none";
    menuBtn.style.display="block";
    game=new Game();
};

menuBtn.onclick=()=>{
    inMenu=true;
    menu.style.display="flex";
};

restartBtn.onclick=()=>{
    game=new Game();
    restartBtn.style.display="none";
};

// ===== LOOP =====
function loop(){
    if(!inMenu){
        game.update();
        game.draw();
    } else {
        ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    requestAnimationFrame(loop);
}
loop();