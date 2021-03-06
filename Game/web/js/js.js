var canvas;
var ctx;
var level=1;
var element ={ i:0};
var playerName;
var lvl={
    radius:[0,800],
    radius2:[0,15],
    speedDrop:[0,8],
    speedPlayer:[13,15],
    speedEnemy:[10,12],
    map:["lvl2.json","lvl1.json"]
};
var mapManager = {
    mapData: null,
    tLayer: null,
    xCount: 500, //20
    yCount: 30, //6
    imgLoadCount: 0, // количество загруженных изображений
    imgLoaded: false, // изображения не загружены
    jsonLoaded: false, // json не загружен
    tSize: {x: 32, y: 32},
    mapSize: {x: 500, y: 20},
    tilesets:[],
    view: {x: 0, y: 0, w: 1000, h: 600},
    
    // ajax-загрузка карты
    loadMap: function (path) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                mapManager.parseMap(request.responseText);
            }
        };
        request.open("GET", path, true);
        request.send();
    },
    
    parseMap: function (tilesJSON) {
        this.mapData = JSON.parse(tilesJSON); //разобрать JSON
        this.xCount = this.mapData.width; // соэранение ширины
        this.yCount = this.mapData.height; // сохранение высоты
        this.tSize.x = this.mapData.tilewidth; // сохранение размера блока
        this.tSize.y = this.mapData.tileheight; // сохранение размера блока
        this.mapSize.x = this.xCount * this.tSize.x; // вычисление размера карты
        this.mapSize.y = this.yCount * this.tSize.y;
        for (var i = 0; i < this.mapData.tilesets.length; i++) {
            var img = new Image(); // создаем переменную для хранения изображений
            img.onload = function () { // при загрузке изображения
                mapManager.imgLoadCount++;
                if (mapManager.imgLoadCount === mapManager.mapData.tilesets.length) {
                    mapManager.imgLoaded = true; // загружены все изображения
                }
            };
            img.src = this.mapData.tilesets[i].image; // задание пути к изображению
            var t = this.mapData.tilesets[i]; //забираем tileset из карты
            var ts = { // создаем свой объект tileset
                firstgid: t.firstgid, // с него начинается нумерация в data
                image: img,
                name: t.name, // имя элемента рисунка
                xCount: Math.floor(t.imagewidth / mapManager.tSize.x), // горизонталь
                yCount: Math.floor(t.imageheight / mapManager.tSize.y) // вертикаль
            }; // конец объявления ts
            this.tilesets.push(ts); // сохраняем tileset в массив
        } // окончание цикла for
        this.jsonLoaded = true; // когда разобран весь json
    },
    
    draw: function (ctx) { // отрисовка карты в контексте
        // если карта не загружена, то повторить прорисовку через 100 мс
        if (!mapManager.imgLoaded || !mapManager.jsonLoaded) {
            setTimeout(function () {
                mapManager.draw(ctx);
            }, 80);
        } else {
            if (this.tLayer === null) {// проверка, что tLayer настроен
                for (var id = 0; id < this.mapData.layers.length; id++) {
                    // проходим по всем layer карты
                    var layer = this.mapData.layers[id];
                    if (layer.type === "tilelayer") {
                        this.tLayer = layer;
                        //break;  //!!!!
                    }
                }
            }
            for (var i = 0; i < this.tLayer.data.length; i++) { // проходим по всей карте  !!!
                if (this.tLayer.data[i] !== 0) { // если данных нет, то пропускаем
                    var tile = this.getTile(this.tLayer.data[i]); // получение блока по индексу
                    var pX = (i % this.xCount) * this.tSize.x; // вычисляем x в пикселях
                    var pY = Math.floor(i / this.xCount) * this.tSize.y;
                    // не рисуем за пределами видимой зоны
                    if (!this.isVisible(pX, pY, this.tSize.x, this.tSize.y))
                        continue;
                    // сдвигаем видимую зону
                    pX -= this.view.x;
                    pY -= this.view.y;
                    ctx.drawImage(tile.img, tile.px, tile.py, this.tSize.x, this.tSize.y, pX, pY, this.tSize.x, this.tSize.y); //
                    //отрисовка в контексте
                }
            }
        }
    },
    getTile: function (tileIndex) { // индекс блока
        var tile = {
            img: null, // изображение tileset
            px: 0, py: 0 // координаты блока в tileset
        };
        var tileset = this.getTileset(tileIndex);
        tile.img = tileset.image; // изображение искомого tileset
        var id = tileIndex - tileset.firstgid; // индекс блока в tileset
        // блок прямоугольный, остаток от деления на xCount дает х в tileset
        var x = id % tileset.xCount;
        var y = Math.floor(id / tileset.xCount);
        tile.px = x * mapManager.tSize.x;
        tile.py = y * mapManager.tSize.y;
        return tile; // возвращаем тайл для отображения
    },

    getTileset: function (tileIndex) { // получение блока по индексу
        for (var i = mapManager.tilesets.length - 1; i >= 0; i--) {
            // в каждом tilesets[i].firstgid записано число, с которого начинается нумерация блоков
            if (mapManager.tilesets[i].firstgid <= tileIndex) {
                // если индекс первого блока меньше , либо равен искомому, значит этот tileset и нужен
                return mapManager.tilesets[i];
            }
        }
        return null;
    },
    // не рисуем за пределами видимой зоны
    isVisible: function (x, y, width, height) {
       if(x+width < this.view.x || x>this.view.x + this.view.w){
            return false;          
       }
       return true;
    },
    
    parseEntities: function () { // разбор слоя типа objectgroup
        if (!mapManager.imgLoaded || !mapManager.jsonLoaded) {
            setTimeout(function () {
                mapManager.parseEntities();
            }, 80);
        } else
            for (var j = 0; j < this.mapData.layers.length; j++) // просмотр всех слоев
                if (this.mapData.layers[j].type === 'objectgroup') {
                    var entities = this.mapData.layers[j]; // слой с объектами следует разобрать
                    for (var i = 0; i < entities.objects.length; i++) {
                        var e = entities.objects[i];
                        try {
                            var obj = Object.create(gameManager.factory[e.type]);
                            obj.name = e.name;
                            obj.pos_x = e.x;
                            obj.pos_y = e.y;
                            obj.size_x = e.width;
                            obj.size_y = e.height;              
                            gameManager.entities.push(obj);
                            if (obj.name === 'Player') {
                                gameManager.initPlayer(obj);
                            }
                        } catch (ex) {
                            console.log("Error while creating: [" + e.gid + "]" + e.type + " " + ex);
                        }
                    }
                }
    },
    
    getTilesetIdx: function (x, y) {
        // получить блок по координатам на карте
        var wX = x;
        var wY = y;
        var idx = Math.floor(wY / this.tSize.y) * this.xCount + Math.floor(wX / this.tSize.x);
        return this.tLayer.data[idx];
    },
    
    centerAt: function (x, y) {
        this.view.x=x-32;
    }
};

var spriteManager = {
    image: new Image(),
    sprites: new Array(),
    imgLoaded: false,
    jsonLoaded: false,
    
    loadAtlas: function (atlasJson, atlasImg) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                spriteManager.parseAtlas(request.responseText);
            }
        };
        request.open("GET", atlasJson, true);
        request.send();
        this.loadImg(atlasImg);
    },

    loadImg: function (imgName) { // загрузка изображения
        this.image.onload = function () {
            spriteManager.imgLoaded = true;
        };
        this.image.src = imgName;
    },

    parseAtlas: function (atlasJSON) { // разбор атласа с обеъектами
        var atlas = JSON.parse(atlasJSON);
        for (var name in atlas.frames) { // проход по всем именам в frames
            var frame = atlas.frames[name].frame; // получение спрайта и сохранение в frame
            this.sprites.push({name: name, x:frame.x, y: frame.y, w: frame.w, h: frame.h}); // сохранение характеристик frame в виде объекта
        }
        this.jsonLoaded = true; // атлас разобран
    },

    drawSprite: function (ctx, name,  x, y) {
        // если изображение не загружено, то повторить запрос через 100 мс
        if (!this.imgLoaded || !this.jsonLoaded) {
            setTimeout(function () {
                spriteManager.drawSprite(ctx, name, x, y);
            }, 80);
        } else {
            var sprite = this.getSprite(name); // получить спрайт по имени
            if (!mapManager.isVisible(x, y, sprite.w, sprite.h))
                return; // не рисуем за пределами видимой зоны
            x -= mapManager.view.x;
            y -= mapManager.view.y;
            // отображаем спрайт на холсте
            ctx.drawImage(this.image, sprite.x, sprite.y, sprite.w, sprite.h, x, y, sprite.w, sprite.h);
            // }

        }
    },

    getSprite: function (name) { // получить спрайт по имени
        for (var i = 0; i < this.sprites.length; i++) {
            var s = this.sprites[i];
            if (s.name === name)
                return s;
        }
        return null; // не нашли спрайт
    }

};

var eventsManager = {
    bind: [], // сопоставление клавиш действиям
    action: [], // действия
    
    setup: function () { // настройка сопоставления
        this.bind[87] = 'up'; // a - двигаться вверх
        this.bind[83] = 'down'; // d - двигаться вниз
        document.body.addEventListener("keydown", this.onKeyDown);
        document.body.addEventListener("keyup", this.onKeyUp);
    },
    
    onKeyDown: function (event) {
        var action = eventsManager.bind[event.keyCode];
        if (action) {// проверка на action === true
                eventsManager.action[action] = true; // выполняем действие
        }
    },
    
    onKeyUp: function (event) {
        var action = eventsManager.bind[event.keyCode];
        if (action)
            eventsManager.action[action] = false; // отменили действие
    }
};

var physicManager = {
    update: function (obj) {
        if (obj.move_x === 0 && obj.move_y === 0)
            return "stop"; // скорости движения нулевые
        var newX = obj.pos_x + Math.floor(obj.move_x * obj.speed);
        var newY = obj.pos_y + Math.floor(obj.move_y * obj.speed);

        var e = this.entityAtXY(obj, newX, newY); // объект на пути
        if (e !== null && obj.onTouchEntity) // если есть конфликт
            obj.onTouchEntity(e); // разбор конфликта внутри объекта
        //Если есть препятствие 
        
        if (e === null) { // перемещаем объект на свободное место
            obj.pos_x = newX;
            obj.pos_y = newY;
        } else
            return "break"; // дальше двигаться нельзя
        if(obj.name.match(/enemy[\d]/)){
            this.fire(obj, newX, newY);
        }
        
        switch (obj.move_y) {
            case -1: // двигаемся влево
                return "up";
                break;
            case 1: // двигаемся вправо
                return "down";
                break;
        }
    },
    
    entityAtXY: function (obj, x, y) { // поиск объекта по координатам
        for (var i = 0; i < gameManager.entities.length; i++) {
            var e = gameManager.entities[i]; // рассматриваем все объекты на карте
            if (e.name !== obj.name) { // имя не совпадает
                if (x + obj.size_x < e.pos_x || // не пересекаются
                    y + obj.size_y < e.pos_y ||
                    x > e.pos_x + e.size_x ||
                    y > e.pos_y + e.size_y)
                    continue;
                return e; // найден объект
            }
        }
        return null; // объект не найден
    },
    
    fire:function (obj,x,y) { // поиск объекта по координатам
        for (var i = 0; i < gameManager.entities.length; i++) {
            var e = gameManager.entities[i]; // рассматриваем все объекты на карте
            if (e.name === "Player") { // имя не совпадает
                if (Math.abs(e.pos_y-y)>lvl.radius2[level] || Math.abs(e.pos_x-x)>lvl.radius[level])
                    continue; 
                
                obj.spat();
                return null;
            }
        }
        return null; // объект не найден
    }
};

var soundManager = {
    clips: {}, // звуковые эффекты
    context: null, // аудиоконтекст
    gainNode: null, // главный узел
    loaded: false, // все звуки загружены
    
    // инициализация
    init: function () {
        this.context = new AudioContext();
        this.gainNode = this.context.createGain ? this.context.createGain() : this.context.createGainNode();
        this.gainNode.connect(this.context.destination);
    },
    
    load: function (path, callback) { // загрузка одного аудиовъфайла
        if (this.clips[path]) {
            callback(this.clips[path]);
            return;
        }
        var clip = {path: path, buffer: null, loaded: false};
        clip.play = function (volume, loop) {
            soundManager.play(this.path,{looping: loop?loop:false, volume: volume ? volume:1});

        };
        this.clips[path] = clip;
        var request = new XMLHttpRequest();
        request.open("GET", path, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            soundManager.context.decodeAudioData(request.response, function (buffer) {
                clip.buffer = buffer;
                clip.loaded = true;
                callback(clip);
            });
        };
        request.send();
    },
    
    loadArray: function (array) {
// загрузка массива звуков
        for (var i = 0; i < array.length; i++) {
            soundManager.load(array[i], function () {
                if (array.length === Object.keys(soundManager.clips).length) {
                    for (var sd in soundManager.clips)
                        if (!soundManager.clips[sd].loaded) return;
                    soundManager.loaded = true;
                }
            });
        }
    },
    
    play: function (path, settings) {
        if (!soundManager.loaded) {
            setTimeout(function () {
                soundManager.play(path,settings);
            }, 1000);
            return;
        }
        var looping = false;
        var volume = 1;
        if (settings) {
            if (settings.looping)
                looping = settings.looping;
            if (settings.volume)
                volume = settings.volume;
        }
        var sd = this.clips[path];
        if (sd === null) return false;
// создаем нвоый экземпляр проигрывателя BufferSOurce
        var sound = soundManager.context.createBufferSource();
        sound.buffer = sd.buffer;
        sound.connect(soundManager.gainNode);
        sound.loop = looping;
        soundManager.gainNode.gain.value = volume;
        sound.start(0);
        return true;
    },
    
    stopAll: function () {
        this.gainNode.disconnect();
    }
};

var Entity = {
    pos_x: 0, pos_y: 0, // позиция объекта
    size_x: 0, size_y: 0, // размеры объекта
    extend: function (extendProto) { // расширение сущности
        var object = Object.create(this); // создание нового объекта
        for (var property in extendProto) { // для всех свойств нового объекта
            if (this.hasOwnProperty(property) || typeof object[property] === 'undefined') {
                // если свойства отсутствуют в родительском объекте, то добавляем
                object[property] = extendProto[property];
            }
        }
        return object;
    }
};

var Player = Entity.extend({
    move_x:0,
    move_y: 0,
    dirSprite: "players",
    speed: lvl.speedPlayer[level],
    draw: function (ctx) {// прорисовка объекта
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    
    update: function () {
        physicManager.update(this);
    },
    
    onTouchEntity: function (obj) {
        console.log(obj.name);
        if (obj.name.match(/star[\d]/)) {
            obj.kill();
            this.pos_x+=this.speed;
            gameManager.score++;
            document.getElementById("score").innerHTML = "Результат: " + gameManager.score;
        }
        if (obj.name.match(/finish/)) {
            soundManager.play('music/winner.mp3', {looping: false, volume: 2});
            this.speed=0;
            this.kill();
            setTimeout( function (){ 
                history('record',gameManager.score);
                soundManager.stopAll();
                window.location='?';
            },2000); 
        }
        if (obj.name.match(/death[\d]/)||obj.name.match(/enemy[\d]/)||obj.name.match(/spiderweb[\d]/)) {  
            soundManager.play('music/break.mp3', {looping: false, volume: 2});
            this.speed=0;
            this.kill();
            setTimeout( function (){
                history('record',gameManager.score);
                soundManager.stopAll();   
                show();
                window.location='?';
                
                },2000);
            
        }
    },
    
    //Исправить на те firstgid, что будут в конечной мапе
    kill: function () {
        gameManager.kill(this);
    }
});
var Star = Entity.extend({
    massSprite:["star1","star1","star2","star2","star3","star3","star4","star4"],
    dirSprite: null,
    
    draw: function (ctx) {// прорисовка объекта
        this.dirSprite=this.massSprite[element.i%8];
        element.i++;
        if(element.i>1000)element.i=0;
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    
    update: function () {
    },
    
    kill: function () {
        gameManager.kill(this);
    }
});

var Death = Entity.extend({
    
    update: function () {
    },
    
    draw: function (ctx) {// прорисовка объекта
    }
});
var Finish = Entity.extend({
    
    update: function () {
    },
    
    draw: function (ctx) {// прорисовка объекта
    }
});
var Spiderweb= Entity.extend({
    move_x:-1,
    move_y: 0,
    dirSprite: "drop",
    speed: lvl.speedDrop[level],
    
    draw:function(){
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    
    update: function () {
        physicManager.update(this);
    },
    
    onTouchEntity:function(obj){
        
        if (obj.name.match(/death[\d]/)){
            this.kill();
        }
        if (obj.name.match(/star[\d]/)){
            obj.kill();
            this.kill();
        }
        if (obj.name.match(/spiderweb[\d]/)){
            this.kill();
        }
    },
    
    kill: function () {
        gameManager.kill(this);
    }
});
var Enemy = Entity.extend({
    move_y: -1,
    move_x: 0,
    dirSprite: null,
    speed: lvl.speedEnemy[level],
    
    spat: function(){
        var r=Object.create(Spiderweb);
        r.size_x=32;
        r.size_y=32;
        r.name="spiderweb"+(++gameManager.dropNum);
        r.type="spiderweb";
        r.move_x=-1;       
        r.pos_x=this.pos_x-r.size_y-10;
        r.pos_y=this.pos_y;
        gameManager.entities.push(r);
    },
    
    draw: function (ctx) {// прорисовка объекта
        this.dirSprite="enemy1",
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    
    onTouchEntity:function(obj){
        if(obj.name.match(/death[\d]/)){
            switch(this.move_y){
                case -1: 
                    this.move_y=1;
                    break;
                case 1: 
                    this.move_y=-1;
                    break;
            }
        }
    },
    
    update: function () {
        physicManager.update(this);
    },

    //Исправить на те firstgid, что будут в конечной мапе
    kill: function () {
        gameManager.kill(this);
    }}
);
var gameManager = { // менеджер игры
    factory: {}, // фабрика объектов на карте
    entities: [], // объекты на карте
    dropNum:0,
    player: null, // указатель на объект игрока
    score : 0,
    laterKill: [],
    
    initPlayer: function (obj) { // инициализация игрока
        this.player = obj;
    },
    
    update: function () { // обновление информации
        if (this.player === null)
            return;
        this.player.move_x = 1;
        this.player.move_y = 0;
        
        if (eventsManager.action["up"]) {
            this.player.move_y = -1;
        }
        if (eventsManager.action["down"]) {
            this.player.move_y = 1;
        }
        //обновление информации по всем объектам на карте
        this.entities.forEach(function (e) {
            try {
                e.update();
            } catch(ex) {}
        });
        for(var i = 0; i < this.laterKill.length; i++) {
            var idx = this.entities.indexOf(this.laterKill[i]);
            if(idx > -1)
                this.entities.splice(idx, 1); // удаление из массива 1 объекта
        }
        if (this.laterKill.length > 0) // очистка массива laterKill
            this.laterKill.length = 0;
        mapManager.draw(ctx);
        mapManager.centerAt(this.player.pos_x,this.player.pos_y);
        this.draw(ctx);
    },
    
    draw: function (ctx) {
        for (var e = 0; e < this.entities.length; e++) {
            this.entities[e].draw(ctx);
        }
    },
    
    loadAll: function () {
        soundManager.init();
        soundManager.loadArray(['music/fon.mp3','music/break.mp3','music/winner.mp3']);
        soundManager.play('music/fon.mp3', {looping: true, volume: 1});
        mapManager.loadMap(lvl.map[level]); // загрузка карты
        spriteManager.loadAtlas("sprites.json", "spritesheet.png"); // загрузка атласа
        gameManager.factory['Player'] = Player; // инициализация фабрики
        gameManager.factory['finish'] = Finish;
        gameManager.factory['death'] = Death;
        gameManager.factory['enemy'] = Enemy;
        gameManager.factory['star'] = Star;
        gameManager.factory['spiderweb'] = Spiderweb;
        mapManager.parseEntities(); // разбор сущностей карты
        mapManager.draw(ctx); // отобразить карту
        eventsManager.setup(); // настройка событий
    },
    
    play: function () {
        gameManager.loadAll();
        setInterval(updateWorld, 80);
    },
    
    kill: function (obj) {
        this.laterKill.push(obj);
    }
};

function updateWorld() {
    ctx.clearRect(0, 0, 1000, 600); 
    gameManager.update();
}

function start(){
    hide();
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");  
    gameManager.play();  
}
function setCookie (name, value) {
      document.cookie = name + "=" + value;
}
function getCookie ( cookie_name ){
  var results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );
  if ( results )
    return ( unescape ( results[2] ) );
  else
    return null;
}
function hide(){
    document.getElementById('start').style.display = 'none';
    document.getElementById('canvas').style.display = 'block';
    document.getElementById('form-control').style.display = 'none';
    document.getElementById('score').style.display = 'block';
}
function show(){
    document.getElementById('start').style.display = 'block';
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('form-control').style.display = 'block';
    document.getElementById('score').style.display = 'none';
    document.getElementById('rec').style.display = 'none';
}
function setName(name){
    playerName=name;
}

function history(name,numer){
    var t=getCookie ( name );
    t=JSON.parse(t);
    var k={"name":null,"value":0};
    k['value']=numer;
    k['name']=playerName;
    for( var i=0;i<4;i++){
        if(t[i]['value']<=numer){
        t.splice(i,0,k);
        break;
        }
    }
    t=t.splice(0,4);
    setCookie(name,JSON.stringify(t));
}
function records(name){
    
  document.getElementById('rec').style.display = 'block';
  document.getElementById('start').style.display = 'none';  
  var t=getCookie ( name );
  var elem = document.getElementById('rec');
  t=JSON.parse(t);
  elem.innerHTML = '<nav class="side-nav" id="record"><a  class="side-nav-button">'+t[0]['name']+' : '+t[0]['value']+' очков'+'</a><a  class="side-nav-button">'+t[1]['name']+' : '+t[1]['value']+' очков'+'</a><a  class="side-nav-button" >'+t[2]['name']+' : '+t[2]['value']+' очков'+'</a><a  class="side-nav-button">'+t[3]['name']+' : '+t[3]['value']+' очков'+'</a><a  class="side-nav-button" onclick="show()">Выход</a></nav>';
}
function setLevel(numer){
    level=numer;
}
//setCookie("record",'[{"name": "null","value": 0},{"name": "null","value": 0},{"name": "null","value": 0},{"name": "null","value": 0}]');