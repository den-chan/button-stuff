init = function () {
  var //TODO: Create project-level object
    utypes = [
      "users-online",
      "flair-no-press",
      "flair-press-6",
      "flair-press-5",
      "flair-press-4",
      "flair-press-3",
      "flair-press-2",
      "flair-press-1",
      "flair-cant-press",
      "no-flair"
    ],
    ucolors = [
      "#000",
      "#888",
      "#820080",
      "#0083c7",
      "#02be01",
      "#e5d900",
      "#e59500",
      "#e50000",
      "#e4e4e4",
      "#fff"
    ];
  Data = { //TODO: timestamping
    raw: new Array,
    tots: Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0),
    foll: Array.apply(null, Array(61)).map(function(){return Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0)}),
    last: null,
    rbtn: utypes.reduce(function(o, v) { o[v] = 0; return o }, {}),
    araw: new Array
  };
  var
    Interval = {
      val: 10000,
      id: null,
      adj: false,
      test: null,
      dt: [[],]
      , debug: 0 //active user count debug
    },
    View = {
      get w() {return window.innerWidth - 40},
      get h() {return window.innerHeight - 40},
      nbars: 60,
      get pressh() {return this.h - this.w * 4/3 / this.nbars},
      get unit() { return this.pressh / (Math.max.apply(null, Data.tots) || 1) },
      mbar: null,
      charts: ["timeseries", "aggregate"],//["aggregate", "timeseries"],
      munit: 20
    };
    Util = { //TODO: colour object
      color: function (i) {
        return [ "#888", "#e50000", "#e59500", "#e5d900", "#02be01", "#0083c7", "#820080" ][Math.floor((i+9)/10)]
      },
      hexrgb: function (hex, rgb) {
        (rgb = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex) || /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)).shift();
        return rgb.map(function (i) {return i[1] ? parseInt(i, 16) : parseInt(i + i, 16)})
      },
      rgbhex: function (rgb) {
        return "#" + rgb.map(function(a) {
          var b = a.toString(16);
          return b[1] ? b : "0" + b
        }).join("")
      },
      //Use w3 colour brightness guideline to choose contrasting text colour
      ccon: function (r, g, b) { return (((r*299)+(g*587)+(b*114))/1000 >= 128) ? "black" : "white" },
      fade: function(hex, amt) {
        return this.rgbhex(this.hexrgb(hex).map(function(v) {return v + Math.floor((amt>1 ? 1 : amt<0 ? 0 : typeof amt !== "number" ? 0.5 : amt) * (255-v))}))
      },
      darken: function(hex, amt) {
        return this.rgbhex(this.hexrgb(hex).map(function(v) {return Math.floor((amt>1 ? 0 : amt<0 ? 1 : typeof amt !== "number" ? 0.5 : 1 - amt) * v)}))
      },
      op: function (r, g, b, a) { return [r, g, b].map(function (c) {return Math.floor((1 - a)*c + 255*a)}) },
      opmix: function (c1, c2, a) {
        return this.hexrgb(c1).map(function(c, i) {
          return Math.floor( (1 - a)*Util.hexrgb(c2)[i] + a*((1 - a)*c + 255*a) )
        })
      }
    };
  
  //Initialise chart
  //events
  //TODO: View.events
  var
    trmr = function (d0, i0) {
      View.mbar = i0 + 1;
      View.totals.select("g#bars").selectAll("rect")
        .attr("fill", function (d, i) { return i == i0 ? Util.color(i0) : Util.fade(Util.color(i)) });
      View.totals.select("g#count").selectAll("text")
        .attr("fill", function (d, i) {return !d || i != i0 ? "transparent" : d * View.unit > View.w * 5/6 / View.nbars ? Util.ccon.apply(null, Util.hexrgb(Util.color(i))) : "black"});
      View.totals.select("g#quantile").selectAll("rect")
        .attr("fill", function (d, i) { return i == i0 ? Util.color(i0) : Util.fade(Util.color(i)) });
      View.totals.select("g#quantile").selectAll("text")
        .attr("fill", function (d, i) {return d && i == i0 ? Util.ccon.apply(null, Util.hexrgb(Util.color(i))) : "transparent"});
      View.follows.selectAll("rect")
        .data(Data.foll[View.mbar].slice(1, 61))
        .attr("x", function (d, i) {return View.w - (i + 1) * View.w / View.nbars})
        .attr("y", function (d) {return View.pressh - d * View.unit + View.w * 5/6 / View.nbars})
        .attr("width", View.w/View.nbars - 1)
        .attr("height", function (d) {return d * View.unit});
      View.follows.selectAll("text")
        .data(Data.foll[View.mbar].slice(1, 61))
        .text(function (d) { return d })
        .attr("font-size", Math.floor(View.w / 2 / View.nbars) + "px")
        .attr("fill", function (d, i) {
          var b = Util.color(i);
          b = i == i0 ? b : b = Util.fade(b);
          b = d * View.unit > View.w * 5/6 / View.nbars ? b = Util.darken(b, .4) : b;
          return !d ? "transparent" : Util.ccon.apply( null, Util.hexrgb(b) )
        })
        .attr("x", function (d, i) {return View.w - (i + .5) * View.w / View.nbars - .5})
        .attr("y", function (d) {
          var base = View.pressh - d * View.unit + View.w * 3/2 / View.nbars;
          return !d || d * View.unit > View.w * 5/6 / View.nbars ? base : base - View.w * 5/6 / View.nbars
        });
    },
    trmt = function (d0, i0) {
      View.mbar = null;
      View.totals.select("g#bars").selectAll("rect")
        .attr("fill", function (d, i) {return Util.color(i)});
      View.totals.select("g#count").selectAll("text")
        .attr("fill", function (d, i) {
          return !d ? "transparent" : d * View.unit > View.w * 5/6 / View.nbars ? Util.ccon.apply(null, Util.hexrgb(Util.color(i))) : "black"
        });
      View.totals.select("g#quantile").selectAll("rect")
        .attr("fill", function (d, i) { return Util.color(i) });
      View.totals.select("g#quantile").selectAll("text")
        .attr("fill", function (d, i) { return Util.ccon.apply(null, Util.hexrgb(Util.color(i))) });
      View.follows.selectAll("rect")
        .data(Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0))
        .attr("y", View.pressh)
        .attr("height", 0)
      View.follows.selectAll("text")
        .data(Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0))
        .attr("y", View.h + 20)
    },
    lcmr = function (d0, i0) {
      var self = this;
      View.legend.selectAll("circle")
        .data(ucolors)
        .attr("fill", function (d) { return self === this ? d : Util.fade(d, .7) });
      View.legend.select("g#ltip").selectAll("text")
        .text(function (d, i) { return utypes[i0] });
      View.legend.select("g#pcount").selectAll("text")
        .filter(function (d, i) { return i0 == 0 ? i == 6 : i0 != 1 && i == 7 - i0 })
        .attr("display", "inline");
      lmr()
    },
    lcmt = function (d0, i0) {
      View.legend.selectAll("circle")
        .data(ucolors)
        .attr("fill", function (d) { return d });
      View.legend.select("g#ltip").selectAll("text")
        .text(Array(16).join("\u00a0"));
      View.legend.select("g#pcount").selectAll("text")
        .filter(function (d, i) { return i0 == 0 ? i == 6 : i0 != 1 && i == 7 - i0 })
        .attr("display", "none");
      lmt()
    },
    ltmr = function () {
      View.legend.selectAll("rect")
        .transition()
        .attr("x", View.w - 180)
        .attr("width", 180);
      View.legend.select("g#ltip").selectAll("text")
        .transition()
        .attr("x", View.w - 65);
      d3.select(this)
        .text("change chart");
      View.legend.select("g#pcount").selectAll("text")
        .transition()
        .delay(250)
        .attr("display", "inline");
      lmr()
    },
    ltmt = function () {
      View.legend.selectAll("rect")
        .transition()
        .attr("x", View.w - 100)
        .attr("width", 100);
      View.legend.select("g#ltip").selectAll("text")
        .transition()
        .attr("x", View.w - 50);
      d3.select(this)
        .text(Array(16).join("\u00a0"));
      View.legend.select("g#pcount").selectAll("text")
        .attr("display", "none");
      lmt()
    }
    ltc = function () {
      var t = View.charts.shift();
      View[t].attr("display", "none");
      View[View.charts[0]].attr("display", "inline");
      View.charts.push(t)
    },
    lmr = function () {
      View.legend.selectAll("rect")
        .attr("fill-opacity", .8);
      View.timer.selectAll("rect")
        .attr("fill-opacity", .8)
    }, 
    lmt = function () {
      View.legend.selectAll("rect")
        .attr("fill-opacity", .5);
      View.timer.selectAll("rect")
        .attr("fill-opacity", .5)
    },
    pe = function (d0, i0) {
      var s = new Date(d0[2]).getSeconds();
      d3.select(this).selectAll("rect")
        .data(function (d, i) { return s > 60 - d0[0] || s == 0 ? [61 - d0[0]] : [61 - d0[0] - s, s] })
        .enter()
        .append("rect")
        .attr("x", function (d, i) {return i ? 0 : View.w * ((s + d0[0] - 1) % 60) / 60})
        .attr("y", function (d, i) {
          return View.munit * (
            i + Math.floor(( d0[2] - 1000*(61-d0[0]) ) / 60000)
            - Math.floor(( Data.raw[0][2] - 1000*(61-Data.raw[0][0]) ) / 60000)
          )
        })
        .attr("width", function(d, i) {return d * View.w/60 - 1})
        .attr("height", View.munit - 1)
        .attr("fill", Util.color(d0[0] - 1))
        .attr("fill-opacity", .5)
    };
  
  //components
  View.chart = d3.select("#chart")
    .attr("width", View.w)
    .attr("height", View.h + View.w / 6 / View.nbars);
  
  View.aggregate = View.chart.append("g")
    .attr("id", "aggregate")
    .attr("width", View.w)
    .attr("height", View.h - View.w / 2 / View.nbars);
  View.aggregate.append("g")
    .attr("id", "sandtimer");
  View.aggregate.select("g#sandtimer").selectAll("rect")
    .data([60])
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", View.w * 5/6 / View.nbars);
  
  View.totals = View.aggregate.append("g")
    .attr("id", "totals");
  View.totals.append("g")
    .attr("id", "bars")
  View.totals.select("g#bars").selectAll("rect")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill", function (d, i) { return Util.color(i) })
    .on("mouseover", trmr)
    .on("mouseout", trmt);
  View.totals.append("g")
    .attr("id", "count");
  View.totals.select("g#count").selectAll("text")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("fill", "white");
  View.totals.append("g")
    .attr("id", "label");
  View.totals.select("g#label").selectAll("text")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif");
  View.totals.append("g")
    .attr("id", "quantile");
  View.totals.select("g#quantile").selectAll("rect")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill", function (d, i) { return Util.color(i) })
    .attr("y", 0)
    .attr("height", View.w * 5/6 / View.nbars - 1)
    .on("mouseover", trmr)
    .on("mouseout", trmt);
  View.totals.select("g#quantile").selectAll("text")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", Math.floor(View.w / 2 / View.nbars) + "px")
    .attr("fill", function (d, i) { return Util.ccon.apply(null, Util.hexrgb(Util.color(i))) })
    .attr("y", View.w * 5/12 / View.nbars);
  
  View.follows = View.aggregate.append("g")
    .attr("id", "follows");
  View.follows.selectAll("rect")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill-opacity", .4)
    .attr("fill", "black");
  View.follows.selectAll("text")
    .data(Data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("fill", "white");
  
  View.timeseries = View.chart.append("g")
    .attr("id", "timeseries")
    .attr("width", View.w)
    .attr("height", View.h - View.w / 2 / View.nbars);
  
  View.presses = View.timeseries.append("g")
    .attr("id", "presses");
  View.presses.append("g")
    .attr("id", "current");
  View.presses.select("g#current").selectAll("rect")
    .data([0,0])
    .enter()
    .append("rect");
  View.presses.append("g")
    .attr("id", "pindv");
  View.presses.append("g")
    .attr("id", "psecs");
  
  View.timer = View.chart.append("g")
    .attr("id", "timer");
  View.timer.append("rect")
    .attr("x", View.w - 180)
    .attr("y", 14)
    .attr("width", 180)
    .attr("height", 88)
    .attr("fill", "white")
    .attr("fill-opacity", .5)
  View.timer.selectAll("text")
    .data(["?"])
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", "72px")
    .attr("x", View.w - 20)
    .attr("y", 64)
    .text("?");
  
  View.legend = View.chart.append("g")
    .attr("id", "legend");
  View.legend.append("rect")
    .attr("x", View.w - 100)
    .attr("y", 116)
    .attr("width", 100)
    .attr("height", 240)
    .attr("fill", "white")
    .attr("fill-opacity", .5)
    .on("mouseover", lmr)
    .on("mouseout", lmt);
  View.legend.selectAll("circle")
    .data(ucolors)
    .enter()
    .append("circle")
    .attr("r", 7.5)
    .attr("cx", View.w - 65)
    .attr("cy", function (d, i) { return 140 + 20 * i })
    .attr("fill", function (d) { return d })
    .on("mouseover", lcmr)
    .on("mouseout", lcmt);
  View.legend.append("g")
    .attr("id", "acount");
  View.legend.select("g#acount").selectAll("text")
    .data([0,0,0,0,0,0,0,0,0,0])
    .enter()
    .append("text")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", View.w - 50)
    .attr("y", function (d, i) { return 140 + 20 * i });
  View.legend.append("g")
    .attr("id", "pcount");
  View.legend.select("g#pcount").selectAll("text")
    .data([0,0,0,0,0,0,0])
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", View.w - 80)
    .attr("y", function (d, i) { return i == 6 ? 140 : 280 - 20 * i })
    .attr("fill", function (d, i) { return Util.darken(ucolors[i == 6 ? 0 : 7 - i]) })
    .attr("display", "none");
  View.legend.append("g")
    .attr("id", "ltip");
  View.legend.select("g#ltip")
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", View.w - 50)
    .attr("y", 340)
    .text(Array(16).join("\u00a0"))
    .on("mouseover", ltmr)
    .on("mouseout", ltmt)
    .on("click", ltc);
  
  View.charts.forEach(function (d, i) { !i || View[d].attr("display", "none") });
  

  var
    //Ajax call to r/thebutton
    //TODO: organise within Util
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

    //Polls r/thebutton for active user count, attempting to minimise bandwidth
    triggerinterval = function (val) {
      !Interval.id || window.clearInterval(Interval.id);
      Interval.adj = !!val;
      Interval.id = window.setInterval(function () {
        buttonjax(active);
        console.log("Interval = " + Interval.val + ", val = " + val + ", usersonline = " + Data.rbtn["users-online"] + ", time = " + new Date(Date.now()).toLocaleTimeString() + ", debug = " + ++Interval.debug) //active user count debug
        if (Interval.adj) {
          Interval.adj = false;
          triggerinterval()
        }
      }, val||Interval.val)
    },
    intmonitor = function () {
      var l = Data.araw.length;
      if (Interval.val==10000) {
        if (l > 1 && !arawcomp(Data.araw[l-1], Data.araw[l-2])) {
          Interval.val = 64500; //Active users refresh rate (??)
          triggerinterval(90000)
        }
      } else {
        if (!!Interval.test) {
          if (Interval.test == "init") {
            triggerinterval(54000);
            Interval.test = new Array;
            return
          }
          Interval.test.push(Data.araw[l - 1]);
          if (Interval.test.length == 3) {
            if (!arawcomp(Interval.test[0], Interval.test[1])) { triggerinterval(90000) }
            else if (!arawcomp(Interval.test[1], Interval.test[2])) { triggerinterval(80000) }
            else { triggerinterval(54000) }
            Interval.test = null
          } else { triggerinterval(10000) }
        }
      }
    },
    arawcomp = function (a1, a2) {
      for (var i = 0; i < 9; i++) if (a1[i] != a2[i]) break;
      return i == 9
    },

    //Update pressers data
    prev = {},
    tick = function (e) {
      var pct = JSON.parse(e.data);
      if (pct.type != "ticking") return;
      var
        dt = new Date(Date.UTC.apply(null, pct.payload.now_str.split("-").map(Number))),
        curr = {
          dt: dt.setMonth(dt.getMonth() - 1),
          np: parseInt(pct.payload.participants_text.replace(/[^0-9]/,'')),
          ts: pct.payload.seconds_left
        },
        ts, dp;
      if (Object.keys(prev).length > 0 && curr.np != prev.np) {
        Data.raw.push([ts = Data.last, dp = curr.np - prev.np, curr.dt]);
        Data.tots[ts] += dp;
        if (Data.raw.length > 1) Data.foll[Data.raw[Data.raw.length - 2][0]][ts] += dp
      }
      
      var sum = function (a, b) { return a + b };
      var subtots = [0,1,2,3,4,5].map(function (a) {return Data.tots.slice(a*10+2, a*10+12).reduce(sum)});
      subtots.push(subtots.reduce(sum));
      View.legend.select("g#pcount").selectAll("text")
        .data(subtots)
        .text(function (d, i) { return (!subtots[6] || i == 6 ? "" : "(" + (100 * d / subtots[6]).toFixed(2) + "%) ") + d });

      //Render charts
      View.chart = d3.select("#chart")
        .attr("width", View.w)
        .attr("height", View.h + View.w / 6 / View.nbars);
      
      if (View.charts[0] == "aggregate") {
        
        //Aggregate chart
        View.aggregate
          .attr("width", View.w)
          .attr("height", View.pressh);
        
        if (curr.ts >= prev.ts) {
          View.aggregate.select("g#sandtimer").selectAll("rect")
            .transition()
            .duration(0)
            .attr("width", 0)
            .attr("height", View.pressh)
            .attr("fill", "#820080")
            .attr("fill-opacity", .2)
          d3.timer.flush()
        }
        View.aggregate.select("g#sandtimer").selectAll("rect")
          .data([curr.ts])
          .attr("style", function (d) {return "fill: " + Util.color(d - 1) + "; fill-opacity: .2"})
          .attr("height", View.pressh)
          .transition()
          .duration(1000)
          .ease("linear")
          .attr("width", function (d) {return View.w - (d - 1) * View.w / View.nbars});
        
        View.totals.select("g#bars").selectAll("rect")
          .data(Data.tots.slice(1, 61))
          .transition()
          .attr("x", function (d, i) {return View.w - (i + 1) * View.w / View.nbars})
          .attr("y", function (d) {return View.pressh - d * View.unit + View.w * 5/6 / View.nbars})
          .attr("width", View.w/View.nbars - 1)
          .attr("height", function (d) {return d * View.unit});        
        View.totals.select("g#count").selectAll("text")
          .data(Data.tots.slice(1, 61))
          .transition()
          .text(function (d) { return d })
          .attr("font-size", Math.floor(View.w / 2 / View.nbars) + "px")
          .attr("fill", function (d, i) {
            return !d || View.mbar !== null && i != View.mbar - 1 ? "transparent" : d * View.unit > View.w * 5/6 / View.nbars ? Util.ccon.apply(null, Util.hexrgb(Util.color(i))) : "black"
          })
          .attr("x", function (d, i) {return View.w - (i + .5) * View.w / View.nbars - .5})
          .attr("y", function (d) {
            var base = View.pressh - d * View.unit + View.w * 3/2 / View.nbars;
            return !d || d * View.unit > View.w * 5/6 / View.nbars ? base : base - View.w * 5/6 / View.nbars
          });
        View.totals.select("g#label").selectAll("text")
          .data(Data.tots.slice(1, 61))
          .text(function (d, i) { return i + 1 })
          .attr("font-size", Math.floor(View.w / 2 / View.nbars) + "px")
          .attr("x", function (d, i) {return View.w - (i + .5) * View.w / View.nbars - .5})
          .attr("y", View.pressh + View.w * 3/2 / View.nbars);
        var cmltot = (function (cmltot) {
          for (var i = 59; i >= 0; i--) cmltot[i] += 59 - i ? cmltot[i + 1] : 0;
          return cmltot
        })( Data.tots.slice(1, 61) )
        View.totals.select("g#quantile").selectAll("rect")
          .data(cmltot)
          .transition()
          .attr("x", function (d, i) { return (d - Data.tots[i+1]) * View.w / Math.max(subtots[6], 1) })
          .attr("width", function (d, i) { return Math.max( Data.tots[i+1] * View.w / Math.max(subtots[6], 1) - 1, 0) });
        View.totals.select("g#quantile").selectAll("text")
          .data(cmltot)
          .text(function (d, i) { return Data.tots[i+1] || null })
          .transition()
          .attr("font-size", Math.floor(View.w / 2 / View.nbars) + "px")
          .attr("x", function (d, i) {
            return d * View.w / Math.max(subtots[6], 1) - Math.min(
              View.w / View.nbars,
              Data.tots[i+1] * View.w / Math.max(subtots[6], 1) + 1
            ) / 2
          })
          .attr("y", View.w * 5/12 / View.nbars)

        View.follows.selectAll("rect")
          .data(
            View.mbar === null ?
              Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0) :
              Data.foll[View.mbar].slice(1, 61)
          )
          .transition()
          .attr("y", function (d) {return View.pressh - d * View.unit + View.w * 5/6 / View.nbars})
          .attr("height", function (d) {return d * View.unit});
        View.follows.selectAll("text")
          .data(
            View.mbar === null ?
              Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0) :
              Data.foll[View.mbar].slice(1, 61)
          )
          .attr("fill", function (d, i) {
            var b = Util.color(i);
            b = i == View.mbar - 1 ? b : b = Util.fade(b);
            b = d * View.unit > View.w * 5/6 / View.nbars ? b = Util.darken(b, .4) : b;
            return !d ? "transparent" : Util.ccon.apply( null, Util.hexrgb(b) )
          })
          .transition()
          .text(function (d) { return d })
          .attr("y", function (d) {
            var base = View.pressh - d * View.unit + View.w * 3/2 / View.nbars;
            return View.mbar === null ? View.h + 20 : !d || d * View.unit > View.w * 5/6 / View.nbars ? base : base - View.w * 5/6 / View.nbars
          });
        
      } else if (View.charts[0] == "timeseries") {
        
        //Time-series chart
        View.presses.select("g#pindv").selectAll("g")
          .data(Data.raw)
          .enter()
          .append("g")
          .each(pe);
        var
          d0 = [curr.ts, curr.dt],
          s = new Date(d0[1]).getSeconds();
        if (curr.ts >= prev.ts) {
          View.presses.select("g#current").selectAll("rect")
            .transition()
            .duration(0)
            .attr("x", function (d, i) {return i ? 0 : View.w * ((s + d0[0]) % 60) / 60})
            .attr("y", function (d, i) {
              return View.munit * (
                 !Data.raw.length ? i : i + Math.floor(( d0[1] - 1000*(61-d0[0]) ) / 60000)
                - Math.floor(( Data.raw[0][2] - 1000*(61-Data.raw[0][0]) ) / 60000)
              )
            })
            .attr("width", 0)
            .attr("fill", "#820080")
          d3.timer.flush()
        }
        View.presses.select("g#current").selectAll("rect")
          .data(s > 60 - d0[0] ? [61 - d0[0], 0] : [60 - d0[0] - s, s + 1])
          .attr("fill", Util.color(d0[0] - 1))
          .transition()
          .duration(1000)
          .ease("linear")
          .attr("x", function (d, i) {return i ? 0 : View.w * ((s + d0[0]) % 60) / 60})
          .attr("y", function (d, i) {
            return View.munit * (
               !Data.raw.length ? i : i + Math.floor(( d0[1] - 1000*(61-d0[0]) ) / 60000)
              - Math.floor(( Data.raw[0][2] - 1000*(61-Data.raw[0][0]) ) / 60000)
            )
          })
          .attr("width", function(d, i) {return !i || d ? Math.max(d * View.w/60 - 1, 0) : 0})
          .attr("height", View.munit - 1);
        View.presses.select("g#psecs").selectAll("text")
          .data(Data.raw)
          .enter()
          .append("text")
          .each(function (d, i) {
            if (i>0 && (new Date(Data.raw[i][2]).getSeconds() + Data.raw[i][0]) % 60 < new Date(Data.raw[i-1][2]).getSeconds() + 1) {
              View.presses.select("g#psecs").selectAll("text:nth-of-type(" + i + ")")[0][0].setAttribute(
                "fill", Util.ccon.apply(null, Util.opmix(Util.color(Data.raw[i][0] - 1), Util.color(Data.raw[i-1][0] - 1), .5))
              )
            }
          })
          .text(function (d) { return d[0] })
          .attr("x", function (d) { return View.w * (new Date(d[2]-1000).getSeconds() + .5) / 60 } )
          .attr("y", function (d) {
            return View.munit * (
              Number(new Date(d[2]-1000).getSeconds() < 60 - d[0]) + .5 + Math.floor(( d[2] - 1000*(61-d[0]) ) / 60000)
              - Math.floor(( Data.raw[0][2] - 1000*(61-Data.raw[0][0]) ) / 60000)
            )
          })
          .attr("font-size", Math.max( Math.floor(Math.min( View.w / 120, View.munit / 2 )), 5) + "px")
          .attr("alignment-baseline", "central")
          .attr("text-anchor", "middle")
          .attr("font-family", "sans-serif")
          .attr("fill", function(d) {
            return Util.ccon.apply(null, Util.op.apply(null, Util.hexrgb( Util.color(d[0] - 1) ).concat([.5])))
          })
      }

      prev = curr;
      Data.last = curr.ts
      
      //Sync timer
      Interval.dt[1] = 0;
      Interval.dt[0].push(setInterval(function () {
        while (Interval.dt[0][1]) clearInterval(Interval.dt[0].shift());
        Interval.dt[1] += .1;
        View.timer.selectAll("text")
          .data([(Data.last - Interval.dt[1]).toFixed(1)])
          .text(function (d) { return d })
          .attr("x", View.w - 20)
      }, 100))
    },

    //Update active users data
    active = function (resp) {
      for (var i = 0, r, rbtnnew = []; i < 9; i++) {
        rbtnnew.push(Data.rbtn[utypes[i]] = parseInt(
          (new RegExp("(?:" + utypes[i] + ".{" + (i ? 11 : 94) + "})([0-9,]+)").exec(resp)||[,"0"])[1]
            .replace(/[^0-9]/,'')
        ))
        r = i ? r - rbtnnew[i] : rbtnnew[i]
      }
      rbtnnew.push(Data.rbtn["no-flair"] = r);
      View.legend.select("g#acount").selectAll("text")
        .data(rbtnnew)
        .text(function (d) { return d });
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

  //Begin polling r/thebutton for active user count
  triggerinterval();
  
  //Check to correct polling phase
  setInterval(function () {Interval.test = "init"}, 600000)
}