let socket = new ReconnectingWebSocket("ws://127.0.0.1:24050/websocket/v2");
// graph elements
let graphElem = document.getElementById("graph");
let graphMain = document.getElementById("graphMain");
let graphOver = document.getElementById("graphOver");
let graphProgress = document.getElementById("progress");

//hit line (below graph)
let hitTimer = document.getElementById("hitTimerMain")
let hit100 = document.getElementById("hit100Timer")
let hit50 = document.getElementById("hit50Timer")
let hit0 = document.getElementById("hit0Timer")
let hitSb = document.getElementById("hitSbTimer")

window.onload = function () {
    var ctx = graphElem.getContext('2d');
    window.myLine = new Chart(ctx, config);
    var ctxSecond = graphOver.getContext('2d');
    window.myLineSecond = new Chart(ctxSecond, configSecond);
};

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
let tempBmLink;
let gameState;
let time;
let fullTime;
let decimalTime; // time as a decimal ie 0.2
let graphData;
let tempHitData = {
    '300': 0,
    '100': 0,
    '50': 0,
    '0': 0,
    'sb': 0,
}
socket.onmessage = async event => {
    let data = JSON.parse(event.data);
    if (gameState !== data.state.number) {
        gameState = data.state.number;
        if (gameState === 2) {
            graphMain.style.transform = "translateY(0px)";
            hitTimer.style.transform = "translateY(0px)";
        } else {
            graphMain.style.transform = "translateY(45px)";
            hitTimer.style.transform = "translateY(100px)";
        }
    }
    if (tempBmLink != data.beatmap.id) {
        tempBmLink = data.beatmap.id
        graphData = generateGraphData(data.performance.graph.series, false)
        config.data.datasets[0].data = graphData;
        config.data.labels = graphData;
        configSecond.data.datasets[0].data = graphData;
        configSecond.data.labels = graphData;
        window.myLine.update();
        window.myLineSecond.update();
    }
    if (fullTime != data.beatmap.time.lastObject - data.beatmap.time.firstObject) {
        fullTime = data.beatmap.time.lastObject - data.beatmap.time.firstObject
    }
    if (time != data.beatmap.time.live - data.beatmap.time.firstObject) {
        time = data.beatmap.time.live - data.beatmap.time.firstObject;
        decimalTime = time / fullTime;
        let tWidth = 500 * decimalTime;
        if (decimalTime >= 1) {
            tWidth = 500
        }
        graphProgress.style.width = tWidth + 'px'
    }
    // hit progress bar
    if (gameState == 2 || gameState == 7) {
        let point = (decimalTime * 500) - 1 + 'px';
        let hitList = data.play.hits
        if (tempHitData[100] < hitList[100]) {
            tempHitData[100] = hitList[100]
            const tempHit = document.createElement('div')
            tempHit.classList = 'hit100Object hitObject'
            tempHit.style.left = point;
            hit100.appendChild(tempHit)
        }
        if (tempHitData[50] < hitList[50]) {
            tempHitData[50] = hitList[50]
            const tempHit = document.createElement('div')
            tempHit.classList = 'hit50Object hitObject'
            tempHit.style.left = point;
            hit50.appendChild(tempHit)
        }
        if (tempHitData[0] < hitList[0]) {
            tempHitData[0] = hitList[0]
            const tempHit = document.createElement('div')
            tempHit.classList = 'hit0Object hitObject'
            tempHit.style.left = point;
            hit0.appendChild(tempHit)
        }
        if (tempHitData.sb < hitList.sliderBreaks) {
            tempHitData.sb = hitList.sliderBreaks
            const tempHit = document.createElement('div')
            tempHit.classList = 'hitSbObject hitObject'
            tempHit.style.left = point;
            hitSb.appendChild(tempHit)
        }
        if (hitList[100] == 0 && hitList[50] == 0 && hitList[0] == 0 && hitList.sliderBreaks == 0) {
            clearHitTimer();
        }
    } else {
        clearHitTimer();
    }
}

/**
 * 
 * @param {object} data 
 * @param {?boolean} fc 
 */
async function calcPP(data, fc) {
    let gamedata = data.resultsScreen
    let url = `../../api/calculate/pp?mode=${gamedata.mode.number}`
    let hitsData = gamedata.hits
    const addons =
        [
            `nGeki=${hitsData['geki']}`,
            `nKatu=${hitsData['katu']}`,
            `n300=${fc ? hitsData['300'] + hitsData['0'] : hitsData['300']}`,
            `n100=${hitsData['100']}`,
            `n50=${hitsData['50']}`,
            `nMisses=${fc ? 0 : hitsData['0']}`,
            `combo=${gamedata.maxCombo}`,
            `mods=${gamedata.mods.number}`,
        ]
    url += addons.map(x => '&' + x).join('')
    const outdata = await fetch(url).then(res => res.json());
    return outdata;
}

/**
 * 
 * @param {number} number 
 */
function twoRound(number) {
    txt = Math.round(number * 100) / 100
    return txt;
}


function keepThree(number) {
    let len = `${number}`.length;
    txt = number + '';
    if (len == 1) {
        txt += '.0'
    } else if (len > 3) {
        txt = number.toFixed(1)
    }
    return txt;
}

/**
 * 
 * @param {{name:string, data:number[]}[]} graphData 
 * @param {?boolean} isRelax disable aim components of graph
 */
function generateGraphData(graphData, isRelax) {
    // generate data
    let allAdded = [];
    allAdded.shift();
    for (const section of graphData) {
        if (!(isRelax && section.name.toLowerCase().includes('aim'))) {
            for (let i = 0; i < section.data.length; i++) {
                if (!allAdded[i]) {
                    allAdded.push(section.data[i])
                } else {
                    allAdded[i] += section.data[i];
                }
            }
        }
    }
    allAdded = allAdded.filter(x => x >= 0);
    return allAdded;
}

let config = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            borderColor: 'rgba(255, 255, 255, 0)',
            backgroundColor: 'rgba(120, 120, 120, 0.5)',
            data: [],
            fill: true,
        }]
    },
    options: {
        tooltips: { enabled: false },
        legend: {
            display: false,
        },
        elements: {
            line: {
                tension: 0.4,
                cubicInterpolationMode: 'monotone'
            },
            point: {
                radius: 0
            }
        },
        responsive: false,
        scales: {
            x: {
                display: false,
            },
            y: {
                display: false,
            }
        }
    }
};

let configSecond = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            borderColor: 'rgba(255, 255, 255, 0)',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            data: [],
            fill: true,
        }]
    },
    options: {
        tooltips: { enabled: false },
        legend: {
            display: false,
        },
        elements: {
            line: {
                tension: 0.4,
                cubicInterpolationMode: 'monotone'
            },
            point: {
                radius: 0
            }
        },
        responsive: false,
        scales: {
            x: {
                display: false,
            },
            y: {
                display: false,
            }
        }
    }
};

function clearHitTimer() {
    hit100.innerHTML = ''
    hit50.innerHTML = ''
    hit0.innerHTML = ''
    hitSb.innerHTML = ''
    for (const hit in tempHitData) {
        tempHitData[hit] = 0
    }
}