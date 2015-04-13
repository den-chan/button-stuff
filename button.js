var
  Data = { //TODO: timestamping
    raw: new Array,
    tots: Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0),
    last: null,
    rbtn: {
      usersonline: 0,
      flairnopress: 0,
      flairpress6: 0,
      flairpress5: 0,
      flairpress4: 0,
      flairpress3: 0,
      flairpress2: 0,
      flairpress1: 0,
      flaircantpress: 0,
      noflair: 0
    },
    araw: new Array
  },
  Interval = {
    val: 10000,
    id: null,
    adj: false,
    test: null
    , debug: 0 //active user count debug
  },
  init = function () {
    var
      prev = {},
      pel = document.getElementById("pressers"),
      ael = document.getElementById("active"),
      
      //Ajax call to r/thebutton
      buttonjax = function (callback) {
        var raw = new XMLHttpRequest();
        raw.onreadystatechange = function () {
          if (raw.readyState !== 4) return;
          if (raw.status === 200) callback(raw.responseText)
        }
        //Credit to github.com/lezed1 for the proxy. Thanks bro!
        raw.open("get", "https://cors-unblocker.herokuapp.com/get?url=https%3A%2F%2Freddit.com%2Fr%2Fthebutton", true);
        raw.timeout = 5000;
        raw.send()
      },
      
      //Tries to minimise polling r/thebutton for active user numbers
      triggerinterval = function (val) {
        !Interval.id || window.clearInterval(Interval.id);
        Interval.adj = !!val;
        Interval.id = window.setInterval(function () {
          buttonjax(active);
          console.log("Interval = " + Interval.val + ", val = " + val + ", usersonline = " + Data.rbtn.usersonline + ", time = " + new Date(Date.now()).toLocaleTimeString() + ", debug = " + ++Interval.debug) //active user count debug
          if (Interval.adj) {
            Interval.adj = false;
            triggerinterval()
          }
        }, val||Interval.val);
      },
      intmonitor = function () {
        var l = Data.araw.length;
        if (Interval.val==10000) {
          if (l > 1 && !arawcomp(Data.araw[l-1], Data.araw[l-2])) {
            Interval.val = 64500; //Active users refresh rate (??);
            triggerinterval(90000)
          }
        } else {
          if (!!Interval.test) {
            if (Interval.test == "init") {
              triggerinterval(54000);
              Interval.test = new Array;
              return
            }
            Interval.test.push(Data.araw[l - 1])
            if (Interval.test.length == 3) {
              if (!arawcomp(Interval.test[0], Interval.test[1])) { triggerinterval(90000) }
              else if (!arawcomp(Interval.test[1], Interval.test[2])) { triggerinterval(80000) }
              else { triggerinterval(54000) };
              Interval.test = null
            } else { triggerinterval(10000) }
          }
        }
      },
      arawcomp = function (a1, a2) {
        for (var i = 0; i < 9; i++) {
          if (a1[i] != a2[i]) break
        }
        return i == 9
      },
      
      //Update pressers data
      tick = function (e) {
        var pct = JSON.parse(e.data);
        if (pct.type != "ticking") return;
        var 
          curr = {
            dt: new Date(Date.UTC.apply(null, pct.payload.now_str.split("-").map(Number))),
            np: parseInt(pct.payload.participants_text.replace(/[^0-9]/,'')),
            ts: pct.payload.seconds_left
          },
          el = document.createElement("div"),
          ts, dp;
        el.innerText = curr.ts;
        if (Object.keys(prev).length > 0) {
          if (curr.np == prev.np) {
            pel.replaceChild(el, pel.lastChild)
          } else {
            ts = parseInt(pel.lastChild.innerText), dp = curr.np - prev.np;
            if (pel.childElementCount > 0) Data.raw.push([ts, dp]);
            Data.tots[ts] += dp;
            pel.lastChild.innerText += " " + dp;
            pel.appendChild(el);
          }
        } else {
          pel.appendChild(el)
        }
        prev = curr;
        Data.last = curr.ts
      },
      
      //Update active users data
      active = function (resp) {
        Data.rbtn = {
          usersonline: parseInt((/(?:users-online.{94})([0-9,]+)/.exec(resp)||[,0])[1].replace(/[^0-9]/,'')),
          flairnopress: parseInt((/(?:flair-no-press.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flairpress6: parseInt((/(?:flair-press-6.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flairpress5: parseInt((/(?:flair-press-5.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flairpress4: parseInt((/(?:flair-press-4.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flairpress3: parseInt((/(?:flair-press-3.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flairpress2: parseInt((/(?:flair-press-2.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flairpress1: parseInt((/(?:flair-press-1.{11})([0-9,]+)/.exec(resp)||[,0])[1]),
          flaircantpress: parseInt((/(?:flair-cant-press.{11})([0-9,]+)/.exec(resp)||[,0])[1])
        };
        Data.rbtn.noflair = Object.keys(Data.rbtn).reduce(function (agg, key) {
          if (key == "usersonline" || key == "noflair") {return agg}
          else {return agg - Data.rbtn[key]}
        }, Data.rbtn.usersonline);
        Object.keys(Data.rbtn).forEach(function (key) {
          document.getElementById(key).innerText = Data.rbtn[key]
        })
        var rbtnnew = [
          Data.rbtn.usersonline,
          Data.rbtn.flairnopress,
          Data.rbtn.flairpress6,
          Data.rbtn.flairpress5,
          Data.rbtn.flairpress4,
          Data.rbtn.flairpress3,
          Data.rbtn.flairpress2,
          Data.rbtn.flairpress1,
          Data.rbtn.flaircantpress,
          Data.rbtn.noflair
        ];
        switch (Data.araw.length != 0) {
          case true: if (arawcomp(rbtnnew, Data.araw[Data.araw.length - 1])) break
          default: Data.araw.push(rbtnnew)
        }
        intmonitor()
      };
    
    //Establish websocket connection to the button
    buttonjax(function (resp) {
      var wsurl, ws
      wsurl = /wss:\/\/wss[^"]+/.exec(resp)[0];
      ws = new WebSocket(wsurl||"wss://wss.redditmedia.com/thebutton?h=f29c65c5190049201b3dd46254aa01c89c5adefc&e=1428897437");
      ws.onmessage = tick;
    });
    
    triggerinterval();
    setInterval(function () {Interval.test = "init"}, 600000) //Check to correct phase of active user polling
  }