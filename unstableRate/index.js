let socket = new ReconnectingWebSocket("ws://127.0.0.1:24050/websocket/v2");

let unstable = document.getElementById("URmain");
let unstablePart = document.getElementById("unstableBar");
let unstableTxt = document.getElementById("unstableTxt");
let middle = document.getElementById("unstableMiddle");
let avg = document.getElementById("unstableAverage");
let earlyLate = document.getElementById("earlyLate")

socket.onopen = () => {
    console.log("Successfully Connected");
};

socket.onclose = event => {
    console.log("Socket Closed Connection: ", event);
    socket.send("Client Closed!");
};

socket.onerror = error => {
    console.log("Socket Error: ", error);
};

let unstableArray = [];
let unstableTemp = [];
const barLength = 399;
let gameState;
let curOd = {
    hitwindow_300: 1,
    hitwindow_100: 1,
    hitwindow_50: 1,
}
let tempBmLink;
let tempTime;
let unstableAvNum = (barLength / 2) - 1;
let early = [];
let late = [];
let testArr = [-19.5, -59.5, -99.5, 99.5, 59.5, 19.5] //OD10 max widths
// [-20.5, -60.5, -100.5, 100.5, 60.5, 20.5] //OD10 just out of bounds

socket.onmessage = async event => {
    let data = JSON.parse(event.data);
    if (tempBmLink != data.beatmap.id) {
        tempBmLink = data.beatmap.id
        curOd = ODtoms(data.beatmap.stats.od.converted);
    }
    if (gameState !== data.state.number) {
        gameState = data.state.number;
        if (gameState === 2) {
            unstable.style.transform = "translateY(0px)";
            unstableTxt.style.transform = "translateY(0px)";
            earlyLate.style.transform = "translateY(0px)";
        } else {
            unstable.style.transform = "translateY(70px)";
            unstableTxt.style.transform = "translateY(70px)";
            earlyLate.style.transform = "translateY(-25px)";
        }
    }
    unstableTxt.innerHTML = Math.round(data.play.unstableRate * 1000) / 1000
    let i = 0;
    if (unstableArray.length != data.play.hitErrorArray.length) {
        unstableArray = data.play.hitErrorArray;
        let perc = curOd.hitwindow_50 / 199.5 //percentage of maxwidth
        let curHit =
            // testArr[Math.floor(Math.random() * 6)]; //TESTED FOR OD10
            data.play.hitErrorArray[unstableArray.length - 1]
        // let pos = (barLength / 2) - 1 + (curHit / perc)
        let pos = toPos(curHit, perc)
        let tempHitType = 'orange'
        let hit = document.createElement("div")
        if (Math.abs(curHit) > curOd.hitwindow_100) {
            hit.style.backgroundColor = "#daae4680";
        }
        else if (Math.abs(curHit) > curOd.hitwindow_300) {
            tempHitType = 'green '
            hit.style.backgroundColor = "#57e31380";
        } else {
            tempHitType = 'blue  '
            hit.style.backgroundColor = "#32bce980";
        }
        // console.log(tempHitType + '|' + curHit + '@' + pos)
        hit.style.left = pos + 'px';
        unstableTemp.push(pos);
        hit.id = `hit${data.play.hitErrorArray.length - 1}`
        hit.className = 'unstableHit'
        hit.style.opacity = 1;
        unstablePart.appendChild(hit);
        setTimeout(() => {
            setInterval(() => {
                if (hit.style.opacity > 0) {
                    hit.style.opacity -= 0.01
                }
            }, 100)
            // tempTotal = unstableTemp.reduce((a, b) => a + b, 0);
            // tempAvg = tempTotal / unstableTemp.length;
        }, 2000)
        unstableAvNum = getURavg(unstableAvNum, unstableArray);
        avg.style.transform = `translateX(${toPos(unstableAvNum, perc) - 4}px)`
        setTimeout(() => {
            document.getElementById("unstableBar").removeChild(hit)
            unstableTemp.shift();
            // avg.style.transform = `translateX(${toPos(getURavg(unstableArray), perc) - 4}px)`
        }, 15000)
        if (tempTime > data.beatmap.time.live) {
            tempTime = data.beatmap.time.live
            unstableTemp = [];
            unstableArray = [];
            unstablePart.innerHTML = '';
            unstableAvNum = (barLength / 2) - 1;
            avg.style.transform = `translateX(${toPos((barLength / 2) - 1, perc) - 4}px)`
        }
        if (tempTime != data.beatmap.time.live) {
            tempTime = data.beatmap.time.live
        }
        early = unstableArray.filter(x => x < 0)
        late = unstableArray.filter(x => x > 0)
        earlyLate.innerHTML = smooth(getAvg(early), 2) + 'ms --- ' + smooth(getAvg(late), 2) + 'ms'
    }

}

function ODtoms(od) {
    var rangeobj = {
        hitwindow_300: 79 - (od * 6) + 0.5,
        hitwindow_100: 139 - (od * 8) + 0.5,
        hitwindow_50: 199 - (od * 10) + 0.5,
    };
    return rangeobj;
}

/**
 * 
 * @param {number} cur 
 * @param {number[]} arr 
 */
function getURavg(cur, arr) {
    for (let i = 0; i < arr.length; i++) {
        cur = cur * 0.9 + arr[i] * 0.1
    }
    return cur;
}

/**
 * 
 * @param {number} curHit - position of current hit in ms
 * @param {number} perc - current OD hit50 window / OD0 hit50 window (as decimal)
 */
function toPos(curHit, perc) {
    return (barLength / 2) - 1 + (curHit / perc)
}

/**
 * @param {number[]} arr 
 */
function getAvg(arr) {
    const num = (arr.reduce((a, b) => a + b, 0)) / arr.length;
    return num;
}

function smooth(num, dp){
    return Math.round(num * (10**dp)) / (10**dp)
}