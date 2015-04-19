init = function () {
  B = {
    data: {
      utypes: [
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
      ucolors: [
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
      ],
      raw: new Array,
      tots: Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0),
      foll: Array.apply(null, Array(61)).map(function(){return Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0)}),
      last: null,
      rbtn: function () {return B.data.utypes.reduce(function(o, v) { o[v] = 0; return o }, {})},
      araw: new Array //TODO: timestamping
    },

    interval: {
      val: 10000,
      id: null,
      adj: false,
      test: null,
      dt: [[],]
    },

    color: function (c) {
      var
        lookup = function (c) {
          return typeof c == "number" ?
            [
              [136, 136, 136],
              [229, 0, 0],
              [229, 149, 0],
              [229, 217, 0],
              [2, 190, 1],
              [0, 131, 199],
              [130, 0, 128]
            ][Math.floor((c + 9)/10)] :
            (function (hex, rgb) {
              (rgb = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex) || /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)).shift();
              return rgb.map(function (i) {return i[1] ? parseInt(i, 16) : parseInt(i + i, 16)})
            })(c)
        },
        color = lookup(c);
      return {
        get val() {
          return "#" + color.map(function(a) {
            var b = a.toString(16);
            return b[1] ? b : "0" + b
          }).join("")
        },
        //Use w3 colour brightness guideline to choose contrasting text colour
        get ccon() { 
          color = (( (color[0] * 299) + (color[1] * 587) + (color[2] * 114) ) / 1000 >= 128) ? [0, 0, 0] : [255, 255, 255];
          return this
        },
        get fade() { return this.nfade(.5) },
        nfade: function(amt) {
          color = color.map(function(v) { return v + Math.floor((amt > 1 ? 1 : amt < 0 ? 0 : amt) * (255 - v)) });
          return this
        },
        get darken() { return this.ndarken(.5) },
        ndarken: function(amt) {
          color = color.map(function(v) { return Math.floor((amt > 1 ? 0 : amt < 0 ? 1 : 1 - amt) * v) });
          return this
        },
        get op() { return this.nop(.5) },
        nop: function (a) {
          color = color.map(function (c) { return Math.floor(c * a + 255 * (1 - a)) });
          return this
        },
        mix: function (v, a) {
          color = color.map(function(c, i) { return Math.floor( lookup(v)[i] * a + c * (1 - a) ) });
          return this
        }
      }
    },

    util: {
      //Ajax call to r/thebutton
      buttonjax: function (callback) {
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
      triggerinterval: function (val) {
        !B.interval.id || window.clearInterval(B.interval.id);
        B.interval.adj = !!val;
        B.interval.id = window.setInterval(function () {
          B.util.buttonjax(B.util.active);
          if (B.interval.adj) {
            B.interval.adj = false;
            B.util.triggerinterval()
          }
        }, val||B.interval.val)
      },
      intmonitor: function () {
        var l = B.data.araw.length;
        if (B.interval.val==10000) {
          if (l > 1 && !B.util.arawcomp(B.data.araw[l-1], B.data.araw[l-2])) {
            B.interval.val = 64500; //Active users refresh rate (??)
            B.util.triggerinterval(90000)
          }
        } else {
          if (!!B.interval.test) {
            if (B.interval.test == "init") {
              B.util.triggerinterval(54000);
              B.interval.test = new Array;
              return
            }
            B.interval.test.push(B.data.araw[l - 1]);
            if (B.interval.test.length == 3) {
              if (!B.util.arawcomp(B.interval.test[0], B.interval.test[1])) { B.util.triggerinterval(90000) }
              else if (!B.util.arawcomp(B.interval.test[1], B.interval.test[2])) { B.util.triggerinterval(80000) }
              else { B.util.triggerinterval(54000) }
              B.interval.test = null
            } else { B.util.triggerinterval(10000) }
          }
        }
      },
      arawcomp: function (a1, a2) {
        for (var i = 0; i < 9; i++) if (a1[i] != a2[i]) break;
        return i == 9
      },

      //Update pressers data
      prev: {},
      tick: function (e) {
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
        if (Object.keys(B.util.prev).length > 0 && curr.np != B.util.prev.np) {
          B.data.raw.push([ts = B.data.last, dp = curr.np - B.util.prev.np, curr.dt]);
          B.data.tots[ts] += dp;
          if (B.data.raw.length > 1) B.data.foll[B.data.raw[B.data.raw.length - 2][0]][ts] += dp
        }

        //Render charts
        B.view.chart = d3.select("#chart")
          .attr("width", B.view.w)
          .attr("height", B.view.h + B.view.w / 6 / 60);
        
        var
          sum = function (a, b) { return a + b },
          subtots = [0,1,2,3,4,5].map(function (a) {return B.data.tots.slice(a*10+2, a*10+12).reduce(sum)});
        subtots.push(subtots.reduce(sum));
        B.view.legend.select("g#pcount").selectAll("text")
          .data(subtots)
          .text(function (d, i) { return (!subtots[6] || i == 6 ? "" : "(" + (100 * d / subtots[6]).toFixed(2) + "%) ") + d });

        if (B.view.charts[0] == "aggregate") {

          //Aggregate chart
          B.view.aggregate
            .attr("width", B.view.w)
            .attr("height", B.view.pressh);

          if (curr.ts >= B.util.prev.ts) {
            B.view.aggregate.select("g#sandtimer").selectAll("rect")
              .transition()
              .duration(0)
              .attr("width", 0)
              .attr("height", B.view.pressh)
              .attr("fill", "#820080")
              .attr("fill-opacity", .2)
            d3.timer.flush()
          }
          B.view.aggregate.select("g#sandtimer").selectAll("rect")
            .data([curr.ts])
            .attr("style", function (d) {return "fill: " + B.color(d - 1).val + "; fill-opacity: .2"})
            .attr("height", B.view.pressh)
            .transition()
            .duration(1000)
            .ease("linear")
            .attr("width", function (d) {return B.view.w - (d - 1) * B.view.w / 60});

          B.view.totals.select("g#bars").selectAll("rect")
            .data(B.data.tots.slice(1, 61))
            .transition()
            .attr("x", function (d, i) {return B.view.w - (i + 1) * B.view.w / 60})
            .attr("y", function (d) {return B.view.pressh - d * B.view.unit + B.view.w * 5/6 / 60})
            .attr("width", B.view.w/60 - 1)
            .attr("height", function (d) {return d * B.view.unit});        
          B.view.totals.select("g#count").selectAll("text")
            .data(B.data.tots.slice(1, 61))
            .transition()
            .text(function (d) { return d })
            .attr("font-size", Math.floor(B.view.w / 2 / 60) + "px")
            .attr("fill", function (d, i) {
              return !d || B.view.mbar !== null && i != B.view.mbar - 1 ? "transparent" : d * B.view.unit > B.view.w * 5/6 / 60 ? B.color(i).ccon.val : "black"
            })
            .attr("x", function (d, i) {return B.view.w - (i + .5) * B.view.w / 60 - .5})
            .attr("y", function (d) {
              var base = B.view.pressh - d * B.view.unit + B.view.w * 3/2 / 60;
              return !d || d * B.view.unit > B.view.w * 5/6 / 60 ? base : base - B.view.w * 5/6 / 60
            });
          B.view.totals.select("g#label").selectAll("text")
            .data(B.data.tots.slice(1, 61))
            .text(function (d, i) { return i + 1 })
            .attr("font-size", Math.floor(B.view.w / 2 / 60) + "px")
            .attr("x", function (d, i) {return B.view.w - (i + .5) * B.view.w / 60 - .5})
            .attr("y", B.view.pressh + B.view.w * 3/2 / 60);
          var cmltot = (function (cmltot) {
            for (var i = 59; i >= 0; i--) cmltot[i] += 59 - i ? cmltot[i + 1] : 0;
            return cmltot
          })( B.data.tots.slice(1, 61) )
          B.view.totals.select("g#quantile").selectAll("rect")
            .data(cmltot)
            .transition()
            .attr("x", function (d, i) { return (d - B.data.tots[i+1]) * B.view.w / Math.max(subtots[6], 1) })
            .attr("width", function (d, i) { return Math.max( B.data.tots[i+1] * B.view.w / Math.max(subtots[6], 1) - 1, 0) });
          B.view.totals.select("g#quantile").selectAll("text")
            .data(cmltot)
            .text(function (d, i) { return B.data.tots[i+1] || null })
            .transition()
            .attr("font-size", Math.floor(B.view.w / 2 / 60) + "px")
            .attr("x", function (d, i) {
              return d * B.view.w / Math.max(subtots[6], 1) - Math.min(
                B.view.w / 60,
                B.data.tots[i+1] * B.view.w / Math.max(subtots[6], 1) + 1
              ) / 2
            })
            .attr("y", B.view.w * 5/12 / 60)

          B.view.follows.selectAll("rect")
            .data(
              B.view.mbar === null ?
                Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0) :
                B.data.foll[B.view.mbar].slice(1, 61)
            )
            .transition()
            .attr("y", function (d) {return B.view.pressh - d * B.view.unit + B.view.w * 5/6 / 60})
            .attr("height", function (d) {return d * B.view.unit});
          B.view.follows.selectAll("text")
            .data(
              B.view.mbar === null ?
                Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0) :
                B.data.foll[B.view.mbar].slice(1, 61)
            )
            .attr("fill", function (d, i) {
              var b = B.color(i);
              i == B.view.mbar - 1 || b.fade;
              d * B.view.unit >= B.view.w * 5/6 / 60 || b.ndarken(.4);
              return d ? b.ccon.val : "transparent"
            })
            .transition()
            .text(function (d) { return d })
            .attr("y", function (d) {
              var base = B.view.pressh - d * B.view.unit + B.view.w * 3/2 / 60;
              return B.view.mbar === null ? B.view.h + 20 : !d || d * B.view.unit > B.view.w * 5/6 / 60 ? base : base - B.view.w * 5/6 / 60
            });

        } else if (B.view.charts[0] == "timeseries") {

          //Time-series chart
          B.view.presses.select("g#pindv").selectAll("g")
            .data(B.data.raw)
            .enter()
            .insert("g", ":first-child")
            .each(B.view.events.pe)
            .on("mouseover", B.view.events.pr)
            .on("mouseout", B.view.events.pt);
          var
            d0 = [curr.ts, curr.dt],
            s = new Date(d0[1]).getSeconds();
          if (curr.ts >= B.util.prev.ts) {
            B.view.presses.select("g#current").selectAll("rect")
              .transition()
              .duration(0)
              .attr("x", function (d, i) {return i ? 0 : B.view.w * ((s + d0[0]) % 60) / 60})
              .attr("y", function (d, i) {
                return 1 + B.view.munit * (
                   !B.data.raw.length ? i : i + Math.floor(( d0[1] - 1000*(61-d0[0]) ) / 60000)
                  - Math.floor(( B.data.raw[0][2] - 1000*(61-B.data.raw[0][0]) ) / 60000)
                )
              })
              .attr("width", 0)
              .attr("fill", "#820080")
            d3.timer.flush()
          }
          B.view.presses.select("g#current").selectAll("rect")
            .data(s > 60 - d0[0] ? [61 - d0[0], 0] : [60 - d0[0] - s, s + 1])
            .attr("fill", B.color(d0[0] - 1).val)
            .transition()
            .duration(1000)
            .ease("linear")
            .attr("x", function (d, i) {return i ? 0 : B.view.w * ((s + d0[0]) % 60) / 60})
            .attr("y", function (d, i) {
              return 1 + B.view.munit * (
                 !B.data.raw.length ? i : i + Math.floor(( d0[1] - 1000*(61-d0[0]) ) / 60000)
                - Math.floor(( B.data.raw[0][2] - 1000*(61-B.data.raw[0][0]) ) / 60000)
              )
            })
            .attr("width", function(d, i) {return !i || d ? Math.max(d * B.view.w/60 - 1, 0) : 0})
            .attr("height", B.view.munit - 1);
          B.view.presses.select("g#psecs").selectAll("text")
            .data(B.data.raw)
            .enter()
            .append("text")
            .text(function (d) { return d[0] })
            .attr("x", function (d) { return B.view.w * (new Date(d[2]-1000).getSeconds() + .5) / 60 } )
            .attr("y", function (d) {
              return 1 + B.view.munit * (
                Number(new Date(d[2]-1000).getSeconds() < 60 - d[0]) + .5 + Math.floor(( d[2] - 1000*(61-d[0]) ) / 60000)
                - Math.floor(( B.data.raw[0][2] - 1000*(61-B.data.raw[0][0]) ) / 60000)
              )
            })
            .attr("font-size", Math.max( Math.floor(Math.min( B.view.w / 120, B.view.munit / 2 )), 5) + "px")
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("fill", function(d) { return B.color(d[0] - 1).op.ccon.val })
            .each(function (d, i) {
              if (i>0 && (new Date(B.data.raw[i][2]).getSeconds() + B.data.raw[i][0]) % 60 < new Date(B.data.raw[i-1][2]).getSeconds() + 1) {
                B.view.presses.select("g#psecs").selectAll("text:nth-of-type(" + i + ")")
                  .attr("fill", B.color(B.data.raw[i][0] - 1).op.mix(B.data.raw[i-1][0] - 1, .5).ccon.val)
              }
            })
        }

        B.util.prev = curr;
        B.data.last = curr.ts

        //Sync timer
        B.interval.dt[1] = 0;
        B.interval.dt[0].push(setInterval(function () {
          while (B.interval.dt[0][1]) clearInterval(B.interval.dt[0].shift());
          B.interval.dt[1] += .1;
          B.view.timer.selectAll("text")
            .data([(B.data.last - B.interval.dt[1]).toFixed(1)])
            .text(function (d) { return d })
            .attr("x", B.view.w - 20)
        }, 100))
      },

      //Update active users data
      active: function (resp) {
        for (var i = 0, r, rbtnnew = []; i < 9; i++) {
          rbtnnew.push(B.data.rbtn[B.data.utypes[i]] = parseInt(
            (new RegExp("(?:" + B.data.utypes[i] + ".{" + (i ? 11 : 94) + "})([0-9,]+)").exec(resp)||[,"0"])[1]
              .replace(/[^0-9]/,'')
          ))
          r = i ? r - rbtnnew[i] : rbtnnew[i]
        }
        rbtnnew.push(B.data.rbtn["no-flair"] = r);
        B.view.legend.select("g#acount").selectAll("text")
          .data(rbtnnew)
          .text(function (d) { return d });
        switch (B.data.araw.length != 0) {
          case true: if (B.util.arawcomp(rbtnnew, B.data.araw[B.data.araw.length - 1])) break
          default: B.data.araw.push(rbtnnew)
        }
        B.util.intmonitor()
      }
    },

    view: {
      get w() {return window.innerWidth - 40},
      get h() {return window.innerHeight - 40},
      get pressh() {return this.h - this.w * 4/3 / 60},
      get unit() { return this.pressh / (Math.max.apply(null, B.data.tots) || 1) },
      mbar: null,
      mpress: null,
      charts: ["timeseries", "aggregate"],//["aggregate", "timeseries"],
      munit: 20,
      events: {
        trmr: function (d0, i0) {
          B.view.mbar = i0 + 1;
          B.view.totals.select("g#bars").selectAll("rect")
            .attr("fill", function (d, i) { return i == i0 ? B.color(i0).val : B.color(i).fade.val });
          B.view.totals.select("g#count").selectAll("text")
            .attr("fill", function (d, i) {return !d || i != i0 ? "transparent" : d * B.view.unit > B.view.w * 5/6 / 60 ? B.color(i).ccon.val : "black"});
          B.view.totals.select("g#quantile").selectAll("rect")
            .attr("fill", function (d, i) { return i == i0 ? B.color(i0).val : B.color(i).fade.val });
          B.view.totals.select("g#quantile").selectAll("text")
            .attr("fill", function (d, i) {return d && i == i0 ? B.color(i).ccon.val : "transparent"});
          B.view.follows.selectAll("rect")
            .data(B.data.foll[B.view.mbar].slice(1, 61))
            .attr("x", function (d, i) {return B.view.w - (i + 1) * B.view.w / 60})
            .attr("y", function (d) {return B.view.pressh - d * B.view.unit + B.view.w * 5/6 / 60})
            .attr("width", B.view.w/60 - 1)
            .attr("height", function (d) {return d * B.view.unit});
          B.view.follows.selectAll("text")
            .data(B.data.foll[B.view.mbar].slice(1, 61))
            .text(function (d) { return d })
            .attr("font-size", Math.floor(B.view.w / 2 / 60) + "px")
            .attr("fill", function (d, i) {
              var b = B.color(i);
              i != i0 || b.fade;
              d * B.view.unit <= B.view.w * 5/6 / 60 || b.ndarken(.4);
              return !d ? "transparent" : b.ccon.val
            })
            .attr("x", function (d, i) {return B.view.w - (i + .5) * B.view.w / 60 - .5})
            .attr("y", function (d) {
              var base = B.view.pressh - d * B.view.unit + B.view.w * 3/2 / 60;
              return !d || d * B.view.unit > B.view.w * 5/6 / 60 ? base : base - B.view.w * 5/6 / 60
            });
          B.view.legend.select("g#ltip").selectAll("text")
            .text("Following presses")
        },
        trmt: function (d0, i0) {
          B.view.mbar = null;
          B.view.totals.select("g#bars").selectAll("rect")
            .attr("fill", function (d, i) {return B.color(i).val});
          B.view.totals.select("g#count").selectAll("text")
            .attr("fill", function (d, i) {
              return !d ? "transparent" : d * B.view.unit > B.view.w * 5/6 / 60 ? B.color(i).ccon.val : "black"
            });
          B.view.totals.select("g#quantile").selectAll("rect")
            .attr("fill", function (d, i) { return B.color(i).val });
          B.view.totals.select("g#quantile").selectAll("text")
            .attr("fill", function (d, i) { return B.color(i).ccon.val });
          B.view.follows.selectAll("rect")
            .data(Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0))
            .attr("y", B.view.pressh)
            .attr("height", 0)
          B.view.follows.selectAll("text")
            .data(Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0))
            .attr("y", B.view.h + 20)
          B.view.legend.select("g#ltip").selectAll("text")
            .text(null)
        },
        lcmr: function (d0, i0) {
          var self = this;
          B.view.legend.selectAll("circle")
            .data(B.data.ucolors)
            .attr("fill", function (d) { return self === this ? d : B.color(d).nfade(.7).val });
          B.view.legend.select("g#ltip").selectAll("text")
            .text(function (d, i) { return B.data.utypes[i0] });
          B.view.legend.select("g#pcount").selectAll("text")
            .filter(function (d, i) { return i0 == 0 ? i == 6 : i0 != 1 && i == 7 - i0 })
            .attr("display", "inline");
          B.view.events.lmr()
        },
        lcmt: function (d0, i0) {
          B.view.legend.selectAll("circle")
            .data(B.data.ucolors)
            .attr("fill", function (d) { return d });
          B.view.legend.select("g#ltip").selectAll("text")
            .text(Array(16).join("\u00a0"));
          B.view.legend.select("g#pcount").selectAll("text")
            .filter(function (d, i) { return i0 == 0 ? i == 6 : i0 != 1 && i == 7 - i0 })
            .attr("display", "none");
          B.view.events.lmt()
        },
        ltmr: function () {
          B.view.legend.selectAll("rect")
            .transition()
            .attr("x", B.view.w - 180)
            .attr("width", 180);
          B.view.legend.select("g#ltip").selectAll("text")
            .transition()
            .attr("x", B.view.w - 65);
          d3.select(this)
            .text("change chart");
          B.view.legend.select("g#pcount").selectAll("text")
            .transition()
            .delay(250)
            .attr("display", "inline");
          B.view.events.lmr()
        },
        ltmt: function () {
          B.view.legend.selectAll("rect")
            .transition()
            .attr("x", B.view.w - 100)
            .attr("width", 100);
          B.view.legend.select("g#ltip").selectAll("text")
            .transition()
            .attr("x", B.view.w - 50);
          d3.select(this)
            .text(Array(16).join("\u00a0"));
          B.view.legend.select("g#pcount").selectAll("text")
            .attr("display", "none");
          B.view.events.lmt()
        },
        ltc: function () {
          var t = B.view.charts.shift();
          B.view[t].attr("display", "none");
          B.view[B.view.charts[0]].attr("display", "inline");
          B.view.charts.push(t)
        },
        lmr: function () {
          B.view.legend.selectAll("rect")
            .attr("fill-opacity", .8);
          B.view.timer.selectAll("rect")
            .attr("fill-opacity", .8)
        }, 
        lmt: function () {
          B.view.legend.selectAll("rect")
            .attr("fill-opacity", .5);
          B.view.timer.selectAll("rect")
            .attr("fill-opacity", .5)
        },
        pe: function (d0, i0) {
          var s = new Date(d0[2]).getSeconds();
          d3.select(this).selectAll("rect")
            .data(function (d, i) { return s > 60 - d0[0] || s == 0 ? [61 - d0[0]] : [61 - d0[0] - s, s] })
            .enter()
            .append("rect")
            .attr("x", function (d, i) {return i ? 0 : B.view.w * ((s + d0[0] - 1) % 60) / 60})
            .attr("y", function (d, i) {
              return 1 + B.view.munit * (
                i + Math.floor(( d0[2] - 1000*(61-d0[0]) ) / 60000)
                - Math.floor(( B.data.raw[0][2] - 1000*(61-B.data.raw[0][0]) ) / 60000)
              )
            })
            .attr("width", function(d, i) {return d * B.view.w/60 - 1})
            .attr("height", B.view.munit - 1)
            .attr("fill", B.color(d0[0] - 1).val)
            .attr("fill-opacity", .5)
        },
        pr: function (d0) {
          B.view.mpress = this;
          var
            is = B.view.presses.select("g#pindv").selectAll("g")[0],
            i0 = is.length - 1 - is.indexOf(this),
            d0 = d3.select(B.view.presses.select("g#pindv").selectAll("g")[0][i0]).data()[0],
            s = new Date(d0[2]).getSeconds(),
            c = s > 60 - d0[0] || s == 0,
            pd = function (d, i) {
              var
                y = 1 + B.view.munit * (
                  i + Math.floor(( d0[2] - 1000*(61-d0[0]) ) / 60000)
                  - Math.floor(( B.data.raw[0][2] - 1000*(61-B.data.raw[0][0]) ) / 60000)
                ),
                p = "M" + ((B.view.w * (i ? 0 : c ? (s + 59) % 60 + 1 : 60) / 60) - 1 - .5 * i) + " " + (y - .5) +
                  " h " + (2*i-1) * (d * B.view.w/60 - c) +
                  " v " + (B.view.munit) +
                  " h " + (1-2*i) * (d * B.view.w/60 - c);
              return c ? p + " Z" : p;
            };
          B.view.ptip.select("g#border").selectAll("path")
            .data(function (d, i) { return c ? [61 - d0[0]] : [61 - d0[0] - s, s] })
            .enter()
            .append("path")
            .attr("d", pd)
            .attr("fill", "none")
            .attr("stroke", "black");

          d3.select(this).selectAll("rect").attr("fill-opacity", 1);
          B.view.presses.select("g#psecs > text:nth-child(" + (i0 + 1) + ")")
            .attr("fill", B.color(d0[0] - 1).ccon.val);
          if (!i0 || (new Date(B.data.raw[i0][2]).getSeconds() + B.data.raw[i0][0]) % 60 > new Date(B.data.raw[i0-1][2]).getSeconds()) return;
          B.view.presses.select("g#psecs > text:nth-child(" + i0 + ")")
            .attr("fill", B.color(d0[0]).mix(d0[0] - 1, .5).ccon.val)
            .attr("opacity", .3)
        },
        pt: function () {
          var
            is = B.view.presses.select("g#pindv").selectAll("g")[0],
            i0 = is.length - 1 - is.indexOf(this),
            d0 = d3.select(B.view.presses.select("g#pindv").selectAll("g")[0][i0]).data()[0];
          B.view.ptip.select("g#border").selectAll("path")
            .data([])
            .exit()
            .remove();

          d3.select(this).selectAll("rect").attr("fill-opacity", .5);
          B.view.presses.select("g#psecs > text:nth-child(" + (i0 + 1) + ")")
            .attr("fill", B.color(d0[0] - 1).op.ccon.val);
          if (!i0 || (new Date(B.data.raw[i0][2]).getSeconds() + B.data.raw[i0][0]) % 60 > new Date(B.data.raw[i0-1][2]).getSeconds()) return;
          B.view.presses.select("g#psecs > text:nth-child(" + i0 + ")")
            .each(function (d) { d1 = d })
            .attr("fill", B.color(d1[0]).op.mix(d0[0], .5).ccon.val)
            .attr("opacity", null);
          B.view.mpress = null
        }
      }
    }
  };
  
  //Initialise chart
  B.view.chart = d3.select("#chart")
    .attr("width", B.view.w)
    .attr("height", B.view.h + B.view.w / 6 / 60);
  
  B.view.aggregate = B.view.chart.append("g")
    .attr("id", "aggregate")
    .attr("width", B.view.w)
    .attr("height", B.view.h - B.view.w / 2 / 60);
  B.view.aggregate.append("g")
    .attr("id", "sandtimer");
  B.view.aggregate.select("g#sandtimer").selectAll("rect")
    .data([60])
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", B.view.w * 5/6 / 60);
  
  B.view.totals = B.view.aggregate.append("g")
    .attr("id", "totals");
  B.view.totals.append("g")
    .attr("id", "bars")
  B.view.totals.select("g#bars").selectAll("rect")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill", function (d, i) { return B.color(i).val })
    .on("mouseover", B.view.events.trmr)
    .on("mouseout", B.view.events.trmt);
  B.view.totals.append("g")
    .attr("id", "count");
  B.view.totals.select("g#count").selectAll("text")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("fill", "white");
  B.view.totals.append("g")
    .attr("id", "label");
  B.view.totals.select("g#label").selectAll("text")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif");
  B.view.totals.append("g")
    .attr("id", "quantile");
  B.view.totals.select("g#quantile").selectAll("rect")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill", function (d, i) { return B.color(i).val })
    .attr("y", 0)
    .attr("height", B.view.w * 5/6 / 60 - 1)
    .on("mouseover", B.view.events.trmr)
    .on("mouseout", B.view.events.trmt);
  B.view.totals.select("g#quantile").selectAll("text")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", Math.floor(B.view.w / 2 / 60) + "px")
    .attr("fill", function (d, i) { return B.color(i).ccon.val })
    .attr("y", B.view.w * 5/12 / 60);
  
  B.view.follows = B.view.aggregate.append("g")
    .attr("id", "follows");
  B.view.follows.selectAll("rect")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill-opacity", .4)
    .attr("fill", "black");
  B.view.follows.selectAll("text")
    .data(B.data.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("fill", "white");
  
  B.view.timeseries = B.view.chart.append("g")
    .attr("id", "timeseries")
    .attr("width", B.view.w)
    .attr("height", B.view.h - B.view.w / 2 / 60);
  
  B.view.presses = B.view.timeseries.append("g")
    .attr("id", "presses");
  B.view.presses.append("g")
    .attr("id", "current");
  B.view.presses.select("g#current").selectAll("rect")
    .data([0,0])
    .enter()
    .append("rect");
  B.view.presses.append("g")
    .attr("id", "pindv");
  B.view.presses.append("g")
    .attr("id", "psecs");
  B.view.ptip = B.view.presses.append("g")
    .attr("id", "ptip");
  B.view.ptip.append("g")
    .attr("id", "border");
  
  B.view.timer = B.view.chart.append("g")
    .attr("id", "timer");
  B.view.timer.append("rect")
    .attr("x", B.view.w - 180)
    .attr("y", 14)
    .attr("width", 180)
    .attr("height", 88)
    .attr("fill", "white")
    .attr("fill-opacity", .5)
  B.view.timer.selectAll("text")
    .data(["?"])
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", "72px")
    .attr("x", B.view.w - 20)
    .attr("y", 64)
    .text("?");
  
  B.view.legend = B.view.chart.append("g")
    .attr("id", "legend");
  B.view.legend.append("rect")
    .attr("x", B.view.w - 100)
    .attr("y", 116)
    .attr("width", 100)
    .attr("height", 240)
    .attr("fill", "white")
    .attr("fill-opacity", .5)
    .on("mouseover", B.view.events.lmr)
    .on("mouseout", B.view.events.lmt);
  B.view.legend.selectAll("circle")
    .data(B.data.ucolors)
    .enter()
    .append("circle")
    .attr("r", 7.5)
    .attr("cx", B.view.w - 65)
    .attr("cy", function (d, i) { return 140 + 20 * i })
    .attr("fill", function (d) { return d })
    .on("mouseover", B.view.events.lcmr)
    .on("mouseout", B.view.events.lcmt);
  B.view.legend.append("g")
    .attr("id", "acount");
  B.view.legend.select("g#acount").selectAll("text")
    .data([0,0,0,0,0,0,0,0,0,0])
    .enter()
    .append("text")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", B.view.w - 50)
    .attr("y", function (d, i) { return 140 + 20 * i });
  B.view.legend.append("g")
    .attr("id", "pcount");
  B.view.legend.select("g#pcount").selectAll("text")
    .data([0,0,0,0,0,0,0])
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", B.view.w - 80)
    .attr("y", function (d, i) { return i == 6 ? 140 : 280 - 20 * i })
    .attr("fill", function (d, i) { return B.color(B.data.ucolors[i == 6 ? 0 : 7 - i]).darken.val })
    .attr("display", "none");
  B.view.legend.append("g")
    .attr("id", "ltip");
  B.view.legend.select("g#ltip")
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", B.view.w - 50)
    .attr("y", 340)
    .text(Array(16).join("\u00a0"))
    .on("mouseover", B.view.events.ltmr)
    .on("mouseout", B.view.events.ltmt)
    .on("click", B.view.events.ltc);
  
  B.view.charts.forEach(function (d, i) { !i || B.view[d].attr("display", "none") });
  
  //Establish websocket connection to the button
  B.util.buttonjax(function (resp) {
    var wsurl, ws
    wsurl = /wss:\/\/wss[^"]+/.exec(resp)[0];
    ws = new WebSocket(wsurl||"wss://wss.redditmedia.com/thebutton?h=f29c65c5190049201b3dd46254aa01c89c5adefc&e=1428897437");
    ws.onmessage = B.util.tick;
  });

  //Begin polling r/thebutton for active user count
  B.util.triggerinterval();
  
  //Check to correct polling phase
  setInterval(function () {B.interval.test = "init"}, 600000)
}