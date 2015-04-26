init = function () {
  var
    D = { //Data
      types: [
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
      colors: [
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
      cmltots: Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0),
      typetots: [0, 0, 0, 0, 0, 0, 0],
      foll: Array.apply(null, Array(61)).map(function(){return Array.apply(null, Array(61)).map(Number.prototype.valueOf, 0)}),
      last: null,
      rbtn: function () {return D.types.reduce(function(o, v) { o[v] = 0; return o }, {})},
      araw: new Array //TODO: timestamping
    },

    I = { //Interval
      val: 10000,
      id: null,
      adj: false,
      test: null,
      dt: [[], ],

      //Polls r/thebutton for active user count, attempting to minimise bandwidth
      trigger: function (val) {
        !I.id || window.clearInterval(I.id);
        I.adj = !!val;
        I.id = window.setInterval(function () {
          U.buttonjax(U.active);
          if (I.adj) {
            I.adj = false;
            I.trigger()
          }
        }, val||I.val)
      },
      monitor: function () {
        var l = D.araw.length;
        if (this.val==10000) {
          if (l > 1 && !U.arawcomp(D.araw[l-1], D.araw[l-2])) {
            I.val = 64500; //Active users refresh rate (??)
            I.trigger(90000)
          }
        } else {
          if (!!I.test) {
            if (I.test == "init") {
              I.trigger(54000);
              I.test = new Array;
              return
            }
            I.test.push(D.araw[l - 1]);
            if (I.test.length == 3) {
              if (!U.arawcomp(I.test[0], I.test[1])) { I.trigger(90000) }
              else if (!U.arawcomp(I.test[1], I.test[2])) { I.trigger(80000) }
              else { I.trigger(54000) }
              I.test = null
            } else { I.trigger(10000) }
          }
        }
      }

    },

    C = function (c) { //Colour
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
        mix: function (v) { return this.nmix(v, .5) },
        nmix: function (v, a) {
          color = color.map(function(c, i) { return Math.floor( lookup(v)[i] * a + c * (1 - a) ) });
          return this
        }
      }
    },

    U = { //Utilities
      //Ajax call to r/thebutton
      buttonjax: function (callback) {
        var raw = new XMLHttpRequest();
        raw.onreadystatechange = function () {
          if (raw.readyState !== 4) return;
          if (raw.status === 200) callback(raw.responseText)
        }
        //Credit to github.com/lezed1 for the proxy.
        raw.open("get", "https://cors-unblocker.herokuapp.com/get?url=https%3A%2F%2Freddit.com%2Fr%2Fthebutton", true);
        raw.timeout = 5000;
        raw.send()
      },

      //Update pressers data
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
        if ((U.prev||(U.prev = {})).np && curr.np != U.prev.np) {
          D.raw.push([ts = D.last, dp = curr.np - U.prev.np, curr.dt]);
          D.tots[ts] += dp;
          D.typetots[Math.floor(ts / 10 - .2)] += dp;
          D.typetots[6] += dp;
          (function (i) { for (;i >= 0; i--) D.cmltots[i] += dp })(ts - 1);
          if (D.raw.length > 1) D.foll[D.raw[D.raw.length - 2][0]][ts] += dp;
        }

        //Render charts
        V.chart = d3.select("#chart")
          .attr("width", V.w)
          .attr("height", V.h + V.w / 6 / 60);
        if (I.warn) {
          clearInterval(I.warn);
          delete I.warn;
          V.timer.selectAll("rect")
            .attr("fill", "white")
            .on("mouseover", null)
            .on("mouseout", null);
          V.legend.select("g#ltip").selectAll("text")
            .text(Array(16).join("\xa0"))
        }
        V.timer.selectAll("text")
          .attr("x", V.w - 20);
        V.legend.select("g#pcount").selectAll("text")
          .data(D.typetots)
          .text(function (d, i) { return (!D.cmltots[0] || i == 6 ? "" : "(" + (100 * d / D.cmltots[0]).toFixed(2) + "%) ") + d });
        V.legend.append("rect")
          .attr("x", V.w - 100);
        V.legend.selectAll("circle")
          .attr("cx", V.w - 65);
        V.legend.select("g#acount").selectAll("text")
          .attr("x", V.w - 50);
        V.legend.select("g#pcount").selectAll("text")
          .attr("x", V.w - 80);
        V.legend.select("g#ltip")
          .attr("x", V.w - 50);

        if (V.charts[0] == "aggregate") {

          //Aggregate chart
          V.aggregate
            .attr("width", V.w)
            .attr("height", V.pressh);
          if (curr.ts >= U.prev.ts) {
            V.aggregate.select("g#sandtimer").selectAll("rect")
              .transition()
              .duration(0)
              .attr("width", 0)
              .attr("height", V.pressh)
              .attr("fill", "#820080")
              .attr("fill-opacity", .2)
            d3.timer.flush()
          }
          V.aggregate.select("g#sandtimer").selectAll("rect")
            .data([curr.ts])
            .attr("style", function (d) {return "fill: " + C(d - 1).val + "; fill-opacity: .2"})
            .attr("y", V.w * 5/6 / 60)
            .attr("height", V.pressh)
            .transition()
            .duration(1000)
            .ease("linear")
            .attr("width", function (d) {return V.w - (d - 1) * V.w / 60});

          V.totals.select("g#bars").selectAll("rect")
            .data(D.tots.slice(1, 61))
            .transition()
            .attr("x", function (d, i) {return V.w - (i + 1) * V.w / 60})
            .attr("y", function (d) {return V.pressh - d * V.unit + V.w * 5/6 / 60})
            .attr("width", V.w/60 - 1)
            .attr("height", function (d) {return d * V.unit});        
          V.totals.select("g#count").selectAll("text")
            .data(D.tots.slice(1, 61))
            .transition()
            .text(function (d) { return d })
            .attr("font-size", Math.floor(V.w / 2 / 60) + "px")
            .attr("fill", function (d, i) {
              return !d || V.mbar !== null && i != V.mbar - 1 ? "transparent" : d * V.unit > V.w * 5/6 / 60 ? C(i).ccon.val : "black"
            })
            .attr("x", function (d, i) {return V.w - (i + .5) * V.w / 60 - .5})
            .attr("y", function (d) {
              var base = V.pressh - d * V.unit + V.w * 3/2 / 60;
              return !d || d * V.unit > V.w * 5/6 / 60 ? base : base - V.w * 5/6 / 60
            });
          V.totals.select("g#label").selectAll("text")
            .data(D.tots.slice(1, 61))
            .text(function (d, i) { return i + 1 })
            .attr("font-size", Math.floor(V.w / 2 / 60) + "px")
            .attr("x", function (d, i) {return V.w - (i + .5) * V.w / 60 - .5})
            .attr("y", V.pressh + V.w * 3/2 / 60);
          V.totals.select("g#quantile").selectAll("rect")
            .data(D.cmltots)
            .transition()
            .attr("x", function (d, i) { return (d - D.tots[i+1]) * V.w / Math.max(D.cmltots[0], 1) })
            .attr("width", function (d, i) { return Math.max( D.tots[i+1] * V.w / Math.max(D.cmltots[0], 1) - 1, 0) })
            .attr("height", V.w * 5/6 / 60 - 1);
          V.totals.select("g#quantile").selectAll("text")
            .data(D.cmltots)
            .text(function (d, i) { return D.tots[i+1] || null })
            .transition()
            .attr("font-size", Math.floor(V.w / 2 / 60) + "px")
            .attr("x", function (d, i) {
              return d * V.w / Math.max(D.cmltots[0], 1) - Math.min(
                V.w / 60,
                D.tots[i+1] * V.w / Math.max(D.cmltots[0], 1) + 1
              ) / 2
            })
            .attr("y", V.w * 5/12 / 60)

          V.follows.selectAll("rect")
            .data(
              V.mbar === null ?
                Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0) :
                D.foll[V.mbar].slice(1, 61)
            )
            .transition()
            .attr("y", function (d) {return V.pressh - d * V.unit + V.w * 5/6 / 60})
            .attr("height", function (d) {return d * V.unit});
          V.follows.selectAll("text")
            .data(
              V.mbar === null ?
                Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0) :
                D.foll[V.mbar].slice(1, 61)
            )
            .attr("fill", function (d, i) {
              var b = C(i);
              i == V.mbar - 1 || b.fade;
              d * V.unit >= V.w * 5/6 / 60 || b.ndarken(.4);
              return d ? b.ccon.val : "transparent"
            })
            .transition()
            .text(function (d) { return d })
            .attr("y", function (d) {
              var base = V.pressh - d * V.unit + V.w * 3/2 / 60;
              return V.mbar === null ? V.h + 20 : !d || d * V.unit > V.w * 5/6 / 60 ? base : base - V.w * 5/6 / 60
            });

        } else if (V.charts[0] == "timeseries") {

          //Time-series chart
          V.presses.select("g#pindv").selectAll("g")
            .data(D.raw)
            .enter()
            .insert("g", ":first-child")
            .each(V.events.pe)
            .on("mouseover", V.events.pr)
            .on("mouseout", V.events.pt);
          var
            d0 = [curr.ts, curr.dt],
            s = new Date(d0[1]).getSeconds();
          if (curr.ts >= U.prev.ts) {
            V.presses.select("g#current").selectAll("rect")
              .transition()
              .duration(0)
              .attr("x", function (d, i) {return i ? 0 : V.w * ((s + d0[0]) % 60) / 60})
              .attr("y", function (d, i) {
                return 1 + V.munit * (
                   !D.raw.length ? i : i + Math.floor(( d0[1] - 1000*(61 - d0[0]) ) / 60000)
                  - Math.floor(( D.raw[0][2] - 1000*(61 - D.raw[0][0]) ) / 60000)
                )
              })
              .attr("width", 0)
              .attr("fill", "#820080")
            d3.timer.flush()
          }
          V.presses.select("g#current").selectAll("rect")
            .data(s > 60 - d0[0] ? [61 - d0[0], 0] : [60 - d0[0] - s, s + 1])
            .attr("fill", C(d0[0] - 1).val)
            .transition()
            .duration(1000)
            .ease("linear")
            .attr("x", function (d, i) {return i ? 0 : V.w * ((s + d0[0]) % 60) / 60})
            .attr("y", function (d, i) {
              return 1 + V.munit * (
                 !D.raw.length ? i : i + Math.floor(( d0[1] - 1000*(61 - d0[0]) ) / 60000)
                - Math.floor(( D.raw[0][2] - 1000*(61 - D.raw[0][0]) ) / 60000)
              )
            })
            .attr("width", function(d, i) {return !i || d ? Math.max(d * V.w/60 - 1, 0) : 0})
            .attr("height", V.munit - 1);
          V.presses.select("g#psecs").selectAll("text")
            .data(D.raw)
            .enter()
            .append("text")
            .text(function (d) { return d[0] })
            .attr("x", function (d) { return V.w * (new Date(d[2]-1000).getSeconds() + .5) / 60 } )
            .attr("y", function (d) {
              return 1 + V.munit * (
                Number(new Date(d[2]-1000).getSeconds() < 60 - d[0]) + .5 + Math.floor(( d[2] - 1000*(61 - d[0]) ) / 60000)
                - Math.floor(( D.raw[0][2] - 1000*(61 - D.raw[0][0]) ) / 60000)
              )
            })
            .attr("font-size", Math.max( Math.floor(Math.min( V.w / 120, V.munit / 2 )), 5) + "px")
            .attr("alignment-baseline", "central")
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("fill", function(d) { return C(d[0] - 1).op.ccon.val })
            .each(function (d, i) {
              if (i>0 && (new Date(D.raw[i][2]).getSeconds() + D.raw[i][0]) % 60 < new Date(D.raw[i-1][2]).getSeconds() + 1) {
                V.presses.select("g#psecs").selectAll("text:nth-of-type(" + i + ")")
                  .attr("fill", C(D.raw[i][0] - 1).op.mix(D.raw[i-1][0] - 1).ccon.val)
              }
            })
        }

        U.prev = curr;
        D.last = curr.ts

        //Sync timer
        I.dt[1] = 0;
        I.dt[0].push(setInterval(function () {
          while (I.dt[0][1]) clearInterval(I.dt[0].shift());
          V.timer.selectAll("text")
            .data([(D.last - (I.dt[1] += .1)).toFixed(1)])
            .text(function (d) { return d });
          if (Math.abs(I.dt[1] - 2) < 1e-9) setTimeout(U.warn, 0)
        }, 100))
      },
      
      warn: function () {
        V.timer.selectAll("rect")
          .on("mouseover", function () {
            V.legend.select("g#ltip").selectAll("text")
              .text("Connection lost")
          })
          .on("mouseout", function () {
            V.legend.select("g#ltip").selectAll("text")
              .text(Array(16).join("\xa0"))
          });
        I.warn = setInterval(function () {
          V.timer.selectAll("rect")
            .attr("fill", Math.floor(Date.now()/500) % 2 ? "red" : "white")
        }, 500)
      },

      //Update active users data
      active: function (resp) {
        for (var i = 0, r, anew = []; i < 9; i++) {
          anew.push(D.rbtn[D.types[i]] = parseInt(
            (new RegExp("(?:" + D.types[i] + ".{" + (i ? 11 : 94) + "})([0-9,]+)").exec(resp) || [, "0"])[1]
              .replace(/[^0-9]/,'')
          ))
          r = i ? r - anew[i] : anew[i]
        }
        anew.push(D.rbtn["no-flair"] = r);
        V.legend.select("g#acount").selectAll("text")
          .data(anew)
          .text(function (d) { return d });
        switch (D.araw.length != 0) {
          case true: if (U.arawcomp(anew, D.araw[D.araw.length - 1])) break
          default: D.araw.push(anew)
        }
        I.monitor()
      },

      arawcomp: function (a1, a2) {
        for (var i = 0; i < 9; i++) if (a1[i] != a2[i]) break;
        return i == 9
      }
    },

    V = { //Views
      get w() {return window.innerWidth - 40},
      get h() {return window.innerHeight - 40},
      get pressh() {return V.h - V.w * 4/3 / 60},
      get unit() { return V.pressh / (Math.max.apply(null, D.tots) || 1) },
      mbar: null,
      mpress: null,
      charts: ["timeseries", "aggregate"],//["aggregate", "timeseries"],
      munit: 20,
      events: {
        trmr: function (d0, i0) {
          V.mbar = i0 + 1;
          V.totals.select("g#bars").selectAll("rect")
            .attr("fill", function (d, i) { return i == i0 ? C(i0).val : C(i).fade.val });
          V.totals.select("g#count").selectAll("text")
            .attr("fill", function (d, i) {return !d || i != i0 ? "transparent" : d * V.unit > V.w * 5/6 / 60 ? C(i).ccon.val : "black"});
          V.totals.select("g#quantile").selectAll("rect")
            .attr("fill", function (d, i) { return i == i0 ? C(i0).val : C(i).fade.val });
          V.totals.select("g#quantile").selectAll("text")
            .attr("fill", function (d, i) {return d && i == i0 ? C(i).ccon.val : "transparent"});
          V.follows.selectAll("rect")
            .data(D.foll[V.mbar].slice(1, 61))
            .attr("x", function (d, i) {return V.w - (i + 1) * V.w / 60})
            .attr("y", function (d) {return V.pressh - d * V.unit + V.w * 5/6 / 60})
            .attr("width", V.w/60 - 1)
            .attr("height", function (d) {return d * V.unit});
          V.follows.selectAll("text")
            .data(D.foll[V.mbar].slice(1, 61))
            .text(function (d) { return d })
            .attr("font-size", Math.floor(V.w / 2 / 60) + "px")
            .attr("fill", function (d, i) {
              var b = C(i);
              i != i0 || b.fade;
              d * V.unit <= V.w * 5/6 / 60 || b.ndarken(.4);
              return !d ? "transparent" : b.ccon.val
            })
            .attr("x", function (d, i) {return V.w - (i + .5) * V.w / 60 - .5})
            .attr("y", function (d) {
              var base = V.pressh - d * V.unit + V.w * 3/2 / 60;
              return !d || d * V.unit > V.w * 5/6 / 60 ? base : base - V.w * 5/6 / 60
            });
          V.legend.select("g#ltip").selectAll("text")
            .text("Following presses")
        },
        trmt: function (d0, i0) {
          V.mbar = null;
          V.totals.select("g#bars").selectAll("rect")
            .attr("fill", function (d, i) {return C(i).val});
          V.totals.select("g#count").selectAll("text")
            .attr("fill", function (d, i) {
              return !d ? "transparent" : d * V.unit > V.w * 5/6 / 60 ? C(i).ccon.val : "black"
            });
          V.totals.select("g#quantile").selectAll("rect")
            .attr("fill", function (d, i) { return C(i).val });
          V.totals.select("g#quantile").selectAll("text")
            .attr("fill", function (d, i) { return C(i).ccon.val });
          V.follows.selectAll("rect")
            .data(Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0))
            .attr("y", V.pressh)
            .attr("height", 0)
          V.follows.selectAll("text")
            .data(Array.apply(null, Array(60)).map(Number.prototype.valueOf, 0))
            .attr("y", V.h + 20)
          V.legend.select("g#ltip").selectAll("text")
            .text(Array(16).join("\xa0"))
        },
        lcmr: function (d0, i0) {
          var self = this;
          V.legend.selectAll("circle")
            .data(D.colors)
            .attr("fill", function (d) { return self === this ? d : C(d).nfade(.7).val });
          V.legend.select("g#ltip").selectAll("text")
            .text(function (d, i) { return D.types[i0] });
          V.legend.select("g#pcount").selectAll("text")
            .filter(function (d, i) { return i0 == 0 ? i == 6 : i0 != 1 && i == 7 - i0 })
            .attr("display", "inline");
          V.events.lmr()
        },
        lcmt: function (d0, i0) {
          V.legend.selectAll("circle")
            .data(D.colors)
            .attr("fill", function (d) { return d });
          V.legend.select("g#ltip").selectAll("text")
            .text(Array(16).join("\xa0"));
          V.legend.select("g#pcount").selectAll("text")
            .filter(function (d, i) { return i0 == 0 ? i == 6 : i0 != 1 && i == 7 - i0 })
            .attr("display", "none");
          V.events.lmt()
        },
        ltmr: function () {
          d3.select(this)
            .text("change chart");
          V.legend.select("g#pcount").selectAll("text")
            .transition()
            .delay(250)
            .attr("display", "inline");
          V.events.lmr()
        },
        ltmt: function () {
          d3.select(this)
            .text(Array(16).join("\xa0"));
          V.events.lmt()
        },
        ltc: function () {
          var t = V.charts.shift();
          V[t].attr("display", "none");
          V[V.charts[0]].attr("display", "inline");
          V.charts.push(t)
        },
        lmr: function () {
          V.legend.selectAll("rect")
            .attr("fill-opacity", .8)
            .transition()
            .attr("x", V.w - 180)
            .attr("width", 180);
          V.legend.select("g#ltip").selectAll("text")
            .transition()
            .attr("x", V.w - 65);
          V.timer.selectAll("rect")
            .attr("fill-opacity", .8)
        }, 
        lmt: function () {
          V.legend.selectAll("rect")
            .attr("fill-opacity", .5)
            .transition()
            .attr("x", V.w - 100)
            .attr("width", 100);
          V.legend.select("g#pcount").selectAll("text")
            .attr("display", "none");
          V.legend.select("g#ltip").selectAll("text")
            .transition()
            .attr("x", V.w - 50);
          V.timer.selectAll("rect")
            .attr("fill-opacity", .5)
        },
        pe: function (d0, i0) {
          var
            t = new Date(d0[2]),
            s = t.getSeconds();
          d3.select(this).selectAll("rect")
            .data(function (d, i) { return s > 60 - d0[0] || s == 0 ? [61 - d0[0]] : [61 - d0[0] - s, s] })
            .enter()
            .append("rect")
            .attr("x", function (d, i) {return i ? 0 : V.w * ((s + d0[0] - 1) % 60) / 60})
            .attr("y", function (d, i) {
              return 1 + V.munit * (
                i + Math.floor(( d0[2] - 1000*(61 - d0[0]) ) / 60000)
                - Math.floor(( D.raw[0][2] - 1000*(61 - D.raw[0][0]) ) / 60000)
              )
            })
            .attr("width", function(d, i) {return d * V.w/60 - 1})
            .attr("height", V.munit - 1)
            .attr("fill", C(d0[0] - 1).val)
            .attr("fill-opacity", .5)
            .append("title")
            .text(d0[0] + "s \xd7 " + d0[1] + " | " + t.toLocaleTimeString() + " " + /\(([^)]*)/.exec(t)[1] + " (" + t.toLocaleDateString() + ")")
        },
        pr: function (d0) {
          var
            is = V.presses.select("g#pindv").selectAll("g")[0],
            i0 = is.length - 1 - is.indexOf(this),
            d0 = d3.select(V.presses.select("g#pindv").selectAll("g")[0][i0]).data()[0],
            s = new Date(d0[2]).getSeconds(),
            c = s > 60 - d0[0] || s == 0,
            pd = function (d, i) {
              var
                y = 1 + V.munit * (
                  i + Math.floor(( d0[2] - 1000*(61 - d0[0]) ) / 60000)
                  - Math.floor(( D.raw[0][2] - 1000*(61 - D.raw[0][0]) ) / 60000)
                ),
                p = "M" + ((V.w * (i ? 0 : c ? (s + 59) % 60 + 1 : 60) / 60) - 1 - .5 * i) + " " + (y - .5) +
                  " h " + (2*i-1) * (d * V.w/60 - c) +
                  " v " + V.munit +
                  " h " + (1-2*i) * (d * V.w/60 - c);
              return c ? p + " Z" : p;
            };
          V.ptip.select("g#border").selectAll("path")
            .data(function (d, i) { return c ? [61 - d0[0]] : [61 - d0[0] - s, s] })
            .enter()
            .append("path")
            .attr("d", pd)
            .attr("fill", "none")
            .attr("stroke", "black");
          d3.select(this).selectAll("rect").attr("fill-opacity", 1);
          V.presses.select("g#psecs > text:nth-child(" + (i0 + 1) + ")")
            .attr("fill", C(d0[0] - 1).ccon.val);
          if (!i0 || (new Date(D.raw[i0][2]).getSeconds() + D.raw[i0][0]) % 60 > new Date(D.raw[i0-1][2]).getSeconds()) return;
          V.presses.select("g#psecs > text:nth-child(" + i0 + ")")
            .attr("fill", C(d0[0]).mix(d0[0] - 1).ccon.val)
            .attr("opacity", .3)
        },
        pt: function () {
          var
            is = V.presses.select("g#pindv").selectAll("g")[0],
            i0 = is.length - 1 - is.indexOf(this),
            d0 = d3.select(V.presses.select("g#pindv").selectAll("g")[0][i0]).data()[0];
          V.ptip.select("g#border").selectAll("path")
            .data([])
            .exit()
            .remove();
          d3.select(this).selectAll("rect").attr("fill-opacity", .5);
          V.presses.select("g#psecs > text:nth-child(" + (i0 + 1) + ")")
            .attr("fill", C(d0[0] - 1).op.ccon.val);
          if (!i0 || (new Date(D.raw[i0][2]).getSeconds() + D.raw[i0][0]) % 60 > new Date(D.raw[i0-1][2]).getSeconds()) return;
          V.presses.select("g#psecs > text:nth-child(" + i0 + ")")
            .each(function (d) { d1 = d })
            .attr("fill", C(d1[0]).op.mix(d0[0]).ccon.val)
            .attr("opacity", null);
          V.mpress = null
        }
      }
    };
  
  //Initialise chart
  V.chart = d3.select("#chart")
    .attr("width", V.w)
    .attr("height", V.h + V.w / 6 / 60);
  
  V.aggregate = V.chart.append("g")
    .attr("id", "aggregate")
    .attr("width", V.w)
    .attr("height", V.h - V.w / 2 / 60);
  V.aggregate.append("g")
    .attr("id", "sandtimer");
  V.aggregate.select("g#sandtimer").selectAll("rect")
    .data([60])
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", V.w * 5/6 / 60);
  
  V.totals = V.aggregate.append("g")
    .attr("id", "totals");
  V.totals.append("g")
    .attr("id", "bars")
  V.totals.select("g#bars").selectAll("rect")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill", function (d, i) { return C(i).val })
    .on("mouseover", V.events.trmr)
    .on("mouseout", V.events.trmt);
  V.totals.append("g")
    .attr("id", "count");
  V.totals.select("g#count").selectAll("text")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("fill", "white");
  V.totals.append("g")
    .attr("id", "label");
  V.totals.select("g#label").selectAll("text")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif");
  V.totals.append("g")
    .attr("id", "quantile");
  V.totals.select("g#quantile").selectAll("rect")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill", function (d, i) { return C(i).val })
    .attr("y", 0)
    .attr("height", V.w * 5/6 / 60 - 1)
    .on("mouseover", V.events.trmr)
    .on("mouseout", V.events.trmt);
  V.totals.select("g#quantile").selectAll("text")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", Math.floor(V.w / 2 / 60) + "px")
    .attr("fill", function (d, i) { return C(i).ccon.val })
    .attr("y", V.w * 5/12 / 60);
  
  V.follows = V.aggregate.append("g")
    .attr("id", "follows");
  V.follows.selectAll("rect")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("rect")
    .attr("fill-opacity", .4)
    .attr("fill", "black");
  V.follows.selectAll("text")
    .data(D.tots.slice(1, 61))
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("fill", "white");
  
  V.timeseries = V.chart.append("g")
    .attr("id", "timeseries")
    .attr("width", V.w)
    .attr("height", V.h - V.w / 2 / 60);
  
  V.presses = V.timeseries.append("g")
    .attr("id", "presses");
  V.presses.append("g")
    .attr("id", "current");
  V.presses.select("g#current").selectAll("rect")
    .data([0,0])
    .enter()
    .append("rect");
  V.presses.append("g")
    .attr("id", "pindv");
  V.presses.append("g")
    .attr("id", "psecs");
  V.ptip = V.presses.append("g")
    .attr("id", "ptip");
  V.ptip.append("g")
    .attr("id", "border");
  
  V.timer = V.chart.append("g")
    .attr("id", "timer");
  V.timer.append("rect")
    .attr("x", V.w - 180)
    .attr("y", 14)
    .attr("width", 180)
    .attr("height", 88)
    .attr("fill", "white")
    .attr("fill-opacity", .5)
  V.timer.selectAll("text")
    .data(["?"])
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", "72px")
    .attr("x", V.w - 20)
    .attr("y", 64)
    .text("?");
  
  V.legend = V.chart.append("g")
    .attr("id", "legend");
  V.legend.append("rect")
    .attr("x", V.w - 100)
    .attr("y", 116)
    .attr("width", 100)
    .attr("height", 240)
    .attr("fill", "white")
    .attr("fill-opacity", .5)
    .on("mouseover", V.events.lmr)
    .on("mouseout", V.events.lmt);
  V.legend.selectAll("circle")
    .data(D.colors)
    .enter()
    .append("circle")
    .attr("r", 7.5)
    .attr("cx", V.w - 65)
    .attr("cy", function (d, i) { return 140 + 20 * i })
    .attr("fill", function (d) { return d })
    .on("mouseover", V.events.lcmr)
    .on("mouseout", V.events.lcmt);
  V.legend.append("g")
    .attr("id", "acount");
  V.legend.select("g#acount").selectAll("text")
    .data([0,0,0,0,0,0,0,0,0,0])
    .enter()
    .append("text")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", V.w - 50)
    .attr("y", function (d, i) { return 140 + 20 * i });
  V.legend.append("g")
    .attr("id", "pcount");
  V.legend.select("g#pcount").selectAll("text")
    .data(D.typetots)
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", V.w - 80)
    .attr("y", function (d, i) { return i == 6 ? 140 : 280 - 20 * i })
    .attr("fill", function (d, i) { return C(D.colors[i == 6 ? 0 : 7 - i]).darken.val })
    .attr("display", "none");
  V.legend.append("g")
    .attr("id", "ltip");
  V.legend.select("g#ltip")
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", "12px")
    .attr("x", V.w - 50)
    .attr("y", 340)
    .text(Array(16).join("\xa0"))
    .on("mouseover", V.events.ltmr)
    .on("mouseout", V.events.ltmt)
    .on("click", V.events.ltc);
  
  V.charts.forEach(function (d, i) { !i || V[d].attr("display", "none") });
  
  //Establish websocket connection to the button
  U.buttonjax(function (resp) {
    var wsurl, ws
    wsurl = /wss:\/\/wss[^"]+/.exec(resp)[0];
    ws = new WebSocket(wsurl||"wss://wss.redditmedia.com/thebutton?h=f29c65c5190049201b3dd46254aa01c89c5adefc&e=1428897437");
    ws.onmessage = U.tick;
  });

  //Begin polling r/thebutton for active user count
  I.trigger();
  
  //Check to correct polling phase
  setInterval(function () {I.test = "init"}, 600000)
}