;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AnimatorClasses, BezierCurveAnimator, Config, Defaults, EventEmitter, Frame, LinearAnimator, SpringDHOAnimator, SpringRK4Animator, Utils, _, _runningAnimations,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("./Underscore")._;

Utils = require("./Utils");

Config = require("./Config").Config;

Defaults = require("./Defaults").Defaults;

EventEmitter = require("./EventEmitter").EventEmitter;

Frame = require("./Frame").Frame;

LinearAnimator = require("./Animators/LinearAnimator").LinearAnimator;

BezierCurveAnimator = require("./Animators/BezierCurveAnimator").BezierCurveAnimator;

SpringRK4Animator = require("./Animators/SpringRK4Animator").SpringRK4Animator;

SpringDHOAnimator = require("./Animators/SpringDHOAnimator").SpringDHOAnimator;

AnimatorClasses = {
  "linear": LinearAnimator,
  "bezier-curve": BezierCurveAnimator,
  "spring-rk4": SpringRK4Animator,
  "spring-dho": SpringDHOAnimator
};

AnimatorClasses["spring"] = AnimatorClasses["spring-rk4"];

AnimatorClasses["cubic-bezier"] = AnimatorClasses["bezier-curve"];

_runningAnimations = [];

exports.Animation = (function(_super) {
  __extends(Animation, _super);

  Animation.runningAnimations = function() {
    return _runningAnimations;
  };

  function Animation(options) {
    if (options == null) {
      options = {};
    }
    this.start = __bind(this.start, this);
    options = Defaults.getDefaults("Animation", options);
    Animation.__super__.constructor.call(this, options);
    this.options = Utils.setDefaultProperties(options, {
      layer: null,
      properties: {},
      curve: "linear",
      curveOptions: {},
      time: 1,
      repeat: 0,
      delay: 0,
      debug: true
    });
    if (options.layer === null) {
      console.error("Animation: missing layer");
    }
    if (options.origin) {
      console.warn("Animation.origin: please use layer.originX and layer.originY");
    }
    if (options.properties instanceof Frame) {
      option.properties = option.properties.properties;
    }
    this.options.properties = this._filterAnimatableProperties(this.options.properties);
    this._parseAnimatorOptions();
    this._originalState = this._currentState();
    this._repeatCounter = this.options.repeat;
  }

  Animation.prototype._filterAnimatableProperties = function(properties) {
    var animatableProperties, k, v;
    animatableProperties = {};
    for (k in properties) {
      v = properties[k];
      if (_.isNumber(v)) {
        animatableProperties[k] = v;
      }
    }
    return animatableProperties;
  };

  Animation.prototype._currentState = function() {
    return _.pick(this.options.layer, _.keys(this.options.properties));
  };

  Animation.prototype._animatorClass = function() {
    var animatorClassName, parsedCurve;
    parsedCurve = Utils.parseFunction(this.options.curve);
    animatorClassName = parsedCurve.name.toLowerCase();
    if (AnimatorClasses.hasOwnProperty(animatorClassName)) {
      return AnimatorClasses[animatorClassName];
    }
    return LinearAnimator;
  };

  Animation.prototype._parseAnimatorOptions = function() {
    var animatorClass, i, k, parsedCurve, value, _base, _i, _j, _len, _len1, _ref, _ref1, _results;
    animatorClass = this._animatorClass();
    parsedCurve = Utils.parseFunction(this.options.curve);
    if (animatorClass === LinearAnimator || animatorClass === BezierCurveAnimator) {
      if (_.isString(this.options.curveOptions) || _.isArray(this.options.curveOptions)) {
        this.options.curveOptions = {
          values: this.options.curveOptions
        };
      }
      if ((_base = this.options.curveOptions).time == null) {
        _base.time = this.options.time;
      }
    }
    if (parsedCurve.args.length) {
      if (animatorClass === BezierCurveAnimator) {
        this.options.curveOptions.values = parsedCurve.args.map(function(v) {
          return parseFloat(v) || 0;
        });
      }
      if (animatorClass === SpringRK4Animator) {
        _ref = ["tension", "friction", "velocity"];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          k = _ref[i];
          value = parseFloat(parsedCurve.args[i]);
          if (value) {
            this.options.curveOptions[k] = value;
          }
        }
      }
      if (animatorClass === SpringDHOAnimator) {
        _ref1 = ["stiffness", "damping", "mass", "tolerance"];
        _results = [];
        for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
          k = _ref1[i];
          value = parseFloat(parsedCurve.args[i]);
          if (value) {
            _results.push(this.options.curveOptions[k] = value);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    }
  };

  Animation.prototype.start = function() {
    var AnimatorClass, k, start, stateA, stateB, target, v, _ref,
      _this = this;
    AnimatorClass = this._animatorClass();
    console.debug("Animation.start " + AnimatorClass.name, this.options.curveOptions);
    this._animator = new AnimatorClass(this.options.curveOptions);
    target = this.options.layer;
    stateA = this._currentState();
    stateB = {};
    _ref = this.options.properties;
    for (k in _ref) {
      v = _ref[k];
      if (stateA[k] !== v) {
        stateB[k] = v;
      }
    }
    if (_.isEqual(stateA, stateB)) {
      console.warn("Nothing to animate");
    }
    console.debug("Animation.start");
    for (k in stateB) {
      v = stateB[k];
      console.debug("\t" + k + ": " + stateA[k] + " -> " + stateB[k]);
    }
    this._animator.on("start", function() {
      return _this.emit("start");
    });
    this._animator.on("stop", function() {
      return _this.emit("stop");
    });
    this._animator.on("end", function() {
      return _this.emit("end");
    });
    if (this._repeatCounter > 0) {
      this._animator.on("end", function() {
        for (k in stateA) {
          v = stateA[k];
          target[k] = v;
        }
        _this._repeatCounter--;
        return _this.start();
      });
    }
    this._animator.on("tick", function(value) {
      for (k in stateB) {
        v = stateB[k];
        target[k] = Utils.mapRange(value, 0, 1, stateA[k], stateB[k]);
      }
    });
    start = function() {
      _runningAnimations.push(_this);
      return _this._animator.start();
    };
    if (this.options.delay) {
      return Utils.delay(this.options.delay, start);
    } else {
      return start();
    }
  };

  Animation.prototype.stop = function() {
    this._animator.stop();
    return _runningAnimations = _.without(_runningAnimations, this);
  };

  Animation.prototype.reverse = function() {
    var animation, options;
    options = _.clone(this.options);
    options.properties = this._originalState;
    animation = new Animation(options);
    return animation;
  };

  Animation.prototype.revert = function() {
    return this.reverse();
  };

  Animation.prototype.inverse = function() {
    return this.reverse();
  };

  Animation.prototype.invert = function() {
    return this.reverse();
  };

  Animation.prototype.emit = function(event) {
    Animation.__super__.emit.apply(this, arguments);
    return this.options.layer.emit(event, this);
  };

  return Animation;

})(EventEmitter);


},{"./Animators/BezierCurveAnimator":4,"./Animators/LinearAnimator":5,"./Animators/SpringDHOAnimator":6,"./Animators/SpringRK4Animator":7,"./Config":10,"./Defaults":12,"./EventEmitter":13,"./Frame":15,"./Underscore":22,"./Utils":23}],2:[function(require,module,exports){
var AnimationLoop, AnimationLoopIndexKey, Config, EventEmitter, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

Config = require("./Config").Config;

EventEmitter = require("./EventEmitter").EventEmitter;

AnimationLoopIndexKey = "_animationLoopIndex";

AnimationLoop = {
  debug: false,
  _animators: [],
  _running: false,
  _frameCounter: 0,
  _sessionTime: 0,
  _start: function() {
    if (AnimationLoop._running) {
      return;
    }
    if (!AnimationLoop._animators.length) {
      return;
    }
    AnimationLoop._running = true;
    AnimationLoop._time = Utils.getTime();
    AnimationLoop._sessionTime = 0;
    return window.requestAnimationFrame(AnimationLoop._tick);
  },
  _stop: function() {
    console.debug("AnimationLoop._stop");
    return AnimationLoop._running = false;
  },
  _tick: function() {
    var animator, delta, removeAnimators, time, _i, _j, _len, _len1, _ref;
    if (!AnimationLoop._animators.length) {
      return AnimationLoop._stop();
    }
    if (AnimationLoop._sessionTime === 0) {
      console.debug("AnimationLoop._start");
    }
    AnimationLoop._frameCounter++;
    time = Utils.getTime();
    delta = time - AnimationLoop._time;
    AnimationLoop._sessionTime += delta;
    removeAnimators = [];
    _ref = AnimationLoop._animators;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      animator = _ref[_i];
      animator.emit("tick", animator.next(delta));
      if (animator.finished()) {
        animator.emit("tick", 1);
        removeAnimators.push(animator);
      }
    }
    AnimationLoop._time = time;
    for (_j = 0, _len1 = removeAnimators.length; _j < _len1; _j++) {
      animator = removeAnimators[_j];
      AnimationLoop.remove(animator);
      animator.emit("end");
    }
    window.requestAnimationFrame(AnimationLoop._tick);
  },
  add: function(animator) {
    if (animator.hasOwnProperty(AnimationLoopIndexKey)) {
      return;
    }
    animator[AnimationLoopIndexKey] = AnimationLoop._animators.push(animator);
    animator.emit("start");
    return AnimationLoop._start();
  },
  remove: function(animator) {
    AnimationLoop._animators = _.without(AnimationLoop._animators, animator);
    return animator.emit("stop");
  }
};

exports.AnimationLoop = AnimationLoop;


},{"./Config":10,"./EventEmitter":13,"./Underscore":22,"./Utils":23}],3:[function(require,module,exports){
var AnimationLoop, Config, EventEmitter, Utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("./Utils");

Config = require("./Config").Config;

EventEmitter = require("./EventEmitter").EventEmitter;

AnimationLoop = require("./AnimationLoop").AnimationLoop;

exports.Animator = (function(_super) {
  __extends(Animator, _super);

  "The animator class is a very simple class that\n	- Takes a set of input values at setup({input values})\n	- Emits an output value for progress (0 -> 1) in value(progress)";

  function Animator(options) {
    if (options == null) {
      options = {};
    }
    this.setup(options);
  }

  Animator.prototype.setup = function(options) {
    throw Error("Not implemented");
  };

  Animator.prototype.next = function(delta) {
    throw Error("Not implemented");
  };

  Animator.prototype.finished = function() {
    throw Error("Not implemented");
  };

  Animator.prototype.start = function() {
    return AnimationLoop.add(this);
  };

  Animator.prototype.stop = function() {
    return AnimationLoop.remove(this);
  };

  return Animator;

})(EventEmitter);


},{"./AnimationLoop":2,"./Config":10,"./EventEmitter":13,"./Utils":23}],4:[function(require,module,exports){
var Animator, BezierCurveDefaults, UnitBezier, Utils, _, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("../Underscore")._;

Utils = require("../Utils");

Animator = require("../Animator").Animator;

BezierCurveDefaults = {
  "linear": [0, 0, 1, 1],
  "ease": [.25, .1, .25, 1],
  "ease-in": [.42, 0, 1, 1],
  "ease-out": [0, 0, .58, 1],
  "ease-in-out": [.42, 0, .58, 1]
};

exports.BezierCurveAnimator = (function(_super) {
  __extends(BezierCurveAnimator, _super);

  function BezierCurveAnimator() {
    _ref = BezierCurveAnimator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  BezierCurveAnimator.prototype.setup = function(options) {
    if (_.isString(options) && BezierCurveDefaults.hasOwnProperty(options.toLowerCase())) {
      options = {
        values: BezierCurveDefaults[options.toLowerCase()]
      };
    }
    if (options.values && _.isString(options.values) && BezierCurveDefaults.hasOwnProperty(options.values.toLowerCase())) {
      options = {
        values: BezierCurveDefaults[options.values.toLowerCase()],
        time: options.time
      };
    }
    if (_.isArray(options) && options.length === 4) {
      options = {
        values: options
      };
    }
    this.options = Utils.setDefaultProperties(options, {
      values: BezierCurveDefaults["ease-in-out"],
      time: 1
    });
    return this._unitBezier = new UnitBezier(this.options.values[0], this.options.values[1], this.options.values[2], this.options.values[3], this._time = 0);
  };

  BezierCurveAnimator.prototype.next = function(delta) {
    this._time += delta;
    if (this.finished()) {
      return 1;
    }
    return this._unitBezier.solve(this._time / this.options.time);
  };

  BezierCurveAnimator.prototype.finished = function() {
    return this._time >= this.options.time;
  };

  return BezierCurveAnimator;

})(Animator);

UnitBezier = (function() {
  UnitBezier.prototype.epsilon = 1e-6;

  function UnitBezier(p1x, p1y, p2x, p2y) {
    this.cx = 3.0 * p1x;
    this.bx = 3.0 * (p2x - p1x) - this.cx;
    this.ax = 1.0 - this.cx - this.bx;
    this.cy = 3.0 * p1y;
    this.by = 3.0 * (p2y - p1y) - this.cy;
    this.ay = 1.0 - this.cy - this.by;
  }

  UnitBezier.prototype.sampleCurveX = function(t) {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  };

  UnitBezier.prototype.sampleCurveY = function(t) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  };

  UnitBezier.prototype.sampleCurveDerivativeX = function(t) {
    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
  };

  UnitBezier.prototype.solveCurveX = function(x) {
    var d2, i, t0, t1, t2, x2;
    t2 = x;
    i = 0;
    while (i < 8) {
      x2 = this.sampleCurveX(t2) - x;
      if (Math.abs(x2) < this.epsilon) {
        return t2;
      }
      d2 = this.sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < this.epsilon) {
        break;
      }
      t2 = t2 - x2 / d2;
      i++;
    }
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;
    if (t2 < t0) {
      return t0;
    }
    if (t2 > t1) {
      return t1;
    }
    while (t0 < t1) {
      x2 = this.sampleCurveX(t2);
      if (Math.abs(x2 - x) < this.epsilon) {
        return t2;
      }
      if (x > x2) {
        t0 = t2;
      } else {
        t1 = t2;
      }
      t2 = (t1 - t0) * .5 + t0;
    }
    return t2;
  };

  UnitBezier.prototype.solve = function(x) {
    return this.sampleCurveY(this.solveCurveX(x));
  };

  return UnitBezier;

})();


},{"../Animator":3,"../Underscore":22,"../Utils":23}],5:[function(require,module,exports){
var Animator, Utils, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

Animator = require("../Animator").Animator;

exports.LinearAnimator = (function(_super) {
  __extends(LinearAnimator, _super);

  function LinearAnimator() {
    _ref = LinearAnimator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LinearAnimator.prototype.setup = function(options) {
    this.options = Utils.setDefaultProperties(options, {
      time: 1
    });
    return this._time = 0;
  };

  LinearAnimator.prototype.next = function(delta) {
    if (this.finished()) {
      return 1;
    }
    this._time += delta;
    return this._time / this.options.time;
  };

  LinearAnimator.prototype.finished = function() {
    return this._time >= this.options.time;
  };

  return LinearAnimator;

})(Animator);


},{"../Animator":3,"../Utils":23}],6:[function(require,module,exports){
var Animator, Utils, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

Animator = require("../Animator").Animator;

exports.SpringDHOAnimator = (function(_super) {
  __extends(SpringDHOAnimator, _super);

  function SpringDHOAnimator() {
    this.finished = __bind(this.finished, this);
    _ref = SpringDHOAnimator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  SpringDHOAnimator.prototype.setup = function(options) {
    this.options = Utils.setDefaultProperties(options, {
      velocity: 0,
      tolerance: 1 / 10000,
      stiffness: 50,
      damping: 2,
      mass: 0.2,
      time: null
    });
    console.log("SpringDHOAnimator.options", this.options, options);
    this._time = 0;
    this._value = 0;
    return this._velocity = this.options.velocity;
  };

  SpringDHOAnimator.prototype.next = function(delta) {
    var F_damper, F_spring, b, k;
    if (this.finished()) {
      return 1;
    }
    this._time += delta;
    k = 0 - this.options.stiffness;
    b = 0 - this.options.damping;
    F_spring = k * (this._value - 1);
    F_damper = b * this._velocity;
    this._velocity += ((F_spring + F_damper) / this.options.mass) * delta;
    this._value += this._velocity * delta;
    return this._value;
  };

  SpringDHOAnimator.prototype.finished = function() {
    return this._time > 0 && Math.abs(this._velocity) < this.options.tolerance;
  };

  return SpringDHOAnimator;

})(Animator);


},{"../Animator":3,"../Utils":23}],7:[function(require,module,exports){
var Animator, Utils, springAccelerationForState, springEvaluateState, springEvaluateStateWithDerivative, springIntegrateState, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

Animator = require("../Animator").Animator;

exports.SpringRK4Animator = (function(_super) {
  __extends(SpringRK4Animator, _super);

  function SpringRK4Animator() {
    this.finished = __bind(this.finished, this);
    _ref = SpringRK4Animator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  SpringRK4Animator.prototype.setup = function(options) {
    this.options = Utils.setDefaultProperties(options, {
      tension: 500,
      friction: 10,
      velocity: 0,
      tolerance: 1 / 10000,
      time: null
    });
    this._time = 0;
    this._value = 0;
    this._velocity = this.options.velocity;
    return this._stopSpring = false;
  };

  SpringRK4Animator.prototype.next = function(delta) {
    var finalVelocity, net1DVelocity, netFloat, netValueIsLow, netVelocityIsLow, stateAfter, stateBefore;
    if (this.finished()) {
      return 1;
    }
    this._time += delta;
    stateBefore = {};
    stateAfter = {};
    stateBefore.x = this._value - 1;
    stateBefore.v = this._velocity;
    stateBefore.tension = this.options.tension;
    stateBefore.friction = this.options.friction;
    stateAfter = springIntegrateState(stateBefore, delta);
    this._value = 1 + stateAfter.x;
    finalVelocity = stateAfter.v;
    netFloat = stateAfter.x;
    net1DVelocity = stateAfter.v;
    netValueIsLow = Math.abs(netFloat) < this.options.tolerance;
    netVelocityIsLow = Math.abs(net1DVelocity) < this.options.tolerance;
    this._stopSpring = netValueIsLow && netVelocityIsLow;
    this._velocity = finalVelocity;
    return this._value;
  };

  SpringRK4Animator.prototype.finished = function() {
    return this._stopSpring;
  };

  return SpringRK4Animator;

})(Animator);

springAccelerationForState = function(state) {
  return -state.tension * state.x - state.friction * state.v;
};

springEvaluateState = function(initialState) {
  var output;
  output = {};
  output.dx = initialState.v;
  output.dv = springAccelerationForState(initialState);
  return output;
};

springEvaluateStateWithDerivative = function(initialState, dt, derivative) {
  var output, state;
  state = {};
  state.x = initialState.x + derivative.dx * dt;
  state.v = initialState.v + derivative.dv * dt;
  state.tension = initialState.tension;
  state.friction = initialState.friction;
  output = {};
  output.dx = state.v;
  output.dv = springAccelerationForState(state);
  return output;
};

springIntegrateState = function(state, speed) {
  var a, b, c, d, dvdt, dxdt;
  a = springEvaluateState(state);
  b = springEvaluateStateWithDerivative(state, speed * 0.5, a);
  c = springEvaluateStateWithDerivative(state, speed * 0.5, b);
  d = springEvaluateStateWithDerivative(state, speed, c);
  dxdt = 1.0 / 6.0 * (a.dx + 2.0 * (b.dx + c.dx) + d.dx);
  dvdt = 1.0 / 6.0 * (a.dv + 2.0 * (b.dv + c.dv) + d.dv);
  state.x = state.x + dxdt * speed;
  state.v = state.v + dvdt * speed;
  return state;
};


},{"../Animator":3,"../Utils":23}],8:[function(require,module,exports){
var CounterKey, DefinedPropertiesKey, DefinedPropertiesValuesKey, EventEmitter, Utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("./Underscore")._;

Utils = require("./Utils");

EventEmitter = require("./EventEmitter").EventEmitter;

CounterKey = "_ObjectCounter";

DefinedPropertiesKey = "_DefinedPropertiesKey";

DefinedPropertiesValuesKey = "_DefinedPropertiesValuesKey";

exports.BaseClass = (function(_super) {
  __extends(BaseClass, _super);

  BaseClass.define = function(propertyName, descriptor) {
    if (this !== BaseClass && descriptor.exportable === true) {
      descriptor.propertyName = propertyName;
      if (this[DefinedPropertiesKey] == null) {
        this[DefinedPropertiesKey] = {};
      }
      this[DefinedPropertiesKey][propertyName] = descriptor;
    }
    Object.defineProperty(this.prototype, propertyName, descriptor);
    return Object.__;
  };

  BaseClass.simpleProperty = function(name, fallback, exportable) {
    if (exportable == null) {
      exportable = true;
    }
    return {
      exportable: exportable,
      "default": fallback,
      get: function() {
        return this._getPropertyValue(name);
      },
      set: function(value) {
        return this._setPropertyValue(name, value);
      }
    };
  };

  BaseClass.prototype._setPropertyValue = function(k, v) {
    return this[DefinedPropertiesValuesKey][k] = v;
  };

  BaseClass.prototype._getPropertyValue = function(k) {
    return Utils.valueOrDefault(this[DefinedPropertiesValuesKey][k], this._getPropertyDefaultValue(k));
  };

  BaseClass.prototype._getPropertyDefaultValue = function(k) {
    return this.constructor[DefinedPropertiesKey][k]["default"];
  };

  BaseClass.prototype._propertyList = function() {
    return this.constructor[DefinedPropertiesKey];
  };

  BaseClass.prototype.keys = function() {
    return _.keys(this.properties);
  };

  BaseClass.define("properties", {
    get: function() {
      var k, properties, v, _ref;
      properties = {};
      _ref = this.constructor[DefinedPropertiesKey];
      for (k in _ref) {
        v = _ref[k];
        if (v.exportable !== false) {
          properties[k] = this[k];
        }
      }
      return properties;
    },
    set: function(value) {
      var k, v, _results;
      _results = [];
      for (k in value) {
        v = value[k];
        if (this.constructor[DefinedPropertiesKey].hasOwnProperty(k)) {
          if (this.constructor[DefinedPropertiesKey].exportable !== false) {
            _results.push(this[k] = v);
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  });

  BaseClass.define("id", {
    get: function() {
      return this._id;
    }
  });

  BaseClass.prototype.toString = function() {
    var properties;
    properties = _.map(this.properties, (function(v, k) {
      return "" + k + ":" + v;
    }), 4);
    return "[" + this.constructor.name + " id:" + this.id + " " + (properties.join(" ")) + "]";
  };

  function BaseClass(options) {
    var _base,
      _this = this;
    if (options == null) {
      options = {};
    }
    this.toString = __bind(this.toString, this);
    this._getPropertyValue = __bind(this._getPropertyValue, this);
    this._setPropertyValue = __bind(this._setPropertyValue, this);
    BaseClass.__super__.constructor.apply(this, arguments);
    this[DefinedPropertiesValuesKey] = {};
    if ((_base = this.constructor)[CounterKey] == null) {
      _base[CounterKey] = 0;
    }
    this.constructor[CounterKey] += 1;
    this._id = this.constructor[CounterKey];
    _.map(this.constructor[DefinedPropertiesKey], function(descriptor, name) {
      return _this[name] = Utils.valueOrDefault(options[name], _this._getPropertyDefaultValue(name));
    });
  }

  return BaseClass;

})(EventEmitter);


},{"./EventEmitter":13,"./Underscore":22,"./Utils":23}],9:[function(require,module,exports){
var CompatImageView, CompatLayer, CompatScrollView, CompatView, Layer, compatProperty, compatWarning, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Layer = require("./Layer").Layer;

compatWarning = function(msg) {
  return console.warn(msg);
};

compatProperty = function(name, originalName) {
  return {
    exportable: false,
    get: function() {
      compatWarning("" + originalName + " is a deprecated property");
      return this[name];
    },
    set: function(value) {
      compatWarning("" + originalName + " is a deprecated property");
      return this[name] = value;
    }
  };
};

CompatLayer = (function(_super) {
  var addSubView, removeSubView;

  __extends(CompatLayer, _super);

  function CompatLayer(options) {
    if (options == null) {
      options = {};
    }
    if (options.hasOwnProperty("superView")) {
      options.superLayer = options.superView;
    }
    CompatLayer.__super__.constructor.call(this, options);
  }

  CompatLayer.define("superView", compatProperty("superLayer", "superView"));

  CompatLayer.define("subViews", compatProperty("subLayers", "subViews"));

  CompatLayer.define("siblingViews", compatProperty("siblingLayers", "siblingViews"));

  addSubView = function(layer) {
    return this.addSubLayer(layer);
  };

  removeSubView = function(layer) {
    return this.removeSubLayer(layer);
  };

  return CompatLayer;

})(Layer);

CompatView = (function(_super) {
  __extends(CompatView, _super);

  function CompatView(options) {
    if (options == null) {
      options = {};
    }
    compatWarning("Views are now called Layers");
    CompatView.__super__.constructor.call(this, options);
  }

  return CompatView;

})(CompatLayer);

CompatImageView = (function(_super) {
  __extends(CompatImageView, _super);

  function CompatImageView() {
    _ref = CompatImageView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  return CompatImageView;

})(CompatView);

CompatScrollView = (function(_super) {
  __extends(CompatScrollView, _super);

  function CompatScrollView() {
    CompatScrollView.__super__.constructor.apply(this, arguments);
    this.scroll = true;
  }

  return CompatScrollView;

})(CompatView);

window.Layer = CompatLayer;

window.Framer.Layer = CompatLayer;

window.View = CompatView;

window.ImageView = CompatImageView;

window.ScrollView = CompatScrollView;

window.utils = window.Utils;


},{"./Layer":18}],10:[function(require,module,exports){
var Utils;

Utils = require("./Utils");

exports.Config = {
  targetFPS: 60,
  rootBaseCSS: {
    "-webkit-perspective": 1000
  },
  layerBaseCSS: {
    "display": "block",
    "position": "absolute",
    "-webkit-box-sizing": "border-box",
    "background-repeat": "no-repeat",
    "background-size": "cover",
    "-webkit-overflow-scrolling": "touch"
  }
};


},{"./Utils":23}],11:[function(require,module,exports){
var EventKeys, Utils, createDebugLayer, errorWarning, hideDebug, showDebug, toggleDebug, _debugLayers, _errorWarningLayer;

Utils = require("./Utils");

_debugLayers = null;

createDebugLayer = function(layer) {
  var overLayer;
  overLayer = new Layer({
    frame: layer.screenFrame(),
    backgroundColor: "rgba(50,150,200,.35)"
  });
  overLayer.style = {
    textAlign: "center",
    color: "white",
    font: "10px/1em Monaco",
    lineHeight: "" + (overLayer.height + 1) + "px",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.5)"
  };
  overLayer.html = layer.name || layer.id;
  overLayer.on(Events.Click, function(event, layer) {
    layer.scale = 0.8;
    return layer.animate({
      properties: {
        scale: 1
      },
      curve: "spring(1000,10,0)"
    });
  });
  return overLayer;
};

showDebug = function() {
  return _debugLayers = Layer.Layers().map(createDebugLayer);
};

hideDebug = function() {
  return _debugLayers.map(function(layer) {
    return layer.destroy();
  });
};

toggleDebug = Utils.toggle(showDebug, hideDebug);

EventKeys = {
  Shift: 16,
  Escape: 27
};

window.document.onkeyup = function(event) {
  if (event.keyCode === EventKeys.Escape) {
    return toggleDebug()();
  }
};

_errorWarningLayer = null;

errorWarning = function() {
  var layer;
  if (_errorWarningLayer) {
    return;
  }
  layer = new Layer({
    x: 20,
    y: -50,
    width: 300,
    height: 40
  });
  layer.states.add({
    visible: {
      x: 20,
      y: 20,
      width: 300,
      height: 40
    }
  });
  layer.html = "Javascript Error, see the console";
  layer.style = {
    font: "12px/1.35em Menlo",
    color: "white",
    textAlign: "center",
    lineHeight: "" + layer.height + "px",
    borderRadius: "5px",
    backgroundColor: "rgba(255,0,0,.8)"
  };
  layer.states.animationOptions = {
    curve: "spring",
    curveOptions: {
      tension: 1000,
      friction: 30
    }
  };
  layer.states["switch"]("visible");
  layer.on(Events.Click, function() {
    return this.states["switch"]("default");
  });
  return _errorWarningLayer = layer;
};

window.onerror = errorWarning;


},{"./Utils":23}],12:[function(require,module,exports){
var Originals, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

Originals = {
  Layer: {
    backgroundColor: "rgba(0,124,255,.5)",
    width: 100,
    height: 100
  },
  Animation: {
    curve: "linear",
    time: 1
  }
};

exports.Defaults = {
  getDefaults: function(className, options) {
    var defaults, k, v, _ref;
    defaults = _.clone(Originals[className]);
    _ref = Framer.Defaults[className];
    for (k in _ref) {
      v = _ref[k];
      defaults[k] = _.isFunction(v) ? v() : v;
    }
    for (k in defaults) {
      v = defaults[k];
      if (!options.hasOwnProperty(k)) {
        options[k] = v;
      }
    }
    return options;
  },
  reset: function() {
    return window.Framer.Defaults = _.clone(Originals);
  }
};


},{"./Underscore":22,"./Utils":23}],13:[function(require,module,exports){
var EventEmitterEventsKey, _,
  __slice = [].slice;

_ = require("./Underscore")._;

EventEmitterEventsKey = "_events";

exports.EventEmitter = (function() {
  function EventEmitter() {
    this[EventEmitterEventsKey] = {};
  }

  EventEmitter.prototype._eventCheck = function(event, method) {
    if (!event) {
      return console.warn("" + this.constructor.name + "." + method + " missing event (like 'click')");
    }
  };

  EventEmitter.prototype.emit = function() {
    var args, event, listener, _i, _len, _ref, _ref1;
    event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!((_ref = this[EventEmitterEventsKey]) != null ? _ref[event] : void 0)) {
      return;
    }
    _ref1 = this[EventEmitterEventsKey][event];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      listener = _ref1[_i];
      listener.apply(null, args);
    }
  };

  EventEmitter.prototype.addListener = function(event, listener) {
    var _base;
    this._eventCheck(event, "addListener");
    if (this[EventEmitterEventsKey] == null) {
      this[EventEmitterEventsKey] = {};
    }
    if ((_base = this[EventEmitterEventsKey])[event] == null) {
      _base[event] = [];
    }
    return this[EventEmitterEventsKey][event].push(listener);
  };

  EventEmitter.prototype.removeListener = function(event, listener) {
    this._eventCheck(event, "removeListener");
    if (!this[EventEmitterEventsKey]) {
      return;
    }
    if (!this[EventEmitterEventsKey][event]) {
      return;
    }
    this[EventEmitterEventsKey][event] = _.without(this[EventEmitterEventsKey][event], listener);
  };

  EventEmitter.prototype.once = function(event, listener) {
    var fn,
      _this = this;
    fn = function() {
      _this.removeListener(event, fn);
      return listener.apply(null, arguments);
    };
    return this.on(event, fn);
  };

  EventEmitter.prototype.removeAllListeners = function(event) {
    var listener, _i, _len, _ref;
    if (!this[EventEmitterEventsKey]) {
      return;
    }
    if (!this[EventEmitterEventsKey][event]) {
      return;
    }
    _ref = this[EventEmitterEventsKey][event];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      listener = _ref[_i];
      this.removeListener(event, listener);
    }
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

  return EventEmitter;

})();


},{"./Underscore":22}],14:[function(require,module,exports){
var Events, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

Events = {};

if (Utils.isTouch()) {
  Events.TouchStart = "touchstart";
  Events.TouchEnd = "touchend";
  Events.TouchMove = "touchmove";
} else {
  Events.TouchStart = "mousedown";
  Events.TouchEnd = "mouseup";
  Events.TouchMove = "mousemove";
}

Events.Click = Events.TouchEnd;

Events.MouseOver = "mouseover";

Events.MouseOut = "mouseout";

Events.AnimationStart = "start";

Events.AnimationStop = "stop";

Events.AnimationEnd = "end";

Events.Scroll = "scroll";

Events.touchEvent = function(event) {
  var touchEvent, _ref, _ref1;
  touchEvent = (_ref = event.touches) != null ? _ref[0] : void 0;
  if (touchEvent == null) {
    touchEvent = (_ref1 = event.changedTouches) != null ? _ref1[0] : void 0;
  }
  if (touchEvent == null) {
    touchEvent = event;
  }
  return touchEvent;
};

exports.Events = Events;


},{"./Underscore":22,"./Utils":23}],15:[function(require,module,exports){
var BaseClass,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseClass = require("./BaseClass").BaseClass;

exports.Frame = (function(_super) {
  __extends(Frame, _super);

  Frame.define("x", Frame.simpleProperty("x", 0));

  Frame.define("y", Frame.simpleProperty("y", 0));

  Frame.define("width", Frame.simpleProperty("width", 0));

  Frame.define("height", Frame.simpleProperty("height", 0));

  Frame.define("minX", Frame.simpleProperty("x", 0, false));

  Frame.define("minY", Frame.simpleProperty("y", 0, false));

  function Frame(options) {
    var k, _i, _len, _ref;
    if (options == null) {
      options = {};
    }
    Frame.__super__.constructor.call(this, options);
    _ref = ["minX", "midX", "maxX", "minY", "midY", "maxY"];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      if (options.hasOwnProperty(k)) {
        this[k] = options[k];
      }
    }
  }

  Frame.define("midX", {
    get: function() {
      return Utils.frameGetMidX(this);
    },
    set: function(value) {
      return Utils.frameSetMidX(this, value);
    }
  });

  Frame.define("maxX", {
    get: function() {
      return Utils.frameGetMaxX(this);
    },
    set: function(value) {
      return Utils.frameSetMaxX(this, value);
    }
  });

  Frame.define("midY", {
    get: function() {
      return Utils.frameGetMidY(this);
    },
    set: function(value) {
      return Utils.frameSetMidY(this, value);
    }
  });

  Frame.define("maxY", {
    get: function() {
      return Utils.frameGetMaxY(this);
    },
    set: function(value) {
      return Utils.frameSetMaxY(this, value);
    }
  });

  return Frame;

})(BaseClass);


},{"./BaseClass":8}],16:[function(require,module,exports){
var Defaults, Framer, _;

_ = require("./Underscore")._;

Framer = {};

Framer._ = _;

Framer.Utils = require("./Utils");

Framer.Frame = (require("./Frame")).Frame;

Framer.Layer = (require("./Layer")).Layer;

Framer.Events = (require("./Events")).Events;

Framer.Animation = (require("./Animation")).Animation;

if (window) {
  _.extend(window, Framer);
}

Framer.Config = (require("./Config")).Config;

Framer.EventEmitter = (require("./EventEmitter")).EventEmitter;

Framer.BaseClass = (require("./BaseClass")).BaseClass;

Framer.LayerStyle = (require("./LayerStyle")).LayerStyle;

Framer.AnimationLoop = (require("./AnimationLoop")).AnimationLoop;

Framer.LinearAnimator = (require("./Animators/LinearAnimator")).LinearAnimator;

Framer.BezierCurveAnimator = (require("./Animators/BezierCurveAnimator")).BezierCurveAnimator;

Framer.SpringDHOAnimator = (require("./Animators/SpringDHOAnimator")).SpringDHOAnimator;

Framer.SpringRK4Animator = (require("./Animators/SpringRK4Animator")).SpringRK4Animator;

Framer.Importer = (require("./Importer")).Importer;

Framer.Debug = (require("./Debug")).Debug;

if (window) {
  window.Framer = Framer;
}

require("./Compat");

Defaults = (require("./Defaults")).Defaults;

Framer.resetDefaults = Defaults.reset;

Framer.resetDefaults();


},{"./Animation":1,"./AnimationLoop":2,"./Animators/BezierCurveAnimator":4,"./Animators/LinearAnimator":5,"./Animators/SpringDHOAnimator":6,"./Animators/SpringRK4Animator":7,"./BaseClass":8,"./Compat":9,"./Config":10,"./Debug":11,"./Defaults":12,"./EventEmitter":13,"./Events":14,"./Frame":15,"./Importer":17,"./Layer":18,"./LayerStyle":21,"./Underscore":22,"./Utils":23}],17:[function(require,module,exports){
var ChromeAlert, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

ChromeAlert = "Importing layers is currently only supported on Safari. If you really want it to work with Chrome quit it, open a terminal and run:\nopen -a Google\ Chrome -–allow-file-access-from-files";

exports.Importer = (function() {
  function Importer(path, extraLayerProperties) {
    this.path = path;
    this.extraLayerProperties = extraLayerProperties != null ? extraLayerProperties : {};
    this.paths = {
      layerInfo: Utils.pathJoin(this.path, "layers.json"),
      images: Utils.pathJoin(this.path, "images"),
      documentName: this.path.split("/").pop()
    };
    this._createdLayers = [];
    this._createdLayersByName = {};
  }

  Importer.prototype.load = function() {
    var layer, layerInfo, layersByName, _i, _j, _len, _len1, _ref, _ref1,
      _this = this;
    layersByName = {};
    layerInfo = this._loadlayerInfo();
    layerInfo.map(function(layerItemInfo) {
      return _this._createLayer(layerItemInfo);
    });
    _ref = this._createdLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      layer = _ref[_i];
      this._correctLayer(layer);
    }
    _ref1 = this._createdLayers;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      layer = _ref1[_j];
      if (!layer.superLayer) {
        layer.superLayer = null;
      }
    }
    return this._createdLayersByName;
  };

  Importer.prototype._loadlayerInfo = function() {
    var importedKey, _ref;
    importedKey = "" + this.paths.documentName + "/layers.json.js";
    if ((_ref = window.__imported__) != null ? _ref.hasOwnProperty(importedKey) : void 0) {
      return window.__imported__[importedKey];
    }
    return Framer.Utils.domLoadJSONSync(this.paths.layerInfo);
  };

  Importer.prototype._createLayer = function(info, superLayer) {
    var LayerClass, layer, layerInfo, _ref,
      _this = this;
    LayerClass = Layer;
    layerInfo = {
      shadow: true,
      name: info.name,
      frame: info.layerFrame,
      clip: false,
      backgroundColor: null,
      visible: (_ref = info.visible) != null ? _ref : true
    };
    _.extend(layerInfo, this.extraLayerProperties);
    if (info.image) {
      layerInfo.frame = info.image.frame;
      layerInfo.image = Utils.pathJoin(this.path, info.image.path);
    }
    if (info.maskFrame) {
      layerInfo.frame = info.maskFrame;
      layerInfo.clip = true;
    }
    if (superLayer != null ? superLayer.contentLayer : void 0) {
      layerInfo.superLayer = superLayer.contentLayer;
    } else if (superLayer) {
      layerInfo.superLayer = superLayer;
    }
    layer = new LayerClass(layerInfo);
    layer.name = layerInfo.name;
    if (!layer.image && !info.children.length && !info.maskFrame) {
      layer.frame = new Frame;
    }
    info.children.reverse().map(function(info) {
      return _this._createLayer(info, layer);
    });
    if (!layer.image && !info.maskFrame) {
      layer.frame = layer.contentFrame();
    }
    layer._info = info;
    this._createdLayers.push(layer);
    return this._createdLayersByName[layer.name] = layer;
  };

  Importer.prototype._correctLayer = function(layer) {
    var traverse;
    traverse = function(layer) {
      var subLayer, _i, _len, _ref, _results;
      if (layer.superLayer) {
        layer.frame = Utils.convertPoint(layer.frame, null, layer.superLayer);
      }
      _ref = layer.subLayers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subLayer = _ref[_i];
        _results.push(traverse(subLayer));
      }
      return _results;
    };
    if (!layer.superLayer) {
      return traverse(layer);
    }
  };

  return Importer;

})();

exports.Importer.load = function(path) {
  var importer;
  importer = new exports.Importer(path);
  return importer.load();
};


},{"./Underscore":22,"./Utils":23}],18:[function(require,module,exports){
var Animation, BaseClass, Config, Defaults, EventEmitter, Frame, LayerDraggable, LayerStates, LayerStyle, Utils, frameProperty, layerProperty, layerStyleProperty, _, _LayerList, _RootElement,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __slice = [].slice;

_ = require("./Underscore")._;

Utils = require("./Utils");

Config = require("./Config").Config;

Defaults = require("./Defaults").Defaults;

BaseClass = require("./BaseClass").BaseClass;

EventEmitter = require("./EventEmitter").EventEmitter;

Animation = require("./Animation").Animation;

Frame = require("./Frame").Frame;

LayerStyle = require("./LayerStyle").LayerStyle;

LayerStates = require("./LayerStates").LayerStates;

LayerDraggable = require("./LayerDraggable").LayerDraggable;

_RootElement = null;

_LayerList = [];

layerProperty = function(name, cssProperty, fallback, validator, set) {
  return {
    exportable: true,
    "default": fallback,
    get: function() {
      return this._getPropertyValue(name);
    },
    set: function(value) {
      if (validator(value) === false) {
        throw Error("value '" + value + "' of type " + (typeof value) + " is not valid for a Layer." + name + " property");
      }
      this._setPropertyValue(name, value);
      this.style[cssProperty] = LayerStyle[cssProperty](this);
      this.emit("change:" + name, value);
      if (set) {
        return set(this, value);
      }
    }
  };
};

layerStyleProperty = function(cssProperty) {
  return {
    exportable: true,
    get: function() {
      return this.style[cssProperty];
    },
    set: function(value) {
      this.style[cssProperty] = value;
      return this.emit("change:" + cssProperty, value);
    }
  };
};

frameProperty = function(name) {
  return {
    exportable: false,
    get: function() {
      return this.frame[name];
    },
    set: function(value) {
      var frame;
      frame = this.frame;
      frame[name] = value;
      return this.frame = frame;
    }
  };
};

exports.Layer = (function(_super) {
  __extends(Layer, _super);

  function Layer(options) {
    var frame;
    if (options == null) {
      options = {};
    }
    this.addListener = __bind(this.addListener, this);
    this.__insertElement = __bind(this.__insertElement, this);
    _LayerList.push(this);
    this._createElement();
    this._setDefaultCSS();
    options = Defaults.getDefaults("Layer", options);
    Layer.__super__.constructor.call(this, options);
    this._element.id = "FramerLayer-" + this.id;
    if (options.hasOwnProperty("frame")) {
      frame = new Frame(options.frame);
    } else {
      frame = new Frame(options);
    }
    this.frame = frame;
    if (!options.superLayer) {
      this.bringToFront();
      if (!options.shadow) {
        this._insertElement();
      }
    } else {
      this.superLayer = options.superLayer;
    }
    this._subLayers = [];
  }

  Layer.define("width", layerProperty("width", "width", 100, _.isNumber));

  Layer.define("height", layerProperty("height", "height", 100, _.isNumber));

  Layer.define("visible", layerProperty("visible", "display", true, _.isBool));

  Layer.define("opacity", layerProperty("opacity", "opacity", 1, _.isNumber));

  Layer.define("index", layerProperty("index", "zIndex", 0, _.isNumber));

  Layer.define("clip", layerProperty("clip", "overflow", true, _.isBool));

  Layer.define("scrollHorizontal", layerProperty("scrollHorizontal", "overflowX", false, _.isBool, function(layer, value) {
    if (value === true) {
      return layer.ignoreEvents = false;
    }
  }));

  Layer.define("scrollVertical", layerProperty("scrollVertical", "overflowY", false, _.isBool, function(layer, value) {
    if (value === true) {
      return layer.ignoreEvents = false;
    }
  }));

  Layer.define("scroll", {
    get: function() {
      return this.scrollHorizontal === true || this.scrollVertical === true;
    },
    set: function(value) {
      return this.scrollHorizontal = this.scrollVertical = true;
    }
  });

  Layer.define("ignoreEvents", layerProperty("ignoreEvents", "pointerEvents", true, _.isBool));

  Layer.define("x", layerProperty("x", "webkitTransform", 0, _.isNumber));

  Layer.define("y", layerProperty("y", "webkitTransform", 0, _.isNumber));

  Layer.define("z", layerProperty("z", "webkitTransform", 0, _.isNumber));

  Layer.define("scaleX", layerProperty("scaleX", "webkitTransform", 1, _.isNumber));

  Layer.define("scaleY", layerProperty("scaleY", "webkitTransform", 1, _.isNumber));

  Layer.define("scaleZ", layerProperty("scaleZ", "webkitTransform", 1, _.isNumber));

  Layer.define("scale", layerProperty("scale", "webkitTransform", 1, _.isNumber));

  Layer.define("originX", layerProperty("originX", "webkitTransformOrigin", 0.5, _.isNumber));

  Layer.define("originY", layerProperty("originY", "webkitTransformOrigin", 0.5, _.isNumber));

  Layer.define("rotationX", layerProperty("rotationX", "webkitTransform", 0, _.isNumber));

  Layer.define("rotationY", layerProperty("rotationY", "webkitTransform", 0, _.isNumber));

  Layer.define("rotationZ", layerProperty("rotationZ", "webkitTransform", 0, _.isNumber));

  Layer.define("rotation", layerProperty("rotationZ", "webkitTransform", 0, _.isNumber));

  Layer.define("blur", layerProperty("blur", "webkitFilter", 0, _.isNumber));

  Layer.define("brightness", layerProperty("brightness", "webkitFilter", 100, _.isNumber));

  Layer.define("saturate", layerProperty("saturate", "webkitFilter", 100, _.isNumber));

  Layer.define("hueRotate", layerProperty("hueRotate", "webkitFilter", 0, _.isNumber));

  Layer.define("contrast", layerProperty("contrast", "webkitFilter", 100, _.isNumber));

  Layer.define("invert", layerProperty("invert", "webkitFilter", 0, _.isNumber));

  Layer.define("grayscale", layerProperty("grayscale", "webkitFilter", 0, _.isNumber));

  Layer.define("sepia", layerProperty("sepia", "webkitFilter", 0, _.isNumber));

  Layer.define("backgroundColor", layerStyleProperty("backgroundColor"));

  Layer.define("borderRadius", layerStyleProperty("borderRadius"));

  Layer.define("borderColor", layerStyleProperty("borderColor"));

  Layer.define("borderWidth", layerStyleProperty("borderWidth"));

  Layer.define("name", {
    exportable: true,
    "default": "",
    get: function() {
      return this._getPropertyValue("name");
    },
    set: function(value) {
      this._setPropertyValue("name", value);
      return this._element.setAttribute("name", value);
    }
  });

  Layer.define("frame", {
    get: function() {
      return new Frame(this);
    },
    set: function(frame) {
      var k, _i, _len, _ref, _results;
      if (!frame) {
        return;
      }
      _ref = ["x", "y", "width", "height"];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        _results.push(this[k] = frame[k]);
      }
      return _results;
    }
  });

  Layer.define("minX", frameProperty("minX"));

  Layer.define("midX", frameProperty("midX"));

  Layer.define("maxX", frameProperty("maxX"));

  Layer.define("minY", frameProperty("minY"));

  Layer.define("midY", frameProperty("midY"));

  Layer.define("maxY", frameProperty("maxY"));

  Layer.prototype.convertPoint = function(point) {
    return Utils.convertPoint(point, null, this);
  };

  Layer.prototype.screenFrame = function() {
    return Utils.convertPoint(this.frame, this, null);
  };

  Layer.prototype.contentFrame = function() {
    return Utils.frameMerge(this.subLayers.map(function(layer) {
      return layer.frame.properties;
    }));
  };

  Layer.prototype.centerFrame = function() {
    var frame;
    if (this.superLayer) {
      frame = this.frame;
      frame.midX = parseInt(this.superLayer.width / 2.0);
      frame.midY = parseInt(this.superLayer.height / 2.0);
      return frame;
    } else {
      frame = this.frame;
      frame.midX = parseInt(window.innerWidth / 2.0);
      frame.midY = parseInt(window.innerHeight / 2.0);
      return frame;
    }
  };

  Layer.prototype.center = function() {
    return this.frame = this.centerFrame();
  };

  Layer.prototype.centerX = function() {
    return this.x = this.centerFrame().x;
  };

  Layer.prototype.centerY = function() {
    return this.y = this.centerFrame().y;
  };

  Layer.prototype.pixelAlign = function() {
    this.x = parseInt(this.x);
    return this.y = parseInt(this.y);
  };

  Layer.define("style", {
    get: function() {
      return this._element.style;
    },
    set: function(value) {
      _.extend(this._element.style, value);
      return this.emit("change:style");
    }
  });

  Layer.define("html", {
    get: function() {
      var _ref;
      return (_ref = this._elementHTML) != null ? _ref.innerHTML : void 0;
    },
    set: function(value) {
      if (!this._elementHTML) {
        this._elementHTML = document.createElement("div");
        this._element.appendChild(this._elementHTML);
      }
      this._elementHTML.innerHTML = value;
      if (!(this._elementHTML.childNodes.length === 1 && this._elementHTML.childNodes[0].nodeName === "#text")) {
        this.ignoreEvents = false;
      }
      return this.emit("change:html");
    }
  });

  Layer.prototype.computedStyle = function() {
    return document.defaultView.getComputedStyle(this._element);
  };

  Layer.prototype._setDefaultCSS = function() {
    return this.style = Config.layerBaseCSS;
  };

  Layer.define("classList", {
    get: function() {
      return this._element.classList;
    }
  });

  Layer.prototype._createElement = function() {
    if (this._element != null) {
      return;
    }
    return this._element = document.createElement("div");
  };

  Layer.prototype._insertElement = function() {
    return Utils.domComplete(this.__insertElement);
  };

  Layer.prototype.__insertElement = function() {
    if (!_RootElement) {
      _RootElement = document.createElement("div");
      _RootElement.id = "FramerRoot";
      _.extend(_RootElement.style, Config.rootBaseCSS);
      document.body.appendChild(_RootElement);
    }
    return _RootElement.appendChild(this._element);
  };

  Layer.prototype.destroy = function() {
    if (this.superLayer) {
      this.superLayer._subLayers = _.without(this.superLayer._subLayers, this);
    }
    this._element.parentNode.removeChild(this._element);
    this.removeAllListeners();
    return _LayerList = _.without(_LayerList, this);
  };

  Layer.prototype.copy = function() {
    var copiedSublayer, layer, subLayer, _i, _len, _ref;
    layer = this.copySingle();
    _ref = this.subLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subLayer = _ref[_i];
      copiedSublayer = subLayer.copy();
      copiedSublayer.superLayer = layer;
    }
    return layer;
  };

  Layer.prototype.copySingle = function() {
    return new Layer(this.properties);
  };

  Layer.prototype.animate = function(options) {
    var animation;
    options.layer = this;
    options.curveOptions = options;
    animation = new Animation(options);
    animation.start();
    return animation;
  };

  Layer.define("image", {
    exportable: true,
    "default": "",
    get: function() {
      return this._getPropertyValue("image");
    },
    set: function(value) {
      var currentValue, imageUrl, loader, _ref, _ref1,
        _this = this;
      currentValue = this._getPropertyValue("image");
      if (currentValue === value) {
        return this.emit("load");
      }
      this.backgroundColor = null;
      this._setPropertyValue("image", value);
      imageUrl = value;
      if ((_ref = this.events) != null ? _ref.hasOwnProperty("load" || ((_ref1 = this.events) != null ? _ref1.hasOwnProperty("error") : void 0)) : void 0) {
        loader = new Image();
        loader.name = imageUrl;
        loader.src = imageUrl;
        loader.onload = function() {
          _this.style["background-image"] = "url('" + imageUrl + "')";
          return _this.emit("load", loader);
        };
        return loader.onerror = function() {
          return _this.emit("error", loader);
        };
      } else {
        return this.style["background-image"] = "url('" + imageUrl + "')";
      }
    }
  });

  Layer.define("superLayer", {
    exportable: false,
    get: function() {
      return this._superLayer || null;
    },
    set: function(layer) {
      if (layer === this._superLayer) {
        return;
      }
      if (!layer instanceof Layer) {
        throw Error("Layer.superLayer needs to be a Layer object");
      }
      Utils.domCompleteCancel(this.__insertElement);
      if (this._superLayer) {
        this._superLayer._subLayers = _.without(this._superLayer._subLayers, this);
        this._superLayer._element.removeChild(this._element);
        this._superLayer.emit("change:subLayers", {
          added: [],
          removed: [this]
        });
      }
      if (layer) {
        layer._element.appendChild(this._element);
        layer._subLayers.push(this);
        layer.emit("change:subLayers", {
          added: [this],
          removed: []
        });
      } else {
        this._insertElement();
      }
      this._superLayer = layer;
      this.bringToFront();
      return this.emit("change:superLayer");
    }
  });

  Layer.prototype.superLayers = function() {
    var recurse, superLayers;
    superLayers = [];
    recurse = function(layer) {
      if (!layer.superLayer) {
        return;
      }
      superLayers.push(layer.superLayer);
      return recurse(layer.superLayer);
    };
    recurse(this);
    return superLayers;
  };

  Layer.define("subLayers", {
    exportable: false,
    get: function() {
      return _.clone(this._subLayers);
    }
  });

  Layer.define("siblingLayers", {
    exportable: false,
    get: function() {
      var _this = this;
      if (this.superLayer === null) {
        return _.filter(_LayerList, function(layer) {
          return layer !== _this && layer.superLayer === null;
        });
      }
      return _.without(this.superLayer.subLayers, this);
    }
  });

  Layer.prototype.addSubLayer = function(layer) {
    return layer.superLayer = this;
  };

  Layer.prototype.removeSubLayer = function(layer) {
    if (__indexOf.call(this.subLayers, layer) < 0) {
      return;
    }
    return layer.superLayer = null;
  };

  Layer.prototype.subLayersByName = function(name) {
    return _.filter(this.subLayers, function(layer) {
      return layer.name === name;
    });
  };

  Layer.prototype.animate = function(options) {
    var animation, start;
    start = options.start;
    if (start == null) {
      start = true;
    }
    delete options.start;
    options.layer = this;
    animation = new Animation(options);
    if (start) {
      animation.start();
    }
    return animation;
  };

  Layer.prototype.animations = function() {
    var _this = this;
    return _.filter(Animation.runningAnimations(), function(a) {
      return a.options.layer === _this;
    });
  };

  Layer.prototype.animateStop = function() {
    return _.invoke(this.animations(), "stop");
  };

  Layer.prototype.bringToFront = function() {
    return this.index = _.max(_.union([0], this.siblingLayers.map(function(layer) {
      return layer.index;
    }))) + 1;
  };

  Layer.prototype.sendToBack = function() {
    return this.index = _.min(_.union([0], this.siblingLayers.map(function(layer) {
      return layer.index;
    }))) - 1;
  };

  Layer.prototype.placeBefore = function(layer) {
    var l, _i, _len, _ref;
    if (__indexOf.call(this.siblingLayers, layer) < 0) {
      return;
    }
    _ref = this.siblingLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      if (l.index <= layer.index) {
        l.index -= 1;
      }
    }
    return this.index = layer.index + 1;
  };

  Layer.prototype.placeBehind = function(layer) {
    var l, _i, _len, _ref;
    if (__indexOf.call(this.siblingLayers, layer) < 0) {
      return;
    }
    _ref = this.siblingLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      if (l.index >= layer.index) {
        l.index += 1;
      }
    }
    return this.index = layer.index - 1;
  };

  Layer.define("states", {
    get: function() {
      return this._states != null ? this._states : this._states = new LayerStates(this);
    }
  });

  Layer.define("draggable", {
    get: function() {
      if (this._draggable == null) {
        this._draggable = new LayerDraggable(this);
      }
      return this._draggable;
    }
  });

  Layer.define("scrollFrame", {
    get: function() {
      return new Frame({
        x: this.scrollX,
        y: this.scrollY,
        width: this.width,
        height: this.height
      });
    },
    set: function(frame) {
      this.scrollX = frame.x;
      return this.scrollY = frame.y;
    }
  });

  Layer.define("scrollX", {
    get: function() {
      return this._element.scrollLeft;
    },
    set: function(value) {
      return this._element.scrollLeft = value;
    }
  });

  Layer.define("scrollY", {
    get: function() {
      return this._element.scrollTop;
    },
    set: function(value) {
      return this._element.scrollTop = value;
    }
  });

  Layer.prototype.addListener = function(event, originalListener) {
    var listener, _base,
      _this = this;
    listener = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return originalListener.call.apply(originalListener, [_this].concat(__slice.call(args), [_this]));
    };
    originalListener.modifiedListener = listener;
    Layer.__super__.addListener.call(this, event, listener);
    this._element.addEventListener(event, listener);
    if (this._eventListeners == null) {
      this._eventListeners = {};
    }
    if ((_base = this._eventListeners)[event] == null) {
      _base[event] = [];
    }
    this._eventListeners[event].push(listener);
    return this.ignoreEvents = false;
  };

  Layer.prototype.removeListener = function(event, listener) {
    if (listener.modifiedListener) {
      listener = listener.modifiedListener;
    }
    Layer.__super__.removeListener.call(this, event, listener);
    this._element.removeEventListener(event, listener);
    return this._eventListeners[event] = _.without(this._eventListeners[event], listener);
  };

  Layer.prototype.removeAllListeners = function() {
    var eventName, listener, listeners, _ref, _results;
    if (!this._eventListeners) {
      return;
    }
    _ref = this._eventListeners;
    _results = [];
    for (eventName in _ref) {
      listeners = _ref[eventName];
      _results.push((function() {
        var _i, _len, _results1;
        _results1 = [];
        for (_i = 0, _len = listeners.length; _i < _len; _i++) {
          listener = listeners[_i];
          _results1.push(this.removeListener(eventName, listener));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  Layer.prototype.on = Layer.prototype.addListener;

  Layer.prototype.off = Layer.prototype.removeListener;

  return Layer;

})(BaseClass);

exports.Layer.Layers = function() {
  return _.clone(_LayerList);
};


},{"./Animation":1,"./BaseClass":8,"./Config":10,"./Defaults":12,"./EventEmitter":13,"./Frame":15,"./LayerDraggable":19,"./LayerStates":20,"./LayerStyle":21,"./Underscore":22,"./Utils":23}],19:[function(require,module,exports){
var EventEmitter, Events, Utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("./Underscore");

Utils = require("./Utils");

EventEmitter = require("./EventEmitter").EventEmitter;

Events = require("./Events").Events;

Events.DragStart = "dragstart";

Events.DragMove = "dragmove";

Events.DragEnd = "dragend";

"This takes any layer and makes it draggable by the user on mobile or desktop.\n\nSome interesting things are:\n\n- The draggable.calculateVelocity().x|y contains the current average speed \n  in the last 100ms (defined with VelocityTimeOut).\n- You can enable/disable or slowdown/speedup scrolling with\n  draggable.speed.x|y\n";

exports.LayerDraggable = (function(_super) {
  __extends(LayerDraggable, _super);

  LayerDraggable.VelocityTimeOut = 100;

  function LayerDraggable(layer) {
    this.layer = layer;
    this._touchEnd = __bind(this._touchEnd, this);
    this._touchStart = __bind(this._touchStart, this);
    this._updatePosition = __bind(this._updatePosition, this);
    this.speedX = 1.0;
    this.speedY = 1.0;
    this._deltas = [];
    this._isDragging = false;
    this.enabled = true;
    this.attach();
  }

  LayerDraggable.prototype.attach = function() {
    return this.layer.on(Events.TouchStart, this._touchStart);
  };

  LayerDraggable.prototype.remove = function() {
    return this.layer.off(Events.TouchStart, this._touchStart);
  };

  LayerDraggable.prototype.emit = function(eventName, event) {
    this.layer.emit(eventName, event);
    return LayerDraggable.__super__.emit.call(this, eventName, event);
  };

  LayerDraggable.prototype.calculateVelocity = function() {
    var curr, prev, time, timeSinceLastMove, velocity;
    if (this._deltas.length < 2) {
      return {
        x: 0,
        y: 0
      };
    }
    curr = this._deltas.slice(-1)[0];
    prev = this._deltas.slice(-2, -1)[0];
    time = curr.t - prev.t;
    timeSinceLastMove = new Date().getTime() - prev.t;
    if (timeSinceLastMove > this.VelocityTimeOut) {
      return {
        x: 0,
        y: 0
      };
    }
    velocity = {
      x: (curr.x - prev.x) / time,
      y: (curr.y - prev.y) / time
    };
    if (velocity.x === Infinity) {
      velocity.x = 0;
    }
    if (velocity.y === Infinity) {
      velocity.y = 0;
    }
    return velocity;
  };

  LayerDraggable.prototype._updatePosition = function(event) {
    var correctedDelta, delta, touchEvent,
      _this = this;
    if (this.enabled === false) {
      return;
    }
    this.emit(Events.DragMove, event);
    touchEvent = Events.touchEvent(event);
    delta = {
      x: touchEvent.clientX - this._start.x,
      y: touchEvent.clientY - this._start.y
    };
    correctedDelta = {
      x: delta.x * this.speedX,
      y: delta.y * this.speedY,
      t: event.timeStamp
    };
    window.requestAnimationFrame(function() {
      _this.layer.x = _this._start.x + correctedDelta.x - _this._offset.x;
      return _this.layer.y = _this._start.y + correctedDelta.y - _this._offset.y;
    });
    this._deltas.push(correctedDelta);
    return this.emit(Events.DragMove, event);
  };

  LayerDraggable.prototype._touchStart = function(event) {
    var touchEvent;
    this.layer.animateStop();
    this._isDragging = true;
    touchEvent = Events.touchEvent(event);
    this._start = {
      x: touchEvent.clientX,
      y: touchEvent.clientY
    };
    this._offset = {
      x: touchEvent.clientX - this.layer.x,
      y: touchEvent.clientY - this.layer.y
    };
    document.addEventListener(Events.TouchMove, this._updatePosition);
    document.addEventListener(Events.TouchEnd, this._touchEnd);
    return this.emit(Events.DragStart, event);
  };

  LayerDraggable.prototype._touchEnd = function(event) {
    this._isDragging = false;
    document.removeEventListener(Events.TouchMove, this._updatePosition);
    document.removeEventListener(Events.TouchEnd, this._touchEnd);
    this.emit(Events.DragEnd, event);
    return this._deltas = [];
  };

  return LayerDraggable;

})(EventEmitter);


},{"./EventEmitter":13,"./Events":14,"./Underscore":22,"./Utils":23}],20:[function(require,module,exports){
var BaseClass, Defaults, Events, LayerStatesIgnoredKeys, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require("./Underscore")._;

Events = require("./Events").Events;

BaseClass = require("./BaseClass").BaseClass;

Defaults = require("./Defaults").Defaults;

LayerStatesIgnoredKeys = ["ignoreEvents"];

Events.StateWillSwitch = "willSwitch";

Events.StateDidSwitch = "didSwitch";

exports.LayerStates = (function(_super) {
  __extends(LayerStates, _super);

  function LayerStates(layer) {
    this.layer = layer;
    this._states = {};
    this._orderedStates = [];
    this.animationOptions = {};
    this.add("default", this.layer.properties);
    this._currentState = "default";
    this._previousStates = [];
    LayerStates.__super__.constructor.apply(this, arguments);
  }

  LayerStates.prototype.add = function(stateName, properties) {
    var error, k, v;
    if (_.isObject(stateName)) {
      for (k in stateName) {
        v = stateName[k];
        this.add(k, v);
      }
      return;
    }
    error = function() {
      throw Error("Usage example: layer.states.add(\"someName\", {x:500})");
    };
    if (!_.isString(stateName)) {
      error();
    }
    if (!_.isObject(properties)) {
      error();
    }
    this._orderedStates.push(stateName);
    return this._states[stateName] = properties;
  };

  LayerStates.prototype.remove = function(stateName) {
    if (!this._states.hasOwnProperty(stateName)) {
      return;
    }
    delete this._states[stateName];
    return this._orderedStates = _.without(this._orderedStates, stateName);
  };

  LayerStates.prototype["switch"] = function(stateName, animationOptions, instant) {
    var animatingKeys, properties, propertyName, value, _ref,
      _this = this;
    if (instant == null) {
      instant = false;
    }
    if (!this._states.hasOwnProperty(stateName)) {
      throw Error("No such state: '" + stateName + "'");
    }
    this.emit(Events.StateWillSwitch, this._currentState, stateName, this);
    this._previousStates.push(this._currentState);
    this._currentState = stateName;
    properties = {};
    animatingKeys = this.animatingKeys();
    _ref = this._states[stateName];
    for (propertyName in _ref) {
      value = _ref[propertyName];
      if (__indexOf.call(LayerStatesIgnoredKeys, propertyName) >= 0) {
        continue;
      }
      if (__indexOf.call(animatingKeys, propertyName) < 0) {
        continue;
      }
      if (_.isFunction(value)) {
        value = value.call(this.layer, this.layer, stateName);
      }
      properties[propertyName] = value;
    }
    if (instant === true) {
      this.layer.properties = properties;
      return this.emit(Events.StateDidSwitch, _.last(this._previousStates), stateName, this);
    } else {
      if (animationOptions == null) {
        animationOptions = this.animationOptions;
      }
      animationOptions.properties = properties;
      this._animation = this.layer.animate(animationOptions);
      return this._animation.on("stop", function() {
        return _this.emit(Events.StateDidSwitch, _.last(_this._previousStates), stateName, _this);
      });
    }
  };

  LayerStates.prototype.switchInstant = function(stateName) {
    return this["switch"](stateName, null, true);
  };

  LayerStates.define("state", {
    get: function() {
      return this._currentState;
    }
  });

  LayerStates.define("current", {
    get: function() {
      return this._currentState;
    }
  });

  LayerStates.prototype.states = function() {
    return _.clone(this._orderedStates);
  };

  LayerStates.prototype.animatingKeys = function() {
    var keys, state, stateName, _ref;
    keys = [];
    _ref = this._states;
    for (stateName in _ref) {
      state = _ref[stateName];
      if (stateName === "default") {
        continue;
      }
      keys = _.union(keys, _.keys(state));
    }
    return keys;
  };

  LayerStates.prototype.previous = function(states, animationOptions) {
    if (states == null) {
      states = this.states();
    }
    return this["switch"](Utils.arrayPrev(states, this._currentState), animationOptions);
  };

  LayerStates.prototype.next = function() {
    var states;
    states = Utils.arrayFromArguments(arguments);
    if (!states.length) {
      states = this.states();
    }
    return this["switch"](Utils.arrayNext(states, this._currentState));
  };

  LayerStates.prototype.last = function(animationOptions) {
    return this["switch"](_.last(this._previousStates), animationOptions);
  };

  return LayerStates;

})(BaseClass);


},{"./BaseClass":8,"./Defaults":12,"./Events":14,"./Underscore":22}],21:[function(require,module,exports){
var filterFormat, _WebkitProperties;

filterFormat = function(value, unit) {
  return "" + (Utils.round(value, 2)) + unit;
};

_WebkitProperties = [["blur", "blur", 0, "px"], ["brightness", "brightness", 100, "%"], ["saturate", "saturate", 100, "%"], ["hue-rotate", "hueRotate", 0, "deg"], ["contrast", "contrast", 100, "%"], ["invert", "invert", 0, "%"], ["grayscale", "grayscale", 0, "%"], ["sepia", "sepia", 0, "%"]];

exports.LayerStyle = {
  width: function(layer) {
    return layer.width + "px";
  },
  height: function(layer) {
    return layer.height + "px";
  },
  display: function(layer) {
    if (layer.visible === true) {
      return "block";
    }
    return "none";
  },
  opacity: function(layer) {
    return layer.opacity;
  },
  overflow: function(layer) {
    if (layer.scrollHorizontal === true || layer.scrollVertical === true) {
      return "auto";
    }
    if (layer.clip === true) {
      return "hidden";
    }
    return "visible";
  },
  overflowX: function(layer) {
    if (layer.scrollHorizontal === true) {
      return "scroll";
    }
    if (layer.clip === true) {
      return "hidden";
    }
    return "visible";
  },
  overflowY: function(layer) {
    if (layer.scrollVertical === true) {
      return "scroll";
    }
    if (layer.clip === true) {
      return "hidden";
    }
    return "visible";
  },
  zIndex: function(layer) {
    return layer.index;
  },
  webkitFilter: function(layer) {
    var css, cssName, fallback, layerName, unit, _i, _len, _ref;
    css = [];
    for (_i = 0, _len = _WebkitProperties.length; _i < _len; _i++) {
      _ref = _WebkitProperties[_i], cssName = _ref[0], layerName = _ref[1], fallback = _ref[2], unit = _ref[3];
      if (layer[layerName] !== fallback) {
        css.push("" + cssName + "(" + (filterFormat(layer[layerName], unit)) + ")");
      }
    }
    return css.join(" ");
  },
  webkitTransform: function(layer) {
    return "		translate3d(" + layer.x + "px," + layer.y + "px," + layer.z + "px) 		scale(" + layer.scale + ")		scale3d(" + layer.scaleX + "," + layer.scaleY + "," + layer.scaleZ + ") 		rotateX(" + layer.rotationX + "deg) 		rotateY(" + layer.rotationY + "deg) 		rotateZ(" + layer.rotationZ + "deg) 		";
  },
  webkitTransformOrigin: function(layer) {
    return "" + (layer.originX * 100) + "% " + (layer.originY * 100) + "%";
  },
  pointerEvents: function(layer) {
    if (layer.ignoreEvents) {
      return "none";
    }
    return "auto";
  }
};


},{}],22:[function(require,module,exports){
var _;

_ = require("lodash");

_.str = require('underscore.string');

_.mixin(_.str.exports());

_.isBool = function(v) {
  return typeof v === 'boolean';
};

exports._ = _;


},{"lodash":24,"underscore.string":25}],23:[function(require,module,exports){
var Utils, _, __domComplete,
  __slice = [].slice,
  _this = this;

_ = require("./Underscore")._;

Utils = {};

Utils.setDefaultProperties = function(obj, defaults, warn) {
  var k, result, v;
  if (warn == null) {
    warn = true;
  }
  result = {};
  for (k in defaults) {
    v = defaults[k];
    if (obj.hasOwnProperty(k)) {
      result[k] = obj[k];
    } else {
      result[k] = defaults[k];
    }
  }
  if (warn) {
    for (k in obj) {
      v = obj[k];
      if (!defaults.hasOwnProperty(k)) {
        console.warn("Utils.setDefaultProperties: got unexpected option: '" + k + " -> " + v + "'", obj);
      }
    }
  }
  return result;
};

Utils.valueOrDefault = function(value, defaultValue) {
  if (value === (void 0) || value === null) {
    value = defaultValue;
  }
  return value;
};

Utils.arrayToObject = function(arr) {
  var item, obj, _i, _len;
  obj = {};
  for (_i = 0, _len = arr.length; _i < _len; _i++) {
    item = arr[_i];
    obj[item[0]] = item[1];
  }
  return obj;
};

Utils.arrayNext = function(arr, item) {
  return arr[arr.indexOf(item) + 1] || _.first(arr);
};

Utils.arrayPrev = function(arr, item) {
  return arr[arr.indexOf(item) - 1] || _.last(arr);
};

if (window.requestAnimationFrame == null) {
  window.requestAnimationFrame = window.webkitRequestAnimationFrame;
}

if (window.requestAnimationFrame == null) {
  window.requestAnimationFrame = function(f) {
    return Utils.delay(1 / 60, f);
  };
}

Utils.getTime = function() {
  return Date.now() / 1000;
};

Utils.delay = function(time, f) {
  var timer;
  timer = setTimeout(f, time * 1000);
  return timer;
};

Utils.interval = function(time, f) {
  var timer;
  timer = setInterval(f, time * 1000);
  return timer;
};

Utils.debounce = function(threshold, fn, immediate) {
  var timeout;
  if (threshold == null) {
    threshold = 0.1;
  }
  timeout = null;
  threshold *= 1000;
  return function() {
    var args, delayed, obj;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    obj = this;
    delayed = function() {
      if (!immediate) {
        fn.apply(obj, args);
      }
      return timeout = null;
    };
    if (timeout) {
      clearTimeout(timeout);
    } else if (immediate) {
      fn.apply(obj, args);
    }
    return timeout = setTimeout(delayed, threshold);
  };
};

Utils.throttle = function(delay, fn) {
  var timer;
  if (delay === 0) {
    return fn;
  }
  delay *= 1000;
  timer = false;
  return function() {
    if (timer) {
      return;
    }
    timer = true;
    if (delay !== -1) {
      setTimeout((function() {
        return timer = false;
      }), delay);
    }
    return fn.apply(null, arguments);
  };
};

Utils.randomColor = function(alpha) {
  var c;
  if (alpha == null) {
    alpha = 1.0;
  }
  c = function() {
    return parseInt(Math.random() * 255);
  };
  return "rgba(" + (c()) + ", " + (c()) + ", " + (c()) + ", " + alpha + ")";
};

Utils.randomChoice = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

Utils.randomNumber = function(a, b) {
  if (a == null) {
    a = 0;
  }
  if (b == null) {
    b = 1;
  }
  return Utils.mapRange(Math.random(), 0, 1, a, b);
};

Utils.labelLayer = function(layer, text, style) {
  if (style == null) {
    style = {};
  }
  style = _.extend({
    font: "10px/1em Menlo",
    lineHeight: "" + layer.height + "px",
    textAlign: "center",
    color: "#fff"
  }, style);
  layer.style = style;
  return layer.html = text;
};

Utils.uuid = function() {
  var chars, digit, output, r, random, _i;
  chars = "0123456789abcdefghijklmnopqrstuvwxyz".split("");
  output = new Array(36);
  random = 0;
  for (digit = _i = 1; _i <= 32; digit = ++_i) {
    if (random <= 0x02) {
      random = 0x2000000 + (Math.random() * 0x1000000) | 0;
    }
    r = random & 0xf;
    random = random >> 4;
    output[digit] = chars[digit === 19 ? (r & 0x3) | 0x8 : r];
  }
  return output.join("");
};

Utils.arrayFromArguments = function(args) {
  if (_.isArray(args[0])) {
    return args[0];
  }
  return Array.prototype.slice.call(args);
};

Utils.cycle = function() {
  var args, curr;
  args = Utils.arrayFromArguments(arguments);
  curr = -1;
  return function() {
    curr++;
    if (curr >= args.length) {
      curr = 0;
    }
    return args[curr];
  };
};

Utils.toggle = Utils.cycle;

Utils.isWebKit = function() {
  return window.WebKitCSSMatrix !== null;
};

Utils.isTouch = function() {
  return window.ontouchstart === null;
};

Utils.isMobile = function() {
  return /iphone|ipod|android|ie|blackberry|fennec/.test(navigator.userAgent.toLowerCase());
};

Utils.isChrome = function() {
  return /chrome/.test(navigator.userAgent.toLowerCase());
};

Utils.isLocal = function() {
  return Utils.isLocalUrl(window.location.href);
};

Utils.isLocalUrl = function(url) {
  return url.slice(0, 7) === "file://";
};

Utils.devicePixelRatio = function() {
  return window.devicePixelRatio;
};

Utils.pathJoin = function() {
  return Utils.arrayFromArguments(arguments).join("/");
};

Utils.round = function(value, decimals) {
  var d;
  d = Math.pow(10, decimals);
  return Math.round(value * d) / d;
};

Utils.mapRange = function(value, fromLow, fromHigh, toLow, toHigh) {
  return toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));
};

Utils.modulate = function(value, rangeA, rangeB, limit) {
  var fromHigh, fromLow, result, toHigh, toLow;
  if (limit == null) {
    limit = false;
  }
  fromLow = rangeA[0], fromHigh = rangeA[1];
  toLow = rangeB[0], toHigh = rangeB[1];
  result = toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));
  if (limit === true) {
    if (result < toLow) {
      return toLow;
    }
    if (result > toHigh) {
      return toHigh;
    }
  }
  return result;
};

Utils.parseFunction = function(str) {
  var result;
  result = {
    name: "",
    args: []
  };
  if (_.endsWith(str, ")")) {
    result.name = str.split("(")[0];
    result.args = str.split("(")[1].split(",").map(function(a) {
      return _.trim(_.rtrim(a, ")"));
    });
  } else {
    result.name = str;
  }
  return result;
};

__domComplete = [];

if (typeof document !== "undefined" && document !== null) {
  document.onreadystatechange = function(event) {
    var f, _results;
    if (document.readyState === "complete") {
      _results = [];
      while (__domComplete.length) {
        _results.push(f = __domComplete.shift()());
      }
      return _results;
    }
  };
}

Utils.domComplete = function(f) {
  if (document.readyState === "complete") {
    return f();
  } else {
    return __domComplete.push(f);
  }
};

Utils.domCompleteCancel = function(f) {
  return __domComplete = _.without(__domComplete, f);
};

Utils.domLoadScript = function(url, callback) {
  var head, script;
  script = document.createElement("script");
  script.type = "text/javascript";
  script.src = url;
  script.onload = callback;
  head = document.getElementsByTagName("head")[0];
  head.appendChild(script);
  return script;
};

Utils.domLoadData = function(path, callback) {
  var request;
  request = new XMLHttpRequest();
  request.addEventListener("load", function() {
    return callback(null, request.responseText);
  }, false);
  request.addEventListener("error", function() {
    return callback(true, null);
  }, false);
  request.open("GET", path, true);
  return request.send(null);
};

Utils.domLoadJSON = function(path, callback) {
  return Utils.domLoadData(path, function(err, data) {
    return callback(err, JSON.parse(data));
  });
};

Utils.domLoadDataSync = function(path) {
  var data, e, request;
  request = new XMLHttpRequest();
  request.open("GET", path, false);
  try {
    request.send(null);
  } catch (_error) {
    e = _error;
    console.debug("XMLHttpRequest.error", e);
  }
  data = request.responseText;
  if (!data) {
    throw Error("Utils.domLoadDataSync: no data was loaded (url not found?)");
  }
  return request.responseText;
};

Utils.domLoadJSONSync = function(path) {
  return JSON.parse(Utils.domLoadDataSync(path));
};

Utils.domLoadScriptSync = function(path) {
  var scriptData;
  scriptData = Utils.domLoadDataSync(path);
  eval(scriptData);
  return scriptData;
};

Utils.pointMin = function() {
  var point, points;
  points = Utils.arrayFromArguments(arguments);
  return point = {
    x: _.min(point.map(function(size) {
      return size.x;
    })),
    y: _.min(point.map(function(size) {
      return size.y;
    }))
  };
};

Utils.pointMax = function() {
  var point, points;
  points = Utils.arrayFromArguments(arguments);
  return point = {
    x: _.max(point.map(function(size) {
      return size.x;
    })),
    y: _.max(point.map(function(size) {
      return size.y;
    }))
  };
};

Utils.pointDistance = function(pointA, pointB) {
  var distance;
  return distance = {
    x: Math.abs(pointB.x - pointA.x),
    y: Math.abs(pointB.y - pointA.y)
  };
};

Utils.pointInvert = function(point) {
  return point = {
    x: 0 - point.x,
    y: 0 - point.y
  };
};

Utils.pointTotal = function(point) {
  return point.x + point.y;
};

Utils.pointAbs = function(point) {
  return point = {
    x: Math.abs(point.x),
    y: Math.abs(point.y)
  };
};

Utils.pointInFrame = function(point, frame) {
  if (point.x < frame.minX || point.x > frame.maxX) {
    return false;
  }
  if (point.y < frame.minY || point.y > frame.maxY) {
    return false;
  }
  return true;
};

Utils.sizeMin = function() {
  var size, sizes;
  sizes = Utils.arrayFromArguments(arguments);
  return size = {
    width: _.min(sizes.map(function(size) {
      return size.width;
    })),
    height: _.min(sizes.map(function(size) {
      return size.height;
    }))
  };
};

Utils.sizeMax = function() {
  var size, sizes;
  sizes = Utils.arrayFromArguments(arguments);
  return size = {
    width: _.max(sizes.map(function(size) {
      return size.width;
    })),
    height: _.max(sizes.map(function(size) {
      return size.height;
    }))
  };
};

Utils.frameGetMinX = function(frame) {
  return frame.x;
};

Utils.frameSetMinX = function(frame, value) {
  return frame.x = value;
};

Utils.frameGetMidX = function(frame) {
  if (frame.width === 0) {
    return 0;
  } else {
    return frame.x + (frame.width / 2.0);
  }
};

Utils.frameSetMidX = function(frame, value) {
  return frame.x = frame.width === 0 ? 0 : value - (frame.width / 2.0);
};

Utils.frameGetMaxX = function(frame) {
  if (frame.width === 0) {
    return 0;
  } else {
    return frame.x + frame.width;
  }
};

Utils.frameSetMaxX = function(frame, value) {
  return frame.x = frame.width === 0 ? 0 : value - frame.width;
};

Utils.frameGetMinY = function(frame) {
  return frame.y;
};

Utils.frameSetMinY = function(frame, value) {
  return frame.y = value;
};

Utils.frameGetMidY = function(frame) {
  if (frame.height === 0) {
    return 0;
  } else {
    return frame.y + (frame.height / 2.0);
  }
};

Utils.frameSetMidY = function(frame, value) {
  return frame.y = frame.height === 0 ? 0 : value - (frame.height / 2.0);
};

Utils.frameGetMaxY = function(frame) {
  if (frame.height === 0) {
    return 0;
  } else {
    return frame.y + frame.height;
  }
};

Utils.frameSetMaxY = function(frame, value) {
  return frame.y = frame.height === 0 ? 0 : value - frame.height;
};

Utils.frameSize = function(frame) {
  var size;
  return size = {
    width: frame.width,
    height: frame.height
  };
};

Utils.framePoint = function(frame) {
  var point;
  return point = {
    x: frame.x,
    y: frame.y
  };
};

Utils.frameMerge = function() {
  var frame, frames;
  frames = Utils.arrayFromArguments(arguments);
  frame = {
    x: _.min(frames.map(Utils.frameGetMinX)),
    y: _.min(frames.map(Utils.frameGetMinY))
  };
  frame.width = _.max(frames.map(Utils.frameGetMaxX)) - frame.x;
  frame.height = _.max(frames.map(Utils.frameGetMaxY)) - frame.y;
  return frame;
};

Utils.convertPoint = function(input, layerA, layerB) {
  var k, layer, point, superLayersA, superLayersB, _i, _j, _k, _len, _len1, _len2, _ref;
  point = {};
  _ref = ["x", "y", "width", "height"];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    k = _ref[_i];
    point[k] = input[k];
  }
  superLayersA = (layerA != null ? layerA.superLayers() : void 0) || [];
  superLayersB = (layerB != null ? layerB.superLayers() : void 0) || [];
  if (layerB) {
    superLayersB.push(layerB);
  }
  for (_j = 0, _len1 = superLayersA.length; _j < _len1; _j++) {
    layer = superLayersA[_j];
    point.x += layer.x - layer.scrollFrame.x;
    point.y += layer.y - layer.scrollFrame.y;
  }
  for (_k = 0, _len2 = superLayersB.length; _k < _len2; _k++) {
    layer = superLayersB[_k];
    point.x -= layer.x + layer.scrollFrame.x;
    point.y -= layer.y + layer.scrollFrame.y;
  }
  return point;
};

_.extend(exports, Utils);


},{"./Underscore":22}],24:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @license
 * Lo-Dash 2.4.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to detected named functions */
  var reFuncName = /^\s*function[ \n\r\t]+\w/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to detect functions containing a `this` reference */
  var reThis = /\bthis\b/;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used as an internal `_.debounce` options object */
  var debounceOptions = {
    'leading': false,
    'maxWait': 0,
    'trailing': false
  };

  /** Used as the property descriptor for `__bindData__` */
  var descriptor = {
    'configurable': false,
    'enumerable': false,
    'value': null,
    'writable': false
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports` */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value or `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];

    return type == 'object'
      ? (cache && baseIndexOf(cache, value) > -1 ? 0 : -1)
      : (cache ? 0 : -1);
  }

  /**
   * Adds a given value to the corresponding cache object.
   *
   * @private
   * @param {*} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default callback when a given
   * collection is a string value.
   *
   * @private
   * @param {string} value The character to inspect.
   * @returns {number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` elements, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ac = a.criteria,
        bc = b.criteria,
        index = -1,
        length = ac.length;

    while (++index < length) {
      var value = ac[index],
          other = bc[index];

      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to return the same value for
    // `a` and `b`. See https://github.com/jashkenas/underscore/pull/1247
    //
    // This also ensures a stable sort in V8 and other engines.
    // See http://code.google.com/p/v8/issues/detail?id=90
    return a.index - b.index;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length,
        first = array[0],
        mid = array[(length / 2) | 0],
        last = array[length - 1];

    if (first && typeof first == 'object' &&
        mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {string} match The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * Releases the given array back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given object back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used instead of `Array#slice` to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|string} collection The collection to slice.
   * @param {number} start The start index.
   * @param {number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given context object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.io/#x11.1.5.
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to resolve the internal [[Class]] of values */
    var toString = objectProto.toString;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        splice = arrayRef.splice,
        unshift = arrayRef.unshift;

    /** Used to set meta data on functions */
    var defineProperty = (function() {
      // IE 8 only accepts DOM elements
      try {
        var o = {},
            func = isNative(func = Object.defineProperty) && func,
            result = func(o, o, o) && func;
      } catch(e) { }
      return result;
    }());

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
        nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps the given value to enable intuitive
     * method chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `create`, `createCallback`, `curry`,
     * `debounce`, `defaults`, `defer`, `delay`, `difference`, `filter`, `flatten`,
     * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
     * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `pull`, `push`,
     * `range`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
     * `sortBy`, `splice`, `tap`, `throttle`, `times`, `toArray`, `transform`,
     * `union`, `uniq`, `unshift`, `unzip`, `values`, `where`, `without`, `wrap`,
     * and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `findIndex`,
     * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `has`, `identity`,
     * `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
     * `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`, `isNull`, `isNumber`,
     * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`, `join`,
     * `lastIndexOf`, `mixin`, `noConflict`, `parseInt`, `pop`, `random`, `reduce`,
     * `reduceRight`, `result`, `shift`, `size`, `some`, `sortedIndex`, `runInContext`,
     * `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * provided, otherwise they return unwrapped values.
     *
     * Explicit chaining can be enabled by using the `_.chain` method.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap in a `lodash` instance.
     * @param {boolean} chainAll A flag to enable chaining for all methods
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if functions can be decompiled by `Function#toString`
     * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

    /**
     * Detect if `Function#name` is supported (all but IE).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcNames = typeof Function.name == 'string';

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `_.bind` that creates the bound function and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new bound function.
     */
    function baseBind(bindData) {
      var func = bindData[0],
          partialArgs = bindData[2],
          thisArg = bindData[4];

      function bound() {
        // `Function#bind` spec
        // http://es5.github.io/#x15.3.4.5
        if (partialArgs) {
          // avoid `arguments` object deoptimizations by using `slice` instead
          // of `Array.prototype.slice.call` and not assigning `arguments` to a
          // variable as a ternary expression
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        // mimic the constructor's `return` behavior
        // http://es5.github.io/#x13.2.2
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          var thisBinding = baseCreate(func.prototype),
              result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.clone` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      // inspect [[Class]]
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
          case boolClass:
          case dateClass:
            return new ctor(+value);

          case numberClass:
          case stringClass:
            return new ctor(value);

          case regexpClass:
            result = ctor(value.source, reFlags.exec(value));
            result.lastIndex = value.lastIndex;
            return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        // check for circular references and return corresponding clone
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());

        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      }
      else {
        result = isArr ? slice(value) : assign({}, value);
      }
      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // exit for shallow clone
      if (!isDeep) {
        return result;
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    // fallback for browsers without `Object.create`
    if (!nativeCreate) {
      baseCreate = (function() {
        function Object() {}
        return function(prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object;
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }());
    }

    /**
     * The base implementation of `_.createCallback` without support for creating
     * "_.pluck" or "_.where" style callbacks.
     *
     * @private
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     */
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      // exit early for no `thisArg` or already bound by `Function#bind`
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            // checks if `func` references the `this` keyword and stores the result
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      // exit early if there are no `this` references or `func` is bound
      if (bindData === false || (bindData !== true && bindData[1] & 1)) {
        return func;
      }
      switch (argCount) {
        case 1: return function(value) {
          return func.call(thisArg, value);
        };
        case 2: return function(a, b) {
          return func.call(thisArg, a, b);
        };
        case 3: return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }

    /**
     * The base implementation of `createWrapper` that creates the wrapper and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new function.
     */
    function baseCreateWrapper(bindData) {
      var func = bindData[0],
          bitmask = bindData[1],
          partialArgs = bindData[2],
          partialRightArgs = bindData[3],
          thisArg = bindData[4],
          arity = bindData[5];

      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          key = func;

      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.difference` that accepts a single array
     * of values to exclude.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {Array} [values] The array of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     */
    function baseDifference(array, values) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize && indexOf === baseIndexOf,
          result = [];

      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }

    /**
     * The base implementation of `_.flatten` without support for callback
     * shorthands or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {boolean} [isStrict=false] A flag to restrict flattening to arrays and `arguments` objects.
     * @param {number} [fromIndex=0] The index to start from.
     * @returns {Array} Returns a new flattened array.
     */
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];

        if (value && typeof value == 'object' && typeof value.length == 'number'
            && (isArray(value) || isArguments(value))) {
          // recursively flatten arrays (susceptible to call stack limits)
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1,
              valLength = value.length,
              resIndex = result.length;

          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.isEqual`, without support for `thisArg` binding,
     * that allows partial "_.where" style comparisons.
     *
     * @private
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Function} [isWhere=false] A flag to indicate performing partial comparisons.
     * @param {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          !(a && objectTypes[type]) &&
          !(b && objectTypes[otherType])) {
        return false;
      }
      // exit early for `null` and `undefined` avoiding ES3's Function#call behavior
      // http://es5.github.io/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'),
            bWrapped = hasOwnProperty.call(b, '__wrapped__');

        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB &&
              !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
              ('constructor' in a && 'constructor' in b)
            ) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        // compare lengths to determine if a deep comparison is necessary
        length = a.length;
        size = b.length;
        result = size == length;

        if (result || isWhere) {
          // deep compare the contents, ignoring non-numeric properties
          while (size--) {
            var index = length,
                value = b[size];

            if (isWhere) {
              while (index--) {
                if ((result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB))) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      }
      else {
        // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
        // which, in this case, is more costly
        forIn(b, function(value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            // count the number of properties.
            size++;
            // deep compare each property value.
            return (result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB));
          }
        });

        if (result && !isWhere) {
          // ensure both objects have the same number of properties
          forIn(a, function(value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              // `size` will be `-1` if `a` has more properties than `b`
              return (result = --size > -1);
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.merge` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates values with source counterparts.
     */
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function(source, key) {
        var found,
            isArr,
            result = source,
            value = object[key];

        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          // avoid merging previously merged cyclic sources
          var stackLength = stackA.length;
          while (stackLength--) {
            if ((found = stackA[stackLength] == source)) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if ((isShallow = typeof result != 'undefined')) {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});
            }
            // add `source` and associated `value` to the stack of traversed objects
            stackA.push(source);
            stackB.push(value);

            // recursively merge objects and arrays (susceptible to call stack limits)
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        }
        else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }

    /**
     * The base implementation of `_.random` without argument juggling or support
     * for returning floating-point numbers.
     *
     * @private
     * @param {number} min The minimum possible value.
     * @param {number} max The maximum possible value.
     * @returns {number} Returns a random number.
     */
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }

    /**
     * The base implementation of `_.uniq` without support for callback shorthands
     * or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function} [callback] The function called per iteration.
     * @returns {Array} Returns a duplicate-value-free array.
     */
    function baseUniq(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }

    /**
     * Creates a function that aggregates a collection, creating an object composed
     * of keys generated from the results of running each element of the collection
     * through a callback. The given `setter` function sets the keys and values
     * of the composed object.
     *
     * @private
     * @param {Function} setter The setter function.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter) {
      return function(collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);

        var index = -1,
            length = collection ? collection.length : 0;

        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function(value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }

    /**
     * Creates a function that, when called, either curries or invokes `func`
     * with an optional `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to reference.
     * @param {number} bitmask The bitmask of method flags to compose.
     *  The bitmask may be composed of the following flags:
     *  1 - `_.bind`
     *  2 - `_.bindKey`
     *  4 - `_.curry`
     *  8 - `_.curry` (bound)
     *  16 - `_.partial`
     *  32 - `_.partialRight`
     * @param {Array} [partialArgs] An array of arguments to prepend to those
     *  provided to the new function.
     * @param {Array} [partialRightArgs] An array of arguments to append to those
     *  provided to the new function.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new function.
     */
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          isPartial = bitmask & 16,
          isPartialRight = bitmask & 32;

      if (!isBindKey && !isFunction(func)) {
        throw new TypeError;
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        // clone `bindData`
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        // set `thisBinding` is not previously bound
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        // set if previously bound but not currently (subsequent curried functions)
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        // set curried arity if not yet set
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        // append partial left arguments
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        // append partial right arguments
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        // merge flags
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      // fast path for `_.bind`
      var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
      return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} match The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `baseIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
     */
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }

    /**
     * Sets `this` binding data on a given function.
     *
     * @private
     * @param {Function} func The function to set data on.
     * @param {Array} value The data array to set.
     */
    var setBindData = !defineProperty ? noop : function(func, value) {
      descriptor.value = value;
      defineProperty(func, '__bindData__', descriptor);
      descriptor.value = null;
    };

    /**
     * A fallback implementation of `isPlainObject` which checks if a given value
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} match The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == argsClass || false;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == arrayClass || false;
    };

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     */
    var shimKeys = function(object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);
          }
        }
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of an object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /** Used to match HTML entities and HTML characters */
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'),
        reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a callback is provided it will be executed to produce the
     * assigned values. The callback is bound to `thisArg` and invoked with two
     * arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'fred' }, { 'employer': 'slate' });
     * // => { 'name': 'fred', 'employer': 'slate' }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var object = { 'name': 'barney' };
     * defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var assign = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
        }
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `isDeep` is `true` nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a callback
     * is provided it will be executed to produce the cloned values. If the
     * callback returns `undefined` cloning will be handled by the method instead.
     * The callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var shallow = _.clone(characters);
     * shallow[0] === characters[0];
     * // => true
     *
     * var deep = _.clone(characters, true);
     * deep[0] === characters[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, isDeep, callback, thisArg) {
      // allows working with "Collections" methods without using their `index`
      // and `collection` arguments for `isDeep` and `callback`
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates a deep clone of `value`. If a callback is provided it will be
     * executed to produce the cloned values. If the callback returns `undefined`
     * cloning will be handled by the method instead. The callback is bound to
     * `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var deep = _.cloneDeep(characters);
     * deep[0] === characters[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates an object that inherits from the given `prototype` object. If a
     * `properties` object is provided its own enumerable properties are assigned
     * to the created object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var object = { 'name': 'barney' };
     * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var defaults = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];
        }
        }
      }
      return result
    };

    /**
     * This method is like `_.findIndex` except that it returns the key of the
     * first element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': false },
     *   'fred': {    'age': 40, 'blocked': true },
     *   'pebbles': { 'age': 1,  'blocked': false }
     * };
     *
     * _.findKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => 'barney' (property order is not guaranteed across environments)
     *
     * // using "_.where" callback shorthand
     * _.findKey(characters, { 'age': 1 });
     * // => 'pebbles'
     *
     * // using "_.pluck" callback shorthand
     * _.findKey(characters, 'blocked');
     * // => 'fred'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': true },
     *   'fred': {    'age': 40, 'blocked': false },
     *   'pebbles': { 'age': 1,  'blocked': true }
     * };
     *
     * _.findLastKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => returns `pebbles`, assuming `_.findKey` returns `barney`
     *
     * // using "_.where" callback shorthand
     * _.findLastKey(characters, { 'age': 40 });
     * // => 'fred'
     *
     * // using "_.pluck" callback shorthand
     * _.findLastKey(characters, 'blocked');
     * // => 'pebbles'
     */
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over own and inherited enumerable properties of an object,
     * executing the callback for each property. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forIn(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'x', 'y', and 'move' (property order is not guaranteed across environments)
     */
    var forIn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forIn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forInRight(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'move', 'y', and 'x' assuming `_.forIn ` logs 'x', 'y', and 'move'
     */
    function forInRight(object, callback, thisArg) {
      var pairs = [];

      forIn(object, function(value, key) {
        pairs.push(key, value);
      });

      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Iterates over own enumerable properties of an object, executing the callback
     * for each property. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
     */
    var forOwn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forOwn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
     */
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object),
          length = props.length;

      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Creates a sorted array of property names of all enumerable properties,
     * own and inherited, of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified property name exists as a direct property of `object`,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to check.
     * @returns {boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     * _.invert({ 'first': 'fred', 'second': 'barney' });
     * // => { 'fred': 'first', 'barney': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If a callback is provided it will be executed
     * to compare values. If the callback returns `undefined` comparisons will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var copy = { 'name': 'fred' };
     *
     * object == copy;
     * // => false
     *
     * _.isEqual(object, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite` which will return true for
     * booleans and empty strings. See http://es5.github.io/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.io/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN` which will return `true` for
     * `undefined` and other non-numeric values. See http://es5.github.io/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * Note: `NaN` is considered a number. See http://es5.github.io/#x8.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }

    /**
     * Checks if `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * _.isPlainObject(new Shape);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     */
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/fred/);
     * // => true
     */
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('fred');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' ||
        value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new object with values of the results of each `callback` execution.
     * @example
     *
     * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(num) { return num * 3; });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     *
     * var characters = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // using "_.pluck" callback shorthand
     * _.mapValues(characters, 'age');
     * // => { 'fred': 40, 'pebbles': 1 }
     */
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);

      forOwn(object, function(value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined` into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a callback is
     * provided it will be executed to produce the merged values of the destination
     * and source properties. If the callback returns `undefined` merging will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'characters': [
     *     { 'name': 'barney' },
     *     { 'name': 'fred' }
     *   ]
     * };
     *
     * var ages = {
     *   'characters': [
     *     { 'age': 36 },
     *     { 'age': 40 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'characters': [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object) {
      var args = arguments,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      // allows working with `_.reduce` and `_.reduceRight` without using
      // their `index` and `collection` arguments
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length),
          index = -1,
          stackA = getArray(),
          stackB = getArray();

      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` omitting the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The properties to omit or the
     *  function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, 'age');
     * // => { 'name': 'fred' }
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'fred' }
     */
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function(value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));

        var index = -1,
            length = props.length;

        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates a two dimensional array of an object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'barney': 36, 'fred': 40 });
     * // => [['barney', 36], ['fred', 40]] (property order is not guaranteed across environments)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` picking the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The function called per
     *  iteration or property names to pick, specified as individual property
     *  names or arrays of property names.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, 'name');
     * // => { 'name': 'fred' }
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'fred' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = baseFlatten(arguments, true, false, 1),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce` this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable properties through a callback, with each callback execution
     * potentially mutating the `accumulator` object. The callback is bound to
     * `thisArg` and invoked with four arguments; (accumulator, value, key, object).
     * Callbacks may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function(value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (property order is not guaranteed across environments)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {...(number|number[]|string|string[])} [index] The indexes of `collection`
     *   to retrieve, specified as individual indexes or arrays of indexes.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['fred', 'barney', 'pebbles'], 0, 2);
     * // => ['fred', 'pebbles']
     */
    function at(collection) {
      var args = arguments,
          index = -1,
          props = baseFlatten(args, true, false, 1),
          length = (args[2] && args[2][args[1]] === collection) ? 1 : props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given value is present in a collection using strict equality
     * for comparisons, i.e. `===`. If `fromIndex` is negative, it is used as the
     * offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {*} target The value to check for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.contains('pebbles', 'eb');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through the callback. The corresponding value
     * of each key is the number of times the key was returned by the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
    });

    /**
     * Checks if the given callback returns truey value for **all** elements of
     * a collection. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if all elements passed the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes']);
     * // => false
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(characters, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(characters, { 'age': 36 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning an array of all elements
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(characters, 'blocked');
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     *
     * // using "_.where" callback shorthand
     * _.filter(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning the first element that
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.find(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => { 'name': 'barney', 'age': 36, 'blocked': false }
     *
     * // using "_.where" callback shorthand
     * _.find(characters, { 'age': 1 });
     * // =>  { 'name': 'pebbles', 'age': 1, 'blocked': false }
     *
     * // using "_.pluck" callback shorthand
     * _.find(characters, 'blocked');
     * // => { 'name': 'fred', 'age': 40, 'blocked': true }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * This method is like `_.find` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(num) {
     *   return num % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over elements of a collection, executing the callback for each
     * element. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * Note: As with other "Collections" methods, objects with a `length` property
     * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
     * may be used for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(function(num) { console.log(num); }).join(',');
     * // => logs each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { console.log(num); });
     * // => logs each number and returns the object (property order is not guaranteed across environments)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEachRight(function(num) { console.log(num); }).join(',');
     * // => logs each number from right to left and returns '3,2,1'
     */
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function(value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of a collection through the callback. The corresponding value
     * of each key is an array of the elements responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of the collection through the given callback. The corresponding
     * value of each key is the last element responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var keys = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.indexBy(keys, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(keys, function(key) { return String.fromCharCode(key.code); });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(characters, function(key) { this.fromCharCode(key.code); }, String);
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     */
    var indexBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Invokes the method named by `methodName` on each element in the `collection`
     * returning an array of the results of each invoked method. Additional arguments
     * will be provided to each invoked method. If `methodName` is a function it
     * will be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|string} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [arg] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the collection
     * through the callback. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (property order is not guaranteed across environments)
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(characters, 'name');
     * // => ['barney', 'fred']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of a collection. If the collection is empty or
     * falsey `-Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.max(characters, function(chr) { return chr.age; });
     * // => { 'name': 'fred', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(characters, 'age');
     * // => { 'name': 'fred', 'age': 40 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of a collection. If the collection is empty or
     * falsey `Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.min(characters, function(chr) { return chr.age; });
     * // => { 'name': 'barney', 'age': 36 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(characters, 'age');
     * // => { 'name': 'barney', 'age': 36 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the collection.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {string} property The name of the property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.pluck(characters, 'name');
     * // => ['barney', 'fred']
     */
    var pluck = map;

    /**
     * Reduces a collection to a value which is the accumulated result of running
     * each element in the collection through the callback, where each successive
     * callback execution consumes the return value of the previous execution. If
     * `accumulator` is not provided the first element of the collection will be
     * used as the initial `accumulator` value. The callback is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function(value, index, collection) {
        accumulator = noaccum
          ? (noaccum = false, value)
          : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter` this method returns the elements of a
     * collection that the callback does **not** return truey for.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that failed the callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(characters, 'blocked');
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     *
     * // using "_.where" callback shorthand
     * _.reject(characters, { 'age': 36 });
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Retrieves a random element or `n` random elements from a collection.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to sample.
     * @param {number} [n] The number of elements to sample.
     * @param- {Object} [guard] Allows working with functions like `_.map`
     *  without using their `index` arguments as `n`.
     * @returns {Array} Returns the random sample(s) of `collection`.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     *
     * _.sample([1, 2, 3, 4], 2);
     * // => [3, 1]
     */
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the Fisher-Yates
     * shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the callback returns a truey value for **any** element of a
     * collection. The function returns as soon as it finds a passing value and
     * does not iterate over the entire collection. The callback is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if any element passed the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(characters, 'blocked');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(characters, { 'age': 1 });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through the callback. This method
     * performs a stable sort, that is, it will preserve the original sort order
     * of equal elements. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an array of property names is provided for `callback` the collection
     * will be sorted by each property value.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Array|Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'barney',  'age': 26 },
     *   { 'name': 'fred',    'age': 30 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(_.sortBy(characters, 'age'), _.values);
     * // => [['barney', 26], ['fred', 30], ['barney', 36], ['fred', 40]]
     *
     * // sorting by multiple properties
     * _.map(_.sortBy(characters, ['name', 'age']), _.values);
     * // = > [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          isArr = isArray(callback),
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function(key) { return value[key]; });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Performs a deep comparison of each element in a `collection` to the given
     * `properties` object, returning an array of all elements that have equivalent
     * property values.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Object} props The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given properties.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * _.where(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'pets': ['hoppy'] }]
     *
     * _.where(characters, { 'pets': ['dino'] });
     * // => [{ 'name': 'fred', 'age': 40, 'pets': ['baby puss', 'dino'] }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array excluding all values of the provided arrays using strict
     * equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {...Array} [values] The arrays of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.findIndex(characters, function(chr) {
     *   return chr.age < 20;
     * });
     * // => 2
     *
     * // using "_.where" callback shorthand
     * _.findIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findIndex(characters, 'blocked');
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': true },
     *   { 'name': 'fred',    'age': 40, 'blocked': false },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': true }
     * ];
     *
     * _.findLastIndex(characters, function(chr) {
     *   return chr.age > 30;
     * });
     * // => 1
     *
     * // using "_.where" callback shorthand
     * _.findLastIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findLastIndex(characters, 'blocked');
     * // => 2
     */
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Gets the first element or first `n` elements of an array. If a callback
     * is provided elements at the beginning of the array are returned as long
     * as the callback returns truey. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false, 'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(characters, 'blocked');
     * // => [{ 'name': 'barney', 'blocked': true, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.first(characters, { 'employer': 'slate' }), 'name');
     * // => ['barney', 'fred']
     */
    function first(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truey, the array will only be flattened a single level. If a callback
     * is provided each element of the array is passed through the callback before
     * flattening. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 30, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(characters, 'pets');
     * // => ['hoppy', 'baby puss', 'dino']
     */
    function flatten(array, isShallow, callback, thisArg) {
      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = (typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array) ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the array is already sorted
     * providing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {boolean|number} [fromIndex=0] The index to search from or `true`
     *  to perform a binary search on a sorted array.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element or last `n` elements of an array. If a
     * callback is provided elements at the end of the array are excluded from
     * the result as long as the callback returns truey. The callback is bound
     * to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(characters, 'blocked');
     * // => [{ 'name': 'barney',  'blocked': false, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.initial(characters, { 'employer': 'na' }), 'name');
     * // => ['barney', 'fred']
     */
    function initial(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Creates an array of unique values present in all provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of shared values.
     * @example
     *
     * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2]
     */
    function intersection() {
      var args = [],
          argsIndex = -1,
          argsLength = arguments.length,
          caches = getArray(),
          indexOf = getIndexOf(),
          trustIndexOf = indexOf === baseIndexOf,
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize &&
            createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0],
          index = -1,
          length = array ? array.length : 0,
          result = [];

      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element or last `n` elements of an array. If a callback is
     * provided elements at the end of the array are returned as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.last(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.last(characters, { 'employer': 'na' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function last(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all provided values from the given array using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {...*} [value] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    function pull(array) {
      var args = arguments,
          argsIndex = 0,
          argsLength = args.length,
          length = array ? array.length : 0;

      while (++argsIndex < argsLength) {
        var index = -1,
            value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`. If `start` is less than `stop` a
     * zero-length range is created unless a negative `step` is specified.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : (+step || 1);

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so engines like Chakra and V8 avoid slower modes
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / (step || 1))),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Removes all elements from an array that the callback returns truey for
     * and returns an array of removed elements. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4, 5, 6];
     * var evens = _.remove(array, function(num) { return num % 2 == 0; });
     *
     * console.log(array);
     * // => [1, 3, 5]
     *
     * console.log(evens);
     * // => [2, 4, 6]
     */
    function remove(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }

    /**
     * The opposite of `_.initial` this method gets all but the first element or
     * first `n` elements of an array. If a callback function is provided elements
     * at the beginning of the array are excluded from the result as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true, 'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.rest(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.rest(characters, { 'employer': 'slate' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which a value
     * should be inserted into a given sorted array in order to maintain the sort
     * order of the array. If a callback is provided it will be executed for
     * `value` and each element of `array` to compute their sort ranking. The
     * callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Creates an array of unique values, in order, of the provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of combined values.
     * @example
     *
     * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2, 3, 5, 4]
     */
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }

    /**
     * Creates a duplicate-value-free version of an array using strict equality
     * for comparisons, i.e. `===`. If the array is sorted, providing
     * `true` for `isSorted` will use a faster algorithm. If a callback is provided
     * each element of `array` is passed through the callback before uniqueness
     * is computed. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = (typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array) ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }

    /**
     * Creates an array excluding all provided values using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {...*} [value] The values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }

    /**
     * Creates an array that is the symmetric difference of the provided arrays.
     * See http://en.wikipedia.org/wiki/Symmetric_difference.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of values.
     * @example
     *
     * _.xor([1, 2, 3], [5, 2, 1, 4]);
     * // => [3, 5, 4]
     *
     * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
     * // => [1, 4, 5]
     */
    function xor() {
      var index = -1,
          length = arguments.length;

      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result
            ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result)))
            : array;
        }
      }
      return result || [];
    }

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second
     * elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @alias unzip
     * @category Arrays
     * @param {...Array} [array] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0],
          index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Provide
     * either a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`
     * or two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['fred', 'barney'], [30, 40]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that executes `func`, with  the `this` binding and
     * arguments of the created function, only after being called `n` times.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {number} n The number of times the function must be called before
     *  `func` is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('Done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'Done saving!', after all saves have completed
     */
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * provided to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'fred' }, 'hi');
     * func();
     * // => 'hi fred'
     */
    function bind(func, thisArg) {
      return arguments.length > 2
        ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
        : createWrapper(func, 1, null, null, thisArg);
    }

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method. Method names may be specified as individual arguments or as arrays
     * of method names. If no method names are provided all the function properties
     * of `object` will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...string} [methodName] The object method names to
     *  bind, specified as individual method names or arrays of method names.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() { console.log('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => logs 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those provided to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {string} key The key of the method.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'fred',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi fred'
     *
     * object.greet = function(greeting) {
     *   return greeting + 'ya ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hiya fred!'
     */
    function bindKey(object, key) {
      return arguments.length > 2
        ? createWrapper(key, 19, slice(arguments, 2), null, object)
        : createWrapper(key, 3, null, null, object);
    }

    /**
     * Creates a function that is the composition of the provided functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {...Function} [func] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var realNameMap = {
     *   'pebbles': 'penelope'
     * };
     *
     * var format = function(name) {
     *   name = realNameMap[name.toLowerCase()] || name;
     *   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
     * };
     *
     * var greet = function(formatted) {
     *   return 'Hiya ' + formatted + '!';
     * };
     *
     * var welcome = _.compose(greet, format);
     * welcome('pebbles');
     * // => 'Hiya Penelope!'
     */
    function compose() {
      var funcs = arguments,
          length = funcs.length;

      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError;
        }
      }
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Creates a function which accepts one or more arguments of `func` that when
     * invoked either executes `func` returning its result, if all `func` arguments
     * have been provided, or returns a function that accepts one or more of the
     * remaining `func` arguments, and so on. The arity of `func` can be specified
     * if `func.length` is not sufficient.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var curried = _.curry(function(a, b, c) {
     *   console.log(a + b + c);
     * });
     *
     * curried(1)(2)(3);
     * // => 6
     *
     * curried(1, 2)(3);
     * // => 6
     *
     * curried(1, 2, 3);
     * // => 6
     */
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : (+arity || func.length);
      return createWrapper(func, 4, null, null, null, arity);
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked.
     * Provide an options object to indicate that `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
     * to the debounced function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * var lazyLayout = _.debounce(calculateLayout, 150);
     * jQuery(window).on('resize', lazyLayout);
     *
     * // execute `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * });
     *
     * // ensure `batchLog` is executed once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * source.addEventListener('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }, false);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          maxWait = false,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };

      var maxDelayed = function() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || (maxWait !== wait)) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };

      return function() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) { console.log(text); }, 'deferred');
     * // logs 'deferred' after one or more milliseconds
     */
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay execution.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) { console.log(text); }, 1000, 'later');
     * // => logs 'later' after one second
     */
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it will be used to determine the cache key for storing the result
     * based on the arguments provided to the memoized function. By default, the
     * first argument provided to the memoized function is used as the cache key.
     * The `func` is executed with the `this` binding of the memoized function.
     * The result cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     *
     * fibonacci(9)
     * // => 34
     *
     * var data = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // modifying the result cache
     * var get = _.memoize(function(name) { return data[name]; }, _.identity);
     * get('pebbles');
     * // => { 'name': 'pebbles', 'age': 1 }
     *
     * get.cache.pebbles.name = 'penelope';
     * get('pebbles');
     * // => { 'name': 'penelope', 'age': 1 }
     */
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var memoized = function() {
        var cache = memoized.cache,
            key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those provided to the new function. This
     * method is similar to `_.bind` except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('fred');
     * // => 'hi fred'
     */
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }

    /**
     * This method is like `_.partial` except that `partial` arguments are
     * appended to those provided to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Provide an options object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {number} wait The number of milliseconds to throttle executions to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // avoid excessively updating the position while scrolling
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;

      return debounce(func, wait, debounceOptions);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Additional arguments provided to the function are appended
     * to those provided to the wrapper function. The wrapper is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('Fred, Wilma, & Pebbles');
     * // => '<p>Fred, Wilma, &amp; Pebbles</p>'
     */
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var getter = _.constant(object);
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name the created callback will return the property value for a given element.
     * If `func` is an object the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(characters, 'age__gt38');
     * // => [{ 'name': 'fred', 'age': 40 }]
     */
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      // handle "_.pluck" style callback shorthands
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func),
          key = props[0],
          a = func[key];

      // handle "_.where" style callback shorthands
      if (props.length == 1 && a === a && !isObject(a)) {
        // fast path the common case of providing an object with a single
        // property containing a primitive value
        return function(object) {
          var b = object[key];
          return a === b && (a !== 0 || (1 / a == 1 / b));
        };
      }
      return function(object) {
        var length = props.length,
            result = false;

        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('Fred, Wilma, & Pebbles');
     * // => 'Fred, Wilma, &amp; Pebbles'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument provided to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds function properties of a source object to the destination object.
     * If `object` is a function methods will be added to its prototype as well.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Function|Object} [object=lodash] object The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added are chainable.
     * @example
     *
     * function capitalize(string) {
     *   return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     * }
     *
     * _.mixin({ 'capitalize': capitalize });
     * _.capitalize('fred');
     * // => 'Fred'
     *
     * _('fred').capitalize().value();
     * // => 'Fred'
     *
     * _.mixin({ 'capitalize': capitalize }, { 'chain': false });
     * _('fred').capitalize();
     * // => 'Fred'
     */
    function mixin(object, source, options) {
      var chain = true,
          methodNames = source && functions(source);

      if (!source || (!options && !methodNames.length)) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object,
          isFunc = isFunction(ctor);

      forEach(methodNames, function(methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function() {
            var chainAll = this.__chain__,
                value = this.__wrapped__,
                args = [value];

            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * A no-operation function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // no operation performed
    }

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var stamp = _.now();
     * _.defer(function() { console.log(_.now() - stamp); });
     * // => logs the number of milliseconds it took for the deferred function to be called
     */
    var now = isNative(now = Date.now) && now || function() {
      return new Date().getTime();
    };

    /**
     * Converts the given value into an integer of the specified radix.
     * If `radix` is `undefined` or `0` a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.io/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} value The value to parse.
     * @param {number} [radix] The radix used to interpret the value to parse.
     * @returns {number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox < 21 and Opera < 15 follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Creates a "_.pluck" style function, which returns the `key` value of a
     * given object.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} key The name of the property to retrieve.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var characters = [
     *   { 'name': 'fred',   'age': 40 },
     *   { 'name': 'barney', 'age': 36 }
     * ];
     *
     * var getName = _.property('name');
     *
     * _.map(characters, getName);
     * // => ['barney', 'fred']
     *
     * _.sortBy(characters, getName);
     * // => [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred',   'age': 40 }]
     */
    function property(key) {
      return function(object) {
        return object[key];
      };
    }

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is provided a number between `0` and the given number will be
     * returned. If `floating` is truey or either `min` or `max` are floats a
     * floating-point number will be returned instead of an integer.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} [min=0] The minimum possible value.
     * @param {number} [max=1] The maximum possible value.
     * @param {boolean} [floating=false] Specify returning a floating-point number.
     * @returns {number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(min, max, floating) {
      var noMin = min == null,
          noMax = max == null;

      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        }
        else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1)))), max);
      }
      return baseRandom(min, max);
    }

    /**
     * Resolves the value of property `key` on `object`. If `key` is a function
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to resolve.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * https://lodash.com/custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as local variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [variable] The data object variable name.
     * @returns {Function|string} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using the "interpolate" delimiter to create a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'fred' });
     * // => 'hello fred'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the "evaluate" delimiter to generate HTML
     * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'pebbles' });
     * // => 'hello pebbles'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
     * // => 'hello barney!'
     *
     * // using a custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `imports` option to import jQuery
     * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text = String(text || '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source by its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the callback `n` times, returning an array of the results
     * of each callback execution. The callback is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns an array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape` this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('Fred, Barney &amp; Pebbles');
     * // => 'Fred, Barney & Pebbles'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps the given value with explicit
     * method chaining enabled.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _.chain(characters)
     *     .sortBy('age')
     *     .map(function(chr) { return chr.name + ' is ' + chr.age; })
     *     .first()
     *     .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }

    /**
     * Invokes `interceptor` with the `value` as the first argument and then
     * returns `value`. The purpose of this method is to "tap into" a method
     * chain in order to perform operations on intermediate results within
     * the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .tap(function(array) { array.pop(); })
     *  .reverse()
     *  .value();
     * // => [3, 2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Chaining
     * @returns {*} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // without explicit chaining
     * _(characters).first();
     * // => { 'name': 'barney', 'age': 36 }
     *
     * // with explicit chaining
     * _(characters).chain()
     *   .first()
     *   .pick('age')
     *   .value();
     * // => { 'age': 36 }
     */
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {string} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {*} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    mixin(function() {
      var source = {}
      forOwn(lodash, function(func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(n, guard) {
          var chainAll = this.__chain__,
              result = func(this.__wrapped__, n, guard);

          return !chainAll && (n == null || (guard && !(callbackable && typeof n == 'function')))
            ? result
            : new lodashWrapper(result, chainAll);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = '2.4.2';

    // add "Chaining" functions to the wrapper
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        var chainAll = this.__chain__,
            result = func.apply(this.__wrapped__, arguments);

        return chainAll
          ? new lodashWrapper(result, chainAll)
          : result;
      };
    });

    // add `Array` functions that return the existing wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash is loaded with a RequireJS shim config.
    // See http://requirejs.org/docs/api.html#config-shim
    root._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or Rhino -require
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    root._ = _;
  }
}.call(this));

},{}],25:[function(require,module,exports){
//  Underscore.string
//  (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
//  Underscore.string is freely distributable under the terms of the MIT license.
//  Documentation: https://github.com/epeli/underscore.string
//  Some code is borrowed from MooTools and Alexandru Marasteanu.
//  Version '2.4.0'

!function(root, String){
  'use strict';

  // Defining helper functions.

  var nativeTrim = String.prototype.trim;
  var nativeTrimRight = String.prototype.trimRight;
  var nativeTrimLeft = String.prototype.trimLeft;

  var parseNumber = function(source) { return source * 1 || 0; };

  var strRepeat = function(str, qty){
    if (qty < 1) return '';
    var result = '';
    while (qty > 0) {
      if (qty & 1) result += str;
      qty >>= 1, str += str;
    }
    return result;
  };

  var slice = [].slice;

  var defaultToWhiteSpace = function(characters) {
    if (characters == null)
      return '\\s';
    else if (characters.source)
      return characters.source;
    else
      return '[' + _s.escapeRegExp(characters) + ']';
  };

  // Helper for toBoolean
  function boolMatch(s, matchers) {
    var i, matcher, down = s.toLowerCase();
    matchers = [].concat(matchers);
    for (i = 0; i < matchers.length; i += 1) {
      matcher = matchers[i];
      if (!matcher) continue;
      if (matcher.test && matcher.test(s)) return true;
      if (matcher.toLowerCase() === down) return true;
    }
  }

  var escapeChars = {
    lt: '<',
    gt: '>',
    quot: '"',
    amp: '&',
    apos: "'"
  };

  var reversedEscapeChars = {};
  for(var key in escapeChars) reversedEscapeChars[escapeChars[key]] = key;
  reversedEscapeChars["'"] = '#39';

  // sprintf() for JavaScript 0.7-beta1
  // http://www.diveintojavascript.com/projects/javascript-sprintf
  //
  // Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
  // All rights reserved.

  var sprintf = (function() {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }

    var str_repeat = strRepeat;

    var str_format = function() {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function(parse_tree, argv) {
      var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === 'string') {
          output.push(parse_tree[i]);
        }
        else if (node_type === 'array') {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) { // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw new Error(sprintf('[_.sprintf] property "%s" does not exist', match[2][k]));
              }
              arg = arg[match[2][k]];
            }
          } else if (match[1]) { // positional argument (explicit)
            arg = argv[match[1]];
          }
          else { // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
            throw new Error(sprintf('[_.sprintf] expecting number but found %s', get_type(arg)));
          }
          switch (match[8]) {
            case 'b': arg = arg.toString(2); break;
            case 'c': arg = String.fromCharCode(arg); break;
            case 'd': arg = parseInt(arg, 10); break;
            case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
            case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
            case 'o': arg = arg.toString(8); break;
            case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
            case 'u': arg = Math.abs(arg); break;
            case 'x': arg = arg.toString(16); break;
            case 'X': arg = arg.toString(16).toUpperCase(); break;
          }
          arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
          pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : '';
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join('');
    };

    str_format.cache = {};

    str_format.parse = function(fmt) {
      var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        }
        else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push('%');
        }
        else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [], replacement_field = match[2], field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else {
                  throw new Error('[_.sprintf] huh?');
                }
              }
            }
            else {
              throw new Error('[_.sprintf] huh?');
            }
            match[2] = field_list;
          }
          else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw new Error('[_.sprintf] mixing positional and named placeholders is not (yet) supported');
          }
          parse_tree.push(match);
        }
        else {
          throw new Error('[_.sprintf] huh?');
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();



  // Defining underscore.string

  var _s = {

    VERSION: '2.4.0',

    isBlank: function(str){
      if (str == null) str = '';
      return (/^\s*$/).test(str);
    },

    stripTags: function(str){
      if (str == null) return '';
      return String(str).replace(/<\/?[^>]+>/g, '');
    },

    capitalize : function(str){
      str = str == null ? '' : String(str);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    chop: function(str, step){
      if (str == null) return [];
      str = String(str);
      step = ~~step;
      return step > 0 ? str.match(new RegExp('.{1,' + step + '}', 'g')) : [str];
    },

    clean: function(str){
      return _s.strip(str).replace(/\s+/g, ' ');
    },

    count: function(str, substr){
      if (str == null || substr == null) return 0;

      str = String(str);
      substr = String(substr);

      var count = 0,
        pos = 0,
        length = substr.length;

      while (true) {
        pos = str.indexOf(substr, pos);
        if (pos === -1) break;
        count++;
        pos += length;
      }

      return count;
    },

    chars: function(str) {
      if (str == null) return [];
      return String(str).split('');
    },

    swapCase: function(str) {
      if (str == null) return '';
      return String(str).replace(/\S/g, function(c){
        return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
      });
    },

    escapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, function(m){ return '&' + reversedEscapeChars[m] + ';'; });
    },

    unescapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/\&([^;]+);/g, function(entity, entityCode){
        var match;

        if (entityCode in escapeChars) {
          return escapeChars[entityCode];
        } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
          return String.fromCharCode(parseInt(match[1], 16));
        } else if (match = entityCode.match(/^#(\d+)$/)) {
          return String.fromCharCode(~~match[1]);
        } else {
          return entity;
        }
      });
    },

    escapeRegExp: function(str){
      if (str == null) return '';
      return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    },

    splice: function(str, i, howmany, substr){
      var arr = _s.chars(str);
      arr.splice(~~i, ~~howmany, substr);
      return arr.join('');
    },

    insert: function(str, i, substr){
      return _s.splice(str, i, 0, substr);
    },

    include: function(str, needle){
      if (needle === '') return true;
      if (str == null) return false;
      return String(str).indexOf(needle) !== -1;
    },

    join: function() {
      var args = slice.call(arguments),
        separator = args.shift();

      if (separator == null) separator = '';

      return args.join(separator);
    },

    lines: function(str) {
      if (str == null) return [];
      return String(str).split("\n");
    },

    reverse: function(str){
      return _s.chars(str).reverse().join('');
    },

    startsWith: function(str, starts){
      if (starts === '') return true;
      if (str == null || starts == null) return false;
      str = String(str); starts = String(starts);
      return str.length >= starts.length && str.slice(0, starts.length) === starts;
    },

    endsWith: function(str, ends){
      if (ends === '') return true;
      if (str == null || ends == null) return false;
      str = String(str); ends = String(ends);
      return str.length >= ends.length && str.slice(str.length - ends.length) === ends;
    },

    succ: function(str){
      if (str == null) return '';
      str = String(str);
      return str.slice(0, -1) + String.fromCharCode(str.charCodeAt(str.length-1) + 1);
    },

    titleize: function(str){
      if (str == null) return '';
      str  = String(str).toLowerCase();
      return str.replace(/(?:^|\s|-)\S/g, function(c){ return c.toUpperCase(); });
    },

    camelize: function(str){
      return _s.trim(str).replace(/[-_\s]+(.)?/g, function(match, c){ return c ? c.toUpperCase() : ""; });
    },

    underscored: function(str){
      return _s.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },

    dasherize: function(str){
      return _s.trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
    },

    classify: function(str){
      return _s.capitalize(_s.camelize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
    },

    humanize: function(str){
      return _s.capitalize(_s.underscored(str).replace(/_id$/,'').replace(/_/g, ' '));
    },

    trim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrim) return nativeTrim.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('^' + characters + '+|' + characters + '+$', 'g'), '');
    },

    ltrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimLeft) return nativeTrimLeft.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('^' + characters + '+'), '');
    },

    rtrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp(characters + '+$'), '');
    },

    truncate: function(str, length, truncateStr){
      if (str == null) return '';
      str = String(str); truncateStr = truncateStr || '...';
      length = ~~length;
      return str.length > length ? str.slice(0, length) + truncateStr : str;
    },

    /**
     * _s.prune: a more elegant version of truncate
     * prune extra chars, never leaving a half-chopped word.
     * @author github.com/rwz
     */
    prune: function(str, length, pruneStr){
      if (str == null) return '';

      str = String(str); length = ~~length;
      pruneStr = pruneStr != null ? String(pruneStr) : '...';

      if (str.length <= length) return str;

      var tmpl = function(c){ return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' '; },
        template = str.slice(0, length+1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

      if (template.slice(template.length-2).match(/\w\w/))
        template = template.replace(/\s*\S+$/, '');
      else
        template = _s.rtrim(template.slice(0, template.length-1));

      return (template+pruneStr).length > str.length ? str : str.slice(0, template.length)+pruneStr;
    },

    words: function(str, delimiter) {
      if (_s.isBlank(str)) return [];
      return _s.trim(str, delimiter).split(delimiter || /\s+/);
    },

    pad: function(str, length, padStr, type) {
      str = str == null ? '' : String(str);
      length = ~~length;

      var padlen  = 0;

      if (!padStr)
        padStr = ' ';
      else if (padStr.length > 1)
        padStr = padStr.charAt(0);

      switch(type) {
        case 'right':
          padlen = length - str.length;
          return str + strRepeat(padStr, padlen);
        case 'both':
          padlen = length - str.length;
          return strRepeat(padStr, Math.ceil(padlen/2)) + str
                  + strRepeat(padStr, Math.floor(padlen/2));
        default: // 'left'
          padlen = length - str.length;
          return strRepeat(padStr, padlen) + str;
        }
    },

    lpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr);
    },

    rpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'right');
    },

    lrpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'both');
    },

    sprintf: sprintf,

    vsprintf: function(fmt, argv){
      argv.unshift(fmt);
      return sprintf.apply(null, argv);
    },

    toNumber: function(str, decimals) {
      if (!str) return 0;
      str = _s.trim(str);
      if (!str.match(/^-?\d+(?:\.\d+)?$/)) return NaN;
      return parseNumber(parseNumber(str).toFixed(~~decimals));
    },

    numberFormat : function(number, dec, dsep, tsep) {
      if (isNaN(number) || number == null) return '';

      number = number.toFixed(~~dec);
      tsep = typeof tsep == 'string' ? tsep : ',';

      var parts = number.split('.'), fnums = parts[0],
        decimals = parts[1] ? (dsep || '.') + parts[1] : '';

      return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
    },

    strRight: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strRightBack: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.lastIndexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strLeft: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    strLeftBack: function(str, sep){
      if (str == null) return '';
      str += ''; sep = sep != null ? ''+sep : sep;
      var pos = str.lastIndexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    toSentence: function(array, separator, lastSeparator, serial) {
      separator = separator || ', ';
      lastSeparator = lastSeparator || ' and ';
      var a = array.slice(), lastMember = a.pop();

      if (array.length > 2 && serial) lastSeparator = _s.rtrim(separator) + lastSeparator;

      return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
    },

    toSentenceSerial: function() {
      var args = slice.call(arguments);
      args[3] = true;
      return _s.toSentence.apply(_s, args);
    },

    slugify: function(str) {
      if (str == null) return '';

      var from  = "ąàáäâãåæăćęèéëêìíïîłńòóöôõøśșțùúüûñçżź",
          to    = "aaaaaaaaaceeeeeiiiilnoooooosstuuuunczz",
          regex = new RegExp(defaultToWhiteSpace(from), 'g');

      str = String(str).toLowerCase().replace(regex, function(c){
        var index = from.indexOf(c);
        return to.charAt(index) || '-';
      });

      return _s.dasherize(str.replace(/[^\w\s-]/g, ''));
    },

    surround: function(str, wrapper) {
      return [wrapper, str, wrapper].join('');
    },

    quote: function(str, quoteChar) {
      return _s.surround(str, quoteChar || '"');
    },

    unquote: function(str, quoteChar) {
      quoteChar = quoteChar || '"';
      if (str[0] === quoteChar && str[str.length-1] === quoteChar)
        return str.slice(1,str.length-1);
      else return str;
    },

    exports: function() {
      var result = {};

      for (var prop in this) {
        if (!this.hasOwnProperty(prop) || prop.match(/^(?:include|contains|reverse)$/)) continue;
        result[prop] = this[prop];
      }

      return result;
    },

    repeat: function(str, qty, separator){
      if (str == null) return '';

      qty = ~~qty;

      // using faster implementation if separator is not needed;
      if (separator == null) return strRepeat(String(str), qty);

      // this one is about 300x slower in Google Chrome
      for (var repeat = []; qty > 0; repeat[--qty] = str) {}
      return repeat.join(separator);
    },

    naturalCmp: function(str1, str2){
      if (str1 == str2) return 0;
      if (!str1) return -1;
      if (!str2) return 1;

      var cmpRegex = /(\.\d+)|(\d+)|(\D+)/g,
        tokens1 = String(str1).toLowerCase().match(cmpRegex),
        tokens2 = String(str2).toLowerCase().match(cmpRegex),
        count = Math.min(tokens1.length, tokens2.length);

      for(var i = 0; i < count; i++) {
        var a = tokens1[i], b = tokens2[i];

        if (a !== b){
          var num1 = parseInt(a, 10);
          if (!isNaN(num1)){
            var num2 = parseInt(b, 10);
            if (!isNaN(num2) && num1 - num2)
              return num1 - num2;
          }
          return a < b ? -1 : 1;
        }
      }

      if (tokens1.length === tokens2.length)
        return tokens1.length - tokens2.length;

      return str1 < str2 ? -1 : 1;
    },

    levenshtein: function(str1, str2) {
      if (str1 == null && str2 == null) return 0;
      if (str1 == null) return String(str2).length;
      if (str2 == null) return String(str1).length;

      str1 = String(str1); str2 = String(str2);

      var current = [], prev, value;

      for (var i = 0; i <= str2.length; i++)
        for (var j = 0; j <= str1.length; j++) {
          if (i && j)
            if (str1.charAt(j - 1) === str2.charAt(i - 1))
              value = prev;
            else
              value = Math.min(current[j], current[j - 1], prev) + 1;
          else
            value = i + j;

          prev = current[j];
          current[j] = value;
        }

      return current.pop();
    },

    toBoolean: function(str, trueValues, falseValues) {
      if (typeof str === "number") str = "" + str;
      if (typeof str !== "string") return !!str;
      str = _s.trim(str);
      if (boolMatch(str, trueValues || ["true", "1"])) return true;
      if (boolMatch(str, falseValues || ["false", "0"])) return false;
    }
  };

  // Aliases

  _s.strip    = _s.trim;
  _s.lstrip   = _s.ltrim;
  _s.rstrip   = _s.rtrim;
  _s.center   = _s.lrpad;
  _s.rjust    = _s.lpad;
  _s.ljust    = _s.rpad;
  _s.contains = _s.include;
  _s.q        = _s.quote;
  _s.toBool   = _s.toBoolean;

  // Exporting

  // CommonJS module is defined
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      module.exports = _s;

    exports._s = _s;
  }

  // Register as a named module with AMD.
  if (typeof define === 'function' && define.amd)
    define('underscore.string', [], function(){ return _s; });


  // Integrate with Underscore.js if defined
  // or create our own underscore object.
  root._ = root._ || {};
  root._.string = root._.str = _s;
}(this, String);

},{}]},{},[16])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0FuaW1hdGlvbi5jb2ZmZWUiLCIvVXNlcnMvc291cG9yc2VyaW91cy9Db2RlL2ZyYW1lci1za2V0Y2gtYm9pbGVycGxhdGUvbm9kZV9tb2R1bGVzL2ZyYW1lcmpzL2ZyYW1lci9BbmltYXRpb25Mb29wLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0FuaW1hdG9yLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0FuaW1hdG9ycy9CZXppZXJDdXJ2ZUFuaW1hdG9yLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0FuaW1hdG9ycy9MaW5lYXJBbmltYXRvci5jb2ZmZWUiLCIvVXNlcnMvc291cG9yc2VyaW91cy9Db2RlL2ZyYW1lci1za2V0Y2gtYm9pbGVycGxhdGUvbm9kZV9tb2R1bGVzL2ZyYW1lcmpzL2ZyYW1lci9BbmltYXRvcnMvU3ByaW5nREhPQW5pbWF0b3IuY29mZmVlIiwiL1VzZXJzL3NvdXBvcnNlcmlvdXMvQ29kZS9mcmFtZXItc2tldGNoLWJvaWxlcnBsYXRlL25vZGVfbW9kdWxlcy9mcmFtZXJqcy9mcmFtZXIvQW5pbWF0b3JzL1NwcmluZ1JLNEFuaW1hdG9yLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0Jhc2VDbGFzcy5jb2ZmZWUiLCIvVXNlcnMvc291cG9yc2VyaW91cy9Db2RlL2ZyYW1lci1za2V0Y2gtYm9pbGVycGxhdGUvbm9kZV9tb2R1bGVzL2ZyYW1lcmpzL2ZyYW1lci9Db21wYXQuY29mZmVlIiwiL1VzZXJzL3NvdXBvcnNlcmlvdXMvQ29kZS9mcmFtZXItc2tldGNoLWJvaWxlcnBsYXRlL25vZGVfbW9kdWxlcy9mcmFtZXJqcy9mcmFtZXIvQ29uZmlnLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0RlYnVnLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0RlZmF1bHRzLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0V2ZW50RW1pdHRlci5jb2ZmZWUiLCIvVXNlcnMvc291cG9yc2VyaW91cy9Db2RlL2ZyYW1lci1za2V0Y2gtYm9pbGVycGxhdGUvbm9kZV9tb2R1bGVzL2ZyYW1lcmpzL2ZyYW1lci9FdmVudHMuY29mZmVlIiwiL1VzZXJzL3NvdXBvcnNlcmlvdXMvQ29kZS9mcmFtZXItc2tldGNoLWJvaWxlcnBsYXRlL25vZGVfbW9kdWxlcy9mcmFtZXJqcy9mcmFtZXIvRnJhbWUuY29mZmVlIiwiL1VzZXJzL3NvdXBvcnNlcmlvdXMvQ29kZS9mcmFtZXItc2tldGNoLWJvaWxlcnBsYXRlL25vZGVfbW9kdWxlcy9mcmFtZXJqcy9mcmFtZXIvRnJhbWVyLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0ltcG9ydGVyLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0xheWVyLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0xheWVyRHJhZ2dhYmxlLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0xheWVyU3RhdGVzLmNvZmZlZSIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvZnJhbWVyanMvZnJhbWVyL0xheWVyU3R5bGUuY29mZmVlIiwiL1VzZXJzL3NvdXBvcnNlcmlvdXMvQ29kZS9mcmFtZXItc2tldGNoLWJvaWxlcnBsYXRlL25vZGVfbW9kdWxlcy9mcmFtZXJqcy9mcmFtZXIvVW5kZXJzY29yZS5jb2ZmZWUiLCIvVXNlcnMvc291cG9yc2VyaW91cy9Db2RlL2ZyYW1lci1za2V0Y2gtYm9pbGVycGxhdGUvbm9kZV9tb2R1bGVzL2ZyYW1lcmpzL2ZyYW1lci9VdGlscy5jb2ZmZWUiLCIvVXNlcnMvc291cG9yc2VyaW91cy9Db2RlL2ZyYW1lci1za2V0Y2gtYm9pbGVycGxhdGUvbm9kZV9tb2R1bGVzL2xvZGFzaC9kaXN0L2xvZGFzaC5qcyIsIi9Vc2Vycy9zb3Vwb3JzZXJpb3VzL0NvZGUvZnJhbWVyLXNrZXRjaC1ib2lsZXJwbGF0ZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS5zdHJpbmcvbGliL3VuZGVyc2NvcmUuc3RyaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFBLDJKQUFBO0dBQUE7O2tTQUFBOztBQUFDLENBQUQsRUFBTSxJQUFBLE9BQUE7O0FBRU4sQ0FGQSxFQUVRLEVBQVIsRUFBUSxFQUFBOztBQUVQLENBSkQs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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsb05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIntffSA9IHJlcXVpcmUgXCIuL1VuZGVyc2NvcmVcIlxuXG5VdGlscyA9IHJlcXVpcmUgXCIuL1V0aWxzXCJcblxue0NvbmZpZ30gPSByZXF1aXJlIFwiLi9Db25maWdcIlxue0RlZmF1bHRzfSA9IHJlcXVpcmUgXCIuL0RlZmF1bHRzXCJcbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcbntGcmFtZX0gPSByZXF1aXJlIFwiLi9GcmFtZVwiXG5cbntMaW5lYXJBbmltYXRvcn0gPSByZXF1aXJlIFwiLi9BbmltYXRvcnMvTGluZWFyQW5pbWF0b3JcIlxue0JlemllckN1cnZlQW5pbWF0b3J9ID0gcmVxdWlyZSBcIi4vQW5pbWF0b3JzL0JlemllckN1cnZlQW5pbWF0b3JcIlxue1NwcmluZ1JLNEFuaW1hdG9yfSA9IHJlcXVpcmUgXCIuL0FuaW1hdG9ycy9TcHJpbmdSSzRBbmltYXRvclwiXG57U3ByaW5nREhPQW5pbWF0b3J9ID0gcmVxdWlyZSBcIi4vQW5pbWF0b3JzL1NwcmluZ0RIT0FuaW1hdG9yXCJcblxuQW5pbWF0b3JDbGFzc2VzID1cblx0XCJsaW5lYXJcIjogTGluZWFyQW5pbWF0b3Jcblx0XCJiZXppZXItY3VydmVcIjogQmV6aWVyQ3VydmVBbmltYXRvclxuXHRcInNwcmluZy1yazRcIjogU3ByaW5nUks0QW5pbWF0b3Jcblx0XCJzcHJpbmctZGhvXCI6IFNwcmluZ0RIT0FuaW1hdG9yXG5cbkFuaW1hdG9yQ2xhc3Nlc1tcInNwcmluZ1wiXSA9IEFuaW1hdG9yQ2xhc3Nlc1tcInNwcmluZy1yazRcIl1cbkFuaW1hdG9yQ2xhc3Nlc1tcImN1YmljLWJlemllclwiXSA9IEFuaW1hdG9yQ2xhc3Nlc1tcImJlemllci1jdXJ2ZVwiXVxuXG5fcnVubmluZ0FuaW1hdGlvbnMgPSBbXVxuXG4jIFRvZG86IHRoaXMgd291bGQgbm9ybWFsbHkgYmUgQmFzZUNsYXNzIGJ1dCB0aGUgcHJvcGVydGllcyBrZXl3b3JkXG4jIGlzIG5vdCBjb21wYXRpYmxlIGFuZCBjYXVzZXMgcHJvYmxlbXMuXG5jbGFzcyBleHBvcnRzLkFuaW1hdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlclxuXG5cdEBydW5uaW5nQW5pbWF0aW9ucyA9IC0+XG5cdFx0X3J1bm5pbmdBbmltYXRpb25zXG5cblx0Y29uc3RydWN0b3I6IChvcHRpb25zPXt9KSAtPlxuXG5cdFx0b3B0aW9ucyA9IERlZmF1bHRzLmdldERlZmF1bHRzIFwiQW5pbWF0aW9uXCIsIG9wdGlvbnNcblxuXHRcdHN1cGVyIG9wdGlvbnNcblxuXHRcdEBvcHRpb25zID0gVXRpbHMuc2V0RGVmYXVsdFByb3BlcnRpZXMgb3B0aW9ucyxcblx0XHRcdGxheWVyOiBudWxsXG5cdFx0XHRwcm9wZXJ0aWVzOiB7fVxuXHRcdFx0Y3VydmU6IFwibGluZWFyXCJcblx0XHRcdGN1cnZlT3B0aW9uczoge31cblx0XHRcdHRpbWU6IDFcblx0XHRcdHJlcGVhdDogMFxuXHRcdFx0ZGVsYXk6IDBcblx0XHRcdGRlYnVnOiB0cnVlXG5cblx0XHRpZiBvcHRpb25zLmxheWVyIGlzIG51bGxcblx0XHRcdGNvbnNvbGUuZXJyb3IgXCJBbmltYXRpb246IG1pc3NpbmcgbGF5ZXJcIlxuXG5cdFx0aWYgb3B0aW9ucy5vcmlnaW5cblx0XHRcdGNvbnNvbGUud2FybiBcIkFuaW1hdGlvbi5vcmlnaW46IHBsZWFzZSB1c2UgbGF5ZXIub3JpZ2luWCBhbmQgbGF5ZXIub3JpZ2luWVwiXG5cblx0XHQjIENvbnZlcnQgYSBmcmFtZSBpbnN0YW5jZSB0byBhIHJlZ3VsYXIganMgb2JqZWN0XG5cdFx0aWYgb3B0aW9ucy5wcm9wZXJ0aWVzIGluc3RhbmNlb2YgRnJhbWVcblx0XHRcdG9wdGlvbi5wcm9wZXJ0aWVzID0gb3B0aW9uLnByb3BlcnRpZXMucHJvcGVydGllc1xuXG5cdFx0QG9wdGlvbnMucHJvcGVydGllcyA9IEBfZmlsdGVyQW5pbWF0YWJsZVByb3BlcnRpZXMgQG9wdGlvbnMucHJvcGVydGllc1xuXG5cdFx0QF9wYXJzZUFuaW1hdG9yT3B0aW9ucygpXG5cdFx0QF9vcmlnaW5hbFN0YXRlID0gQF9jdXJyZW50U3RhdGUoKVxuXHRcdEBfcmVwZWF0Q291bnRlciA9IEBvcHRpb25zLnJlcGVhdFxuXG5cdF9maWx0ZXJBbmltYXRhYmxlUHJvcGVydGllczogKHByb3BlcnRpZXMpIC0+XG5cblx0XHRhbmltYXRhYmxlUHJvcGVydGllcyA9IHt9XG5cblx0XHQjIE9ubHkgYW5pbWF0ZSBudW1lcmljIHByb3BlcnRpZXMgZm9yIG5vd1xuXHRcdGZvciBrLCB2IG9mIHByb3BlcnRpZXNcblx0XHRcdGFuaW1hdGFibGVQcm9wZXJ0aWVzW2tdID0gdiBpZiBfLmlzTnVtYmVyIHZcblxuXHRcdGFuaW1hdGFibGVQcm9wZXJ0aWVzXG5cblx0X2N1cnJlbnRTdGF0ZTogLT5cblx0XHRfLnBpY2sgQG9wdGlvbnMubGF5ZXIsIF8ua2V5cyhAb3B0aW9ucy5wcm9wZXJ0aWVzKVxuXG5cdF9hbmltYXRvckNsYXNzOiAtPlxuXG5cdFx0cGFyc2VkQ3VydmUgPSBVdGlscy5wYXJzZUZ1bmN0aW9uIEBvcHRpb25zLmN1cnZlXG5cdFx0YW5pbWF0b3JDbGFzc05hbWUgPSBwYXJzZWRDdXJ2ZS5uYW1lLnRvTG93ZXJDYXNlKClcblxuXHRcdGlmIEFuaW1hdG9yQ2xhc3Nlcy5oYXNPd25Qcm9wZXJ0eSBhbmltYXRvckNsYXNzTmFtZVxuXHRcdFx0cmV0dXJuIEFuaW1hdG9yQ2xhc3Nlc1thbmltYXRvckNsYXNzTmFtZV1cblxuXHRcdHJldHVybiBMaW5lYXJBbmltYXRvclxuXG5cdF9wYXJzZUFuaW1hdG9yT3B0aW9uczogLT5cblxuXHRcdGFuaW1hdG9yQ2xhc3MgPSBAX2FuaW1hdG9yQ2xhc3MoKVxuXHRcdHBhcnNlZEN1cnZlID0gVXRpbHMucGFyc2VGdW5jdGlvbiBAb3B0aW9ucy5jdXJ2ZVxuXG5cdFx0IyBUaGlzIGlzIGZvciBjb21wYXRpYmlsaXR5IHdpdGggdGhlIGRpcmVjdCBBbmltYXRpb24udGltZSBhcmd1bWVudC4gVGhpcyBzaG91bGRcblx0XHQjIGlkZWFsbHkgYWxzbyBiZSBwYXNzZWQgYXMgYSBjdXJ2ZU9wdGlvblxuXG5cdFx0aWYgYW5pbWF0b3JDbGFzcyBpbiBbTGluZWFyQW5pbWF0b3IsIEJlemllckN1cnZlQW5pbWF0b3JdXG5cdFx0XHRpZiBfLmlzU3RyaW5nKEBvcHRpb25zLmN1cnZlT3B0aW9ucykgb3IgXy5pc0FycmF5KEBvcHRpb25zLmN1cnZlT3B0aW9ucylcblx0XHRcdFx0QG9wdGlvbnMuY3VydmVPcHRpb25zID1cblx0XHRcdFx0XHR2YWx1ZXM6IEBvcHRpb25zLmN1cnZlT3B0aW9uc1xuXG5cdFx0XHRAb3B0aW9ucy5jdXJ2ZU9wdGlvbnMudGltZSA/PSBAb3B0aW9ucy50aW1lXG5cblx0XHQjIEFsbCB0aGlzIGlzIHRvIHN1cHBvcnQgY3VydmU6IFwic3ByaW5nKDEwMCwyMCwxMClcIi4gSW4gdGhlIGZ1dHVyZSB3ZSdkIGxpa2UgcGVvcGxlXG5cdFx0IyB0byBzdGFydCB1c2luZyBjdXJ2ZU9wdGlvbnM6IHt0ZW5zaW9uOjEwMCwgZnJpY3Rpb246MTB9IGV0Y1xuXG5cdFx0aWYgcGFyc2VkQ3VydmUuYXJncy5sZW5ndGhcblxuXHRcdFx0IyBjb25zb2xlLndhcm4gXCJBbmltYXRpb24uY3VydmUgYXJndW1lbnRzIGFyZSBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIEFuaW1hdGlvbi5jdXJ2ZU9wdGlvbnNcIlxuXG5cdFx0XHRpZiBhbmltYXRvckNsYXNzIGlzIEJlemllckN1cnZlQW5pbWF0b3Jcblx0XHRcdFx0QG9wdGlvbnMuY3VydmVPcHRpb25zLnZhbHVlcyA9IHBhcnNlZEN1cnZlLmFyZ3MubWFwICh2KSAtPiBwYXJzZUZsb2F0KHYpIG9yIDBcblxuXHRcdFx0aWYgYW5pbWF0b3JDbGFzcyBpcyBTcHJpbmdSSzRBbmltYXRvclxuXHRcdFx0XHRmb3IgaywgaSBpbiBbXCJ0ZW5zaW9uXCIsIFwiZnJpY3Rpb25cIiwgXCJ2ZWxvY2l0eVwiXVxuXHRcdFx0XHRcdHZhbHVlID0gcGFyc2VGbG9hdCBwYXJzZWRDdXJ2ZS5hcmdzW2ldXG5cdFx0XHRcdFx0QG9wdGlvbnMuY3VydmVPcHRpb25zW2tdID0gdmFsdWUgaWYgdmFsdWVcblxuXHRcdFx0aWYgYW5pbWF0b3JDbGFzcyBpcyBTcHJpbmdESE9BbmltYXRvclxuXHRcdFx0XHRmb3IgaywgaSBpbiBbXCJzdGlmZm5lc3NcIiwgXCJkYW1waW5nXCIsIFwibWFzc1wiLCBcInRvbGVyYW5jZVwiXVxuXHRcdFx0XHRcdHZhbHVlID0gcGFyc2VGbG9hdCBwYXJzZWRDdXJ2ZS5hcmdzW2ldXG5cdFx0XHRcdFx0QG9wdGlvbnMuY3VydmVPcHRpb25zW2tdID0gdmFsdWUgaWYgdmFsdWVcblxuXHRzdGFydDogPT5cblxuXHRcdEFuaW1hdG9yQ2xhc3MgPSBAX2FuaW1hdG9yQ2xhc3MoKVxuXG5cdFx0Y29uc29sZS5kZWJ1ZyBcIkFuaW1hdGlvbi5zdGFydCAje0FuaW1hdG9yQ2xhc3MubmFtZX1cIiwgQG9wdGlvbnMuY3VydmVPcHRpb25zXG5cblx0XHRAX2FuaW1hdG9yID0gbmV3IEFuaW1hdG9yQ2xhc3MgQG9wdGlvbnMuY3VydmVPcHRpb25zXG5cblx0XHR0YXJnZXQgPSBAb3B0aW9ucy5sYXllclxuXHRcdHN0YXRlQSA9IEBfY3VycmVudFN0YXRlKClcblx0XHRzdGF0ZUIgPSB7fVxuXG5cdFx0IyBGaWx0ZXIgb3V0IHRoZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIGVxdWFsXG5cdFx0Zm9yIGssIHYgb2YgQG9wdGlvbnMucHJvcGVydGllc1xuXHRcdFx0c3RhdGVCW2tdID0gdiBpZiBzdGF0ZUFba10gIT0gdlxuXG5cdFx0aWYgXy5pc0VxdWFsIHN0YXRlQSwgc3RhdGVCXG5cdFx0XHRjb25zb2xlLndhcm4gXCJOb3RoaW5nIHRvIGFuaW1hdGVcIlxuXG5cdFx0Y29uc29sZS5kZWJ1ZyBcIkFuaW1hdGlvbi5zdGFydFwiXG5cdFx0Y29uc29sZS5kZWJ1ZyBcIlxcdCN7a306ICN7c3RhdGVBW2tdfSAtPiAje3N0YXRlQltrXX1cIiBmb3IgaywgdiBvZiBzdGF0ZUIgXG5cblx0XHRAX2FuaW1hdG9yLm9uIFwic3RhcnRcIiwgPT4gQGVtaXQgXCJzdGFydFwiXG5cdFx0QF9hbmltYXRvci5vbiBcInN0b3BcIiwgID0+IEBlbWl0IFwic3RvcFwiXG5cdFx0QF9hbmltYXRvci5vbiBcImVuZFwiLCAgID0+IEBlbWl0IFwiZW5kXCJcblxuXHRcdCMgU2VlIGlmIHdlIG5lZWQgdG8gcmVwZWF0IHRoaXMgYW5pbWF0aW9uXG5cdFx0IyBUb2RvOiBtb3JlIHJlcGVhdCBiZWhhdmlvdXJzOlxuXHRcdCMgMSkgYWRkIChmcm9tIGVuZCBwb3NpdGlvbikgMikgcmV2ZXJzZSAobG9vcCBiZXR3ZWVuIGEgYW5kIGIpXG5cdFx0aWYgQF9yZXBlYXRDb3VudGVyID4gMFxuXHRcdFx0QF9hbmltYXRvci5vbiBcImVuZFwiLCA9PlxuXHRcdFx0XHRmb3IgaywgdiBvZiBzdGF0ZUFcblx0XHRcdFx0XHR0YXJnZXRba10gPSB2XG5cdFx0XHRcdEBfcmVwZWF0Q291bnRlci0tXG5cdFx0XHRcdEBzdGFydCgpXG5cblx0XHQjIFRoaXMgaXMgdGhlIGZ1bmN0aW9uIHRoYXQgc2V0cyB0aGUgYWN0dWFsIHZhbHVlIHRvIHRoZSBsYXllciBpbiB0aGVcblx0XHQjIGFuaW1hdGlvbiBsb29wLiBJdCBuZWVkcyB0byBiZSB2ZXJ5IGZhc3QuXG5cdFx0QF9hbmltYXRvci5vbiBcInRpY2tcIiwgKHZhbHVlKSAtPlxuXHRcdFx0Zm9yIGssIHYgb2Ygc3RhdGVCXG5cdFx0XHRcdHRhcmdldFtrXSA9IFV0aWxzLm1hcFJhbmdlIHZhbHVlLCAwLCAxLCBzdGF0ZUFba10sIHN0YXRlQltrXVxuXHRcdFx0cmV0dXJuICMgRm9yIHBlcmZvcm1hbmNlXG5cblx0XHRzdGFydCA9ID0+XG5cdFx0XHRfcnVubmluZ0FuaW1hdGlvbnMucHVzaCBAXG5cdFx0XHRAX2FuaW1hdG9yLnN0YXJ0KClcblxuXHRcdCMgSWYgd2UgaGF2ZSBhIGRlbGF5LCB3ZSB3YWl0IGEgYml0IGZvciBpdCB0byBzdGFydFxuXHRcdGlmIEBvcHRpb25zLmRlbGF5XG5cdFx0XHRVdGlscy5kZWxheSBAb3B0aW9ucy5kZWxheSwgc3RhcnRcblx0XHRlbHNlXG5cdFx0XHRzdGFydCgpXG5cblxuXHRzdG9wOiAtPlxuXHRcdEBfYW5pbWF0b3Iuc3RvcCgpXG5cdFx0X3J1bm5pbmdBbmltYXRpb25zID0gXy53aXRob3V0IF9ydW5uaW5nQW5pbWF0aW9ucywgQFxuXG5cdHJldmVyc2U6IC0+XG5cdFx0IyBUT0RPOiBBZGQgc29tZSB0ZXN0c1xuXHRcdG9wdGlvbnMgPSBfLmNsb25lIEBvcHRpb25zXG5cdFx0b3B0aW9ucy5wcm9wZXJ0aWVzID0gQF9vcmlnaW5hbFN0YXRlXG5cdFx0YW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbiBvcHRpb25zXG5cdFx0YW5pbWF0aW9uXG5cblx0IyBBIGJ1bmNoIG9mIGNvbW1vbiBhbGlhc2VzIHRvIG1pbmltaXplIGZydXN0cmF0aW9uXG5cdHJldmVydDogLT4gXHRAcmV2ZXJzZSgpXG5cdGludmVyc2U6IC0+IEByZXZlcnNlKClcblx0aW52ZXJ0OiAtPiBcdEByZXZlcnNlKClcblxuXHRlbWl0OiAoZXZlbnQpIC0+XG5cdFx0c3VwZXJcblx0XHQjIEFsc28gZW1pdCB0aGlzIHRvIHRoZSBsYXllciB3aXRoIHNlbGYgYXMgYXJndW1lbnRcblx0XHRAb3B0aW9ucy5sYXllci5lbWl0IGV2ZW50LCBAXG4iLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntDb25maWd9ID0gcmVxdWlyZSBcIi4vQ29uZmlnXCJcbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcblxuIyBOb3RlOiB0aGlzIGlzIG5vdCBhbiBvYmplY3QgYmVjYXVzZSB0aGVyZSBzaG91bGQgcmVhbGx5IG9ubHkgYmUgb25lXG5cbkFuaW1hdGlvbkxvb3BJbmRleEtleSA9IFwiX2FuaW1hdGlvbkxvb3BJbmRleFwiXG5cbkFuaW1hdGlvbkxvb3AgPSBcblxuXHRkZWJ1ZzogZmFsc2VcblxuXHRfYW5pbWF0b3JzOiBbXVxuXHRfcnVubmluZzogZmFsc2Vcblx0X2ZyYW1lQ291bnRlcjogMFxuXHRfc2Vzc2lvblRpbWU6IDBcblx0XG5cdF9zdGFydDogLT5cblxuXHRcdGlmIEFuaW1hdGlvbkxvb3AuX3J1bm5pbmdcblx0XHRcdHJldHVyblxuXG5cdFx0aWYgbm90IEFuaW1hdGlvbkxvb3AuX2FuaW1hdG9ycy5sZW5ndGhcblx0XHRcdHJldHVyblxuXG5cdFx0QW5pbWF0aW9uTG9vcC5fcnVubmluZyA9IHRydWVcblx0XHRBbmltYXRpb25Mb29wLl90aW1lID0gVXRpbHMuZ2V0VGltZSgpXG5cdFx0QW5pbWF0aW9uTG9vcC5fc2Vzc2lvblRpbWUgPSAwXG5cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIEFuaW1hdGlvbkxvb3AuX3RpY2tcblxuXHRfc3RvcDogLT5cblx0XHRjb25zb2xlLmRlYnVnIFwiQW5pbWF0aW9uTG9vcC5fc3RvcFwiXG5cdFx0QW5pbWF0aW9uTG9vcC5fcnVubmluZyA9IGZhbHNlXG5cblxuXHRfdGljazogLT5cblxuXHRcdGlmIG5vdCBBbmltYXRpb25Mb29wLl9hbmltYXRvcnMubGVuZ3RoXG5cdFx0XHRyZXR1cm4gQW5pbWF0aW9uTG9vcC5fc3RvcCgpXG5cblx0XHRpZiBBbmltYXRpb25Mb29wLl9zZXNzaW9uVGltZSA9PSAwXG5cdFx0XHRjb25zb2xlLmRlYnVnIFwiQW5pbWF0aW9uTG9vcC5fc3RhcnRcIlxuXG5cblx0XHRBbmltYXRpb25Mb29wLl9mcmFtZUNvdW50ZXIrK1xuXHRcdFxuXHRcdHRpbWUgID0gVXRpbHMuZ2V0VGltZSgpXG5cdFx0ZGVsdGEgPSB0aW1lIC0gQW5pbWF0aW9uTG9vcC5fdGltZVxuXG5cdFx0QW5pbWF0aW9uTG9vcC5fc2Vzc2lvblRpbWUgKz0gZGVsdGFcblxuXHRcdCMgY29uc29sZS5kZWJ1ZyBbXG5cdFx0IyBcdFwiX3RpY2sgI3tBbmltYXRpb25Mb29wLl9mcmFtZUNvdW50ZXJ9IFwiLFxuXHRcdCMgXHRcIiN7VXRpbHMucm91bmQoZGVsdGEsIDUpfW1zIFwiLFxuXHRcdCMgXHRcIiN7VXRpbHMucm91bmQoQW5pbWF0aW9uTG9vcC5fc2Vzc2lvblRpbWUsIDUpfVwiLFxuXHRcdCMgXHRcImFuaW1hdG9yczoje0FuaW1hdGlvbkxvb3AuX2FuaW1hdG9ycy5sZW5ndGh9XCJcblx0XHQjIF0uam9pbiBcIiBcIlxuXG5cdFx0cmVtb3ZlQW5pbWF0b3JzID0gW11cblxuXHRcdGZvciBhbmltYXRvciBpbiBBbmltYXRpb25Mb29wLl9hbmltYXRvcnNcblxuXHRcdFx0YW5pbWF0b3IuZW1pdCBcInRpY2tcIiwgYW5pbWF0b3IubmV4dChkZWx0YSlcblxuXHRcdFx0aWYgYW5pbWF0b3IuZmluaXNoZWQoKVxuXHRcdFx0XHRhbmltYXRvci5lbWl0IFwidGlja1wiLCAxICMgVGhpcyBtYWtlcyBzdXJlIHdlIGFuZCBhdCBhIHBlcmZlY3QgdmFsdWVcblx0XHRcdFx0cmVtb3ZlQW5pbWF0b3JzLnB1c2ggYW5pbWF0b3JcblxuXHRcdEFuaW1hdGlvbkxvb3AuX3RpbWUgPSB0aW1lXG5cblx0XHRmb3IgYW5pbWF0b3IgaW4gcmVtb3ZlQW5pbWF0b3JzXG5cdFx0XHRBbmltYXRpb25Mb29wLnJlbW92ZSBhbmltYXRvclxuXHRcdFx0YW5pbWF0b3IuZW1pdCBcImVuZFwiXG5cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIEFuaW1hdGlvbkxvb3AuX3RpY2tcblxuXHRcdHJldHVybiAjIEltcG9ydGFudCBmb3IgcGVyZm9ybWFuY2VcblxuXHRhZGQ6IChhbmltYXRvcikgLT5cblxuXHRcdGlmIGFuaW1hdG9yLmhhc093blByb3BlcnR5IEFuaW1hdGlvbkxvb3BJbmRleEtleVxuXHRcdFx0cmV0dXJuXG5cblx0XHRhbmltYXRvcltBbmltYXRpb25Mb29wSW5kZXhLZXldID0gQW5pbWF0aW9uTG9vcC5fYW5pbWF0b3JzLnB1c2ggYW5pbWF0b3Jcblx0XHRhbmltYXRvci5lbWl0IFwic3RhcnRcIlxuXHRcdEFuaW1hdGlvbkxvb3AuX3N0YXJ0KClcblxuXHRyZW1vdmU6IChhbmltYXRvcikgLT5cblx0XHRBbmltYXRpb25Mb29wLl9hbmltYXRvcnMgPSBfLndpdGhvdXQgQW5pbWF0aW9uTG9vcC5fYW5pbWF0b3JzLCBhbmltYXRvclxuXHRcdGFuaW1hdG9yLmVtaXQgXCJzdG9wXCJcblxuZXhwb3J0cy5BbmltYXRpb25Mb29wID0gQW5pbWF0aW9uTG9vcFxuIiwiVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntDb25maWd9ID0gcmVxdWlyZSBcIi4vQ29uZmlnXCJcbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcbntBbmltYXRpb25Mb29wfSA9IHJlcXVpcmUgXCIuL0FuaW1hdGlvbkxvb3BcIlxuXG5jbGFzcyBleHBvcnRzLkFuaW1hdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyXG5cblx0XCJcIlwiXG5cdFRoZSBhbmltYXRvciBjbGFzcyBpcyBhIHZlcnkgc2ltcGxlIGNsYXNzIHRoYXRcblx0XHQtIFRha2VzIGEgc2V0IG9mIGlucHV0IHZhbHVlcyBhdCBzZXR1cCh7aW5wdXQgdmFsdWVzfSlcblx0XHQtIEVtaXRzIGFuIG91dHB1dCB2YWx1ZSBmb3IgcHJvZ3Jlc3MgKDAgLT4gMSkgaW4gdmFsdWUocHJvZ3Jlc3MpXG5cdFwiXCJcIlxuXHRcblx0Y29uc3RydWN0b3I6IChvcHRpb25zPXt9KSAtPlxuXHRcdEBzZXR1cCBvcHRpb25zXG5cblx0c2V0dXA6IChvcHRpb25zKSAtPlxuXHRcdHRocm93IEVycm9yIFwiTm90IGltcGxlbWVudGVkXCJcblxuXHRuZXh0OiAoZGVsdGEpIC0+XG5cdFx0dGhyb3cgRXJyb3IgXCJOb3QgaW1wbGVtZW50ZWRcIlxuXG5cdGZpbmlzaGVkOiAtPlxuXHRcdHRocm93IEVycm9yIFwiTm90IGltcGxlbWVudGVkXCJcblxuXHRzdGFydDogLT4gQW5pbWF0aW9uTG9vcC5hZGQgQFxuXHRzdG9wOiAtPiBBbmltYXRpb25Mb29wLnJlbW92ZSBAXG4iLCJ7X30gPSByZXF1aXJlIFwiLi4vVW5kZXJzY29yZVwiXG5VdGlscyA9IHJlcXVpcmUgXCIuLi9VdGlsc1wiXG5cbntBbmltYXRvcn0gPSByZXF1aXJlIFwiLi4vQW5pbWF0b3JcIlxuXG5CZXppZXJDdXJ2ZURlZmF1bHRzID1cblx0XCJsaW5lYXJcIjogWzAsIDAsIDEsIDFdXG5cdFwiZWFzZVwiOiBbLjI1LCAuMSwgLjI1LCAxXVxuXHRcImVhc2UtaW5cIjogWy40MiwgMCwgMSwgMV1cblx0XCJlYXNlLW91dFwiOiBbMCwgMCwgLjU4LCAxXVxuXHRcImVhc2UtaW4tb3V0XCI6IFsuNDIsIDAsIC41OCwgMV1cblxuY2xhc3MgZXhwb3J0cy5CZXppZXJDdXJ2ZUFuaW1hdG9yIGV4dGVuZHMgQW5pbWF0b3JcblxuXHRzZXR1cDogKG9wdGlvbnMpIC0+XG5cblx0XHQjIElucHV0IGlzIGEgb25lIG9mIHRoZSBuYW1lZCBiZXppZXIgY3VydmVzXG5cdFx0aWYgXy5pc1N0cmluZyhvcHRpb25zKSBhbmQgQmV6aWVyQ3VydmVEZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eSBvcHRpb25zLnRvTG93ZXJDYXNlKClcblx0XHRcdG9wdGlvbnMgPSB7IHZhbHVlczogQmV6aWVyQ3VydmVEZWZhdWx0c1tvcHRpb25zLnRvTG93ZXJDYXNlKCldIH1cblxuXHRcdCMgSW5wdXQgdmFsdWVzIGlzIG9uZSBvZiB0aGUgbmFtZWQgYmV6aWVyIGN1cnZlc1xuXHRcdGlmIG9wdGlvbnMudmFsdWVzIGFuZCBfLmlzU3RyaW5nKG9wdGlvbnMudmFsdWVzKSBhbmQgQmV6aWVyQ3VydmVEZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eSBvcHRpb25zLnZhbHVlcy50b0xvd2VyQ2FzZSgpXG5cdFx0XHRvcHRpb25zID0geyB2YWx1ZXM6IEJlemllckN1cnZlRGVmYXVsdHNbb3B0aW9ucy52YWx1ZXMudG9Mb3dlckNhc2UoKV0sIHRpbWU6IG9wdGlvbnMudGltZSB9XG5cblx0XHQjIElucHV0IGlzIGEgc2luZ2xlIGFycmF5IG9mIDQgdmFsdWVzXG5cdFx0aWYgXy5pc0FycmF5KG9wdGlvbnMpIGFuZCBvcHRpb25zLmxlbmd0aCBpcyA0XG5cdFx0XHRvcHRpb25zID0geyB2YWx1ZXM6IG9wdGlvbnMgfVxuXG5cdFx0QG9wdGlvbnMgPSBVdGlscy5zZXREZWZhdWx0UHJvcGVydGllcyBvcHRpb25zLFxuXHRcdFx0dmFsdWVzOiBCZXppZXJDdXJ2ZURlZmF1bHRzW1wiZWFzZS1pbi1vdXRcIl1cblx0XHRcdHRpbWU6IDFcblxuXHRcdEBfdW5pdEJlemllciA9IG5ldyBVbml0QmV6aWVyIFxcXG5cdFx0XHRAb3B0aW9ucy52YWx1ZXNbMF0sXG5cdFx0XHRAb3B0aW9ucy52YWx1ZXNbMV0sXG5cdFx0XHRAb3B0aW9ucy52YWx1ZXNbMl0sXG5cdFx0XHRAb3B0aW9ucy52YWx1ZXNbM10sXG5cblx0XHRAX3RpbWUgPSAwXG5cblxuXHRuZXh0OiAoZGVsdGEpIC0+XG5cblx0XHRAX3RpbWUgKz0gZGVsdGFcblxuXHRcdGlmIEBmaW5pc2hlZCgpXG5cdFx0XHRyZXR1cm4gMVxuXG5cdFx0QF91bml0QmV6aWVyLnNvbHZlIEBfdGltZSAvIEBvcHRpb25zLnRpbWVcblxuXHRmaW5pc2hlZDogLT5cblx0XHRAX3RpbWUgPj0gQG9wdGlvbnMudGltZVxuXG5cbiMgV2ViS2l0IGltcGxlbWVudGF0aW9uIGZvdW5kIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzExNjk3OTA5XG5cbmNsYXNzIFVuaXRCZXppZXJcblxuXHRlcHNpbG9uOiAxZS02ICMgUHJlY2lzaW9uXG5cblx0Y29uc3RydWN0b3I6IChwMXgsIHAxeSwgcDJ4LCBwMnkpIC0+XG5cblx0XHQjIHByZS1jYWxjdWxhdGUgdGhlIHBvbHlub21pYWwgY29lZmZpY2llbnRzXG5cdFx0IyBGaXJzdCBhbmQgbGFzdCBjb250cm9sIHBvaW50cyBhcmUgaW1wbGllZCB0byBiZSAoMCwwKSBhbmQgKDEuMCwgMS4wKVxuXHRcdEBjeCA9IDMuMCAqIHAxeFxuXHRcdEBieCA9IDMuMCAqIChwMnggLSBwMXgpIC0gQGN4XG5cdFx0QGF4ID0gMS4wIC0gQGN4IC0gQGJ4XG5cdFx0QGN5ID0gMy4wICogcDF5XG5cdFx0QGJ5ID0gMy4wICogKHAyeSAtIHAxeSkgLSBAY3lcblx0XHRAYXkgPSAxLjAgLSBAY3kgLSBAYnlcblxuXHRzYW1wbGVDdXJ2ZVg6ICh0KSAtPlxuXHRcdCgoQGF4ICogdCArIEBieCkgKiB0ICsgQGN4KSAqIHRcblxuXHRzYW1wbGVDdXJ2ZVk6ICh0KSAtPlxuXHRcdCgoQGF5ICogdCArIEBieSkgKiB0ICsgQGN5KSAqIHRcblxuXHRzYW1wbGVDdXJ2ZURlcml2YXRpdmVYOiAodCkgLT5cblx0XHQoMy4wICogQGF4ICogdCArIDIuMCAqIEBieCkgKiB0ICsgQGN4XG5cblx0c29sdmVDdXJ2ZVg6ICh4KSAtPlxuXG5cdFx0IyBGaXJzdCB0cnkgYSBmZXcgaXRlcmF0aW9ucyBvZiBOZXd0b24ncyBtZXRob2QgLS0gbm9ybWFsbHkgdmVyeSBmYXN0LlxuXHRcdHQyID0geFxuXHRcdGkgPSAwXG5cblx0XHR3aGlsZSBpIDwgOFxuXHRcdFx0eDIgPSBAc2FtcGxlQ3VydmVYKHQyKSAtIHhcblx0XHRcdHJldHVybiB0Mlx0aWYgTWF0aC5hYnMoeDIpIDwgQGVwc2lsb25cblx0XHRcdGQyID0gQHNhbXBsZUN1cnZlRGVyaXZhdGl2ZVgodDIpXG5cdFx0XHRicmVha1x0aWYgTWF0aC5hYnMoZDIpIDwgQGVwc2lsb25cblx0XHRcdHQyID0gdDIgLSB4MiAvIGQyXG5cdFx0XHRpKytcblxuXHRcdCMgTm8gc29sdXRpb24gZm91bmQgLSB1c2UgYmktc2VjdGlvblxuXHRcdHQwID0gMC4wXG5cdFx0dDEgPSAxLjBcblx0XHR0MiA9IHhcblx0XHRyZXR1cm4gdDBcdGlmIHQyIDwgdDBcblx0XHRyZXR1cm4gdDFcdGlmIHQyID4gdDFcblx0XHR3aGlsZSB0MCA8IHQxXG5cdFx0XHR4MiA9IEBzYW1wbGVDdXJ2ZVgodDIpXG5cdFx0XHRyZXR1cm4gdDJcdGlmIE1hdGguYWJzKHgyIC0geCkgPCBAZXBzaWxvblxuXHRcdFx0aWYgeCA+IHgyXG5cdFx0XHRcdHQwID0gdDJcblx0XHRcdGVsc2Vcblx0XHRcdFx0dDEgPSB0MlxuXHRcdFx0dDIgPSAodDEgLSB0MCkgKiAuNSArIHQwXG5cblx0XHQjIEdpdmUgdXBcblx0XHR0MlxuXG5cdHNvbHZlOiAoeCkgLT5cblx0XHRAc2FtcGxlQ3VydmVZIEBzb2x2ZUN1cnZlWCh4KVxuIiwiVXRpbHMgPSByZXF1aXJlIFwiLi4vVXRpbHNcIlxuXG57QW5pbWF0b3J9ID0gcmVxdWlyZSBcIi4uL0FuaW1hdG9yXCJcblxuY2xhc3MgZXhwb3J0cy5MaW5lYXJBbmltYXRvciBleHRlbmRzIEFuaW1hdG9yXG5cdFxuXHRzZXR1cDogKG9wdGlvbnMpIC0+XG5cblx0XHRAb3B0aW9ucyA9IFV0aWxzLnNldERlZmF1bHRQcm9wZXJ0aWVzIG9wdGlvbnMsXG5cdFx0XHR0aW1lOiAxXG5cblx0XHRAX3RpbWUgPSAwXG5cblx0bmV4dDogKGRlbHRhKSAtPlxuXG5cdFx0aWYgQGZpbmlzaGVkKClcblx0XHRcdHJldHVybiAxXG5cdFx0XG5cdFx0QF90aW1lICs9IGRlbHRhXG5cdFx0QF90aW1lIC8gQG9wdGlvbnMudGltZVxuXG5cdGZpbmlzaGVkOiAtPlxuXHRcdEBfdGltZSA+PSBAb3B0aW9ucy50aW1lIiwiVXRpbHMgPSByZXF1aXJlIFwiLi4vVXRpbHNcIlxuXG57QW5pbWF0b3J9ID0gcmVxdWlyZSBcIi4uL0FuaW1hdG9yXCJcblxuY2xhc3MgZXhwb3J0cy5TcHJpbmdESE9BbmltYXRvciBleHRlbmRzIEFuaW1hdG9yXG5cblx0c2V0dXA6IChvcHRpb25zKSAtPlxuXG5cdFx0QG9wdGlvbnMgPSBVdGlscy5zZXREZWZhdWx0UHJvcGVydGllcyBvcHRpb25zLFxuXHRcdFx0dmVsb2NpdHk6IDBcblx0XHRcdHRvbGVyYW5jZTogMS8xMDAwMFxuXHRcdFx0c3RpZmZuZXNzOiA1MFxuXHRcdFx0ZGFtcGluZzogMlxuXHRcdFx0bWFzczogMC4yXG5cdFx0XHR0aW1lOiBudWxsICMgSGFja1xuXG5cdFx0Y29uc29sZS5sb2cgXCJTcHJpbmdESE9BbmltYXRvci5vcHRpb25zXCIsIEBvcHRpb25zLCBvcHRpb25zXG5cblx0XHRAX3RpbWUgPSAwXG5cdFx0QF92YWx1ZSA9IDBcblx0XHRAX3ZlbG9jaXR5ID0gQG9wdGlvbnMudmVsb2NpdHlcblxuXHRuZXh0OiAoZGVsdGEpIC0+XG5cblx0XHRpZiBAZmluaXNoZWQoKVxuXHRcdFx0cmV0dXJuIDFcblxuXHRcdEBfdGltZSArPSBkZWx0YVxuXG5cdFx0IyBTZWUgdGhlIG5vdCBzY2llbmNlIGNvbW1lbnQgYWJvdmVcblx0XHRrID0gMCAtIEBvcHRpb25zLnN0aWZmbmVzc1xuXHRcdGIgPSAwIC0gQG9wdGlvbnMuZGFtcGluZ1xuXG5cdFx0Rl9zcHJpbmcgPSBrICogKChAX3ZhbHVlKSAtIDEpXG5cdFx0Rl9kYW1wZXIgPSBiICogKEBfdmVsb2NpdHkpXG5cblx0XHRAX3ZlbG9jaXR5ICs9ICgoRl9zcHJpbmcgKyBGX2RhbXBlcikgLyBAb3B0aW9ucy5tYXNzKSAqIGRlbHRhXG5cdFx0QF92YWx1ZSArPSBAX3ZlbG9jaXR5ICogZGVsdGFcblxuXHRcdEBfdmFsdWVcblxuXHRmaW5pc2hlZDogPT5cblx0XHRAX3RpbWUgPiAwIGFuZCBNYXRoLmFicyhAX3ZlbG9jaXR5KSA8IEBvcHRpb25zLnRvbGVyYW5jZSIsIlV0aWxzID0gcmVxdWlyZSBcIi4uL1V0aWxzXCJcblxue0FuaW1hdG9yfSA9IHJlcXVpcmUgXCIuLi9BbmltYXRvclwiXG5cbmNsYXNzIGV4cG9ydHMuU3ByaW5nUks0QW5pbWF0b3IgZXh0ZW5kcyBBbmltYXRvclxuXG5cdHNldHVwOiAob3B0aW9ucykgLT5cblxuXHRcdEBvcHRpb25zID0gVXRpbHMuc2V0RGVmYXVsdFByb3BlcnRpZXMgb3B0aW9ucyxcblx0XHRcdHRlbnNpb246IDUwMFxuXHRcdFx0ZnJpY3Rpb246IDEwXG5cdFx0XHR2ZWxvY2l0eTogMFxuXHRcdFx0dG9sZXJhbmNlOiAxLzEwMDAwXG5cdFx0XHR0aW1lOiBudWxsICMgSGFja1xuXG5cdFx0QF90aW1lID0gMFxuXHRcdEBfdmFsdWUgPSAwXG5cdFx0QF92ZWxvY2l0eSA9IEBvcHRpb25zLnZlbG9jaXR5XG5cdFx0QF9zdG9wU3ByaW5nID0gZmFsc2VcblxuXHRuZXh0OiAoZGVsdGEpIC0+XG5cblx0XHRpZiBAZmluaXNoZWQoKVxuXHRcdFx0cmV0dXJuIDFcblxuXHRcdEBfdGltZSArPSBkZWx0YVxuXG5cdFx0c3RhdGVCZWZvcmUgPSB7fVxuXHRcdHN0YXRlQWZ0ZXIgPSB7fVxuXHRcdFxuXHRcdCMgQ2FsY3VsYXRlIHByZXZpb3VzIHN0YXRlXG5cdFx0c3RhdGVCZWZvcmUueCA9IEBfdmFsdWUgLSAxXG5cdFx0c3RhdGVCZWZvcmUudiA9IEBfdmVsb2NpdHlcblx0XHRzdGF0ZUJlZm9yZS50ZW5zaW9uID0gQG9wdGlvbnMudGVuc2lvblxuXHRcdHN0YXRlQmVmb3JlLmZyaWN0aW9uID0gQG9wdGlvbnMuZnJpY3Rpb25cblx0XHRcblx0XHQjIENhbGN1bGF0ZSBuZXcgc3RhdGVcblx0XHRzdGF0ZUFmdGVyID0gc3ByaW5nSW50ZWdyYXRlU3RhdGUgc3RhdGVCZWZvcmUsIGRlbHRhXG5cdFx0QF92YWx1ZSA9IDEgKyBzdGF0ZUFmdGVyLnhcblx0XHRmaW5hbFZlbG9jaXR5ID0gc3RhdGVBZnRlci52XG5cdFx0bmV0RmxvYXQgPSBzdGF0ZUFmdGVyLnhcblx0XHRuZXQxRFZlbG9jaXR5ID0gc3RhdGVBZnRlci52XG5cblx0XHQjIFNlZSBpZiB3ZSByZWFjaGVkIHRoZSBlbmQgc3RhdGVcblx0XHRuZXRWYWx1ZUlzTG93ID0gTWF0aC5hYnMobmV0RmxvYXQpIDwgQG9wdGlvbnMudG9sZXJhbmNlXG5cdFx0bmV0VmVsb2NpdHlJc0xvdyA9IE1hdGguYWJzKG5ldDFEVmVsb2NpdHkpIDwgQG9wdGlvbnMudG9sZXJhbmNlXG5cdFx0XHRcdFxuXHRcdEBfc3RvcFNwcmluZyA9IG5ldFZhbHVlSXNMb3cgYW5kIG5ldFZlbG9jaXR5SXNMb3dcblx0XHRAX3ZlbG9jaXR5ID0gZmluYWxWZWxvY2l0eVxuXG5cdFx0QF92YWx1ZVxuXG5cdGZpbmlzaGVkOiA9PlxuXHRcdEBfc3RvcFNwcmluZ1xuXG5cbnNwcmluZ0FjY2VsZXJhdGlvbkZvclN0YXRlID0gKHN0YXRlKSAtPlxuXHRyZXR1cm4gLSBzdGF0ZS50ZW5zaW9uICogc3RhdGUueCAtIHN0YXRlLmZyaWN0aW9uICogc3RhdGUudlxuXG5zcHJpbmdFdmFsdWF0ZVN0YXRlID0gKGluaXRpYWxTdGF0ZSkgLT5cblxuXHRvdXRwdXQgPSB7fVxuXHRvdXRwdXQuZHggPSBpbml0aWFsU3RhdGUudlxuXHRvdXRwdXQuZHYgPSBzcHJpbmdBY2NlbGVyYXRpb25Gb3JTdGF0ZSBpbml0aWFsU3RhdGVcblxuXHRyZXR1cm4gb3V0cHV0XG5cbnNwcmluZ0V2YWx1YXRlU3RhdGVXaXRoRGVyaXZhdGl2ZSA9IChpbml0aWFsU3RhdGUsIGR0LCBkZXJpdmF0aXZlKSAtPlxuXG5cdHN0YXRlID0ge31cblx0c3RhdGUueCA9IGluaXRpYWxTdGF0ZS54ICsgZGVyaXZhdGl2ZS5keCAqIGR0XG5cdHN0YXRlLnYgPSBpbml0aWFsU3RhdGUudiArIGRlcml2YXRpdmUuZHYgKiBkdFxuXHRzdGF0ZS50ZW5zaW9uID0gaW5pdGlhbFN0YXRlLnRlbnNpb25cblx0c3RhdGUuZnJpY3Rpb24gPSBpbml0aWFsU3RhdGUuZnJpY3Rpb25cblxuXHRvdXRwdXQgPSB7fVxuXHRvdXRwdXQuZHggPSBzdGF0ZS52XG5cdG91dHB1dC5kdiA9IHNwcmluZ0FjY2VsZXJhdGlvbkZvclN0YXRlIHN0YXRlXG5cblx0cmV0dXJuIG91dHB1dFxuXG5zcHJpbmdJbnRlZ3JhdGVTdGF0ZSA9IChzdGF0ZSwgc3BlZWQpIC0+XG5cblx0YSA9IHNwcmluZ0V2YWx1YXRlU3RhdGUgc3RhdGVcblx0YiA9IHNwcmluZ0V2YWx1YXRlU3RhdGVXaXRoRGVyaXZhdGl2ZSBzdGF0ZSwgc3BlZWQgKiAwLjUsIGFcblx0YyA9IHNwcmluZ0V2YWx1YXRlU3RhdGVXaXRoRGVyaXZhdGl2ZSBzdGF0ZSwgc3BlZWQgKiAwLjUsIGJcblx0ZCA9IHNwcmluZ0V2YWx1YXRlU3RhdGVXaXRoRGVyaXZhdGl2ZSBzdGF0ZSwgc3BlZWQsIGNcblxuXHRkeGR0ID0gMS4wLzYuMCAqIChhLmR4ICsgMi4wICogKGIuZHggKyBjLmR4KSArIGQuZHgpXG5cdGR2ZHQgPSAxLjAvNi4wICogKGEuZHYgKyAyLjAgKiAoYi5kdiArIGMuZHYpICsgZC5kdilcblxuXHRzdGF0ZS54ID0gc3RhdGUueCArIGR4ZHQgKiBzcGVlZFxuXHRzdGF0ZS52ID0gc3RhdGUudiArIGR2ZHQgKiBzcGVlZFxuXG5cdHJldHVybiBzdGF0ZVxuXG4iLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcblxuQ291bnRlcktleSA9IFwiX09iamVjdENvdW50ZXJcIlxuRGVmaW5lZFByb3BlcnRpZXNLZXkgPSBcIl9EZWZpbmVkUHJvcGVydGllc0tleVwiXG5EZWZpbmVkUHJvcGVydGllc1ZhbHVlc0tleSA9IFwiX0RlZmluZWRQcm9wZXJ0aWVzVmFsdWVzS2V5XCJcblxuXG5jbGFzcyBleHBvcnRzLkJhc2VDbGFzcyBleHRlbmRzIEV2ZW50RW1pdHRlclxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgRnJhbWVyIG9iamVjdCBwcm9wZXJ0aWVzXG5cblx0QGRlZmluZSA9IChwcm9wZXJ0eU5hbWUsIGRlc2NyaXB0b3IpIC0+XG5cblx0XHRpZiBAIGlzbnQgQmFzZUNsYXNzIGFuZCBkZXNjcmlwdG9yLmV4cG9ydGFibGUgPT0gdHJ1ZVxuXHRcdFx0IyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSB0cnVlXG5cdFx0XHRkZXNjcmlwdG9yLnByb3BlcnR5TmFtZSA9IHByb3BlcnR5TmFtZVxuXG5cdFx0XHRAW0RlZmluZWRQcm9wZXJ0aWVzS2V5XSA/PSB7fVxuXHRcdFx0QFtEZWZpbmVkUHJvcGVydGllc0tleV1bcHJvcGVydHlOYW1lXSA9IGRlc2NyaXB0b3JcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBAcHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGRlc2NyaXB0b3Jcblx0XHRPYmplY3QuX19cblxuXHRAc2ltcGxlUHJvcGVydHkgPSAobmFtZSwgZmFsbGJhY2ssIGV4cG9ydGFibGU9dHJ1ZSkgLT5cblx0XHRleHBvcnRhYmxlOiBleHBvcnRhYmxlXG5cdFx0ZGVmYXVsdDogZmFsbGJhY2tcblx0XHRnZXQ6IC0+ICBAX2dldFByb3BlcnR5VmFsdWUgbmFtZVxuXHRcdHNldDogKHZhbHVlKSAtPiBAX3NldFByb3BlcnR5VmFsdWUgbmFtZSwgdmFsdWVcblxuXHRfc2V0UHJvcGVydHlWYWx1ZTogKGssIHYpID0+XG5cdFx0QFtEZWZpbmVkUHJvcGVydGllc1ZhbHVlc0tleV1ba10gPSB2XG5cblx0X2dldFByb3BlcnR5VmFsdWU6IChrKSA9PlxuXHRcdFV0aWxzLnZhbHVlT3JEZWZhdWx0IEBbRGVmaW5lZFByb3BlcnRpZXNWYWx1ZXNLZXldW2tdLFxuXHRcdFx0QF9nZXRQcm9wZXJ0eURlZmF1bHRWYWx1ZSBrXG5cblx0X2dldFByb3BlcnR5RGVmYXVsdFZhbHVlOiAoaykgLT5cblx0XHRAY29uc3RydWN0b3JbRGVmaW5lZFByb3BlcnRpZXNLZXldW2tdW1wiZGVmYXVsdFwiXVxuXG5cdF9wcm9wZXJ0eUxpc3Q6IC0+XG5cdFx0QGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XVxuXG5cdGtleXM6IC0+XG5cdFx0Xy5rZXlzIEBwcm9wZXJ0aWVzXG5cblx0QGRlZmluZSBcInByb3BlcnRpZXNcIixcblx0XHRnZXQ6IC0+XG5cdFx0XHRwcm9wZXJ0aWVzID0ge31cblxuXHRcdFx0Zm9yIGssIHYgb2YgQGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XVxuXHRcdFx0XHRpZiB2LmV4cG9ydGFibGUgaXNudCBmYWxzZVxuXHRcdFx0XHRcdHByb3BlcnRpZXNba10gPSBAW2tdXG5cblx0XHRcdHByb3BlcnRpZXNcblxuXHRcdHNldDogKHZhbHVlKSAtPlxuXHRcdFx0Zm9yIGssIHYgb2YgdmFsdWVcblx0XHRcdFx0aWYgQGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XS5oYXNPd25Qcm9wZXJ0eSBrXG5cdFx0XHRcdFx0aWYgQGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XS5leHBvcnRhYmxlIGlzbnQgZmFsc2Vcblx0XHRcdFx0XHRcdEBba10gPSB2XG5cblx0QGRlZmluZSBcImlkXCIsXG5cdFx0Z2V0OiAtPiBAX2lkXG5cblx0dG9TdHJpbmc6ID0+XG5cdFx0cHJvcGVydGllcyA9IF8ubWFwKEBwcm9wZXJ0aWVzLCAoKHYsIGspIC0+IFwiI3trfToje3Z9XCIpLCA0KVxuXHRcdFwiWyN7QGNvbnN0cnVjdG9yLm5hbWV9IGlkOiN7QGlkfSAje3Byb3BlcnRpZXMuam9pbiBcIiBcIn1dXCJcblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgQmFzZSBjb25zdHJ1Y3RvciBtZXRob2RcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRzdXBlclxuXG5cdFx0IyBDcmVhdGUgYSBob2xkZXIgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZXNcblx0XHRAW0RlZmluZWRQcm9wZXJ0aWVzVmFsdWVzS2V5XSA9IHt9XG5cblx0XHQjIENvdW50IHRoZSBjcmVhdGlvbiBmb3IgdGhlc2Ugb2JqZWN0cyBhbmQgc2V0IHRoZSBpZFxuXHRcdEBjb25zdHJ1Y3RvcltDb3VudGVyS2V5XSA/PSAwXG5cdFx0QGNvbnN0cnVjdG9yW0NvdW50ZXJLZXldICs9IDFcblxuXHRcdEBfaWQgPSBAY29uc3RydWN0b3JbQ291bnRlcktleV1cblxuXHRcdCMgU2V0IHRoZSBkZWZhdWx0IHZhbHVlcyBmb3IgdGhpcyBvYmplY3Rcblx0XHRfLm1hcCBAY29uc3RydWN0b3JbRGVmaW5lZFByb3BlcnRpZXNLZXldLCAoZGVzY3JpcHRvciwgbmFtZSkgPT5cblx0XHRcdEBbbmFtZV0gPSBVdGlscy52YWx1ZU9yRGVmYXVsdCBvcHRpb25zW25hbWVdLCBAX2dldFByb3BlcnR5RGVmYXVsdFZhbHVlIG5hbWVcblxuIiwie0xheWVyfSA9IHJlcXVpcmUgXCIuL0xheWVyXCJcblxuY29tcGF0V2FybmluZyA9IChtc2cpIC0+XG5cdGNvbnNvbGUud2FybiBtc2dcblxuY29tcGF0UHJvcGVydHkgPSAobmFtZSwgb3JpZ2luYWxOYW1lKSAtPlxuXHRleHBvcnRhYmxlOiBmYWxzZVxuXHRnZXQ6IC0+IFxuXHRcdGNvbXBhdFdhcm5pbmcgXCIje29yaWdpbmFsTmFtZX0gaXMgYSBkZXByZWNhdGVkIHByb3BlcnR5XCJcblx0XHRAW25hbWVdXG5cdHNldDogKHZhbHVlKSAtPiBcblx0XHRjb21wYXRXYXJuaW5nIFwiI3tvcmlnaW5hbE5hbWV9IGlzIGEgZGVwcmVjYXRlZCBwcm9wZXJ0eVwiXG5cdFx0QFtuYW1lXSA9IHZhbHVlXG5cbmNsYXNzIENvbXBhdExheWVyIGV4dGVuZHMgTGF5ZXJcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRpZiBvcHRpb25zLmhhc093blByb3BlcnR5IFwic3VwZXJWaWV3XCJcblx0XHRcdG9wdGlvbnMuc3VwZXJMYXllciA9IG9wdGlvbnMuc3VwZXJWaWV3XG5cblx0XHRzdXBlciBvcHRpb25zXG5cblx0QGRlZmluZSBcInN1cGVyVmlld1wiLCBjb21wYXRQcm9wZXJ0eSBcInN1cGVyTGF5ZXJcIiwgXCJzdXBlclZpZXdcIlxuXHRAZGVmaW5lIFwic3ViVmlld3NcIiwgY29tcGF0UHJvcGVydHkgXCJzdWJMYXllcnNcIiwgXCJzdWJWaWV3c1wiXG5cdEBkZWZpbmUgXCJzaWJsaW5nVmlld3NcIiwgY29tcGF0UHJvcGVydHkgXCJzaWJsaW5nTGF5ZXJzXCIsIFwic2libGluZ1ZpZXdzXCJcblxuXHRhZGRTdWJWaWV3ID0gKGxheWVyKSAtPiBAYWRkU3ViTGF5ZXIgbGF5ZXJcblx0cmVtb3ZlU3ViVmlldyA9IChsYXllcikgLT4gQHJlbW92ZVN1YkxheWVyIGxheWVyXG5cbmNsYXNzIENvbXBhdFZpZXcgZXh0ZW5kcyBDb21wYXRMYXllclxuXG5cdGNvbnN0cnVjdG9yOiAob3B0aW9ucz17fSkgLT5cblx0XHRjb21wYXRXYXJuaW5nIFwiVmlld3MgYXJlIG5vdyBjYWxsZWQgTGF5ZXJzXCJcblx0XHRzdXBlciBvcHRpb25zXG5cbmNsYXNzIENvbXBhdEltYWdlVmlldyBleHRlbmRzIENvbXBhdFZpZXdcblxuY2xhc3MgQ29tcGF0U2Nyb2xsVmlldyBleHRlbmRzIENvbXBhdFZpZXdcblx0Y29uc3RydWN0b3I6IC0+XG5cdFx0c3VwZXJcblx0XHRAc2Nyb2xsID0gdHJ1ZVxuXG53aW5kb3cuTGF5ZXIgPSBDb21wYXRMYXllclxud2luZG93LkZyYW1lci5MYXllciA9IENvbXBhdExheWVyXG5cbndpbmRvdy5WaWV3ID0gQ29tcGF0Vmlld1xud2luZG93LkltYWdlVmlldyA9IENvbXBhdEltYWdlVmlld1xud2luZG93LlNjcm9sbFZpZXcgPSBDb21wYXRTY3JvbGxWaWV3XG5cbiMgVXRpbHMgd2VyZSB1dGlscyBpbiBGcmFtZXIgMlxud2luZG93LnV0aWxzID0gd2luZG93LlV0aWxzXG5cblx0XG5cbiIsIlV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG5leHBvcnRzLkNvbmZpZyA9XG5cdFxuXHQjIEFuaW1hdGlvblxuXHR0YXJnZXRGUFM6IDYwXG5cblx0cm9vdEJhc2VDU1M6XG5cdFx0XCItd2Via2l0LXBlcnNwZWN0aXZlXCI6IDEwMDBcblx0XHRcblx0bGF5ZXJCYXNlQ1NTOlxuXHRcdFwiZGlzcGxheVwiOiBcImJsb2NrXCJcblx0XHQjXCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XCJwb3NpdGlvblwiOiBcImFic29sdXRlXCJcblx0XHQjIFwidG9wXCI6IFwiYXV0b1wiXG5cdFx0IyBcInJpZ2h0XCI6IFwiYXV0b1wiXG5cdFx0IyBcImJvdHRvbVwiOiBcImF1dG9cIlxuXHRcdCMgXCJsZWZ0XCI6IFwiYXV0b1wiXG5cdFx0IyBcIndpZHRoXCI6IFwiYXV0b1wiXG5cdFx0IyBcImhlaWdodFwiOiBcImF1dG9cIlxuXHRcdCNcIm92ZXJmbG93XCI6IFwidmlzaWJsZVwiXG5cdFx0I1wiei1pbmRleFwiOiAwXG5cdFx0XCItd2Via2l0LWJveC1zaXppbmdcIjogXCJib3JkZXItYm94XCJcblx0XHQjIFwiLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGVcIjogXCJwcmVzZXJ2ZS0zZFwiXG5cdFx0IyBcIi13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eVwiOiBcInZpc2libGVcIlxuXHRcdCNcIi13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eVwiOiBcIlwiXG5cdFx0I1wiLXdlYmtpdC1wZXJzcGVjdGl2ZVwiOiA1MDBcblx0XHQjIFwicG9pbnRlci1ldmVudHNcIjogXCJub25lXCJcblx0XHRcImJhY2tncm91bmQtcmVwZWF0XCI6IFwibm8tcmVwZWF0XCJcblx0XHRcImJhY2tncm91bmQtc2l6ZVwiOiBcImNvdmVyXCJcblx0XHRcIi13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nXCI6IFwidG91Y2hcIiIsIlV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgRGVidWcgb3ZlcnZpZXdcblxuX2RlYnVnTGF5ZXJzID0gbnVsbFxuXG5jcmVhdGVEZWJ1Z0xheWVyID0gKGxheWVyKSAtPlxuXG5cdG92ZXJMYXllciA9IG5ldyBMYXllclxuXHRcdGZyYW1lOiBsYXllci5zY3JlZW5GcmFtZSgpXG5cdFx0YmFja2dyb3VuZENvbG9yOiBcInJnYmEoNTAsMTUwLDIwMCwuMzUpXCJcblxuXHRvdmVyTGF5ZXIuc3R5bGUgPVxuXHRcdHRleHRBbGlnbjogXCJjZW50ZXJcIlxuXHRcdGNvbG9yOiBcIndoaXRlXCJcblx0XHRmb250OiBcIjEwcHgvMWVtIE1vbmFjb1wiXG5cdFx0bGluZUhlaWdodDogXCIje292ZXJMYXllci5oZWlnaHQgKyAxfXB4XCJcblx0XHRib3hTaGFkb3c6IFwiaW5zZXQgMCAwIDAgMXB4IHJnYmEoMjU1LDI1NSwyNTUsLjUpXCJcblxuXHRvdmVyTGF5ZXIuaHRtbCA9IGxheWVyLm5hbWUgb3IgbGF5ZXIuaWRcblxuXHRvdmVyTGF5ZXIub24gRXZlbnRzLkNsaWNrLCAoZXZlbnQsIGxheWVyKSAtPlxuXHRcdGxheWVyLnNjYWxlID0gMC44XG5cdFx0bGF5ZXIuYW5pbWF0ZSBcblx0XHRcdHByb3BlcnRpZXM6IHtzY2FsZToxfVxuXHRcdFx0Y3VydmU6IFwic3ByaW5nKDEwMDAsMTAsMClcIlxuXG5cdG92ZXJMYXllclxuXG5zaG93RGVidWcgPSAtPiBfZGVidWdMYXllcnMgPSBMYXllci5MYXllcnMoKS5tYXAgY3JlYXRlRGVidWdMYXllclxuaGlkZURlYnVnID0gLT4gX2RlYnVnTGF5ZXJzLm1hcCAobGF5ZXIpIC0+IGxheWVyLmRlc3Ryb3koKVxuXG50b2dnbGVEZWJ1ZyA9IFV0aWxzLnRvZ2dsZSBzaG93RGVidWcsIGhpZGVEZWJ1Z1xuXG5FdmVudEtleXMgPVxuXHRTaGlmdDogMTZcblx0RXNjYXBlOiAyN1xuXG53aW5kb3cuZG9jdW1lbnQub25rZXl1cCA9IChldmVudCkgLT5cblx0aWYgZXZlbnQua2V5Q29kZSA9PSBFdmVudEtleXMuRXNjYXBlXG5cdFx0dG9nZ2xlRGVidWcoKSgpXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBFcnJvciB3YXJuaW5nXG5cbl9lcnJvcldhcm5pbmdMYXllciA9IG51bGxcblxuZXJyb3JXYXJuaW5nID0gLT5cblxuXHRyZXR1cm4gaWYgX2Vycm9yV2FybmluZ0xheWVyXG5cblx0bGF5ZXIgPSBuZXcgTGF5ZXIge3g6MjAsIHk6LTUwLCB3aWR0aDozMDAsIGhlaWdodDo0MH1cblxuXHRsYXllci5zdGF0ZXMuYWRkXG5cdFx0dmlzaWJsZToge3g6MjAsIHk6MjAsIHdpZHRoOjMwMCwgaGVpZ2h0OjQwfVxuXG5cdGxheWVyLmh0bWwgPSBcIkphdmFzY3JpcHQgRXJyb3IsIHNlZSB0aGUgY29uc29sZVwiXG5cdGxheWVyLnN0eWxlID1cblx0XHRmb250OiBcIjEycHgvMS4zNWVtIE1lbmxvXCJcblx0XHRjb2xvcjogXCJ3aGl0ZVwiXG5cdFx0dGV4dEFsaWduOiBcImNlbnRlclwiXG5cdFx0bGluZUhlaWdodDogXCIje2xheWVyLmhlaWdodH1weFwiXG5cdFx0Ym9yZGVyUmFkaXVzOiBcIjVweFwiXG5cdFx0YmFja2dyb3VuZENvbG9yOiBcInJnYmEoMjU1LDAsMCwuOClcIlxuXG5cdGxheWVyLnN0YXRlcy5hbmltYXRpb25PcHRpb25zID1cblx0XHRjdXJ2ZTogXCJzcHJpbmdcIlxuXHRcdGN1cnZlT3B0aW9uczpcblx0XHRcdHRlbnNpb246IDEwMDBcblx0XHRcdGZyaWN0aW9uOiAzMFxuXG5cdGxheWVyLnN0YXRlcy5zd2l0Y2ggXCJ2aXNpYmxlXCJcblxuXHRsYXllci5vbiBFdmVudHMuQ2xpY2ssIC0+XG5cdFx0QHN0YXRlcy5zd2l0Y2ggXCJkZWZhdWx0XCJcblxuXHRfZXJyb3JXYXJuaW5nTGF5ZXIgPSBsYXllclxuXG53aW5kb3cub25lcnJvciA9IGVycm9yV2FybmluZ1xuIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cblV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG5PcmlnaW5hbHMgPSBcblx0TGF5ZXI6XG5cdFx0YmFja2dyb3VuZENvbG9yOiBcInJnYmEoMCwxMjQsMjU1LC41KVwiXG5cdFx0d2lkdGg6IDEwMFxuXHRcdGhlaWdodDogMTAwXG5cdEFuaW1hdGlvbjpcblx0XHRjdXJ2ZTogXCJsaW5lYXJcIlxuXHRcdHRpbWU6IDFcblxuZXhwb3J0cy5EZWZhdWx0cyA9XG5cblx0Z2V0RGVmYXVsdHM6IChjbGFzc05hbWUsIG9wdGlvbnMpIC0+XG5cblx0XHQjIEFsd2F5cyBzdGFydCB3aXRoIHRoZSBvcmlnaW5hbHNcblx0XHRkZWZhdWx0cyA9IF8uY2xvbmUgT3JpZ2luYWxzW2NsYXNzTmFtZV1cblxuXHRcdCMgQ29weSBvdmVyIHRoZSB1c2VyIGRlZmluZWQgb3B0aW9uc1xuXHRcdGZvciBrLCB2IG9mIEZyYW1lci5EZWZhdWx0c1tjbGFzc05hbWVdXG5cdFx0XHRkZWZhdWx0c1trXSA9IGlmIF8uaXNGdW5jdGlvbih2KSB0aGVuIHYoKSBlbHNlIHZcblxuXHRcdCMgVGhlbiBjb3B5IG92ZXIgdGhlIGRlZmF1bHQga2V5cyB0byB0aGUgb3B0aW9uc1xuXHRcdGZvciBrLCB2IG9mIGRlZmF1bHRzXG5cdFx0XHRpZiBub3Qgb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSBrXG5cdFx0XHRcdG9wdGlvbnNba10gPSB2XG5cblx0XHQjIEluY2x1ZGUgYSBzZWNyZXQgcHJvcGVydHkgd2l0aCB0aGUgZGVmYXVsdCBrZXlzXG5cdFx0IyBvcHRpb25zLl9kZWZhdWx0VmFsdWVzID0gZGVmYXVsdHNcblx0XHRcblx0XHRvcHRpb25zXG5cblx0cmVzZXQ6IC0+XG5cdFx0d2luZG93LkZyYW1lci5EZWZhdWx0cyA9IF8uY2xvbmUgT3JpZ2luYWxzIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cbkV2ZW50RW1pdHRlckV2ZW50c0tleSA9IFwiX2V2ZW50c1wiXG5cbmNsYXNzIGV4cG9ydHMuRXZlbnRFbWl0dGVyXG5cdFxuXHRjb25zdHJ1Y3RvcjogLT5cblx0XHRAW0V2ZW50RW1pdHRlckV2ZW50c0tleV0gPSB7fVxuXG5cdF9ldmVudENoZWNrOiAoZXZlbnQsIG1ldGhvZCkgLT5cblx0XHRpZiBub3QgZXZlbnRcblx0XHRcdGNvbnNvbGUud2FybiBcIiN7QGNvbnN0cnVjdG9yLm5hbWV9LiN7bWV0aG9kfSBtaXNzaW5nIGV2ZW50IChsaWtlICdjbGljaycpXCJcblxuXHRlbWl0OiAoZXZlbnQsIGFyZ3MuLi4pIC0+XG5cdFx0XG5cdFx0IyBXZSBza2lwIGl0IGhlcmUgYmVjYXVzZSB3ZSBuZWVkIGFsbCB0aGUgcGVyZiB3ZSBjYW4gZ2V0XG5cdFx0IyBAX2V2ZW50Q2hlY2sgZXZlbnQsIFwiZW1pdFwiXG5cblx0XHRpZiBub3QgQFtFdmVudEVtaXR0ZXJFdmVudHNLZXldP1tldmVudF1cblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdGZvciBsaXN0ZW5lciBpbiBAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdXG5cdFx0XHRsaXN0ZW5lciBhcmdzLi4uXG5cdFx0XG5cdFx0cmV0dXJuXG5cblx0YWRkTGlzdGVuZXI6IChldmVudCwgbGlzdGVuZXIpIC0+XG5cdFx0XG5cdFx0QF9ldmVudENoZWNrIGV2ZW50LCBcImFkZExpc3RlbmVyXCJcblx0XHRcblx0XHRAW0V2ZW50RW1pdHRlckV2ZW50c0tleV0gPz0ge31cblx0XHRAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdID89IFtdXG5cdFx0QFtFdmVudEVtaXR0ZXJFdmVudHNLZXldW2V2ZW50XS5wdXNoIGxpc3RlbmVyXG5cblx0cmVtb3ZlTGlzdGVuZXI6IChldmVudCwgbGlzdGVuZXIpIC0+XG5cdFx0XG5cdFx0QF9ldmVudENoZWNrIGV2ZW50LCBcInJlbW92ZUxpc3RlbmVyXCJcblx0XHRcblx0XHRyZXR1cm4gdW5sZXNzIEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XVxuXHRcdHJldHVybiB1bmxlc3MgQFtFdmVudEVtaXR0ZXJFdmVudHNLZXldW2V2ZW50XVxuXHRcdFxuXHRcdEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XVtldmVudF0gPSBfLndpdGhvdXQgQFtFdmVudEVtaXR0ZXJFdmVudHNLZXldW2V2ZW50XSwgbGlzdGVuZXJcblxuXHRcdHJldHVyblxuXG5cdG9uY2U6IChldmVudCwgbGlzdGVuZXIpIC0+XG5cblx0XHRmbiA9ID0+XG5cdFx0XHRAcmVtb3ZlTGlzdGVuZXIgZXZlbnQsIGZuXG5cdFx0XHRsaXN0ZW5lciBhcmd1bWVudHMuLi5cblxuXHRcdEBvbiBldmVudCwgZm5cblxuXHRyZW1vdmVBbGxMaXN0ZW5lcnM6IChldmVudCkgLT5cblx0XHRcblx0XHRyZXR1cm4gdW5sZXNzIEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XVxuXHRcdHJldHVybiB1bmxlc3MgQFtFdmVudEVtaXR0ZXJFdmVudHNLZXldW2V2ZW50XVxuXHRcdFxuXHRcdGZvciBsaXN0ZW5lciBpbiBAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdXG5cdFx0XHRAcmVtb3ZlTGlzdGVuZXIgZXZlbnQsIGxpc3RlbmVyXG5cblx0XHRyZXR1cm5cblx0XG5cdG9uOiBAOjphZGRMaXN0ZW5lclxuXHRvZmY6IEA6OnJlbW92ZUxpc3RlbmVyIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cblV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG5FdmVudHMgPSB7fVxuXG5pZiBVdGlscy5pc1RvdWNoKClcblx0RXZlbnRzLlRvdWNoU3RhcnQgPSBcInRvdWNoc3RhcnRcIlxuXHRFdmVudHMuVG91Y2hFbmQgPSBcInRvdWNoZW5kXCJcblx0RXZlbnRzLlRvdWNoTW92ZSA9IFwidG91Y2htb3ZlXCJcbmVsc2Vcblx0RXZlbnRzLlRvdWNoU3RhcnQgPSBcIm1vdXNlZG93blwiXG5cdEV2ZW50cy5Ub3VjaEVuZCA9IFwibW91c2V1cFwiXG5cdEV2ZW50cy5Ub3VjaE1vdmUgPSBcIm1vdXNlbW92ZVwiXG5cbkV2ZW50cy5DbGljayA9IEV2ZW50cy5Ub3VjaEVuZFxuXG4jIFN0YW5kYXJkIGRvbSBldmVudHNcbkV2ZW50cy5Nb3VzZU92ZXIgPSBcIm1vdXNlb3ZlclwiXG5FdmVudHMuTW91c2VPdXQgPSBcIm1vdXNlb3V0XCJcblxuIyBBbmltYXRpb24gZXZlbnRzXG5FdmVudHMuQW5pbWF0aW9uU3RhcnQgPSBcInN0YXJ0XCJcbkV2ZW50cy5BbmltYXRpb25TdG9wID0gXCJzdG9wXCJcbkV2ZW50cy5BbmltYXRpb25FbmQgPSBcImVuZFwiXG5cbiMgU2Nyb2xsIGV2ZW50c1xuRXZlbnRzLlNjcm9sbCA9IFwic2Nyb2xsXCJcblxuIyBFeHRyYWN0IHRvdWNoIGV2ZW50cyBmb3IgYW55IGV2ZW50XG5FdmVudHMudG91Y2hFdmVudCA9IChldmVudCkgLT5cblx0dG91Y2hFdmVudCA9IGV2ZW50LnRvdWNoZXM/WzBdXG5cdHRvdWNoRXZlbnQgPz0gZXZlbnQuY2hhbmdlZFRvdWNoZXM/WzBdXG5cdHRvdWNoRXZlbnQgPz0gZXZlbnRcblx0dG91Y2hFdmVudFxuXHRcbmV4cG9ydHMuRXZlbnRzID0gRXZlbnRzIiwie0Jhc2VDbGFzc30gPSByZXF1aXJlIFwiLi9CYXNlQ2xhc3NcIlxuXG5jbGFzcyBleHBvcnRzLkZyYW1lIGV4dGVuZHMgQmFzZUNsYXNzXG5cblx0QGRlZmluZSBcInhcIiwgQHNpbXBsZVByb3BlcnR5IFwieFwiLCAwXG5cdEBkZWZpbmUgXCJ5XCIsIEBzaW1wbGVQcm9wZXJ0eSBcInlcIiwgMFxuXHRAZGVmaW5lIFwid2lkdGhcIiwgQHNpbXBsZVByb3BlcnR5IFwid2lkdGhcIiwgMFxuXHRAZGVmaW5lIFwiaGVpZ2h0XCIsIEBzaW1wbGVQcm9wZXJ0eSBcImhlaWdodFwiLCAwXG5cblx0QGRlZmluZSBcIm1pblhcIiwgQHNpbXBsZVByb3BlcnR5IFwieFwiLCAwLCBmYWxzZVxuXHRAZGVmaW5lIFwibWluWVwiLCBAc2ltcGxlUHJvcGVydHkgXCJ5XCIsIDAsIGZhbHNlXG5cblx0Y29uc3RydWN0b3I6IChvcHRpb25zPXt9KSAtPlxuXG5cdFx0c3VwZXIgb3B0aW9uc1xuXG5cdFx0Zm9yIGsgaW4gW1wibWluWFwiLCBcIm1pZFhcIiwgXCJtYXhYXCIsIFwibWluWVwiLCBcIm1pZFlcIiwgXCJtYXhZXCJdXG5cdFx0XHRpZiBvcHRpb25zLmhhc093blByb3BlcnR5IGtcblx0XHRcdFx0QFtrXSA9IG9wdGlvbnNba11cblxuXHRAZGVmaW5lIFwibWlkWFwiLFxuXHRcdGdldDogLT4gVXRpbHMuZnJhbWVHZXRNaWRYIEBcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gVXRpbHMuZnJhbWVTZXRNaWRYIEAsIHZhbHVlXG5cblx0QGRlZmluZSBcIm1heFhcIixcblx0XHRnZXQ6IC0+IFV0aWxzLmZyYW1lR2V0TWF4WCBAXG5cdFx0c2V0OiAodmFsdWUpIC0+IFV0aWxzLmZyYW1lU2V0TWF4WCBALCB2YWx1ZVxuXG5cdEBkZWZpbmUgXCJtaWRZXCIsXG5cdFx0Z2V0OiAtPiBVdGlscy5mcmFtZUdldE1pZFkgQFxuXHRcdHNldDogKHZhbHVlKSAtPiBVdGlscy5mcmFtZVNldE1pZFkgQCwgdmFsdWVcblxuXHRAZGVmaW5lIFwibWF4WVwiLFxuXHRcdGdldDogLT4gVXRpbHMuZnJhbWVHZXRNYXhZIEBcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gVXRpbHMuZnJhbWVTZXRNYXhZIEAsIHZhbHVlIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cbkZyYW1lciA9IHt9XG5cbiMgUm9vdCBsZXZlbCBtb2R1bGVzXG5GcmFtZXIuXyA9IF9cbkZyYW1lci5VdGlscyA9IChyZXF1aXJlIFwiLi9VdGlsc1wiKVxuRnJhbWVyLkZyYW1lID0gKHJlcXVpcmUgXCIuL0ZyYW1lXCIpLkZyYW1lXG5GcmFtZXIuTGF5ZXIgPSAocmVxdWlyZSBcIi4vTGF5ZXJcIikuTGF5ZXJcbkZyYW1lci5FdmVudHMgPSAocmVxdWlyZSBcIi4vRXZlbnRzXCIpLkV2ZW50c1xuRnJhbWVyLkFuaW1hdGlvbiA9IChyZXF1aXJlIFwiLi9BbmltYXRpb25cIikuQW5pbWF0aW9uXG5cbl8uZXh0ZW5kIHdpbmRvdywgRnJhbWVyIGlmIHdpbmRvd1xuXG4jIEZyYW1lciBsZXZlbCBtb2R1bGVzXG5cbkZyYW1lci5Db25maWcgPSAocmVxdWlyZSBcIi4vQ29uZmlnXCIpLkNvbmZpZ1xuRnJhbWVyLkV2ZW50RW1pdHRlciA9IChyZXF1aXJlIFwiLi9FdmVudEVtaXR0ZXJcIikuRXZlbnRFbWl0dGVyXG5GcmFtZXIuQmFzZUNsYXNzID0gKHJlcXVpcmUgXCIuL0Jhc2VDbGFzc1wiKS5CYXNlQ2xhc3NcbkZyYW1lci5MYXllclN0eWxlID0gKHJlcXVpcmUgXCIuL0xheWVyU3R5bGVcIikuTGF5ZXJTdHlsZVxuRnJhbWVyLkFuaW1hdGlvbkxvb3AgPSAocmVxdWlyZSBcIi4vQW5pbWF0aW9uTG9vcFwiKS5BbmltYXRpb25Mb29wXG5GcmFtZXIuTGluZWFyQW5pbWF0b3IgPSAocmVxdWlyZSBcIi4vQW5pbWF0b3JzL0xpbmVhckFuaW1hdG9yXCIpLkxpbmVhckFuaW1hdG9yXG5GcmFtZXIuQmV6aWVyQ3VydmVBbmltYXRvciA9IChyZXF1aXJlIFwiLi9BbmltYXRvcnMvQmV6aWVyQ3VydmVBbmltYXRvclwiKS5CZXppZXJDdXJ2ZUFuaW1hdG9yXG5GcmFtZXIuU3ByaW5nREhPQW5pbWF0b3IgPSAocmVxdWlyZSBcIi4vQW5pbWF0b3JzL1NwcmluZ0RIT0FuaW1hdG9yXCIpLlNwcmluZ0RIT0FuaW1hdG9yXG5GcmFtZXIuU3ByaW5nUks0QW5pbWF0b3IgPSAocmVxdWlyZSBcIi4vQW5pbWF0b3JzL1NwcmluZ1JLNEFuaW1hdG9yXCIpLlNwcmluZ1JLNEFuaW1hdG9yXG5GcmFtZXIuSW1wb3J0ZXIgPSAocmVxdWlyZSBcIi4vSW1wb3J0ZXJcIikuSW1wb3J0ZXJcbkZyYW1lci5EZWJ1ZyA9IChyZXF1aXJlIFwiLi9EZWJ1Z1wiKS5EZWJ1Z1xuXG53aW5kb3cuRnJhbWVyID0gRnJhbWVyIGlmIHdpbmRvd1xuXG4jIENvbXBhdGliaWxpdHkgZm9yIEZyYW1lciAyXG5yZXF1aXJlIFwiLi9Db21wYXRcIlxuXG4jIFNldCB0aGUgZGVmYXVsdHNcbkRlZmF1bHRzID0gKHJlcXVpcmUgXCIuL0RlZmF1bHRzXCIpLkRlZmF1bHRzXG5GcmFtZXIucmVzZXREZWZhdWx0cyA9IERlZmF1bHRzLnJlc2V0XG5GcmFtZXIucmVzZXREZWZhdWx0cygpIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5VdGlscyA9IHJlcXVpcmUgXCIuL1V0aWxzXCJcblxuQ2hyb21lQWxlcnQgPSBcIlwiXCJcbkltcG9ydGluZyBsYXllcnMgaXMgY3VycmVudGx5IG9ubHkgc3VwcG9ydGVkIG9uIFNhZmFyaS4gSWYgeW91IHJlYWxseSB3YW50IGl0IHRvIHdvcmsgd2l0aCBDaHJvbWUgcXVpdCBpdCwgb3BlbiBhIHRlcm1pbmFsIGFuZCBydW46XG5vcGVuIC1hIEdvb2dsZVxcIENocm9tZSAt4oCTYWxsb3ctZmlsZS1hY2Nlc3MtZnJvbS1maWxlc1xuXCJcIlwiXG5cbmNsYXNzIGV4cG9ydHMuSW1wb3J0ZXJcblxuXHRjb25zdHJ1Y3RvcjogKEBwYXRoLCBAZXh0cmFMYXllclByb3BlcnRpZXM9e30pIC0+XG5cblx0XHRAcGF0aHMgPVxuXHRcdFx0bGF5ZXJJbmZvOiBVdGlscy5wYXRoSm9pbiBAcGF0aCwgXCJsYXllcnMuanNvblwiXG5cdFx0XHRpbWFnZXM6IFV0aWxzLnBhdGhKb2luIEBwYXRoLCBcImltYWdlc1wiXG5cdFx0XHRkb2N1bWVudE5hbWU6IEBwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKVxuXG5cdFx0QF9jcmVhdGVkTGF5ZXJzID0gW11cblx0XHRAX2NyZWF0ZWRMYXllcnNCeU5hbWUgPSB7fVxuXG5cdGxvYWQ6IC0+XG5cblx0XHRsYXllcnNCeU5hbWUgPSB7fVxuXHRcdGxheWVySW5mbyA9IEBfbG9hZGxheWVySW5mbygpXG5cdFx0XG5cdFx0IyBQYXNzIG9uZS4gQ3JlYXRlIGFsbCBsYXllcnMgYnVpbGQgdGhlIGhpZXJhcmNoeVxuXHRcdGxheWVySW5mby5tYXAgKGxheWVySXRlbUluZm8pID0+XG5cdFx0XHRAX2NyZWF0ZUxheWVyIGxheWVySXRlbUluZm9cblxuXHRcdCMgUGFzcyB0d28uIEFkanVzdCBwb3NpdGlvbiBvbiBzY3JlZW4gZm9yIGFsbCBsYXllcnNcblx0XHQjIGJhc2VkIG9uIHRoZSBoaWVyYXJjaHkuXG5cdFx0Zm9yIGxheWVyIGluIEBfY3JlYXRlZExheWVyc1xuXHRcdFx0QF9jb3JyZWN0TGF5ZXIgbGF5ZXJcblxuXHRcdCMgUGFzcyB0aHJlZSwgaW5zZXJ0IHRoZSBsYXllcnMgaW50byB0aGUgZG9tXG5cdFx0IyAodGhleSB3ZXJlIG5vdCBpbnNlcnRlZCB5ZXQgYmVjYXVzZSBvZiB0aGUgc2hhZG93IGtleXdvcmQpXG5cdFx0Zm9yIGxheWVyIGluIEBfY3JlYXRlZExheWVyc1xuXHRcdFx0aWYgbm90IGxheWVyLnN1cGVyTGF5ZXJcblx0XHRcdFx0bGF5ZXIuc3VwZXJMYXllciA9IG51bGxcblxuXHRcdEBfY3JlYXRlZExheWVyc0J5TmFtZVxuXG5cdF9sb2FkbGF5ZXJJbmZvOiAtPlxuXG5cdFx0IyBDaHJvbWUgaXMgYSBwYWluIGluIHRoZSBhc3MgYW5kIHdvbid0IGFsbG93IGxvY2FsIGZpbGUgYWNjZXNzXG5cdFx0IyB0aGVyZWZvcmUgSSBhZGQgYSAuanMgZmlsZSB3aGljaCBhZGRzIHRoZSBkYXRhIHRvIFxuXHRcdCMgd2luZG93Ll9faW1wb3J0ZWRfX1tcIjxwYXRoPlwiXVxuXG5cdFx0aW1wb3J0ZWRLZXkgPSBcIiN7QHBhdGhzLmRvY3VtZW50TmFtZX0vbGF5ZXJzLmpzb24uanNcIlxuXG5cdFx0aWYgd2luZG93Ll9faW1wb3J0ZWRfXz8uaGFzT3duUHJvcGVydHkgaW1wb3J0ZWRLZXlcblx0XHRcdHJldHVybiB3aW5kb3cuX19pbXBvcnRlZF9fW2ltcG9ydGVkS2V5XVxuXG5cdFx0IyAjIEZvciBub3cgdGhpcyBkb2VzIG5vdCB3b3JrIGluIENocm9tZSBhbmQgd2UgdGhyb3cgYW4gZXJyb3Jcblx0XHQjIHRyeVxuXHRcdCMgXHRyZXR1cm4gRnJhbWVyLlV0aWxzLmRvbUxvYWRKU09OU3luYyBAcGF0aHMubGF5ZXJJbmZvXG5cdFx0IyBjYXRjaCBlXG5cdFx0IyBcdGlmIFV0aWxzLmlzQ2hyb21lXG5cdFx0IyBcdFx0YWxlcnQgQ2hyb21lQWxlcnRcblx0XHQjIFx0ZWxzZVxuXHRcdCMgXHRcdHRocm93IGVcblxuXHRcdHJldHVybiBGcmFtZXIuVXRpbHMuZG9tTG9hZEpTT05TeW5jIEBwYXRocy5sYXllckluZm9cblxuXHRfY3JlYXRlTGF5ZXI6IChpbmZvLCBzdXBlckxheWVyKSAtPlxuXHRcdFxuXHRcdExheWVyQ2xhc3MgPSBMYXllclxuXG5cdFx0bGF5ZXJJbmZvID1cblx0XHRcdHNoYWRvdzogdHJ1ZVxuXHRcdFx0bmFtZTogaW5mby5uYW1lXG5cdFx0XHRmcmFtZTogaW5mby5sYXllckZyYW1lXG5cdFx0XHRjbGlwOiBmYWxzZVxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiBudWxsXG5cdFx0XHR2aXNpYmxlOiBpbmZvLnZpc2libGUgPyB0cnVlXG5cblx0XHRfLmV4dGVuZCBsYXllckluZm8sIEBleHRyYUxheWVyUHJvcGVydGllc1xuXG5cdFx0IyBNb3N0IGxheWVycyB3aWxsIGhhdmUgYW4gaW1hZ2UsIGFkZCB0aGF0IGhlcmVcblx0XHRpZiBpbmZvLmltYWdlXG5cdFx0XHRsYXllckluZm8uZnJhbWUgPSBpbmZvLmltYWdlLmZyYW1lXG5cdFx0XHRsYXllckluZm8uaW1hZ2UgPSBVdGlscy5wYXRoSm9pbiBAcGF0aCwgaW5mby5pbWFnZS5wYXRoXG5cdFx0XHRcblx0XHQjIElmIHRoZXJlIGlzIGEgbWFzayBvbiB0aGlzIGxheWVyIGdyb3VwLCB0YWtlIGl0J3MgZnJhbWVcblx0XHRpZiBpbmZvLm1hc2tGcmFtZVxuXHRcdFx0bGF5ZXJJbmZvLmZyYW1lID0gaW5mby5tYXNrRnJhbWVcblx0XHRcdGxheWVySW5mby5jbGlwID0gdHJ1ZVxuXG5cdFx0IyBUb2RvOiBzbWFydCBzdHVmZiBmb3IgcGFnaW5nIGFuZCBzY3JvbGwgdmlld3NcblxuXHRcdCMgRmlndXJlIG91dCB3aGF0IHRoZSBzdXBlciBsYXllciBzaG91bGQgYmUuIElmIHRoaXMgbGF5ZXIgaGFzIGEgY29udGVudExheWVyXG5cdFx0IyAobGlrZSBhIHNjcm9sbCB2aWV3KSB3ZSBhdHRhY2ggaXQgdG8gdGhhdCBpbnN0ZWFkLlxuXHRcdGlmIHN1cGVyTGF5ZXI/LmNvbnRlbnRMYXllclxuXHRcdFx0bGF5ZXJJbmZvLnN1cGVyTGF5ZXIgPSBzdXBlckxheWVyLmNvbnRlbnRMYXllclxuXHRcdGVsc2UgaWYgc3VwZXJMYXllclxuXHRcdFx0bGF5ZXJJbmZvLnN1cGVyTGF5ZXIgPSBzdXBlckxheWVyXG5cblx0XHQjIFdlIGNhbiBjcmVhdGUgdGhlIGxheWVyIGhlcmVcblx0XHRsYXllciA9IG5ldyBMYXllckNsYXNzIGxheWVySW5mb1xuXHRcdGxheWVyLm5hbWUgPSBsYXllckluZm8ubmFtZVxuXG5cdFx0IyBBIGxheWVyIHdpdGhvdXQgYW4gaW1hZ2UsIG1hc2sgb3Igc3VibGF5ZXJzIHNob3VsZCBiZSB6ZXJvXG5cdFx0aWYgbm90IGxheWVyLmltYWdlIGFuZCBub3QgaW5mby5jaGlsZHJlbi5sZW5ndGggYW5kIG5vdCBpbmZvLm1hc2tGcmFtZVxuXHRcdFx0bGF5ZXIuZnJhbWUgPSBuZXcgRnJhbWVcblxuXHRcdGluZm8uY2hpbGRyZW4ucmV2ZXJzZSgpLm1hcCAoaW5mbykgPT4gQF9jcmVhdGVMYXllciBpbmZvLCBsYXllclxuXG5cdFx0IyBUT0RPRE9ET0RPRFxuXHRcdGlmIG5vdCBsYXllci5pbWFnZSBhbmQgbm90IGluZm8ubWFza0ZyYW1lXG5cdFx0XHRsYXllci5mcmFtZSA9IGxheWVyLmNvbnRlbnRGcmFtZSgpXG5cblx0XHRsYXllci5faW5mbyA9IGluZm9cblxuXHRcdEBfY3JlYXRlZExheWVycy5wdXNoIGxheWVyXG5cdFx0QF9jcmVhdGVkTGF5ZXJzQnlOYW1lW2xheWVyLm5hbWVdID0gbGF5ZXJcblxuXHRfY29ycmVjdExheWVyOiAobGF5ZXIpIC0+XG5cblx0XHR0cmF2ZXJzZSA9IChsYXllcikgLT5cblxuXHRcdFx0aWYgbGF5ZXIuc3VwZXJMYXllclxuXHRcdFx0XHRsYXllci5mcmFtZSA9IFV0aWxzLmNvbnZlcnRQb2ludCBsYXllci5mcmFtZSwgbnVsbCwgbGF5ZXIuc3VwZXJMYXllclxuXG5cdFx0XHRmb3Igc3ViTGF5ZXIgaW4gbGF5ZXIuc3ViTGF5ZXJzXG5cdFx0XHRcdHRyYXZlcnNlIHN1YkxheWVyXG5cblx0XHRpZiBub3QgbGF5ZXIuc3VwZXJMYXllclxuXHRcdFx0dHJhdmVyc2UgbGF5ZXJcblxuZXhwb3J0cy5JbXBvcnRlci5sb2FkID0gKHBhdGgpIC0+XG5cdGltcG9ydGVyID0gbmV3IGV4cG9ydHMuSW1wb3J0ZXIgcGF0aFxuXHRpbXBvcnRlci5sb2FkKCkiLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntDb25maWd9ID0gcmVxdWlyZSBcIi4vQ29uZmlnXCJcbntEZWZhdWx0c30gPSByZXF1aXJlIFwiLi9EZWZhdWx0c1wiXG57QmFzZUNsYXNzfSA9IHJlcXVpcmUgXCIuL0Jhc2VDbGFzc1wiXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgXCIuL0V2ZW50RW1pdHRlclwiXG57QW5pbWF0aW9ufSA9IHJlcXVpcmUgXCIuL0FuaW1hdGlvblwiXG57RnJhbWV9ID0gcmVxdWlyZSBcIi4vRnJhbWVcIlxue0xheWVyU3R5bGV9ID0gcmVxdWlyZSBcIi4vTGF5ZXJTdHlsZVwiXG57TGF5ZXJTdGF0ZXN9ID0gcmVxdWlyZSBcIi4vTGF5ZXJTdGF0ZXNcIlxue0xheWVyRHJhZ2dhYmxlfSA9IHJlcXVpcmUgXCIuL0xheWVyRHJhZ2dhYmxlXCJcblxuX1Jvb3RFbGVtZW50ID0gbnVsbFxuX0xheWVyTGlzdCA9IFtdXG5cbmxheWVyUHJvcGVydHkgPSAobmFtZSwgY3NzUHJvcGVydHksIGZhbGxiYWNrLCB2YWxpZGF0b3IsIHNldCkgLT5cblx0ZXhwb3J0YWJsZTogdHJ1ZVxuXHRkZWZhdWx0OiBmYWxsYmFja1xuXHRnZXQ6IC0+XG5cdFx0QF9nZXRQcm9wZXJ0eVZhbHVlIG5hbWVcblx0c2V0OiAodmFsdWUpIC0+XG5cblx0XHQjIGlmIG5vdCB2YWxpZGF0b3Jcblx0XHQjIFx0Y29uc29sZS5sb2cgXCJNaXNzaW5nIHZhbGlkYXRvciBmb3IgTGF5ZXIuI3tuYW1lfVwiLCB2YWxpZGF0b3JcblxuXHRcdGlmIHZhbGlkYXRvcih2YWx1ZSkgaXMgZmFsc2Vcblx0XHRcdHRocm93IEVycm9yIFwidmFsdWUgJyN7dmFsdWV9JyBvZiB0eXBlICN7dHlwZW9mIHZhbHVlfSBpcyBub3QgdmFsaWQgZm9yIGEgTGF5ZXIuI3tuYW1lfSBwcm9wZXJ0eVwiXG5cblx0XHRAX3NldFByb3BlcnR5VmFsdWUgbmFtZSwgdmFsdWVcblx0XHRAc3R5bGVbY3NzUHJvcGVydHldID0gTGF5ZXJTdHlsZVtjc3NQcm9wZXJ0eV0oQClcblx0XHRAZW1pdCBcImNoYW5nZToje25hbWV9XCIsIHZhbHVlXG5cdFx0c2V0IEAsIHZhbHVlIGlmIHNldFxuXG5sYXllclN0eWxlUHJvcGVydHkgPSAoY3NzUHJvcGVydHkpIC0+XG5cdGV4cG9ydGFibGU6IHRydWVcblx0IyBkZWZhdWx0OiBmYWxsYmFja1xuXHRnZXQ6IC0+IEBzdHlsZVtjc3NQcm9wZXJ0eV1cblx0c2V0OiAodmFsdWUpIC0+XG5cdFx0QHN0eWxlW2Nzc1Byb3BlcnR5XSA9IHZhbHVlXG5cdFx0QGVtaXQgXCJjaGFuZ2U6I3tjc3NQcm9wZXJ0eX1cIiwgdmFsdWVcblxuZnJhbWVQcm9wZXJ0eSA9IChuYW1lKSAtPlxuXHRleHBvcnRhYmxlOiBmYWxzZVxuXHRnZXQ6IC0+IEBmcmFtZVtuYW1lXVxuXHRzZXQ6ICh2YWx1ZSkgLT5cblx0XHRmcmFtZSA9IEBmcmFtZVxuXHRcdGZyYW1lW25hbWVdID0gdmFsdWVcblx0XHRAZnJhbWUgPSBmcmFtZVxuXG5jbGFzcyBleHBvcnRzLkxheWVyIGV4dGVuZHMgQmFzZUNsYXNzXG5cblx0Y29uc3RydWN0b3I6IChvcHRpb25zPXt9KSAtPlxuXG5cdFx0X0xheWVyTGlzdC5wdXNoIEBcblxuXHRcdCMgV2UgaGF2ZSB0byBjcmVhdGUgdGhlIGVsZW1lbnQgYmVmb3JlIHdlIHNldCB0aGUgZGVmYXVsdHNcblx0XHRAX2NyZWF0ZUVsZW1lbnQoKVxuXHRcdEBfc2V0RGVmYXVsdENTUygpXG5cblx0XHRvcHRpb25zID0gRGVmYXVsdHMuZ2V0RGVmYXVsdHMgXCJMYXllclwiLCBvcHRpb25zXG5cblx0XHRzdXBlciBvcHRpb25zXG5cblx0XHQjIEtlZXAgdHJhY2sgb2YgdGhlIGRlZmF1bHQgdmFsdWVzXG5cdFx0IyBAX2RlZmF1bHRWYWx1ZXMgPSBvcHRpb25zLl9kZWZhdWx0VmFsdWVzXG5cblx0XHQjIFdlIG5lZWQgdG8gZXhwbGljaXRseSBzZXQgdGhlIGVsZW1lbnQgaWQgYWdhaW4sIGJlY3Vhc2UgaXQgd2FzIG1hZGUgYnkgdGhlIHN1cGVyXG5cdFx0QF9lbGVtZW50LmlkID0gXCJGcmFtZXJMYXllci0je0BpZH1cIlxuXG5cdFx0IyBFeHRyYWN0IHRoZSBmcmFtZSBmcm9tIHRoZSBvcHRpb25zLCBzbyB3ZSBzdXBwb3J0IG1pblgsIG1heFggZXRjLlxuXHRcdGlmIG9wdGlvbnMuaGFzT3duUHJvcGVydHkgXCJmcmFtZVwiXG5cdFx0XHRmcmFtZSA9IG5ldyBGcmFtZSBvcHRpb25zLmZyYW1lXG5cdFx0ZWxzZVxuXHRcdFx0ZnJhbWUgPSBuZXcgRnJhbWUgb3B0aW9uc1xuXG5cdFx0QGZyYW1lID0gZnJhbWVcblxuXHRcdCMgSW5zZXJ0IHRoZSBsYXllciBpbnRvIHRoZSBkb20gb3IgdGhlIHN1cGVyTGF5ZXIgZWxlbWVudFxuXHRcdGlmIG5vdCBvcHRpb25zLnN1cGVyTGF5ZXJcblx0XHRcdEBicmluZ1RvRnJvbnQoKVxuXHRcdFx0QF9pbnNlcnRFbGVtZW50KCkgaWYgbm90IG9wdGlvbnMuc2hhZG93XG5cdFx0ZWxzZVxuXHRcdFx0QHN1cGVyTGF5ZXIgPSBvcHRpb25zLnN1cGVyTGF5ZXJcblxuXHRcdCMgU2V0IG5lZWRlZCBwcml2YXRlIHZhcmlhYmxlc1xuXHRcdEBfc3ViTGF5ZXJzID0gW11cblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIFByb3BlcnRpZXNcblxuXHQjIENzcyBwcm9wZXJ0aWVzXG5cdEBkZWZpbmUgXCJ3aWR0aFwiLCAgbGF5ZXJQcm9wZXJ0eSBcIndpZHRoXCIsICBcIndpZHRoXCIsIDEwMCwgXy5pc051bWJlclxuXHRAZGVmaW5lIFwiaGVpZ2h0XCIsIGxheWVyUHJvcGVydHkgXCJoZWlnaHRcIiwgXCJoZWlnaHRcIiwgMTAwLCBfLmlzTnVtYmVyXG5cblx0QGRlZmluZSBcInZpc2libGVcIiwgbGF5ZXJQcm9wZXJ0eSBcInZpc2libGVcIiwgXCJkaXNwbGF5XCIsIHRydWUsIF8uaXNCb29sXG5cdEBkZWZpbmUgXCJvcGFjaXR5XCIsIGxheWVyUHJvcGVydHkgXCJvcGFjaXR5XCIsIFwib3BhY2l0eVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJpbmRleFwiLCBsYXllclByb3BlcnR5IFwiaW5kZXhcIiwgXCJ6SW5kZXhcIiwgMCwgXy5pc051bWJlclxuXHRAZGVmaW5lIFwiY2xpcFwiLCBsYXllclByb3BlcnR5IFwiY2xpcFwiLCBcIm92ZXJmbG93XCIsIHRydWUsIF8uaXNCb29sXG5cdFxuXHRAZGVmaW5lIFwic2Nyb2xsSG9yaXpvbnRhbFwiLCBsYXllclByb3BlcnR5IFwic2Nyb2xsSG9yaXpvbnRhbFwiLCBcIm92ZXJmbG93WFwiLCBmYWxzZSwgXy5pc0Jvb2wsIChsYXllciwgdmFsdWUpIC0+XG5cdFx0bGF5ZXIuaWdub3JlRXZlbnRzID0gZmFsc2UgaWYgdmFsdWUgaXMgdHJ1ZVxuXHRcblx0QGRlZmluZSBcInNjcm9sbFZlcnRpY2FsXCIsIGxheWVyUHJvcGVydHkgXCJzY3JvbGxWZXJ0aWNhbFwiLCBcIm92ZXJmbG93WVwiLCBmYWxzZSwgXy5pc0Jvb2wsIChsYXllciwgdmFsdWUpIC0+XG5cdFx0bGF5ZXIuaWdub3JlRXZlbnRzID0gZmFsc2UgaWYgdmFsdWUgaXMgdHJ1ZVxuXG5cdEBkZWZpbmUgXCJzY3JvbGxcIixcblx0XHRnZXQ6IC0+IEBzY3JvbGxIb3Jpem9udGFsIGlzIHRydWUgb3IgQHNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gQHNjcm9sbEhvcml6b250YWwgPSBAc2Nyb2xsVmVydGljYWwgPSB0cnVlXG5cblx0IyBCZWhhdmlvdXIgcHJvcGVydGllc1xuXHRAZGVmaW5lIFwiaWdub3JlRXZlbnRzXCIsIGxheWVyUHJvcGVydHkgXCJpZ25vcmVFdmVudHNcIiwgXCJwb2ludGVyRXZlbnRzXCIsIHRydWUsIF8uaXNCb29sXG5cblx0IyBNYXRyaXggcHJvcGVydGllc1xuXHRAZGVmaW5lIFwieFwiLCBsYXllclByb3BlcnR5IFwieFwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJ5XCIsIGxheWVyUHJvcGVydHkgXCJ5XCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInpcIiwgbGF5ZXJQcm9wZXJ0eSBcInpcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1cIiwgMCwgXy5pc051bWJlclxuXG5cdEBkZWZpbmUgXCJzY2FsZVhcIiwgbGF5ZXJQcm9wZXJ0eSBcInNjYWxlWFwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzY2FsZVlcIiwgbGF5ZXJQcm9wZXJ0eSBcInNjYWxlWVwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzY2FsZVpcIiwgbGF5ZXJQcm9wZXJ0eSBcInNjYWxlWlwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzY2FsZVwiLCBsYXllclByb3BlcnR5IFwic2NhbGVcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1cIiwgMSwgXy5pc051bWJlclxuXG5cdCMgQGRlZmluZSBcInNjYWxlXCIsXG5cdCMgXHRnZXQ6IC0+IChAc2NhbGVYICsgQHNjYWxlWSArIEBzY2FsZVopIC8gMy4wXG5cdCMgXHRzZXQ6ICh2YWx1ZSkgLT4gQHNjYWxlWCA9IEBzY2FsZVkgPSBAc2NhbGVaID0gdmFsdWVcblxuXHRAZGVmaW5lIFwib3JpZ2luWFwiLCBsYXllclByb3BlcnR5IFwib3JpZ2luWFwiLCBcIndlYmtpdFRyYW5zZm9ybU9yaWdpblwiLCAwLjUsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcIm9yaWdpbllcIiwgbGF5ZXJQcm9wZXJ0eSBcIm9yaWdpbllcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1PcmlnaW5cIiwgMC41LCBfLmlzTnVtYmVyXG5cdCMgQGRlZmluZSBcIm9yaWdpblpcIiwgbGF5ZXJQcm9wZXJ0eSBcIm9yaWdpblpcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1PcmlnaW5cIiwgMC41XG5cblx0QGRlZmluZSBcInJvdGF0aW9uWFwiLCBsYXllclByb3BlcnR5IFwicm90YXRpb25YXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInJvdGF0aW9uWVwiLCBsYXllclByb3BlcnR5IFwicm90YXRpb25ZXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInJvdGF0aW9uWlwiLCBsYXllclByb3BlcnR5IFwicm90YXRpb25aXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInJvdGF0aW9uXCIsICBsYXllclByb3BlcnR5IFwicm90YXRpb25aXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblxuXHQjIEZpbHRlciBwcm9wZXJ0aWVzXG5cdEBkZWZpbmUgXCJibHVyXCIsIGxheWVyUHJvcGVydHkgXCJibHVyXCIsIFwid2Via2l0RmlsdGVyXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcImJyaWdodG5lc3NcIiwgbGF5ZXJQcm9wZXJ0eSBcImJyaWdodG5lc3NcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMTAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzYXR1cmF0ZVwiLCBsYXllclByb3BlcnR5IFwic2F0dXJhdGVcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMTAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJodWVSb3RhdGVcIiwgbGF5ZXJQcm9wZXJ0eSBcImh1ZVJvdGF0ZVwiLCBcIndlYmtpdEZpbHRlclwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJjb250cmFzdFwiLCBsYXllclByb3BlcnR5IFwiY29udHJhc3RcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMTAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJpbnZlcnRcIiwgbGF5ZXJQcm9wZXJ0eSBcImludmVydFwiLCBcIndlYmtpdEZpbHRlclwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJncmF5c2NhbGVcIiwgbGF5ZXJQcm9wZXJ0eSBcImdyYXlzY2FsZVwiLCBcIndlYmtpdEZpbHRlclwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzZXBpYVwiLCBsYXllclByb3BlcnR5IFwic2VwaWFcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMCwgXy5pc051bWJlclxuXG5cdCMgTWFwcGVkIHN0eWxlIHByb3BlcnRpZXNcblxuXHRAZGVmaW5lIFwiYmFja2dyb3VuZENvbG9yXCIsIGxheWVyU3R5bGVQcm9wZXJ0eSBcImJhY2tncm91bmRDb2xvclwiXG5cdEBkZWZpbmUgXCJib3JkZXJSYWRpdXNcIiwgbGF5ZXJTdHlsZVByb3BlcnR5IFwiYm9yZGVyUmFkaXVzXCJcblx0QGRlZmluZSBcImJvcmRlckNvbG9yXCIsIGxheWVyU3R5bGVQcm9wZXJ0eSBcImJvcmRlckNvbG9yXCJcblx0QGRlZmluZSBcImJvcmRlcldpZHRoXCIsIGxheWVyU3R5bGVQcm9wZXJ0eSBcImJvcmRlcldpZHRoXCJcblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgSWRlbnRpdHlcblxuXHRAZGVmaW5lIFwibmFtZVwiLFxuXHRcdGV4cG9ydGFibGU6IHRydWVcblx0XHRkZWZhdWx0OiBcIlwiXG5cdFx0Z2V0OiAtPiBcblx0XHRcdEBfZ2V0UHJvcGVydHlWYWx1ZSBcIm5hbWVcIlxuXHRcdHNldDogKHZhbHVlKSAtPlxuXHRcdFx0QF9zZXRQcm9wZXJ0eVZhbHVlIFwibmFtZVwiLCB2YWx1ZVxuXHRcdFx0IyBTZXQgdGhlIG5hbWUgYXR0cmlidXRlIG9mIHRoZSBkb20gZWxlbWVudCB0b29cblx0XHRcdCMgU2VlOiBodHRwczovL2dpdGh1Yi5jb20va29lbmJvay9GcmFtZXIvaXNzdWVzLzYzXG5cdFx0XHRAX2VsZW1lbnQuc2V0QXR0cmlidXRlIFwibmFtZVwiLCB2YWx1ZVxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgR2VvbWV0cnlcblxuXHRAZGVmaW5lIFwiZnJhbWVcIixcblx0XHRnZXQ6IC0+XG5cdFx0XHRuZXcgRnJhbWUgQFxuXHRcdHNldDogKGZyYW1lKSAtPlxuXHRcdFx0cmV0dXJuIGlmIG5vdCBmcmFtZVxuXHRcdFx0Zm9yIGsgaW4gW1wieFwiLCBcInlcIiwgXCJ3aWR0aFwiLCBcImhlaWdodFwiXVxuXHRcdFx0XHRAW2tdID0gZnJhbWVba11cblxuXHRAZGVmaW5lIFwibWluWFwiLCBmcmFtZVByb3BlcnR5IFwibWluWFwiXG5cdEBkZWZpbmUgXCJtaWRYXCIsIGZyYW1lUHJvcGVydHkgXCJtaWRYXCJcblx0QGRlZmluZSBcIm1heFhcIiwgZnJhbWVQcm9wZXJ0eSBcIm1heFhcIlxuXHRAZGVmaW5lIFwibWluWVwiLCBmcmFtZVByb3BlcnR5IFwibWluWVwiXG5cdEBkZWZpbmUgXCJtaWRZXCIsIGZyYW1lUHJvcGVydHkgXCJtaWRZXCJcblx0QGRlZmluZSBcIm1heFlcIiwgZnJhbWVQcm9wZXJ0eSBcIm1heFlcIlxuXG5cdGNvbnZlcnRQb2ludDogKHBvaW50KSAtPlxuXHRcdCMgQ29udmVydCBhIHBvaW50IG9uIHNjcmVlbiB0byB0aGlzIHZpZXdzIGNvb3JkaW5hdGUgc3lzdGVtXG5cdFx0IyBUT0RPOiBuZWVkcyB0ZXN0c1xuXHRcdFV0aWxzLmNvbnZlcnRQb2ludCBwb2ludCwgbnVsbCwgQFxuXG5cdHNjcmVlbkZyYW1lOiAtPlxuXHRcdCMgR2V0IHRoaXMgdmlld3MgYWJzb2x1dGUgZnJhbWUgb24gdGhlIHNjcmVlblxuXHRcdCMgVE9ETzogbmVlZHMgdGVzdHNcblx0XHRVdGlscy5jb252ZXJ0UG9pbnQgQGZyYW1lLCBALCBudWxsXG5cblx0Y29udGVudEZyYW1lOiAtPlxuXHRcdFV0aWxzLmZyYW1lTWVyZ2UgQHN1YkxheWVycy5tYXAgKGxheWVyKSAtPiBsYXllci5mcmFtZS5wcm9wZXJ0aWVzXG5cblx0Y2VudGVyRnJhbWU6IC0+XG5cdFx0IyBHZXQgdGhlIGNlbnRlcmVkIGZyYW1lIGZvciBpdHMgc3VwZXJMYXllclxuXHRcdCMgV2UgYWx3YXlzIG1ha2UgdGhlc2UgcGl4ZWwgcGVyZmVjdFxuXHRcdCMgVE9ETzogbmVlZHMgdGVzdHNcblx0XHRpZiBAc3VwZXJMYXllclxuXHRcdFx0ZnJhbWUgPSBAZnJhbWVcblx0XHRcdGZyYW1lLm1pZFggPSBwYXJzZUludCBAc3VwZXJMYXllci53aWR0aCAvIDIuMFxuXHRcdFx0ZnJhbWUubWlkWSA9IHBhcnNlSW50IEBzdXBlckxheWVyLmhlaWdodCAvIDIuMFxuXHRcdFx0cmV0dXJuIGZyYW1lXG5cblx0XHRlbHNlXG5cdFx0XHRmcmFtZSA9IEBmcmFtZVxuXHRcdFx0ZnJhbWUubWlkWCA9IHBhcnNlSW50IHdpbmRvdy5pbm5lcldpZHRoIC8gMi4wXG5cdFx0XHRmcmFtZS5taWRZID0gcGFyc2VJbnQgd2luZG93LmlubmVySGVpZ2h0IC8gMi4wXG5cdFx0XHRyZXR1cm4gZnJhbWVcblxuXHRjZW50ZXI6IC0+IEBmcmFtZSA9IEBjZW50ZXJGcmFtZSgpICMgQ2VudGVyICBpbiBzdXBlckxheWVyXG5cdGNlbnRlclg6IC0+IEB4ID0gQGNlbnRlckZyYW1lKCkueCAjIENlbnRlciB4IGluIHN1cGVyTGF5ZXJcblx0Y2VudGVyWTogLT4gQHkgPSBAY2VudGVyRnJhbWUoKS55ICMgQ2VudGVyIHkgaW4gc3VwZXJMYXllclxuXG5cdHBpeGVsQWxpZ246IC0+XG5cdFx0QHggPSBwYXJzZUludCBAeFxuXHRcdEB5ID0gcGFyc2VJbnQgQHlcblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgQ1NTXG5cblx0QGRlZmluZSBcInN0eWxlXCIsXG5cdFx0Z2V0OiAtPiBAX2VsZW1lbnQuc3R5bGVcblx0XHRzZXQ6ICh2YWx1ZSkgLT5cblx0XHRcdF8uZXh0ZW5kIEBfZWxlbWVudC5zdHlsZSwgdmFsdWVcblx0XHRcdEBlbWl0IFwiY2hhbmdlOnN0eWxlXCJcblxuXHRAZGVmaW5lIFwiaHRtbFwiLFxuXHRcdGdldDogLT5cblx0XHRcdEBfZWxlbWVudEhUTUw/LmlubmVySFRNTFxuXG5cdFx0c2V0OiAodmFsdWUpIC0+XG5cblx0XHRcdCMgSW5zZXJ0IHNvbWUgaHRtbCBkaXJlY3RseSBpbnRvIHRoaXMgbGF5ZXIuIFdlIGFjdHVhbGx5IGNyZWF0ZVxuXHRcdFx0IyBhIGNoaWxkIG5vZGUgdG8gaW5zZXJ0IGl0IGluLCBzbyBpdCB3b24ndCBtZXNzIHdpdGggRnJhbWVyc1xuXHRcdFx0IyBsYXllciBoaWVyYXJjaHkuXG5cblx0XHRcdGlmIG5vdCBAX2VsZW1lbnRIVE1MXG5cdFx0XHRcdEBfZWxlbWVudEhUTUwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50IFwiZGl2XCJcblx0XHRcdFx0QF9lbGVtZW50LmFwcGVuZENoaWxkIEBfZWxlbWVudEhUTUxcblxuXHRcdFx0QF9lbGVtZW50SFRNTC5pbm5lckhUTUwgPSB2YWx1ZVxuXG5cdFx0XHQjIElmIHRoZSBjb250ZW50cyBjb250YWlucyBzb21ldGhpbmcgZWxzZSB0aGFuIHBsYWluIHRleHRcblx0XHRcdCMgdGhlbiB3ZSB0dXJuIG9mZiBpZ25vcmVFdmVudHMgc28gYnV0dG9ucyBldGMgd2lsbCB3b3JrLlxuXG5cdFx0XHRpZiBub3QgKFxuXHRcdFx0XHRAX2VsZW1lbnRIVE1MLmNoaWxkTm9kZXMubGVuZ3RoID09IDEgYW5kXG5cdFx0XHRcdEBfZWxlbWVudEhUTUwuY2hpbGROb2Rlc1swXS5ub2RlTmFtZSA9PSBcIiN0ZXh0XCIpXG5cdFx0XHRcdEBpZ25vcmVFdmVudHMgPSBmYWxzZVxuXG5cdFx0XHRAZW1pdCBcImNoYW5nZTpodG1sXCJcblxuXHRjb21wdXRlZFN0eWxlOiAtPlxuXHRcdGRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUgQF9lbGVtZW50XG5cblx0X3NldERlZmF1bHRDU1M6IC0+XG5cdFx0QHN0eWxlID0gQ29uZmlnLmxheWVyQmFzZUNTU1xuXG5cdEBkZWZpbmUgXCJjbGFzc0xpc3RcIixcblx0XHRnZXQ6IC0+IEBfZWxlbWVudC5jbGFzc0xpc3RcblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgRE9NIEVMRU1FTlRTXG5cblx0X2NyZWF0ZUVsZW1lbnQ6IC0+XG5cdFx0cmV0dXJuIGlmIEBfZWxlbWVudD9cblx0XHRAX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50IFwiZGl2XCJcblxuXHRfaW5zZXJ0RWxlbWVudDogLT5cblx0XHRVdGlscy5kb21Db21wbGV0ZSBAX19pbnNlcnRFbGVtZW50XG5cblx0X19pbnNlcnRFbGVtZW50OiA9PlxuXHRcdGlmIG5vdCBfUm9vdEVsZW1lbnRcblx0XHRcdF9Sb290RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgXCJkaXZcIlxuXHRcdFx0X1Jvb3RFbGVtZW50LmlkID0gXCJGcmFtZXJSb290XCJcblx0XHRcdF8uZXh0ZW5kIF9Sb290RWxlbWVudC5zdHlsZSwgQ29uZmlnLnJvb3RCYXNlQ1NTXG5cdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkIF9Sb290RWxlbWVudFxuXG5cdFx0X1Jvb3RFbGVtZW50LmFwcGVuZENoaWxkIEBfZWxlbWVudFxuXG5cdGRlc3Ryb3k6IC0+XG5cblx0XHRpZiBAc3VwZXJMYXllclxuXHRcdFx0QHN1cGVyTGF5ZXIuX3N1YkxheWVycyA9IF8ud2l0aG91dCBAc3VwZXJMYXllci5fc3ViTGF5ZXJzLCBAXG5cblx0XHRAX2VsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCBAX2VsZW1lbnRcblx0XHRAcmVtb3ZlQWxsTGlzdGVuZXJzKClcblxuXHRcdF9MYXllckxpc3QgPSBfLndpdGhvdXQgX0xheWVyTGlzdCwgQFxuXG5cblx0IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblx0IyMgQ09QWUlOR1xuXG5cdGNvcHk6IC0+XG5cblx0XHQjIFRvZG86IHdoYXQgYWJvdXQgZXZlbnRzLCBzdGF0ZXMsIGV0Yy5cblxuXHRcdGxheWVyID0gQGNvcHlTaW5nbGUoKVxuXG5cdFx0Zm9yIHN1YkxheWVyIGluIEBzdWJMYXllcnNcblx0XHRcdGNvcGllZFN1YmxheWVyID0gc3ViTGF5ZXIuY29weSgpXG5cdFx0XHRjb3BpZWRTdWJsYXllci5zdXBlckxheWVyID0gbGF5ZXJcblxuXHRcdGxheWVyXG5cblx0Y29weVNpbmdsZTogLT4gbmV3IExheWVyIEBwcm9wZXJ0aWVzXG5cblx0IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblx0IyMgQU5JTUFUSU9OXG5cblx0YW5pbWF0ZTogKG9wdGlvbnMpIC0+XG5cblx0XHRvcHRpb25zLmxheWVyID0gQFxuXHRcdG9wdGlvbnMuY3VydmVPcHRpb25zID0gb3B0aW9uc1xuXG5cdFx0YW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbiBvcHRpb25zXG5cdFx0YW5pbWF0aW9uLnN0YXJ0KClcblxuXHRcdGFuaW1hdGlvblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIElNQUdFXG5cblx0QGRlZmluZSBcImltYWdlXCIsXG5cdFx0ZXhwb3J0YWJsZTogdHJ1ZVxuXHRcdGRlZmF1bHQ6IFwiXCJcblx0XHRnZXQ6IC0+XG5cdFx0XHRAX2dldFByb3BlcnR5VmFsdWUgXCJpbWFnZVwiXG5cdFx0c2V0OiAodmFsdWUpIC0+XG5cblx0XHRcdGN1cnJlbnRWYWx1ZSA9IEBfZ2V0UHJvcGVydHlWYWx1ZSBcImltYWdlXCJcblxuXHRcdFx0aWYgY3VycmVudFZhbHVlID09IHZhbHVlXG5cdFx0XHRcdHJldHVybiBAZW1pdCBcImxvYWRcIlxuXG5cdFx0XHQjIFRvZG86IHRoaXMgaXMgbm90IHZlcnkgbmljZSBidXQgSSB3YW50ZWQgdG8gaGF2ZSBpdCBmaXhlZFxuXHRcdFx0IyBkZWZhdWx0cyA9IERlZmF1bHRzLmdldERlZmF1bHRzIFwiTGF5ZXJcIiwge31cblxuXHRcdFx0IyBjb25zb2xlLmxvZyBkZWZhdWx0cy5iYWNrZ3JvdW5kQ29sb3Jcblx0XHRcdCMgY29uc29sZS5sb2cgQF9kZWZhdWx0VmFsdWVzPy5iYWNrZ3JvdW5kQ29sb3JcblxuXHRcdFx0IyBpZiBkZWZhdWx0cy5iYWNrZ3JvdW5kQ29sb3IgPT0gQF9kZWZhdWx0VmFsdWVzPy5iYWNrZ3JvdW5kQ29sb3Jcblx0XHRcdCMgXHRAYmFja2dyb3VuZENvbG9yID0gbnVsbFxuXG5cdFx0XHRAYmFja2dyb3VuZENvbG9yID0gbnVsbFxuXG5cdFx0XHQjIFNldCB0aGUgcHJvcGVydHkgdmFsdWVcblx0XHRcdEBfc2V0UHJvcGVydHlWYWx1ZSBcImltYWdlXCIsIHZhbHVlXG5cblx0XHRcdGltYWdlVXJsID0gdmFsdWVcblxuXHRcdFx0IyBPcHRpb25hbCBiYXNlIGltYWdlIHZhbHVlXG5cdFx0XHQjIGltYWdlVXJsID0gQ29uZmlnLmJhc2VVcmwgKyBpbWFnZVVybFxuXG5cdFx0XHQjIElmIHRoZSBmaWxlIGlzIGxvY2FsLCB3ZSB3YW50IHRvIGF2b2lkIGNhY2hpbmdcblx0XHRcdCMgaWYgVXRpbHMuaXNMb2NhbCgpXG5cdFx0XHQjIFx0aW1hZ2VVcmwgKz0gXCI/bm9jYWNoZT0je0RhdGUubm93KCl9XCJcblxuXHRcdFx0IyBBcyBhbiBvcHRpbWl6YXRpb24sIHdlIHdpbGwgb25seSB1c2UgYSBsb2FkZXJcblx0XHRcdCMgaWYgc29tZXRoaW5nIGlzIGV4cGxpY2l0bHkgbGlzdGVuaW5nIHRvIHRoZSBsb2FkIGV2ZW50XG5cblx0XHRcdGlmIEBldmVudHM/Lmhhc093blByb3BlcnR5IFwibG9hZFwiIG9yIEBldmVudHM/Lmhhc093blByb3BlcnR5IFwiZXJyb3JcIlxuXG5cdFx0XHRcdGxvYWRlciA9IG5ldyBJbWFnZSgpXG5cdFx0XHRcdGxvYWRlci5uYW1lID0gaW1hZ2VVcmxcblx0XHRcdFx0bG9hZGVyLnNyYyA9IGltYWdlVXJsXG5cblx0XHRcdFx0bG9hZGVyLm9ubG9hZCA9ID0+XG5cdFx0XHRcdFx0QHN0eWxlW1wiYmFja2dyb3VuZC1pbWFnZVwiXSA9IFwidXJsKCcje2ltYWdlVXJsfScpXCJcblx0XHRcdFx0XHRAZW1pdCBcImxvYWRcIiwgbG9hZGVyXG5cblx0XHRcdFx0bG9hZGVyLm9uZXJyb3IgPSA9PlxuXHRcdFx0XHRcdEBlbWl0IFwiZXJyb3JcIiwgbG9hZGVyXG5cblx0XHRcdGVsc2Vcblx0XHRcdFx0QHN0eWxlW1wiYmFja2dyb3VuZC1pbWFnZVwiXSA9IFwidXJsKCcje2ltYWdlVXJsfScpXCJcblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBISUVSQVJDSFlcblxuXHRAZGVmaW5lIFwic3VwZXJMYXllclwiLFxuXHRcdGV4cG9ydGFibGU6IGZhbHNlXG5cdFx0Z2V0OiAtPlxuXHRcdFx0QF9zdXBlckxheWVyIG9yIG51bGxcblx0XHRzZXQ6IChsYXllcikgLT5cblxuXHRcdFx0cmV0dXJuIGlmIGxheWVyIGlzIEBfc3VwZXJMYXllclxuXG5cdFx0XHQjIENoZWNrIHRoZSB0eXBlXG5cdFx0XHRpZiBub3QgbGF5ZXIgaW5zdGFuY2VvZiBMYXllclxuXHRcdFx0XHR0aHJvdyBFcnJvciBcIkxheWVyLnN1cGVyTGF5ZXIgbmVlZHMgdG8gYmUgYSBMYXllciBvYmplY3RcIlxuXG5cdFx0XHQjIENhbmNlbCBwcmV2aW91cyBwZW5kaW5nIGluc2VydGlvbnNcblx0XHRcdFV0aWxzLmRvbUNvbXBsZXRlQ2FuY2VsIEBfX2luc2VydEVsZW1lbnRcblxuXHRcdFx0IyBSZW1vdmUgZnJvbSBwcmV2aW91cyBzdXBlcmxheWVyIHN1YmxheWVyc1xuXHRcdFx0aWYgQF9zdXBlckxheWVyXG5cdFx0XHRcdEBfc3VwZXJMYXllci5fc3ViTGF5ZXJzID0gXy53aXRob3V0IEBfc3VwZXJMYXllci5fc3ViTGF5ZXJzLCBAXG5cdFx0XHRcdEBfc3VwZXJMYXllci5fZWxlbWVudC5yZW1vdmVDaGlsZCBAX2VsZW1lbnRcblx0XHRcdFx0QF9zdXBlckxheWVyLmVtaXQgXCJjaGFuZ2U6c3ViTGF5ZXJzXCIsIHthZGRlZDpbXSwgcmVtb3ZlZDpbQF19XG5cblx0XHRcdCMgRWl0aGVyIGluc2VydCB0aGUgZWxlbWVudCB0byB0aGUgbmV3IHN1cGVybGF5ZXIgZWxlbWVudCBvciBpbnRvIGRvbVxuXHRcdFx0aWYgbGF5ZXJcblx0XHRcdFx0bGF5ZXIuX2VsZW1lbnQuYXBwZW5kQ2hpbGQgQF9lbGVtZW50XG5cdFx0XHRcdGxheWVyLl9zdWJMYXllcnMucHVzaCBAXG5cdFx0XHRcdGxheWVyLmVtaXQgXCJjaGFuZ2U6c3ViTGF5ZXJzXCIsIHthZGRlZDpbQF0sIHJlbW92ZWQ6W119XG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBfaW5zZXJ0RWxlbWVudCgpXG5cblx0XHRcdCMgU2V0IHRoZSBzdXBlcmxheWVyXG5cdFx0XHRAX3N1cGVyTGF5ZXIgPSBsYXllclxuXG5cdFx0XHQjIFBsYWNlIHRoaXMgbGF5ZXIgb24gdG9wIG9mIGl0J3Mgc2libGluZ3Ncblx0XHRcdEBicmluZ1RvRnJvbnQoKVxuXG5cdFx0XHRAZW1pdCBcImNoYW5nZTpzdXBlckxheWVyXCJcblxuXHRzdXBlckxheWVyczogLT5cblxuXHRcdHN1cGVyTGF5ZXJzID0gW11cblxuXHRcdHJlY3Vyc2UgPSAobGF5ZXIpIC0+XG5cdFx0XHRyZXR1cm4gaWYgbm90IGxheWVyLnN1cGVyTGF5ZXJcblx0XHRcdHN1cGVyTGF5ZXJzLnB1c2ggbGF5ZXIuc3VwZXJMYXllclxuXHRcdFx0cmVjdXJzZSBsYXllci5zdXBlckxheWVyXG5cblx0XHRyZWN1cnNlIEBcblxuXHRcdHN1cGVyTGF5ZXJzXG5cblx0IyBUb2RvOiBzaG91bGQgd2UgaGF2ZSBhIHJlY3Vyc2l2ZSBzdWJMYXllcnMgZnVuY3Rpb24/XG5cdCMgTGV0J3MgbWFrZSBpdCB3aGVuIHdlIG5lZWQgaXQuXG5cblx0QGRlZmluZSBcInN1YkxheWVyc1wiLFxuXHRcdGV4cG9ydGFibGU6IGZhbHNlXG5cdFx0Z2V0OiAtPiBfLmNsb25lIEBfc3ViTGF5ZXJzXG5cblx0QGRlZmluZSBcInNpYmxpbmdMYXllcnNcIixcblx0XHRleHBvcnRhYmxlOiBmYWxzZVxuXHRcdGdldDogLT5cblxuXHRcdFx0IyBJZiB0aGVyZSBpcyBubyBzdXBlckxheWVyIHdlIG5lZWQgdG8gd2FsayB0aHJvdWdoIHRoZSByb290XG5cdFx0XHRpZiBAc3VwZXJMYXllciBpcyBudWxsXG5cdFx0XHRcdHJldHVybiBfLmZpbHRlciBfTGF5ZXJMaXN0LCAobGF5ZXIpID0+XG5cdFx0XHRcdFx0bGF5ZXIgaXNudCBAIGFuZCBsYXllci5zdXBlckxheWVyIGlzIG51bGxcblxuXHRcdFx0cmV0dXJuIF8ud2l0aG91dCBAc3VwZXJMYXllci5zdWJMYXllcnMsIEBcblxuXHRhZGRTdWJMYXllcjogKGxheWVyKSAtPlxuXHRcdGxheWVyLnN1cGVyTGF5ZXIgPSBAXG5cblx0cmVtb3ZlU3ViTGF5ZXI6IChsYXllcikgLT5cblxuXHRcdGlmIGxheWVyIG5vdCBpbiBAc3ViTGF5ZXJzXG5cdFx0XHRyZXR1cm5cblxuXHRcdGxheWVyLnN1cGVyTGF5ZXIgPSBudWxsXG5cblx0c3ViTGF5ZXJzQnlOYW1lOiAobmFtZSkgLT5cblx0XHRfLmZpbHRlciBAc3ViTGF5ZXJzLCAobGF5ZXIpIC0+IGxheWVyLm5hbWUgPT0gbmFtZVxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIEFOSU1BVElPTlxuXG5cdGFuaW1hdGU6IChvcHRpb25zKSAtPlxuXG5cdFx0c3RhcnQgPSBvcHRpb25zLnN0YXJ0XG5cdFx0c3RhcnQgPz0gdHJ1ZVxuXHRcdGRlbGV0ZSBvcHRpb25zLnN0YXJ0XG5cblx0XHRvcHRpb25zLmxheWVyID0gQFxuXHRcdGFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb24gb3B0aW9uc1xuXHRcdGFuaW1hdGlvbi5zdGFydCgpIGlmIHN0YXJ0XG5cdFx0YW5pbWF0aW9uXG5cblx0YW5pbWF0aW9uczogLT5cblx0XHQjIEN1cnJlbnQgcnVubmluZyBhbmltYXRpb25zIG9uIHRoaXMgbGF5ZXJcblx0XHRfLmZpbHRlciBBbmltYXRpb24ucnVubmluZ0FuaW1hdGlvbnMoKSwgKGEpID0+XG5cdFx0XHRhLm9wdGlvbnMubGF5ZXIgPT0gQFxuXG5cdGFuaW1hdGVTdG9wOiAtPlxuXHRcdF8uaW52b2tlIEBhbmltYXRpb25zKCksIFwic3RvcFwiXG5cblx0IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblx0IyMgSU5ERVggT1JERVJJTkdcblxuXHRicmluZ1RvRnJvbnQ6IC0+XG5cdFx0QGluZGV4ID0gXy5tYXgoXy51bmlvbihbMF0sIEBzaWJsaW5nTGF5ZXJzLm1hcCAobGF5ZXIpIC0+IGxheWVyLmluZGV4KSkgKyAxXG5cblx0c2VuZFRvQmFjazogLT5cblx0XHRAaW5kZXggPSBfLm1pbihfLnVuaW9uKFswXSwgQHNpYmxpbmdMYXllcnMubWFwIChsYXllcikgLT4gbGF5ZXIuaW5kZXgpKSAtIDFcblxuXHRwbGFjZUJlZm9yZTogKGxheWVyKSAtPlxuXHRcdHJldHVybiBpZiBsYXllciBub3QgaW4gQHNpYmxpbmdMYXllcnNcblxuXHRcdGZvciBsIGluIEBzaWJsaW5nTGF5ZXJzXG5cdFx0XHRpZiBsLmluZGV4IDw9IGxheWVyLmluZGV4XG5cdFx0XHRcdGwuaW5kZXggLT0gMVxuXG5cdFx0QGluZGV4ID0gbGF5ZXIuaW5kZXggKyAxXG5cblx0cGxhY2VCZWhpbmQ6IChsYXllcikgLT5cblx0XHRyZXR1cm4gaWYgbGF5ZXIgbm90IGluIEBzaWJsaW5nTGF5ZXJzXG5cblx0XHRmb3IgbCBpbiBAc2libGluZ0xheWVyc1xuXHRcdFx0aWYgbC5pbmRleCA+PSBsYXllci5pbmRleFxuXHRcdFx0XHRsLmluZGV4ICs9IDFcblxuXHRcdEBpbmRleCA9IGxheWVyLmluZGV4IC0gMVxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIFNUQVRFU1xuXG5cdEBkZWZpbmUgXCJzdGF0ZXNcIixcblx0XHRnZXQ6IC0+IEBfc3RhdGVzID89IG5ldyBMYXllclN0YXRlcyBAXG5cblx0IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblx0IyMgRHJhZ2dhYmxlXG5cblx0QGRlZmluZSBcImRyYWdnYWJsZVwiLFxuXHRcdGdldDogLT5cblx0XHRcdEBfZHJhZ2dhYmxlID89IG5ldyBMYXllckRyYWdnYWJsZSBAXG5cdFx0XHRAX2RyYWdnYWJsZVxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIFNDUk9MTElOR1xuXG5cdCMgVE9ETzogVGVzdHNcblxuXHRAZGVmaW5lIFwic2Nyb2xsRnJhbWVcIixcblx0XHRnZXQ6IC0+XG5cdFx0XHRyZXR1cm4gbmV3IEZyYW1lXG5cdFx0XHRcdHg6IEBzY3JvbGxYXG5cdFx0XHRcdHk6IEBzY3JvbGxZXG5cdFx0XHRcdHdpZHRoOiBAd2lkdGhcblx0XHRcdFx0aGVpZ2h0OiBAaGVpZ2h0XG5cdFx0c2V0OiAoZnJhbWUpIC0+XG5cdFx0XHRAc2Nyb2xsWCA9IGZyYW1lLnhcblx0XHRcdEBzY3JvbGxZID0gZnJhbWUueVxuXG5cdEBkZWZpbmUgXCJzY3JvbGxYXCIsXG5cdFx0Z2V0OiAtPiBAX2VsZW1lbnQuc2Nyb2xsTGVmdFxuXHRcdHNldDogKHZhbHVlKSAtPiBAX2VsZW1lbnQuc2Nyb2xsTGVmdCA9IHZhbHVlXG5cblx0QGRlZmluZSBcInNjcm9sbFlcIixcblx0XHRnZXQ6IC0+IEBfZWxlbWVudC5zY3JvbGxUb3Bcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gQF9lbGVtZW50LnNjcm9sbFRvcCA9IHZhbHVlXG5cblx0IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblx0IyMgRVZFTlRTXG5cblx0YWRkTGlzdGVuZXI6IChldmVudCwgb3JpZ2luYWxMaXN0ZW5lcikgPT5cblxuXHRcdCMgIyBNb2RpZnkgdGhlIHNjb3BlIHRvIGJlIHRoZSBjYWxsaW5nIG9iamVjdCwganVzdCBsaWtlIGpxdWVyeVxuXHRcdCMgIyBhbHNvIGFkZCB0aGUgb2JqZWN0IGFzIHRoZSBsYXN0IGFyZ3VtZW50XG5cdFx0bGlzdGVuZXIgPSAoYXJncy4uLikgPT5cblx0XHRcdG9yaWdpbmFsTGlzdGVuZXIuY2FsbCBALCBhcmdzLi4uLCBAXG5cblx0XHQjIEJlY2F1c2Ugd2UgbW9kaWZ5IHRoZSBsaXN0ZW5lciB3ZSBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgaXRcblx0XHQjIHNvIHdlIGNhbiBmaW5kIGl0IGJhY2sgd2hlbiB3ZSB3YW50IHRvIHVubGlzdGVuIGFnYWluXG5cdFx0b3JpZ2luYWxMaXN0ZW5lci5tb2RpZmllZExpc3RlbmVyID0gbGlzdGVuZXJcblxuXHRcdCMgTGlzdGVuIHRvIGRvbSBldmVudHMgb24gdGhlIGVsZW1lbnRcblx0XHRzdXBlciBldmVudCwgbGlzdGVuZXJcblx0XHRAX2VsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBldmVudCwgbGlzdGVuZXJcblxuXHRcdEBfZXZlbnRMaXN0ZW5lcnMgPz0ge31cblx0XHRAX2V2ZW50TGlzdGVuZXJzW2V2ZW50XSA/PSBbXVxuXHRcdEBfZXZlbnRMaXN0ZW5lcnNbZXZlbnRdLnB1c2ggbGlzdGVuZXJcblxuXHRcdCMgV2Ugd2FudCB0byBtYWtlIHN1cmUgd2UgbGlzdGVuIHRvIHRoZXNlIGV2ZW50c1xuXHRcdEBpZ25vcmVFdmVudHMgPSBmYWxzZVxuXG5cdHJlbW92ZUxpc3RlbmVyOiAoZXZlbnQsIGxpc3RlbmVyKSAtPlxuXG5cdFx0IyBJZiB0aGUgb3JpZ2luYWwgbGlzdGVuZXIgd2FzIG1vZGlmaWVkLCByZW1vdmUgdGhhdFxuXHRcdCMgb25lIGluc3RlYWRcblx0XHRpZiBsaXN0ZW5lci5tb2RpZmllZExpc3RlbmVyXG5cdFx0XHRsaXN0ZW5lciA9IGxpc3RlbmVyLm1vZGlmaWVkTGlzdGVuZXJcblxuXHRcdHN1cGVyIGV2ZW50LCBsaXN0ZW5lclxuXHRcdFxuXHRcdEBfZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyIGV2ZW50LCBsaXN0ZW5lclxuXHRcdEBfZXZlbnRMaXN0ZW5lcnNbZXZlbnRdID0gXy53aXRob3V0IEBfZXZlbnRMaXN0ZW5lcnNbZXZlbnRdLCBsaXN0ZW5lclxuXG5cdHJlbW92ZUFsbExpc3RlbmVyczogLT5cblxuXHRcdHJldHVybiBpZiBub3QgQF9ldmVudExpc3RlbmVyc1xuXG5cdFx0Zm9yIGV2ZW50TmFtZSwgbGlzdGVuZXJzIG9mIEBfZXZlbnRMaXN0ZW5lcnNcblx0XHRcdGZvciBsaXN0ZW5lciBpbiBsaXN0ZW5lcnNcblx0XHRcdFx0QHJlbW92ZUxpc3RlbmVyIGV2ZW50TmFtZSwgbGlzdGVuZXJcblxuXHRvbjogQDo6YWRkTGlzdGVuZXJcblx0b2ZmOiBAOjpyZW1vdmVMaXN0ZW5lclxuXG5leHBvcnRzLkxheWVyLkxheWVycyA9IC0+IF8uY2xvbmUgX0xheWVyTGlzdFxuIiwiXyA9IHJlcXVpcmUgXCIuL1VuZGVyc2NvcmVcIlxuXG5VdGlscyA9IHJlcXVpcmUgXCIuL1V0aWxzXCJcbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcbntFdmVudHN9ID0gcmVxdWlyZSBcIi4vRXZlbnRzXCJcblxuIyBBZGQgc3BlY2lmaWMgZXZlbnRzIGZvciBkcmFnZ2FibGVcbkV2ZW50cy5EcmFnU3RhcnQgPSBcImRyYWdzdGFydFwiXG5FdmVudHMuRHJhZ01vdmUgPSBcImRyYWdtb3ZlXCJcbkV2ZW50cy5EcmFnRW5kID0gXCJkcmFnZW5kXCJcblxuXCJcIlwiXG5UaGlzIHRha2VzIGFueSBsYXllciBhbmQgbWFrZXMgaXQgZHJhZ2dhYmxlIGJ5IHRoZSB1c2VyIG9uIG1vYmlsZSBvciBkZXNrdG9wLlxuXG5Tb21lIGludGVyZXN0aW5nIHRoaW5ncyBhcmU6XG5cbi0gVGhlIGRyYWdnYWJsZS5jYWxjdWxhdGVWZWxvY2l0eSgpLnh8eSBjb250YWlucyB0aGUgY3VycmVudCBhdmVyYWdlIHNwZWVkIFxuICBpbiB0aGUgbGFzdCAxMDBtcyAoZGVmaW5lZCB3aXRoIFZlbG9jaXR5VGltZU91dCkuXG4tIFlvdSBjYW4gZW5hYmxlL2Rpc2FibGUgb3Igc2xvd2Rvd24vc3BlZWR1cCBzY3JvbGxpbmcgd2l0aFxuICBkcmFnZ2FibGUuc3BlZWQueHx5XG5cblwiXCJcIlxuXG5jbGFzcyBleHBvcnRzLkxheWVyRHJhZ2dhYmxlIGV4dGVuZHMgRXZlbnRFbWl0dGVyXG5cblx0QFZlbG9jaXR5VGltZU91dCA9IDEwMFxuXG5cdGNvbnN0cnVjdG9yOiAoQGxheWVyKSAtPlxuXG5cdFx0IyBAc3BlZWQgPSB7eDoxLjAsIHk6MS4wfVxuXHRcdEBzcGVlZFggPSAxLjBcblx0XHRAc3BlZWRZID0gMS4wXG5cblx0XHRAX2RlbHRhcyA9IFtdXG5cdFx0QF9pc0RyYWdnaW5nID0gZmFsc2VcblxuXHRcdEBlbmFibGVkID0gdHJ1ZVxuXG5cdFx0QGF0dGFjaCgpXG5cblx0YXR0YWNoOiAtPiBAbGF5ZXIub24gIEV2ZW50cy5Ub3VjaFN0YXJ0LCBAX3RvdWNoU3RhcnRcblx0cmVtb3ZlOiAtPiBAbGF5ZXIub2ZmIEV2ZW50cy5Ub3VjaFN0YXJ0LCBAX3RvdWNoU3RhcnRcblxuXHRlbWl0OiAoZXZlbnROYW1lLCBldmVudCkgLT5cblx0XHQjIFdlIG92ZXJyaWRlIHRoaXMgdG8gZ2V0IGFsbCBldmVudHMgYm90aCBvbiB0aGUgZHJhZ2dhYmxlXG5cdFx0IyBhbmQgdGhlIGVuY2Fwc3VsYXRlZCBsYXllci5cblx0XHRAbGF5ZXIuZW1pdCBldmVudE5hbWUsIGV2ZW50XG5cblx0XHRzdXBlciBldmVudE5hbWUsIGV2ZW50XG5cblxuXHRjYWxjdWxhdGVWZWxvY2l0eTogLT5cblxuXHRcdGlmIEBfZGVsdGFzLmxlbmd0aCA8IDJcblx0XHRcdHJldHVybiB7eDowLCB5OjB9XG5cblx0XHRjdXJyID0gQF9kZWx0YXNbLTEuLi0xXVswXVxuXHRcdHByZXYgPSBAX2RlbHRhc1stMi4uLTJdWzBdXG5cdFx0dGltZSA9IGN1cnIudCAtIHByZXYudFxuXG5cdFx0IyBCYWlsIG91dCBpZiB0aGUgbGFzdCBtb3ZlIHVwZGF0ZXMgd2hlcmUgYSB3aGlsZSBhZ29cblx0XHR0aW1lU2luY2VMYXN0TW92ZSA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHByZXYudClcblxuXHRcdGlmIHRpbWVTaW5jZUxhc3RNb3ZlID4gQFZlbG9jaXR5VGltZU91dFxuXHRcdFx0cmV0dXJuIHt4OjAsIHk6MH1cblxuXHRcdHZlbG9jaXR5ID1cblx0XHRcdHg6IChjdXJyLnggLSBwcmV2LngpIC8gdGltZVxuXHRcdFx0eTogKGN1cnIueSAtIHByZXYueSkgLyB0aW1lXG5cblx0XHR2ZWxvY2l0eS54ID0gMCBpZiB2ZWxvY2l0eS54IGlzIEluZmluaXR5XG5cdFx0dmVsb2NpdHkueSA9IDAgaWYgdmVsb2NpdHkueSBpcyBJbmZpbml0eVxuXG5cdFx0dmVsb2NpdHlcblxuXHRfdXBkYXRlUG9zaXRpb246IChldmVudCkgPT5cblxuXHRcdGlmIEBlbmFibGVkIGlzIGZhbHNlXG5cdFx0XHRyZXR1cm5cblxuXHRcdEBlbWl0IEV2ZW50cy5EcmFnTW92ZSwgZXZlbnRcblxuXHRcdHRvdWNoRXZlbnQgPSBFdmVudHMudG91Y2hFdmVudCBldmVudFxuXG5cdFx0ZGVsdGEgPVxuXHRcdFx0eDogdG91Y2hFdmVudC5jbGllbnRYIC0gQF9zdGFydC54XG5cdFx0XHR5OiB0b3VjaEV2ZW50LmNsaWVudFkgLSBAX3N0YXJ0LnlcblxuXHRcdCMgQ29ycmVjdCBmb3IgY3VycmVudCBkcmFnIHNwZWVkXG5cdFx0Y29ycmVjdGVkRGVsdGEgPVxuXHRcdFx0eDogZGVsdGEueCAqIEBzcGVlZFhcblx0XHRcdHk6IGRlbHRhLnkgKiBAc3BlZWRZXG5cdFx0XHR0OiBldmVudC50aW1lU3RhbXBcblxuXHRcdCMgV2UgdXNlIHRoZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdG8gdXBkYXRlIHRoZSBwb3NpdGlvblxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT5cblx0XHRcdEBsYXllci54ID0gQF9zdGFydC54ICsgY29ycmVjdGVkRGVsdGEueCAtIEBfb2Zmc2V0Lnhcblx0XHRcdEBsYXllci55ID0gQF9zdGFydC55ICsgY29ycmVjdGVkRGVsdGEueSAtIEBfb2Zmc2V0LnlcblxuXHRcdEBfZGVsdGFzLnB1c2ggY29ycmVjdGVkRGVsdGFcblxuXHRcdEBlbWl0IEV2ZW50cy5EcmFnTW92ZSwgZXZlbnRcblxuXHRfdG91Y2hTdGFydDogKGV2ZW50KSA9PlxuXG5cdFx0QGxheWVyLmFuaW1hdGVTdG9wKClcblxuXHRcdEBfaXNEcmFnZ2luZyA9IHRydWVcblxuXHRcdHRvdWNoRXZlbnQgPSBFdmVudHMudG91Y2hFdmVudCBldmVudFxuXG5cdFx0QF9zdGFydCA9XG5cdFx0XHR4OiB0b3VjaEV2ZW50LmNsaWVudFhcblx0XHRcdHk6IHRvdWNoRXZlbnQuY2xpZW50WVxuXG5cdFx0QF9vZmZzZXQgPVxuXHRcdFx0eDogdG91Y2hFdmVudC5jbGllbnRYIC0gQGxheWVyLnhcblx0XHRcdHk6IHRvdWNoRXZlbnQuY2xpZW50WSAtIEBsYXllci55XG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIEV2ZW50cy5Ub3VjaE1vdmUsIEBfdXBkYXRlUG9zaXRpb25cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIEV2ZW50cy5Ub3VjaEVuZCwgQF90b3VjaEVuZFxuXG5cdFx0QGVtaXQgRXZlbnRzLkRyYWdTdGFydCwgZXZlbnRcblxuXHRfdG91Y2hFbmQ6IChldmVudCkgPT5cblxuXHRcdEBfaXNEcmFnZ2luZyA9IGZhbHNlXG5cblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyIEV2ZW50cy5Ub3VjaE1vdmUsIEBfdXBkYXRlUG9zaXRpb25cblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyIEV2ZW50cy5Ub3VjaEVuZCwgQF90b3VjaEVuZFxuXG5cdFx0QGVtaXQgRXZlbnRzLkRyYWdFbmQsIGV2ZW50XG5cblx0XHRAX2RlbHRhcyA9IFtdIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cbntFdmVudHN9ID0gcmVxdWlyZSBcIi4vRXZlbnRzXCJcbntCYXNlQ2xhc3N9ID0gcmVxdWlyZSBcIi4vQmFzZUNsYXNzXCJcbntEZWZhdWx0c30gPSByZXF1aXJlIFwiLi9EZWZhdWx0c1wiXG5cbkxheWVyU3RhdGVzSWdub3JlZEtleXMgPSBbXCJpZ25vcmVFdmVudHNcIl1cblxuIyBBbmltYXRpb24gZXZlbnRzXG5FdmVudHMuU3RhdGVXaWxsU3dpdGNoID0gXCJ3aWxsU3dpdGNoXCJcbkV2ZW50cy5TdGF0ZURpZFN3aXRjaCA9IFwiZGlkU3dpdGNoXCJcblxuY2xhc3MgZXhwb3J0cy5MYXllclN0YXRlcyBleHRlbmRzIEJhc2VDbGFzc1xuXG5cdGNvbnN0cnVjdG9yOiAoQGxheWVyKSAtPlxuXG5cdFx0QF9zdGF0ZXMgPSB7fVxuXHRcdEBfb3JkZXJlZFN0YXRlcyA9IFtdXG5cblx0XHRAYW5pbWF0aW9uT3B0aW9ucyA9IHt9XG5cblx0XHQjIEFsd2F5cyBhZGQgdGhlIGRlZmF1bHQgc3RhdGUgYXMgdGhlIGN1cnJlbnRcblx0XHRAYWRkIFwiZGVmYXVsdFwiLCBAbGF5ZXIucHJvcGVydGllc1xuXG5cdFx0QF9jdXJyZW50U3RhdGUgPSBcImRlZmF1bHRcIlxuXHRcdEBfcHJldmlvdXNTdGF0ZXMgPSBbXVxuXG5cdFx0c3VwZXJcblxuXHRhZGQ6IChzdGF0ZU5hbWUsIHByb3BlcnRpZXMpIC0+XG5cblx0XHQjIFdlIGFsc28gYWxsb3cgYW4gb2JqZWN0IHdpdGggc3RhdGVzIHRvIGJlIHBhc3NlZCBpblxuXHRcdCMgbGlrZTogbGF5ZXIuc3RhdGVzLmFkZCh7c3RhdGVBOiB7Li4ufSwgc3RhdGVCOiB7Li4ufX0pXG5cdFx0aWYgXy5pc09iamVjdCBzdGF0ZU5hbWVcblx0XHRcdGZvciBrLCB2IG9mIHN0YXRlTmFtZVxuXHRcdFx0XHRAYWRkIGssIHZcblx0XHRcdHJldHVyblxuXG5cdFx0ZXJyb3IgPSAtPiB0aHJvdyBFcnJvciBcIlVzYWdlIGV4YW1wbGU6IGxheWVyLnN0YXRlcy5hZGQoXFxcInNvbWVOYW1lXFxcIiwge3g6NTAwfSlcIlxuXHRcdGVycm9yKCkgaWYgbm90IF8uaXNTdHJpbmcgc3RhdGVOYW1lXG5cdFx0ZXJyb3IoKSBpZiBub3QgXy5pc09iamVjdCBwcm9wZXJ0aWVzXG5cblx0XHQjIEFkZCBhIHN0YXRlIHdpdGggYSBuYW1lIGFuZCBwcm9wZXJ0aWVzXG5cdFx0QF9vcmRlcmVkU3RhdGVzLnB1c2ggc3RhdGVOYW1lXG5cdFx0QF9zdGF0ZXNbc3RhdGVOYW1lXSA9IHByb3BlcnRpZXNcblxuXHRyZW1vdmU6IChzdGF0ZU5hbWUpIC0+XG5cblx0XHRpZiBub3QgQF9zdGF0ZXMuaGFzT3duUHJvcGVydHkgc3RhdGVOYW1lXG5cdFx0XHRyZXR1cm5cblxuXHRcdGRlbGV0ZSBAX3N0YXRlc1tzdGF0ZU5hbWVdXG5cdFx0QF9vcmRlcmVkU3RhdGVzID0gXy53aXRob3V0IEBfb3JkZXJlZFN0YXRlcywgc3RhdGVOYW1lXG5cblx0c3dpdGNoOiAoc3RhdGVOYW1lLCBhbmltYXRpb25PcHRpb25zLCBpbnN0YW50PWZhbHNlKSAtPlxuXG5cdFx0IyBTd2l0Y2hlcyB0byBhIHNwZWNpZmljIHN0YXRlLiBJZiBhbmltYXRpb25PcHRpb25zIGFyZVxuXHRcdCMgZ2l2ZW4gdXNlIHRob3NlLCBvdGhlcndpc2UgdGhlIGRlZmF1bHQgb3B0aW9ucy5cblxuXHRcdCMgV2UgYWN0dWFsbHkgZG8gd2FudCB0byBhbGxvdyB0aGlzLiBBIHN0YXRlIGNhbiBiZSBzZXQgdG8gc29tZXRoaW5nXG5cdFx0IyB0aGF0IGRvZXMgbm90IGVxdWFsIHRoZSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoYXQgc3RhdGUuXG5cblx0XHQjIGlmIHN0YXRlTmFtZSBpcyBAX2N1cnJlbnRTdGF0ZVxuXHRcdCMgXHRyZXR1cm5cblxuXHRcdGlmIG5vdCBAX3N0YXRlcy5oYXNPd25Qcm9wZXJ0eSBzdGF0ZU5hbWVcblx0XHRcdHRocm93IEVycm9yIFwiTm8gc3VjaCBzdGF0ZTogJyN7c3RhdGVOYW1lfSdcIlxuXG5cdFx0QGVtaXQgRXZlbnRzLlN0YXRlV2lsbFN3aXRjaCwgQF9jdXJyZW50U3RhdGUsIHN0YXRlTmFtZSwgQFxuXG5cdFx0QF9wcmV2aW91c1N0YXRlcy5wdXNoIEBfY3VycmVudFN0YXRlXG5cdFx0QF9jdXJyZW50U3RhdGUgPSBzdGF0ZU5hbWVcblxuXHRcdHByb3BlcnRpZXMgPSB7fVxuXHRcdGFuaW1hdGluZ0tleXMgPSBAYW5pbWF0aW5nS2V5cygpXG5cblx0XHRmb3IgcHJvcGVydHlOYW1lLCB2YWx1ZSBvZiBAX3N0YXRlc1tzdGF0ZU5hbWVdXG5cblx0XHRcdCMgRG9uJ3QgYW5pbWF0ZSBpZ25vcmVkIHByb3BlcnRpZXNcblx0XHRcdGlmIHByb3BlcnR5TmFtZSBpbiBMYXllclN0YXRlc0lnbm9yZWRLZXlzXG5cdFx0XHRcdGNvbnRpbnVlXG5cblx0XHRcdGlmIHByb3BlcnR5TmFtZSBub3QgaW4gYW5pbWF0aW5nS2V5c1xuXHRcdFx0XHRjb250aW51ZVxuXG5cdFx0XHQjIEFsbG93IGR5bmFtaWMgcHJvcGVydGllcyBhcyBmdW5jdGlvbnNcblx0XHRcdHZhbHVlID0gdmFsdWUuY2FsbChAbGF5ZXIsIEBsYXllciwgc3RhdGVOYW1lKSBpZiBfLmlzRnVuY3Rpb24odmFsdWUpXG5cblx0XHRcdCMgU2V0IHRoZSBuZXcgdmFsdWUgXG5cdFx0XHRwcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV0gPSB2YWx1ZVxuXG5cdFx0aWYgaW5zdGFudCBpcyB0cnVlXG5cdFx0XHQjIFdlIHdhbnQgdG8gc3dpdGNoIGltbWVkaWF0ZWx5IHdpdGhvdXQgYW5pbWF0aW9uXG5cdFx0XHRAbGF5ZXIucHJvcGVydGllcyA9IHByb3BlcnRpZXNcblx0XHRcdEBlbWl0IEV2ZW50cy5TdGF0ZURpZFN3aXRjaCwgXy5sYXN0KEBfcHJldmlvdXNTdGF0ZXMpLCBzdGF0ZU5hbWUsIEBcblxuXHRcdGVsc2Vcblx0XHRcdCMgU3RhcnQgdGhlIGFuaW1hdGlvbiBhbmQgdXBkYXRlIHRoZSBzdGF0ZSB3aGVuIGZpbmlzaGVkXG5cdFx0XHRhbmltYXRpb25PcHRpb25zID89IEBhbmltYXRpb25PcHRpb25zXG5cdFx0XHRhbmltYXRpb25PcHRpb25zLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzXG5cblx0XHRcdEBfYW5pbWF0aW9uID0gQGxheWVyLmFuaW1hdGUgYW5pbWF0aW9uT3B0aW9uc1xuXHRcdFx0QF9hbmltYXRpb24ub24gXCJzdG9wXCIsID0+IFxuXHRcdFx0XHRAZW1pdCBFdmVudHMuU3RhdGVEaWRTd2l0Y2gsIF8ubGFzdChAX3ByZXZpb3VzU3RhdGVzKSwgc3RhdGVOYW1lLCBAXG5cblxuXHRzd2l0Y2hJbnN0YW50OiAoc3RhdGVOYW1lKSAtPlxuXHRcdEBzd2l0Y2ggc3RhdGVOYW1lLCBudWxsLCB0cnVlXG5cblx0QGRlZmluZSBcInN0YXRlXCIsIGdldDogLT4gQF9jdXJyZW50U3RhdGVcblx0QGRlZmluZSBcImN1cnJlbnRcIiwgZ2V0OiAtPiBAX2N1cnJlbnRTdGF0ZVxuXG5cdHN0YXRlczogLT5cblx0XHQjIFJldHVybiBhIGxpc3Qgb2YgYWxsIHRoZSBwb3NzaWJsZSBzdGF0ZXNcblx0XHRfLmNsb25lIEBfb3JkZXJlZFN0YXRlc1xuXG5cdGFuaW1hdGluZ0tleXM6IC0+XG5cblx0XHRrZXlzID0gW11cblxuXHRcdGZvciBzdGF0ZU5hbWUsIHN0YXRlIG9mIEBfc3RhdGVzXG5cdFx0XHRjb250aW51ZSBpZiBzdGF0ZU5hbWUgaXMgXCJkZWZhdWx0XCJcblx0XHRcdGtleXMgPSBfLnVuaW9uIGtleXMsIF8ua2V5cyBzdGF0ZVxuXG5cdFx0a2V5c1xuXG5cdHByZXZpb3VzOiAoc3RhdGVzLCBhbmltYXRpb25PcHRpb25zKSAtPlxuXHRcdCMgR28gdG8gcHJldmlvdXMgc3RhdGUgaW4gbGlzdFxuXHRcdHN0YXRlcyA/PSBAc3RhdGVzKClcblx0XHRAc3dpdGNoIFV0aWxzLmFycmF5UHJldihzdGF0ZXMsIEBfY3VycmVudFN0YXRlKSwgYW5pbWF0aW9uT3B0aW9uc1xuXG5cdG5leHQ6ICAtPlxuXHRcdCMgVE9ETzogbWF5YmUgYWRkIGFuaW1hdGlvbk9wdGlvbnNcblx0XHRzdGF0ZXMgPSBVdGlscy5hcnJheUZyb21Bcmd1bWVudHMgYXJndW1lbnRzXG5cblx0XHRpZiBub3Qgc3RhdGVzLmxlbmd0aFxuXHRcdFx0c3RhdGVzID0gQHN0YXRlcygpXG5cblx0XHRAc3dpdGNoIFV0aWxzLmFycmF5TmV4dChzdGF0ZXMsIEBfY3VycmVudFN0YXRlKVxuXG5cblx0bGFzdDogKGFuaW1hdGlvbk9wdGlvbnMpIC0+XG5cdFx0IyBSZXR1cm4gdG8gbGFzdCBzdGF0ZVxuXHRcdEBzd2l0Y2ggXy5sYXN0KEBfcHJldmlvdXNTdGF0ZXMpLCBhbmltYXRpb25PcHRpb25zXG4iLCJmaWx0ZXJGb3JtYXQgPSAodmFsdWUsIHVuaXQpIC0+XG5cdFwiI3tVdGlscy5yb3VuZCB2YWx1ZSwgMn0je3VuaXR9XCJcblx0IyBcIiN7dmFsdWV9I3t1bml0fVwiXG5cbiMgVE9ETzogSWRlYWxseSB0aGVzZSBzaG91bGQgYmUgcmVhZCBvdXQgZnJvbSB0aGUgbGF5ZXIgZGVmaW5lZCBwcm9wZXJ0aWVzXG5fV2Via2l0UHJvcGVydGllcyA9IFtcblx0W1wiYmx1clwiLCBcImJsdXJcIiwgMCwgXCJweFwiXSxcblx0W1wiYnJpZ2h0bmVzc1wiLCBcImJyaWdodG5lc3NcIiwgMTAwLCBcIiVcIl0sXG5cdFtcInNhdHVyYXRlXCIsIFwic2F0dXJhdGVcIiwgMTAwLCBcIiVcIl0sXG5cdFtcImh1ZS1yb3RhdGVcIiwgXCJodWVSb3RhdGVcIiwgMCwgXCJkZWdcIl0sXG5cdFtcImNvbnRyYXN0XCIsIFwiY29udHJhc3RcIiwgMTAwLCBcIiVcIl0sXG5cdFtcImludmVydFwiLCBcImludmVydFwiLCAwLCBcIiVcIl0sXG5cdFtcImdyYXlzY2FsZVwiLCBcImdyYXlzY2FsZVwiLCAwLCBcIiVcIl0sXG5cdFtcInNlcGlhXCIsIFwic2VwaWFcIiwgMCwgXCIlXCJdLFxuXVxuXG5leHBvcnRzLkxheWVyU3R5bGUgPVxuXG5cdHdpZHRoOiAobGF5ZXIpIC0+XG5cdFx0bGF5ZXIud2lkdGggKyBcInB4XCJcblx0XG5cdGhlaWdodDogKGxheWVyKSAtPlxuXHRcdGxheWVyLmhlaWdodCArIFwicHhcIlxuXG5cdGRpc3BsYXk6IChsYXllcikgLT5cblx0XHRpZiBsYXllci52aXNpYmxlIGlzIHRydWVcblx0XHRcdHJldHVybiBcImJsb2NrXCJcblx0XHRyZXR1cm4gXCJub25lXCJcblxuXHRvcGFjaXR5OiAobGF5ZXIpIC0+XG5cdFx0bGF5ZXIub3BhY2l0eVxuXG5cdG92ZXJmbG93OiAobGF5ZXIpIC0+XG5cdFx0aWYgbGF5ZXIuc2Nyb2xsSG9yaXpvbnRhbCBpcyB0cnVlIG9yIGxheWVyLnNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRcdHJldHVybiBcImF1dG9cIlxuXHRcdGlmIGxheWVyLmNsaXAgaXMgdHJ1ZVxuXHRcdFx0cmV0dXJuIFwiaGlkZGVuXCJcblx0XHRyZXR1cm4gXCJ2aXNpYmxlXCJcblxuXHRvdmVyZmxvd1g6IChsYXllcikgLT5cblx0XHRpZiBsYXllci5zY3JvbGxIb3Jpem9udGFsIGlzIHRydWVcblx0XHRcdHJldHVybiBcInNjcm9sbFwiXG5cdFx0aWYgbGF5ZXIuY2xpcCBpcyB0cnVlXG5cdFx0XHRyZXR1cm4gXCJoaWRkZW5cIlxuXHRcdHJldHVybiBcInZpc2libGVcIlxuXG5cdG92ZXJmbG93WTogKGxheWVyKSAtPlxuXHRcdGlmIGxheWVyLnNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRcdHJldHVybiBcInNjcm9sbFwiXG5cdFx0aWYgbGF5ZXIuY2xpcCBpcyB0cnVlXG5cdFx0XHRyZXR1cm4gXCJoaWRkZW5cIlxuXHRcdHJldHVybiBcInZpc2libGVcIlxuXG5cdHpJbmRleDogKGxheWVyKSAtPlxuXHRcdGxheWVyLmluZGV4XG5cblx0d2Via2l0RmlsdGVyOiAobGF5ZXIpIC0+XG5cblx0XHQjIFRoaXMgaXMgbW9zdGx5IGFuIG9wdGltaXphdGlvbiBmb3IgQ2hyb21lLiBJZiB5b3UgcGFzcyBpbiB0aGUgd2Via2l0IGZpbHRlcnNcblx0XHQjIHdpdGggdGhlIGRlZmF1bHRzLCBpdCBzdGlsbCB0YWtlcyBhIHNoaXR0eSByZW5kZXJpbmcgcGF0aC4gU28gSSBjb21wYXJlIHRoZW1cblx0XHQjIGZpcnN0IGFuZCBvbmx5IGFkZCB0aGUgb25lcyB0aGF0IGhhdmUgYSBub24gZGVmYXVsdCB2YWx1ZS5cblxuXHRcdGNzcyA9IFtdXG5cblx0XHRmb3IgW2Nzc05hbWUsIGxheWVyTmFtZSwgZmFsbGJhY2ssIHVuaXRdIGluIF9XZWJraXRQcm9wZXJ0aWVzXG5cdFx0XHRpZiBsYXllcltsYXllck5hbWVdICE9IGZhbGxiYWNrXG5cdFx0XHRcdGNzcy5wdXNoIFwiI3tjc3NOYW1lfSgje2ZpbHRlckZvcm1hdCBsYXllcltsYXllck5hbWVdLCB1bml0fSlcIlxuXG5cdFx0cmV0dXJuIGNzcy5qb2luKFwiIFwiKVxuXG5cdFx0IyBUaGlzIGlzIGhvdyBJIHVzZWQgdG8gZG8gaXQgYmVmb3JlLCBhbmQgaXQgd29ya3Mgd2VsbCBpbiBTYWZhcmlcblx0XHRcblx0XHQjIFwiXG5cdFx0IyBibHVyKCN7ZmlsdGVyRm9ybWF0IGxheWVyLmJsdXIsIFwicHhcIn0pIFxuXHRcdCMgYnJpZ2h0bmVzcygje2ZpbHRlckZvcm1hdCBsYXllci5icmlnaHRuZXNzLCBcIiVcIn0pIFxuXHRcdCMgc2F0dXJhdGUoI3tmaWx0ZXJGb3JtYXQgbGF5ZXIuc2F0dXJhdGUsIFwiJVwifSkgXG5cdFx0IyBodWUtcm90YXRlKCN7ZmlsdGVyRm9ybWF0IGxheWVyLmh1ZVJvdGF0ZSwgXCJkZWdcIn0pIFxuXHRcdCMgY29udHJhc3QoI3tmaWx0ZXJGb3JtYXQgbGF5ZXIuY29udHJhc3QsIFwiJVwifSkgXG5cdFx0IyBpbnZlcnQoI3tmaWx0ZXJGb3JtYXQgbGF5ZXIuaW52ZXJ0LCBcIiVcIn0pIFxuXHRcdCMgZ3JheXNjYWxlKCN7ZmlsdGVyRm9ybWF0IGxheWVyLmdyYXlzY2FsZSwgXCIlXCJ9KSBcblx0XHQjIHNlcGlhKCN7ZmlsdGVyRm9ybWF0IGxheWVyLnNlcGlhLCBcIiVcIn0pXG5cdFx0IyBcIlxuXG5cdHdlYmtpdFRyYW5zZm9ybTogKGxheWVyKSAtPlxuXHRcdCMgVE9ETzogT24gQ2hyb21lIGl0IHNlZW1zIHRoYXQgYWRkaW5nIGFueSBvdGhlciB0cmFuc2Zvcm0gcHJvcGVydHlcblx0XHQjIHRvZ2V0aGVyIHdpdGggYSBibHVyLCBpdCBicmVha3MgdGhlIGJsdXIgYW5kIHBlcmZvcm1hbmNlLiBJJ2xsIGp1c3Rcblx0XHQjIHdhaXQgZm9yIHRoZSBDaHJvbWUgZ3V5cyB0byBmaXggdGhpcyBJIGd1ZXNzLlxuXHRcdFwiXG5cdFx0dHJhbnNsYXRlM2QoI3tsYXllci54fXB4LCN7bGF5ZXIueX1weCwje2xheWVyLnp9cHgpIFxuXHRcdHNjYWxlKCN7bGF5ZXIuc2NhbGV9KVxuXHRcdHNjYWxlM2QoI3tsYXllci5zY2FsZVh9LCN7bGF5ZXIuc2NhbGVZfSwje2xheWVyLnNjYWxlWn0pIFxuXHRcdHJvdGF0ZVgoI3tsYXllci5yb3RhdGlvblh9ZGVnKSBcblx0XHRyb3RhdGVZKCN7bGF5ZXIucm90YXRpb25ZfWRlZykgXG5cdFx0cm90YXRlWigje2xheWVyLnJvdGF0aW9uWn1kZWcpIFxuXHRcdFwiXG5cblx0d2Via2l0VHJhbnNmb3JtT3JpZ2luOiAobGF5ZXIpIC0+XG5cdFx0XCIje2xheWVyLm9yaWdpblggKiAxMDB9JSAje2xheWVyLm9yaWdpblkgKiAxMDB9JVwiXG5cblx0XHQjIFRvZG86IE9yaWdpbiB6IGlzIGluIHBpeGVscy4gSSBuZWVkIHRvIHJlYWQgdXAgb24gdGhpcy5cblx0XHQjIFwiI3tsYXllci5vcmlnaW5YICogMTAwfSUgI3tsYXllci5vcmlnaW5ZICogMTAwfSUgI3tsYXllci5vcmlnaW5aICogMTAwfSVcIlxuXG5cdHBvaW50ZXJFdmVudHM6IChsYXllcikgLT5cblx0XHRpZiBsYXllci5pZ25vcmVFdmVudHNcblx0XHRcdHJldHVybiBcIm5vbmVcIlxuXHRcdFwiYXV0b1wiXG5cblxuXHQjIGNzczogLT5cblx0IyBcdGNzcyA9IHt9XG5cdCMgXHRmb3IgaywgdiBvZiBleHBvcnRzLkxheWVyU3R5bGUgbGF5ZXJcblx0IyBcdFx0aWYgayBpc250IFwiY3NzXCJcblx0IyBcdFx0XHRjc3Nba10gPSB2KClcblx0IyBcdGNzc1xuXG5cblxuXG4iLCIjIFRoaXMgYWxsb3dzIHVzIHRvIHN3aXRjaCBvdXQgdGhlIHVuZGVyc2NvcmUgdXRpbGl0eSBsaWJyYXJ5XG5cbl8gPSByZXF1aXJlIFwibG9kYXNoXCJcblxuXy5zdHIgPSByZXF1aXJlICd1bmRlcnNjb3JlLnN0cmluZydcbl8ubWl4aW4gXy5zdHIuZXhwb3J0cygpXG5cbl8uaXNCb29sID0gKHYpIC0+IHR5cGVvZiB2ID09ICdib29sZWFuJ1xuXG5leHBvcnRzLl8gPSBfXG4iLCIjIFV0aWxzLmxvZyA9IC0+XG4jIFx0Y29uc29sZS5sb2cgYXJndW1lbnRzLmpvaW4gXCIgXCJcblxue199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cblV0aWxzID0ge31cblxuVXRpbHMuc2V0RGVmYXVsdFByb3BlcnRpZXMgPSAob2JqLCBkZWZhdWx0cywgd2Fybj10cnVlKSAtPlxuXG5cdHJlc3VsdCA9IHt9XG5cblx0Zm9yIGssIHYgb2YgZGVmYXVsdHNcblx0XHRpZiBvYmouaGFzT3duUHJvcGVydHkga1xuXHRcdFx0cmVzdWx0W2tdID0gb2JqW2tdXG5cdFx0ZWxzZVxuXHRcdFx0cmVzdWx0W2tdID0gZGVmYXVsdHNba11cblxuXHRpZiB3YXJuXG5cdFx0Zm9yIGssIHYgb2Ygb2JqXG5cdFx0XHRpZiBub3QgZGVmYXVsdHMuaGFzT3duUHJvcGVydHkga1xuXHRcdFx0XHRjb25zb2xlLndhcm4gXCJVdGlscy5zZXREZWZhdWx0UHJvcGVydGllczogZ290IHVuZXhwZWN0ZWQgb3B0aW9uOiAnI3trfSAtPiAje3Z9J1wiLCBvYmpcblxuXHRyZXN1bHRcblxuVXRpbHMudmFsdWVPckRlZmF1bHQgPSAodmFsdWUsIGRlZmF1bHRWYWx1ZSkgLT5cblxuXHRpZiB2YWx1ZSBpbiBbdW5kZWZpbmVkLCBudWxsXVxuXHRcdHZhbHVlID0gZGVmYXVsdFZhbHVlXG5cblx0cmV0dXJuIHZhbHVlXG5cblV0aWxzLmFycmF5VG9PYmplY3QgPSAoYXJyKSAtPlxuXHRvYmogPSB7fVxuXG5cdGZvciBpdGVtIGluIGFyclxuXHRcdG9ialtpdGVtWzBdXSA9IGl0ZW1bMV1cblxuXHRvYmpcblxuVXRpbHMuYXJyYXlOZXh0ID0gKGFyciwgaXRlbSkgLT5cblx0YXJyW2Fyci5pbmRleE9mKGl0ZW0pICsgMV0gb3IgXy5maXJzdCBhcnJcblxuVXRpbHMuYXJyYXlQcmV2ID0gKGFyciwgaXRlbSkgLT5cblx0YXJyW2Fyci5pbmRleE9mKGl0ZW0pIC0gMV0gb3IgXy5sYXN0IGFyclxuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBBTklNQVRJT05cblxuIyBUaGlzIGlzIGEgbGl0dGxlIGhhY2t5LCBidXQgSSB3YW50IHRvIGF2b2lkIHdyYXBwaW5nIHRoZSBmdW5jdGlvblxuIyBpbiBhbm90aGVyIG9uZSBhcyBpdCBnZXRzIGNhbGxlZCBhdCA2MCBmcHMuIFNvIHdlIG1ha2UgaXQgYSBnbG9iYWwuXG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID89IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPz0gKGYpIC0+IFV0aWxzLmRlbGF5IDEvNjAsIGZcblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRJTUUgRlVOQ1RJT05TXG5cbiMgTm90ZTogaW4gRnJhbWVyIDMgd2UgdHJ5IHRvIGtlZXAgYWxsIHRpbWVzIGluIHNlY29uZHNcblxuIyBVc2VkIGJ5IGFuaW1hdGlvbiBlbmdpbmUsIG5lZWRzIHRvIGJlIHZlcnkgcGVyZm9ybWFudFxuVXRpbHMuZ2V0VGltZSA9IC0+IERhdGUubm93KCkgLyAxMDAwXG5cbiMgVGhpcyB3b3JrcyBvbmx5IGluIGNocm9tZSwgYnV0IHdlIG9ubHkgdXNlIGl0IGZvciB0ZXN0aW5nXG4jIGlmIHdpbmRvdy5wZXJmb3JtYW5jZVxuIyBcdFV0aWxzLmdldFRpbWUgPSAtPiBwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDBcblxuVXRpbHMuZGVsYXkgPSAodGltZSwgZikgLT5cblx0dGltZXIgPSBzZXRUaW1lb3V0IGYsIHRpbWUgKiAxMDAwXG5cdCMgd2luZG93Ll9kZWxheVRpbWVycyA/PSBbXVxuXHQjIHdpbmRvdy5fZGVsYXlUaW1lcnMucHVzaCB0aW1lclxuXHRyZXR1cm4gdGltZXJcblx0XG5VdGlscy5pbnRlcnZhbCA9ICh0aW1lLCBmKSAtPlxuXHR0aW1lciA9IHNldEludGVydmFsIGYsIHRpbWUgKiAxMDAwXG5cdCMgd2luZG93Ll9kZWxheUludGVydmFscyA/PSBbXVxuXHQjIHdpbmRvdy5fZGVsYXlJbnRlcnZhbHMucHVzaCB0aW1lclxuXHRyZXR1cm4gdGltZXJcblxuVXRpbHMuZGVib3VuY2UgPSAodGhyZXNob2xkPTAuMSwgZm4sIGltbWVkaWF0ZSkgLT5cblx0dGltZW91dCA9IG51bGxcblx0dGhyZXNob2xkICo9IDEwMDBcblx0KGFyZ3MuLi4pIC0+XG5cdFx0b2JqID0gdGhpc1xuXHRcdGRlbGF5ZWQgPSAtPlxuXHRcdFx0Zm4uYXBwbHkob2JqLCBhcmdzKSB1bmxlc3MgaW1tZWRpYXRlXG5cdFx0XHR0aW1lb3V0ID0gbnVsbFxuXHRcdGlmIHRpbWVvdXRcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KVxuXHRcdGVsc2UgaWYgKGltbWVkaWF0ZSlcblx0XHRcdGZuLmFwcGx5KG9iaiwgYXJncylcblx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCBkZWxheWVkLCB0aHJlc2hvbGRcblxuVXRpbHMudGhyb3R0bGUgPSAoZGVsYXksIGZuKSAtPlxuXHRyZXR1cm4gZm4gaWYgZGVsYXkgaXMgMFxuXHRkZWxheSAqPSAxMDAwXG5cdHRpbWVyID0gZmFsc2Vcblx0cmV0dXJuIC0+XG5cdFx0cmV0dXJuIGlmIHRpbWVyXG5cdFx0dGltZXIgPSB0cnVlXG5cdFx0c2V0VGltZW91dCAoLT4gdGltZXIgPSBmYWxzZSksIGRlbGF5IHVubGVzcyBkZWxheSBpcyAtMVxuXHRcdGZuIGFyZ3VtZW50cy4uLlxuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBIQU5EWSBGVU5DVElPTlNcblxuVXRpbHMucmFuZG9tQ29sb3IgPSAoYWxwaGEgPSAxLjApIC0+XG5cdGMgPSAtPiBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMjU1KVxuXHRcInJnYmEoI3tjKCl9LCAje2MoKX0sICN7YygpfSwgI3thbHBoYX0pXCJcblxuVXRpbHMucmFuZG9tQ2hvaWNlID0gKGFycikgLT5cblx0YXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXVxuXG5VdGlscy5yYW5kb21OdW1iZXIgPSAoYT0wLCBiPTEpIC0+XG5cdCMgUmV0dXJuIGEgcmFuZG9tIG51bWJlciBiZXR3ZWVuIGEgYW5kIGJcblx0VXRpbHMubWFwUmFuZ2UgTWF0aC5yYW5kb20oKSwgMCwgMSwgYSwgYlxuXG5VdGlscy5sYWJlbExheWVyID0gKGxheWVyLCB0ZXh0LCBzdHlsZT17fSkgLT5cblx0XG5cdHN0eWxlID0gXy5leHRlbmRcblx0XHRmb250OiBcIjEwcHgvMWVtIE1lbmxvXCJcblx0XHRsaW5lSGVpZ2h0OiBcIiN7bGF5ZXIuaGVpZ2h0fXB4XCJcblx0XHR0ZXh0QWxpZ246IFwiY2VudGVyXCJcblx0XHRjb2xvcjogXCIjZmZmXCJcblx0LCBzdHlsZVxuXG5cdGxheWVyLnN0eWxlID0gc3R5bGVcblx0bGF5ZXIuaHRtbCA9IHRleHRcblxuVXRpbHMudXVpZCA9IC0+XG5cblx0Y2hhcnMgPSBcIjAxMjM0NTY3ODlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5elwiLnNwbGl0KFwiXCIpXG5cdG91dHB1dCA9IG5ldyBBcnJheSgzNilcblx0cmFuZG9tID0gMFxuXG5cdGZvciBkaWdpdCBpbiBbMS4uMzJdXG5cdFx0cmFuZG9tID0gMHgyMDAwMDAwICsgKE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDApIHwgMCBpZiAocmFuZG9tIDw9IDB4MDIpXG5cdFx0ciA9IHJhbmRvbSAmIDB4ZlxuXHRcdHJhbmRvbSA9IHJhbmRvbSA+PiA0XG5cdFx0b3V0cHV0W2RpZ2l0XSA9IGNoYXJzW2lmIGRpZ2l0ID09IDE5IHRoZW4gKHIgJiAweDMpIHwgMHg4IGVsc2Ugcl1cblxuXHRvdXRwdXQuam9pbiBcIlwiXG5cblV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyA9IChhcmdzKSAtPlxuXG5cdCMgQ29udmVydCBhbiBhcmd1bWVudHMgb2JqZWN0IHRvIGFuIGFycmF5XG5cdFxuXHRpZiBfLmlzQXJyYXkgYXJnc1swXVxuXHRcdHJldHVybiBhcmdzWzBdXG5cdFxuXHRBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCBhcmdzXG5cblV0aWxzLmN5Y2xlID0gLT5cblx0XG5cdCMgUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgY3ljbGVzIHRocm91Z2ggYSBsaXN0IG9mIHZhbHVlcyB3aXRoIGVhY2ggY2FsbC5cblx0XG5cdGFyZ3MgPSBVdGlscy5hcnJheUZyb21Bcmd1bWVudHMgYXJndW1lbnRzXG5cdFxuXHRjdXJyID0gLTFcblx0cmV0dXJuIC0+XG5cdFx0Y3VycisrXG5cdFx0Y3VyciA9IDAgaWYgY3VyciA+PSBhcmdzLmxlbmd0aFxuXHRcdHJldHVybiBhcmdzW2N1cnJdXG5cbiMgQmFja3dhcmRzIGNvbXBhdGliaWxpdHlcblV0aWxzLnRvZ2dsZSA9IFV0aWxzLmN5Y2xlXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIEVOVklST01FTlQgRlVOQ1RJT05TXG5cblV0aWxzLmlzV2ViS2l0ID0gLT5cblx0d2luZG93LldlYktpdENTU01hdHJpeCBpc250IG51bGxcblx0XG5VdGlscy5pc1RvdWNoID0gLT5cblx0d2luZG93Lm9udG91Y2hzdGFydCBpcyBudWxsXG5cblV0aWxzLmlzTW9iaWxlID0gLT5cblx0KC9pcGhvbmV8aXBvZHxhbmRyb2lkfGllfGJsYWNrYmVycnl8ZmVubmVjLykudGVzdCBcXFxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG5VdGlscy5pc0Nocm9tZSA9IC0+XG5cdCgvY2hyb21lLykudGVzdCBcXFxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG5VdGlscy5pc0xvY2FsID0gLT5cblx0VXRpbHMuaXNMb2NhbFVybCB3aW5kb3cubG9jYXRpb24uaHJlZlxuXG5VdGlscy5pc0xvY2FsVXJsID0gKHVybCkgLT5cblx0dXJsWzAuLjZdID09IFwiZmlsZTovL1wiXG5cblV0aWxzLmRldmljZVBpeGVsUmF0aW8gPSAtPlxuXHR3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb1xuXG5VdGlscy5wYXRoSm9pbiA9IC0+XG5cdFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyhhcmd1bWVudHMpLmpvaW4oXCIvXCIpXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBNQVRIIEZVTkNUSU9OU1xuXHRcdFxuVXRpbHMucm91bmQgPSAodmFsdWUsIGRlY2ltYWxzKSAtPlxuXHRkID0gTWF0aC5wb3cgMTAsIGRlY2ltYWxzXG5cdE1hdGgucm91bmQodmFsdWUgKiBkKSAvIGRcblxuIyBUYWtlbiBmcm9tIGh0dHA6Ly9qc2ZpZGRsZS5uZXQvWHo0NjQvNy9cbiMgVXNlZCBieSBhbmltYXRpb24gZW5naW5lLCBuZWVkcyB0byBiZSB2ZXJ5IHBlcmZvcm1hbnRcblV0aWxzLm1hcFJhbmdlID0gKHZhbHVlLCBmcm9tTG93LCBmcm9tSGlnaCwgdG9Mb3csIHRvSGlnaCkgLT5cblx0dG9Mb3cgKyAoKCh2YWx1ZSAtIGZyb21Mb3cpIC8gKGZyb21IaWdoIC0gZnJvbUxvdykpICogKHRvSGlnaCAtIHRvTG93KSlcblxuIyBLaW5kIG9mIHNpbWlsYXIgYXMgYWJvdmUgYnV0IHdpdGggYSBiZXR0ZXIgc3ludGF4IGFuZCBhIGxpbWl0aW5nIG9wdGlvblxuVXRpbHMubW9kdWxhdGUgPSAodmFsdWUsIHJhbmdlQSwgcmFuZ2VCLCBsaW1pdD1mYWxzZSkgLT5cblx0XG5cdFtmcm9tTG93LCBmcm9tSGlnaF0gPSByYW5nZUFcblx0W3RvTG93LCB0b0hpZ2hdID0gcmFuZ2VCXG5cdFxuXHRyZXN1bHQgPSB0b0xvdyArICgoKHZhbHVlIC0gZnJvbUxvdykgLyAoZnJvbUhpZ2ggLSBmcm9tTG93KSkgKiAodG9IaWdoIC0gdG9Mb3cpKVxuXG5cdGlmIGxpbWl0IGlzIHRydWVcblx0XHRyZXR1cm4gdG9Mb3cgaWYgcmVzdWx0IDwgdG9Mb3dcblx0XHRyZXR1cm4gdG9IaWdoIGlmIHJlc3VsdCA+IHRvSGlnaFxuXG5cdHJlc3VsdFxuXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFNUUklORyBGVU5DVElPTlNcblxuVXRpbHMucGFyc2VGdW5jdGlvbiA9IChzdHIpIC0+XG5cblx0cmVzdWx0ID0ge25hbWU6IFwiXCIsIGFyZ3M6IFtdfVxuXG5cdGlmIF8uZW5kc1dpdGggc3RyLCBcIilcIlxuXHRcdHJlc3VsdC5uYW1lID0gc3RyLnNwbGl0KFwiKFwiKVswXVxuXHRcdHJlc3VsdC5hcmdzID0gc3RyLnNwbGl0KFwiKFwiKVsxXS5zcGxpdChcIixcIikubWFwIChhKSAtPiBfLnRyaW0oXy5ydHJpbShhLCBcIilcIikpXG5cdGVsc2Vcblx0XHRyZXN1bHQubmFtZSA9IHN0clxuXG5cdHJldHVybiByZXN1bHRcblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIERPTSBGVU5DVElPTlNcblxuX19kb21Db21wbGV0ZSA9IFtdXG5cbmlmIGRvY3VtZW50P1xuXHRkb2N1bWVudC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoZXZlbnQpID0+XG5cdFx0aWYgZG9jdW1lbnQucmVhZHlTdGF0ZSBpcyBcImNvbXBsZXRlXCJcblx0XHRcdHdoaWxlIF9fZG9tQ29tcGxldGUubGVuZ3RoXG5cdFx0XHRcdGYgPSBfX2RvbUNvbXBsZXRlLnNoaWZ0KCkoKVxuXG5VdGlscy5kb21Db21wbGV0ZSA9IChmKSAtPlxuXHRpZiBkb2N1bWVudC5yZWFkeVN0YXRlIGlzIFwiY29tcGxldGVcIlxuXHRcdGYoKVxuXHRlbHNlXG5cdFx0X19kb21Db21wbGV0ZS5wdXNoIGZcblxuVXRpbHMuZG9tQ29tcGxldGVDYW5jZWwgPSAoZikgLT5cblx0X19kb21Db21wbGV0ZSA9IF8ud2l0aG91dCBfX2RvbUNvbXBsZXRlLCBmXG5cblV0aWxzLmRvbUxvYWRTY3JpcHQgPSAodXJsLCBjYWxsYmFjaykgLT5cblx0XG5cdHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgXCJzY3JpcHRcIlxuXHRzY3JpcHQudHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCJcblx0c2NyaXB0LnNyYyA9IHVybFxuXHRcblx0c2NyaXB0Lm9ubG9hZCA9IGNhbGxiYWNrXG5cdFxuXHRoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdXG5cdGhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XG5cdFxuXHRzY3JpcHRcblxuVXRpbHMuZG9tTG9hZERhdGEgPSAocGF0aCwgY2FsbGJhY2spIC0+XG5cblx0cmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cblx0IyByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIgXCJwcm9ncmVzc1wiLCB1cGRhdGVQcm9ncmVzcywgZmFsc2Vcblx0IyByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIgXCJhYm9ydFwiLCB0cmFuc2ZlckNhbmNlbGVkLCBmYWxzZVxuXHRcblx0cmVxdWVzdC5hZGRFdmVudExpc3RlbmVyIFwibG9hZFwiLCAtPlxuXHRcdGNhbGxiYWNrIG51bGwsIHJlcXVlc3QucmVzcG9uc2VUZXh0XG5cdCwgZmFsc2Vcblx0XG5cdHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lciBcImVycm9yXCIsIC0+XG5cdFx0Y2FsbGJhY2sgdHJ1ZSwgbnVsbFxuXHQsIGZhbHNlXG5cblx0cmVxdWVzdC5vcGVuIFwiR0VUXCIsIHBhdGgsIHRydWVcblx0cmVxdWVzdC5zZW5kIG51bGxcblxuVXRpbHMuZG9tTG9hZEpTT04gPSAocGF0aCwgY2FsbGJhY2spIC0+XG5cdFV0aWxzLmRvbUxvYWREYXRhIHBhdGgsIChlcnIsIGRhdGEpIC0+XG5cdFx0Y2FsbGJhY2sgZXJyLCBKU09OLnBhcnNlIGRhdGFcblxuVXRpbHMuZG9tTG9hZERhdGFTeW5jID0gKHBhdGgpIC0+XG5cblx0cmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cdHJlcXVlc3Qub3BlbiBcIkdFVFwiLCBwYXRoLCBmYWxzZVxuXG5cdCMgVGhpcyBkb2VzIG5vdCB3b3JrIGluIFNhZmFyaSwgc2VlIGJlbG93XG5cdHRyeVxuXHRcdHJlcXVlc3Quc2VuZCBudWxsXG5cdGNhdGNoIGVcblx0XHRjb25zb2xlLmRlYnVnIFwiWE1MSHR0cFJlcXVlc3QuZXJyb3JcIiwgZVxuXG5cdGRhdGEgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dFxuXG5cdCMgQmVjYXVzZSBJIGNhbid0IGNhdGNoIHRoZSBhY3R1YWwgNDA0IHdpdGggU2FmYXJpLCBJIGp1c3QgYXNzdW1lIHNvbWV0aGluZ1xuXHQjIHdlbnQgd3JvbmcgaWYgdGhlcmUgaXMgbm8gdGV4dCBkYXRhIHJldHVybmVkIGZyb20gdGhlIHJlcXVlc3QuXG5cdGlmIG5vdCBkYXRhXG5cdFx0dGhyb3cgRXJyb3IgXCJVdGlscy5kb21Mb2FkRGF0YVN5bmM6IG5vIGRhdGEgd2FzIGxvYWRlZCAodXJsIG5vdCBmb3VuZD8pXCJcblxuXHRyZXR1cm4gcmVxdWVzdC5yZXNwb25zZVRleHRcblxuVXRpbHMuZG9tTG9hZEpTT05TeW5jID0gKHBhdGgpIC0+XG5cdEpTT04ucGFyc2UgVXRpbHMuZG9tTG9hZERhdGFTeW5jIHBhdGhcblxuVXRpbHMuZG9tTG9hZFNjcmlwdFN5bmMgPSAocGF0aCkgLT5cblx0c2NyaXB0RGF0YSA9IFV0aWxzLmRvbUxvYWREYXRhU3luYyBwYXRoXG5cdGV2YWwgc2NyaXB0RGF0YVxuXHRzY3JpcHREYXRhXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBHRU9NRVJUWSBGVU5DVElPTlNcblxuIyBQb2ludFxuXG5VdGlscy5wb2ludE1pbiA9IC0+XG5cdHBvaW50cyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblx0cG9pbnQgPSBcblx0XHR4OiBfLm1pbiBwb2ludC5tYXAgKHNpemUpIC0+IHNpemUueFxuXHRcdHk6IF8ubWluIHBvaW50Lm1hcCAoc2l6ZSkgLT4gc2l6ZS55XG5cblV0aWxzLnBvaW50TWF4ID0gLT5cblx0cG9pbnRzID0gVXRpbHMuYXJyYXlGcm9tQXJndW1lbnRzIGFyZ3VtZW50c1xuXHRwb2ludCA9IFxuXHRcdHg6IF8ubWF4IHBvaW50Lm1hcCAoc2l6ZSkgLT4gc2l6ZS54XG5cdFx0eTogXy5tYXggcG9pbnQubWFwIChzaXplKSAtPiBzaXplLnlcblxuVXRpbHMucG9pbnREaXN0YW5jZSA9IChwb2ludEEsIHBvaW50QikgLT5cblx0ZGlzdGFuY2UgPVxuXHRcdHg6IE1hdGguYWJzKHBvaW50Qi54IC0gcG9pbnRBLngpXG5cdFx0eTogTWF0aC5hYnMocG9pbnRCLnkgLSBwb2ludEEueSlcblxuVXRpbHMucG9pbnRJbnZlcnQgPSAocG9pbnQpIC0+XG5cdHBvaW50ID1cblx0XHR4OiAwIC0gcG9pbnQueFxuXHRcdHk6IDAgLSBwb2ludC55XG5cblV0aWxzLnBvaW50VG90YWwgPSAocG9pbnQpIC0+XG5cdHBvaW50LnggKyBwb2ludC55XG5cblV0aWxzLnBvaW50QWJzID0gKHBvaW50KSAtPlxuXHRwb2ludCA9XG5cdFx0eDogTWF0aC5hYnMgcG9pbnQueFxuXHRcdHk6IE1hdGguYWJzIHBvaW50LnlcblxuVXRpbHMucG9pbnRJbkZyYW1lID0gKHBvaW50LCBmcmFtZSkgLT5cblx0cmV0dXJuIGZhbHNlICBpZiBwb2ludC54IDwgZnJhbWUubWluWCBvciBwb2ludC54ID4gZnJhbWUubWF4WFxuXHRyZXR1cm4gZmFsc2UgIGlmIHBvaW50LnkgPCBmcmFtZS5taW5ZIG9yIHBvaW50LnkgPiBmcmFtZS5tYXhZXG5cdHRydWVcblxuIyBTaXplXG5cblV0aWxzLnNpemVNaW4gPSAtPlxuXHRzaXplcyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblx0c2l6ZSAgPVxuXHRcdHdpZHRoOiAgXy5taW4gc2l6ZXMubWFwIChzaXplKSAtPiBzaXplLndpZHRoXG5cdFx0aGVpZ2h0OiBfLm1pbiBzaXplcy5tYXAgKHNpemUpIC0+IHNpemUuaGVpZ2h0XG5cblV0aWxzLnNpemVNYXggPSAtPlxuXHRzaXplcyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblx0c2l6ZSAgPVxuXHRcdHdpZHRoOiAgXy5tYXggc2l6ZXMubWFwIChzaXplKSAtPiBzaXplLndpZHRoXG5cdFx0aGVpZ2h0OiBfLm1heCBzaXplcy5tYXAgKHNpemUpIC0+IHNpemUuaGVpZ2h0XG5cbiMgRnJhbWVzXG5cbiMgbWluIG1pZCBtYXggKiB4LCB5XG5cblV0aWxzLmZyYW1lR2V0TWluWCA9IChmcmFtZSkgLT4gZnJhbWUueFxuVXRpbHMuZnJhbWVTZXRNaW5YID0gKGZyYW1lLCB2YWx1ZSkgLT4gZnJhbWUueCA9IHZhbHVlXG5cblV0aWxzLmZyYW1lR2V0TWlkWCA9IChmcmFtZSkgLT4gXG5cdGlmIGZyYW1lLndpZHRoIGlzIDAgdGhlbiAwIGVsc2UgZnJhbWUueCArIChmcmFtZS53aWR0aCAvIDIuMClcblV0aWxzLmZyYW1lU2V0TWlkWCA9IChmcmFtZSwgdmFsdWUpIC0+XG5cdGZyYW1lLnggPSBpZiBmcmFtZS53aWR0aCBpcyAwIHRoZW4gMCBlbHNlIHZhbHVlIC0gKGZyYW1lLndpZHRoIC8gMi4wKVxuXG5VdGlscy5mcmFtZUdldE1heFggPSAoZnJhbWUpIC0+IFxuXHRpZiBmcmFtZS53aWR0aCBpcyAwIHRoZW4gMCBlbHNlIGZyYW1lLnggKyBmcmFtZS53aWR0aFxuVXRpbHMuZnJhbWVTZXRNYXhYID0gKGZyYW1lLCB2YWx1ZSkgLT5cblx0ZnJhbWUueCA9IGlmIGZyYW1lLndpZHRoIGlzIDAgdGhlbiAwIGVsc2UgdmFsdWUgLSBmcmFtZS53aWR0aFxuXG5VdGlscy5mcmFtZUdldE1pblkgPSAoZnJhbWUpIC0+IGZyYW1lLnlcblV0aWxzLmZyYW1lU2V0TWluWSA9IChmcmFtZSwgdmFsdWUpIC0+IGZyYW1lLnkgPSB2YWx1ZVxuXG5VdGlscy5mcmFtZUdldE1pZFkgPSAoZnJhbWUpIC0+IFxuXHRpZiBmcmFtZS5oZWlnaHQgaXMgMCB0aGVuIDAgZWxzZSBmcmFtZS55ICsgKGZyYW1lLmhlaWdodCAvIDIuMClcblV0aWxzLmZyYW1lU2V0TWlkWSA9IChmcmFtZSwgdmFsdWUpIC0+XG5cdGZyYW1lLnkgPSBpZiBmcmFtZS5oZWlnaHQgaXMgMCB0aGVuIDAgZWxzZSB2YWx1ZSAtIChmcmFtZS5oZWlnaHQgLyAyLjApXG5cblV0aWxzLmZyYW1lR2V0TWF4WSA9IChmcmFtZSkgLT4gXG5cdGlmIGZyYW1lLmhlaWdodCBpcyAwIHRoZW4gMCBlbHNlIGZyYW1lLnkgKyBmcmFtZS5oZWlnaHRcblV0aWxzLmZyYW1lU2V0TWF4WSA9IChmcmFtZSwgdmFsdWUpIC0+XG5cdGZyYW1lLnkgPSBpZiBmcmFtZS5oZWlnaHQgaXMgMCB0aGVuIDAgZWxzZSB2YWx1ZSAtIGZyYW1lLmhlaWdodFxuXG5cblV0aWxzLmZyYW1lU2l6ZSA9IChmcmFtZSkgLT5cblx0c2l6ZSA9XG5cdFx0d2lkdGg6IGZyYW1lLndpZHRoXG5cdFx0aGVpZ2h0OiBmcmFtZS5oZWlnaHRcblxuVXRpbHMuZnJhbWVQb2ludCA9IChmcmFtZSkgLT5cblx0cG9pbnQgPVxuXHRcdHg6IGZyYW1lLnhcblx0XHR5OiBmcmFtZS55XG5cblV0aWxzLmZyYW1lTWVyZ2UgPSAtPlxuXG5cdCMgUmV0dXJuIGEgZnJhbWUgdGhhdCBmaXRzIGFsbCB0aGUgaW5wdXQgZnJhbWVzXG5cblx0ZnJhbWVzID0gVXRpbHMuYXJyYXlGcm9tQXJndW1lbnRzIGFyZ3VtZW50c1xuXG5cdGZyYW1lID1cblx0XHR4OiBfLm1pbiBmcmFtZXMubWFwIFV0aWxzLmZyYW1lR2V0TWluWFxuXHRcdHk6IF8ubWluIGZyYW1lcy5tYXAgVXRpbHMuZnJhbWVHZXRNaW5ZXG5cblx0ZnJhbWUud2lkdGggID0gXy5tYXgoZnJhbWVzLm1hcCBVdGlscy5mcmFtZUdldE1heFgpIC0gZnJhbWUueFxuXHRmcmFtZS5oZWlnaHQgPSBfLm1heChmcmFtZXMubWFwIFV0aWxzLmZyYW1lR2V0TWF4WSkgLSBmcmFtZS55XG5cblx0ZnJhbWVcblxuIyBDb29yZGluYXRlIHN5c3RlbVxuXG5VdGlscy5jb252ZXJ0UG9pbnQgPSAoaW5wdXQsIGxheWVyQSwgbGF5ZXJCKSAtPlxuXG5cdCMgQ29udmVydCBhIHBvaW50IGJldHdlZW4gdHdvIGxheWVyIGNvb3JkaW5hdGUgc3lzdGVtc1xuXG5cdHBvaW50ID0ge31cblxuXHRmb3IgayBpbiBbXCJ4XCIsIFwieVwiLCBcIndpZHRoXCIsIFwiaGVpZ2h0XCJdXG5cdFx0cG9pbnRba10gPSBpbnB1dFtrXVxuXG5cdHN1cGVyTGF5ZXJzQSA9IGxheWVyQT8uc3VwZXJMYXllcnMoKSBvciBbXVxuXHRzdXBlckxheWVyc0IgPSBsYXllckI/LnN1cGVyTGF5ZXJzKCkgb3IgW11cblx0XG5cdHN1cGVyTGF5ZXJzQi5wdXNoIGxheWVyQiBpZiBsYXllckJcblx0XG5cdGZvciBsYXllciBpbiBzdXBlckxheWVyc0Fcblx0XHRwb2ludC54ICs9IGxheWVyLnggLSBsYXllci5zY3JvbGxGcmFtZS54XG5cdFx0cG9pbnQueSArPSBsYXllci55IC0gbGF5ZXIuc2Nyb2xsRnJhbWUueVxuXG5cdGZvciBsYXllciBpbiBzdXBlckxheWVyc0Jcblx0XHRwb2ludC54IC09IGxheWVyLnggKyBsYXllci5zY3JvbGxGcmFtZS54XG5cdFx0cG9pbnQueSAtPSBsYXllci55ICsgbGF5ZXIuc2Nyb2xsRnJhbWUueVxuXHRcblx0cmV0dXJuIHBvaW50XG5cbl8uZXh0ZW5kIGV4cG9ydHMsIFV0aWxzXG5cbiIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8qKlxuICogQGxpY2Vuc2VcbiAqIExvLURhc2ggMi40LjIgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gLW8gLi9kaXN0L2xvZGFzaC5qc2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuOyhmdW5jdGlvbigpIHtcblxuICAvKiogVXNlZCBhcyBhIHNhZmUgcmVmZXJlbmNlIGZvciBgdW5kZWZpbmVkYCBpbiBwcmUgRVM1IGVudmlyb25tZW50cyAqL1xuICB2YXIgdW5kZWZpbmVkO1xuXG4gIC8qKiBVc2VkIHRvIHBvb2wgYXJyYXlzIGFuZCBvYmplY3RzIHVzZWQgaW50ZXJuYWxseSAqL1xuICB2YXIgYXJyYXlQb29sID0gW10sXG4gICAgICBvYmplY3RQb29sID0gW107XG5cbiAgLyoqIFVzZWQgdG8gZ2VuZXJhdGUgdW5pcXVlIElEcyAqL1xuICB2YXIgaWRDb3VudGVyID0gMDtcblxuICAvKiogVXNlZCB0byBwcmVmaXgga2V5cyB0byBhdm9pZCBpc3N1ZXMgd2l0aCBgX19wcm90b19fYCBhbmQgcHJvcGVydGllcyBvbiBgT2JqZWN0LnByb3RvdHlwZWAgKi9cbiAgdmFyIGtleVByZWZpeCA9ICtuZXcgRGF0ZSArICcnO1xuXG4gIC8qKiBVc2VkIGFzIHRoZSBzaXplIHdoZW4gb3B0aW1pemF0aW9ucyBhcmUgZW5hYmxlZCBmb3IgbGFyZ2UgYXJyYXlzICovXG4gIHZhciBsYXJnZUFycmF5U2l6ZSA9IDc1O1xuXG4gIC8qKiBVc2VkIGFzIHRoZSBtYXggc2l6ZSBvZiB0aGUgYGFycmF5UG9vbGAgYW5kIGBvYmplY3RQb29sYCAqL1xuICB2YXIgbWF4UG9vbFNpemUgPSA0MDtcblxuICAvKiogVXNlZCB0byBkZXRlY3QgYW5kIHRlc3Qgd2hpdGVzcGFjZSAqL1xuICB2YXIgd2hpdGVzcGFjZSA9IChcbiAgICAvLyB3aGl0ZXNwYWNlXG4gICAgJyBcXHRcXHgwQlxcZlxceEEwXFx1ZmVmZicgK1xuXG4gICAgLy8gbGluZSB0ZXJtaW5hdG9yc1xuICAgICdcXG5cXHJcXHUyMDI4XFx1MjAyOScgK1xuXG4gICAgLy8gdW5pY29kZSBjYXRlZ29yeSBcIlpzXCIgc3BhY2Ugc2VwYXJhdG9yc1xuICAgICdcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwJ1xuICApO1xuXG4gIC8qKiBVc2VkIHRvIG1hdGNoIGVtcHR5IHN0cmluZyBsaXRlcmFscyBpbiBjb21waWxlZCB0ZW1wbGF0ZSBzb3VyY2UgKi9cbiAgdmFyIHJlRW1wdHlTdHJpbmdMZWFkaW5nID0gL1xcYl9fcCBcXCs9ICcnOy9nLFxuICAgICAgcmVFbXB0eVN0cmluZ01pZGRsZSA9IC9cXGIoX19wIFxcKz0pICcnIFxcKy9nLFxuICAgICAgcmVFbXB0eVN0cmluZ1RyYWlsaW5nID0gLyhfX2VcXCguKj9cXCl8XFxiX190XFwpKSBcXCtcXG4nJzsvZztcblxuICAvKipcbiAgICogVXNlZCB0byBtYXRjaCBFUzYgdGVtcGxhdGUgZGVsaW1pdGVyc1xuICAgKiBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1saXRlcmFscy1zdHJpbmctbGl0ZXJhbHNcbiAgICovXG4gIHZhciByZUVzVGVtcGxhdGUgPSAvXFwkXFx7KFteXFxcXH1dKig/OlxcXFwuW15cXFxcfV0qKSopXFx9L2c7XG5cbiAgLyoqIFVzZWQgdG8gbWF0Y2ggcmVnZXhwIGZsYWdzIGZyb20gdGhlaXIgY29lcmNlZCBzdHJpbmcgdmFsdWVzICovXG4gIHZhciByZUZsYWdzID0gL1xcdyokLztcblxuICAvKiogVXNlZCB0byBkZXRlY3RlZCBuYW1lZCBmdW5jdGlvbnMgKi9cbiAgdmFyIHJlRnVuY05hbWUgPSAvXlxccypmdW5jdGlvblsgXFxuXFxyXFx0XStcXHcvO1xuXG4gIC8qKiBVc2VkIHRvIG1hdGNoIFwiaW50ZXJwb2xhdGVcIiB0ZW1wbGF0ZSBkZWxpbWl0ZXJzICovXG4gIHZhciByZUludGVycG9sYXRlID0gLzwlPShbXFxzXFxTXSs/KSU+L2c7XG5cbiAgLyoqIFVzZWQgdG8gbWF0Y2ggbGVhZGluZyB3aGl0ZXNwYWNlIGFuZCB6ZXJvcyB0byBiZSByZW1vdmVkICovXG4gIHZhciByZUxlYWRpbmdTcGFjZXNBbmRaZXJvcyA9IFJlZ0V4cCgnXlsnICsgd2hpdGVzcGFjZSArICddKjArKD89LiQpJyk7XG5cbiAgLyoqIFVzZWQgdG8gZW5zdXJlIGNhcHR1cmluZyBvcmRlciBvZiB0ZW1wbGF0ZSBkZWxpbWl0ZXJzICovXG4gIHZhciByZU5vTWF0Y2ggPSAvKCReKS87XG5cbiAgLyoqIFVzZWQgdG8gZGV0ZWN0IGZ1bmN0aW9ucyBjb250YWluaW5nIGEgYHRoaXNgIHJlZmVyZW5jZSAqL1xuICB2YXIgcmVUaGlzID0gL1xcYnRoaXNcXGIvO1xuXG4gIC8qKiBVc2VkIHRvIG1hdGNoIHVuZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGNvbXBpbGVkIHN0cmluZyBsaXRlcmFscyAqL1xuICB2YXIgcmVVbmVzY2FwZWRTdHJpbmcgPSAvWydcXG5cXHJcXHRcXHUyMDI4XFx1MjAyOVxcXFxdL2c7XG5cbiAgLyoqIFVzZWQgdG8gYXNzaWduIGRlZmF1bHQgYGNvbnRleHRgIG9iamVjdCBwcm9wZXJ0aWVzICovXG4gIHZhciBjb250ZXh0UHJvcHMgPSBbXG4gICAgJ0FycmF5JywgJ0Jvb2xlYW4nLCAnRGF0ZScsICdGdW5jdGlvbicsICdNYXRoJywgJ051bWJlcicsICdPYmplY3QnLFxuICAgICdSZWdFeHAnLCAnU3RyaW5nJywgJ18nLCAnYXR0YWNoRXZlbnQnLCAnY2xlYXJUaW1lb3V0JywgJ2lzRmluaXRlJywgJ2lzTmFOJyxcbiAgICAncGFyc2VJbnQnLCAnc2V0VGltZW91dCdcbiAgXTtcblxuICAvKiogVXNlZCB0byBtYWtlIHRlbXBsYXRlIHNvdXJjZVVSTHMgZWFzaWVyIHRvIGlkZW50aWZ5ICovXG4gIHZhciB0ZW1wbGF0ZUNvdW50ZXIgPSAwO1xuXG4gIC8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgc2hvcnRjdXRzICovXG4gIHZhciBhcmdzQ2xhc3MgPSAnW29iamVjdCBBcmd1bWVudHNdJyxcbiAgICAgIGFycmF5Q2xhc3MgPSAnW29iamVjdCBBcnJheV0nLFxuICAgICAgYm9vbENsYXNzID0gJ1tvYmplY3QgQm9vbGVhbl0nLFxuICAgICAgZGF0ZUNsYXNzID0gJ1tvYmplY3QgRGF0ZV0nLFxuICAgICAgZnVuY0NsYXNzID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICAgIG51bWJlckNsYXNzID0gJ1tvYmplY3QgTnVtYmVyXScsXG4gICAgICBvYmplY3RDbGFzcyA9ICdbb2JqZWN0IE9iamVjdF0nLFxuICAgICAgcmVnZXhwQ2xhc3MgPSAnW29iamVjdCBSZWdFeHBdJyxcbiAgICAgIHN0cmluZ0NsYXNzID0gJ1tvYmplY3QgU3RyaW5nXSc7XG5cbiAgLyoqIFVzZWQgdG8gaWRlbnRpZnkgb2JqZWN0IGNsYXNzaWZpY2F0aW9ucyB0aGF0IGBfLmNsb25lYCBzdXBwb3J0cyAqL1xuICB2YXIgY2xvbmVhYmxlQ2xhc3NlcyA9IHt9O1xuICBjbG9uZWFibGVDbGFzc2VzW2Z1bmNDbGFzc10gPSBmYWxzZTtcbiAgY2xvbmVhYmxlQ2xhc3Nlc1thcmdzQ2xhc3NdID0gY2xvbmVhYmxlQ2xhc3Nlc1thcnJheUNsYXNzXSA9XG4gIGNsb25lYWJsZUNsYXNzZXNbYm9vbENsYXNzXSA9IGNsb25lYWJsZUNsYXNzZXNbZGF0ZUNsYXNzXSA9XG4gIGNsb25lYWJsZUNsYXNzZXNbbnVtYmVyQ2xhc3NdID0gY2xvbmVhYmxlQ2xhc3Nlc1tvYmplY3RDbGFzc10gPVxuICBjbG9uZWFibGVDbGFzc2VzW3JlZ2V4cENsYXNzXSA9IGNsb25lYWJsZUNsYXNzZXNbc3RyaW5nQ2xhc3NdID0gdHJ1ZTtcblxuICAvKiogVXNlZCBhcyBhbiBpbnRlcm5hbCBgXy5kZWJvdW5jZWAgb3B0aW9ucyBvYmplY3QgKi9cbiAgdmFyIGRlYm91bmNlT3B0aW9ucyA9IHtcbiAgICAnbGVhZGluZyc6IGZhbHNlLFxuICAgICdtYXhXYWl0JzogMCxcbiAgICAndHJhaWxpbmcnOiBmYWxzZVxuICB9O1xuXG4gIC8qKiBVc2VkIGFzIHRoZSBwcm9wZXJ0eSBkZXNjcmlwdG9yIGZvciBgX19iaW5kRGF0YV9fYCAqL1xuICB2YXIgZGVzY3JpcHRvciA9IHtcbiAgICAnY29uZmlndXJhYmxlJzogZmFsc2UsXG4gICAgJ2VudW1lcmFibGUnOiBmYWxzZSxcbiAgICAndmFsdWUnOiBudWxsLFxuICAgICd3cml0YWJsZSc6IGZhbHNlXG4gIH07XG5cbiAgLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgT2JqZWN0ICovXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnYm9vbGVhbic6IGZhbHNlLFxuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWUsXG4gICAgJ251bWJlcic6IGZhbHNlLFxuICAgICdzdHJpbmcnOiBmYWxzZSxcbiAgICAndW5kZWZpbmVkJzogZmFsc2VcbiAgfTtcblxuICAvKiogVXNlZCB0byBlc2NhcGUgY2hhcmFjdGVycyBmb3IgaW5jbHVzaW9uIGluIGNvbXBpbGVkIHN0cmluZyBsaXRlcmFscyAqL1xuICB2YXIgc3RyaW5nRXNjYXBlcyA9IHtcbiAgICAnXFxcXCc6ICdcXFxcJyxcbiAgICBcIidcIjogXCInXCIsXG4gICAgJ1xcbic6ICduJyxcbiAgICAnXFxyJzogJ3InLFxuICAgICdcXHQnOiAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIC8qKiBVc2VkIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBnbG9iYWwgb2JqZWN0ICovXG4gIHZhciByb290ID0gKG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdykgfHwgdGhpcztcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGV4cG9ydHNgICovXG4gIHZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG5cbiAgLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBtb2R1bGVgICovXG4gIHZhciBmcmVlTW9kdWxlID0gb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXG4gIC8qKiBEZXRlY3QgdGhlIHBvcHVsYXIgQ29tbW9uSlMgZXh0ZW5zaW9uIGBtb2R1bGUuZXhwb3J0c2AgKi9cbiAgdmFyIG1vZHVsZUV4cG9ydHMgPSBmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMgJiYgZnJlZUV4cG9ydHM7XG5cbiAgLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcyBvciBCcm93c2VyaWZpZWQgY29kZSBhbmQgdXNlIGl0IGFzIGByb290YCAqL1xuICB2YXIgZnJlZUdsb2JhbCA9IG9iamVjdFR5cGVzW3R5cGVvZiBnbG9iYWxdICYmIGdsb2JhbDtcbiAgaWYgKGZyZWVHbG9iYWwgJiYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSkge1xuICAgIHJvb3QgPSBmcmVlR2xvYmFsO1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmluZGV4T2ZgIHdpdGhvdXQgc3VwcG9ydCBmb3IgYmluYXJ5IHNlYXJjaGVzXG4gICAqIG9yIGBmcm9tSW5kZXhgIGNvbnN0cmFpbnRzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gc2VhcmNoLlxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZWFyY2ggZm9yLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW2Zyb21JbmRleD0wXSBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIHZhbHVlIG9yIGAtMWAuXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlSW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleCkge1xuICAgIHZhciBpbmRleCA9IChmcm9tSW5kZXggfHwgMCkgLSAxLFxuICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgaWYgKGFycmF5W2luZGV4XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICAvKipcbiAgICogQW4gaW1wbGVtZW50YXRpb24gb2YgYF8uY29udGFpbnNgIGZvciBjYWNoZSBvYmplY3RzIHRoYXQgbWltaWNzIHRoZSByZXR1cm5cbiAgICogc2lnbmF0dXJlIG9mIGBfLmluZGV4T2ZgIGJ5IHJldHVybmluZyBgMGAgaWYgdGhlIHZhbHVlIGlzIGZvdW5kLCBlbHNlIGAtMWAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjYWNoZSBUaGUgY2FjaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNlYXJjaCBmb3IuXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgYDBgIGlmIGB2YWx1ZWAgaXMgZm91bmQsIGVsc2UgYC0xYC5cbiAgICovXG4gIGZ1bmN0aW9uIGNhY2hlSW5kZXhPZihjYWNoZSwgdmFsdWUpIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICBjYWNoZSA9IGNhY2hlLmNhY2hlO1xuXG4gICAgaWYgKHR5cGUgPT0gJ2Jvb2xlYW4nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBjYWNoZVt2YWx1ZV0gPyAwIDogLTE7XG4gICAgfVxuICAgIGlmICh0eXBlICE9ICdudW1iZXInICYmIHR5cGUgIT0gJ3N0cmluZycpIHtcbiAgICAgIHR5cGUgPSAnb2JqZWN0JztcbiAgICB9XG4gICAgdmFyIGtleSA9IHR5cGUgPT0gJ251bWJlcicgPyB2YWx1ZSA6IGtleVByZWZpeCArIHZhbHVlO1xuICAgIGNhY2hlID0gKGNhY2hlID0gY2FjaGVbdHlwZV0pICYmIGNhY2hlW2tleV07XG5cbiAgICByZXR1cm4gdHlwZSA9PSAnb2JqZWN0J1xuICAgICAgPyAoY2FjaGUgJiYgYmFzZUluZGV4T2YoY2FjaGUsIHZhbHVlKSA+IC0xID8gMCA6IC0xKVxuICAgICAgOiAoY2FjaGUgPyAwIDogLTEpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBnaXZlbiB2YWx1ZSB0byB0aGUgY29ycmVzcG9uZGluZyBjYWNoZSBvYmplY3QuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGFkZCB0byB0aGUgY2FjaGUuXG4gICAqL1xuICBmdW5jdGlvbiBjYWNoZVB1c2godmFsdWUpIHtcbiAgICB2YXIgY2FjaGUgPSB0aGlzLmNhY2hlLFxuICAgICAgICB0eXBlID0gdHlwZW9mIHZhbHVlO1xuXG4gICAgaWYgKHR5cGUgPT0gJ2Jvb2xlYW4nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIGNhY2hlW3ZhbHVlXSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlICE9ICdudW1iZXInICYmIHR5cGUgIT0gJ3N0cmluZycpIHtcbiAgICAgICAgdHlwZSA9ICdvYmplY3QnO1xuICAgICAgfVxuICAgICAgdmFyIGtleSA9IHR5cGUgPT0gJ251bWJlcicgPyB2YWx1ZSA6IGtleVByZWZpeCArIHZhbHVlLFxuICAgICAgICAgIHR5cGVDYWNoZSA9IGNhY2hlW3R5cGVdIHx8IChjYWNoZVt0eXBlXSA9IHt9KTtcblxuICAgICAgaWYgKHR5cGUgPT0gJ29iamVjdCcpIHtcbiAgICAgICAgKHR5cGVDYWNoZVtrZXldIHx8ICh0eXBlQ2FjaGVba2V5XSA9IFtdKSkucHVzaCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlQ2FjaGVba2V5XSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVzZWQgYnkgYF8ubWF4YCBhbmQgYF8ubWluYCBhcyB0aGUgZGVmYXVsdCBjYWxsYmFjayB3aGVuIGEgZ2l2ZW5cbiAgICogY29sbGVjdGlvbiBpcyBhIHN0cmluZyB2YWx1ZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIFRoZSBjaGFyYWN0ZXIgdG8gaW5zcGVjdC5cbiAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgY29kZSB1bml0IG9mIGdpdmVuIGNoYXJhY3Rlci5cbiAgICovXG4gIGZ1bmN0aW9uIGNoYXJBdENhbGxiYWNrKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLmNoYXJDb2RlQXQoMCk7XG4gIH1cblxuICAvKipcbiAgICogVXNlZCBieSBgc29ydEJ5YCB0byBjb21wYXJlIHRyYW5zZm9ybWVkIGBjb2xsZWN0aW9uYCBlbGVtZW50cywgc3RhYmxlIHNvcnRpbmdcbiAgICogdGhlbSBpbiBhc2NlbmRpbmcgb3JkZXIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBhIFRoZSBvYmplY3QgdG8gY29tcGFyZSB0byBgYmAuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBvYmplY3QgdG8gY29tcGFyZSB0byBgYWAuXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIHNvcnQgb3JkZXIgaW5kaWNhdG9yIG9mIGAxYCBvciBgLTFgLlxuICAgKi9cbiAgZnVuY3Rpb24gY29tcGFyZUFzY2VuZGluZyhhLCBiKSB7XG4gICAgdmFyIGFjID0gYS5jcml0ZXJpYSxcbiAgICAgICAgYmMgPSBiLmNyaXRlcmlhLFxuICAgICAgICBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBhYy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIHZhbHVlID0gYWNbaW5kZXhdLFxuICAgICAgICAgIG90aGVyID0gYmNbaW5kZXhdO1xuXG4gICAgICBpZiAodmFsdWUgIT09IG90aGVyKSB7XG4gICAgICAgIGlmICh2YWx1ZSA+IG90aGVyIHx8IHR5cGVvZiB2YWx1ZSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSA8IG90aGVyIHx8IHR5cGVvZiBvdGhlciA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBGaXhlcyBhbiBgQXJyYXkjc29ydGAgYnVnIGluIHRoZSBKUyBlbmdpbmUgZW1iZWRkZWQgaW4gQWRvYmUgYXBwbGljYXRpb25zXG4gICAgLy8gdGhhdCBjYXVzZXMgaXQsIHVuZGVyIGNlcnRhaW4gY2lyY3Vtc3RhbmNlcywgdG8gcmV0dXJuIHRoZSBzYW1lIHZhbHVlIGZvclxuICAgIC8vIGBhYCBhbmQgYGJgLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phc2hrZW5hcy91bmRlcnNjb3JlL3B1bGwvMTI0N1xuICAgIC8vXG4gICAgLy8gVGhpcyBhbHNvIGVuc3VyZXMgYSBzdGFibGUgc29ydCBpbiBWOCBhbmQgb3RoZXIgZW5naW5lcy5cbiAgICAvLyBTZWUgaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9OTBcbiAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGNhY2hlIG9iamVjdCB0byBvcHRpbWl6ZSBsaW5lYXIgc2VhcmNoZXMgb2YgbGFyZ2UgYXJyYXlzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBbYXJyYXk9W11dIFRoZSBhcnJheSB0byBzZWFyY2guXG4gICAqIEByZXR1cm5zIHtudWxsfE9iamVjdH0gUmV0dXJucyB0aGUgY2FjaGUgb2JqZWN0IG9yIGBudWxsYCBpZiBjYWNoaW5nIHNob3VsZCBub3QgYmUgdXNlZC5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNhY2hlKGFycmF5KSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgZmlyc3QgPSBhcnJheVswXSxcbiAgICAgICAgbWlkID0gYXJyYXlbKGxlbmd0aCAvIDIpIHwgMF0sXG4gICAgICAgIGxhc3QgPSBhcnJheVtsZW5ndGggLSAxXTtcblxuICAgIGlmIChmaXJzdCAmJiB0eXBlb2YgZmlyc3QgPT0gJ29iamVjdCcgJiZcbiAgICAgICAgbWlkICYmIHR5cGVvZiBtaWQgPT0gJ29iamVjdCcgJiYgbGFzdCAmJiB0eXBlb2YgbGFzdCA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgY2FjaGUgPSBnZXRPYmplY3QoKTtcbiAgICBjYWNoZVsnZmFsc2UnXSA9IGNhY2hlWydudWxsJ10gPSBjYWNoZVsndHJ1ZSddID0gY2FjaGVbJ3VuZGVmaW5lZCddID0gZmFsc2U7XG5cbiAgICB2YXIgcmVzdWx0ID0gZ2V0T2JqZWN0KCk7XG4gICAgcmVzdWx0LmFycmF5ID0gYXJyYXk7XG4gICAgcmVzdWx0LmNhY2hlID0gY2FjaGU7XG4gICAgcmVzdWx0LnB1c2ggPSBjYWNoZVB1c2g7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgcmVzdWx0LnB1c2goYXJyYXlbaW5kZXhdKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VkIGJ5IGB0ZW1wbGF0ZWAgdG8gZXNjYXBlIGNoYXJhY3RlcnMgZm9yIGluY2x1c2lvbiBpbiBjb21waWxlZFxuICAgKiBzdHJpbmcgbGl0ZXJhbHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtYXRjaCBUaGUgbWF0Y2hlZCBjaGFyYWN0ZXIgdG8gZXNjYXBlLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAgICovXG4gIGZ1bmN0aW9uIGVzY2FwZVN0cmluZ0NoYXIobWF0Y2gpIHtcbiAgICByZXR1cm4gJ1xcXFwnICsgc3RyaW5nRXNjYXBlc1ttYXRjaF07XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhbiBhcnJheSBmcm9tIHRoZSBhcnJheSBwb29sIG9yIGNyZWF0ZXMgYSBuZXcgb25lIGlmIHRoZSBwb29sIGlzIGVtcHR5LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBhcnJheSBmcm9tIHRoZSBwb29sLlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0QXJyYXkoKSB7XG4gICAgcmV0dXJuIGFycmF5UG9vbC5wb3AoKSB8fCBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFuIG9iamVjdCBmcm9tIHRoZSBvYmplY3QgcG9vbCBvciBjcmVhdGVzIGEgbmV3IG9uZSBpZiB0aGUgcG9vbCBpcyBlbXB0eS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge09iamVjdH0gVGhlIG9iamVjdCBmcm9tIHRoZSBwb29sLlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0T2JqZWN0KCkge1xuICAgIHJldHVybiBvYmplY3RQb29sLnBvcCgpIHx8IHtcbiAgICAgICdhcnJheSc6IG51bGwsXG4gICAgICAnY2FjaGUnOiBudWxsLFxuICAgICAgJ2NyaXRlcmlhJzogbnVsbCxcbiAgICAgICdmYWxzZSc6IGZhbHNlLFxuICAgICAgJ2luZGV4JzogMCxcbiAgICAgICdudWxsJzogZmFsc2UsXG4gICAgICAnbnVtYmVyJzogbnVsbCxcbiAgICAgICdvYmplY3QnOiBudWxsLFxuICAgICAgJ3B1c2gnOiBudWxsLFxuICAgICAgJ3N0cmluZyc6IG51bGwsXG4gICAgICAndHJ1ZSc6IGZhbHNlLFxuICAgICAgJ3VuZGVmaW5lZCc6IGZhbHNlLFxuICAgICAgJ3ZhbHVlJzogbnVsbFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUmVsZWFzZXMgdGhlIGdpdmVuIGFycmF5IGJhY2sgdG8gdGhlIGFycmF5IHBvb2wuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IFthcnJheV0gVGhlIGFycmF5IHRvIHJlbGVhc2UuXG4gICAqL1xuICBmdW5jdGlvbiByZWxlYXNlQXJyYXkoYXJyYXkpIHtcbiAgICBhcnJheS5sZW5ndGggPSAwO1xuICAgIGlmIChhcnJheVBvb2wubGVuZ3RoIDwgbWF4UG9vbFNpemUpIHtcbiAgICAgIGFycmF5UG9vbC5wdXNoKGFycmF5KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVsZWFzZXMgdGhlIGdpdmVuIG9iamVjdCBiYWNrIHRvIHRoZSBvYmplY3QgcG9vbC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvYmplY3RdIFRoZSBvYmplY3QgdG8gcmVsZWFzZS5cbiAgICovXG4gIGZ1bmN0aW9uIHJlbGVhc2VPYmplY3Qob2JqZWN0KSB7XG4gICAgdmFyIGNhY2hlID0gb2JqZWN0LmNhY2hlO1xuICAgIGlmIChjYWNoZSkge1xuICAgICAgcmVsZWFzZU9iamVjdChjYWNoZSk7XG4gICAgfVxuICAgIG9iamVjdC5hcnJheSA9IG9iamVjdC5jYWNoZSA9IG9iamVjdC5jcml0ZXJpYSA9IG9iamVjdC5vYmplY3QgPSBvYmplY3QubnVtYmVyID0gb2JqZWN0LnN0cmluZyA9IG9iamVjdC52YWx1ZSA9IG51bGw7XG4gICAgaWYgKG9iamVjdFBvb2wubGVuZ3RoIDwgbWF4UG9vbFNpemUpIHtcbiAgICAgIG9iamVjdFBvb2wucHVzaChvYmplY3QpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTbGljZXMgdGhlIGBjb2xsZWN0aW9uYCBmcm9tIHRoZSBgc3RhcnRgIGluZGV4IHVwIHRvLCBidXQgbm90IGluY2x1ZGluZyxcbiAgICogdGhlIGBlbmRgIGluZGV4LlxuICAgKlxuICAgKiBOb3RlOiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgaW5zdGVhZCBvZiBgQXJyYXkjc2xpY2VgIHRvIHN1cHBvcnQgbm9kZSBsaXN0c1xuICAgKiBpbiBJRSA8IDkgYW5kIHRvIGVuc3VyZSBkZW5zZSBhcnJheXMgYXJlIHJldHVybmVkLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gc2xpY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBUaGUgc3RhcnQgaW5kZXguXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgVGhlIGVuZCBpbmRleC5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgYXJyYXkuXG4gICAqL1xuICBmdW5jdGlvbiBzbGljZShhcnJheSwgc3RhcnQsIGVuZCkge1xuICAgIHN0YXJ0IHx8IChzdGFydCA9IDApO1xuICAgIGlmICh0eXBlb2YgZW5kID09ICd1bmRlZmluZWQnKSB7XG4gICAgICBlbmQgPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gICAgfVxuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBlbmQgLSBzdGFydCB8fCAwLFxuICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGggPCAwID8gMCA6IGxlbmd0aCk7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IGFycmF5W3N0YXJ0ICsgaW5kZXhdO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBgbG9kYXNoYCBmdW5jdGlvbiB1c2luZyB0aGUgZ2l2ZW4gY29udGV4dCBvYmplY3QuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHQ9cm9vdF0gVGhlIGNvbnRleHQgb2JqZWN0LlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIGBsb2Rhc2hgIGZ1bmN0aW9uLlxuICAgKi9cbiAgZnVuY3Rpb24gcnVuSW5Db250ZXh0KGNvbnRleHQpIHtcbiAgICAvLyBBdm9pZCBpc3N1ZXMgd2l0aCBzb21lIEVTMyBlbnZpcm9ubWVudHMgdGhhdCBhdHRlbXB0IHRvIHVzZSB2YWx1ZXMsIG5hbWVkXG4gICAgLy8gYWZ0ZXIgYnVpbHQtaW4gY29uc3RydWN0b3JzIGxpa2UgYE9iamVjdGAsIGZvciB0aGUgY3JlYXRpb24gb2YgbGl0ZXJhbHMuXG4gICAgLy8gRVM1IGNsZWFycyB0aGlzIHVwIGJ5IHN0YXRpbmcgdGhhdCBsaXRlcmFscyBtdXN0IHVzZSBidWlsdC1pbiBjb25zdHJ1Y3RvcnMuXG4gICAgLy8gU2VlIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTEuMS41LlxuICAgIGNvbnRleHQgPSBjb250ZXh0ID8gXy5kZWZhdWx0cyhyb290Lk9iamVjdCgpLCBjb250ZXh0LCBfLnBpY2socm9vdCwgY29udGV4dFByb3BzKSkgOiByb290O1xuXG4gICAgLyoqIE5hdGl2ZSBjb25zdHJ1Y3RvciByZWZlcmVuY2VzICovXG4gICAgdmFyIEFycmF5ID0gY29udGV4dC5BcnJheSxcbiAgICAgICAgQm9vbGVhbiA9IGNvbnRleHQuQm9vbGVhbixcbiAgICAgICAgRGF0ZSA9IGNvbnRleHQuRGF0ZSxcbiAgICAgICAgRnVuY3Rpb24gPSBjb250ZXh0LkZ1bmN0aW9uLFxuICAgICAgICBNYXRoID0gY29udGV4dC5NYXRoLFxuICAgICAgICBOdW1iZXIgPSBjb250ZXh0Lk51bWJlcixcbiAgICAgICAgT2JqZWN0ID0gY29udGV4dC5PYmplY3QsXG4gICAgICAgIFJlZ0V4cCA9IGNvbnRleHQuUmVnRXhwLFxuICAgICAgICBTdHJpbmcgPSBjb250ZXh0LlN0cmluZyxcbiAgICAgICAgVHlwZUVycm9yID0gY29udGV4dC5UeXBlRXJyb3I7XG5cbiAgICAvKipcbiAgICAgKiBVc2VkIGZvciBgQXJyYXlgIG1ldGhvZCByZWZlcmVuY2VzLlxuICAgICAqXG4gICAgICogTm9ybWFsbHkgYEFycmF5LnByb3RvdHlwZWAgd291bGQgc3VmZmljZSwgaG93ZXZlciwgdXNpbmcgYW4gYXJyYXkgbGl0ZXJhbFxuICAgICAqIGF2b2lkcyBpc3N1ZXMgaW4gTmFyd2hhbC5cbiAgICAgKi9cbiAgICB2YXIgYXJyYXlSZWYgPSBbXTtcblxuICAgIC8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgKi9cbiAgICB2YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4gICAgLyoqIFVzZWQgdG8gcmVzdG9yZSB0aGUgb3JpZ2luYWwgYF9gIHJlZmVyZW5jZSBpbiBgbm9Db25mbGljdGAgKi9cbiAgICB2YXIgb2xkRGFzaCA9IGNvbnRleHQuXztcblxuICAgIC8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGludGVybmFsIFtbQ2xhc3NdXSBvZiB2YWx1ZXMgKi9cbiAgICB2YXIgdG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuICAgIC8qKiBVc2VkIHRvIGRldGVjdCBpZiBhIG1ldGhvZCBpcyBuYXRpdmUgKi9cbiAgICB2YXIgcmVOYXRpdmUgPSBSZWdFeHAoJ14nICtcbiAgICAgIFN0cmluZyh0b1N0cmluZylcbiAgICAgICAgLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJylcbiAgICAgICAgLnJlcGxhY2UoL3RvU3RyaW5nfCBmb3IgW15cXF1dKy9nLCAnLio/JykgKyAnJCdcbiAgICApO1xuXG4gICAgLyoqIE5hdGl2ZSBtZXRob2Qgc2hvcnRjdXRzICovXG4gICAgdmFyIGNlaWwgPSBNYXRoLmNlaWwsXG4gICAgICAgIGNsZWFyVGltZW91dCA9IGNvbnRleHQuY2xlYXJUaW1lb3V0LFxuICAgICAgICBmbG9vciA9IE1hdGguZmxvb3IsXG4gICAgICAgIGZuVG9TdHJpbmcgPSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgICAgIGdldFByb3RvdHlwZU9mID0gaXNOYXRpdmUoZ2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YpICYmIGdldFByb3RvdHlwZU9mLFxuICAgICAgICBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5LFxuICAgICAgICBwdXNoID0gYXJyYXlSZWYucHVzaCxcbiAgICAgICAgc2V0VGltZW91dCA9IGNvbnRleHQuc2V0VGltZW91dCxcbiAgICAgICAgc3BsaWNlID0gYXJyYXlSZWYuc3BsaWNlLFxuICAgICAgICB1bnNoaWZ0ID0gYXJyYXlSZWYudW5zaGlmdDtcblxuICAgIC8qKiBVc2VkIHRvIHNldCBtZXRhIGRhdGEgb24gZnVuY3Rpb25zICovXG4gICAgdmFyIGRlZmluZVByb3BlcnR5ID0gKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gSUUgOCBvbmx5IGFjY2VwdHMgRE9NIGVsZW1lbnRzXG4gICAgICB0cnkge1xuICAgICAgICB2YXIgbyA9IHt9LFxuICAgICAgICAgICAgZnVuYyA9IGlzTmF0aXZlKGZ1bmMgPSBPYmplY3QuZGVmaW5lUHJvcGVydHkpICYmIGZ1bmMsXG4gICAgICAgICAgICByZXN1bHQgPSBmdW5jKG8sIG8sIG8pICYmIGZ1bmM7XG4gICAgICB9IGNhdGNoKGUpIHsgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KCkpO1xuXG4gICAgLyogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgZm9yIG1ldGhvZHMgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMgKi9cbiAgICB2YXIgbmF0aXZlQ3JlYXRlID0gaXNOYXRpdmUobmF0aXZlQ3JlYXRlID0gT2JqZWN0LmNyZWF0ZSkgJiYgbmF0aXZlQ3JlYXRlLFxuICAgICAgICBuYXRpdmVJc0FycmF5ID0gaXNOYXRpdmUobmF0aXZlSXNBcnJheSA9IEFycmF5LmlzQXJyYXkpICYmIG5hdGl2ZUlzQXJyYXksXG4gICAgICAgIG5hdGl2ZUlzRmluaXRlID0gY29udGV4dC5pc0Zpbml0ZSxcbiAgICAgICAgbmF0aXZlSXNOYU4gPSBjb250ZXh0LmlzTmFOLFxuICAgICAgICBuYXRpdmVLZXlzID0gaXNOYXRpdmUobmF0aXZlS2V5cyA9IE9iamVjdC5rZXlzKSAmJiBuYXRpdmVLZXlzLFxuICAgICAgICBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICAgICAgbmF0aXZlTWluID0gTWF0aC5taW4sXG4gICAgICAgIG5hdGl2ZVBhcnNlSW50ID0gY29udGV4dC5wYXJzZUludCxcbiAgICAgICAgbmF0aXZlUmFuZG9tID0gTWF0aC5yYW5kb207XG5cbiAgICAvKiogVXNlZCB0byBsb29rdXAgYSBidWlsdC1pbiBjb25zdHJ1Y3RvciBieSBbW0NsYXNzXV0gKi9cbiAgICB2YXIgY3RvckJ5Q2xhc3MgPSB7fTtcbiAgICBjdG9yQnlDbGFzc1thcnJheUNsYXNzXSA9IEFycmF5O1xuICAgIGN0b3JCeUNsYXNzW2Jvb2xDbGFzc10gPSBCb29sZWFuO1xuICAgIGN0b3JCeUNsYXNzW2RhdGVDbGFzc10gPSBEYXRlO1xuICAgIGN0b3JCeUNsYXNzW2Z1bmNDbGFzc10gPSBGdW5jdGlvbjtcbiAgICBjdG9yQnlDbGFzc1tvYmplY3RDbGFzc10gPSBPYmplY3Q7XG4gICAgY3RvckJ5Q2xhc3NbbnVtYmVyQ2xhc3NdID0gTnVtYmVyO1xuICAgIGN0b3JCeUNsYXNzW3JlZ2V4cENsYXNzXSA9IFJlZ0V4cDtcbiAgICBjdG9yQnlDbGFzc1tzdHJpbmdDbGFzc10gPSBTdHJpbmc7XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBgbG9kYXNoYCBvYmplY3Qgd2hpY2ggd3JhcHMgdGhlIGdpdmVuIHZhbHVlIHRvIGVuYWJsZSBpbnR1aXRpdmVcbiAgICAgKiBtZXRob2QgY2hhaW5pbmcuXG4gICAgICpcbiAgICAgKiBJbiBhZGRpdGlvbiB0byBMby1EYXNoIG1ldGhvZHMsIHdyYXBwZXJzIGFsc28gaGF2ZSB0aGUgZm9sbG93aW5nIGBBcnJheWAgbWV0aG9kczpcbiAgICAgKiBgY29uY2F0YCwgYGpvaW5gLCBgcG9wYCwgYHB1c2hgLCBgcmV2ZXJzZWAsIGBzaGlmdGAsIGBzbGljZWAsIGBzb3J0YCwgYHNwbGljZWAsXG4gICAgICogYW5kIGB1bnNoaWZ0YFxuICAgICAqXG4gICAgICogQ2hhaW5pbmcgaXMgc3VwcG9ydGVkIGluIGN1c3RvbSBidWlsZHMgYXMgbG9uZyBhcyB0aGUgYHZhbHVlYCBtZXRob2QgaXNcbiAgICAgKiBpbXBsaWNpdGx5IG9yIGV4cGxpY2l0bHkgaW5jbHVkZWQgaW4gdGhlIGJ1aWxkLlxuICAgICAqXG4gICAgICogVGhlIGNoYWluYWJsZSB3cmFwcGVyIGZ1bmN0aW9ucyBhcmU6XG4gICAgICogYGFmdGVyYCwgYGFzc2lnbmAsIGBiaW5kYCwgYGJpbmRBbGxgLCBgYmluZEtleWAsIGBjaGFpbmAsIGBjb21wYWN0YCxcbiAgICAgKiBgY29tcG9zZWAsIGBjb25jYXRgLCBgY291bnRCeWAsIGBjcmVhdGVgLCBgY3JlYXRlQ2FsbGJhY2tgLCBgY3VycnlgLFxuICAgICAqIGBkZWJvdW5jZWAsIGBkZWZhdWx0c2AsIGBkZWZlcmAsIGBkZWxheWAsIGBkaWZmZXJlbmNlYCwgYGZpbHRlcmAsIGBmbGF0dGVuYCxcbiAgICAgKiBgZm9yRWFjaGAsIGBmb3JFYWNoUmlnaHRgLCBgZm9ySW5gLCBgZm9ySW5SaWdodGAsIGBmb3JPd25gLCBgZm9yT3duUmlnaHRgLFxuICAgICAqIGBmdW5jdGlvbnNgLCBgZ3JvdXBCeWAsIGBpbmRleEJ5YCwgYGluaXRpYWxgLCBgaW50ZXJzZWN0aW9uYCwgYGludmVydGAsXG4gICAgICogYGludm9rZWAsIGBrZXlzYCwgYG1hcGAsIGBtYXhgLCBgbWVtb2l6ZWAsIGBtZXJnZWAsIGBtaW5gLCBgb2JqZWN0YCwgYG9taXRgLFxuICAgICAqIGBvbmNlYCwgYHBhaXJzYCwgYHBhcnRpYWxgLCBgcGFydGlhbFJpZ2h0YCwgYHBpY2tgLCBgcGx1Y2tgLCBgcHVsbGAsIGBwdXNoYCxcbiAgICAgKiBgcmFuZ2VgLCBgcmVqZWN0YCwgYHJlbW92ZWAsIGByZXN0YCwgYHJldmVyc2VgLCBgc2h1ZmZsZWAsIGBzbGljZWAsIGBzb3J0YCxcbiAgICAgKiBgc29ydEJ5YCwgYHNwbGljZWAsIGB0YXBgLCBgdGhyb3R0bGVgLCBgdGltZXNgLCBgdG9BcnJheWAsIGB0cmFuc2Zvcm1gLFxuICAgICAqIGB1bmlvbmAsIGB1bmlxYCwgYHVuc2hpZnRgLCBgdW56aXBgLCBgdmFsdWVzYCwgYHdoZXJlYCwgYHdpdGhvdXRgLCBgd3JhcGAsXG4gICAgICogYW5kIGB6aXBgXG4gICAgICpcbiAgICAgKiBUaGUgbm9uLWNoYWluYWJsZSB3cmFwcGVyIGZ1bmN0aW9ucyBhcmU6XG4gICAgICogYGNsb25lYCwgYGNsb25lRGVlcGAsIGBjb250YWluc2AsIGBlc2NhcGVgLCBgZXZlcnlgLCBgZmluZGAsIGBmaW5kSW5kZXhgLFxuICAgICAqIGBmaW5kS2V5YCwgYGZpbmRMYXN0YCwgYGZpbmRMYXN0SW5kZXhgLCBgZmluZExhc3RLZXlgLCBgaGFzYCwgYGlkZW50aXR5YCxcbiAgICAgKiBgaW5kZXhPZmAsIGBpc0FyZ3VtZW50c2AsIGBpc0FycmF5YCwgYGlzQm9vbGVhbmAsIGBpc0RhdGVgLCBgaXNFbGVtZW50YCxcbiAgICAgKiBgaXNFbXB0eWAsIGBpc0VxdWFsYCwgYGlzRmluaXRlYCwgYGlzRnVuY3Rpb25gLCBgaXNOYU5gLCBgaXNOdWxsYCwgYGlzTnVtYmVyYCxcbiAgICAgKiBgaXNPYmplY3RgLCBgaXNQbGFpbk9iamVjdGAsIGBpc1JlZ0V4cGAsIGBpc1N0cmluZ2AsIGBpc1VuZGVmaW5lZGAsIGBqb2luYCxcbiAgICAgKiBgbGFzdEluZGV4T2ZgLCBgbWl4aW5gLCBgbm9Db25mbGljdGAsIGBwYXJzZUludGAsIGBwb3BgLCBgcmFuZG9tYCwgYHJlZHVjZWAsXG4gICAgICogYHJlZHVjZVJpZ2h0YCwgYHJlc3VsdGAsIGBzaGlmdGAsIGBzaXplYCwgYHNvbWVgLCBgc29ydGVkSW5kZXhgLCBgcnVuSW5Db250ZXh0YCxcbiAgICAgKiBgdGVtcGxhdGVgLCBgdW5lc2NhcGVgLCBgdW5pcXVlSWRgLCBhbmQgYHZhbHVlYFxuICAgICAqXG4gICAgICogVGhlIHdyYXBwZXIgZnVuY3Rpb25zIGBmaXJzdGAgYW5kIGBsYXN0YCByZXR1cm4gd3JhcHBlZCB2YWx1ZXMgd2hlbiBgbmAgaXNcbiAgICAgKiBwcm92aWRlZCwgb3RoZXJ3aXNlIHRoZXkgcmV0dXJuIHVud3JhcHBlZCB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBFeHBsaWNpdCBjaGFpbmluZyBjYW4gYmUgZW5hYmxlZCBieSB1c2luZyB0aGUgYF8uY2hhaW5gIG1ldGhvZC5cbiAgICAgKlxuICAgICAqIEBuYW1lIF9cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAY2F0ZWdvcnkgQ2hhaW5pbmdcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byB3cmFwIGluIGEgYGxvZGFzaGAgaW5zdGFuY2UuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhIGBsb2Rhc2hgIGluc3RhbmNlLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgd3JhcHBlZCA9IF8oWzEsIDIsIDNdKTtcbiAgICAgKlxuICAgICAqIC8vIHJldHVybnMgYW4gdW53cmFwcGVkIHZhbHVlXG4gICAgICogd3JhcHBlZC5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBudW0pIHtcbiAgICAgKiAgIHJldHVybiBzdW0gKyBudW07XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gNlxuICAgICAqXG4gICAgICogLy8gcmV0dXJucyBhIHdyYXBwZWQgdmFsdWVcbiAgICAgKiB2YXIgc3F1YXJlcyA9IHdyYXBwZWQubWFwKGZ1bmN0aW9uKG51bSkge1xuICAgICAqICAgcmV0dXJuIG51bSAqIG51bTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIF8uaXNBcnJheShzcXVhcmVzKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc0FycmF5KHNxdWFyZXMudmFsdWUoKSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvZGFzaCh2YWx1ZSkge1xuICAgICAgLy8gZG9uJ3Qgd3JhcCBpZiBhbHJlYWR5IHdyYXBwZWQsIGV2ZW4gaWYgd3JhcHBlZCBieSBhIGRpZmZlcmVudCBgbG9kYXNoYCBjb25zdHJ1Y3RvclxuICAgICAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcgJiYgIWlzQXJyYXkodmFsdWUpICYmIGhhc093blByb3BlcnR5LmNhbGwodmFsdWUsICdfX3dyYXBwZWRfXycpKVxuICAgICAgID8gdmFsdWVcbiAgICAgICA6IG5ldyBsb2Rhc2hXcmFwcGVyKHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIGZhc3QgcGF0aCBmb3IgY3JlYXRpbmcgYGxvZGFzaGAgd3JhcHBlciBvYmplY3RzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byB3cmFwIGluIGEgYGxvZGFzaGAgaW5zdGFuY2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBjaGFpbkFsbCBBIGZsYWcgdG8gZW5hYmxlIGNoYWluaW5nIGZvciBhbGwgbWV0aG9kc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYSBgbG9kYXNoYCBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2Rhc2hXcmFwcGVyKHZhbHVlLCBjaGFpbkFsbCkge1xuICAgICAgdGhpcy5fX2NoYWluX18gPSAhIWNoYWluQWxsO1xuICAgICAgdGhpcy5fX3dyYXBwZWRfXyA9IHZhbHVlO1xuICAgIH1cbiAgICAvLyBlbnN1cmUgYG5ldyBsb2Rhc2hXcmFwcGVyYCBpcyBhbiBpbnN0YW5jZSBvZiBgbG9kYXNoYFxuICAgIGxvZGFzaFdyYXBwZXIucHJvdG90eXBlID0gbG9kYXNoLnByb3RvdHlwZTtcblxuICAgIC8qKlxuICAgICAqIEFuIG9iamVjdCB1c2VkIHRvIGZsYWcgZW52aXJvbm1lbnRzIGZlYXR1cmVzLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgT2JqZWN0XG4gICAgICovXG4gICAgdmFyIHN1cHBvcnQgPSBsb2Rhc2guc3VwcG9ydCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGlmIGZ1bmN0aW9ucyBjYW4gYmUgZGVjb21waWxlZCBieSBgRnVuY3Rpb24jdG9TdHJpbmdgXG4gICAgICogKGFsbCBidXQgUFMzIGFuZCBvbGRlciBPcGVyYSBtb2JpbGUgYnJvd3NlcnMgJiBhdm9pZGVkIGluIFdpbmRvd3MgOCBhcHBzKS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBfLnN1cHBvcnRcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICovXG4gICAgc3VwcG9ydC5mdW5jRGVjb21wID0gIWlzTmF0aXZlKGNvbnRleHQuV2luUlRFcnJvcikgJiYgcmVUaGlzLnRlc3QocnVuSW5Db250ZXh0KTtcblxuICAgIC8qKlxuICAgICAqIERldGVjdCBpZiBgRnVuY3Rpb24jbmFtZWAgaXMgc3VwcG9ydGVkIChhbGwgYnV0IElFKS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBfLnN1cHBvcnRcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICovXG4gICAgc3VwcG9ydC5mdW5jTmFtZXMgPSB0eXBlb2YgRnVuY3Rpb24ubmFtZSA9PSAnc3RyaW5nJztcblxuICAgIC8qKlxuICAgICAqIEJ5IGRlZmF1bHQsIHRoZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzIHVzZWQgYnkgTG8tRGFzaCBhcmUgc2ltaWxhciB0byB0aG9zZSBpblxuICAgICAqIGVtYmVkZGVkIFJ1YnkgKEVSQikuIENoYW5nZSB0aGUgZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZVxuICAgICAqIGRlbGltaXRlcnMuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgKi9cbiAgICBsb2Rhc2gudGVtcGxhdGVTZXR0aW5ncyA9IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBVc2VkIHRvIGRldGVjdCBgZGF0YWAgcHJvcGVydHkgdmFsdWVzIHRvIGJlIEhUTUwtZXNjYXBlZC5cbiAgICAgICAqXG4gICAgICAgKiBAbWVtYmVyT2YgXy50ZW1wbGF0ZVNldHRpbmdzXG4gICAgICAgKiBAdHlwZSBSZWdFeHBcbiAgICAgICAqL1xuICAgICAgJ2VzY2FwZSc6IC88JS0oW1xcc1xcU10rPyklPi9nLFxuXG4gICAgICAvKipcbiAgICAgICAqIFVzZWQgdG8gZGV0ZWN0IGNvZGUgdG8gYmUgZXZhbHVhdGVkLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICAgICAqIEB0eXBlIFJlZ0V4cFxuICAgICAgICovXG4gICAgICAnZXZhbHVhdGUnOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuXG4gICAgICAvKipcbiAgICAgICAqIFVzZWQgdG8gZGV0ZWN0IGBkYXRhYCBwcm9wZXJ0eSB2YWx1ZXMgdG8gaW5qZWN0LlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICAgICAqIEB0eXBlIFJlZ0V4cFxuICAgICAgICovXG4gICAgICAnaW50ZXJwb2xhdGUnOiByZUludGVycG9sYXRlLFxuXG4gICAgICAvKipcbiAgICAgICAqIFVzZWQgdG8gcmVmZXJlbmNlIHRoZSBkYXRhIG9iamVjdCBpbiB0aGUgdGVtcGxhdGUgdGV4dC5cbiAgICAgICAqXG4gICAgICAgKiBAbWVtYmVyT2YgXy50ZW1wbGF0ZVNldHRpbmdzXG4gICAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgICAqL1xuICAgICAgJ3ZhcmlhYmxlJzogJycsXG5cbiAgICAgIC8qKlxuICAgICAgICogVXNlZCB0byBpbXBvcnQgdmFyaWFibGVzIGludG8gdGhlIGNvbXBpbGVkIHRlbXBsYXRlLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICovXG4gICAgICAnaW1wb3J0cyc6IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQSByZWZlcmVuY2UgdG8gdGhlIGBsb2Rhc2hgIGZ1bmN0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAbWVtYmVyT2YgXy50ZW1wbGF0ZVNldHRpbmdzLmltcG9ydHNcbiAgICAgICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgICdfJzogbG9kYXNoXG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uYmluZGAgdGhhdCBjcmVhdGVzIHRoZSBib3VuZCBmdW5jdGlvbiBhbmRcbiAgICAgKiBzZXRzIGl0cyBtZXRhIGRhdGEuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJpbmREYXRhIFRoZSBiaW5kIGRhdGEgYXJyYXkuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYm91bmQgZnVuY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZUJpbmQoYmluZERhdGEpIHtcbiAgICAgIHZhciBmdW5jID0gYmluZERhdGFbMF0sXG4gICAgICAgICAgcGFydGlhbEFyZ3MgPSBiaW5kRGF0YVsyXSxcbiAgICAgICAgICB0aGlzQXJnID0gYmluZERhdGFbNF07XG5cbiAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAvLyBgRnVuY3Rpb24jYmluZGAgc3BlY1xuICAgICAgICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjMuNC41XG4gICAgICAgIGlmIChwYXJ0aWFsQXJncykge1xuICAgICAgICAgIC8vIGF2b2lkIGBhcmd1bWVudHNgIG9iamVjdCBkZW9wdGltaXphdGlvbnMgYnkgdXNpbmcgYHNsaWNlYCBpbnN0ZWFkXG4gICAgICAgICAgLy8gb2YgYEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsYCBhbmQgbm90IGFzc2lnbmluZyBgYXJndW1lbnRzYCB0byBhXG4gICAgICAgICAgLy8gdmFyaWFibGUgYXMgYSB0ZXJuYXJ5IGV4cHJlc3Npb25cbiAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKHBhcnRpYWxBcmdzKTtcbiAgICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbWltaWMgdGhlIGNvbnN0cnVjdG9yJ3MgYHJldHVybmAgYmVoYXZpb3JcbiAgICAgICAgLy8gaHR0cDovL2VzNS5naXRodWIuaW8vI3gxMy4yLjJcbiAgICAgICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkge1xuICAgICAgICAgIC8vIGVuc3VyZSBgbmV3IGJvdW5kYCBpcyBhbiBpbnN0YW5jZSBvZiBgZnVuY2BcbiAgICAgICAgICB2YXIgdGhpc0JpbmRpbmcgPSBiYXNlQ3JlYXRlKGZ1bmMucHJvdG90eXBlKSxcbiAgICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQmluZGluZywgYXJncyB8fCBhcmd1bWVudHMpO1xuICAgICAgICAgIHJldHVybiBpc09iamVjdChyZXN1bHQpID8gcmVzdWx0IDogdGhpc0JpbmRpbmc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyB8fCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgc2V0QmluZERhdGEoYm91bmQsIGJpbmREYXRhKTtcbiAgICAgIHJldHVybiBib3VuZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jbG9uZWAgd2l0aG91dCBhcmd1bWVudCBqdWdnbGluZyBvciBzdXBwb3J0XG4gICAgICogZm9yIGB0aGlzQXJnYCBiaW5kaW5nLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjbG9uZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc0RlZXA9ZmFsc2VdIFNwZWNpZnkgYSBkZWVwIGNsb25lLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBjbG9uaW5nIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tBPVtdXSBUcmFja3MgdHJhdmVyc2VkIHNvdXJjZSBvYmplY3RzLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0I9W11dIEFzc29jaWF0ZXMgY2xvbmVzIHdpdGggc291cmNlIGNvdW50ZXJwYXJ0cy5cbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgY2xvbmVkIHZhbHVlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhc2VDbG9uZSh2YWx1ZSwgaXNEZWVwLCBjYWxsYmFjaywgc3RhY2tBLCBzdGFja0IpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gY2FsbGJhY2sodmFsdWUpO1xuICAgICAgICBpZiAodHlwZW9mIHJlc3VsdCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGluc3BlY3QgW1tDbGFzc11dXG4gICAgICB2YXIgaXNPYmogPSBpc09iamVjdCh2YWx1ZSk7XG4gICAgICBpZiAoaXNPYmopIHtcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICAgICAgICBpZiAoIWNsb25lYWJsZUNsYXNzZXNbY2xhc3NOYW1lXSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY3RvciA9IGN0b3JCeUNsYXNzW2NsYXNzTmFtZV07XG4gICAgICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAgICAgY2FzZSBib29sQ2xhc3M6XG4gICAgICAgICAgY2FzZSBkYXRlQ2xhc3M6XG4gICAgICAgICAgICByZXR1cm4gbmV3IGN0b3IoK3ZhbHVlKTtcblxuICAgICAgICAgIGNhc2UgbnVtYmVyQ2xhc3M6XG4gICAgICAgICAgY2FzZSBzdHJpbmdDbGFzczpcbiAgICAgICAgICAgIHJldHVybiBuZXcgY3Rvcih2YWx1ZSk7XG5cbiAgICAgICAgICBjYXNlIHJlZ2V4cENsYXNzOlxuICAgICAgICAgICAgcmVzdWx0ID0gY3Rvcih2YWx1ZS5zb3VyY2UsIHJlRmxhZ3MuZXhlYyh2YWx1ZSkpO1xuICAgICAgICAgICAgcmVzdWx0Lmxhc3RJbmRleCA9IHZhbHVlLmxhc3RJbmRleDtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBpc0FyciA9IGlzQXJyYXkodmFsdWUpO1xuICAgICAgaWYgKGlzRGVlcCkge1xuICAgICAgICAvLyBjaGVjayBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlcyBhbmQgcmV0dXJuIGNvcnJlc3BvbmRpbmcgY2xvbmVcbiAgICAgICAgdmFyIGluaXRlZFN0YWNrID0gIXN0YWNrQTtcbiAgICAgICAgc3RhY2tBIHx8IChzdGFja0EgPSBnZXRBcnJheSgpKTtcbiAgICAgICAgc3RhY2tCIHx8IChzdGFja0IgPSBnZXRBcnJheSgpKTtcblxuICAgICAgICB2YXIgbGVuZ3RoID0gc3RhY2tBLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgICAgaWYgKHN0YWNrQVtsZW5ndGhdID09IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhY2tCW2xlbmd0aF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IGlzQXJyID8gY3Rvcih2YWx1ZS5sZW5ndGgpIDoge307XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gaXNBcnIgPyBzbGljZSh2YWx1ZSkgOiBhc3NpZ24oe30sIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIGFkZCBhcnJheSBwcm9wZXJ0aWVzIGFzc2lnbmVkIGJ5IGBSZWdFeHAjZXhlY2BcbiAgICAgIGlmIChpc0Fycikge1xuICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ2luZGV4JykpIHtcbiAgICAgICAgICByZXN1bHQuaW5kZXggPSB2YWx1ZS5pbmRleDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ2lucHV0JykpIHtcbiAgICAgICAgICByZXN1bHQuaW5wdXQgPSB2YWx1ZS5pbnB1dDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gZXhpdCBmb3Igc2hhbGxvdyBjbG9uZVxuICAgICAgaWYgKCFpc0RlZXApIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIC8vIGFkZCB0aGUgc291cmNlIHZhbHVlIHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0c1xuICAgICAgLy8gYW5kIGFzc29jaWF0ZSBpdCB3aXRoIGl0cyBjbG9uZVxuICAgICAgc3RhY2tBLnB1c2godmFsdWUpO1xuICAgICAgc3RhY2tCLnB1c2gocmVzdWx0KTtcblxuICAgICAgLy8gcmVjdXJzaXZlbHkgcG9wdWxhdGUgY2xvbmUgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKVxuICAgICAgKGlzQXJyID8gZm9yRWFjaCA6IGZvck93bikodmFsdWUsIGZ1bmN0aW9uKG9ialZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBiYXNlQ2xvbmUob2JqVmFsdWUsIGlzRGVlcCwgY2FsbGJhY2ssIHN0YWNrQSwgc3RhY2tCKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGVkU3RhY2spIHtcbiAgICAgICAgcmVsZWFzZUFycmF5KHN0YWNrQSk7XG4gICAgICAgIHJlbGVhc2VBcnJheShzdGFja0IpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jcmVhdGVgIHdpdGhvdXQgc3VwcG9ydCBmb3IgYXNzaWduaW5nXG4gICAgICogcHJvcGVydGllcyB0byB0aGUgY3JlYXRlZCBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b3R5cGUgVGhlIG9iamVjdCB0byBpbmhlcml0IGZyb20uXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbmV3IG9iamVjdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlQ3JlYXRlKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICAgICAgcmV0dXJuIGlzT2JqZWN0KHByb3RvdHlwZSkgPyBuYXRpdmVDcmVhdGUocHJvdG90eXBlKSA6IHt9O1xuICAgIH1cbiAgICAvLyBmYWxsYmFjayBmb3IgYnJvd3NlcnMgd2l0aG91dCBgT2JqZWN0LmNyZWF0ZWBcbiAgICBpZiAoIW5hdGl2ZUNyZWF0ZSkge1xuICAgICAgYmFzZUNyZWF0ZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgZnVuY3Rpb24gT2JqZWN0KCkge31cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHByb3RvdHlwZSkge1xuICAgICAgICAgIGlmIChpc09iamVjdChwcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBPYmplY3Q7XG4gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBjb250ZXh0Lk9iamVjdCgpO1xuICAgICAgICB9O1xuICAgICAgfSgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jcmVhdGVDYWxsYmFja2Agd2l0aG91dCBzdXBwb3J0IGZvciBjcmVhdGluZ1xuICAgICAqIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSBbZnVuYz1pZGVudGl0eV0gVGhlIHZhbHVlIHRvIGNvbnZlcnQgdG8gYSBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIGNyZWF0ZWQgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFthcmdDb3VudF0gVGhlIG51bWJlciBvZiBhcmd1bWVudHMgdGhlIGNhbGxiYWNrIGFjY2VwdHMuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZUNyZWF0ZUNhbGxiYWNrKGZ1bmMsIHRoaXNBcmcsIGFyZ0NvdW50KSB7XG4gICAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gaWRlbnRpdHk7XG4gICAgICB9XG4gICAgICAvLyBleGl0IGVhcmx5IGZvciBubyBgdGhpc0FyZ2Agb3IgYWxyZWFkeSBib3VuZCBieSBgRnVuY3Rpb24jYmluZGBcbiAgICAgIGlmICh0eXBlb2YgdGhpc0FyZyA9PSAndW5kZWZpbmVkJyB8fCAhKCdwcm90b3R5cGUnIGluIGZ1bmMpKSB7XG4gICAgICAgIHJldHVybiBmdW5jO1xuICAgICAgfVxuICAgICAgdmFyIGJpbmREYXRhID0gZnVuYy5fX2JpbmREYXRhX187XG4gICAgICBpZiAodHlwZW9mIGJpbmREYXRhID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmIChzdXBwb3J0LmZ1bmNOYW1lcykge1xuICAgICAgICAgIGJpbmREYXRhID0gIWZ1bmMubmFtZTtcbiAgICAgICAgfVxuICAgICAgICBiaW5kRGF0YSA9IGJpbmREYXRhIHx8ICFzdXBwb3J0LmZ1bmNEZWNvbXA7XG4gICAgICAgIGlmICghYmluZERhdGEpIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gZm5Ub1N0cmluZy5jYWxsKGZ1bmMpO1xuICAgICAgICAgIGlmICghc3VwcG9ydC5mdW5jTmFtZXMpIHtcbiAgICAgICAgICAgIGJpbmREYXRhID0gIXJlRnVuY05hbWUudGVzdChzb3VyY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWJpbmREYXRhKSB7XG4gICAgICAgICAgICAvLyBjaGVja3MgaWYgYGZ1bmNgIHJlZmVyZW5jZXMgdGhlIGB0aGlzYCBrZXl3b3JkIGFuZCBzdG9yZXMgdGhlIHJlc3VsdFxuICAgICAgICAgICAgYmluZERhdGEgPSByZVRoaXMudGVzdChzb3VyY2UpO1xuICAgICAgICAgICAgc2V0QmluZERhdGEoZnVuYywgYmluZERhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gZXhpdCBlYXJseSBpZiB0aGVyZSBhcmUgbm8gYHRoaXNgIHJlZmVyZW5jZXMgb3IgYGZ1bmNgIGlzIGJvdW5kXG4gICAgICBpZiAoYmluZERhdGEgPT09IGZhbHNlIHx8IChiaW5kRGF0YSAhPT0gdHJ1ZSAmJiBiaW5kRGF0YVsxXSAmIDEpKSB7XG4gICAgICAgIHJldHVybiBmdW5jO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChhcmdDb3VudCkge1xuICAgICAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUpO1xuICAgICAgICB9O1xuICAgICAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCBhLCBiKTtcbiAgICAgICAgfTtcbiAgICAgICAgY2FzZSAzOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICB9O1xuICAgICAgICBjYXNlIDQ6IHJldHVybiBmdW5jdGlvbihhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBiaW5kKGZ1bmMsIHRoaXNBcmcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBjcmVhdGVXcmFwcGVyYCB0aGF0IGNyZWF0ZXMgdGhlIHdyYXBwZXIgYW5kXG4gICAgICogc2V0cyBpdHMgbWV0YSBkYXRhLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBiaW5kRGF0YSBUaGUgYmluZCBkYXRhIGFycmF5LlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhc2VDcmVhdGVXcmFwcGVyKGJpbmREYXRhKSB7XG4gICAgICB2YXIgZnVuYyA9IGJpbmREYXRhWzBdLFxuICAgICAgICAgIGJpdG1hc2sgPSBiaW5kRGF0YVsxXSxcbiAgICAgICAgICBwYXJ0aWFsQXJncyA9IGJpbmREYXRhWzJdLFxuICAgICAgICAgIHBhcnRpYWxSaWdodEFyZ3MgPSBiaW5kRGF0YVszXSxcbiAgICAgICAgICB0aGlzQXJnID0gYmluZERhdGFbNF0sXG4gICAgICAgICAgYXJpdHkgPSBiaW5kRGF0YVs1XTtcblxuICAgICAgdmFyIGlzQmluZCA9IGJpdG1hc2sgJiAxLFxuICAgICAgICAgIGlzQmluZEtleSA9IGJpdG1hc2sgJiAyLFxuICAgICAgICAgIGlzQ3VycnkgPSBiaXRtYXNrICYgNCxcbiAgICAgICAgICBpc0N1cnJ5Qm91bmQgPSBiaXRtYXNrICYgOCxcbiAgICAgICAgICBrZXkgPSBmdW5jO1xuXG4gICAgICBmdW5jdGlvbiBib3VuZCgpIHtcbiAgICAgICAgdmFyIHRoaXNCaW5kaW5nID0gaXNCaW5kID8gdGhpc0FyZyA6IHRoaXM7XG4gICAgICAgIGlmIChwYXJ0aWFsQXJncykge1xuICAgICAgICAgIHZhciBhcmdzID0gc2xpY2UocGFydGlhbEFyZ3MpO1xuICAgICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydGlhbFJpZ2h0QXJncyB8fCBpc0N1cnJ5KSB7XG4gICAgICAgICAgYXJncyB8fCAoYXJncyA9IHNsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICAgIGlmIChwYXJ0aWFsUmlnaHRBcmdzKSB7XG4gICAgICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIHBhcnRpYWxSaWdodEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNDdXJyeSAmJiBhcmdzLmxlbmd0aCA8IGFyaXR5KSB7XG4gICAgICAgICAgICBiaXRtYXNrIHw9IDE2ICYgfjMyO1xuICAgICAgICAgICAgcmV0dXJuIGJhc2VDcmVhdGVXcmFwcGVyKFtmdW5jLCAoaXNDdXJyeUJvdW5kID8gYml0bWFzayA6IGJpdG1hc2sgJiB+MyksIGFyZ3MsIG51bGwsIHRoaXNBcmcsIGFyaXR5XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFyZ3MgfHwgKGFyZ3MgPSBhcmd1bWVudHMpO1xuICAgICAgICBpZiAoaXNCaW5kS2V5KSB7XG4gICAgICAgICAgZnVuYyA9IHRoaXNCaW5kaW5nW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkge1xuICAgICAgICAgIHRoaXNCaW5kaW5nID0gYmFzZUNyZWF0ZShmdW5jLnByb3RvdHlwZSk7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0JpbmRpbmcsIGFyZ3MpO1xuICAgICAgICAgIHJldHVybiBpc09iamVjdChyZXN1bHQpID8gcmVzdWx0IDogdGhpc0JpbmRpbmc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpc0JpbmRpbmcsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgc2V0QmluZERhdGEoYm91bmQsIGJpbmREYXRhKTtcbiAgICAgIHJldHVybiBib3VuZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5kaWZmZXJlbmNlYCB0aGF0IGFjY2VwdHMgYSBzaW5nbGUgYXJyYXlcbiAgICAgKiBvZiB2YWx1ZXMgdG8gZXhjbHVkZS5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHByb2Nlc3MuXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlc10gVGhlIGFycmF5IG9mIHZhbHVlcyB0byBleGNsdWRlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBmaWx0ZXJlZCB2YWx1ZXMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZURpZmZlcmVuY2UoYXJyYXksIHZhbHVlcykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgaW5kZXhPZiA9IGdldEluZGV4T2YoKSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgaXNMYXJnZSA9IGxlbmd0aCA+PSBsYXJnZUFycmF5U2l6ZSAmJiBpbmRleE9mID09PSBiYXNlSW5kZXhPZixcbiAgICAgICAgICByZXN1bHQgPSBbXTtcblxuICAgICAgaWYgKGlzTGFyZ2UpIHtcbiAgICAgICAgdmFyIGNhY2hlID0gY3JlYXRlQ2FjaGUodmFsdWVzKTtcbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgaW5kZXhPZiA9IGNhY2hlSW5kZXhPZjtcbiAgICAgICAgICB2YWx1ZXMgPSBjYWNoZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpc0xhcmdlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XTtcbiAgICAgICAgaWYgKGluZGV4T2YodmFsdWVzLCB2YWx1ZSkgPCAwKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoaXNMYXJnZSkge1xuICAgICAgICByZWxlYXNlT2JqZWN0KHZhbHVlcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZsYXR0ZW5gIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2tcbiAgICAgKiBzaG9ydGhhbmRzIG9yIGB0aGlzQXJnYCBiaW5kaW5nLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gZmxhdHRlbi5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc1NoYWxsb3c9ZmFsc2VdIEEgZmxhZyB0byByZXN0cmljdCBmbGF0dGVuaW5nIHRvIGEgc2luZ2xlIGxldmVsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzU3RyaWN0PWZhbHNlXSBBIGZsYWcgdG8gcmVzdHJpY3QgZmxhdHRlbmluZyB0byBhcnJheXMgYW5kIGBhcmd1bWVudHNgIG9iamVjdHMuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtmcm9tSW5kZXg9MF0gVGhlIGluZGV4IHRvIHN0YXJ0IGZyb20uXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGZsYXR0ZW5lZCBhcnJheS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlRmxhdHRlbihhcnJheSwgaXNTaGFsbG93LCBpc1N0cmljdCwgZnJvbUluZGV4KSB7XG4gICAgICB2YXIgaW5kZXggPSAoZnJvbUluZGV4IHx8IDApIC0gMSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XTtcblxuICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT0gJ251bWJlcidcbiAgICAgICAgICAgICYmIChpc0FycmF5KHZhbHVlKSB8fCBpc0FyZ3VtZW50cyh2YWx1ZSkpKSB7XG4gICAgICAgICAgLy8gcmVjdXJzaXZlbHkgZmxhdHRlbiBhcnJheXMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKVxuICAgICAgICAgIGlmICghaXNTaGFsbG93KSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGJhc2VGbGF0dGVuKHZhbHVlLCBpc1NoYWxsb3csIGlzU3RyaWN0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHZhbEluZGV4ID0gLTEsXG4gICAgICAgICAgICAgIHZhbExlbmd0aCA9IHZhbHVlLmxlbmd0aCxcbiAgICAgICAgICAgICAgcmVzSW5kZXggPSByZXN1bHQubGVuZ3RoO1xuXG4gICAgICAgICAgcmVzdWx0Lmxlbmd0aCArPSB2YWxMZW5ndGg7XG4gICAgICAgICAgd2hpbGUgKCsrdmFsSW5kZXggPCB2YWxMZW5ndGgpIHtcbiAgICAgICAgICAgIHJlc3VsdFtyZXNJbmRleCsrXSA9IHZhbHVlW3ZhbEluZGV4XTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzU3RyaWN0KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmlzRXF1YWxgLCB3aXRob3V0IHN1cHBvcnQgZm9yIGB0aGlzQXJnYCBiaW5kaW5nLFxuICAgICAqIHRoYXQgYWxsb3dzIHBhcnRpYWwgXCJfLndoZXJlXCIgc3R5bGUgY29tcGFyaXNvbnMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Kn0gYSBUaGUgdmFsdWUgdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0geyp9IGIgVGhlIG90aGVyIHZhbHVlIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmluZyB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2lzV2hlcmU9ZmFsc2VdIEEgZmxhZyB0byBpbmRpY2F0ZSBwZXJmb3JtaW5nIHBhcnRpYWwgY29tcGFyaXNvbnMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQT1bXV0gVHJhY2tzIHRyYXZlcnNlZCBgYWAgb2JqZWN0cy5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tCPVtdXSBUcmFja3MgdHJhdmVyc2VkIGBiYCBvYmplY3RzLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBlbHNlIGBmYWxzZWAuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZUlzRXF1YWwoYSwgYiwgY2FsbGJhY2ssIGlzV2hlcmUsIHN0YWNrQSwgc3RhY2tCKSB7XG4gICAgICAvLyB1c2VkIHRvIGluZGljYXRlIHRoYXQgd2hlbiBjb21wYXJpbmcgb2JqZWN0cywgYGFgIGhhcyBhdCBsZWFzdCB0aGUgcHJvcGVydGllcyBvZiBgYmBcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gY2FsbGJhY2soYSwgYik7XG4gICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmV0dXJuICEhcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBleGl0IGVhcmx5IGZvciBpZGVudGljYWwgdmFsdWVzXG4gICAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICAvLyB0cmVhdCBgKzBgIHZzLiBgLTBgIGFzIG5vdCBlcXVhbFxuICAgICAgICByZXR1cm4gYSAhPT0gMCB8fCAoMSAvIGEgPT0gMSAvIGIpO1xuICAgICAgfVxuICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgYSxcbiAgICAgICAgICBvdGhlclR5cGUgPSB0eXBlb2YgYjtcblxuICAgICAgLy8gZXhpdCBlYXJseSBmb3IgdW5saWtlIHByaW1pdGl2ZSB2YWx1ZXNcbiAgICAgIGlmIChhID09PSBhICYmXG4gICAgICAgICAgIShhICYmIG9iamVjdFR5cGVzW3R5cGVdKSAmJlxuICAgICAgICAgICEoYiAmJiBvYmplY3RUeXBlc1tvdGhlclR5cGVdKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBleGl0IGVhcmx5IGZvciBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGF2b2lkaW5nIEVTMydzIEZ1bmN0aW9uI2NhbGwgYmVoYXZpb3JcbiAgICAgIC8vIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuMy40LjRcbiAgICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgICAgfVxuICAgICAgLy8gY29tcGFyZSBbW0NsYXNzXV0gbmFtZXNcbiAgICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpLFxuICAgICAgICAgIG90aGVyQ2xhc3MgPSB0b1N0cmluZy5jYWxsKGIpO1xuXG4gICAgICBpZiAoY2xhc3NOYW1lID09IGFyZ3NDbGFzcykge1xuICAgICAgICBjbGFzc05hbWUgPSBvYmplY3RDbGFzcztcbiAgICAgIH1cbiAgICAgIGlmIChvdGhlckNsYXNzID09IGFyZ3NDbGFzcykge1xuICAgICAgICBvdGhlckNsYXNzID0gb2JqZWN0Q2xhc3M7XG4gICAgICB9XG4gICAgICBpZiAoY2xhc3NOYW1lICE9IG90aGVyQ2xhc3MpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgICAgY2FzZSBib29sQ2xhc3M6XG4gICAgICAgIGNhc2UgZGF0ZUNsYXNzOlxuICAgICAgICAgIC8vIGNvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtYmVycywgZGF0ZXMgdG8gbWlsbGlzZWNvbmRzIGFuZCBib29sZWFuc1xuICAgICAgICAgIC8vIHRvIGAxYCBvciBgMGAgdHJlYXRpbmcgaW52YWxpZCBkYXRlcyBjb2VyY2VkIHRvIGBOYU5gIGFzIG5vdCBlcXVhbFxuICAgICAgICAgIHJldHVybiArYSA9PSArYjtcblxuICAgICAgICBjYXNlIG51bWJlckNsYXNzOlxuICAgICAgICAgIC8vIHRyZWF0IGBOYU5gIHZzLiBgTmFOYCBhcyBlcXVhbFxuICAgICAgICAgIHJldHVybiAoYSAhPSArYSlcbiAgICAgICAgICAgID8gYiAhPSArYlxuICAgICAgICAgICAgLy8gYnV0IHRyZWF0IGArMGAgdnMuIGAtMGAgYXMgbm90IGVxdWFsXG4gICAgICAgICAgICA6IChhID09IDAgPyAoMSAvIGEgPT0gMSAvIGIpIDogYSA9PSArYik7XG5cbiAgICAgICAgY2FzZSByZWdleHBDbGFzczpcbiAgICAgICAgY2FzZSBzdHJpbmdDbGFzczpcbiAgICAgICAgICAvLyBjb2VyY2UgcmVnZXhlcyB0byBzdHJpbmdzIChodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjEwLjYuNClcbiAgICAgICAgICAvLyB0cmVhdCBzdHJpbmcgcHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3QgaW5zdGFuY2VzIGFzIGVxdWFsXG4gICAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgfVxuICAgICAgdmFyIGlzQXJyID0gY2xhc3NOYW1lID09IGFycmF5Q2xhc3M7XG4gICAgICBpZiAoIWlzQXJyKSB7XG4gICAgICAgIC8vIHVud3JhcCBhbnkgYGxvZGFzaGAgd3JhcHBlZCB2YWx1ZXNcbiAgICAgICAgdmFyIGFXcmFwcGVkID0gaGFzT3duUHJvcGVydHkuY2FsbChhLCAnX193cmFwcGVkX18nKSxcbiAgICAgICAgICAgIGJXcmFwcGVkID0gaGFzT3duUHJvcGVydHkuY2FsbChiLCAnX193cmFwcGVkX18nKTtcblxuICAgICAgICBpZiAoYVdyYXBwZWQgfHwgYldyYXBwZWQpIHtcbiAgICAgICAgICByZXR1cm4gYmFzZUlzRXF1YWwoYVdyYXBwZWQgPyBhLl9fd3JhcHBlZF9fIDogYSwgYldyYXBwZWQgPyBiLl9fd3JhcHBlZF9fIDogYiwgY2FsbGJhY2ssIGlzV2hlcmUsIHN0YWNrQSwgc3RhY2tCKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBleGl0IGZvciBmdW5jdGlvbnMgYW5kIERPTSBub2Rlc1xuICAgICAgICBpZiAoY2xhc3NOYW1lICE9IG9iamVjdENsYXNzKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGluIG9sZGVyIHZlcnNpb25zIG9mIE9wZXJhLCBgYXJndW1lbnRzYCBvYmplY3RzIGhhdmUgYEFycmF5YCBjb25zdHJ1Y3RvcnNcbiAgICAgICAgdmFyIGN0b3JBID0gYS5jb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIGN0b3JCID0gYi5jb25zdHJ1Y3RvcjtcblxuICAgICAgICAvLyBub24gYE9iamVjdGAgb2JqZWN0IGluc3RhbmNlcyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVhbFxuICAgICAgICBpZiAoY3RvckEgIT0gY3RvckIgJiZcbiAgICAgICAgICAgICAgIShpc0Z1bmN0aW9uKGN0b3JBKSAmJiBjdG9yQSBpbnN0YW5jZW9mIGN0b3JBICYmIGlzRnVuY3Rpb24oY3RvckIpICYmIGN0b3JCIGluc3RhbmNlb2YgY3RvckIpICYmXG4gICAgICAgICAgICAgICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBhc3N1bWUgY3ljbGljIHN0cnVjdHVyZXMgYXJlIGVxdWFsXG4gICAgICAvLyB0aGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMVxuICAgICAgLy8gc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYCAoaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS4xMi4zKVxuICAgICAgdmFyIGluaXRlZFN0YWNrID0gIXN0YWNrQTtcbiAgICAgIHN0YWNrQSB8fCAoc3RhY2tBID0gZ2V0QXJyYXkoKSk7XG4gICAgICBzdGFja0IgfHwgKHN0YWNrQiA9IGdldEFycmF5KCkpO1xuXG4gICAgICB2YXIgbGVuZ3RoID0gc3RhY2tBLmxlbmd0aDtcbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICBpZiAoc3RhY2tBW2xlbmd0aF0gPT0gYSkge1xuICAgICAgICAgIHJldHVybiBzdGFja0JbbGVuZ3RoXSA9PSBiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgc2l6ZSA9IDA7XG4gICAgICByZXN1bHQgPSB0cnVlO1xuXG4gICAgICAvLyBhZGQgYGFgIGFuZCBgYmAgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzXG4gICAgICBzdGFja0EucHVzaChhKTtcbiAgICAgIHN0YWNrQi5wdXNoKGIpO1xuXG4gICAgICAvLyByZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpXG4gICAgICBpZiAoaXNBcnIpIHtcbiAgICAgICAgLy8gY29tcGFyZSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnlcbiAgICAgICAgbGVuZ3RoID0gYS5sZW5ndGg7XG4gICAgICAgIHNpemUgPSBiLmxlbmd0aDtcbiAgICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBsZW5ndGg7XG5cbiAgICAgICAgaWYgKHJlc3VsdCB8fCBpc1doZXJlKSB7XG4gICAgICAgICAgLy8gZGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllc1xuICAgICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGxlbmd0aCxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGJbc2l6ZV07XG5cbiAgICAgICAgICAgIGlmIChpc1doZXJlKSB7XG4gICAgICAgICAgICAgIHdoaWxlIChpbmRleC0tKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXN1bHQgPSBiYXNlSXNFcXVhbChhW2luZGV4XSwgdmFsdWUsIGNhbGxiYWNrLCBpc1doZXJlLCBzdGFja0EsIHN0YWNrQikpKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShyZXN1bHQgPSBiYXNlSXNFcXVhbChhW3NpemVdLCB2YWx1ZSwgY2FsbGJhY2ssIGlzV2hlcmUsIHN0YWNrQSwgc3RhY2tCKSkpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgLy8gZGVlcCBjb21wYXJlIG9iamVjdHMgdXNpbmcgYGZvckluYCwgaW5zdGVhZCBvZiBgZm9yT3duYCwgdG8gYXZvaWQgYE9iamVjdC5rZXlzYFxuICAgICAgICAvLyB3aGljaCwgaW4gdGhpcyBjYXNlLCBpcyBtb3JlIGNvc3RseVxuICAgICAgICBmb3JJbihiLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBiKSB7XG4gICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwoYiwga2V5KSkge1xuICAgICAgICAgICAgLy8gY291bnQgdGhlIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgICAgLy8gZGVlcCBjb21wYXJlIGVhY2ggcHJvcGVydHkgdmFsdWUuXG4gICAgICAgICAgICByZXR1cm4gKHJlc3VsdCA9IGhhc093blByb3BlcnR5LmNhbGwoYSwga2V5KSAmJiBiYXNlSXNFcXVhbChhW2tleV0sIHZhbHVlLCBjYWxsYmFjaywgaXNXaGVyZSwgc3RhY2tBLCBzdGFja0IpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXN1bHQgJiYgIWlzV2hlcmUpIHtcbiAgICAgICAgICAvLyBlbnN1cmUgYm90aCBvYmplY3RzIGhhdmUgdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXNcbiAgICAgICAgICBmb3JJbihhLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBhKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChhLCBrZXkpKSB7XG4gICAgICAgICAgICAgIC8vIGBzaXplYCB3aWxsIGJlIGAtMWAgaWYgYGFgIGhhcyBtb3JlIHByb3BlcnRpZXMgdGhhbiBgYmBcbiAgICAgICAgICAgICAgcmV0dXJuIChyZXN1bHQgPSAtLXNpemUgPiAtMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN0YWNrQS5wb3AoKTtcbiAgICAgIHN0YWNrQi5wb3AoKTtcblxuICAgICAgaWYgKGluaXRlZFN0YWNrKSB7XG4gICAgICAgIHJlbGVhc2VBcnJheShzdGFja0EpO1xuICAgICAgICByZWxlYXNlQXJyYXkoc3RhY2tCKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ubWVyZ2VgIHdpdGhvdXQgYXJndW1lbnQganVnZ2xpbmcgb3Igc3VwcG9ydFxuICAgICAqIGZvciBgdGhpc0FyZ2AgYmluZGluZy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2UgVGhlIHNvdXJjZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIG1lcmdpbmcgcHJvcGVydGllcy5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tBPVtdXSBUcmFja3MgdHJhdmVyc2VkIHNvdXJjZSBvYmplY3RzLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0I9W11dIEFzc29jaWF0ZXMgdmFsdWVzIHdpdGggc291cmNlIGNvdW50ZXJwYXJ0cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlTWVyZ2Uob2JqZWN0LCBzb3VyY2UsIGNhbGxiYWNrLCBzdGFja0EsIHN0YWNrQikge1xuICAgICAgKGlzQXJyYXkoc291cmNlKSA/IGZvckVhY2ggOiBmb3JPd24pKHNvdXJjZSwgZnVuY3Rpb24oc291cmNlLCBrZXkpIHtcbiAgICAgICAgdmFyIGZvdW5kLFxuICAgICAgICAgICAgaXNBcnIsXG4gICAgICAgICAgICByZXN1bHQgPSBzb3VyY2UsXG4gICAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtrZXldO1xuXG4gICAgICAgIGlmIChzb3VyY2UgJiYgKChpc0FyciA9IGlzQXJyYXkoc291cmNlKSkgfHwgaXNQbGFpbk9iamVjdChzb3VyY2UpKSkge1xuICAgICAgICAgIC8vIGF2b2lkIG1lcmdpbmcgcHJldmlvdXNseSBtZXJnZWQgY3ljbGljIHNvdXJjZXNcbiAgICAgICAgICB2YXIgc3RhY2tMZW5ndGggPSBzdGFja0EubGVuZ3RoO1xuICAgICAgICAgIHdoaWxlIChzdGFja0xlbmd0aC0tKSB7XG4gICAgICAgICAgICBpZiAoKGZvdW5kID0gc3RhY2tBW3N0YWNrTGVuZ3RoXSA9PSBzb3VyY2UpKSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gc3RhY2tCW3N0YWNrTGVuZ3RoXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIHZhciBpc1NoYWxsb3c7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gY2FsbGJhY2sodmFsdWUsIHNvdXJjZSk7XG4gICAgICAgICAgICAgIGlmICgoaXNTaGFsbG93ID0gdHlwZW9mIHJlc3VsdCAhPSAndW5kZWZpbmVkJykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpc1NoYWxsb3cpIHtcbiAgICAgICAgICAgICAgdmFsdWUgPSBpc0FyclxuICAgICAgICAgICAgICAgID8gKGlzQXJyYXkodmFsdWUpID8gdmFsdWUgOiBbXSlcbiAgICAgICAgICAgICAgICA6IChpc1BsYWluT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDoge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYWRkIGBzb3VyY2VgIGFuZCBhc3NvY2lhdGVkIGB2YWx1ZWAgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzXG4gICAgICAgICAgICBzdGFja0EucHVzaChzb3VyY2UpO1xuICAgICAgICAgICAgc3RhY2tCLnB1c2godmFsdWUpO1xuXG4gICAgICAgICAgICAvLyByZWN1cnNpdmVseSBtZXJnZSBvYmplY3RzIGFuZCBhcnJheXMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKVxuICAgICAgICAgICAgaWYgKCFpc1NoYWxsb3cpIHtcbiAgICAgICAgICAgICAgYmFzZU1lcmdlKHZhbHVlLCBzb3VyY2UsIGNhbGxiYWNrLCBzdGFja0EsIHN0YWNrQik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmVzdWx0ID0gY2FsbGJhY2sodmFsdWUsIHNvdXJjZSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3VsdCA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICByZXN1bHQgPSBzb3VyY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnJhbmRvbWAgd2l0aG91dCBhcmd1bWVudCBqdWdnbGluZyBvciBzdXBwb3J0XG4gICAgICogZm9yIHJldHVybmluZyBmbG9hdGluZy1wb2ludCBudW1iZXJzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWluIFRoZSBtaW5pbXVtIHBvc3NpYmxlIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXggVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUuXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyBhIHJhbmRvbSBudW1iZXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZVJhbmRvbShtaW4sIG1heCkge1xuICAgICAgcmV0dXJuIG1pbiArIGZsb29yKG5hdGl2ZVJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy51bmlxYCB3aXRob3V0IHN1cHBvcnQgZm9yIGNhbGxiYWNrIHNob3J0aGFuZHNcbiAgICAgKiBvciBgdGhpc0FyZ2AgYmluZGluZy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHByb2Nlc3MuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbaXNTb3J0ZWQ9ZmFsc2VdIEEgZmxhZyB0byBpbmRpY2F0ZSB0aGF0IGBhcnJheWAgaXMgc29ydGVkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIGR1cGxpY2F0ZS12YWx1ZS1mcmVlIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhc2VVbmlxKGFycmF5LCBpc1NvcnRlZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGluZGV4T2YgPSBnZXRJbmRleE9mKCksXG4gICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgICB2YXIgaXNMYXJnZSA9ICFpc1NvcnRlZCAmJiBsZW5ndGggPj0gbGFyZ2VBcnJheVNpemUgJiYgaW5kZXhPZiA9PT0gYmFzZUluZGV4T2YsXG4gICAgICAgICAgc2VlbiA9IChjYWxsYmFjayB8fCBpc0xhcmdlKSA/IGdldEFycmF5KCkgOiByZXN1bHQ7XG5cbiAgICAgIGlmIChpc0xhcmdlKSB7XG4gICAgICAgIHZhciBjYWNoZSA9IGNyZWF0ZUNhY2hlKHNlZW4pO1xuICAgICAgICBpbmRleE9mID0gY2FjaGVJbmRleE9mO1xuICAgICAgICBzZWVuID0gY2FjaGU7XG4gICAgICB9XG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF0sXG4gICAgICAgICAgICBjb21wdXRlZCA9IGNhbGxiYWNrID8gY2FsbGJhY2sodmFsdWUsIGluZGV4LCBhcnJheSkgOiB2YWx1ZTtcblxuICAgICAgICBpZiAoaXNTb3J0ZWRcbiAgICAgICAgICAgICAgPyAhaW5kZXggfHwgc2VlbltzZWVuLmxlbmd0aCAtIDFdICE9PSBjb21wdXRlZFxuICAgICAgICAgICAgICA6IGluZGV4T2Yoc2VlbiwgY29tcHV0ZWQpIDwgMFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrIHx8IGlzTGFyZ2UpIHtcbiAgICAgICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGlzTGFyZ2UpIHtcbiAgICAgICAgcmVsZWFzZUFycmF5KHNlZW4uYXJyYXkpO1xuICAgICAgICByZWxlYXNlT2JqZWN0KHNlZW4pO1xuICAgICAgfSBlbHNlIGlmIChjYWxsYmFjaykge1xuICAgICAgICByZWxlYXNlQXJyYXkoc2Vlbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IGFnZ3JlZ2F0ZXMgYSBjb2xsZWN0aW9uLCBjcmVhdGluZyBhbiBvYmplY3QgY29tcG9zZWRcbiAgICAgKiBvZiBrZXlzIGdlbmVyYXRlZCBmcm9tIHRoZSByZXN1bHRzIG9mIHJ1bm5pbmcgZWFjaCBlbGVtZW50IG9mIHRoZSBjb2xsZWN0aW9uXG4gICAgICogdGhyb3VnaCBhIGNhbGxiYWNrLiBUaGUgZ2l2ZW4gYHNldHRlcmAgZnVuY3Rpb24gc2V0cyB0aGUga2V5cyBhbmQgdmFsdWVzXG4gICAgICogb2YgdGhlIGNvbXBvc2VkIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gc2V0dGVyIFRoZSBzZXR0ZXIgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYWdncmVnYXRvciBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVBZ2dyZWdhdG9yKHNldHRlcikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMDtcblxuICAgICAgICBpZiAodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICAgIHNldHRlcihyZXN1bHQsIHZhbHVlLCBjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pLCBjb2xsZWN0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgIHNldHRlcihyZXN1bHQsIHZhbHVlLCBjYWxsYmFjayh2YWx1ZSwga2V5LCBjb2xsZWN0aW9uKSwgY29sbGVjdGlvbik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCBlaXRoZXIgY3VycmllcyBvciBpbnZva2VzIGBmdW5jYFxuICAgICAqIHdpdGggYW4gb3B0aW9uYWwgYHRoaXNgIGJpbmRpbmcgYW5kIHBhcnRpYWxseSBhcHBsaWVkIGFyZ3VtZW50cy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxzdHJpbmd9IGZ1bmMgVGhlIGZ1bmN0aW9uIG9yIG1ldGhvZCBuYW1lIHRvIHJlZmVyZW5jZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYml0bWFzayBUaGUgYml0bWFzayBvZiBtZXRob2QgZmxhZ3MgdG8gY29tcG9zZS5cbiAgICAgKiAgVGhlIGJpdG1hc2sgbWF5IGJlIGNvbXBvc2VkIG9mIHRoZSBmb2xsb3dpbmcgZmxhZ3M6XG4gICAgICogIDEgLSBgXy5iaW5kYFxuICAgICAqICAyIC0gYF8uYmluZEtleWBcbiAgICAgKiAgNCAtIGBfLmN1cnJ5YFxuICAgICAqICA4IC0gYF8uY3VycnlgIChib3VuZClcbiAgICAgKiAgMTYgLSBgXy5wYXJ0aWFsYFxuICAgICAqICAzMiAtIGBfLnBhcnRpYWxSaWdodGBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbcGFydGlhbEFyZ3NdIEFuIGFycmF5IG9mIGFyZ3VtZW50cyB0byBwcmVwZW5kIHRvIHRob3NlXG4gICAgICogIHByb3ZpZGVkIHRvIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3BhcnRpYWxSaWdodEFyZ3NdIEFuIGFycmF5IG9mIGFyZ3VtZW50cyB0byBhcHBlbmQgdG8gdGhvc2VcbiAgICAgKiAgcHJvdmlkZWQgdG8gdGhlIG5ldyBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbYXJpdHldIFRoZSBhcml0eSBvZiBgZnVuY2AuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlV3JhcHBlcihmdW5jLCBiaXRtYXNrLCBwYXJ0aWFsQXJncywgcGFydGlhbFJpZ2h0QXJncywgdGhpc0FyZywgYXJpdHkpIHtcbiAgICAgIHZhciBpc0JpbmQgPSBiaXRtYXNrICYgMSxcbiAgICAgICAgICBpc0JpbmRLZXkgPSBiaXRtYXNrICYgMixcbiAgICAgICAgICBpc0N1cnJ5ID0gYml0bWFzayAmIDQsXG4gICAgICAgICAgaXNDdXJyeUJvdW5kID0gYml0bWFzayAmIDgsXG4gICAgICAgICAgaXNQYXJ0aWFsID0gYml0bWFzayAmIDE2LFxuICAgICAgICAgIGlzUGFydGlhbFJpZ2h0ID0gYml0bWFzayAmIDMyO1xuXG4gICAgICBpZiAoIWlzQmluZEtleSAmJiAhaXNGdW5jdGlvbihmdW5jKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgfVxuICAgICAgaWYgKGlzUGFydGlhbCAmJiAhcGFydGlhbEFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIGJpdG1hc2sgJj0gfjE2O1xuICAgICAgICBpc1BhcnRpYWwgPSBwYXJ0aWFsQXJncyA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGlzUGFydGlhbFJpZ2h0ICYmICFwYXJ0aWFsUmlnaHRBcmdzLmxlbmd0aCkge1xuICAgICAgICBiaXRtYXNrICY9IH4zMjtcbiAgICAgICAgaXNQYXJ0aWFsUmlnaHQgPSBwYXJ0aWFsUmlnaHRBcmdzID0gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgYmluZERhdGEgPSBmdW5jICYmIGZ1bmMuX19iaW5kRGF0YV9fO1xuICAgICAgaWYgKGJpbmREYXRhICYmIGJpbmREYXRhICE9PSB0cnVlKSB7XG4gICAgICAgIC8vIGNsb25lIGBiaW5kRGF0YWBcbiAgICAgICAgYmluZERhdGEgPSBzbGljZShiaW5kRGF0YSk7XG4gICAgICAgIGlmIChiaW5kRGF0YVsyXSkge1xuICAgICAgICAgIGJpbmREYXRhWzJdID0gc2xpY2UoYmluZERhdGFbMl0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiaW5kRGF0YVszXSkge1xuICAgICAgICAgIGJpbmREYXRhWzNdID0gc2xpY2UoYmluZERhdGFbM10pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNldCBgdGhpc0JpbmRpbmdgIGlzIG5vdCBwcmV2aW91c2x5IGJvdW5kXG4gICAgICAgIGlmIChpc0JpbmQgJiYgIShiaW5kRGF0YVsxXSAmIDEpKSB7XG4gICAgICAgICAgYmluZERhdGFbNF0gPSB0aGlzQXJnO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNldCBpZiBwcmV2aW91c2x5IGJvdW5kIGJ1dCBub3QgY3VycmVudGx5IChzdWJzZXF1ZW50IGN1cnJpZWQgZnVuY3Rpb25zKVxuICAgICAgICBpZiAoIWlzQmluZCAmJiBiaW5kRGF0YVsxXSAmIDEpIHtcbiAgICAgICAgICBiaXRtYXNrIHw9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0IGN1cnJpZWQgYXJpdHkgaWYgbm90IHlldCBzZXRcbiAgICAgICAgaWYgKGlzQ3VycnkgJiYgIShiaW5kRGF0YVsxXSAmIDQpKSB7XG4gICAgICAgICAgYmluZERhdGFbNV0gPSBhcml0eTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhcHBlbmQgcGFydGlhbCBsZWZ0IGFyZ3VtZW50c1xuICAgICAgICBpZiAoaXNQYXJ0aWFsKSB7XG4gICAgICAgICAgcHVzaC5hcHBseShiaW5kRGF0YVsyXSB8fCAoYmluZERhdGFbMl0gPSBbXSksIHBhcnRpYWxBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhcHBlbmQgcGFydGlhbCByaWdodCBhcmd1bWVudHNcbiAgICAgICAgaWYgKGlzUGFydGlhbFJpZ2h0KSB7XG4gICAgICAgICAgdW5zaGlmdC5hcHBseShiaW5kRGF0YVszXSB8fCAoYmluZERhdGFbM10gPSBbXSksIHBhcnRpYWxSaWdodEFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIG1lcmdlIGZsYWdzXG4gICAgICAgIGJpbmREYXRhWzFdIHw9IGJpdG1hc2s7XG4gICAgICAgIHJldHVybiBjcmVhdGVXcmFwcGVyLmFwcGx5KG51bGwsIGJpbmREYXRhKTtcbiAgICAgIH1cbiAgICAgIC8vIGZhc3QgcGF0aCBmb3IgYF8uYmluZGBcbiAgICAgIHZhciBjcmVhdGVyID0gKGJpdG1hc2sgPT0gMSB8fCBiaXRtYXNrID09PSAxNykgPyBiYXNlQmluZCA6IGJhc2VDcmVhdGVXcmFwcGVyO1xuICAgICAgcmV0dXJuIGNyZWF0ZXIoW2Z1bmMsIGJpdG1hc2ssIHBhcnRpYWxBcmdzLCBwYXJ0aWFsUmlnaHRBcmdzLCB0aGlzQXJnLCBhcml0eV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVzZWQgYnkgYGVzY2FwZWAgdG8gY29udmVydCBjaGFyYWN0ZXJzIHRvIEhUTUwgZW50aXRpZXMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtYXRjaCBUaGUgbWF0Y2hlZCBjaGFyYWN0ZXIgdG8gZXNjYXBlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVzY2FwZUh0bWxDaGFyKG1hdGNoKSB7XG4gICAgICByZXR1cm4gaHRtbEVzY2FwZXNbbWF0Y2hdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGFwcHJvcHJpYXRlIFwiaW5kZXhPZlwiIGZ1bmN0aW9uLiBJZiB0aGUgYF8uaW5kZXhPZmAgbWV0aG9kIGlzXG4gICAgICogY3VzdG9taXplZCwgdGhpcyBtZXRob2QgcmV0dXJucyB0aGUgY3VzdG9tIG1ldGhvZCwgb3RoZXJ3aXNlIGl0IHJldHVybnNcbiAgICAgKiB0aGUgYGJhc2VJbmRleE9mYCBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBcImluZGV4T2ZcIiBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRJbmRleE9mKCkge1xuICAgICAgdmFyIHJlc3VsdCA9IChyZXN1bHQgPSBsb2Rhc2guaW5kZXhPZikgPT09IGluZGV4T2YgPyBiYXNlSW5kZXhPZiA6IHJlc3VsdDtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTmF0aXZlKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbicgJiYgcmVOYXRpdmUudGVzdCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBgdGhpc2AgYmluZGluZyBkYXRhIG9uIGEgZ2l2ZW4gZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHNldCBkYXRhIG9uLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlIFRoZSBkYXRhIGFycmF5IHRvIHNldC5cbiAgICAgKi9cbiAgICB2YXIgc2V0QmluZERhdGEgPSAhZGVmaW5lUHJvcGVydHkgPyBub29wIDogZnVuY3Rpb24oZnVuYywgdmFsdWUpIHtcbiAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSB2YWx1ZTtcbiAgICAgIGRlZmluZVByb3BlcnR5KGZ1bmMsICdfX2JpbmREYXRhX18nLCBkZXNjcmlwdG9yKTtcbiAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBudWxsO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uIG9mIGBpc1BsYWluT2JqZWN0YCB3aGljaCBjaGVja3MgaWYgYSBnaXZlbiB2YWx1ZVxuICAgICAqIGlzIGFuIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBgT2JqZWN0YCBjb25zdHJ1Y3RvciwgYXNzdW1pbmcgb2JqZWN0cyBjcmVhdGVkXG4gICAgICogYnkgdGhlIGBPYmplY3RgIGNvbnN0cnVjdG9yIGhhdmUgbm8gaW5oZXJpdGVkIGVudW1lcmFibGUgcHJvcGVydGllcyBhbmQgdGhhdFxuICAgICAqIHRoZXJlIGFyZSBubyBgT2JqZWN0LnByb3RvdHlwZWAgZXh0ZW5zaW9ucy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaGltSXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICAgICAgdmFyIGN0b3IsXG4gICAgICAgICAgcmVzdWx0O1xuXG4gICAgICAvLyBhdm9pZCBub24gT2JqZWN0IG9iamVjdHMsIGBhcmd1bWVudHNgIG9iamVjdHMsIGFuZCBET00gZWxlbWVudHNcbiAgICAgIGlmICghKHZhbHVlICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IG9iamVjdENsYXNzKSB8fFxuICAgICAgICAgIChjdG9yID0gdmFsdWUuY29uc3RydWN0b3IsIGlzRnVuY3Rpb24oY3RvcikgJiYgIShjdG9yIGluc3RhbmNlb2YgY3RvcikpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEluIG1vc3QgZW52aXJvbm1lbnRzIGFuIG9iamVjdCdzIG93biBwcm9wZXJ0aWVzIGFyZSBpdGVyYXRlZCBiZWZvcmVcbiAgICAgIC8vIGl0cyBpbmhlcml0ZWQgcHJvcGVydGllcy4gSWYgdGhlIGxhc3QgaXRlcmF0ZWQgcHJvcGVydHkgaXMgYW4gb2JqZWN0J3NcbiAgICAgIC8vIG93biBwcm9wZXJ0eSB0aGVuIHRoZXJlIGFyZSBubyBpbmhlcml0ZWQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzLlxuICAgICAgZm9ySW4odmFsdWUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmVzdWx0ID0ga2V5O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHlwZW9mIHJlc3VsdCA9PSAndW5kZWZpbmVkJyB8fCBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCByZXN1bHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVzZWQgYnkgYHVuZXNjYXBlYCB0byBjb252ZXJ0IEhUTUwgZW50aXRpZXMgdG8gY2hhcmFjdGVycy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byB1bmVzY2FwZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSB1bmVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuZXNjYXBlSHRtbENoYXIobWF0Y2gpIHtcbiAgICAgIHJldHVybiBodG1sVW5lc2NhcGVzW21hdGNoXTtcbiAgICB9XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFuIGBhcmd1bWVudHNgIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGFuIGBhcmd1bWVudHNgIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAoZnVuY3Rpb24oKSB7IHJldHVybiBfLmlzQXJndW1lbnRzKGFyZ3VtZW50cyk7IH0pKDEsIDIsIDMpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNBcmd1bWVudHMoWzEsIDIsIDNdKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT0gJ251bWJlcicgJiZcbiAgICAgICAgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gYXJnc0NsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhbiBhcnJheSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAoZnVuY3Rpb24oKSB7IHJldHVybiBfLmlzQXJyYXkoYXJndW1lbnRzKTsgfSkoKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc0FycmF5KFsxLCAyLCAzXSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIHZhciBpc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09ICdudW1iZXInICYmXG4gICAgICAgIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MgfHwgZmFsc2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24gb2YgYE9iamVjdC5rZXlzYCB3aGljaCBwcm9kdWNlcyBhbiBhcnJheSBvZiB0aGVcbiAgICAgKiBnaXZlbiBvYmplY3QncyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gICAgICovXG4gICAgdmFyIHNoaW1LZXlzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gb2JqZWN0LCByZXN1bHQgPSBbXTtcbiAgICAgIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gICAgICBpZiAoIShvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0XSkpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGZvciAoaW5kZXggaW4gaXRlcmFibGUpIHtcbiAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChpdGVyYWJsZSwgaW5kZXgpKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChpbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgY29tcG9zZWQgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGFuIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmtleXMoeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSk7XG4gICAgICogLy8gPT4gWydvbmUnLCAndHdvJywgJ3RocmVlJ10gKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICovXG4gICAgdmFyIGtleXMgPSAhbmF0aXZlS2V5cyA/IHNoaW1LZXlzIDogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICBpZiAoIWlzT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZUtleXMob2JqZWN0KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXNlZCB0byBjb252ZXJ0IGNoYXJhY3RlcnMgdG8gSFRNTCBlbnRpdGllczpcbiAgICAgKlxuICAgICAqIFRob3VnaCB0aGUgYD5gIGNoYXJhY3RlciBpcyBlc2NhcGVkIGZvciBzeW1tZXRyeSwgY2hhcmFjdGVycyBsaWtlIGA+YCBhbmQgYC9gXG4gICAgICogZG9uJ3QgcmVxdWlyZSBlc2NhcGluZyBpbiBIVE1MIGFuZCBoYXZlIG5vIHNwZWNpYWwgbWVhbmluZyB1bmxlc3MgdGhleSdyZSBwYXJ0XG4gICAgICogb2YgYSB0YWcgb3IgYW4gdW5xdW90ZWQgYXR0cmlidXRlIHZhbHVlLlxuICAgICAqIGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2FtYmlndW91cy1hbXBlcnNhbmRzICh1bmRlciBcInNlbWktcmVsYXRlZCBmdW4gZmFjdFwiKVxuICAgICAqL1xuICAgIHZhciBodG1sRXNjYXBlcyA9IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiMzOTsnXG4gICAgfTtcblxuICAgIC8qKiBVc2VkIHRvIGNvbnZlcnQgSFRNTCBlbnRpdGllcyB0byBjaGFyYWN0ZXJzICovXG4gICAgdmFyIGh0bWxVbmVzY2FwZXMgPSBpbnZlcnQoaHRtbEVzY2FwZXMpO1xuXG4gICAgLyoqIFVzZWQgdG8gbWF0Y2ggSFRNTCBlbnRpdGllcyBhbmQgSFRNTCBjaGFyYWN0ZXJzICovXG4gICAgdmFyIHJlRXNjYXBlZEh0bWwgPSBSZWdFeHAoJygnICsga2V5cyhodG1sVW5lc2NhcGVzKS5qb2luKCd8JykgKyAnKScsICdnJyksXG4gICAgICAgIHJlVW5lc2NhcGVkSHRtbCA9IFJlZ0V4cCgnWycgKyBrZXlzKGh0bWxFc2NhcGVzKS5qb2luKCcnKSArICddJywgJ2cnKTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQXNzaWducyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3QocykgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICogb2JqZWN0LiBTdWJzZXF1ZW50IHNvdXJjZXMgd2lsbCBvdmVyd3JpdGUgcHJvcGVydHkgYXNzaWdubWVudHMgb2YgcHJldmlvdXNcbiAgICAgKiBzb3VyY2VzLiBJZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgZXhlY3V0ZWQgdG8gcHJvZHVjZSB0aGVcbiAgICAgKiBhc3NpZ25lZCB2YWx1ZXMuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0d29cbiAgICAgKiBhcmd1bWVudHM7IChvYmplY3RWYWx1ZSwgc291cmNlVmFsdWUpLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAYWxpYXMgZXh0ZW5kXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQHBhcmFtIHsuLi5PYmplY3R9IFtzb3VyY2VdIFRoZSBzb3VyY2Ugb2JqZWN0cy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgYXNzaWduaW5nIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uYXNzaWduKHsgJ25hbWUnOiAnZnJlZCcgfSwgeyAnZW1wbG95ZXInOiAnc2xhdGUnIH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdlbXBsb3llcic6ICdzbGF0ZScgfVxuICAgICAqXG4gICAgICogdmFyIGRlZmF1bHRzID0gXy5wYXJ0aWFsUmlnaHQoXy5hc3NpZ24sIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgKiAgIHJldHVybiB0eXBlb2YgYSA9PSAndW5kZWZpbmVkJyA/IGIgOiBhO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnYmFybmV5JyB9O1xuICAgICAqIGRlZmF1bHRzKG9iamVjdCwgeyAnbmFtZSc6ICdmcmVkJywgJ2VtcGxveWVyJzogJ3NsYXRlJyB9KTtcbiAgICAgKiAvLyA9PiB7ICduYW1lJzogJ2Jhcm5leScsICdlbXBsb3llcic6ICdzbGF0ZScgfVxuICAgICAqL1xuICAgIHZhciBhc3NpZ24gPSBmdW5jdGlvbihvYmplY3QsIHNvdXJjZSwgZ3VhcmQpIHtcbiAgICAgIHZhciBpbmRleCwgaXRlcmFibGUgPSBvYmplY3QsIHJlc3VsdCA9IGl0ZXJhYmxlO1xuICAgICAgaWYgKCFpdGVyYWJsZSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGFyZ3NJbmRleCA9IDAsXG4gICAgICAgICAgYXJnc0xlbmd0aCA9IHR5cGVvZiBndWFyZCA9PSAnbnVtYmVyJyA/IDIgOiBhcmdzLmxlbmd0aDtcbiAgICAgIGlmIChhcmdzTGVuZ3RoID4gMyAmJiB0eXBlb2YgYXJnc1thcmdzTGVuZ3RoIC0gMl0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBiYXNlQ3JlYXRlQ2FsbGJhY2soYXJnc1stLWFyZ3NMZW5ndGggLSAxXSwgYXJnc1thcmdzTGVuZ3RoLS1dLCAyKTtcbiAgICAgIH0gZWxzZSBpZiAoYXJnc0xlbmd0aCA+IDIgJiYgdHlwZW9mIGFyZ3NbYXJnc0xlbmd0aCAtIDFdID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBhcmdzWy0tYXJnc0xlbmd0aF07XG4gICAgICB9XG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIGl0ZXJhYmxlID0gYXJnc1thcmdzSW5kZXhdO1xuICAgICAgICBpZiAoaXRlcmFibGUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSkge1xuICAgICAgICB2YXIgb3duSW5kZXggPSAtMSxcbiAgICAgICAgICAgIG93blByb3BzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSAmJiBrZXlzKGl0ZXJhYmxlKSxcbiAgICAgICAgICAgIGxlbmd0aCA9IG93blByb3BzID8gb3duUHJvcHMubGVuZ3RoIDogMDtcblxuICAgICAgICB3aGlsZSAoKytvd25JbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGluZGV4ID0gb3duUHJvcHNbb3duSW5kZXhdO1xuICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBjYWxsYmFjayA/IGNhbGxiYWNrKHJlc3VsdFtpbmRleF0sIGl0ZXJhYmxlW2luZGV4XSkgOiBpdGVyYWJsZVtpbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgY2xvbmUgb2YgYHZhbHVlYC4gSWYgYGlzRGVlcGAgaXMgYHRydWVgIG5lc3RlZCBvYmplY3RzIHdpbGwgYWxzb1xuICAgICAqIGJlIGNsb25lZCwgb3RoZXJ3aXNlIHRoZXkgd2lsbCBiZSBhc3NpZ25lZCBieSByZWZlcmVuY2UuIElmIGEgY2FsbGJhY2tcbiAgICAgKiBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIHRvIHByb2R1Y2UgdGhlIGNsb25lZCB2YWx1ZXMuIElmIHRoZVxuICAgICAqIGNhbGxiYWNrIHJldHVybnMgYHVuZGVmaW5lZGAgY2xvbmluZyB3aWxsIGJlIGhhbmRsZWQgYnkgdGhlIG1ldGhvZCBpbnN0ZWFkLlxuICAgICAqIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCBvbmUgYXJndW1lbnQ7ICh2YWx1ZSkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNsb25lLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzRGVlcD1mYWxzZV0gU3BlY2lmeSBhIGRlZXAgY2xvbmUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNsb25pbmcgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBjbG9uZWQgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogdmFyIHNoYWxsb3cgPSBfLmNsb25lKGNoYXJhY3RlcnMpO1xuICAgICAqIHNoYWxsb3dbMF0gPT09IGNoYXJhY3RlcnNbMF07XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogdmFyIGRlZXAgPSBfLmNsb25lKGNoYXJhY3RlcnMsIHRydWUpO1xuICAgICAqIGRlZXBbMF0gPT09IGNoYXJhY3RlcnNbMF07XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKlxuICAgICAqIF8ubWl4aW4oe1xuICAgICAqICAgJ2Nsb25lJzogXy5wYXJ0aWFsUmlnaHQoXy5jbG9uZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgKiAgICAgcmV0dXJuIF8uaXNFbGVtZW50KHZhbHVlKSA/IHZhbHVlLmNsb25lTm9kZShmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgICogICB9KVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogdmFyIGNsb25lID0gXy5jbG9uZShkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBjbG9uZS5jaGlsZE5vZGVzLmxlbmd0aDtcbiAgICAgKiAvLyA9PiAwXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2xvbmUodmFsdWUsIGlzRGVlcCwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIC8vIGFsbG93cyB3b3JraW5nIHdpdGggXCJDb2xsZWN0aW9uc1wiIG1ldGhvZHMgd2l0aG91dCB1c2luZyB0aGVpciBgaW5kZXhgXG4gICAgICAvLyBhbmQgYGNvbGxlY3Rpb25gIGFyZ3VtZW50cyBmb3IgYGlzRGVlcGAgYW5kIGBjYWxsYmFja2BcbiAgICAgIGlmICh0eXBlb2YgaXNEZWVwICE9ICdib29sZWFuJyAmJiBpc0RlZXAgIT0gbnVsbCkge1xuICAgICAgICB0aGlzQXJnID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gaXNEZWVwO1xuICAgICAgICBpc0RlZXAgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBiYXNlQ2xvbmUodmFsdWUsIGlzRGVlcCwgdHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicgJiYgYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAxKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGRlZXAgY2xvbmUgb2YgYHZhbHVlYC4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCBpdCB3aWxsIGJlXG4gICAgICogZXhlY3V0ZWQgdG8gcHJvZHVjZSB0aGUgY2xvbmVkIHZhbHVlcy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgYHVuZGVmaW5lZGBcbiAgICAgKiBjbG9uaW5nIHdpbGwgYmUgaGFuZGxlZCBieSB0aGUgbWV0aG9kIGluc3RlYWQuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0b1xuICAgICAqIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIG9uZSBhcmd1bWVudDsgKHZhbHVlKS5cbiAgICAgKlxuICAgICAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGxvb3NlbHkgYmFzZWQgb24gdGhlIHN0cnVjdHVyZWQgY2xvbmUgYWxnb3JpdGhtLiBGdW5jdGlvbnNcbiAgICAgKiBhbmQgRE9NIG5vZGVzIGFyZSAqKm5vdCoqIGNsb25lZC4gVGhlIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBgYXJndW1lbnRzYCBvYmplY3RzIGFuZFxuICAgICAqIG9iamVjdHMgY3JlYXRlZCBieSBjb25zdHJ1Y3RvcnMgb3RoZXIgdGhhbiBgT2JqZWN0YCBhcmUgY2xvbmVkIHRvIHBsYWluIGBPYmplY3RgIG9iamVjdHMuXG4gICAgICogU2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL2h0bWw1L2luZnJhc3RydWN0dXJlLmh0bWwjaW50ZXJuYWwtc3RydWN0dXJlZC1jbG9uaW5nLWFsZ29yaXRobS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gZGVlcCBjbG9uZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgY2xvbmluZyB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGRlZXAgY2xvbmVkIHZhbHVlLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIHZhciBkZWVwID0gXy5jbG9uZURlZXAoY2hhcmFjdGVycyk7XG4gICAgICogZGVlcFswXSA9PT0gY2hhcmFjdGVyc1swXTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogdmFyIHZpZXcgPSB7XG4gICAgICogICAnbGFiZWwnOiAnZG9jcycsXG4gICAgICogICAnbm9kZSc6IGVsZW1lbnRcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGNsb25lID0gXy5jbG9uZURlZXAodmlldywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgKiAgIHJldHVybiBfLmlzRWxlbWVudCh2YWx1ZSkgPyB2YWx1ZS5jbG9uZU5vZGUodHJ1ZSkgOiB1bmRlZmluZWQ7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBjbG9uZS5ub2RlID09IHZpZXcubm9kZTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNsb25lRGVlcCh2YWx1ZSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHJldHVybiBiYXNlQ2xvbmUodmFsdWUsIHRydWUsIHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nICYmIGJhc2VDcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGUgZ2l2ZW4gYHByb3RvdHlwZWAgb2JqZWN0LiBJZiBhXG4gICAgICogYHByb3BlcnRpZXNgIG9iamVjdCBpcyBwcm92aWRlZCBpdHMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBhcmUgYXNzaWduZWRcbiAgICAgKiB0byB0aGUgY3JlYXRlZCBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b3R5cGUgVGhlIG9iamVjdCB0byBpbmhlcml0IGZyb20uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtwcm9wZXJ0aWVzXSBUaGUgcHJvcGVydGllcyB0byBhc3NpZ24gdG8gdGhlIG9iamVjdC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBmdW5jdGlvbiBTaGFwZSgpIHtcbiAgICAgKiAgIHRoaXMueCA9IDA7XG4gICAgICogICB0aGlzLnkgPSAwO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIENpcmNsZSgpIHtcbiAgICAgKiAgIFNoYXBlLmNhbGwodGhpcyk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogQ2lyY2xlLnByb3RvdHlwZSA9IF8uY3JlYXRlKFNoYXBlLnByb3RvdHlwZSwgeyAnY29uc3RydWN0b3InOiBDaXJjbGUgfSk7XG4gICAgICpcbiAgICAgKiB2YXIgY2lyY2xlID0gbmV3IENpcmNsZTtcbiAgICAgKiBjaXJjbGUgaW5zdGFuY2VvZiBDaXJjbGU7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogY2lyY2xlIGluc3RhbmNlb2YgU2hhcGU7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZShwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBiYXNlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICByZXR1cm4gcHJvcGVydGllcyA/IGFzc2lnbihyZXN1bHQsIHByb3BlcnRpZXMpIDogcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFzc2lnbnMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBzb3VyY2Ugb2JqZWN0KHMpIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAqIG9iamVjdCBmb3IgYWxsIGRlc3RpbmF0aW9uIHByb3BlcnRpZXMgdGhhdCByZXNvbHZlIHRvIGB1bmRlZmluZWRgLiBPbmNlIGFcbiAgICAgKiBwcm9wZXJ0eSBpcyBzZXQsIGFkZGl0aW9uYWwgZGVmYXVsdHMgb2YgdGhlIHNhbWUgcHJvcGVydHkgd2lsbCBiZSBpZ25vcmVkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gW3NvdXJjZV0gVGhlIHNvdXJjZSBvYmplY3RzLlxuICAgICAqIEBwYXJhbS0ge09iamVjdH0gW2d1YXJkXSBBbGxvd3Mgd29ya2luZyB3aXRoIGBfLnJlZHVjZWAgd2l0aG91dCB1c2luZyBpdHNcbiAgICAgKiAgYGtleWAgYW5kIGBvYmplY3RgIGFyZ3VtZW50cyBhcyBzb3VyY2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnYmFybmV5JyB9O1xuICAgICAqIF8uZGVmYXVsdHMob2JqZWN0LCB7ICduYW1lJzogJ2ZyZWQnLCAnZW1wbG95ZXInOiAnc2xhdGUnIH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnYmFybmV5JywgJ2VtcGxveWVyJzogJ3NsYXRlJyB9XG4gICAgICovXG4gICAgdmFyIGRlZmF1bHRzID0gZnVuY3Rpb24ob2JqZWN0LCBzb3VyY2UsIGd1YXJkKSB7XG4gICAgICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gb2JqZWN0LCByZXN1bHQgPSBpdGVyYWJsZTtcbiAgICAgIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAgICBhcmdzSW5kZXggPSAwLFxuICAgICAgICAgIGFyZ3NMZW5ndGggPSB0eXBlb2YgZ3VhcmQgPT0gJ251bWJlcicgPyAyIDogYXJncy5sZW5ndGg7XG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIGl0ZXJhYmxlID0gYXJnc1thcmdzSW5kZXhdO1xuICAgICAgICBpZiAoaXRlcmFibGUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSkge1xuICAgICAgICB2YXIgb3duSW5kZXggPSAtMSxcbiAgICAgICAgICAgIG93blByb3BzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSAmJiBrZXlzKGl0ZXJhYmxlKSxcbiAgICAgICAgICAgIGxlbmd0aCA9IG93blByb3BzID8gb3duUHJvcHMubGVuZ3RoIDogMDtcblxuICAgICAgICB3aGlsZSAoKytvd25JbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGluZGV4ID0gb3duUHJvcHNbb3duSW5kZXhdO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0W2luZGV4XSA9PSAndW5kZWZpbmVkJykgcmVzdWx0W2luZGV4XSA9IGl0ZXJhYmxlW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZmluZEluZGV4YCBleGNlcHQgdGhhdCBpdCByZXR1cm5zIHRoZSBrZXkgb2YgdGhlXG4gICAgICogZmlyc3QgZWxlbWVudCB0aGF0IHBhc3NlcyB0aGUgY2FsbGJhY2sgY2hlY2ssIGluc3RlYWQgb2YgdGhlIGVsZW1lbnQgaXRzZWxmLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBzZWFyY2guXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyXG4gICAgICogIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG9cbiAgICAgKiAgY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH0gUmV0dXJucyB0aGUga2V5IG9mIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGB1bmRlZmluZWRgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgKiAgICdiYXJuZXknOiB7ICAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfSxcbiAgICAgKiAgICdmcmVkJzogeyAgICAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9LFxuICAgICAqICAgJ3BlYmJsZXMnOiB7ICdhZ2UnOiAxLCAgJ2Jsb2NrZWQnOiBmYWxzZSB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8uZmluZEtleShjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHtcbiAgICAgKiAgIHJldHVybiBjaHIuYWdlIDwgNDA7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gJ2Jhcm5leScgKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmZpbmRLZXkoY2hhcmFjdGVycywgeyAnYWdlJzogMSB9KTtcbiAgICAgKiAvLyA9PiAncGViYmxlcydcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZEtleShjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+ICdmcmVkJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRLZXkob2JqZWN0LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIGZvck93bihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGtleSwgb2JqZWN0KSkge1xuICAgICAgICAgIHJlc3VsdCA9IGtleTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmZpbmRLZXlgIGV4Y2VwdCB0aGF0IGl0IGl0ZXJhdGVzIG92ZXIgZWxlbWVudHNcbiAgICAgKiBvZiBhIGBjb2xsZWN0aW9uYCBpbiB0aGUgb3Bwb3NpdGUgb3JkZXIuXG4gICAgICpcbiAgICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLnBsdWNrXCIgc3R5bGVcbiAgICAgKiBjYWxsYmFjayB3aWxsIHJldHVybiB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBJZiBhbiBvYmplY3QgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4gb2JqZWN0LFxuICAgICAqIGVsc2UgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXJcbiAgICAgKiAgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZCB0b1xuICAgICAqICBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfSBSZXR1cm5zIHRoZSBrZXkgb2YgdGhlIGZvdW5kIGVsZW1lbnQsIGVsc2UgYHVuZGVmaW5lZGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0ge1xuICAgICAqICAgJ2Jhcm5leSc6IHsgICdhZ2UnOiAzNiwgJ2Jsb2NrZWQnOiB0cnVlIH0sXG4gICAgICogICAnZnJlZCc6IHsgICAgJ2FnZSc6IDQwLCAnYmxvY2tlZCc6IGZhbHNlIH0sXG4gICAgICogICAncGViYmxlcyc6IHsgJ2FnZSc6IDEsICAnYmxvY2tlZCc6IHRydWUgfVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLmZpbmRMYXN0S2V5KGNoYXJhY3RlcnMsIGZ1bmN0aW9uKGNocikge1xuICAgICAqICAgcmV0dXJuIGNoci5hZ2UgPCA0MDtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiByZXR1cm5zIGBwZWJibGVzYCwgYXNzdW1pbmcgYF8uZmluZEtleWAgcmV0dXJucyBgYmFybmV5YFxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5maW5kTGFzdEtleShjaGFyYWN0ZXJzLCB7ICdhZ2UnOiA0MCB9KTtcbiAgICAgKiAvLyA9PiAnZnJlZCdcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZExhc3RLZXkoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiAncGViYmxlcydcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kTGFzdEtleShvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgZm9yT3duUmlnaHQob2JqZWN0LCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmplY3QpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKHZhbHVlLCBrZXksIG9iamVjdCkpIHtcbiAgICAgICAgICByZXN1bHQgPSBrZXk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0LFxuICAgICAqIGV4ZWN1dGluZyB0aGUgY2FsbGJhY2sgZm9yIGVhY2ggcHJvcGVydHkuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2BcbiAgICAgKiBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czsgKHZhbHVlLCBrZXksIG9iamVjdCkuIENhbGxiYWNrcyBtYXkgZXhpdFxuICAgICAqIGl0ZXJhdGlvbiBlYXJseSBieSBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogZnVuY3Rpb24gU2hhcGUoKSB7XG4gICAgICogICB0aGlzLnggPSAwO1xuICAgICAqICAgdGhpcy55ID0gMDtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBTaGFwZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgKiAgIHRoaXMueCArPSB4O1xuICAgICAqICAgdGhpcy55ICs9IHk7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8uZm9ySW4obmV3IFNoYXBlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICogICBjb25zb2xlLmxvZyhrZXkpO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IGxvZ3MgJ3gnLCAneScsIGFuZCAnbW92ZScgKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICovXG4gICAgdmFyIGZvckluID0gZnVuY3Rpb24oY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpbmRleCwgaXRlcmFibGUgPSBjb2xsZWN0aW9uLCByZXN1bHQgPSBpdGVyYWJsZTtcbiAgICAgIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gICAgICBpZiAoIW9iamVjdFR5cGVzW3R5cGVvZiBpdGVyYWJsZV0pIHJldHVybiByZXN1bHQ7XG4gICAgICBjYWxsYmFjayA9IGNhbGxiYWNrICYmIHR5cGVvZiB0aGlzQXJnID09ICd1bmRlZmluZWQnID8gY2FsbGJhY2sgOiBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICBmb3IgKGluZGV4IGluIGl0ZXJhYmxlKSB7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKGl0ZXJhYmxlW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pID09PSBmYWxzZSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmZvckluYCBleGNlcHQgdGhhdCBpdCBpdGVyYXRlcyBvdmVyIGVsZW1lbnRzXG4gICAgICogb2YgYSBgY29sbGVjdGlvbmAgaW4gdGhlIG9wcG9zaXRlIG9yZGVyLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIFNoYXBlKCkge1xuICAgICAqICAgdGhpcy54ID0gMDtcbiAgICAgKiAgIHRoaXMueSA9IDA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogU2hhcGUucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICogICB0aGlzLnggKz0geDtcbiAgICAgKiAgIHRoaXMueSArPSB5O1xuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLmZvckluUmlnaHQobmV3IFNoYXBlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICogICBjb25zb2xlLmxvZyhrZXkpO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IGxvZ3MgJ21vdmUnLCAneScsIGFuZCAneCcgYXNzdW1pbmcgYF8uZm9ySW4gYCBsb2dzICd4JywgJ3knLCBhbmQgJ21vdmUnXG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9ySW5SaWdodChvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcGFpcnMgPSBbXTtcblxuICAgICAgZm9ySW4ob2JqZWN0LCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHBhaXJzLnB1c2goa2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGxlbmd0aCA9IHBhaXJzLmxlbmd0aDtcbiAgICAgIGNhbGxiYWNrID0gYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICBpZiAoY2FsbGJhY2socGFpcnNbbGVuZ3RoLS1dLCBwYWlyc1tsZW5ndGhdLCBvYmplY3QpID09PSBmYWxzZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGVzIG92ZXIgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBhbiBvYmplY3QsIGV4ZWN1dGluZyB0aGUgY2FsbGJhY2tcbiAgICAgKiBmb3IgZWFjaCBwcm9wZXJ0eS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlXG4gICAgICogYXJndW1lbnRzOyAodmFsdWUsIGtleSwgb2JqZWN0KS4gQ2FsbGJhY2tzIG1heSBleGl0IGl0ZXJhdGlvbiBlYXJseSBieVxuICAgICAqIGV4cGxpY2l0bHkgcmV0dXJuaW5nIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmZvck93bih7ICcwJzogJ3plcm8nLCAnMSc6ICdvbmUnLCAnbGVuZ3RoJzogMiB9LCBmdW5jdGlvbihudW0sIGtleSkge1xuICAgICAqICAgY29uc29sZS5sb2coa2V5KTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBsb2dzICcwJywgJzEnLCBhbmQgJ2xlbmd0aCcgKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICovXG4gICAgdmFyIGZvck93biA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gY29sbGVjdGlvbiwgcmVzdWx0ID0gaXRlcmFibGU7XG4gICAgICBpZiAoIWl0ZXJhYmxlKSByZXR1cm4gcmVzdWx0O1xuICAgICAgaWYgKCFvYmplY3RUeXBlc1t0eXBlb2YgaXRlcmFibGVdKSByZXR1cm4gcmVzdWx0O1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayAmJiB0eXBlb2YgdGhpc0FyZyA9PSAndW5kZWZpbmVkJyA/IGNhbGxiYWNrIDogYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgICAgdmFyIG93bkluZGV4ID0gLTEsXG4gICAgICAgICAgICBvd25Qcm9wcyA9IG9iamVjdFR5cGVzW3R5cGVvZiBpdGVyYWJsZV0gJiYga2V5cyhpdGVyYWJsZSksXG4gICAgICAgICAgICBsZW5ndGggPSBvd25Qcm9wcyA/IG93blByb3BzLmxlbmd0aCA6IDA7XG5cbiAgICAgICAgd2hpbGUgKCsrb3duSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBpbmRleCA9IG93blByb3BzW293bkluZGV4XTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2soaXRlcmFibGVbaW5kZXhdLCBpbmRleCwgY29sbGVjdGlvbikgPT09IGZhbHNlKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZm9yT3duYCBleGNlcHQgdGhhdCBpdCBpdGVyYXRlcyBvdmVyIGVsZW1lbnRzXG4gICAgICogb2YgYSBgY29sbGVjdGlvbmAgaW4gdGhlIG9wcG9zaXRlIG9yZGVyLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZm9yT3duUmlnaHQoeyAnMCc6ICd6ZXJvJywgJzEnOiAnb25lJywgJ2xlbmd0aCc6IDIgfSwgZnVuY3Rpb24obnVtLCBrZXkpIHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGtleSk7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gbG9ncyAnbGVuZ3RoJywgJzEnLCBhbmQgJzAnIGFzc3VtaW5nIGBfLmZvck93bmAgbG9ncyAnMCcsICcxJywgYW5kICdsZW5ndGgnXG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9yT3duUmlnaHQob2JqZWN0LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgICAgY2FsbGJhY2sgPSBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIHZhciBrZXkgPSBwcm9wc1tsZW5ndGhdO1xuICAgICAgICBpZiAoY2FsbGJhY2sob2JqZWN0W2tleV0sIGtleSwgb2JqZWN0KSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc29ydGVkIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzIG9mIGFsbCBlbnVtZXJhYmxlIHByb3BlcnRpZXMsXG4gICAgICogb3duIGFuZCBpbmhlcml0ZWQsIG9mIGBvYmplY3RgIHRoYXQgaGF2ZSBmdW5jdGlvbiB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgbWV0aG9kc1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzIHRoYXQgaGF2ZSBmdW5jdGlvbiB2YWx1ZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZnVuY3Rpb25zKF8pO1xuICAgICAqIC8vID0+IFsnYWxsJywgJ2FueScsICdiaW5kJywgJ2JpbmRBbGwnLCAnY2xvbmUnLCAnY29tcGFjdCcsICdjb21wb3NlJywgLi4uXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZ1bmN0aW9ucyhvYmplY3QpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIGZvckluKG9iamVjdCwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQuc29ydCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgc3BlY2lmaWVkIHByb3BlcnR5IG5hbWUgZXhpc3RzIGFzIGEgZGlyZWN0IHByb3BlcnR5IG9mIGBvYmplY3RgLFxuICAgICAqIGluc3RlYWQgb2YgYW4gaW5oZXJpdGVkIHByb3BlcnR5LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYga2V5IGlzIGEgZGlyZWN0IHByb3BlcnR5LCBlbHNlIGBmYWxzZWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uaGFzKHsgJ2EnOiAxLCAnYic6IDIsICdjJzogMyB9LCAnYicpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXMob2JqZWN0LCBrZXkpIHtcbiAgICAgIHJldHVybiBvYmplY3QgPyBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSA6IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JqZWN0IGNvbXBvc2VkIG9mIHRoZSBpbnZlcnRlZCBrZXlzIGFuZCB2YWx1ZXMgb2YgdGhlIGdpdmVuIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGludmVydC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBjcmVhdGVkIGludmVydGVkIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pbnZlcnQoeyAnZmlyc3QnOiAnZnJlZCcsICdzZWNvbmQnOiAnYmFybmV5JyB9KTtcbiAgICAgKiAvLyA9PiB7ICdmcmVkJzogJ2ZpcnN0JywgJ2Jhcm5leSc6ICdzZWNvbmQnIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnZlcnQob2JqZWN0KSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBwcm9wcyA9IGtleXMob2JqZWN0KSxcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGgsXG4gICAgICAgICAgcmVzdWx0ID0ge307XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF07XG4gICAgICAgIHJlc3VsdFtvYmplY3Rba2V5XV0gPSBrZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgYm9vbGVhbiB2YWx1ZS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgYm9vbGVhbiB2YWx1ZSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzQm9vbGVhbihudWxsKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQm9vbGVhbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSBmYWxzZSB8fFxuICAgICAgICB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gYm9vbENsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgZGF0ZS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgZGF0ZSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzRGF0ZShuZXcgRGF0ZSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PSBkYXRlQ2xhc3MgfHwgZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgRE9NIGVsZW1lbnQsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc0VsZW1lbnQoZG9jdW1lbnQuYm9keSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRWxlbWVudCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHZhbHVlLm5vZGVUeXBlID09PSAxIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGVtcHR5LiBBcnJheXMsIHN0cmluZ3MsIG9yIGBhcmd1bWVudHNgIG9iamVjdHMgd2l0aCBhXG4gICAgICogbGVuZ3RoIG9mIGAwYCBhbmQgb2JqZWN0cyB3aXRoIG5vIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMgYXJlIGNvbnNpZGVyZWRcbiAgICAgKiBcImVtcHR5XCIuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gdmFsdWUgVGhlIHZhbHVlIHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGVtcHR5LCBlbHNlIGBmYWxzZWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uaXNFbXB0eShbMSwgMiwgM10pO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmlzRW1wdHkoe30pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNFbXB0eSgnJyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwodmFsdWUpLFxuICAgICAgICAgIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcblxuICAgICAgaWYgKChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcyB8fCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IGFyZ3NDbGFzcyApIHx8XG4gICAgICAgICAgKGNsYXNzTmFtZSA9PSBvYmplY3RDbGFzcyAmJiB0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGlzRnVuY3Rpb24odmFsdWUuc3BsaWNlKSkpIHtcbiAgICAgICAgcmV0dXJuICFsZW5ndGg7XG4gICAgICB9XG4gICAgICBmb3JPd24odmFsdWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gKHJlc3VsdCA9IGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBiZXR3ZWVuIHR3byB2YWx1ZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZXkgYXJlXG4gICAgICogZXF1aXZhbGVudCB0byBlYWNoIG90aGVyLiBJZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgZXhlY3V0ZWRcbiAgICAgKiB0byBjb21wYXJlIHZhbHVlcy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgYHVuZGVmaW5lZGAgY29tcGFyaXNvbnMgd2lsbFxuICAgICAqIGJlIGhhbmRsZWQgYnkgdGhlIG1ldGhvZCBpbnN0ZWFkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZFxuICAgICAqIGludm9rZWQgd2l0aCB0d28gYXJndW1lbnRzOyAoYSwgYikuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gYSBUaGUgdmFsdWUgdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0geyp9IGIgVGhlIG90aGVyIHZhbHVlIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmluZyB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnZnJlZCcgfTtcbiAgICAgKiB2YXIgY29weSA9IHsgJ25hbWUnOiAnZnJlZCcgfTtcbiAgICAgKlxuICAgICAqIG9iamVjdCA9PSBjb3B5O1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmlzRXF1YWwob2JqZWN0LCBjb3B5KTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICpcbiAgICAgKiB2YXIgd29yZHMgPSBbJ2hlbGxvJywgJ2dvb2RieWUnXTtcbiAgICAgKiB2YXIgb3RoZXJXb3JkcyA9IFsnaGknLCAnZ29vZGJ5ZSddO1xuICAgICAqXG4gICAgICogXy5pc0VxdWFsKHdvcmRzLCBvdGhlcldvcmRzLCBmdW5jdGlvbihhLCBiKSB7XG4gICAgICogICB2YXIgcmVHcmVldCA9IC9eKD86aGVsbG98aGkpJC9pLFxuICAgICAqICAgICAgIGFHcmVldCA9IF8uaXNTdHJpbmcoYSkgJiYgcmVHcmVldC50ZXN0KGEpLFxuICAgICAqICAgICAgIGJHcmVldCA9IF8uaXNTdHJpbmcoYikgJiYgcmVHcmVldC50ZXN0KGIpO1xuICAgICAqXG4gICAgICogICByZXR1cm4gKGFHcmVldCB8fCBiR3JlZXQpID8gKGFHcmVldCA9PSBiR3JlZXQpIDogdW5kZWZpbmVkO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0VxdWFsKGEsIGIsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICByZXR1cm4gYmFzZUlzRXF1YWwoYSwgYiwgdHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicgJiYgYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAyKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMsIG9yIGNhbiBiZSBjb2VyY2VkIHRvLCBhIGZpbml0ZSBudW1iZXIuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGlzIGlzIG5vdCB0aGUgc2FtZSBhcyBuYXRpdmUgYGlzRmluaXRlYCB3aGljaCB3aWxsIHJldHVybiB0cnVlIGZvclxuICAgICAqIGJvb2xlYW5zIGFuZCBlbXB0eSBzdHJpbmdzLiBTZWUgaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS4xLjIuNS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGZpbml0ZSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzRmluaXRlKC0xMDEpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNGaW5pdGUoJzEwJyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5pc0Zpbml0ZSh0cnVlKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc0Zpbml0ZSgnJyk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKlxuICAgICAqIF8uaXNGaW5pdGUoSW5maW5pdHkpO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNGaW5pdGUodmFsdWUpIHtcbiAgICAgIHJldHVybiBuYXRpdmVJc0Zpbml0ZSh2YWx1ZSkgJiYgIW5hdGl2ZUlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzRnVuY3Rpb24oXyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgbGFuZ3VhZ2UgdHlwZSBvZiBPYmplY3QuXG4gICAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc09iamVjdCh7fSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNPYmplY3QoMSk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAgICAgLy8gY2hlY2sgaWYgdGhlIHZhbHVlIGlzIHRoZSBFQ01BU2NyaXB0IGxhbmd1YWdlIHR5cGUgb2YgT2JqZWN0XG4gICAgICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDhcbiAgICAgIC8vIGFuZCBhdm9pZCBhIFY4IGJ1Z1xuICAgICAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MVxuICAgICAgcmV0dXJuICEhKHZhbHVlICYmIG9iamVjdFR5cGVzW3R5cGVvZiB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGBOYU5gLlxuICAgICAqXG4gICAgICogTm90ZTogVGhpcyBpcyBub3QgdGhlIHNhbWUgYXMgbmF0aXZlIGBpc05hTmAgd2hpY2ggd2lsbCByZXR1cm4gYHRydWVgIGZvclxuICAgICAqIGB1bmRlZmluZWRgIGFuZCBvdGhlciBub24tbnVtZXJpYyB2YWx1ZXMuIFNlZSBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjEuMi40LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYE5hTmAsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc05hTihOYU4pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNOYU4obmV3IE51bWJlcihOYU4pKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICpcbiAgICAgKiBpc05hTih1bmRlZmluZWQpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNOYU4odW5kZWZpbmVkKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTmFOKHZhbHVlKSB7XG4gICAgICAvLyBgTmFOYCBhcyBhIHByaW1pdGl2ZSBpcyB0aGUgb25seSB2YWx1ZSB0aGF0IGlzIG5vdCBlcXVhbCB0byBpdHNlbGZcbiAgICAgIC8vIChwZXJmb3JtIHRoZSBbW0NsYXNzXV0gY2hlY2sgZmlyc3QgdG8gYXZvaWQgZXJyb3JzIHdpdGggc29tZSBob3N0IG9iamVjdHMgaW4gSUUpXG4gICAgICByZXR1cm4gaXNOdW1iZXIodmFsdWUpICYmIHZhbHVlICE9ICt2YWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBgbnVsbGAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBgbnVsbGAsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc051bGwobnVsbCk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5pc051bGwodW5kZWZpbmVkKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTnVsbCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbnVtYmVyLlxuICAgICAqXG4gICAgICogTm90ZTogYE5hTmAgaXMgY29uc2lkZXJlZCBhIG51bWJlci4gU2VlIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4OC41LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBudW1iZXIsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc051bWJlcig4LjQgKiA1KTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgfHxcbiAgICAgICAgdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IG51bWJlckNsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogZnVuY3Rpb24gU2hhcGUoKSB7XG4gICAgICogICB0aGlzLnggPSAwO1xuICAgICAqICAgdGhpcy55ID0gMDtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBfLmlzUGxhaW5PYmplY3QobmV3IFNoYXBlKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc1BsYWluT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKlxuICAgICAqIF8uaXNQbGFpbk9iamVjdCh7ICd4JzogMCwgJ3knOiAwIH0pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICB2YXIgaXNQbGFpbk9iamVjdCA9ICFnZXRQcm90b3R5cGVPZiA/IHNoaW1Jc1BsYWluT2JqZWN0IDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghKHZhbHVlICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IG9iamVjdENsYXNzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWVPZiA9IHZhbHVlLnZhbHVlT2YsXG4gICAgICAgICAgb2JqUHJvdG8gPSBpc05hdGl2ZSh2YWx1ZU9mKSAmJiAob2JqUHJvdG8gPSBnZXRQcm90b3R5cGVPZih2YWx1ZU9mKSkgJiYgZ2V0UHJvdG90eXBlT2Yob2JqUHJvdG8pO1xuXG4gICAgICByZXR1cm4gb2JqUHJvdG9cbiAgICAgICAgPyAodmFsdWUgPT0gb2JqUHJvdG8gfHwgZ2V0UHJvdG90eXBlT2YodmFsdWUpID09IG9ialByb3RvKVxuICAgICAgICA6IHNoaW1Jc1BsYWluT2JqZWN0KHZhbHVlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbiwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzUmVnRXhwKC9mcmVkLyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzUmVnRXhwKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IHJlZ2V4cENsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgc3RyaW5nLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBzdHJpbmcsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc1N0cmluZygnZnJlZCcpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJyB8fFxuICAgICAgICB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3RyaW5nQ2xhc3MgfHwgZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYHVuZGVmaW5lZGAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBgdW5kZWZpbmVkYCwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzVW5kZWZpbmVkKHZvaWQgMCk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICd1bmRlZmluZWQnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUga2V5cyBhcyBgb2JqZWN0YCBhbmQgdmFsdWVzIGdlbmVyYXRlZCBieVxuICAgICAqIHJ1bm5pbmcgZWFjaCBvd24gZW51bWVyYWJsZSBwcm9wZXJ0eSBvZiBgb2JqZWN0YCB0aHJvdWdoIHRoZSBjYWxsYmFjay5cbiAgICAgKiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzO1xuICAgICAqICh2YWx1ZSwga2V5LCBvYmplY3QpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgb2JqZWN0IHdpdGggdmFsdWVzIG9mIHRoZSByZXN1bHRzIG9mIGVhY2ggYGNhbGxiYWNrYCBleGVjdXRpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWFwVmFsdWVzKHsgJ2EnOiAxLCAnYic6IDIsICdjJzogM30gLCBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSAqIDM7IH0pO1xuICAgICAqIC8vID0+IHsgJ2EnOiAzLCAnYic6IDYsICdjJzogOSB9XG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgKiAgICdmcmVkJzogeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH0sXG4gICAgICogICAncGViYmxlcyc6IHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5tYXBWYWx1ZXMoY2hhcmFjdGVycywgJ2FnZScpO1xuICAgICAqIC8vID0+IHsgJ2ZyZWQnOiA0MCwgJ3BlYmJsZXMnOiAxIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtYXBWYWx1ZXMob2JqZWN0LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICBmb3JPd24ob2JqZWN0LCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmplY3QpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBjYWxsYmFjayh2YWx1ZSwga2V5LCBvYmplY3QpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mIHRoZSBzb3VyY2Ugb2JqZWN0KHMpLCB0aGF0XG4gICAgICogZG9uJ3QgcmVzb2x2ZSB0byBgdW5kZWZpbmVkYCBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuIFN1YnNlcXVlbnQgc291cmNlc1xuICAgICAqIHdpbGwgb3ZlcndyaXRlIHByb3BlcnR5IGFzc2lnbm1lbnRzIG9mIHByZXZpb3VzIHNvdXJjZXMuIElmIGEgY2FsbGJhY2sgaXNcbiAgICAgKiBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIHRvIHByb2R1Y2UgdGhlIG1lcmdlZCB2YWx1ZXMgb2YgdGhlIGRlc3RpbmF0aW9uXG4gICAgICogYW5kIHNvdXJjZSBwcm9wZXJ0aWVzLiBJZiB0aGUgY2FsbGJhY2sgcmV0dXJucyBgdW5kZWZpbmVkYCBtZXJnaW5nIHdpbGxcbiAgICAgKiBiZSBoYW5kbGVkIGJ5IHRoZSBtZXRob2QgaW5zdGVhZC4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmRcbiAgICAgKiBpbnZva2VkIHdpdGggdHdvIGFyZ3VtZW50czsgKG9iamVjdFZhbHVlLCBzb3VyY2VWYWx1ZSkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gW3NvdXJjZV0gVGhlIHNvdXJjZSBvYmplY3RzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBtZXJnaW5nIHByb3BlcnRpZXMuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgbmFtZXMgPSB7XG4gICAgICogICAnY2hhcmFjdGVycyc6IFtcbiAgICAgKiAgICAgeyAnbmFtZSc6ICdiYXJuZXknIH0sXG4gICAgICogICAgIHsgJ25hbWUnOiAnZnJlZCcgfVxuICAgICAqICAgXVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiB2YXIgYWdlcyA9IHtcbiAgICAgKiAgICdjaGFyYWN0ZXJzJzogW1xuICAgICAqICAgICB7ICdhZ2UnOiAzNiB9LFxuICAgICAqICAgICB7ICdhZ2UnOiA0MCB9XG4gICAgICogICBdXG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8ubWVyZ2UobmFtZXMsIGFnZXMpO1xuICAgICAqIC8vID0+IHsgJ2NoYXJhY3RlcnMnOiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSwgeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH1dIH1cbiAgICAgKlxuICAgICAqIHZhciBmb29kID0ge1xuICAgICAqICAgJ2ZydWl0cyc6IFsnYXBwbGUnXSxcbiAgICAgKiAgICd2ZWdldGFibGVzJzogWydiZWV0J11cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIG90aGVyRm9vZCA9IHtcbiAgICAgKiAgICdmcnVpdHMnOiBbJ2JhbmFuYSddLFxuICAgICAqICAgJ3ZlZ2V0YWJsZXMnOiBbJ2NhcnJvdCddXG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8ubWVyZ2UoZm9vZCwgb3RoZXJGb29kLCBmdW5jdGlvbihhLCBiKSB7XG4gICAgICogICByZXR1cm4gXy5pc0FycmF5KGEpID8gYS5jb25jYXQoYikgOiB1bmRlZmluZWQ7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnZnJ1aXRzJzogWydhcHBsZScsICdiYW5hbmEnXSwgJ3ZlZ2V0YWJsZXMnOiBbJ2JlZXQnLCAnY2Fycm90XSB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2Uob2JqZWN0KSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAgICBsZW5ndGggPSAyO1xuXG4gICAgICBpZiAoIWlzT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cbiAgICAgIC8vIGFsbG93cyB3b3JraW5nIHdpdGggYF8ucmVkdWNlYCBhbmQgYF8ucmVkdWNlUmlnaHRgIHdpdGhvdXQgdXNpbmdcbiAgICAgIC8vIHRoZWlyIGBpbmRleGAgYW5kIGBjb2xsZWN0aW9uYCBhcmd1bWVudHNcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSAhPSAnbnVtYmVyJykge1xuICAgICAgICBsZW5ndGggPSBhcmdzLmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmIChsZW5ndGggPiAzICYmIHR5cGVvZiBhcmdzW2xlbmd0aCAtIDJdID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYmFzZUNyZWF0ZUNhbGxiYWNrKGFyZ3NbLS1sZW5ndGggLSAxXSwgYXJnc1tsZW5ndGgtLV0sIDIpO1xuICAgICAgfSBlbHNlIGlmIChsZW5ndGggPiAyICYmIHR5cGVvZiBhcmdzW2xlbmd0aCAtIDFdID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBhcmdzWy0tbGVuZ3RoXTtcbiAgICAgIH1cbiAgICAgIHZhciBzb3VyY2VzID0gc2xpY2UoYXJndW1lbnRzLCAxLCBsZW5ndGgpLFxuICAgICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgICAgc3RhY2tBID0gZ2V0QXJyYXkoKSxcbiAgICAgICAgICBzdGFja0IgPSBnZXRBcnJheSgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICBiYXNlTWVyZ2Uob2JqZWN0LCBzb3VyY2VzW2luZGV4XSwgY2FsbGJhY2ssIHN0YWNrQSwgc3RhY2tCKTtcbiAgICAgIH1cbiAgICAgIHJlbGVhc2VBcnJheShzdGFja0EpO1xuICAgICAgcmVsZWFzZUFycmF5KHN0YWNrQik7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzaGFsbG93IGNsb25lIG9mIGBvYmplY3RgIGV4Y2x1ZGluZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICogUHJvcGVydHkgbmFtZXMgbWF5IGJlIHNwZWNpZmllZCBhcyBpbmRpdmlkdWFsIGFyZ3VtZW50cyBvciBhcyBhcnJheXMgb2ZcbiAgICAgKiBwcm9wZXJ0eSBuYW1lcy4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIGZvciBlYWNoXG4gICAgICogcHJvcGVydHkgb2YgYG9iamVjdGAgb21pdHRpbmcgdGhlIHByb3BlcnRpZXMgdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXlcbiAgICAgKiBmb3IuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7XG4gICAgICogKHZhbHVlLCBrZXksIG9iamVjdCkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIHNvdXJjZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnwuLi5zdHJpbmd8c3RyaW5nW119IFtjYWxsYmFja10gVGhlIHByb3BlcnRpZXMgdG8gb21pdCBvciB0aGVcbiAgICAgKiAgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhbiBvYmplY3Qgd2l0aG91dCB0aGUgb21pdHRlZCBwcm9wZXJ0aWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLm9taXQoeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH0sICdhZ2UnKTtcbiAgICAgKiAvLyA9PiB7ICduYW1lJzogJ2ZyZWQnIH1cbiAgICAgKlxuICAgICAqIF8ub21pdCh7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgKiAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcic7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdmcmVkJyB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gb21pdChvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHByb3BzID0gW107XG4gICAgICAgIGZvckluKG9iamVjdCwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgIHByb3BzLnB1c2goa2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb3BzID0gYmFzZURpZmZlcmVuY2UocHJvcHMsIGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgZmFsc2UsIDEpKTtcblxuICAgICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF07XG4gICAgICAgICAgcmVzdWx0W2tleV0gPSBvYmplY3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICBmb3JJbihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgICAgIGlmICghY2FsbGJhY2sodmFsdWUsIGtleSwgb2JqZWN0KSkge1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgdHdvIGRpbWVuc2lvbmFsIGFycmF5IG9mIGFuIG9iamVjdCdzIGtleS12YWx1ZSBwYWlycyxcbiAgICAgKiBpLmUuIGBbW2tleTEsIHZhbHVlMV0sIFtrZXkyLCB2YWx1ZTJdXWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpbnNwZWN0LlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBuZXcgYXJyYXkgb2Yga2V5LXZhbHVlIHBhaXJzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnBhaXJzKHsgJ2Jhcm5leSc6IDM2LCAnZnJlZCc6IDQwIH0pO1xuICAgICAqIC8vID0+IFtbJ2Jhcm5leScsIDM2XSwgWydmcmVkJywgNDBdXSAocHJvcGVydHkgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgYWNyb3NzIGVudmlyb25tZW50cylcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwYWlycyhvYmplY3QpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgICByZXN1bHRbaW5kZXhdID0gW2tleSwgb2JqZWN0W2tleV1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc2hhbGxvdyBjbG9uZSBvZiBgb2JqZWN0YCBjb21wb3NlZCBvZiB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICogUHJvcGVydHkgbmFtZXMgbWF5IGJlIHNwZWNpZmllZCBhcyBpbmRpdmlkdWFsIGFyZ3VtZW50cyBvciBhcyBhcnJheXMgb2ZcbiAgICAgKiBwcm9wZXJ0eSBuYW1lcy4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIGZvciBlYWNoXG4gICAgICogcHJvcGVydHkgb2YgYG9iamVjdGAgcGlja2luZyB0aGUgcHJvcGVydGllcyB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleVxuICAgICAqIGZvci4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50cztcbiAgICAgKiAodmFsdWUsIGtleSwgb2JqZWN0KS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgc291cmNlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufC4uLnN0cmluZ3xzdHJpbmdbXX0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlclxuICAgICAqICBpdGVyYXRpb24gb3IgcHJvcGVydHkgbmFtZXMgdG8gcGljaywgc3BlY2lmaWVkIGFzIGluZGl2aWR1YWwgcHJvcGVydHlcbiAgICAgKiAgbmFtZXMgb3IgYXJyYXlzIG9mIHByb3BlcnR5IG5hbWVzLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gb2JqZWN0IGNvbXBvc2VkIG9mIHRoZSBwaWNrZWQgcHJvcGVydGllcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5waWNrKHsgJ25hbWUnOiAnZnJlZCcsICdfdXNlcmlkJzogJ2ZyZWQxJyB9LCAnbmFtZScpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcgfVxuICAgICAqXG4gICAgICogXy5waWNrKHsgJ25hbWUnOiAnZnJlZCcsICdfdXNlcmlkJzogJ2ZyZWQxJyB9LCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICogICByZXR1cm4ga2V5LmNoYXJBdCgwKSAhPSAnXyc7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdmcmVkJyB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcGljayhvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgICBwcm9wcyA9IGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgZmFsc2UsIDEpLFxuICAgICAgICAgICAgbGVuZ3RoID0gaXNPYmplY3Qob2JqZWN0KSA/IHByb3BzLmxlbmd0aCA6IDA7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgICAgIGlmIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICBmb3JJbihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwga2V5LCBvYmplY3QpKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFuIGFsdGVybmF0aXZlIHRvIGBfLnJlZHVjZWAgdGhpcyBtZXRob2QgdHJhbnNmb3JtcyBgb2JqZWN0YCB0byBhIG5ld1xuICAgICAqIGBhY2N1bXVsYXRvcmAgb2JqZWN0IHdoaWNoIGlzIHRoZSByZXN1bHQgb2YgcnVubmluZyBlYWNoIG9mIGl0cyBvd25cbiAgICAgKiBlbnVtZXJhYmxlIHByb3BlcnRpZXMgdGhyb3VnaCBhIGNhbGxiYWNrLCB3aXRoIGVhY2ggY2FsbGJhY2sgZXhlY3V0aW9uXG4gICAgICogcG90ZW50aWFsbHkgbXV0YXRpbmcgdGhlIGBhY2N1bXVsYXRvcmAgb2JqZWN0LiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG9cbiAgICAgKiBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCBmb3VyIGFyZ3VtZW50czsgKGFjY3VtdWxhdG9yLCB2YWx1ZSwga2V5LCBvYmplY3QpLlxuICAgICAqIENhbGxiYWNrcyBtYXkgZXhpdCBpdGVyYXRpb24gZWFybHkgYnkgZXhwbGljaXRseSByZXR1cm5pbmcgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFthY2N1bXVsYXRvcl0gVGhlIGN1c3RvbSBhY2N1bXVsYXRvciB2YWx1ZS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgYWNjdW11bGF0ZWQgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBzcXVhcmVzID0gXy50cmFuc2Zvcm0oWzEsIDIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwXSwgZnVuY3Rpb24ocmVzdWx0LCBudW0pIHtcbiAgICAgKiAgIG51bSAqPSBudW07XG4gICAgICogICBpZiAobnVtICUgMikge1xuICAgICAqICAgICByZXR1cm4gcmVzdWx0LnB1c2gobnVtKSA8IDM7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gWzEsIDksIDI1XVxuICAgICAqXG4gICAgICogdmFyIG1hcHBlZCA9IF8udHJhbnNmb3JtKHsgJ2EnOiAxLCAnYic6IDIsICdjJzogMyB9LCBmdW5jdGlvbihyZXN1bHQsIG51bSwga2V5KSB7XG4gICAgICogICByZXN1bHRba2V5XSA9IG51bSAqIDM7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnYSc6IDMsICdiJzogNiwgJ2MnOiA5IH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm0ob2JqZWN0LCBjYWxsYmFjaywgYWNjdW11bGF0b3IsIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpc0FyciA9IGlzQXJyYXkob2JqZWN0KTtcbiAgICAgIGlmIChhY2N1bXVsYXRvciA9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc0Fycikge1xuICAgICAgICAgIGFjY3VtdWxhdG9yID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGN0b3IgPSBvYmplY3QgJiYgb2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgICBwcm90byA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGU7XG5cbiAgICAgICAgICBhY2N1bXVsYXRvciA9IGJhc2VDcmVhdGUocHJvdG8pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDQpO1xuICAgICAgICAoaXNBcnIgPyBmb3JFYWNoIDogZm9yT3duKShvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgb2JqZWN0KSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIG9iamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgY29tcG9zZWQgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IHZhbHVlcyBvZiBgb2JqZWN0YC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy52YWx1ZXMoeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDNdIChwcm9wZXJ0eSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBhY3Jvc3MgZW52aXJvbm1lbnRzKVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHZhbHVlcyhvYmplY3QpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICByZXN1bHRbaW5kZXhdID0gb2JqZWN0W3Byb3BzW2luZGV4XV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiBlbGVtZW50cyBmcm9tIHRoZSBzcGVjaWZpZWQgaW5kZXhlcywgb3Iga2V5cywgb2YgdGhlXG4gICAgICogYGNvbGxlY3Rpb25gLiBJbmRleGVzIG1heSBiZSBzcGVjaWZpZWQgYXMgaW5kaXZpZHVhbCBhcmd1bWVudHMgb3IgYXMgYXJyYXlzXG4gICAgICogb2YgaW5kZXhlcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHsuLi4obnVtYmVyfG51bWJlcltdfHN0cmluZ3xzdHJpbmdbXSl9IFtpbmRleF0gVGhlIGluZGV4ZXMgb2YgYGNvbGxlY3Rpb25gXG4gICAgICogICB0byByZXRyaWV2ZSwgc3BlY2lmaWVkIGFzIGluZGl2aWR1YWwgaW5kZXhlcyBvciBhcnJheXMgb2YgaW5kZXhlcy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgZWxlbWVudHMgY29ycmVzcG9uZGluZyB0byB0aGVcbiAgICAgKiAgcHJvdmlkZWQgaW5kZXhlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5hdChbJ2EnLCAnYicsICdjJywgJ2QnLCAnZSddLCBbMCwgMiwgNF0pO1xuICAgICAqIC8vID0+IFsnYScsICdjJywgJ2UnXVxuICAgICAqXG4gICAgICogXy5hdChbJ2ZyZWQnLCAnYmFybmV5JywgJ3BlYmJsZXMnXSwgMCwgMik7XG4gICAgICogLy8gPT4gWydmcmVkJywgJ3BlYmJsZXMnXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGF0KGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgICAgcHJvcHMgPSBiYXNlRmxhdHRlbihhcmdzLCB0cnVlLCBmYWxzZSwgMSksXG4gICAgICAgICAgbGVuZ3RoID0gKGFyZ3NbMl0gJiYgYXJnc1syXVthcmdzWzFdXSA9PT0gY29sbGVjdGlvbikgPyAxIDogcHJvcHMubGVuZ3RoLFxuICAgICAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICAgIHdoaWxlKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNvbGxlY3Rpb25bcHJvcHNbaW5kZXhdXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGEgZ2l2ZW4gdmFsdWUgaXMgcHJlc2VudCBpbiBhIGNvbGxlY3Rpb24gdXNpbmcgc3RyaWN0IGVxdWFsaXR5XG4gICAgICogZm9yIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLiBJZiBgZnJvbUluZGV4YCBpcyBuZWdhdGl2ZSwgaXQgaXMgdXNlZCBhcyB0aGVcbiAgICAgKiBvZmZzZXQgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGluY2x1ZGVcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7Kn0gdGFyZ2V0IFRoZSB2YWx1ZSB0byBjaGVjayBmb3IuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtmcm9tSW5kZXg9MF0gVGhlIGluZGV4IHRvIHNlYXJjaCBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHRhcmdldGAgZWxlbWVudCBpcyBmb3VuZCwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmNvbnRhaW5zKFsxLCAyLCAzXSwgMSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5jb250YWlucyhbMSwgMiwgM10sIDEsIDIpO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmNvbnRhaW5zKHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCB9LCAnZnJlZCcpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uY29udGFpbnMoJ3BlYmJsZXMnLCAnZWInKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICovXG4gICAgZnVuY3Rpb24gY29udGFpbnMoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGluZGV4T2YgPSBnZXRJbmRleE9mKCksXG4gICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMCxcbiAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcblxuICAgICAgZnJvbUluZGV4ID0gKGZyb21JbmRleCA8IDAgPyBuYXRpdmVNYXgoMCwgbGVuZ3RoICsgZnJvbUluZGV4KSA6IGZyb21JbmRleCkgfHwgMDtcbiAgICAgIGlmIChpc0FycmF5KGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHJlc3VsdCA9IGluZGV4T2YoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpID4gLTE7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgcmVzdWx0ID0gKGlzU3RyaW5nKGNvbGxlY3Rpb24pID8gY29sbGVjdGlvbi5pbmRleE9mKHRhcmdldCwgZnJvbUluZGV4KSA6IGluZGV4T2YoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpKSA+IC0xO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCsraW5kZXggPj0gZnJvbUluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gIShyZXN1bHQgPSB2YWx1ZSA9PT0gdGFyZ2V0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBjb21wb3NlZCBvZiBrZXlzIGdlbmVyYXRlZCBmcm9tIHRoZSByZXN1bHRzIG9mIHJ1bm5pbmdcbiAgICAgKiBlYWNoIGVsZW1lbnQgb2YgYGNvbGxlY3Rpb25gIHRocm91Z2ggdGhlIGNhbGxiYWNrLiBUaGUgY29ycmVzcG9uZGluZyB2YWx1ZVxuICAgICAqIG9mIGVhY2gga2V5IGlzIHRoZSBudW1iZXIgb2YgdGltZXMgdGhlIGtleSB3YXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrLlxuICAgICAqIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7XG4gICAgICogKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgY29tcG9zZWQgYWdncmVnYXRlIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5jb3VudEJ5KFs0LjMsIDYuMSwgNi40XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBNYXRoLmZsb29yKG51bSk7IH0pO1xuICAgICAqIC8vID0+IHsgJzQnOiAxLCAnNic6IDIgfVxuICAgICAqXG4gICAgICogXy5jb3VudEJ5KFs0LjMsIDYuMSwgNi40XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiB0aGlzLmZsb29yKG51bSk7IH0sIE1hdGgpO1xuICAgICAqIC8vID0+IHsgJzQnOiAxLCAnNic6IDIgfVxuICAgICAqXG4gICAgICogXy5jb3VudEJ5KFsnb25lJywgJ3R3bycsICd0aHJlZSddLCAnbGVuZ3RoJyk7XG4gICAgICogLy8gPT4geyAnMyc6IDIsICc1JzogMSB9XG4gICAgICovXG4gICAgdmFyIGNvdW50QnkgPSBjcmVhdGVBZ2dyZWdhdG9yKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgICAgKGhhc093blByb3BlcnR5LmNhbGwocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIGdpdmVuIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXkgdmFsdWUgZm9yICoqYWxsKiogZWxlbWVudHMgb2ZcbiAgICAgKiBhIGNvbGxlY3Rpb24uIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZVxuICAgICAqIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgYWxsXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbGwgZWxlbWVudHMgcGFzc2VkIHRoZSBjYWxsYmFjayBjaGVjayxcbiAgICAgKiAgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmV2ZXJ5KFt0cnVlLCAxLCBudWxsLCAneWVzJ10pO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZXZlcnkoY2hhcmFjdGVycywgJ2FnZScpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZXZlcnkoY2hhcmFjdGVycywgeyAnYWdlJzogMzYgfSk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBldmVyeShjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gISFjYWxsYmFjayhjb2xsZWN0aW9uW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIChyZXN1bHQgPSAhIWNhbGxiYWNrKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciBlbGVtZW50cyBvZiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyBhbiBhcnJheSBvZiBhbGwgZWxlbWVudHNcbiAgICAgKiB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleSBmb3IuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kXG4gICAgICogaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgc2VsZWN0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBlbGVtZW50cyB0aGF0IHBhc3NlZCB0aGUgY2FsbGJhY2sgY2hlY2suXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBldmVucyA9IF8uZmlsdGVyKFsxLCAyLCAzLCA0LCA1LCA2XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0gJSAyID09IDA7IH0pO1xuICAgICAqIC8vID0+IFsyLCA0LCA2XVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiwgJ2Jsb2NrZWQnOiBmYWxzZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmlsdGVyKGNoYXJhY3RlcnMsICdibG9ja2VkJyk7XG4gICAgICogLy8gPT4gW3sgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiB0cnVlIH1dXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmZpbHRlcihjaGFyYWN0ZXJzLCB7ICdhZ2UnOiAzNiB9KTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaWx0ZXIoY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcblxuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMDtcblxuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciBlbGVtZW50cyBvZiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyB0aGUgZmlyc3QgZWxlbWVudCB0aGF0XG4gICAgICogdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXkgZm9yLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZFxuICAgICAqIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGRldGVjdCwgZmluZFdoZXJlXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGB1bmRlZmluZWRgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgICdhZ2UnOiAzNiwgJ2Jsb2NrZWQnOiBmYWxzZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2FnZSc6IDQwLCAnYmxvY2tlZCc6IHRydWUgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxLCAgJ2Jsb2NrZWQnOiBmYWxzZSB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIF8uZmluZChjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHtcbiAgICAgKiAgIHJldHVybiBjaHIuYWdlIDwgNDA7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5maW5kKGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDEgfSk7XG4gICAgICogLy8gPT4gIHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxLCAnYmxvY2tlZCc6IGZhbHNlIH1cbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZChjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiB0cnVlIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gY29sbGVjdGlvbltpbmRleF07XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIGZvck93bihjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmZpbmRgIGV4Y2VwdCB0aGF0IGl0IGl0ZXJhdGVzIG92ZXIgZWxlbWVudHNcbiAgICAgKiBvZiBhIGBjb2xsZWN0aW9uYCBmcm9tIHJpZ2h0IHRvIGxlZnQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZvdW5kIGVsZW1lbnQsIGVsc2UgYHVuZGVmaW5lZGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZmluZExhc3QoWzEsIDIsIDMsIDRdLCBmdW5jdGlvbihudW0pIHtcbiAgICAgKiAgIHJldHVybiBudW0gJSAyID09IDE7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gM1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRMYXN0KGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgZm9yRWFjaFJpZ2h0KGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGVzIG92ZXIgZWxlbWVudHMgb2YgYSBjb2xsZWN0aW9uLCBleGVjdXRpbmcgdGhlIGNhbGxiYWNrIGZvciBlYWNoXG4gICAgICogZWxlbWVudC4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50cztcbiAgICAgKiAodmFsdWUsIGluZGV4fGtleSwgY29sbGVjdGlvbikuIENhbGxiYWNrcyBtYXkgZXhpdCBpdGVyYXRpb24gZWFybHkgYnlcbiAgICAgKiBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICAgICAqXG4gICAgICogTm90ZTogQXMgd2l0aCBvdGhlciBcIkNvbGxlY3Rpb25zXCIgbWV0aG9kcywgb2JqZWN0cyB3aXRoIGEgYGxlbmd0aGAgcHJvcGVydHlcbiAgICAgKiBhcmUgaXRlcmF0ZWQgbGlrZSBhcnJheXMuIFRvIGF2b2lkIHRoaXMgYmVoYXZpb3IgYF8uZm9ySW5gIG9yIGBfLmZvck93bmBcbiAgICAgKiBtYXkgYmUgdXNlZCBmb3Igb2JqZWN0IGl0ZXJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBlYWNoXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8T2JqZWN0fHN0cmluZ30gUmV0dXJucyBgY29sbGVjdGlvbmAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8oWzEsIDIsIDNdKS5mb3JFYWNoKGZ1bmN0aW9uKG51bSkgeyBjb25zb2xlLmxvZyhudW0pOyB9KS5qb2luKCcsJyk7XG4gICAgICogLy8gPT4gbG9ncyBlYWNoIG51bWJlciBhbmQgcmV0dXJucyAnMSwyLDMnXG4gICAgICpcbiAgICAgKiBfLmZvckVhY2goeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSwgZnVuY3Rpb24obnVtKSB7IGNvbnNvbGUubG9nKG51bSk7IH0pO1xuICAgICAqIC8vID0+IGxvZ3MgZWFjaCBudW1iZXIgYW5kIHJldHVybnMgdGhlIG9iamVjdCAocHJvcGVydHkgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgYWNyb3NzIGVudmlyb25tZW50cylcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JFYWNoKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuXG4gICAgICBjYWxsYmFjayA9IGNhbGxiYWNrICYmIHR5cGVvZiB0aGlzQXJnID09ICd1bmRlZmluZWQnID8gY2FsbGJhY2sgOiBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2soY29sbGVjdGlvbltpbmRleF0sIGluZGV4LCBjb2xsZWN0aW9uKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZm9yRWFjaGAgZXhjZXB0IHRoYXQgaXQgaXRlcmF0ZXMgb3ZlciBlbGVtZW50c1xuICAgICAqIG9mIGEgYGNvbGxlY3Rpb25gIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBlYWNoUmlnaHRcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R8c3RyaW5nfSBSZXR1cm5zIGBjb2xsZWN0aW9uYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXyhbMSwgMiwgM10pLmZvckVhY2hSaWdodChmdW5jdGlvbihudW0pIHsgY29uc29sZS5sb2cobnVtKTsgfSkuam9pbignLCcpO1xuICAgICAqIC8vID0+IGxvZ3MgZWFjaCBudW1iZXIgZnJvbSByaWdodCB0byBsZWZ0IGFuZCByZXR1cm5zICczLDIsMSdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JFYWNoUmlnaHQoY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayAmJiB0eXBlb2YgdGhpc0FyZyA9PSAndW5kZWZpbmVkJyA/IGNhbGxiYWNrIDogYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICAgIGlmIChjYWxsYmFjayhjb2xsZWN0aW9uW2xlbmd0aF0sIGxlbmd0aCwgY29sbGVjdGlvbikgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcm9wcyA9IGtleXMoY29sbGVjdGlvbik7XG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICBrZXkgPSBwcm9wcyA/IHByb3BzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjb2xsZWN0aW9uW2tleV0sIGtleSwgY29sbGVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBvYmplY3QgY29tcG9zZWQgb2Yga2V5cyBnZW5lcmF0ZWQgZnJvbSB0aGUgcmVzdWx0cyBvZiBydW5uaW5nXG4gICAgICogZWFjaCBlbGVtZW50IG9mIGEgY29sbGVjdGlvbiB0aHJvdWdoIHRoZSBjYWxsYmFjay4gVGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVcbiAgICAgKiBvZiBlYWNoIGtleSBpcyBhbiBhcnJheSBvZiB0aGUgZWxlbWVudHMgcmVzcG9uc2libGUgZm9yIGdlbmVyYXRpbmcgdGhlIGtleS5cbiAgICAgKiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzO1xuICAgICAqICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgY29tcG9zZWQgYWdncmVnYXRlIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5ncm91cEJ5KFs0LjIsIDYuMSwgNi40XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBNYXRoLmZsb29yKG51bSk7IH0pO1xuICAgICAqIC8vID0+IHsgJzQnOiBbNC4yXSwgJzYnOiBbNi4xLCA2LjRdIH1cbiAgICAgKlxuICAgICAqIF8uZ3JvdXBCeShbNC4yLCA2LjEsIDYuNF0sIGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gdGhpcy5mbG9vcihudW0pOyB9LCBNYXRoKTtcbiAgICAgKiAvLyA9PiB7ICc0JzogWzQuMl0sICc2JzogWzYuMSwgNi40XSB9XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmdyb3VwQnkoWydvbmUnLCAndHdvJywgJ3RocmVlJ10sICdsZW5ndGgnKTtcbiAgICAgKiAvLyA9PiB7ICczJzogWydvbmUnLCAndHdvJ10sICc1JzogWyd0aHJlZSddIH1cbiAgICAgKi9cbiAgICB2YXIgZ3JvdXBCeSA9IGNyZWF0ZUFnZ3JlZ2F0b3IoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgICAoaGFzT3duUHJvcGVydHkuY2FsbChyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSA6IHJlc3VsdFtrZXldID0gW10pLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBvYmplY3QgY29tcG9zZWQgb2Yga2V5cyBnZW5lcmF0ZWQgZnJvbSB0aGUgcmVzdWx0cyBvZiBydW5uaW5nXG4gICAgICogZWFjaCBlbGVtZW50IG9mIHRoZSBjb2xsZWN0aW9uIHRocm91Z2ggdGhlIGdpdmVuIGNhbGxiYWNrLiBUaGUgY29ycmVzcG9uZGluZ1xuICAgICAqIHZhbHVlIG9mIGVhY2gga2V5IGlzIHRoZSBsYXN0IGVsZW1lbnQgcmVzcG9uc2libGUgZm9yIGdlbmVyYXRpbmcgdGhlIGtleS5cbiAgICAgKiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzO1xuICAgICAqICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGNvbXBvc2VkIGFnZ3JlZ2F0ZSBvYmplY3QuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBrZXlzID0gW1xuICAgICAqICAgeyAnZGlyJzogJ2xlZnQnLCAnY29kZSc6IDk3IH0sXG4gICAgICogICB7ICdkaXInOiAncmlnaHQnLCAnY29kZSc6IDEwMCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIF8uaW5kZXhCeShrZXlzLCAnZGlyJyk7XG4gICAgICogLy8gPT4geyAnbGVmdCc6IHsgJ2Rpcic6ICdsZWZ0JywgJ2NvZGUnOiA5NyB9LCAncmlnaHQnOiB7ICdkaXInOiAncmlnaHQnLCAnY29kZSc6IDEwMCB9IH1cbiAgICAgKlxuICAgICAqIF8uaW5kZXhCeShrZXlzLCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5LmNvZGUpOyB9KTtcbiAgICAgKiAvLyA9PiB7ICdhJzogeyAnZGlyJzogJ2xlZnQnLCAnY29kZSc6IDk3IH0sICdkJzogeyAnZGlyJzogJ3JpZ2h0JywgJ2NvZGUnOiAxMDAgfSB9XG4gICAgICpcbiAgICAgKiBfLmluZGV4QnkoY2hhcmFjdGVycywgZnVuY3Rpb24oa2V5KSB7IHRoaXMuZnJvbUNoYXJDb2RlKGtleS5jb2RlKTsgfSwgU3RyaW5nKTtcbiAgICAgKiAvLyA9PiB7ICdhJzogeyAnZGlyJzogJ2xlZnQnLCAnY29kZSc6IDk3IH0sICdkJzogeyAnZGlyJzogJ3JpZ2h0JywgJ2NvZGUnOiAxMDAgfSB9XG4gICAgICovXG4gICAgdmFyIGluZGV4QnkgPSBjcmVhdGVBZ2dyZWdhdG9yKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEludm9rZXMgdGhlIG1ldGhvZCBuYW1lZCBieSBgbWV0aG9kTmFtZWAgb24gZWFjaCBlbGVtZW50IGluIHRoZSBgY29sbGVjdGlvbmBcbiAgICAgKiByZXR1cm5pbmcgYW4gYXJyYXkgb2YgdGhlIHJlc3VsdHMgb2YgZWFjaCBpbnZva2VkIG1ldGhvZC4gQWRkaXRpb25hbCBhcmd1bWVudHNcbiAgICAgKiB3aWxsIGJlIHByb3ZpZGVkIHRvIGVhY2ggaW52b2tlZCBtZXRob2QuIElmIGBtZXRob2ROYW1lYCBpcyBhIGZ1bmN0aW9uIGl0XG4gICAgICogd2lsbCBiZSBpbnZva2VkIGZvciwgYW5kIGB0aGlzYCBib3VuZCB0bywgZWFjaCBlbGVtZW50IGluIHRoZSBgY29sbGVjdGlvbmAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258c3RyaW5nfSBtZXRob2ROYW1lIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaW52b2tlIG9yXG4gICAgICogIHRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsuLi4qfSBbYXJnXSBBcmd1bWVudHMgdG8gaW52b2tlIHRoZSBtZXRob2Qgd2l0aC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgdGhlIHJlc3VsdHMgb2YgZWFjaCBpbnZva2VkIG1ldGhvZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pbnZva2UoW1s1LCAxLCA3XSwgWzMsIDIsIDFdXSwgJ3NvcnQnKTtcbiAgICAgKiAvLyA9PiBbWzEsIDUsIDddLCBbMSwgMiwgM11dXG4gICAgICpcbiAgICAgKiBfLmludm9rZShbMTIzLCA0NTZdLCBTdHJpbmcucHJvdG90eXBlLnNwbGl0LCAnJyk7XG4gICAgICogLy8gPT4gW1snMScsICcyJywgJzMnXSwgWyc0JywgJzUnLCAnNiddXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGludm9rZShjb2xsZWN0aW9uLCBtZXRob2ROYW1lKSB7XG4gICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgICBpc0Z1bmMgPSB0eXBlb2YgbWV0aG9kTmFtZSA9PSAnZnVuY3Rpb24nLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gQXJyYXkodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyA/IGxlbmd0aCA6IDApO1xuXG4gICAgICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc3VsdFsrK2luZGV4XSA9IChpc0Z1bmMgPyBtZXRob2ROYW1lIDogdmFsdWVbbWV0aG9kTmFtZV0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIHZhbHVlcyBieSBydW5uaW5nIGVhY2ggZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvblxuICAgICAqIHRocm91Z2ggdGhlIGNhbGxiYWNrLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGhcbiAgICAgKiB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGNvbGxlY3RcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIHRoZSByZXN1bHRzIG9mIGVhY2ggYGNhbGxiYWNrYCBleGVjdXRpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWFwKFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0gKiAzOyB9KTtcbiAgICAgKiAvLyA9PiBbMywgNiwgOV1cbiAgICAgKlxuICAgICAqIF8ubWFwKHsgJ29uZSc6IDEsICd0d28nOiAyLCAndGhyZWUnOiAzIH0sIGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gbnVtICogMzsgfSk7XG4gICAgICogLy8gPT4gWzMsIDYsIDldIChwcm9wZXJ0eSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBhY3Jvc3MgZW52aXJvbm1lbnRzKVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLm1hcChjaGFyYWN0ZXJzLCAnbmFtZScpO1xuICAgICAqIC8vID0+IFsnYmFybmV5JywgJ2ZyZWQnXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1hcChjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMDtcblxuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNhbGxiYWNrKGNvbGxlY3Rpb25baW5kZXhdLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGtleSwgY29sbGVjdGlvbikge1xuICAgICAgICAgIHJlc3VsdFsrK2luZGV4XSA9IGNhbGxiYWNrKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBtYXhpbXVtIHZhbHVlIG9mIGEgY29sbGVjdGlvbi4gSWYgdGhlIGNvbGxlY3Rpb24gaXMgZW1wdHkgb3JcbiAgICAgKiBmYWxzZXkgYC1JbmZpbml0eWAgaXMgcmV0dXJuZWQuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBleGVjdXRlZFxuICAgICAqIGZvciBlYWNoIHZhbHVlIGluIHRoZSBjb2xsZWN0aW9uIHRvIGdlbmVyYXRlIHRoZSBjcml0ZXJpb24gYnkgd2hpY2ggdGhlIHZhbHVlXG4gICAgICogaXMgcmFua2VkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICAgKiBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIG1heGltdW0gdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWF4KFs0LCAyLCA4LCA2XSk7XG4gICAgICogLy8gPT4gOFxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLm1heChjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHsgcmV0dXJuIGNoci5hZ2U7IH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCB9O1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5tYXgoY2hhcmFjdGVycywgJ2FnZScpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCB9O1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1heChjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGNvbXB1dGVkID0gLUluZmluaXR5LFxuICAgICAgICAgIHJlc3VsdCA9IGNvbXB1dGVkO1xuXG4gICAgICAvLyBhbGxvd3Mgd29ya2luZyB3aXRoIGZ1bmN0aW9ucyBsaWtlIGBfLm1hcGAgd2l0aG91dCB1c2luZ1xuICAgICAgLy8gdGhlaXIgYGluZGV4YCBhcmd1bWVudCBhcyBhIGNhbGxiYWNrXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicgJiYgdGhpc0FyZyAmJiB0aGlzQXJnW2NhbGxiYWNrXSA9PT0gY29sbGVjdGlvbikge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc0FycmF5KGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbi5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICBpZiAodmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc1N0cmluZyhjb2xsZWN0aW9uKSlcbiAgICAgICAgICA/IGNoYXJBdENhbGxiYWNrXG4gICAgICAgICAgOiBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICAgIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnQgPSBjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICAgIGlmIChjdXJyZW50ID4gY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIGNvbXB1dGVkID0gY3VycmVudDtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgbWluaW11bSB2YWx1ZSBvZiBhIGNvbGxlY3Rpb24uIElmIHRoZSBjb2xsZWN0aW9uIGlzIGVtcHR5IG9yXG4gICAgICogZmFsc2V5IGBJbmZpbml0eWAgaXMgcmV0dXJuZWQuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBleGVjdXRlZFxuICAgICAqIGZvciBlYWNoIHZhbHVlIGluIHRoZSBjb2xsZWN0aW9uIHRvIGdlbmVyYXRlIHRoZSBjcml0ZXJpb24gYnkgd2hpY2ggdGhlIHZhbHVlXG4gICAgICogaXMgcmFua2VkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICAgKiBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIG1pbmltdW0gdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWluKFs0LCAyLCA4LCA2XSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLm1pbihjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHsgcmV0dXJuIGNoci5hZ2U7IH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH07XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLm1pbihjaGFyYWN0ZXJzLCAnYWdlJyk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtaW4oY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IEluZmluaXR5LFxuICAgICAgICAgIHJlc3VsdCA9IGNvbXB1dGVkO1xuXG4gICAgICAvLyBhbGxvd3Mgd29ya2luZyB3aXRoIGZ1bmN0aW9ucyBsaWtlIGBfLm1hcGAgd2l0aG91dCB1c2luZ1xuICAgICAgLy8gdGhlaXIgYGluZGV4YCBhcmd1bWVudCBhcyBhIGNhbGxiYWNrXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicgJiYgdGhpc0FyZyAmJiB0aGlzQXJnW2NhbGxiYWNrXSA9PT0gY29sbGVjdGlvbikge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc0FycmF5KGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbi5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICBpZiAodmFsdWUgPCByZXN1bHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc1N0cmluZyhjb2xsZWN0aW9uKSlcbiAgICAgICAgICA/IGNoYXJBdENhbGxiYWNrXG4gICAgICAgICAgOiBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICAgIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnQgPSBjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICAgIGlmIChjdXJyZW50IDwgY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIGNvbXB1dGVkID0gY3VycmVudDtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgcHJvcGVydHkgZnJvbSBhbGwgZWxlbWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byBwbHVjay5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgcHJvcGVydHkgdmFsdWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIF8ucGx1Y2soY2hhcmFjdGVycywgJ25hbWUnKTtcbiAgICAgKiAvLyA9PiBbJ2Jhcm5leScsICdmcmVkJ11cbiAgICAgKi9cbiAgICB2YXIgcGx1Y2sgPSBtYXA7XG5cbiAgICAvKipcbiAgICAgKiBSZWR1Y2VzIGEgY29sbGVjdGlvbiB0byBhIHZhbHVlIHdoaWNoIGlzIHRoZSBhY2N1bXVsYXRlZCByZXN1bHQgb2YgcnVubmluZ1xuICAgICAqIGVhY2ggZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiB0aHJvdWdoIHRoZSBjYWxsYmFjaywgd2hlcmUgZWFjaCBzdWNjZXNzaXZlXG4gICAgICogY2FsbGJhY2sgZXhlY3V0aW9uIGNvbnN1bWVzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIHByZXZpb3VzIGV4ZWN1dGlvbi4gSWZcbiAgICAgKiBgYWNjdW11bGF0b3JgIGlzIG5vdCBwcm92aWRlZCB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgY29sbGVjdGlvbiB3aWxsIGJlXG4gICAgICogdXNlZCBhcyB0aGUgaW5pdGlhbCBgYWNjdW11bGF0b3JgIHZhbHVlLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgXG4gICAgICogYW5kIGludm9rZWQgd2l0aCBmb3VyIGFyZ3VtZW50czsgKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBmb2xkbCwgaW5qZWN0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFthY2N1bXVsYXRvcl0gSW5pdGlhbCB2YWx1ZSBvZiB0aGUgYWNjdW11bGF0b3IuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGFjY3VtdWxhdGVkIHZhbHVlLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgc3VtID0gXy5yZWR1Y2UoWzEsIDIsIDNdLCBmdW5jdGlvbihzdW0sIG51bSkge1xuICAgICAqICAgcmV0dXJuIHN1bSArIG51bTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiA2XG4gICAgICpcbiAgICAgKiB2YXIgbWFwcGVkID0gXy5yZWR1Y2UoeyAnYSc6IDEsICdiJzogMiwgJ2MnOiAzIH0sIGZ1bmN0aW9uKHJlc3VsdCwgbnVtLCBrZXkpIHtcbiAgICAgKiAgIHJlc3VsdFtrZXldID0gbnVtICogMztcbiAgICAgKiAgIHJldHVybiByZXN1bHQ7XG4gICAgICogfSwge30pO1xuICAgICAqIC8vID0+IHsgJ2EnOiAzLCAnYic6IDYsICdjJzogOSB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVkdWNlKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCBhY2N1bXVsYXRvciwgdGhpc0FyZykge1xuICAgICAgaWYgKCFjb2xsZWN0aW9uKSByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgICB2YXIgbm9hY2N1bSA9IGFyZ3VtZW50cy5sZW5ndGggPCAzO1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDQpO1xuXG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uLmxlbmd0aDtcblxuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgaWYgKG5vYWNjdW0pIHtcbiAgICAgICAgICBhY2N1bXVsYXRvciA9IGNvbGxlY3Rpb25bKytpbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBhY2N1bXVsYXRvciA9IGNhbGxiYWNrKGFjY3VtdWxhdG9yLCBjb2xsZWN0aW9uW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgYWNjdW11bGF0b3IgPSBub2FjY3VtXG4gICAgICAgICAgICA/IChub2FjY3VtID0gZmFsc2UsIHZhbHVlKVxuICAgICAgICAgICAgOiBjYWxsYmFjayhhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLnJlZHVjZWAgZXhjZXB0IHRoYXQgaXQgaXRlcmF0ZXMgb3ZlciBlbGVtZW50c1xuICAgICAqIG9mIGEgYGNvbGxlY3Rpb25gIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBmb2xkclxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbYWNjdW11bGF0b3JdIEluaXRpYWwgdmFsdWUgb2YgdGhlIGFjY3VtdWxhdG9yLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBhY2N1bXVsYXRlZCB2YWx1ZS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGxpc3QgPSBbWzAsIDFdLCBbMiwgM10sIFs0LCA1XV07XG4gICAgICogdmFyIGZsYXQgPSBfLnJlZHVjZVJpZ2h0KGxpc3QsIGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEuY29uY2F0KGIpOyB9LCBbXSk7XG4gICAgICogLy8gPT4gWzQsIDUsIDIsIDMsIDAsIDFdXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVkdWNlUmlnaHQoY29sbGVjdGlvbiwgY2FsbGJhY2ssIGFjY3VtdWxhdG9yLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgbm9hY2N1bSA9IGFyZ3VtZW50cy5sZW5ndGggPCAzO1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDQpO1xuICAgICAgZm9yRWFjaFJpZ2h0KGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICBhY2N1bXVsYXRvciA9IG5vYWNjdW1cbiAgICAgICAgICA/IChub2FjY3VtID0gZmFsc2UsIHZhbHVlKVxuICAgICAgICAgIDogY2FsbGJhY2soYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgb3Bwb3NpdGUgb2YgYF8uZmlsdGVyYCB0aGlzIG1ldGhvZCByZXR1cm5zIHRoZSBlbGVtZW50cyBvZiBhXG4gICAgICogY29sbGVjdGlvbiB0aGF0IHRoZSBjYWxsYmFjayBkb2VzICoqbm90KiogcmV0dXJuIHRydWV5IGZvci5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBlbGVtZW50cyB0aGF0IGZhaWxlZCB0aGUgY2FsbGJhY2sgY2hlY2suXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBvZGRzID0gXy5yZWplY3QoWzEsIDIsIDMsIDQsIDUsIDZdLCBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSAlIDIgPT0gMDsgfSk7XG4gICAgICogLy8gPT4gWzEsIDMsIDVdXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2LCAnYmxvY2tlZCc6IGZhbHNlIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiB0cnVlIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5yZWplY3QoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfV1cbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8ucmVqZWN0KGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDM2IH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9XVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlamVjdChjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgcmV0dXJuIGZpbHRlcihjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuICFjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgcmFuZG9tIGVsZW1lbnQgb3IgYG5gIHJhbmRvbSBlbGVtZW50cyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBzYW1wbGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtuXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHNhbXBsZS5cbiAgICAgKiBAcGFyYW0tIHtPYmplY3R9IFtndWFyZF0gQWxsb3dzIHdvcmtpbmcgd2l0aCBmdW5jdGlvbnMgbGlrZSBgXy5tYXBgXG4gICAgICogIHdpdGhvdXQgdXNpbmcgdGhlaXIgYGluZGV4YCBhcmd1bWVudHMgYXMgYG5gLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgcmFuZG9tIHNhbXBsZShzKSBvZiBgY29sbGVjdGlvbmAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uc2FtcGxlKFsxLCAyLCAzLCA0XSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogXy5zYW1wbGUoWzEsIDIsIDMsIDRdLCAyKTtcbiAgICAgKiAvLyA9PiBbMywgMV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzYW1wbGUoY29sbGVjdGlvbiwgbiwgZ3VhcmQpIHtcbiAgICAgIGlmIChjb2xsZWN0aW9uICYmIHR5cGVvZiBjb2xsZWN0aW9uLmxlbmd0aCAhPSAnbnVtYmVyJykge1xuICAgICAgICBjb2xsZWN0aW9uID0gdmFsdWVzKGNvbGxlY3Rpb24pO1xuICAgICAgfVxuICAgICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb25bYmFzZVJhbmRvbSgwLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEpXSA6IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHZhciByZXN1bHQgPSBzaHVmZmxlKGNvbGxlY3Rpb24pO1xuICAgICAgcmVzdWx0Lmxlbmd0aCA9IG5hdGl2ZU1pbihuYXRpdmVNYXgoMCwgbiksIHJlc3VsdC5sZW5ndGgpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIHNodWZmbGVkIHZhbHVlcywgdXNpbmcgYSB2ZXJzaW9uIG9mIHRoZSBGaXNoZXItWWF0ZXNcbiAgICAgKiBzaHVmZmxlLiBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXItWWF0ZXNfc2h1ZmZsZS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBzaHVmZmxlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBzaHVmZmxlZCBjb2xsZWN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnNodWZmbGUoWzEsIDIsIDMsIDQsIDUsIDZdKTtcbiAgICAgKiAvLyA9PiBbNCwgMSwgNiwgMywgNSwgMl1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaHVmZmxlKGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gQXJyYXkodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyA/IGxlbmd0aCA6IDApO1xuXG4gICAgICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciByYW5kID0gYmFzZVJhbmRvbSgwLCArK2luZGV4KTtcbiAgICAgICAgcmVzdWx0W2luZGV4XSA9IHJlc3VsdFtyYW5kXTtcbiAgICAgICAgcmVzdWx0W3JhbmRdID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgc2l6ZSBvZiB0aGUgYGNvbGxlY3Rpb25gIGJ5IHJldHVybmluZyBgY29sbGVjdGlvbi5sZW5ndGhgIGZvciBhcnJheXNcbiAgICAgKiBhbmQgYXJyYXktbGlrZSBvYmplY3RzIG9yIHRoZSBudW1iZXIgb2Ygb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBmb3Igb2JqZWN0cy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpbnNwZWN0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgYGNvbGxlY3Rpb24ubGVuZ3RoYCBvciBudW1iZXIgb2Ygb3duIGVudW1lcmFibGUgcHJvcGVydGllcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5zaXplKFsxLCAyXSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogXy5zaXplKHsgJ29uZSc6IDEsICd0d28nOiAyLCAndGhyZWUnOiAzIH0pO1xuICAgICAqIC8vID0+IDNcbiAgICAgKlxuICAgICAqIF8uc2l6ZSgncGViYmxlcycpO1xuICAgICAqIC8vID0+IDdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaXplKGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuICAgICAgcmV0dXJuIHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgPyBsZW5ndGggOiBrZXlzKGNvbGxlY3Rpb24pLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIGNhbGxiYWNrIHJldHVybnMgYSB0cnVleSB2YWx1ZSBmb3IgKiphbnkqKiBlbGVtZW50IG9mIGFcbiAgICAgKiBjb2xsZWN0aW9uLiBUaGUgZnVuY3Rpb24gcmV0dXJucyBhcyBzb29uIGFzIGl0IGZpbmRzIGEgcGFzc2luZyB2YWx1ZSBhbmRcbiAgICAgKiBkb2VzIG5vdCBpdGVyYXRlIG92ZXIgdGhlIGVudGlyZSBjb2xsZWN0aW9uLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG9cbiAgICAgKiBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGFueVxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYW55IGVsZW1lbnQgcGFzc2VkIHRoZSBjYWxsYmFjayBjaGVjayxcbiAgICAgKiAgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnNvbWUoW251bGwsIDAsICd5ZXMnLCBmYWxzZV0sIEJvb2xlYW4pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwLCAnYmxvY2tlZCc6IHRydWUgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnNvbWUoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnNvbWUoY2hhcmFjdGVycywgeyAnYWdlJzogMSB9KTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvbWUoY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKChyZXN1bHQgPSBjYWxsYmFjayhjb2xsZWN0aW9uW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuICEocmVzdWx0ID0gY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgZWxlbWVudHMsIHNvcnRlZCBpbiBhc2NlbmRpbmcgb3JkZXIgYnkgdGhlIHJlc3VsdHMgb2ZcbiAgICAgKiBydW5uaW5nIGVhY2ggZWxlbWVudCBpbiBhIGNvbGxlY3Rpb24gdGhyb3VnaCB0aGUgY2FsbGJhY2suIFRoaXMgbWV0aG9kXG4gICAgICogcGVyZm9ybXMgYSBzdGFibGUgc29ydCwgdGhhdCBpcywgaXQgd2lsbCBwcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgc29ydCBvcmRlclxuICAgICAqIG9mIGVxdWFsIGVsZW1lbnRzLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGhcbiAgICAgKiB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjb2xsZWN0aW9uXG4gICAgICogd2lsbCBiZSBzb3J0ZWQgYnkgZWFjaCBwcm9wZXJ0eSB2YWx1ZS5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FycmF5fEZ1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBzb3J0ZWQgZWxlbWVudHMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uc29ydEJ5KFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBNYXRoLnNpbihudW0pOyB9KTtcbiAgICAgKiAvLyA9PiBbMywgMSwgMl1cbiAgICAgKlxuICAgICAqIF8uc29ydEJ5KFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiB0aGlzLnNpbihudW0pOyB9LCBNYXRoKTtcbiAgICAgKiAvLyA9PiBbMywgMSwgMl1cbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYWdlJzogNDAgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgICdhZ2UnOiAyNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2FnZSc6IDMwIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5tYXAoXy5zb3J0QnkoY2hhcmFjdGVycywgJ2FnZScpLCBfLnZhbHVlcyk7XG4gICAgICogLy8gPT4gW1snYmFybmV5JywgMjZdLCBbJ2ZyZWQnLCAzMF0sIFsnYmFybmV5JywgMzZdLCBbJ2ZyZWQnLCA0MF1dXG4gICAgICpcbiAgICAgKiAvLyBzb3J0aW5nIGJ5IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgKiBfLm1hcChfLnNvcnRCeShjaGFyYWN0ZXJzLCBbJ25hbWUnLCAnYWdlJ10pLCBfLnZhbHVlcyk7XG4gICAgICogLy8gPSA+IFtbJ2Jhcm5leScsIDI2XSwgWydiYXJuZXknLCAzNl0sIFsnZnJlZCcsIDMwXSwgWydmcmVkJywgNDBdXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvcnRCeShjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgaXNBcnIgPSBpc0FycmF5KGNhbGxiYWNrKSxcbiAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IEFycmF5KHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgPyBsZW5ndGggOiAwKTtcblxuICAgICAgaWYgKCFpc0Fycikge1xuICAgICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgICB9XG4gICAgICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgdmFyIG9iamVjdCA9IHJlc3VsdFsrK2luZGV4XSA9IGdldE9iamVjdCgpO1xuICAgICAgICBpZiAoaXNBcnIpIHtcbiAgICAgICAgICBvYmplY3QuY3JpdGVyaWEgPSBtYXAoY2FsbGJhY2ssIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKG9iamVjdC5jcml0ZXJpYSA9IGdldEFycmF5KCkpWzBdID0gY2FsbGJhY2sodmFsdWUsIGtleSwgY29sbGVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0LmluZGV4ID0gaW5kZXg7XG4gICAgICAgIG9iamVjdC52YWx1ZSA9IHZhbHVlO1xuICAgICAgfSk7XG5cbiAgICAgIGxlbmd0aCA9IHJlc3VsdC5sZW5ndGg7XG4gICAgICByZXN1bHQuc29ydChjb21wYXJlQXNjZW5kaW5nKTtcbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICB2YXIgb2JqZWN0ID0gcmVzdWx0W2xlbmd0aF07XG4gICAgICAgIHJlc3VsdFtsZW5ndGhdID0gb2JqZWN0LnZhbHVlO1xuICAgICAgICBpZiAoIWlzQXJyKSB7XG4gICAgICAgICAgcmVsZWFzZUFycmF5KG9iamVjdC5jcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVsZWFzZU9iamVjdChvYmplY3QpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgYGNvbGxlY3Rpb25gIHRvIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGNvbnZlcnQuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgY29udmVydGVkIGFycmF5LlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAoZnVuY3Rpb24oKSB7IHJldHVybiBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKTsgfSkoMSwgMiwgMywgNCk7XG4gICAgICogLy8gPT4gWzIsIDMsIDRdXG4gICAgICovXG4gICAgZnVuY3Rpb24gdG9BcnJheShjb2xsZWN0aW9uKSB7XG4gICAgICBpZiAoY29sbGVjdGlvbiAmJiB0eXBlb2YgY29sbGVjdGlvbi5sZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIHNsaWNlKGNvbGxlY3Rpb24pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlcyhjb2xsZWN0aW9uKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBvZiBlYWNoIGVsZW1lbnQgaW4gYSBgY29sbGVjdGlvbmAgdG8gdGhlIGdpdmVuXG4gICAgICogYHByb3BlcnRpZXNgIG9iamVjdCwgcmV0dXJuaW5nIGFuIGFycmF5IG9mIGFsbCBlbGVtZW50cyB0aGF0IGhhdmUgZXF1aXZhbGVudFxuICAgICAqIHByb3BlcnR5IHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJvcHMgVGhlIG9iamVjdCBvZiBwcm9wZXJ0eSB2YWx1ZXMgdG8gZmlsdGVyIGJ5LlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIGdpdmVuIHByb3BlcnRpZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdwZXRzJzogWydob3BweSddIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCwgJ3BldHMnOiBbJ2JhYnkgcHVzcycsICdkaW5vJ10gfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLndoZXJlKGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDM2IH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiwgJ3BldHMnOiBbJ2hvcHB5J10gfV1cbiAgICAgKlxuICAgICAqIF8ud2hlcmUoY2hhcmFjdGVycywgeyAncGV0cyc6IFsnZGlubyddIH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAsICdwZXRzJzogWydiYWJ5IHB1c3MnLCAnZGlubyddIH1dXG4gICAgICovXG4gICAgdmFyIHdoZXJlID0gZmlsdGVyO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IHdpdGggYWxsIGZhbHNleSB2YWx1ZXMgcmVtb3ZlZC4gVGhlIHZhbHVlcyBgZmFsc2VgLCBgbnVsbGAsXG4gICAgICogYDBgLCBgXCJcImAsIGB1bmRlZmluZWRgLCBhbmQgYE5hTmAgYXJlIGFsbCBmYWxzZXkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGNvbXBhY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5jb21wYWN0KFswLCAxLCBmYWxzZSwgMiwgJycsIDNdKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgM11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjb21wYWN0KGFycmF5KSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZXhjbHVkaW5nIGFsbCB2YWx1ZXMgb2YgdGhlIHByb3ZpZGVkIGFycmF5cyB1c2luZyBzdHJpY3RcbiAgICAgKiBlcXVhbGl0eSBmb3IgY29tcGFyaXNvbnMsIGkuZS4gYD09PWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHByb2Nlc3MuXG4gICAgICogQHBhcmFtIHsuLi5BcnJheX0gW3ZhbHVlc10gVGhlIGFycmF5cyBvZiB2YWx1ZXMgdG8gZXhjbHVkZS5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgZmlsdGVyZWQgdmFsdWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmRpZmZlcmVuY2UoWzEsIDIsIDMsIDQsIDVdLCBbNSwgMiwgMTBdKTtcbiAgICAgKiAvLyA9PiBbMSwgMywgNF1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkaWZmZXJlbmNlKGFycmF5KSB7XG4gICAgICByZXR1cm4gYmFzZURpZmZlcmVuY2UoYXJyYXksIGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSwgMSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZmluZGAgZXhjZXB0IHRoYXQgaXQgcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0XG4gICAgICogZWxlbWVudCB0aGF0IHBhc3NlcyB0aGUgY2FsbGJhY2sgY2hlY2ssIGluc3RlYWQgb2YgdGhlIGVsZW1lbnQgaXRzZWxmLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGAtMWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2LCAnYmxvY2tlZCc6IGZhbHNlIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2FnZSc6IDEsICAnYmxvY2tlZCc6IGZhbHNlIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogXy5maW5kSW5kZXgoY2hhcmFjdGVycywgZnVuY3Rpb24oY2hyKSB7XG4gICAgICogICByZXR1cm4gY2hyLmFnZSA8IDIwO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IDJcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZEluZGV4KGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDM2IH0pO1xuICAgICAqIC8vID0+IDBcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZEluZGV4KGNoYXJhY3RlcnMsICdibG9ja2VkJyk7XG4gICAgICogLy8gPT4gMVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRJbmRleChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcblxuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZmluZEluZGV4YCBleGNlcHQgdGhhdCBpdCBpdGVyYXRlcyBvdmVyIGVsZW1lbnRzXG4gICAgICogb2YgYSBgY29sbGVjdGlvbmAgZnJvbSByaWdodCB0byBsZWZ0LlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGAtMWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2LCAnYmxvY2tlZCc6IHRydWUgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiBmYWxzZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2FnZSc6IDEsICAnYmxvY2tlZCc6IHRydWUgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLmZpbmRMYXN0SW5kZXgoY2hhcmFjdGVycywgZnVuY3Rpb24oY2hyKSB7XG4gICAgICogICByZXR1cm4gY2hyLmFnZSA+IDMwO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IDFcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZExhc3RJbmRleChjaGFyYWN0ZXJzLCB7ICdhZ2UnOiAzNiB9KTtcbiAgICAgKiAvLyA9PiAwXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmZpbmRMYXN0SW5kZXgoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiAyXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmluZExhc3RJbmRleChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGFycmF5W2xlbmd0aF0sIGxlbmd0aCwgYXJyYXkpKSB7XG4gICAgICAgICAgcmV0dXJuIGxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGZpcnN0IGVsZW1lbnQgb3IgZmlyc3QgYG5gIGVsZW1lbnRzIG9mIGFuIGFycmF5LiBJZiBhIGNhbGxiYWNrXG4gICAgICogaXMgcHJvdmlkZWQgZWxlbWVudHMgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgYXJyYXkgYXJlIHJldHVybmVkIGFzIGxvbmdcbiAgICAgKiBhcyB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmRcbiAgICAgKiBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzOyAodmFsdWUsIGluZGV4LCBhcnJheSkuXG4gICAgICpcbiAgICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLnBsdWNrXCIgc3R5bGVcbiAgICAgKiBjYWxsYmFjayB3aWxsIHJldHVybiB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBJZiBhbiBvYmplY3QgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4gb2JqZWN0LFxuICAgICAqIGVsc2UgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBoZWFkLCB0YWtlXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBxdWVyeS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxudW1iZXJ8c3RyaW5nfSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGVsZW1lbnQgb3IgdGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm4uIElmIGEgcHJvcGVydHkgbmFtZSBvclxuICAgICAqICBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiXG4gICAgICogIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQocykgb2YgYGFycmF5YC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5maXJzdChbMSwgMiwgM10pO1xuICAgICAqIC8vID0+IDFcbiAgICAgKlxuICAgICAqIF8uZmlyc3QoWzEsIDIsIDNdLCAyKTtcbiAgICAgKiAvLyA9PiBbMSwgMl1cbiAgICAgKlxuICAgICAqIF8uZmlyc3QoWzEsIDIsIDNdLCBmdW5jdGlvbihudW0pIHtcbiAgICAgKiAgIHJldHVybiBudW0gPCAzO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IFsxLCAyXVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYmxvY2tlZCc6IGZhbHNlLCAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ3BlYmJsZXMnLCAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnbmEnIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5maXJzdChjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2Jhcm5leScsICdibG9ja2VkJzogdHJ1ZSwgJ2VtcGxveWVyJzogJ3NsYXRlJyB9XVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5wbHVjayhfLmZpcnN0KGNoYXJhY3RlcnMsIHsgJ2VtcGxveWVyJzogJ3NsYXRlJyB9KSwgJ25hbWUnKTtcbiAgICAgKiAvLyA9PiBbJ2Jhcm5leScsICdmcmVkJ11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaXJzdChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBuID0gMCxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ251bWJlcicgJiYgY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCAmJiBjYWxsYmFjayhhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHtcbiAgICAgICAgICBuKys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG4gPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKG4gPT0gbnVsbCB8fCB0aGlzQXJnKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5ID8gYXJyYXlbMF0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgMCwgbmF0aXZlTWluKG5hdGl2ZU1heCgwLCBuKSwgbGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmxhdHRlbnMgYSBuZXN0ZWQgYXJyYXkgKHRoZSBuZXN0aW5nIGNhbiBiZSB0byBhbnkgZGVwdGgpLiBJZiBgaXNTaGFsbG93YFxuICAgICAqIGlzIHRydWV5LCB0aGUgYXJyYXkgd2lsbCBvbmx5IGJlIGZsYXR0ZW5lZCBhIHNpbmdsZSBsZXZlbC4gSWYgYSBjYWxsYmFja1xuICAgICAqIGlzIHByb3ZpZGVkIGVhY2ggZWxlbWVudCBvZiB0aGUgYXJyYXkgaXMgcGFzc2VkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGJlZm9yZVxuICAgICAqIGZsYXR0ZW5pbmcuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZVxuICAgICAqIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleCwgYXJyYXkpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGZsYXR0ZW4uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbaXNTaGFsbG93PWZhbHNlXSBBIGZsYWcgdG8gcmVzdHJpY3QgZmxhdHRlbmluZyB0byBhIHNpbmdsZSBsZXZlbC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBmbGF0dGVuZWQgYXJyYXkuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZmxhdHRlbihbMSwgWzJdLCBbMywgW1s0XV1dXSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDMsIDRdO1xuICAgICAqXG4gICAgICogXy5mbGF0dGVuKFsxLCBbMl0sIFszLCBbWzRdXV1dLCB0cnVlKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgMywgW1s0XV1dO1xuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzMCwgJ3BldHMnOiBbJ2hvcHB5J10gfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwLCAncGV0cyc6IFsnYmFieSBwdXNzJywgJ2Rpbm8nXSB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmxhdHRlbihjaGFyYWN0ZXJzLCAncGV0cycpO1xuICAgICAqIC8vID0+IFsnaG9wcHknLCAnYmFieSBwdXNzJywgJ2Rpbm8nXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZsYXR0ZW4oYXJyYXksIGlzU2hhbGxvdywgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIC8vIGp1Z2dsZSBhcmd1bWVudHNcbiAgICAgIGlmICh0eXBlb2YgaXNTaGFsbG93ICE9ICdib29sZWFuJyAmJiBpc1NoYWxsb3cgIT0gbnVsbCkge1xuICAgICAgICB0aGlzQXJnID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKHR5cGVvZiBpc1NoYWxsb3cgIT0gJ2Z1bmN0aW9uJyAmJiB0aGlzQXJnICYmIHRoaXNBcmdbaXNTaGFsbG93XSA9PT0gYXJyYXkpID8gbnVsbCA6IGlzU2hhbGxvdztcbiAgICAgICAgaXNTaGFsbG93ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICBhcnJheSA9IG1hcChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2VGbGF0dGVuKGFycmF5LCBpc1NoYWxsb3cpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGluZGV4IGF0IHdoaWNoIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGB2YWx1ZWAgaXMgZm91bmQgdXNpbmdcbiAgICAgKiBzdHJpY3QgZXF1YWxpdHkgZm9yIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLiBJZiB0aGUgYXJyYXkgaXMgYWxyZWFkeSBzb3J0ZWRcbiAgICAgKiBwcm92aWRpbmcgYHRydWVgIGZvciBgZnJvbUluZGV4YCB3aWxsIHJ1biBhIGZhc3RlciBiaW5hcnkgc2VhcmNoLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBzZWFyY2guXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58bnVtYmVyfSBbZnJvbUluZGV4PTBdIFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbSBvciBgdHJ1ZWBcbiAgICAgKiAgdG8gcGVyZm9ybSBhIGJpbmFyeSBzZWFyY2ggb24gYSBzb3J0ZWQgYXJyYXkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUgb3IgYC0xYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pbmRleE9mKFsxLCAyLCAzLCAxLCAyLCAzXSwgMik7XG4gICAgICogLy8gPT4gMVxuICAgICAqXG4gICAgICogXy5pbmRleE9mKFsxLCAyLCAzLCAxLCAyLCAzXSwgMiwgMyk7XG4gICAgICogLy8gPT4gNFxuICAgICAqXG4gICAgICogXy5pbmRleE9mKFsxLCAxLCAyLCAyLCAzLCAzXSwgMiwgdHJ1ZSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ID09ICdudW1iZXInKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gICAgICAgIGZyb21JbmRleCA9IChmcm9tSW5kZXggPCAwID8gbmF0aXZlTWF4KDAsIGxlbmd0aCArIGZyb21JbmRleCkgOiBmcm9tSW5kZXggfHwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGZyb21JbmRleCkge1xuICAgICAgICB2YXIgaW5kZXggPSBzb3J0ZWRJbmRleChhcnJheSwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gYXJyYXlbaW5kZXhdID09PSB2YWx1ZSA/IGluZGV4IDogLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYmFzZUluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgYWxsIGJ1dCB0aGUgbGFzdCBlbGVtZW50IG9yIGxhc3QgYG5gIGVsZW1lbnRzIG9mIGFuIGFycmF5LiBJZiBhXG4gICAgICogY2FsbGJhY2sgaXMgcHJvdmlkZWQgZWxlbWVudHMgYXQgdGhlIGVuZCBvZiB0aGUgYXJyYXkgYXJlIGV4Y2x1ZGVkIGZyb21cbiAgICAgKiB0aGUgcmVzdWx0IGFzIGxvbmcgYXMgdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXkuIFRoZSBjYWxsYmFjayBpcyBib3VuZFxuICAgICAqIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleCwgYXJyYXkpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHF1ZXJ5LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fG51bWJlcnxzdHJpbmd9IFtjYWxsYmFjaz0xXSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBlbGVtZW50IG9yIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gZXhjbHVkZS4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yXG4gICAgICogIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCJcbiAgICAgKiAgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBzbGljZSBvZiBgYXJyYXlgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmluaXRpYWwoWzEsIDIsIDNdKTtcbiAgICAgKiAvLyA9PiBbMSwgMl1cbiAgICAgKlxuICAgICAqIF8uaW5pdGlhbChbMSwgMiwgM10sIDIpO1xuICAgICAqIC8vID0+IFsxXVxuICAgICAqXG4gICAgICogXy5pbml0aWFsKFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7XG4gICAgICogICByZXR1cm4gbnVtID4gMTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBbMV1cbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2Jsb2NrZWQnOiBmYWxzZSwgJ2VtcGxveWVyJzogJ3NsYXRlJyB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2Jsb2NrZWQnOiB0cnVlLCAgJ2VtcGxveWVyJzogJ3NsYXRlJyB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2Jsb2NrZWQnOiB0cnVlLCAgJ2VtcGxveWVyJzogJ25hJyB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uaW5pdGlhbChjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2Jhcm5leScsICAnYmxvY2tlZCc6IGZhbHNlLCAnZW1wbG95ZXInOiAnc2xhdGUnIH1dXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnBsdWNrKF8uaW5pdGlhbChjaGFyYWN0ZXJzLCB7ICdlbXBsb3llcic6ICduYScgfSksICduYW1lJyk7XG4gICAgICogLy8gPT4gWydiYXJuZXknLCAnZnJlZCddXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5pdGlhbChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBuID0gMCxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ251bWJlcicgJiYgY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICB2YXIgaW5kZXggPSBsZW5ndGg7XG4gICAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgICAgd2hpbGUgKGluZGV4LS0gJiYgY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpKSB7XG4gICAgICAgICAgbisrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuID0gKGNhbGxiYWNrID09IG51bGwgfHwgdGhpc0FyZykgPyAxIDogY2FsbGJhY2sgfHwgbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgMCwgbmF0aXZlTWluKG5hdGl2ZU1heCgwLCBsZW5ndGggLSBuKSwgbGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiB1bmlxdWUgdmFsdWVzIHByZXNlbnQgaW4gYWxsIHByb3ZpZGVkIGFycmF5cyB1c2luZ1xuICAgICAqIHN0cmljdCBlcXVhbGl0eSBmb3IgY29tcGFyaXNvbnMsIGkuZS4gYD09PWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHsuLi5BcnJheX0gW2FycmF5XSBUaGUgYXJyYXlzIHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHNoYXJlZCB2YWx1ZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uaW50ZXJzZWN0aW9uKFsxLCAyLCAzXSwgWzUsIDIsIDEsIDRdLCBbMiwgMV0pO1xuICAgICAqIC8vID0+IFsxLCAyXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGludGVyc2VjdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW10sXG4gICAgICAgICAgYXJnc0luZGV4ID0gLTEsXG4gICAgICAgICAgYXJnc0xlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgICAgY2FjaGVzID0gZ2V0QXJyYXkoKSxcbiAgICAgICAgICBpbmRleE9mID0gZ2V0SW5kZXhPZigpLFxuICAgICAgICAgIHRydXN0SW5kZXhPZiA9IGluZGV4T2YgPT09IGJhc2VJbmRleE9mLFxuICAgICAgICAgIHNlZW4gPSBnZXRBcnJheSgpO1xuXG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFyZ3VtZW50c1thcmdzSW5kZXhdO1xuICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgfHwgaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgICAgYXJncy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICBjYWNoZXMucHVzaCh0cnVzdEluZGV4T2YgJiYgdmFsdWUubGVuZ3RoID49IGxhcmdlQXJyYXlTaXplICYmXG4gICAgICAgICAgICBjcmVhdGVDYWNoZShhcmdzSW5kZXggPyBhcmdzW2FyZ3NJbmRleF0gOiBzZWVuKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBhcnJheSA9IGFyZ3NbMF0sXG4gICAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICAgIG91dGVyOlxuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGNhY2hlID0gY2FjaGVzWzBdO1xuICAgICAgICB2YWx1ZSA9IGFycmF5W2luZGV4XTtcblxuICAgICAgICBpZiAoKGNhY2hlID8gY2FjaGVJbmRleE9mKGNhY2hlLCB2YWx1ZSkgOiBpbmRleE9mKHNlZW4sIHZhbHVlKSkgPCAwKSB7XG4gICAgICAgICAgYXJnc0luZGV4ID0gYXJnc0xlbmd0aDtcbiAgICAgICAgICAoY2FjaGUgfHwgc2VlbikucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgd2hpbGUgKC0tYXJnc0luZGV4KSB7XG4gICAgICAgICAgICBjYWNoZSA9IGNhY2hlc1thcmdzSW5kZXhdO1xuICAgICAgICAgICAgaWYgKChjYWNoZSA/IGNhY2hlSW5kZXhPZihjYWNoZSwgdmFsdWUpIDogaW5kZXhPZihhcmdzW2FyZ3NJbmRleF0sIHZhbHVlKSkgPCAwKSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChhcmdzTGVuZ3RoLS0pIHtcbiAgICAgICAgY2FjaGUgPSBjYWNoZXNbYXJnc0xlbmd0aF07XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgIHJlbGVhc2VPYmplY3QoY2FjaGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZWxlYXNlQXJyYXkoY2FjaGVzKTtcbiAgICAgIHJlbGVhc2VBcnJheShzZWVuKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbGFzdCBlbGVtZW50IG9yIGxhc3QgYG5gIGVsZW1lbnRzIG9mIGFuIGFycmF5LiBJZiBhIGNhbGxiYWNrIGlzXG4gICAgICogcHJvdmlkZWQgZWxlbWVudHMgYXQgdGhlIGVuZCBvZiB0aGUgYXJyYXkgYXJlIHJldHVybmVkIGFzIGxvbmcgYXMgdGhlXG4gICAgICogY2FsbGJhY2sgcmV0dXJucyB0cnVleS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZFxuICAgICAqIHdpdGggdGhyZWUgYXJndW1lbnRzOyAodmFsdWUsIGluZGV4LCBhcnJheSkuXG4gICAgICpcbiAgICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLnBsdWNrXCIgc3R5bGVcbiAgICAgKiBjYWxsYmFjayB3aWxsIHJldHVybiB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBJZiBhbiBvYmplY3QgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4gb2JqZWN0LFxuICAgICAqIGVsc2UgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gcXVlcnkuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8bnVtYmVyfHN0cmluZ30gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBlbGVtZW50IG9yIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmV0dXJuLiBJZiBhIHByb3BlcnR5IG5hbWUgb3JcbiAgICAgKiAgb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZCB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIlxuICAgICAqICBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBsYXN0IGVsZW1lbnQocykgb2YgYGFycmF5YC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5sYXN0KFsxLCAyLCAzXSk7XG4gICAgICogLy8gPT4gM1xuICAgICAqXG4gICAgICogXy5sYXN0KFsxLCAyLCAzXSwgMik7XG4gICAgICogLy8gPT4gWzIsIDNdXG4gICAgICpcbiAgICAgKiBfLmxhc3QoWzEsIDIsIDNdLCBmdW5jdGlvbihudW0pIHtcbiAgICAgKiAgIHJldHVybiBudW0gPiAxO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IFsyLCAzXVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICAnYmxvY2tlZCc6IGZhbHNlLCAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ3BlYmJsZXMnLCAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnbmEnIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5wbHVjayhfLmxhc3QoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKSwgJ25hbWUnKTtcbiAgICAgKiAvLyA9PiBbJ2ZyZWQnLCAncGViYmxlcyddXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmxhc3QoY2hhcmFjdGVycywgeyAnZW1wbG95ZXInOiAnbmEnIH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ3BlYmJsZXMnLCAnYmxvY2tlZCc6IHRydWUsICdlbXBsb3llcic6ICduYScgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsYXN0KGFycmF5LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIG4gPSAwLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcblxuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPSAnbnVtYmVyJyAmJiBjYWxsYmFjayAhPSBudWxsKSB7XG4gICAgICAgIHZhciBpbmRleCA9IGxlbmd0aDtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICB3aGlsZSAoaW5kZXgtLSAmJiBjYWxsYmFjayhhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHtcbiAgICAgICAgICBuKys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG4gPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKG4gPT0gbnVsbCB8fCB0aGlzQXJnKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5ID8gYXJyYXlbbGVuZ3RoIC0gMV0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgbmF0aXZlTWF4KDAsIGxlbmd0aCAtIG4pKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgbGFzdCBvY2N1cnJlbmNlIG9mIGB2YWx1ZWAgaXMgZm91bmQgdXNpbmcgc3RyaWN0XG4gICAgICogZXF1YWxpdHkgZm9yIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLiBJZiBgZnJvbUluZGV4YCBpcyBuZWdhdGl2ZSwgaXQgaXMgdXNlZFxuICAgICAqIGFzIHRoZSBvZmZzZXQgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZWFyY2ggZm9yLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbZnJvbUluZGV4PWFycmF5Lmxlbmd0aC0xXSBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUgb3IgYC0xYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5sYXN0SW5kZXhPZihbMSwgMiwgMywgMSwgMiwgM10sIDIpO1xuICAgICAqIC8vID0+IDRcbiAgICAgKlxuICAgICAqIF8ubGFzdEluZGV4T2YoWzEsIDIsIDMsIDEsIDIsIDNdLCAyLCAzKTtcbiAgICAgKiAvLyA9PiAxXG4gICAgICovXG4gICAgZnVuY3Rpb24gbGFzdEluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcbiAgICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ID09ICdudW1iZXInKSB7XG4gICAgICAgIGluZGV4ID0gKGZyb21JbmRleCA8IDAgPyBuYXRpdmVNYXgoMCwgaW5kZXggKyBmcm9tSW5kZXgpIDogbmF0aXZlTWluKGZyb21JbmRleCwgaW5kZXggLSAxKSkgKyAxO1xuICAgICAgfVxuICAgICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgICAgaWYgKGFycmF5W2luZGV4XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFsbCBwcm92aWRlZCB2YWx1ZXMgZnJvbSB0aGUgZ2l2ZW4gYXJyYXkgdXNpbmcgc3RyaWN0IGVxdWFsaXR5IGZvclxuICAgICAqIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBtb2RpZnkuXG4gICAgICogQHBhcmFtIHsuLi4qfSBbdmFsdWVdIFRoZSB2YWx1ZXMgdG8gcmVtb3ZlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBgYXJyYXlgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgYXJyYXkgPSBbMSwgMiwgMywgMSwgMiwgM107XG4gICAgICogXy5wdWxsKGFycmF5LCAyLCAzKTtcbiAgICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAgICogLy8gPT4gWzEsIDFdXG4gICAgICovXG4gICAgZnVuY3Rpb24gcHVsbChhcnJheSkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgICAgYXJnc0luZGV4ID0gMCxcbiAgICAgICAgICBhcmdzTGVuZ3RoID0gYXJncy5sZW5ndGgsXG4gICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwO1xuXG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgdmFsdWUgPSBhcmdzW2FyZ3NJbmRleF07XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKGFycmF5W2luZGV4XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHNwbGljZS5jYWxsKGFycmF5LCBpbmRleC0tLCAxKTtcbiAgICAgICAgICAgIGxlbmd0aC0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgbnVtYmVycyAocG9zaXRpdmUgYW5kL29yIG5lZ2F0aXZlKSBwcm9ncmVzc2luZyBmcm9tXG4gICAgICogYHN0YXJ0YCB1cCB0byBidXQgbm90IGluY2x1ZGluZyBgZW5kYC4gSWYgYHN0YXJ0YCBpcyBsZXNzIHRoYW4gYHN0b3BgIGFcbiAgICAgKiB6ZXJvLWxlbmd0aCByYW5nZSBpcyBjcmVhdGVkIHVubGVzcyBhIG5lZ2F0aXZlIGBzdGVwYCBpcyBzcGVjaWZpZWQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtzdGFydD0wXSBUaGUgc3RhcnQgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgVGhlIGVuZCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtzdGVwPTFdIFRoZSB2YWx1ZSB0byBpbmNyZW1lbnQgb3IgZGVjcmVtZW50IGJ5LlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyByYW5nZSBhcnJheS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5yYW5nZSg0KTtcbiAgICAgKiAvLyA9PiBbMCwgMSwgMiwgM11cbiAgICAgKlxuICAgICAqIF8ucmFuZ2UoMSwgNSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDMsIDRdXG4gICAgICpcbiAgICAgKiBfLnJhbmdlKDAsIDIwLCA1KTtcbiAgICAgKiAvLyA9PiBbMCwgNSwgMTAsIDE1XVxuICAgICAqXG4gICAgICogXy5yYW5nZSgwLCAtNCwgLTEpO1xuICAgICAqIC8vID0+IFswLCAtMSwgLTIsIC0zXVxuICAgICAqXG4gICAgICogXy5yYW5nZSgxLCA0LCAwKTtcbiAgICAgKiAvLyA9PiBbMSwgMSwgMV1cbiAgICAgKlxuICAgICAqIF8ucmFuZ2UoMCk7XG4gICAgICogLy8gPT4gW11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByYW5nZShzdGFydCwgZW5kLCBzdGVwKSB7XG4gICAgICBzdGFydCA9ICtzdGFydCB8fCAwO1xuICAgICAgc3RlcCA9IHR5cGVvZiBzdGVwID09ICdudW1iZXInID8gc3RlcCA6ICgrc3RlcCB8fCAxKTtcblxuICAgICAgaWYgKGVuZCA9PSBudWxsKSB7XG4gICAgICAgIGVuZCA9IHN0YXJ0O1xuICAgICAgICBzdGFydCA9IDA7XG4gICAgICB9XG4gICAgICAvLyB1c2UgYEFycmF5KGxlbmd0aClgIHNvIGVuZ2luZXMgbGlrZSBDaGFrcmEgYW5kIFY4IGF2b2lkIHNsb3dlciBtb2Rlc1xuICAgICAgLy8gaHR0cDovL3lvdXR1LmJlL1hBcUlwR1U4WlprI3Q9MTdtMjVzXG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBuYXRpdmVNYXgoMCwgY2VpbCgoZW5kIC0gc3RhcnQpIC8gKHN0ZXAgfHwgMSkpKSxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICByZXN1bHRbaW5kZXhdID0gc3RhcnQ7XG4gICAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYWxsIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgdGhhdCB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleSBmb3JcbiAgICAgKiBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiByZW1vdmVkIGVsZW1lbnRzLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgXG4gICAgICogYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBtb2RpZnkuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgcmVtb3ZlZCBlbGVtZW50cy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGFycmF5ID0gWzEsIDIsIDMsIDQsIDUsIDZdO1xuICAgICAqIHZhciBldmVucyA9IF8ucmVtb3ZlKGFycmF5LCBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSAlIDIgPT0gMDsgfSk7XG4gICAgICpcbiAgICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAgICogLy8gPT4gWzEsIDMsIDVdXG4gICAgICpcbiAgICAgKiBjb25zb2xlLmxvZyhldmVucyk7XG4gICAgICogLy8gPT4gWzIsIDQsIDZdXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgICBzcGxpY2UuY2FsbChhcnJheSwgaW5kZXgtLSwgMSk7XG4gICAgICAgICAgbGVuZ3RoLS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG9wcG9zaXRlIG9mIGBfLmluaXRpYWxgIHRoaXMgbWV0aG9kIGdldHMgYWxsIGJ1dCB0aGUgZmlyc3QgZWxlbWVudCBvclxuICAgICAqIGZpcnN0IGBuYCBlbGVtZW50cyBvZiBhbiBhcnJheS4gSWYgYSBjYWxsYmFjayBmdW5jdGlvbiBpcyBwcm92aWRlZCBlbGVtZW50c1xuICAgICAqIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGFycmF5IGFyZSBleGNsdWRlZCBmcm9tIHRoZSByZXN1bHQgYXMgbG9uZyBhcyB0aGVcbiAgICAgKiBjYWxsYmFjayByZXR1cm5zIHRydWV5LiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkXG4gICAgICogd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGRyb3AsIHRhaWxcbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHF1ZXJ5LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fG51bWJlcnxzdHJpbmd9IFtjYWxsYmFjaz0xXSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBlbGVtZW50IG9yIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gZXhjbHVkZS4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yXG4gICAgICogIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCJcbiAgICAgKiAgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBzbGljZSBvZiBgYXJyYXlgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnJlc3QoWzEsIDIsIDNdKTtcbiAgICAgKiAvLyA9PiBbMiwgM11cbiAgICAgKlxuICAgICAqIF8ucmVzdChbMSwgMiwgM10sIDIpO1xuICAgICAqIC8vID0+IFszXVxuICAgICAqXG4gICAgICogXy5yZXN0KFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7XG4gICAgICogICByZXR1cm4gbnVtIDwgMztcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBbM11cbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2Jsb2NrZWQnOiB0cnVlLCAgJ2VtcGxveWVyJzogJ3NsYXRlJyB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2Jsb2NrZWQnOiBmYWxzZSwgICdlbXBsb3llcic6ICdzbGF0ZScgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAncGViYmxlcycsICdibG9ja2VkJzogdHJ1ZSwgJ2VtcGxveWVyJzogJ25hJyB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8ucGx1Y2soXy5yZXN0KGNoYXJhY3RlcnMsICdibG9ja2VkJyksICduYW1lJyk7XG4gICAgICogLy8gPT4gWydmcmVkJywgJ3BlYmJsZXMnXVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5yZXN0KGNoYXJhY3RlcnMsIHsgJ2VtcGxveWVyJzogJ3NsYXRlJyB9KTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdwZWJibGVzJywgJ2Jsb2NrZWQnOiB0cnVlLCAnZW1wbG95ZXInOiAnbmEnIH1dXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzdChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ251bWJlcicgJiYgY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICB2YXIgbiA9IDAsXG4gICAgICAgICAgICBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwO1xuXG4gICAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGggJiYgY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpKSB7XG4gICAgICAgICAgbisrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuID0gKGNhbGxiYWNrID09IG51bGwgfHwgdGhpc0FyZykgPyAxIDogbmF0aXZlTWF4KDAsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXNlcyBhIGJpbmFyeSBzZWFyY2ggdG8gZGV0ZXJtaW5lIHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaCBhIHZhbHVlXG4gICAgICogc2hvdWxkIGJlIGluc2VydGVkIGludG8gYSBnaXZlbiBzb3J0ZWQgYXJyYXkgaW4gb3JkZXIgdG8gbWFpbnRhaW4gdGhlIHNvcnRcbiAgICAgKiBvcmRlciBvZiB0aGUgYXJyYXkuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBleGVjdXRlZCBmb3JcbiAgICAgKiBgdmFsdWVgIGFuZCBlYWNoIGVsZW1lbnQgb2YgYGFycmF5YCB0byBjb21wdXRlIHRoZWlyIHNvcnQgcmFua2luZy4gVGhlXG4gICAgICogY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggb25lIGFyZ3VtZW50OyAodmFsdWUpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGluc3BlY3QuXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gZXZhbHVhdGUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBpbmRleCBhdCB3aGljaCBgdmFsdWVgIHNob3VsZCBiZSBpbnNlcnRlZFxuICAgICAqICBpbnRvIGBhcnJheWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uc29ydGVkSW5kZXgoWzIwLCAzMCwgNTBdLCA0MCk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5zb3J0ZWRJbmRleChbeyAneCc6IDIwIH0sIHsgJ3gnOiAzMCB9LCB7ICd4JzogNTAgfV0sIHsgJ3gnOiA0MCB9LCAneCcpO1xuICAgICAqIC8vID0+IDJcbiAgICAgKlxuICAgICAqIHZhciBkaWN0ID0ge1xuICAgICAqICAgJ3dvcmRUb051bWJlcic6IHsgJ3R3ZW50eSc6IDIwLCAndGhpcnR5JzogMzAsICdmb3VydHknOiA0MCwgJ2ZpZnR5JzogNTAgfVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLnNvcnRlZEluZGV4KFsndHdlbnR5JywgJ3RoaXJ0eScsICdmaWZ0eSddLCAnZm91cnR5JywgZnVuY3Rpb24od29yZCkge1xuICAgICAqICAgcmV0dXJuIGRpY3Qud29yZFRvTnVtYmVyW3dvcmRdO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IDJcbiAgICAgKlxuICAgICAqIF8uc29ydGVkSW5kZXgoWyd0d2VudHknLCAndGhpcnR5JywgJ2ZpZnR5J10sICdmb3VydHknLCBmdW5jdGlvbih3b3JkKSB7XG4gICAgICogICByZXR1cm4gdGhpcy53b3JkVG9OdW1iZXJbd29yZF07XG4gICAgICogfSwgZGljdCk7XG4gICAgICogLy8gPT4gMlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvcnRlZEluZGV4KGFycmF5LCB2YWx1ZSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBsb3cgPSAwLFxuICAgICAgICAgIGhpZ2ggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IGxvdztcblxuICAgICAgLy8gZXhwbGljaXRseSByZWZlcmVuY2UgYGlkZW50aXR5YCBmb3IgYmV0dGVyIGlubGluaW5nIGluIEZpcmVmb3hcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgPyBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDEpIDogaWRlbnRpdHk7XG4gICAgICB2YWx1ZSA9IGNhbGxiYWNrKHZhbHVlKTtcblxuICAgICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgICAgKGNhbGxiYWNrKGFycmF5W21pZF0pIDwgdmFsdWUpXG4gICAgICAgICAgPyBsb3cgPSBtaWQgKyAxXG4gICAgICAgICAgOiBoaWdoID0gbWlkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxvdztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIHVuaXF1ZSB2YWx1ZXMsIGluIG9yZGVyLCBvZiB0aGUgcHJvdmlkZWQgYXJyYXlzIHVzaW5nXG4gICAgICogc3RyaWN0IGVxdWFsaXR5IGZvciBjb21wYXJpc29ucywgaS5lLiBgPT09YC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBbYXJyYXldIFRoZSBhcnJheXMgdG8gaW5zcGVjdC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgY29tYmluZWQgdmFsdWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnVuaW9uKFsxLCAyLCAzXSwgWzUsIDIsIDEsIDRdLCBbMiwgMV0pO1xuICAgICAqIC8vID0+IFsxLCAyLCAzLCA1LCA0XVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuaW9uKCkge1xuICAgICAgcmV0dXJuIGJhc2VVbmlxKGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBkdXBsaWNhdGUtdmFsdWUtZnJlZSB2ZXJzaW9uIG9mIGFuIGFycmF5IHVzaW5nIHN0cmljdCBlcXVhbGl0eVxuICAgICAqIGZvciBjb21wYXJpc29ucywgaS5lLiBgPT09YC4gSWYgdGhlIGFycmF5IGlzIHNvcnRlZCwgcHJvdmlkaW5nXG4gICAgICogYHRydWVgIGZvciBgaXNTb3J0ZWRgIHdpbGwgdXNlIGEgZmFzdGVyIGFsZ29yaXRobS4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZFxuICAgICAqIGVhY2ggZWxlbWVudCBvZiBgYXJyYXlgIGlzIHBhc3NlZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBiZWZvcmUgdW5pcXVlbmVzc1xuICAgICAqIGlzIGNvbXB1dGVkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICAgKiBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIHVuaXF1ZVxuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gcHJvY2Vzcy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc1NvcnRlZD1mYWxzZV0gQSBmbGFnIHRvIGluZGljYXRlIHRoYXQgYGFycmF5YCBpcyBzb3J0ZWQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBkdXBsaWNhdGUtdmFsdWUtZnJlZSBhcnJheS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy51bmlxKFsxLCAyLCAxLCAzLCAxXSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDNdXG4gICAgICpcbiAgICAgKiBfLnVuaXEoWzEsIDEsIDIsIDIsIDNdLCB0cnVlKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgM11cbiAgICAgKlxuICAgICAqIF8udW5pcShbJ0EnLCAnYicsICdDJywgJ2EnLCAnQicsICdjJ10sIGZ1bmN0aW9uKGxldHRlcikgeyByZXR1cm4gbGV0dGVyLnRvTG93ZXJDYXNlKCk7IH0pO1xuICAgICAqIC8vID0+IFsnQScsICdiJywgJ0MnXVxuICAgICAqXG4gICAgICogXy51bmlxKFsxLCAyLjUsIDMsIDEuNSwgMiwgMy41XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiB0aGlzLmZsb29yKG51bSk7IH0sIE1hdGgpO1xuICAgICAqIC8vID0+IFsxLCAyLjUsIDNdXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnVuaXEoW3sgJ3gnOiAxIH0sIHsgJ3gnOiAyIH0sIHsgJ3gnOiAxIH1dLCAneCcpO1xuICAgICAqIC8vID0+IFt7ICd4JzogMSB9LCB7ICd4JzogMiB9XVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuaXEoYXJyYXksIGlzU29ydGVkLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgLy8ganVnZ2xlIGFyZ3VtZW50c1xuICAgICAgaWYgKHR5cGVvZiBpc1NvcnRlZCAhPSAnYm9vbGVhbicgJiYgaXNTb3J0ZWQgIT0gbnVsbCkge1xuICAgICAgICB0aGlzQXJnID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKHR5cGVvZiBpc1NvcnRlZCAhPSAnZnVuY3Rpb24nICYmIHRoaXNBcmcgJiYgdGhpc0FyZ1tpc1NvcnRlZF0gPT09IGFycmF5KSA/IG51bGwgOiBpc1NvcnRlZDtcbiAgICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBiYXNlVW5pcShhcnJheSwgaXNTb3J0ZWQsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGV4Y2x1ZGluZyBhbGwgcHJvdmlkZWQgdmFsdWVzIHVzaW5nIHN0cmljdCBlcXVhbGl0eSBmb3JcbiAgICAgKiBjb21wYXJpc29ucywgaS5lLiBgPT09YC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gZmlsdGVyLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gW3ZhbHVlXSBUaGUgdmFsdWVzIHRvIGV4Y2x1ZGUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy53aXRob3V0KFsxLCAyLCAxLCAwLCAzLCAxLCA0XSwgMCwgMSk7XG4gICAgICogLy8gPT4gWzIsIDMsIDRdXG4gICAgICovXG4gICAgZnVuY3Rpb24gd2l0aG91dChhcnJheSkge1xuICAgICAgcmV0dXJuIGJhc2VEaWZmZXJlbmNlKGFycmF5LCBzbGljZShhcmd1bWVudHMsIDEpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IHRoYXQgaXMgdGhlIHN5bW1ldHJpYyBkaWZmZXJlbmNlIG9mIHRoZSBwcm92aWRlZCBhcnJheXMuXG4gICAgICogU2VlIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3ltbWV0cmljX2RpZmZlcmVuY2UuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHsuLi5BcnJheX0gW2FycmF5XSBUaGUgYXJyYXlzIHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy54b3IoWzEsIDIsIDNdLCBbNSwgMiwgMSwgNF0pO1xuICAgICAqIC8vID0+IFszLCA1LCA0XVxuICAgICAqXG4gICAgICogXy54b3IoWzEsIDIsIDVdLCBbMiwgMywgNV0sIFszLCA0LCA1XSk7XG4gICAgICogLy8gPT4gWzEsIDQsIDVdXG4gICAgICovXG4gICAgZnVuY3Rpb24geG9yKCkge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcblxuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgaWYgKGlzQXJyYXkoYXJyYXkpIHx8IGlzQXJndW1lbnRzKGFycmF5KSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSByZXN1bHRcbiAgICAgICAgICAgID8gYmFzZVVuaXEoYmFzZURpZmZlcmVuY2UocmVzdWx0LCBhcnJheSkuY29uY2F0KGJhc2VEaWZmZXJlbmNlKGFycmF5LCByZXN1bHQpKSlcbiAgICAgICAgICAgIDogYXJyYXk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQgfHwgW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiBncm91cGVkIGVsZW1lbnRzLCB0aGUgZmlyc3Qgb2Ygd2hpY2ggY29udGFpbnMgdGhlIGZpcnN0XG4gICAgICogZWxlbWVudHMgb2YgdGhlIGdpdmVuIGFycmF5cywgdGhlIHNlY29uZCBvZiB3aGljaCBjb250YWlucyB0aGUgc2Vjb25kXG4gICAgICogZWxlbWVudHMgb2YgdGhlIGdpdmVuIGFycmF5cywgYW5kIHNvIG9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIHVuemlwXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IFthcnJheV0gQXJyYXlzIHRvIHByb2Nlc3MuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGdyb3VwZWQgZWxlbWVudHMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uemlwKFsnZnJlZCcsICdiYXJuZXknXSwgWzMwLCA0MF0sIFt0cnVlLCBmYWxzZV0pO1xuICAgICAqIC8vID0+IFtbJ2ZyZWQnLCAzMCwgdHJ1ZV0sIFsnYmFybmV5JywgNDAsIGZhbHNlXV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB6aXAoKSB7XG4gICAgICB2YXIgYXJyYXkgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50cyA6IGFyZ3VtZW50c1swXSxcbiAgICAgICAgICBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gbWF4KHBsdWNrKGFycmF5LCAnbGVuZ3RoJykpIDogMCxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGggPCAwID8gMCA6IGxlbmd0aCk7XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFtpbmRleF0gPSBwbHVjayhhcnJheSwgaW5kZXgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBjb21wb3NlZCBmcm9tIGFycmF5cyBvZiBga2V5c2AgYW5kIGB2YWx1ZXNgLiBQcm92aWRlXG4gICAgICogZWl0aGVyIGEgc2luZ2xlIHR3byBkaW1lbnNpb25hbCBhcnJheSwgaS5lLiBgW1trZXkxLCB2YWx1ZTFdLCBba2V5MiwgdmFsdWUyXV1gXG4gICAgICogb3IgdHdvIGFycmF5cywgb25lIG9mIGBrZXlzYCBhbmQgb25lIG9mIGNvcnJlc3BvbmRpbmcgYHZhbHVlc2AuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgb2JqZWN0XG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGtleXMgVGhlIGFycmF5IG9mIGtleXMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlcz1bXV0gVGhlIGFycmF5IG9mIHZhbHVlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGFuIG9iamVjdCBjb21wb3NlZCBvZiB0aGUgZ2l2ZW4ga2V5cyBhbmRcbiAgICAgKiAgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uemlwT2JqZWN0KFsnZnJlZCcsICdiYXJuZXknXSwgWzMwLCA0MF0pO1xuICAgICAqIC8vID0+IHsgJ2ZyZWQnOiAzMCwgJ2Jhcm5leSc6IDQwIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB6aXBPYmplY3Qoa2V5cywgdmFsdWVzKSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBrZXlzID8ga2V5cy5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAoIXZhbHVlcyAmJiBsZW5ndGggJiYgIWlzQXJyYXkoa2V5c1swXSkpIHtcbiAgICAgICAgdmFsdWVzID0gW107XG4gICAgICB9XG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpbmRleF07XG4gICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSBpZiAoa2V5KSB7XG4gICAgICAgICAgcmVzdWx0W2tleVswXV0gPSBrZXlbMV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBleGVjdXRlcyBgZnVuY2AsIHdpdGggIHRoZSBgdGhpc2AgYmluZGluZyBhbmRcbiAgICAgKiBhcmd1bWVudHMgb2YgdGhlIGNyZWF0ZWQgZnVuY3Rpb24sIG9ubHkgYWZ0ZXIgYmVpbmcgY2FsbGVkIGBuYCB0aW1lcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIHRpbWVzIHRoZSBmdW5jdGlvbiBtdXN0IGJlIGNhbGxlZCBiZWZvcmVcbiAgICAgKiAgYGZ1bmNgIGlzIGV4ZWN1dGVkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHJlc3RyaWN0LlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHJlc3RyaWN0ZWQgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBzYXZlcyA9IFsncHJvZmlsZScsICdzZXR0aW5ncyddO1xuICAgICAqXG4gICAgICogdmFyIGRvbmUgPSBfLmFmdGVyKHNhdmVzLmxlbmd0aCwgZnVuY3Rpb24oKSB7XG4gICAgICogICBjb25zb2xlLmxvZygnRG9uZSBzYXZpbmchJyk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBfLmZvckVhY2goc2F2ZXMsIGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgKiAgIGFzeW5jU2F2ZSh7ICd0eXBlJzogdHlwZSwgJ2NvbXBsZXRlJzogZG9uZSB9KTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBsb2dzICdEb25lIHNhdmluZyEnLCBhZnRlciBhbGwgc2F2ZXMgaGF2ZSBjb21wbGV0ZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZnRlcihuLCBmdW5jKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKC0tbiA8IDEpIHtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgaW52b2tlcyBgZnVuY2Agd2l0aCB0aGUgYHRoaXNgXG4gICAgICogYmluZGluZyBvZiBgdGhpc0FyZ2AgYW5kIHByZXBlbmRzIGFueSBhZGRpdGlvbmFsIGBiaW5kYCBhcmd1bWVudHMgdG8gdGhvc2VcbiAgICAgKiBwcm92aWRlZCB0byB0aGUgYm91bmQgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gYmluZC5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gW2FyZ10gQXJndW1lbnRzIHRvIGJlIHBhcnRpYWxseSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGJvdW5kIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgZnVuYyA9IGZ1bmN0aW9uKGdyZWV0aW5nKSB7XG4gICAgICogICByZXR1cm4gZ3JlZXRpbmcgKyAnICcgKyB0aGlzLm5hbWU7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGZ1bmMgPSBfLmJpbmQoZnVuYywgeyAnbmFtZSc6ICdmcmVkJyB9LCAnaGknKTtcbiAgICAgKiBmdW5jKCk7XG4gICAgICogLy8gPT4gJ2hpIGZyZWQnXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmluZChmdW5jLCB0aGlzQXJnKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDJcbiAgICAgICAgPyBjcmVhdGVXcmFwcGVyKGZ1bmMsIDE3LCBzbGljZShhcmd1bWVudHMsIDIpLCBudWxsLCB0aGlzQXJnKVxuICAgICAgICA6IGNyZWF0ZVdyYXBwZXIoZnVuYywgMSwgbnVsbCwgbnVsbCwgdGhpc0FyZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQmluZHMgbWV0aG9kcyBvZiBhbiBvYmplY3QgdG8gdGhlIG9iamVjdCBpdHNlbGYsIG92ZXJ3cml0aW5nIHRoZSBleGlzdGluZ1xuICAgICAqIG1ldGhvZC4gTWV0aG9kIG5hbWVzIG1heSBiZSBzcGVjaWZpZWQgYXMgaW5kaXZpZHVhbCBhcmd1bWVudHMgb3IgYXMgYXJyYXlzXG4gICAgICogb2YgbWV0aG9kIG5hbWVzLiBJZiBubyBtZXRob2QgbmFtZXMgYXJlIHByb3ZpZGVkIGFsbCB0aGUgZnVuY3Rpb24gcHJvcGVydGllc1xuICAgICAqIG9mIGBvYmplY3RgIHdpbGwgYmUgYm91bmQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGJpbmQgYW5kIGFzc2lnbiB0aGUgYm91bmQgbWV0aG9kcyB0by5cbiAgICAgKiBAcGFyYW0gey4uLnN0cmluZ30gW21ldGhvZE5hbWVdIFRoZSBvYmplY3QgbWV0aG9kIG5hbWVzIHRvXG4gICAgICogIGJpbmQsIHNwZWNpZmllZCBhcyBpbmRpdmlkdWFsIG1ldGhvZCBuYW1lcyBvciBhcnJheXMgb2YgbWV0aG9kIG5hbWVzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciB2aWV3ID0ge1xuICAgICAqICAgJ2xhYmVsJzogJ2RvY3MnLFxuICAgICAqICAgJ29uQ2xpY2snOiBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NsaWNrZWQgJyArIHRoaXMubGFiZWwpOyB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8uYmluZEFsbCh2aWV3KTtcbiAgICAgKiBqUXVlcnkoJyNkb2NzJykub24oJ2NsaWNrJywgdmlldy5vbkNsaWNrKTtcbiAgICAgKiAvLyA9PiBsb2dzICdjbGlja2VkIGRvY3MnLCB3aGVuIHRoZSBidXR0b24gaXMgY2xpY2tlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJpbmRBbGwob2JqZWN0KSB7XG4gICAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgZmFsc2UsIDEpIDogZnVuY3Rpb25zKG9iamVjdCksXG4gICAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBmdW5jcy5sZW5ndGg7XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBrZXkgPSBmdW5jc1tpbmRleF07XG4gICAgICAgIG9iamVjdFtrZXldID0gY3JlYXRlV3JhcHBlcihvYmplY3Rba2V5XSwgMSwgbnVsbCwgbnVsbCwgb2JqZWN0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCBpbnZva2VzIHRoZSBtZXRob2QgYXQgYG9iamVjdFtrZXldYFxuICAgICAqIGFuZCBwcmVwZW5kcyBhbnkgYWRkaXRpb25hbCBgYmluZEtleWAgYXJndW1lbnRzIHRvIHRob3NlIHByb3ZpZGVkIHRvIHRoZSBib3VuZFxuICAgICAqIGZ1bmN0aW9uLiBUaGlzIG1ldGhvZCBkaWZmZXJzIGZyb20gYF8uYmluZGAgYnkgYWxsb3dpbmcgYm91bmQgZnVuY3Rpb25zIHRvXG4gICAgICogcmVmZXJlbmNlIG1ldGhvZHMgdGhhdCB3aWxsIGJlIHJlZGVmaW5lZCBvciBkb24ndCB5ZXQgZXhpc3QuXG4gICAgICogU2VlIGh0dHA6Ly9taWNoYXV4LmNhL2FydGljbGVzL2xhenktZnVuY3Rpb24tZGVmaW5pdGlvbi1wYXR0ZXJuLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0aGUgbWV0aG9kIGJlbG9uZ3MgdG8uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBtZXRob2QuXG4gICAgICogQHBhcmFtIHsuLi4qfSBbYXJnXSBBcmd1bWVudHMgdG8gYmUgcGFydGlhbGx5IGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYm91bmQgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBvYmplY3QgPSB7XG4gICAgICogICAnbmFtZSc6ICdmcmVkJyxcbiAgICAgKiAgICdncmVldCc6IGZ1bmN0aW9uKGdyZWV0aW5nKSB7XG4gICAgICogICAgIHJldHVybiBncmVldGluZyArICcgJyArIHRoaXMubmFtZTtcbiAgICAgKiAgIH1cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGZ1bmMgPSBfLmJpbmRLZXkob2JqZWN0LCAnZ3JlZXQnLCAnaGknKTtcbiAgICAgKiBmdW5jKCk7XG4gICAgICogLy8gPT4gJ2hpIGZyZWQnXG4gICAgICpcbiAgICAgKiBvYmplY3QuZ3JlZXQgPSBmdW5jdGlvbihncmVldGluZykge1xuICAgICAqICAgcmV0dXJuIGdyZWV0aW5nICsgJ3lhICcgKyB0aGlzLm5hbWUgKyAnISc7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGZ1bmMoKTtcbiAgICAgKiAvLyA9PiAnaGl5YSBmcmVkISdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiaW5kS2V5KG9iamVjdCwga2V5KSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDJcbiAgICAgICAgPyBjcmVhdGVXcmFwcGVyKGtleSwgMTksIHNsaWNlKGFyZ3VtZW50cywgMiksIG51bGwsIG9iamVjdClcbiAgICAgICAgOiBjcmVhdGVXcmFwcGVyKGtleSwgMywgbnVsbCwgbnVsbCwgb2JqZWN0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgdGhlIHByb3ZpZGVkIGZ1bmN0aW9ucyxcbiAgICAgKiB3aGVyZSBlYWNoIGZ1bmN0aW9uIGNvbnN1bWVzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgICAgKiBGb3IgZXhhbXBsZSwgY29tcG9zaW5nIHRoZSBmdW5jdGlvbnMgYGYoKWAsIGBnKClgLCBhbmQgYGgoKWAgcHJvZHVjZXMgYGYoZyhoKCkpKWAuXG4gICAgICogRWFjaCBmdW5jdGlvbiBpcyBleGVjdXRlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY29tcG9zZWQgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gW2Z1bmNdIEZ1bmN0aW9ucyB0byBjb21wb3NlLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGNvbXBvc2VkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgcmVhbE5hbWVNYXAgPSB7XG4gICAgICogICAncGViYmxlcyc6ICdwZW5lbG9wZSdcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGZvcm1hdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgKiAgIG5hbWUgPSByZWFsTmFtZU1hcFtuYW1lLnRvTG93ZXJDYXNlKCldIHx8IG5hbWU7XG4gICAgICogICByZXR1cm4gbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGdyZWV0ID0gZnVuY3Rpb24oZm9ybWF0dGVkKSB7XG4gICAgICogICByZXR1cm4gJ0hpeWEgJyArIGZvcm1hdHRlZCArICchJztcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIHdlbGNvbWUgPSBfLmNvbXBvc2UoZ3JlZXQsIGZvcm1hdCk7XG4gICAgICogd2VsY29tZSgncGViYmxlcycpO1xuICAgICAqIC8vID0+ICdIaXlhIFBlbmVsb3BlISdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjb21wb3NlKCkge1xuICAgICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGxlbmd0aCA9IGZ1bmNzLmxlbmd0aDtcblxuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIGlmICghaXNGdW5jdGlvbihmdW5jc1tsZW5ndGhdKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgICAgICBsZW5ndGggPSBmdW5jcy5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgICAgYXJncyA9IFtmdW5jc1tsZW5ndGhdLmFwcGx5KHRoaXMsIGFyZ3MpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHdoaWNoIGFjY2VwdHMgb25lIG9yIG1vcmUgYXJndW1lbnRzIG9mIGBmdW5jYCB0aGF0IHdoZW5cbiAgICAgKiBpbnZva2VkIGVpdGhlciBleGVjdXRlcyBgZnVuY2AgcmV0dXJuaW5nIGl0cyByZXN1bHQsIGlmIGFsbCBgZnVuY2AgYXJndW1lbnRzXG4gICAgICogaGF2ZSBiZWVuIHByb3ZpZGVkLCBvciByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBvciBtb3JlIG9mIHRoZVxuICAgICAqIHJlbWFpbmluZyBgZnVuY2AgYXJndW1lbnRzLCBhbmQgc28gb24uIFRoZSBhcml0eSBvZiBgZnVuY2AgY2FuIGJlIHNwZWNpZmllZFxuICAgICAqIGlmIGBmdW5jLmxlbmd0aGAgaXMgbm90IHN1ZmZpY2llbnQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gY3VycnkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFthcml0eT1mdW5jLmxlbmd0aF0gVGhlIGFyaXR5IG9mIGBmdW5jYC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBjdXJyaWVkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY3VycmllZCA9IF8uY3VycnkoZnVuY3Rpb24oYSwgYiwgYykge1xuICAgICAqICAgY29uc29sZS5sb2coYSArIGIgKyBjKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIGN1cnJpZWQoMSkoMikoMyk7XG4gICAgICogLy8gPT4gNlxuICAgICAqXG4gICAgICogY3VycmllZCgxLCAyKSgzKTtcbiAgICAgKiAvLyA9PiA2XG4gICAgICpcbiAgICAgKiBjdXJyaWVkKDEsIDIsIDMpO1xuICAgICAqIC8vID0+IDZcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjdXJyeShmdW5jLCBhcml0eSkge1xuICAgICAgYXJpdHkgPSB0eXBlb2YgYXJpdHkgPT0gJ251bWJlcicgPyBhcml0eSA6ICgrYXJpdHkgfHwgZnVuYy5sZW5ndGgpO1xuICAgICAgcmV0dXJuIGNyZWF0ZVdyYXBwZXIoZnVuYywgNCwgbnVsbCwgbnVsbCwgbnVsbCwgYXJpdHkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgZGVsYXkgdGhlIGV4ZWN1dGlvbiBvZiBgZnVuY2AgdW50aWwgYWZ0ZXJcbiAgICAgKiBgd2FpdGAgbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIGl0IHdhcyBpbnZva2VkLlxuICAgICAqIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2Agc2hvdWxkIGJlIGludm9rZWQgb25cbiAgICAgKiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFN1YnNlcXVlbnQgY2FsbHNcbiAgICAgKiB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gICAgICpcbiAgICAgKiBOb3RlOiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgIGBmdW5jYCB3aWxsIGJlIGNhbGxlZFxuICAgICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcbiAgICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHdhaXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgY2FsbGVkLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XG4gICAgICogdmFyIGxhenlMYXlvdXQgPSBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKTtcbiAgICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgbGF6eUxheW91dCk7XG4gICAgICpcbiAgICAgKiAvLyBleGVjdXRlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xuICAgICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAgICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBleGVjdXRlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xuICAgICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICAgKiBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xuICAgICAqICAgJ21heFdhaXQnOiAxMDAwXG4gICAgICogfSwgZmFsc2UpO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICAgIHZhciBhcmdzLFxuICAgICAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgICAgICByZXN1bHQsXG4gICAgICAgICAgc3RhbXAsXG4gICAgICAgICAgdGhpc0FyZyxcbiAgICAgICAgICB0aW1lb3V0SWQsXG4gICAgICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgICAgIG1heFdhaXQgPSBmYWxzZSxcbiAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgICAgIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgfVxuICAgICAgd2FpdCA9IG5hdGl2ZU1heCgwLCB3YWl0KSB8fCAwO1xuICAgICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgICB0cmFpbGluZyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgICAgICBsZWFkaW5nID0gb3B0aW9ucy5sZWFkaW5nO1xuICAgICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgKG5hdGl2ZU1heCh3YWl0LCBvcHRpb25zLm1heFdhaXQpIHx8IDApO1xuICAgICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgICAgIH1cbiAgICAgIHZhciBkZWxheWVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGlzQ2FsbGVkID0gdHJhaWxpbmdDYWxsO1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB2YXIgbWF4RGVsYXllZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAodHJhaWxpbmcgfHwgKG1heFdhaXQgIT09IHdhaXQpKSB7XG4gICAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICBzdGFtcCA9IG5vdygpO1xuICAgICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XG5cbiAgICAgICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXG4gICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDA7XG5cbiAgICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVmZXJzIGV4ZWN1dGluZyB0aGUgYGZ1bmNgIGZ1bmN0aW9uIHVudGlsIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzIGNsZWFyZWQuXG4gICAgICogQWRkaXRpb25hbCBhcmd1bWVudHMgd2lsbCBiZSBwcm92aWRlZCB0byBgZnVuY2Agd2hlbiBpdCBpcyBpbnZva2VkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlZmVyLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gW2FyZ10gQXJndW1lbnRzIHRvIGludm9rZSB0aGUgZnVuY3Rpb24gd2l0aC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSB0aW1lciBpZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5kZWZlcihmdW5jdGlvbih0ZXh0KSB7IGNvbnNvbGUubG9nKHRleHQpOyB9LCAnZGVmZXJyZWQnKTtcbiAgICAgKiAvLyBsb2dzICdkZWZlcnJlZCcgYWZ0ZXIgb25lIG9yIG1vcmUgbWlsbGlzZWNvbmRzXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVmZXIoZnVuYykge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICB9XG4gICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgZnVuYy5hcHBseSh1bmRlZmluZWQsIGFyZ3MpOyB9LCAxKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyB0aGUgYGZ1bmNgIGZ1bmN0aW9uIGFmdGVyIGB3YWl0YCBtaWxsaXNlY29uZHMuIEFkZGl0aW9uYWwgYXJndW1lbnRzXG4gICAgICogd2lsbCBiZSBwcm92aWRlZCB0byBgZnVuY2Agd2hlbiBpdCBpcyBpbnZva2VkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlbGF5LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGV4ZWN1dGlvbi5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmddIEFyZ3VtZW50cyB0byBpbnZva2UgdGhlIGZ1bmN0aW9uIHdpdGguXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgdGltZXIgaWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZGVsYXkoZnVuY3Rpb24odGV4dCkgeyBjb25zb2xlLmxvZyh0ZXh0KTsgfSwgMTAwMCwgJ2xhdGVyJyk7XG4gICAgICogLy8gPT4gbG9ncyAnbGF0ZXInIGFmdGVyIG9uZSBzZWNvbmRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWxheShmdW5jLCB3YWl0KSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIH1cbiAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAyKTtcbiAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBmdW5jLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7IH0sIHdhaXQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IG1lbW9pemVzIHRoZSByZXN1bHQgb2YgYGZ1bmNgLiBJZiBgcmVzb2x2ZXJgIGlzXG4gICAgICogcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZSB0aGUgY2FjaGUga2V5IGZvciBzdG9yaW5nIHRoZSByZXN1bHRcbiAgICAgKiBiYXNlZCBvbiB0aGUgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBtZW1vaXplZCBmdW5jdGlvbi4gQnkgZGVmYXVsdCwgdGhlXG4gICAgICogZmlyc3QgYXJndW1lbnQgcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uIGlzIHVzZWQgYXMgdGhlIGNhY2hlIGtleS5cbiAgICAgKiBUaGUgYGZ1bmNgIGlzIGV4ZWN1dGVkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIHRoZSBtZW1vaXplZCBmdW5jdGlvbi5cbiAgICAgKiBUaGUgcmVzdWx0IGNhY2hlIGlzIGV4cG9zZWQgYXMgdGhlIGBjYWNoZWAgcHJvcGVydHkgb24gdGhlIG1lbW9pemVkIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGhhdmUgaXRzIG91dHB1dCBtZW1vaXplZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVzb2x2ZXJdIEEgZnVuY3Rpb24gdXNlZCB0byByZXNvbHZlIHRoZSBjYWNoZSBrZXkuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgbWVtb2l6aW5nIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgZmlib25hY2NpID0gXy5tZW1vaXplKGZ1bmN0aW9uKG4pIHtcbiAgICAgKiAgIHJldHVybiBuIDwgMiA/IG4gOiBmaWJvbmFjY2kobiAtIDEpICsgZmlib25hY2NpKG4gLSAyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIGZpYm9uYWNjaSg5KVxuICAgICAqIC8vID0+IDM0XG4gICAgICpcbiAgICAgKiB2YXIgZGF0YSA9IHtcbiAgICAgKiAgICdmcmVkJzogeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH0sXG4gICAgICogICAncGViYmxlcyc6IHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogLy8gbW9kaWZ5aW5nIHRoZSByZXN1bHQgY2FjaGVcbiAgICAgKiB2YXIgZ2V0ID0gXy5tZW1vaXplKGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIGRhdGFbbmFtZV07IH0sIF8uaWRlbnRpdHkpO1xuICAgICAqIGdldCgncGViYmxlcycpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKlxuICAgICAqIGdldC5jYWNoZS5wZWJibGVzLm5hbWUgPSAncGVuZWxvcGUnO1xuICAgICAqIGdldCgncGViYmxlcycpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAncGVuZWxvcGUnLCAnYWdlJzogMSB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVtb2l6ZShmdW5jLCByZXNvbHZlcikge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICB9XG4gICAgICB2YXIgbWVtb2l6ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNhY2hlID0gbWVtb2l6ZWQuY2FjaGUsXG4gICAgICAgICAgICBrZXkgPSByZXNvbHZlciA/IHJlc29sdmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBrZXlQcmVmaXggKyBhcmd1bWVudHNbMF07XG5cbiAgICAgICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIGtleSlcbiAgICAgICAgICA/IGNhY2hlW2tleV1cbiAgICAgICAgICA6IChjYWNoZVtrZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICAgIH1cbiAgICAgIG1lbW9pemVkLmNhY2hlID0ge307XG4gICAgICByZXR1cm4gbWVtb2l6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgaXMgcmVzdHJpY3RlZCB0byBleGVjdXRlIGBmdW5jYCBvbmNlLiBSZXBlYXQgY2FsbHMgdG9cbiAgICAgKiB0aGUgZnVuY3Rpb24gd2lsbCByZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBjYWxsLiBUaGUgYGZ1bmNgIGlzIGV4ZWN1dGVkXG4gICAgICogd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIGNyZWF0ZWQgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcmVzdHJpY3QuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgcmVzdHJpY3RlZCBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGluaXRpYWxpemUgPSBfLm9uY2UoY3JlYXRlQXBwbGljYXRpb24pO1xuICAgICAqIGluaXRpYWxpemUoKTtcbiAgICAgKiBpbml0aWFsaXplKCk7XG4gICAgICogLy8gYGluaXRpYWxpemVgIGV4ZWN1dGVzIGBjcmVhdGVBcHBsaWNhdGlvbmAgb25jZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uY2UoZnVuYykge1xuICAgICAgdmFyIHJhbixcbiAgICAgICAgICByZXN1bHQ7XG5cbiAgICAgIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocmFuKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICByYW4gPSB0cnVlO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgLy8gY2xlYXIgdGhlIGBmdW5jYCB2YXJpYWJsZSBzbyB0aGUgZnVuY3Rpb24gbWF5IGJlIGdhcmJhZ2UgY29sbGVjdGVkXG4gICAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIGludm9rZXMgYGZ1bmNgIHdpdGggYW55IGFkZGl0aW9uYWxcbiAgICAgKiBgcGFydGlhbGAgYXJndW1lbnRzIHByZXBlbmRlZCB0byB0aG9zZSBwcm92aWRlZCB0byB0aGUgbmV3IGZ1bmN0aW9uLiBUaGlzXG4gICAgICogbWV0aG9kIGlzIHNpbWlsYXIgdG8gYF8uYmluZGAgZXhjZXB0IGl0IGRvZXMgKipub3QqKiBhbHRlciB0aGUgYHRoaXNgIGJpbmRpbmcuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcGFydGlhbGx5IGFwcGx5IGFyZ3VtZW50cyB0by5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmddIEFyZ3VtZW50cyB0byBiZSBwYXJ0aWFsbHkgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBwYXJ0aWFsbHkgYXBwbGllZCBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGdyZWV0ID0gZnVuY3Rpb24oZ3JlZXRpbmcsIG5hbWUpIHsgcmV0dXJuIGdyZWV0aW5nICsgJyAnICsgbmFtZTsgfTtcbiAgICAgKiB2YXIgaGkgPSBfLnBhcnRpYWwoZ3JlZXQsICdoaScpO1xuICAgICAqIGhpKCdmcmVkJyk7XG4gICAgICogLy8gPT4gJ2hpIGZyZWQnXG4gICAgICovXG4gICAgZnVuY3Rpb24gcGFydGlhbChmdW5jKSB7XG4gICAgICByZXR1cm4gY3JlYXRlV3JhcHBlcihmdW5jLCAxNiwgc2xpY2UoYXJndW1lbnRzLCAxKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhpcyBtZXRob2QgaXMgbGlrZSBgXy5wYXJ0aWFsYCBleGNlcHQgdGhhdCBgcGFydGlhbGAgYXJndW1lbnRzIGFyZVxuICAgICAqIGFwcGVuZGVkIHRvIHRob3NlIHByb3ZpZGVkIHRvIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcGFydGlhbGx5IGFwcGx5IGFyZ3VtZW50cyB0by5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmddIEFyZ3VtZW50cyB0byBiZSBwYXJ0aWFsbHkgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBwYXJ0aWFsbHkgYXBwbGllZCBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGRlZmF1bHRzRGVlcCA9IF8ucGFydGlhbFJpZ2h0KF8ubWVyZ2UsIF8uZGVmYXVsdHMpO1xuICAgICAqXG4gICAgICogdmFyIG9wdGlvbnMgPSB7XG4gICAgICogICAndmFyaWFibGUnOiAnZGF0YScsXG4gICAgICogICAnaW1wb3J0cyc6IHsgJ2pxJzogJCB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGRlZmF1bHRzRGVlcChvcHRpb25zLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuICAgICAqXG4gICAgICogb3B0aW9ucy52YXJpYWJsZVxuICAgICAqIC8vID0+ICdkYXRhJ1xuICAgICAqXG4gICAgICogb3B0aW9ucy5pbXBvcnRzXG4gICAgICogLy8gPT4geyAnXyc6IF8sICdqcSc6ICQgfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHBhcnRpYWxSaWdodChmdW5jKSB7XG4gICAgICByZXR1cm4gY3JlYXRlV3JhcHBlcihmdW5jLCAzMiwgbnVsbCwgc2xpY2UoYXJndW1lbnRzLCAxKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gZXhlY3V0ZWQsIHdpbGwgb25seSBjYWxsIHRoZSBgZnVuY2AgZnVuY3Rpb25cbiAgICAgKiBhdCBtb3N0IG9uY2UgcGVyIGV2ZXJ5IGB3YWl0YCBtaWxsaXNlY29uZHMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG9cbiAgICAgKiBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZVxuICAgICAqIG9mIHRoZSBgd2FpdGAgdGltZW91dC4gU3Vic2VxdWVudCBjYWxscyB0byB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGxcbiAgICAgKiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgY2FsbC5cbiAgICAgKlxuICAgICAqIE5vdGU6IElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAgYGZ1bmNgIHdpbGwgYmUgY2FsbGVkXG4gICAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIHRocm90dGxlZCBmdW5jdGlvbiBpc1xuICAgICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byB0aHJvdHRsZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB0aHJvdHRsZSBleGVjdXRpb25zIHRvLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz10cnVlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBhdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nXG4gICAgICogdmFyIHRocm90dGxlZCA9IF8udGhyb3R0bGUodXBkYXRlUG9zaXRpb24sIDEwMCk7XG4gICAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIHRocm90dGxlZCk7XG4gICAgICpcbiAgICAgKiAvLyBleGVjdXRlIGByZW5ld1Rva2VuYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgYnV0IG5vdCBtb3JlIHRoYW4gb25jZSBldmVyeSA1IG1pbnV0ZXNcbiAgICAgKiBqUXVlcnkoJy5pbnRlcmFjdGl2ZScpLm9uKCdjbGljaycsIF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7XG4gICAgICogICAndHJhaWxpbmcnOiBmYWxzZVxuICAgICAqIH0pKTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgICB2YXIgbGVhZGluZyA9IHRydWUsXG4gICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zID09PSBmYWxzZSkge1xuICAgICAgICBsZWFkaW5nID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICAgIGxlYWRpbmcgPSAnbGVhZGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgICAgfVxuICAgICAgZGVib3VuY2VPcHRpb25zLmxlYWRpbmcgPSBsZWFkaW5nO1xuICAgICAgZGVib3VuY2VPcHRpb25zLm1heFdhaXQgPSB3YWl0O1xuICAgICAgZGVib3VuY2VPcHRpb25zLnRyYWlsaW5nID0gdHJhaWxpbmc7XG5cbiAgICAgIHJldHVybiBkZWJvdW5jZShmdW5jLCB3YWl0LCBkZWJvdW5jZU9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHByb3ZpZGVzIGB2YWx1ZWAgdG8gdGhlIHdyYXBwZXIgZnVuY3Rpb24gYXMgaXRzXG4gICAgICogZmlyc3QgYXJndW1lbnQuIEFkZGl0aW9uYWwgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBmdW5jdGlvbiBhcmUgYXBwZW5kZWRcbiAgICAgKiB0byB0aG9zZSBwcm92aWRlZCB0byB0aGUgd3JhcHBlciBmdW5jdGlvbi4gVGhlIHdyYXBwZXIgaXMgZXhlY3V0ZWQgd2l0aFxuICAgICAqIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY3JlYXRlZCBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byB3cmFwLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHdyYXBwZXIgVGhlIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBwID0gXy53cmFwKF8uZXNjYXBlLCBmdW5jdGlvbihmdW5jLCB0ZXh0KSB7XG4gICAgICogICByZXR1cm4gJzxwPicgKyBmdW5jKHRleHQpICsgJzwvcD4nO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogcCgnRnJlZCwgV2lsbWEsICYgUGViYmxlcycpO1xuICAgICAqIC8vID0+ICc8cD5GcmVkLCBXaWxtYSwgJmFtcDsgUGViYmxlczwvcD4nXG4gICAgICovXG4gICAgZnVuY3Rpb24gd3JhcCh2YWx1ZSwgd3JhcHBlcikge1xuICAgICAgcmV0dXJuIGNyZWF0ZVdyYXBwZXIod3JhcHBlciwgMTYsIFt2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBgdmFsdWVgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHJldHVybiBmcm9tIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBvYmplY3QgPSB7ICduYW1lJzogJ2ZyZWQnIH07XG4gICAgICogdmFyIGdldHRlciA9IF8uY29uc3RhbnQob2JqZWN0KTtcbiAgICAgKiBnZXR0ZXIoKSA9PT0gb2JqZWN0O1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjb25zdGFudCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2R1Y2VzIGEgY2FsbGJhY2sgYm91bmQgdG8gYW4gb3B0aW9uYWwgYHRoaXNBcmdgLiBJZiBgZnVuY2AgaXMgYSBwcm9wZXJ0eVxuICAgICAqIG5hbWUgdGhlIGNyZWF0ZWQgY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIGZvciBhIGdpdmVuIGVsZW1lbnQuXG4gICAgICogSWYgYGZ1bmNgIGlzIGFuIG9iamVjdCB0aGUgY3JlYXRlZCBjYWxsYmFjayB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzXG4gICAgICogdGhhdCBjb250YWluIHRoZSBlcXVpdmFsZW50IG9iamVjdCBwcm9wZXJ0aWVzLCBvdGhlcndpc2UgaXQgd2lsbCByZXR1cm4gYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0geyp9IFtmdW5jPWlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY3JlYXRlZCBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0aGUgY2FsbGJhY2sgYWNjZXB0cy5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB3cmFwIHRvIGNyZWF0ZSBjdXN0b20gY2FsbGJhY2sgc2hvcnRoYW5kc1xuICAgICAqIF8uY3JlYXRlQ2FsbGJhY2sgPSBfLndyYXAoXy5jcmVhdGVDYWxsYmFjaywgZnVuY3Rpb24oZnVuYywgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgKiAgIHZhciBtYXRjaCA9IC9eKC4rPylfXyhbZ2xddCkoLispJC8uZXhlYyhjYWxsYmFjayk7XG4gICAgICogICByZXR1cm4gIW1hdGNoID8gZnVuYyhjYWxsYmFjaywgdGhpc0FyZykgOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgKiAgICAgcmV0dXJuIG1hdGNoWzJdID09ICdndCcgPyBvYmplY3RbbWF0Y2hbMV1dID4gbWF0Y2hbM10gOiBvYmplY3RbbWF0Y2hbMV1dIDwgbWF0Y2hbM107XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogXy5maWx0ZXIoY2hhcmFjdGVycywgJ2FnZV9fZ3QzOCcpO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVDYWxsYmFjayhmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgZnVuYztcbiAgICAgIGlmIChmdW5jID09IG51bGwgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBiYXNlQ3JlYXRlQ2FsbGJhY2soZnVuYywgdGhpc0FyZywgYXJnQ291bnQpO1xuICAgICAgfVxuICAgICAgLy8gaGFuZGxlIFwiXy5wbHVja1wiIHN0eWxlIGNhbGxiYWNrIHNob3J0aGFuZHNcbiAgICAgIGlmICh0eXBlICE9ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBwcm9wZXJ0eShmdW5jKTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wcyA9IGtleXMoZnVuYyksXG4gICAgICAgICAga2V5ID0gcHJvcHNbMF0sXG4gICAgICAgICAgYSA9IGZ1bmNba2V5XTtcblxuICAgICAgLy8gaGFuZGxlIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrIHNob3J0aGFuZHNcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPT0gMSAmJiBhID09PSBhICYmICFpc09iamVjdChhKSkge1xuICAgICAgICAvLyBmYXN0IHBhdGggdGhlIGNvbW1vbiBjYXNlIG9mIHByb3ZpZGluZyBhbiBvYmplY3Qgd2l0aCBhIHNpbmdsZVxuICAgICAgICAvLyBwcm9wZXJ0eSBjb250YWluaW5nIGEgcHJpbWl0aXZlIHZhbHVlXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICB2YXIgYiA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIHJldHVybiBhID09PSBiICYmIChhICE9PSAwIHx8ICgxIC8gYSA9PSAxIC8gYikpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gcHJvcHMubGVuZ3RoLFxuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gYmFzZUlzRXF1YWwob2JqZWN0W3Byb3BzW2xlbmd0aF1dLCBmdW5jW3Byb3BzW2xlbmd0aF1dLCBudWxsLCB0cnVlKSkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgY2hhcmFjdGVycyBgJmAsIGA8YCwgYD5gLCBgXCJgLCBhbmQgYCdgIGluIGBzdHJpbmdgIHRvIHRoZWlyXG4gICAgICogY29ycmVzcG9uZGluZyBIVE1MIGVudGl0aWVzLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBlc2NhcGUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZXNjYXBlZCBzdHJpbmcuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZXNjYXBlKCdGcmVkLCBXaWxtYSwgJiBQZWJibGVzJyk7XG4gICAgICogLy8gPT4gJ0ZyZWQsIFdpbG1hLCAmYW1wOyBQZWJibGVzJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVzY2FwZShzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcgPT0gbnVsbCA/ICcnIDogU3RyaW5nKHN0cmluZykucmVwbGFjZShyZVVuZXNjYXBlZEh0bWwsIGVzY2FwZUh0bWxDaGFyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBwcm92aWRlZCB0byBpdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgb2JqZWN0ID0geyAnbmFtZSc6ICdmcmVkJyB9O1xuICAgICAqIF8uaWRlbnRpdHkob2JqZWN0KSA9PT0gb2JqZWN0O1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpZGVudGl0eSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgZnVuY3Rpb24gcHJvcGVydGllcyBvZiBhIHNvdXJjZSBvYmplY3QgdG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBJZiBgb2JqZWN0YCBpcyBhIGZ1bmN0aW9uIG1ldGhvZHMgd2lsbCBiZSBhZGRlZCB0byBpdHMgcHJvdG90eXBlIGFzIHdlbGwuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R9IFtvYmplY3Q9bG9kYXNoXSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBvYmplY3Qgb2YgZnVuY3Rpb25zIHRvIGFkZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmNoYWluPXRydWVdIFNwZWNpZnkgd2hldGhlciB0aGUgZnVuY3Rpb25zIGFkZGVkIGFyZSBjaGFpbmFibGUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gICAgICogICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogXy5taXhpbih7ICdjYXBpdGFsaXplJzogY2FwaXRhbGl6ZSB9KTtcbiAgICAgKiBfLmNhcGl0YWxpemUoJ2ZyZWQnKTtcbiAgICAgKiAvLyA9PiAnRnJlZCdcbiAgICAgKlxuICAgICAqIF8oJ2ZyZWQnKS5jYXBpdGFsaXplKCkudmFsdWUoKTtcbiAgICAgKiAvLyA9PiAnRnJlZCdcbiAgICAgKlxuICAgICAqIF8ubWl4aW4oeyAnY2FwaXRhbGl6ZSc6IGNhcGl0YWxpemUgfSwgeyAnY2hhaW4nOiBmYWxzZSB9KTtcbiAgICAgKiBfKCdmcmVkJykuY2FwaXRhbGl6ZSgpO1xuICAgICAqIC8vID0+ICdGcmVkJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1peGluKG9iamVjdCwgc291cmNlLCBvcHRpb25zKSB7XG4gICAgICB2YXIgY2hhaW4gPSB0cnVlLFxuICAgICAgICAgIG1ldGhvZE5hbWVzID0gc291cmNlICYmIGZ1bmN0aW9ucyhzb3VyY2UpO1xuXG4gICAgICBpZiAoIXNvdXJjZSB8fCAoIW9wdGlvbnMgJiYgIW1ldGhvZE5hbWVzLmxlbmd0aCkpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgICAgIG9wdGlvbnMgPSBzb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgY3RvciA9IGxvZGFzaFdyYXBwZXI7XG4gICAgICAgIHNvdXJjZSA9IG9iamVjdDtcbiAgICAgICAgb2JqZWN0ID0gbG9kYXNoO1xuICAgICAgICBtZXRob2ROYW1lcyA9IGZ1bmN0aW9ucyhzb3VyY2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYWluID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpICYmICdjaGFpbicgaW4gb3B0aW9ucykge1xuICAgICAgICBjaGFpbiA9IG9wdGlvbnMuY2hhaW47XG4gICAgICB9XG4gICAgICB2YXIgY3RvciA9IG9iamVjdCxcbiAgICAgICAgICBpc0Z1bmMgPSBpc0Z1bmN0aW9uKGN0b3IpO1xuXG4gICAgICBmb3JFYWNoKG1ldGhvZE5hbWVzLCBmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgICAgIHZhciBmdW5jID0gb2JqZWN0W21ldGhvZE5hbWVdID0gc291cmNlW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAoaXNGdW5jKSB7XG4gICAgICAgICAgY3Rvci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjaGFpbkFsbCA9IHRoaXMuX19jaGFpbl9fLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5fX3dyYXBwZWRfXyxcbiAgICAgICAgICAgICAgICBhcmdzID0gW3ZhbHVlXTtcblxuICAgICAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkob2JqZWN0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChjaGFpbiB8fCBjaGFpbkFsbCkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHJlc3VsdCAmJiBpc09iamVjdChyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IGN0b3IocmVzdWx0KTtcbiAgICAgICAgICAgICAgcmVzdWx0Ll9fY2hhaW5fXyA9IGNoYWluQWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXZlcnRzIHRoZSAnXycgdmFyaWFibGUgdG8gaXRzIHByZXZpb3VzIHZhbHVlIGFuZCByZXR1cm5zIGEgcmVmZXJlbmNlIHRvXG4gICAgICogdGhlIGBsb2Rhc2hgIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgYGxvZGFzaGAgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBsb2Rhc2ggPSBfLm5vQ29uZmxpY3QoKTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBub0NvbmZsaWN0KCkge1xuICAgICAgY29udGV4dC5fID0gb2xkRGFzaDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEEgbm8tb3BlcmF0aW9uIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgb2JqZWN0ID0geyAnbmFtZSc6ICdmcmVkJyB9O1xuICAgICAqIF8ubm9vcChvYmplY3QpID09PSB1bmRlZmluZWQ7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG5vb3AoKSB7XG4gICAgICAvLyBubyBvcGVyYXRpb24gcGVyZm9ybWVkXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICAgICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgc3RhbXAgPSBfLm5vdygpO1xuICAgICAqIF8uZGVmZXIoZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7IH0pO1xuICAgICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZFxuICAgICAqL1xuICAgIHZhciBub3cgPSBpc05hdGl2ZShub3cgPSBEYXRlLm5vdykgJiYgbm93IHx8IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgZ2l2ZW4gdmFsdWUgaW50byBhbiBpbnRlZ2VyIG9mIHRoZSBzcGVjaWZpZWQgcmFkaXguXG4gICAgICogSWYgYHJhZGl4YCBpcyBgdW5kZWZpbmVkYCBvciBgMGAgYSBgcmFkaXhgIG9mIGAxMGAgaXMgdXNlZCB1bmxlc3MgdGhlXG4gICAgICogYHZhbHVlYCBpcyBhIGhleGFkZWNpbWFsLCBpbiB3aGljaCBjYXNlIGEgYHJhZGl4YCBvZiBgMTZgIGlzIHVzZWQuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBhdm9pZHMgZGlmZmVyZW5jZXMgaW4gbmF0aXZlIEVTMyBhbmQgRVM1IGBwYXJzZUludGBcbiAgICAgKiBpbXBsZW1lbnRhdGlvbnMuIFNlZSBodHRwOi8vZXM1LmdpdGh1Yi5pby8jRS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVGhlIHZhbHVlIHRvIHBhcnNlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcmFkaXhdIFRoZSByYWRpeCB1c2VkIHRvIGludGVycHJldCB0aGUgdmFsdWUgdG8gcGFyc2UuXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgbmV3IGludGVnZXIgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ucGFyc2VJbnQoJzA4Jyk7XG4gICAgICogLy8gPT4gOFxuICAgICAqL1xuICAgIHZhciBwYXJzZUludCA9IG5hdGl2ZVBhcnNlSW50KHdoaXRlc3BhY2UgKyAnMDgnKSA9PSA4ID8gbmF0aXZlUGFyc2VJbnQgOiBmdW5jdGlvbih2YWx1ZSwgcmFkaXgpIHtcbiAgICAgIC8vIEZpcmVmb3ggPCAyMSBhbmQgT3BlcmEgPCAxNSBmb2xsb3cgdGhlIEVTMyBzcGVjaWZpZWQgaW1wbGVtZW50YXRpb24gb2YgYHBhcnNlSW50YFxuICAgICAgcmV0dXJuIG5hdGl2ZVBhcnNlSW50KGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UocmVMZWFkaW5nU3BhY2VzQW5kWmVyb3MsICcnKSA6IHZhbHVlLCByYWRpeCB8fCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIFwiXy5wbHVja1wiIHN0eWxlIGZ1bmN0aW9uLCB3aGljaCByZXR1cm5zIHRoZSBga2V5YCB2YWx1ZSBvZiBhXG4gICAgICogZ2l2ZW4gb2JqZWN0LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5IHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH0sXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIHZhciBnZXROYW1lID0gXy5wcm9wZXJ0eSgnbmFtZScpO1xuICAgICAqXG4gICAgICogXy5tYXAoY2hhcmFjdGVycywgZ2V0TmFtZSk7XG4gICAgICogLy8gPT4gWydiYXJuZXknLCAnZnJlZCddXG4gICAgICpcbiAgICAgKiBfLnNvcnRCeShjaGFyYWN0ZXJzLCBnZXROYW1lKTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSwgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwcm9wZXJ0eShrZXkpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9kdWNlcyBhIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBgbWluYCBhbmQgYG1heGAgKGluY2x1c2l2ZSkuIElmIG9ubHkgb25lXG4gICAgICogYXJndW1lbnQgaXMgcHJvdmlkZWQgYSBudW1iZXIgYmV0d2VlbiBgMGAgYW5kIHRoZSBnaXZlbiBudW1iZXIgd2lsbCBiZVxuICAgICAqIHJldHVybmVkLiBJZiBgZmxvYXRpbmdgIGlzIHRydWV5IG9yIGVpdGhlciBgbWluYCBvciBgbWF4YCBhcmUgZmxvYXRzIGFcbiAgICAgKiBmbG9hdGluZy1wb2ludCBudW1iZXIgd2lsbCBiZSByZXR1cm5lZCBpbnN0ZWFkIG9mIGFuIGludGVnZXIuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFttaW49MF0gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFttYXg9MV0gVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZmxvYXRpbmc9ZmFsc2VdIFNwZWNpZnkgcmV0dXJuaW5nIGEgZmxvYXRpbmctcG9pbnQgbnVtYmVyLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgYSByYW5kb20gbnVtYmVyLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnJhbmRvbSgwLCA1KTtcbiAgICAgKiAvLyA9PiBhbiBpbnRlZ2VyIGJldHdlZW4gMCBhbmQgNVxuICAgICAqXG4gICAgICogXy5yYW5kb20oNSk7XG4gICAgICogLy8gPT4gYWxzbyBhbiBpbnRlZ2VyIGJldHdlZW4gMCBhbmQgNVxuICAgICAqXG4gICAgICogXy5yYW5kb20oNSwgdHJ1ZSk7XG4gICAgICogLy8gPT4gYSBmbG9hdGluZy1wb2ludCBudW1iZXIgYmV0d2VlbiAwIGFuZCA1XG4gICAgICpcbiAgICAgKiBfLnJhbmRvbSgxLjIsIDUuMik7XG4gICAgICogLy8gPT4gYSBmbG9hdGluZy1wb2ludCBudW1iZXIgYmV0d2VlbiAxLjIgYW5kIDUuMlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJhbmRvbShtaW4sIG1heCwgZmxvYXRpbmcpIHtcbiAgICAgIHZhciBub01pbiA9IG1pbiA9PSBudWxsLFxuICAgICAgICAgIG5vTWF4ID0gbWF4ID09IG51bGw7XG5cbiAgICAgIGlmIChmbG9hdGluZyA9PSBudWxsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbWluID09ICdib29sZWFuJyAmJiBub01heCkge1xuICAgICAgICAgIGZsb2F0aW5nID0gbWluO1xuICAgICAgICAgIG1pbiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW5vTWF4ICYmIHR5cGVvZiBtYXggPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgZmxvYXRpbmcgPSBtYXg7XG4gICAgICAgICAgbm9NYXggPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobm9NaW4gJiYgbm9NYXgpIHtcbiAgICAgICAgbWF4ID0gMTtcbiAgICAgIH1cbiAgICAgIG1pbiA9ICttaW4gfHwgMDtcbiAgICAgIGlmIChub01heCkge1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXggPSArbWF4IHx8IDA7XG4gICAgICB9XG4gICAgICBpZiAoZmxvYXRpbmcgfHwgbWluICUgMSB8fCBtYXggJSAxKSB7XG4gICAgICAgIHZhciByYW5kID0gbmF0aXZlUmFuZG9tKCk7XG4gICAgICAgIHJldHVybiBuYXRpdmVNaW4obWluICsgKHJhbmQgKiAobWF4IC0gbWluICsgcGFyc2VGbG9hdCgnMWUtJyArICgocmFuZCArJycpLmxlbmd0aCAtIDEpKSkpLCBtYXgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2VSYW5kb20obWluLCBtYXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc29sdmVzIHRoZSB2YWx1ZSBvZiBwcm9wZXJ0eSBga2V5YCBvbiBgb2JqZWN0YC4gSWYgYGtleWAgaXMgYSBmdW5jdGlvblxuICAgICAqIGl0IHdpbGwgYmUgaW52b2tlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiBgb2JqZWN0YCBhbmQgaXRzIHJlc3VsdCByZXR1cm5lZCxcbiAgICAgKiBlbHNlIHRoZSBwcm9wZXJ0eSB2YWx1ZSBpcyByZXR1cm5lZC4gSWYgYG9iamVjdGAgaXMgZmFsc2V5IHRoZW4gYHVuZGVmaW5lZGBcbiAgICAgKiBpcyByZXR1cm5lZC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byByZXNvbHZlLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSByZXNvbHZlZCB2YWx1ZS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHtcbiAgICAgKiAgICdjaGVlc2UnOiAnY3J1bXBldHMnLFxuICAgICAqICAgJ3N0dWZmJzogZnVuY3Rpb24oKSB7XG4gICAgICogICAgIHJldHVybiAnbm9uc2Vuc2UnO1xuICAgICAqICAgfVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLnJlc3VsdChvYmplY3QsICdjaGVlc2UnKTtcbiAgICAgKiAvLyA9PiAnY3J1bXBldHMnXG4gICAgICpcbiAgICAgKiBfLnJlc3VsdChvYmplY3QsICdzdHVmZicpO1xuICAgICAqIC8vID0+ICdub25zZW5zZSdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXN1bHQob2JqZWN0LCBrZXkpIHtcbiAgICAgIGlmIChvYmplY3QpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHZhbHVlKSA/IG9iamVjdFtrZXldKCkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIG1pY3JvLXRlbXBsYXRpbmcgbWV0aG9kIHRoYXQgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzXG4gICAgICogd2hpdGVzcGFjZSwgYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gICAgICpcbiAgICAgKiBOb3RlOiBJbiB0aGUgZGV2ZWxvcG1lbnQgYnVpbGQsIGBfLnRlbXBsYXRlYCB1dGlsaXplcyBzb3VyY2VVUkxzIGZvciBlYXNpZXJcbiAgICAgKiBkZWJ1Z2dpbmcuIFNlZSBodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy9kZXZlbG9wZXJ0b29scy9zb3VyY2VtYXBzLyN0b2Mtc291cmNldXJsXG4gICAgICpcbiAgICAgKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBwcmVjb21waWxpbmcgdGVtcGxhdGVzIHNlZTpcbiAgICAgKiBodHRwczovL2xvZGFzaC5jb20vY3VzdG9tLWJ1aWxkc1xuICAgICAqXG4gICAgICogRm9yIG1vcmUgaW5mb3JtYXRpb24gb24gQ2hyb21lIGV4dGVuc2lvbiBzYW5kYm94ZXMgc2VlOlxuICAgICAqIGh0dHA6Ly9kZXZlbG9wZXIuY2hyb21lLmNvbS9zdGFibGUvZXh0ZW5zaW9ucy9zYW5kYm94aW5nRXZhbC5odG1sXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGhlIHRlbXBsYXRlIHRleHQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIGRhdGEgb2JqZWN0IHVzZWQgdG8gcG9wdWxhdGUgdGhlIHRleHQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IFtvcHRpb25zLmVzY2FwZV0gVGhlIFwiZXNjYXBlXCIgZGVsaW1pdGVyLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSBbb3B0aW9ucy5ldmFsdWF0ZV0gVGhlIFwiZXZhbHVhdGVcIiBkZWxpbWl0ZXIuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLmltcG9ydHNdIEFuIG9iamVjdCB0byBpbXBvcnQgaW50byB0aGUgdGVtcGxhdGUgYXMgbG9jYWwgdmFyaWFibGVzLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSBbb3B0aW9ucy5pbnRlcnBvbGF0ZV0gVGhlIFwiaW50ZXJwb2xhdGVcIiBkZWxpbWl0ZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzb3VyY2VVUkxdIFRoZSBzb3VyY2VVUkwgb2YgdGhlIHRlbXBsYXRlJ3MgY29tcGlsZWQgc291cmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbdmFyaWFibGVdIFRoZSBkYXRhIG9iamVjdCB2YXJpYWJsZSBuYW1lLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbnxzdHJpbmd9IFJldHVybnMgYSBjb21waWxlZCBmdW5jdGlvbiB3aGVuIG5vIGBkYXRhYCBvYmplY3RcbiAgICAgKiAgaXMgZ2l2ZW4sIGVsc2UgaXQgcmV0dXJucyB0aGUgaW50ZXJwb2xhdGVkIHRleHQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBcImludGVycG9sYXRlXCIgZGVsaW1pdGVyIHRvIGNyZWF0ZSBhIGNvbXBpbGVkIHRlbXBsYXRlXG4gICAgICogdmFyIGNvbXBpbGVkID0gXy50ZW1wbGF0ZSgnaGVsbG8gPCU9IG5hbWUgJT4nKTtcbiAgICAgKiBjb21waWxlZCh7ICduYW1lJzogJ2ZyZWQnIH0pO1xuICAgICAqIC8vID0+ICdoZWxsbyBmcmVkJ1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgdGhlIFwiZXNjYXBlXCIgZGVsaW1pdGVyIHRvIGVzY2FwZSBIVE1MIGluIGRhdGEgcHJvcGVydHkgdmFsdWVzXG4gICAgICogXy50ZW1wbGF0ZSgnPGI+PCUtIHZhbHVlICU+PC9iPicsIHsgJ3ZhbHVlJzogJzxzY3JpcHQ+JyB9KTtcbiAgICAgKiAvLyA9PiAnPGI+Jmx0O3NjcmlwdCZndDs8L2I+J1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgdGhlIFwiZXZhbHVhdGVcIiBkZWxpbWl0ZXIgdG8gZ2VuZXJhdGUgSFRNTFxuICAgICAqIHZhciBsaXN0ID0gJzwlIF8uZm9yRWFjaChwZW9wbGUsIGZ1bmN0aW9uKG5hbWUpIHsgJT48bGk+PCUtIG5hbWUgJT48L2xpPjwlIH0pOyAlPic7XG4gICAgICogXy50ZW1wbGF0ZShsaXN0LCB7ICdwZW9wbGUnOiBbJ2ZyZWQnLCAnYmFybmV5J10gfSk7XG4gICAgICogLy8gPT4gJzxsaT5mcmVkPC9saT48bGk+YmFybmV5PC9saT4nXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyB0aGUgRVM2IGRlbGltaXRlciBhcyBhbiBhbHRlcm5hdGl2ZSB0byB0aGUgZGVmYXVsdCBcImludGVycG9sYXRlXCIgZGVsaW1pdGVyXG4gICAgICogXy50ZW1wbGF0ZSgnaGVsbG8gJHsgbmFtZSB9JywgeyAnbmFtZSc6ICdwZWJibGVzJyB9KTtcbiAgICAgKiAvLyA9PiAnaGVsbG8gcGViYmxlcydcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBpbnRlcm5hbCBgcHJpbnRgIGZ1bmN0aW9uIGluIFwiZXZhbHVhdGVcIiBkZWxpbWl0ZXJzXG4gICAgICogXy50ZW1wbGF0ZSgnPCUgcHJpbnQoXCJoZWxsbyBcIiArIG5hbWUpOyAlPiEnLCB7ICduYW1lJzogJ2Jhcm5leScgfSk7XG4gICAgICogLy8gPT4gJ2hlbGxvIGJhcm5leSEnXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBhIGN1c3RvbSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzXG4gICAgICogXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgICAqICAgJ2ludGVycG9sYXRlJzogL3t7KFtcXHNcXFNdKz8pfX0vZ1xuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLnRlbXBsYXRlKCdoZWxsbyB7eyBuYW1lIH19IScsIHsgJ25hbWUnOiAnbXVzdGFjaGUnIH0pO1xuICAgICAqIC8vID0+ICdoZWxsbyBtdXN0YWNoZSEnXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyB0aGUgYGltcG9ydHNgIG9wdGlvbiB0byBpbXBvcnQgalF1ZXJ5XG4gICAgICogdmFyIGxpc3QgPSAnPCUganEuZWFjaChwZW9wbGUsIGZ1bmN0aW9uKG5hbWUpIHsgJT48bGk+PCUtIG5hbWUgJT48L2xpPjwlIH0pOyAlPic7XG4gICAgICogXy50ZW1wbGF0ZShsaXN0LCB7ICdwZW9wbGUnOiBbJ2ZyZWQnLCAnYmFybmV5J10gfSwgeyAnaW1wb3J0cyc6IHsgJ2pxJzogalF1ZXJ5IH0gfSk7XG4gICAgICogLy8gPT4gJzxsaT5mcmVkPC9saT48bGk+YmFybmV5PC9saT4nXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyB0aGUgYHNvdXJjZVVSTGAgb3B0aW9uIHRvIHNwZWNpZnkgYSBjdXN0b20gc291cmNlVVJMIGZvciB0aGUgdGVtcGxhdGVcbiAgICAgKiB2YXIgY29tcGlsZWQgPSBfLnRlbXBsYXRlKCdoZWxsbyA8JT0gbmFtZSAlPicsIG51bGwsIHsgJ3NvdXJjZVVSTCc6ICcvYmFzaWMvZ3JlZXRpbmcuanN0JyB9KTtcbiAgICAgKiBjb21waWxlZChkYXRhKTtcbiAgICAgKiAvLyA9PiBmaW5kIHRoZSBzb3VyY2Ugb2YgXCJncmVldGluZy5qc3RcIiB1bmRlciB0aGUgU291cmNlcyB0YWIgb3IgUmVzb3VyY2VzIHBhbmVsIG9mIHRoZSB3ZWIgaW5zcGVjdG9yXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyB0aGUgYHZhcmlhYmxlYCBvcHRpb24gdG8gZW5zdXJlIGEgd2l0aC1zdGF0ZW1lbnQgaXNuJ3QgdXNlZCBpbiB0aGUgY29tcGlsZWQgdGVtcGxhdGVcbiAgICAgKiB2YXIgY29tcGlsZWQgPSBfLnRlbXBsYXRlKCdoaSA8JT0gZGF0YS5uYW1lICU+IScsIG51bGwsIHsgJ3ZhcmlhYmxlJzogJ2RhdGEnIH0pO1xuICAgICAqIGNvbXBpbGVkLnNvdXJjZTtcbiAgICAgKiAvLyA9PiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICogICB2YXIgX190LCBfX3AgPSAnJywgX19lID0gXy5lc2NhcGU7XG4gICAgICogICBfX3AgKz0gJ2hpICcgKyAoKF9fdCA9ICggZGF0YS5uYW1lICkpID09IG51bGwgPyAnJyA6IF9fdCkgKyAnISc7XG4gICAgICogICByZXR1cm4gX19wO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBgc291cmNlYCBwcm9wZXJ0eSB0byBpbmxpbmUgY29tcGlsZWQgdGVtcGxhdGVzIGZvciBtZWFuaW5nZnVsXG4gICAgICogLy8gbGluZSBudW1iZXJzIGluIGVycm9yIG1lc3NhZ2VzIGFuZCBhIHN0YWNrIHRyYWNlXG4gICAgICogZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4oY3dkLCAnanN0LmpzJyksICdcXFxuICAgICAqICAgdmFyIEpTVCA9IHtcXFxuICAgICAqICAgICBcIm1haW5cIjogJyArIF8udGVtcGxhdGUobWFpblRleHQpLnNvdXJjZSArICdcXFxuICAgICAqICAgfTtcXFxuICAgICAqICcpO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRlbXBsYXRlKHRleHQsIGRhdGEsIG9wdGlvbnMpIHtcbiAgICAgIC8vIGJhc2VkIG9uIEpvaG4gUmVzaWcncyBgdG1wbGAgaW1wbGVtZW50YXRpb25cbiAgICAgIC8vIGh0dHA6Ly9lam9obi5vcmcvYmxvZy9qYXZhc2NyaXB0LW1pY3JvLXRlbXBsYXRpbmcvXG4gICAgICAvLyBhbmQgTGF1cmEgRG9rdG9yb3ZhJ3MgZG9ULmpzXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vb2xhZG8vZG9UXG4gICAgICB2YXIgc2V0dGluZ3MgPSBsb2Rhc2gudGVtcGxhdGVTZXR0aW5ncztcbiAgICAgIHRleHQgPSBTdHJpbmcodGV4dCB8fCAnJyk7XG5cbiAgICAgIC8vIGF2b2lkIG1pc3NpbmcgZGVwZW5kZW5jaWVzIHdoZW4gYGl0ZXJhdG9yVGVtcGxhdGVgIGlzIG5vdCBkZWZpbmVkXG4gICAgICBvcHRpb25zID0gZGVmYXVsdHMoe30sIG9wdGlvbnMsIHNldHRpbmdzKTtcblxuICAgICAgdmFyIGltcG9ydHMgPSBkZWZhdWx0cyh7fSwgb3B0aW9ucy5pbXBvcnRzLCBzZXR0aW5ncy5pbXBvcnRzKSxcbiAgICAgICAgICBpbXBvcnRzS2V5cyA9IGtleXMoaW1wb3J0cyksXG4gICAgICAgICAgaW1wb3J0c1ZhbHVlcyA9IHZhbHVlcyhpbXBvcnRzKTtcblxuICAgICAgdmFyIGlzRXZhbHVhdGluZyxcbiAgICAgICAgICBpbmRleCA9IDAsXG4gICAgICAgICAgaW50ZXJwb2xhdGUgPSBvcHRpb25zLmludGVycG9sYXRlIHx8IHJlTm9NYXRjaCxcbiAgICAgICAgICBzb3VyY2UgPSBcIl9fcCArPSAnXCI7XG5cbiAgICAgIC8vIGNvbXBpbGUgdGhlIHJlZ2V4cCB0byBtYXRjaCBlYWNoIGRlbGltaXRlclxuICAgICAgdmFyIHJlRGVsaW1pdGVycyA9IFJlZ0V4cChcbiAgICAgICAgKG9wdGlvbnMuZXNjYXBlIHx8IHJlTm9NYXRjaCkuc291cmNlICsgJ3wnICtcbiAgICAgICAgaW50ZXJwb2xhdGUuc291cmNlICsgJ3wnICtcbiAgICAgICAgKGludGVycG9sYXRlID09PSByZUludGVycG9sYXRlID8gcmVFc1RlbXBsYXRlIDogcmVOb01hdGNoKS5zb3VyY2UgKyAnfCcgK1xuICAgICAgICAob3B0aW9ucy5ldmFsdWF0ZSB8fCByZU5vTWF0Y2gpLnNvdXJjZSArICd8JCdcbiAgICAgICwgJ2cnKTtcblxuICAgICAgdGV4dC5yZXBsYWNlKHJlRGVsaW1pdGVycywgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZVZhbHVlLCBpbnRlcnBvbGF0ZVZhbHVlLCBlc1RlbXBsYXRlVmFsdWUsIGV2YWx1YXRlVmFsdWUsIG9mZnNldCkge1xuICAgICAgICBpbnRlcnBvbGF0ZVZhbHVlIHx8IChpbnRlcnBvbGF0ZVZhbHVlID0gZXNUZW1wbGF0ZVZhbHVlKTtcblxuICAgICAgICAvLyBlc2NhcGUgY2hhcmFjdGVycyB0aGF0IGNhbm5vdCBiZSBpbmNsdWRlZCBpbiBzdHJpbmcgbGl0ZXJhbHNcbiAgICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShyZVVuZXNjYXBlZFN0cmluZywgZXNjYXBlU3RyaW5nQ2hhcik7XG5cbiAgICAgICAgLy8gcmVwbGFjZSBkZWxpbWl0ZXJzIHdpdGggc25pcHBldHNcbiAgICAgICAgaWYgKGVzY2FwZVZhbHVlKSB7XG4gICAgICAgICAgc291cmNlICs9IFwiJyArXFxuX19lKFwiICsgZXNjYXBlVmFsdWUgKyBcIikgK1xcbidcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZhbHVhdGVWYWx1ZSkge1xuICAgICAgICAgIGlzRXZhbHVhdGluZyA9IHRydWU7XG4gICAgICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlVmFsdWUgKyBcIjtcXG5fX3AgKz0gJ1wiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnRlcnBvbGF0ZVZhbHVlKSB7XG4gICAgICAgICAgc291cmNlICs9IFwiJyArXFxuKChfX3QgPSAoXCIgKyBpbnRlcnBvbGF0ZVZhbHVlICsgXCIpKSA9PSBudWxsID8gJycgOiBfX3QpICtcXG4nXCI7XG4gICAgICAgIH1cbiAgICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG5cbiAgICAgICAgLy8gdGhlIEpTIGVuZ2luZSBlbWJlZGRlZCBpbiBBZG9iZSBwcm9kdWN0cyByZXF1aXJlcyByZXR1cm5pbmcgdGhlIGBtYXRjaGBcbiAgICAgICAgLy8gc3RyaW5nIGluIG9yZGVyIHRvIHByb2R1Y2UgdGhlIGNvcnJlY3QgYG9mZnNldGAgdmFsdWVcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfSk7XG5cbiAgICAgIHNvdXJjZSArPSBcIic7XFxuXCI7XG5cbiAgICAgIC8vIGlmIGB2YXJpYWJsZWAgaXMgbm90IHNwZWNpZmllZCwgd3JhcCBhIHdpdGgtc3RhdGVtZW50IGFyb3VuZCB0aGUgZ2VuZXJhdGVkXG4gICAgICAvLyBjb2RlIHRvIGFkZCB0aGUgZGF0YSBvYmplY3QgdG8gdGhlIHRvcCBvZiB0aGUgc2NvcGUgY2hhaW5cbiAgICAgIHZhciB2YXJpYWJsZSA9IG9wdGlvbnMudmFyaWFibGUsXG4gICAgICAgICAgaGFzVmFyaWFibGUgPSB2YXJpYWJsZTtcblxuICAgICAgaWYgKCFoYXNWYXJpYWJsZSkge1xuICAgICAgICB2YXJpYWJsZSA9ICdvYmonO1xuICAgICAgICBzb3VyY2UgPSAnd2l0aCAoJyArIHZhcmlhYmxlICsgJykge1xcbicgKyBzb3VyY2UgKyAnXFxufVxcbic7XG4gICAgICB9XG4gICAgICAvLyBjbGVhbnVwIGNvZGUgYnkgc3RyaXBwaW5nIGVtcHR5IHN0cmluZ3NcbiAgICAgIHNvdXJjZSA9IChpc0V2YWx1YXRpbmcgPyBzb3VyY2UucmVwbGFjZShyZUVtcHR5U3RyaW5nTGVhZGluZywgJycpIDogc291cmNlKVxuICAgICAgICAucmVwbGFjZShyZUVtcHR5U3RyaW5nTWlkZGxlLCAnJDEnKVxuICAgICAgICAucmVwbGFjZShyZUVtcHR5U3RyaW5nVHJhaWxpbmcsICckMTsnKTtcblxuICAgICAgLy8gZnJhbWUgY29kZSBhcyB0aGUgZnVuY3Rpb24gYm9keVxuICAgICAgc291cmNlID0gJ2Z1bmN0aW9uKCcgKyB2YXJpYWJsZSArICcpIHtcXG4nICtcbiAgICAgICAgKGhhc1ZhcmlhYmxlID8gJycgOiB2YXJpYWJsZSArICcgfHwgKCcgKyB2YXJpYWJsZSArICcgPSB7fSk7XFxuJykgK1xuICAgICAgICBcInZhciBfX3QsIF9fcCA9ICcnLCBfX2UgPSBfLmVzY2FwZVwiICtcbiAgICAgICAgKGlzRXZhbHVhdGluZ1xuICAgICAgICAgID8gJywgX19qID0gQXJyYXkucHJvdG90eXBlLmpvaW47XFxuJyArXG4gICAgICAgICAgICBcImZ1bmN0aW9uIHByaW50KCkgeyBfX3AgKz0gX19qLmNhbGwoYXJndW1lbnRzLCAnJykgfVxcblwiXG4gICAgICAgICAgOiAnO1xcbidcbiAgICAgICAgKSArXG4gICAgICAgIHNvdXJjZSArXG4gICAgICAgICdyZXR1cm4gX19wXFxufSc7XG5cbiAgICAgIC8vIFVzZSBhIHNvdXJjZVVSTCBmb3IgZWFzaWVyIGRlYnVnZ2luZy5cbiAgICAgIC8vIGh0dHA6Ly93d3cuaHRtbDVyb2Nrcy5jb20vZW4vdHV0b3JpYWxzL2RldmVsb3BlcnRvb2xzL3NvdXJjZW1hcHMvI3RvYy1zb3VyY2V1cmxcbiAgICAgIHZhciBzb3VyY2VVUkwgPSAnXFxuLypcXG4vLyMgc291cmNlVVJMPScgKyAob3B0aW9ucy5zb3VyY2VVUkwgfHwgJy9sb2Rhc2gvdGVtcGxhdGUvc291cmNlWycgKyAodGVtcGxhdGVDb3VudGVyKyspICsgJ10nKSArICdcXG4qLyc7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBGdW5jdGlvbihpbXBvcnRzS2V5cywgJ3JldHVybiAnICsgc291cmNlICsgc291cmNlVVJMKS5hcHBseSh1bmRlZmluZWQsIGltcG9ydHNWYWx1ZXMpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdChkYXRhKTtcbiAgICAgIH1cbiAgICAgIC8vIHByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uJ3Mgc291cmNlIGJ5IGl0cyBgdG9TdHJpbmdgIG1ldGhvZCwgaW5cbiAgICAgIC8vIHN1cHBvcnRlZCBlbnZpcm9ubWVudHMsIG9yIHRoZSBgc291cmNlYCBwcm9wZXJ0eSBhcyBhIGNvbnZlbmllbmNlIGZvclxuICAgICAgLy8gaW5saW5pbmcgY29tcGlsZWQgdGVtcGxhdGVzIGR1cmluZyB0aGUgYnVpbGQgcHJvY2Vzc1xuICAgICAgcmVzdWx0LnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZXMgdGhlIGNhbGxiYWNrIGBuYCB0aW1lcywgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHRoZSByZXN1bHRzXG4gICAgICogb2YgZWFjaCBjYWxsYmFjayBleGVjdXRpb24uIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWRcbiAgICAgKiB3aXRoIG9uZSBhcmd1bWVudDsgKGluZGV4KS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIGV4ZWN1dGUgdGhlIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHJlc3VsdHMgb2YgZWFjaCBgY2FsbGJhY2tgIGV4ZWN1dGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGRpY2VSb2xscyA9IF8udGltZXMoMywgXy5wYXJ0aWFsKF8ucmFuZG9tLCAxLCA2KSk7XG4gICAgICogLy8gPT4gWzMsIDYsIDRdXG4gICAgICpcbiAgICAgKiBfLnRpbWVzKDMsIGZ1bmN0aW9uKG4pIHsgbWFnZS5jYXN0U3BlbGwobik7IH0pO1xuICAgICAqIC8vID0+IGNhbGxzIGBtYWdlLmNhc3RTcGVsbChuKWAgdGhyZWUgdGltZXMsIHBhc3NpbmcgYG5gIG9mIGAwYCwgYDFgLCBhbmQgYDJgIHJlc3BlY3RpdmVseVxuICAgICAqXG4gICAgICogXy50aW1lcygzLCBmdW5jdGlvbihuKSB7IHRoaXMuY2FzdChuKTsgfSwgbWFnZSk7XG4gICAgICogLy8gPT4gYWxzbyBjYWxscyBgbWFnZS5jYXN0U3BlbGwobilgIHRocmVlIHRpbWVzXG4gICAgICovXG4gICAgZnVuY3Rpb24gdGltZXMobiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIG4gPSAobiA9ICtuKSA+IC0xID8gbiA6IDA7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShuKTtcblxuICAgICAgY2FsbGJhY2sgPSBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDEpO1xuICAgICAgd2hpbGUgKCsraW5kZXggPCBuKSB7XG4gICAgICAgIHJlc3VsdFtpbmRleF0gPSBjYWxsYmFjayhpbmRleCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBpbnZlcnNlIG9mIGBfLmVzY2FwZWAgdGhpcyBtZXRob2QgY29udmVydHMgdGhlIEhUTUwgZW50aXRpZXNcbiAgICAgKiBgJmFtcDtgLCBgJmx0O2AsIGAmZ3Q7YCwgYCZxdW90O2AsIGFuZCBgJiMzOTtgIGluIGBzdHJpbmdgIHRvIHRoZWlyXG4gICAgICogY29ycmVzcG9uZGluZyBjaGFyYWN0ZXJzLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byB1bmVzY2FwZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSB1bmVzY2FwZWQgc3RyaW5nLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnVuZXNjYXBlKCdGcmVkLCBCYXJuZXkgJmFtcDsgUGViYmxlcycpO1xuICAgICAqIC8vID0+ICdGcmVkLCBCYXJuZXkgJiBQZWJibGVzJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuZXNjYXBlKHN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZyA9PSBudWxsID8gJycgOiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKHJlRXNjYXBlZEh0bWwsIHVuZXNjYXBlSHRtbENoYXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhIHVuaXF1ZSBJRC4gSWYgYHByZWZpeGAgaXMgcHJvdmlkZWQgdGhlIElEIHdpbGwgYmUgYXBwZW5kZWQgdG8gaXQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtwcmVmaXhdIFRoZSB2YWx1ZSB0byBwcmVmaXggdGhlIElEIHdpdGguXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgdW5pcXVlIElELlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnVuaXF1ZUlkKCdjb250YWN0XycpO1xuICAgICAqIC8vID0+ICdjb250YWN0XzEwNCdcbiAgICAgKlxuICAgICAqIF8udW5pcXVlSWQoKTtcbiAgICAgKiAvLyA9PiAnMTA1J1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuaXF1ZUlkKHByZWZpeCkge1xuICAgICAgdmFyIGlkID0gKytpZENvdW50ZXI7XG4gICAgICByZXR1cm4gU3RyaW5nKHByZWZpeCA9PSBudWxsID8gJycgOiBwcmVmaXgpICsgaWQ7XG4gICAgfVxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgYGxvZGFzaGAgb2JqZWN0IHRoYXQgd3JhcHMgdGhlIGdpdmVuIHZhbHVlIHdpdGggZXhwbGljaXRcbiAgICAgKiBtZXRob2QgY2hhaW5pbmcgZW5hYmxlZC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDaGFpbmluZ1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHdyYXAuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgd3JhcHBlciBvYmplY3QuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYWdlJzogNDAgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogdmFyIHlvdW5nZXN0ID0gXy5jaGFpbihjaGFyYWN0ZXJzKVxuICAgICAqICAgICAuc29ydEJ5KCdhZ2UnKVxuICAgICAqICAgICAubWFwKGZ1bmN0aW9uKGNocikgeyByZXR1cm4gY2hyLm5hbWUgKyAnIGlzICcgKyBjaHIuYWdlOyB9KVxuICAgICAqICAgICAuZmlyc3QoKVxuICAgICAqICAgICAudmFsdWUoKTtcbiAgICAgKiAvLyA9PiAncGViYmxlcyBpcyAxJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNoYWluKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IG5ldyBsb2Rhc2hXcmFwcGVyKHZhbHVlKTtcbiAgICAgIHZhbHVlLl9fY2hhaW5fXyA9IHRydWU7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW52b2tlcyBgaW50ZXJjZXB0b3JgIHdpdGggdGhlIGB2YWx1ZWAgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCB0aGVuXG4gICAgICogcmV0dXJucyBgdmFsdWVgLiBUaGUgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2RcbiAgICAgKiBjaGFpbiBpbiBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluXG4gICAgICogdGhlIGNoYWluLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENoYWluaW5nXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvdmlkZSB0byBgaW50ZXJjZXB0b3JgLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGludGVyY2VwdG9yIFRoZSBmdW5jdGlvbiB0byBpbnZva2UuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgYHZhbHVlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXyhbMSwgMiwgMywgNF0pXG4gICAgICogIC50YXAoZnVuY3Rpb24oYXJyYXkpIHsgYXJyYXkucG9wKCk7IH0pXG4gICAgICogIC5yZXZlcnNlKClcbiAgICAgKiAgLnZhbHVlKCk7XG4gICAgICogLy8gPT4gWzMsIDIsIDFdXG4gICAgICovXG4gICAgZnVuY3Rpb24gdGFwKHZhbHVlLCBpbnRlcmNlcHRvcikge1xuICAgICAgaW50ZXJjZXB0b3IodmFsdWUpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgZXhwbGljaXQgbWV0aG9kIGNoYWluaW5nIG9uIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBuYW1lIGNoYWluXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ2hhaW5pbmdcbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgd3JhcHBlciBvYmplY3QuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gd2l0aG91dCBleHBsaWNpdCBjaGFpbmluZ1xuICAgICAqIF8oY2hhcmFjdGVycykuZmlyc3QoKTtcbiAgICAgKiAvLyA9PiB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9XG4gICAgICpcbiAgICAgKiAvLyB3aXRoIGV4cGxpY2l0IGNoYWluaW5nXG4gICAgICogXyhjaGFyYWN0ZXJzKS5jaGFpbigpXG4gICAgICogICAuZmlyc3QoKVxuICAgICAqICAgLnBpY2soJ2FnZScpXG4gICAgICogICAudmFsdWUoKTtcbiAgICAgKiAvLyA9PiB7ICdhZ2UnOiAzNiB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gd3JhcHBlckNoYWluKCkge1xuICAgICAgdGhpcy5fX2NoYWluX18gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvZHVjZXMgdGhlIGB0b1N0cmluZ2AgcmVzdWx0IG9mIHRoZSB3cmFwcGVkIHZhbHVlLlxuICAgICAqXG4gICAgICogQG5hbWUgdG9TdHJpbmdcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDaGFpbmluZ1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZyByZXN1bHQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8oWzEsIDIsIDNdKS50b1N0cmluZygpO1xuICAgICAqIC8vID0+ICcxLDIsMydcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB3cmFwcGVyVG9TdHJpbmcoKSB7XG4gICAgICByZXR1cm4gU3RyaW5nKHRoaXMuX193cmFwcGVkX18pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB3cmFwcGVkIHZhbHVlLlxuICAgICAqXG4gICAgICogQG5hbWUgdmFsdWVPZlxuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIHZhbHVlXG4gICAgICogQGNhdGVnb3J5IENoYWluaW5nXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHdyYXBwZWQgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8oWzEsIDIsIDNdKS52YWx1ZU9mKCk7XG4gICAgICogLy8gPT4gWzEsIDIsIDNdXG4gICAgICovXG4gICAgZnVuY3Rpb24gd3JhcHBlclZhbHVlT2YoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fX3dyYXBwZWRfXztcbiAgICB9XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8vIGFkZCBmdW5jdGlvbnMgdGhhdCByZXR1cm4gd3JhcHBlZCB2YWx1ZXMgd2hlbiBjaGFpbmluZ1xuICAgIGxvZGFzaC5hZnRlciA9IGFmdGVyO1xuICAgIGxvZGFzaC5hc3NpZ24gPSBhc3NpZ247XG4gICAgbG9kYXNoLmF0ID0gYXQ7XG4gICAgbG9kYXNoLmJpbmQgPSBiaW5kO1xuICAgIGxvZGFzaC5iaW5kQWxsID0gYmluZEFsbDtcbiAgICBsb2Rhc2guYmluZEtleSA9IGJpbmRLZXk7XG4gICAgbG9kYXNoLmNoYWluID0gY2hhaW47XG4gICAgbG9kYXNoLmNvbXBhY3QgPSBjb21wYWN0O1xuICAgIGxvZGFzaC5jb21wb3NlID0gY29tcG9zZTtcbiAgICBsb2Rhc2guY29uc3RhbnQgPSBjb25zdGFudDtcbiAgICBsb2Rhc2guY291bnRCeSA9IGNvdW50Qnk7XG4gICAgbG9kYXNoLmNyZWF0ZSA9IGNyZWF0ZTtcbiAgICBsb2Rhc2guY3JlYXRlQ2FsbGJhY2sgPSBjcmVhdGVDYWxsYmFjaztcbiAgICBsb2Rhc2guY3VycnkgPSBjdXJyeTtcbiAgICBsb2Rhc2guZGVib3VuY2UgPSBkZWJvdW5jZTtcbiAgICBsb2Rhc2guZGVmYXVsdHMgPSBkZWZhdWx0cztcbiAgICBsb2Rhc2guZGVmZXIgPSBkZWZlcjtcbiAgICBsb2Rhc2guZGVsYXkgPSBkZWxheTtcbiAgICBsb2Rhc2guZGlmZmVyZW5jZSA9IGRpZmZlcmVuY2U7XG4gICAgbG9kYXNoLmZpbHRlciA9IGZpbHRlcjtcbiAgICBsb2Rhc2guZmxhdHRlbiA9IGZsYXR0ZW47XG4gICAgbG9kYXNoLmZvckVhY2ggPSBmb3JFYWNoO1xuICAgIGxvZGFzaC5mb3JFYWNoUmlnaHQgPSBmb3JFYWNoUmlnaHQ7XG4gICAgbG9kYXNoLmZvckluID0gZm9ySW47XG4gICAgbG9kYXNoLmZvckluUmlnaHQgPSBmb3JJblJpZ2h0O1xuICAgIGxvZGFzaC5mb3JPd24gPSBmb3JPd247XG4gICAgbG9kYXNoLmZvck93blJpZ2h0ID0gZm9yT3duUmlnaHQ7XG4gICAgbG9kYXNoLmZ1bmN0aW9ucyA9IGZ1bmN0aW9ucztcbiAgICBsb2Rhc2guZ3JvdXBCeSA9IGdyb3VwQnk7XG4gICAgbG9kYXNoLmluZGV4QnkgPSBpbmRleEJ5O1xuICAgIGxvZGFzaC5pbml0aWFsID0gaW5pdGlhbDtcbiAgICBsb2Rhc2guaW50ZXJzZWN0aW9uID0gaW50ZXJzZWN0aW9uO1xuICAgIGxvZGFzaC5pbnZlcnQgPSBpbnZlcnQ7XG4gICAgbG9kYXNoLmludm9rZSA9IGludm9rZTtcbiAgICBsb2Rhc2gua2V5cyA9IGtleXM7XG4gICAgbG9kYXNoLm1hcCA9IG1hcDtcbiAgICBsb2Rhc2gubWFwVmFsdWVzID0gbWFwVmFsdWVzO1xuICAgIGxvZGFzaC5tYXggPSBtYXg7XG4gICAgbG9kYXNoLm1lbW9pemUgPSBtZW1vaXplO1xuICAgIGxvZGFzaC5tZXJnZSA9IG1lcmdlO1xuICAgIGxvZGFzaC5taW4gPSBtaW47XG4gICAgbG9kYXNoLm9taXQgPSBvbWl0O1xuICAgIGxvZGFzaC5vbmNlID0gb25jZTtcbiAgICBsb2Rhc2gucGFpcnMgPSBwYWlycztcbiAgICBsb2Rhc2gucGFydGlhbCA9IHBhcnRpYWw7XG4gICAgbG9kYXNoLnBhcnRpYWxSaWdodCA9IHBhcnRpYWxSaWdodDtcbiAgICBsb2Rhc2gucGljayA9IHBpY2s7XG4gICAgbG9kYXNoLnBsdWNrID0gcGx1Y2s7XG4gICAgbG9kYXNoLnByb3BlcnR5ID0gcHJvcGVydHk7XG4gICAgbG9kYXNoLnB1bGwgPSBwdWxsO1xuICAgIGxvZGFzaC5yYW5nZSA9IHJhbmdlO1xuICAgIGxvZGFzaC5yZWplY3QgPSByZWplY3Q7XG4gICAgbG9kYXNoLnJlbW92ZSA9IHJlbW92ZTtcbiAgICBsb2Rhc2gucmVzdCA9IHJlc3Q7XG4gICAgbG9kYXNoLnNodWZmbGUgPSBzaHVmZmxlO1xuICAgIGxvZGFzaC5zb3J0QnkgPSBzb3J0Qnk7XG4gICAgbG9kYXNoLnRhcCA9IHRhcDtcbiAgICBsb2Rhc2gudGhyb3R0bGUgPSB0aHJvdHRsZTtcbiAgICBsb2Rhc2gudGltZXMgPSB0aW1lcztcbiAgICBsb2Rhc2gudG9BcnJheSA9IHRvQXJyYXk7XG4gICAgbG9kYXNoLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICBsb2Rhc2gudW5pb24gPSB1bmlvbjtcbiAgICBsb2Rhc2gudW5pcSA9IHVuaXE7XG4gICAgbG9kYXNoLnZhbHVlcyA9IHZhbHVlcztcbiAgICBsb2Rhc2gud2hlcmUgPSB3aGVyZTtcbiAgICBsb2Rhc2gud2l0aG91dCA9IHdpdGhvdXQ7XG4gICAgbG9kYXNoLndyYXAgPSB3cmFwO1xuICAgIGxvZGFzaC54b3IgPSB4b3I7XG4gICAgbG9kYXNoLnppcCA9IHppcDtcbiAgICBsb2Rhc2guemlwT2JqZWN0ID0gemlwT2JqZWN0O1xuXG4gICAgLy8gYWRkIGFsaWFzZXNcbiAgICBsb2Rhc2guY29sbGVjdCA9IG1hcDtcbiAgICBsb2Rhc2guZHJvcCA9IHJlc3Q7XG4gICAgbG9kYXNoLmVhY2ggPSBmb3JFYWNoO1xuICAgIGxvZGFzaC5lYWNoUmlnaHQgPSBmb3JFYWNoUmlnaHQ7XG4gICAgbG9kYXNoLmV4dGVuZCA9IGFzc2lnbjtcbiAgICBsb2Rhc2gubWV0aG9kcyA9IGZ1bmN0aW9ucztcbiAgICBsb2Rhc2gub2JqZWN0ID0gemlwT2JqZWN0O1xuICAgIGxvZGFzaC5zZWxlY3QgPSBmaWx0ZXI7XG4gICAgbG9kYXNoLnRhaWwgPSByZXN0O1xuICAgIGxvZGFzaC51bmlxdWUgPSB1bmlxO1xuICAgIGxvZGFzaC51bnppcCA9IHppcDtcblxuICAgIC8vIGFkZCBmdW5jdGlvbnMgdG8gYGxvZGFzaC5wcm90b3R5cGVgXG4gICAgbWl4aW4obG9kYXNoKTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLy8gYWRkIGZ1bmN0aW9ucyB0aGF0IHJldHVybiB1bndyYXBwZWQgdmFsdWVzIHdoZW4gY2hhaW5pbmdcbiAgICBsb2Rhc2guY2xvbmUgPSBjbG9uZTtcbiAgICBsb2Rhc2guY2xvbmVEZWVwID0gY2xvbmVEZWVwO1xuICAgIGxvZGFzaC5jb250YWlucyA9IGNvbnRhaW5zO1xuICAgIGxvZGFzaC5lc2NhcGUgPSBlc2NhcGU7XG4gICAgbG9kYXNoLmV2ZXJ5ID0gZXZlcnk7XG4gICAgbG9kYXNoLmZpbmQgPSBmaW5kO1xuICAgIGxvZGFzaC5maW5kSW5kZXggPSBmaW5kSW5kZXg7XG4gICAgbG9kYXNoLmZpbmRLZXkgPSBmaW5kS2V5O1xuICAgIGxvZGFzaC5maW5kTGFzdCA9IGZpbmRMYXN0O1xuICAgIGxvZGFzaC5maW5kTGFzdEluZGV4ID0gZmluZExhc3RJbmRleDtcbiAgICBsb2Rhc2guZmluZExhc3RLZXkgPSBmaW5kTGFzdEtleTtcbiAgICBsb2Rhc2guaGFzID0gaGFzO1xuICAgIGxvZGFzaC5pZGVudGl0eSA9IGlkZW50aXR5O1xuICAgIGxvZGFzaC5pbmRleE9mID0gaW5kZXhPZjtcbiAgICBsb2Rhc2guaXNBcmd1bWVudHMgPSBpc0FyZ3VtZW50cztcbiAgICBsb2Rhc2guaXNBcnJheSA9IGlzQXJyYXk7XG4gICAgbG9kYXNoLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcbiAgICBsb2Rhc2guaXNEYXRlID0gaXNEYXRlO1xuICAgIGxvZGFzaC5pc0VsZW1lbnQgPSBpc0VsZW1lbnQ7XG4gICAgbG9kYXNoLmlzRW1wdHkgPSBpc0VtcHR5O1xuICAgIGxvZGFzaC5pc0VxdWFsID0gaXNFcXVhbDtcbiAgICBsb2Rhc2guaXNGaW5pdGUgPSBpc0Zpbml0ZTtcbiAgICBsb2Rhc2guaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4gICAgbG9kYXNoLmlzTmFOID0gaXNOYU47XG4gICAgbG9kYXNoLmlzTnVsbCA9IGlzTnVsbDtcbiAgICBsb2Rhc2guaXNOdW1iZXIgPSBpc051bWJlcjtcbiAgICBsb2Rhc2guaXNPYmplY3QgPSBpc09iamVjdDtcbiAgICBsb2Rhc2guaXNQbGFpbk9iamVjdCA9IGlzUGxhaW5PYmplY3Q7XG4gICAgbG9kYXNoLmlzUmVnRXhwID0gaXNSZWdFeHA7XG4gICAgbG9kYXNoLmlzU3RyaW5nID0gaXNTdHJpbmc7XG4gICAgbG9kYXNoLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG4gICAgbG9kYXNoLmxhc3RJbmRleE9mID0gbGFzdEluZGV4T2Y7XG4gICAgbG9kYXNoLm1peGluID0gbWl4aW47XG4gICAgbG9kYXNoLm5vQ29uZmxpY3QgPSBub0NvbmZsaWN0O1xuICAgIGxvZGFzaC5ub29wID0gbm9vcDtcbiAgICBsb2Rhc2gubm93ID0gbm93O1xuICAgIGxvZGFzaC5wYXJzZUludCA9IHBhcnNlSW50O1xuICAgIGxvZGFzaC5yYW5kb20gPSByYW5kb207XG4gICAgbG9kYXNoLnJlZHVjZSA9IHJlZHVjZTtcbiAgICBsb2Rhc2gucmVkdWNlUmlnaHQgPSByZWR1Y2VSaWdodDtcbiAgICBsb2Rhc2gucmVzdWx0ID0gcmVzdWx0O1xuICAgIGxvZGFzaC5ydW5JbkNvbnRleHQgPSBydW5JbkNvbnRleHQ7XG4gICAgbG9kYXNoLnNpemUgPSBzaXplO1xuICAgIGxvZGFzaC5zb21lID0gc29tZTtcbiAgICBsb2Rhc2guc29ydGVkSW5kZXggPSBzb3J0ZWRJbmRleDtcbiAgICBsb2Rhc2gudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICBsb2Rhc2gudW5lc2NhcGUgPSB1bmVzY2FwZTtcbiAgICBsb2Rhc2gudW5pcXVlSWQgPSB1bmlxdWVJZDtcblxuICAgIC8vIGFkZCBhbGlhc2VzXG4gICAgbG9kYXNoLmFsbCA9IGV2ZXJ5O1xuICAgIGxvZGFzaC5hbnkgPSBzb21lO1xuICAgIGxvZGFzaC5kZXRlY3QgPSBmaW5kO1xuICAgIGxvZGFzaC5maW5kV2hlcmUgPSBmaW5kO1xuICAgIGxvZGFzaC5mb2xkbCA9IHJlZHVjZTtcbiAgICBsb2Rhc2guZm9sZHIgPSByZWR1Y2VSaWdodDtcbiAgICBsb2Rhc2guaW5jbHVkZSA9IGNvbnRhaW5zO1xuICAgIGxvZGFzaC5pbmplY3QgPSByZWR1Y2U7XG5cbiAgICBtaXhpbihmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzb3VyY2UgPSB7fVxuICAgICAgZm9yT3duKGxvZGFzaCwgZnVuY3Rpb24oZnVuYywgbWV0aG9kTmFtZSkge1xuICAgICAgICBpZiAoIWxvZGFzaC5wcm90b3R5cGVbbWV0aG9kTmFtZV0pIHtcbiAgICAgICAgICBzb3VyY2VbbWV0aG9kTmFtZV0gPSBmdW5jO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfSgpLCBmYWxzZSk7XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8vIGFkZCBmdW5jdGlvbnMgY2FwYWJsZSBvZiByZXR1cm5pbmcgd3JhcHBlZCBhbmQgdW53cmFwcGVkIHZhbHVlcyB3aGVuIGNoYWluaW5nXG4gICAgbG9kYXNoLmZpcnN0ID0gZmlyc3Q7XG4gICAgbG9kYXNoLmxhc3QgPSBsYXN0O1xuICAgIGxvZGFzaC5zYW1wbGUgPSBzYW1wbGU7XG5cbiAgICAvLyBhZGQgYWxpYXNlc1xuICAgIGxvZGFzaC50YWtlID0gZmlyc3Q7XG4gICAgbG9kYXNoLmhlYWQgPSBmaXJzdDtcblxuICAgIGZvck93bihsb2Rhc2gsIGZ1bmN0aW9uKGZ1bmMsIG1ldGhvZE5hbWUpIHtcbiAgICAgIHZhciBjYWxsYmFja2FibGUgPSBtZXRob2ROYW1lICE9PSAnc2FtcGxlJztcbiAgICAgIGlmICghbG9kYXNoLnByb3RvdHlwZVttZXRob2ROYW1lXSkge1xuICAgICAgICBsb2Rhc2gucHJvdG90eXBlW21ldGhvZE5hbWVdPSBmdW5jdGlvbihuLCBndWFyZCkge1xuICAgICAgICAgIHZhciBjaGFpbkFsbCA9IHRoaXMuX19jaGFpbl9fLFxuICAgICAgICAgICAgICByZXN1bHQgPSBmdW5jKHRoaXMuX193cmFwcGVkX18sIG4sIGd1YXJkKTtcblxuICAgICAgICAgIHJldHVybiAhY2hhaW5BbGwgJiYgKG4gPT0gbnVsbCB8fCAoZ3VhcmQgJiYgIShjYWxsYmFja2FibGUgJiYgdHlwZW9mIG4gPT0gJ2Z1bmN0aW9uJykpKVxuICAgICAgICAgICAgPyByZXN1bHRcbiAgICAgICAgICAgIDogbmV3IGxvZGFzaFdyYXBwZXIocmVzdWx0LCBjaGFpbkFsbCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBzZW1hbnRpYyB2ZXJzaW9uIG51bWJlci5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAqL1xuICAgIGxvZGFzaC5WRVJTSU9OID0gJzIuNC4yJztcblxuICAgIC8vIGFkZCBcIkNoYWluaW5nXCIgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyXG4gICAgbG9kYXNoLnByb3RvdHlwZS5jaGFpbiA9IHdyYXBwZXJDaGFpbjtcbiAgICBsb2Rhc2gucHJvdG90eXBlLnRvU3RyaW5nID0gd3JhcHBlclRvU3RyaW5nO1xuICAgIGxvZGFzaC5wcm90b3R5cGUudmFsdWUgPSB3cmFwcGVyVmFsdWVPZjtcbiAgICBsb2Rhc2gucHJvdG90eXBlLnZhbHVlT2YgPSB3cmFwcGVyVmFsdWVPZjtcblxuICAgIC8vIGFkZCBgQXJyYXlgIGZ1bmN0aW9ucyB0aGF0IHJldHVybiB1bndyYXBwZWQgdmFsdWVzXG4gICAgZm9yRWFjaChbJ2pvaW4nLCAncG9wJywgJ3NoaWZ0J10sIGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gYXJyYXlSZWZbbWV0aG9kTmFtZV07XG4gICAgICBsb2Rhc2gucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjaGFpbkFsbCA9IHRoaXMuX19jaGFpbl9fLFxuICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLl9fd3JhcHBlZF9fLCBhcmd1bWVudHMpO1xuXG4gICAgICAgIHJldHVybiBjaGFpbkFsbFxuICAgICAgICAgID8gbmV3IGxvZGFzaFdyYXBwZXIocmVzdWx0LCBjaGFpbkFsbClcbiAgICAgICAgICA6IHJlc3VsdDtcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvLyBhZGQgYEFycmF5YCBmdW5jdGlvbnMgdGhhdCByZXR1cm4gdGhlIGV4aXN0aW5nIHdyYXBwZWQgdmFsdWVcbiAgICBmb3JFYWNoKFsncHVzaCcsICdyZXZlcnNlJywgJ3NvcnQnLCAndW5zaGlmdCddLCBmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IGFycmF5UmVmW21ldGhvZE5hbWVdO1xuICAgICAgbG9kYXNoLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBmdW5jLmFwcGx5KHRoaXMuX193cmFwcGVkX18sIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vIGFkZCBgQXJyYXlgIGZ1bmN0aW9ucyB0aGF0IHJldHVybiBuZXcgd3JhcHBlZCB2YWx1ZXNcbiAgICBmb3JFYWNoKFsnY29uY2F0JywgJ3NsaWNlJywgJ3NwbGljZSddLCBmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IGFycmF5UmVmW21ldGhvZE5hbWVdO1xuICAgICAgbG9kYXNoLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmV3IGxvZGFzaFdyYXBwZXIoZnVuYy5hcHBseSh0aGlzLl9fd3JhcHBlZF9fLCBhcmd1bWVudHMpLCB0aGlzLl9fY2hhaW5fXyk7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxvZGFzaDtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8vIGV4cG9zZSBMby1EYXNoXG4gIHZhciBfID0gcnVuSW5Db250ZXh0KCk7XG5cbiAgLy8gc29tZSBBTUQgYnVpbGQgb3B0aW1pemVycyBsaWtlIHIuanMgY2hlY2sgZm9yIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEV4cG9zZSBMby1EYXNoIHRvIHRoZSBnbG9iYWwgb2JqZWN0IGV2ZW4gd2hlbiBhbiBBTUQgbG9hZGVyIGlzIHByZXNlbnQgaW5cbiAgICAvLyBjYXNlIExvLURhc2ggaXMgbG9hZGVkIHdpdGggYSBSZXF1aXJlSlMgc2hpbSBjb25maWcuXG4gICAgLy8gU2VlIGh0dHA6Ly9yZXF1aXJlanMub3JnL2RvY3MvYXBpLmh0bWwjY29uZmlnLXNoaW1cbiAgICByb290Ll8gPSBfO1xuXG4gICAgLy8gZGVmaW5lIGFzIGFuIGFub255bW91cyBtb2R1bGUgc28sIHRocm91Z2ggcGF0aCBtYXBwaW5nLCBpdCBjYW4gYmVcbiAgICAvLyByZWZlcmVuY2VkIGFzIHRoZSBcInVuZGVyc2NvcmVcIiBtb2R1bGVcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxuICAvLyBjaGVjayBmb3IgYGV4cG9ydHNgIGFmdGVyIGBkZWZpbmVgIGluIGNhc2UgYSBidWlsZCBvcHRpbWl6ZXIgYWRkcyBhbiBgZXhwb3J0c2Agb2JqZWN0XG4gIGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUpIHtcbiAgICAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlNcbiAgICBpZiAobW9kdWxlRXhwb3J0cykge1xuICAgICAgKGZyZWVNb2R1bGUuZXhwb3J0cyA9IF8pLl8gPSBfO1xuICAgIH1cbiAgICAvLyBpbiBOYXJ3aGFsIG9yIFJoaW5vIC1yZXF1aXJlXG4gICAgZWxzZSB7XG4gICAgICBmcmVlRXhwb3J0cy5fID0gXztcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gaW4gYSBicm93c2VyIG9yIFJoaW5vXG4gICAgcm9vdC5fID0gXztcbiAgfVxufS5jYWxsKHRoaXMpKTtcbiIsIi8vICBVbmRlcnNjb3JlLnN0cmluZ1xuLy8gIChjKSAyMDEwIEVzYS1NYXR0aSBTdXVyb25lbiA8ZXNhLW1hdHRpIGFldCBzdXVyb25lbiBkb3Qgb3JnPlxuLy8gIFVuZGVyc2NvcmUuc3RyaW5nIGlzIGZyZWVseSBkaXN0cmlidXRhYmxlIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIGxpY2Vuc2UuXG4vLyAgRG9jdW1lbnRhdGlvbjogaHR0cHM6Ly9naXRodWIuY29tL2VwZWxpL3VuZGVyc2NvcmUuc3RyaW5nXG4vLyAgU29tZSBjb2RlIGlzIGJvcnJvd2VkIGZyb20gTW9vVG9vbHMgYW5kIEFsZXhhbmRydSBNYXJhc3RlYW51LlxuLy8gIFZlcnNpb24gJzIuNC4wJ1xuXG4hZnVuY3Rpb24ocm9vdCwgU3RyaW5nKXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIERlZmluaW5nIGhlbHBlciBmdW5jdGlvbnMuXG5cbiAgdmFyIG5hdGl2ZVRyaW0gPSBTdHJpbmcucHJvdG90eXBlLnRyaW07XG4gIHZhciBuYXRpdmVUcmltUmlnaHQgPSBTdHJpbmcucHJvdG90eXBlLnRyaW1SaWdodDtcbiAgdmFyIG5hdGl2ZVRyaW1MZWZ0ID0gU3RyaW5nLnByb3RvdHlwZS50cmltTGVmdDtcblxuICB2YXIgcGFyc2VOdW1iZXIgPSBmdW5jdGlvbihzb3VyY2UpIHsgcmV0dXJuIHNvdXJjZSAqIDEgfHwgMDsgfTtcblxuICB2YXIgc3RyUmVwZWF0ID0gZnVuY3Rpb24oc3RyLCBxdHkpe1xuICAgIGlmIChxdHkgPCAxKSByZXR1cm4gJyc7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIHdoaWxlIChxdHkgPiAwKSB7XG4gICAgICBpZiAocXR5ICYgMSkgcmVzdWx0ICs9IHN0cjtcbiAgICAgIHF0eSA+Pj0gMSwgc3RyICs9IHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICB2YXIgc2xpY2UgPSBbXS5zbGljZTtcblxuICB2YXIgZGVmYXVsdFRvV2hpdGVTcGFjZSA9IGZ1bmN0aW9uKGNoYXJhY3RlcnMpIHtcbiAgICBpZiAoY2hhcmFjdGVycyA9PSBudWxsKVxuICAgICAgcmV0dXJuICdcXFxccyc7XG4gICAgZWxzZSBpZiAoY2hhcmFjdGVycy5zb3VyY2UpXG4gICAgICByZXR1cm4gY2hhcmFjdGVycy5zb3VyY2U7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuICdbJyArIF9zLmVzY2FwZVJlZ0V4cChjaGFyYWN0ZXJzKSArICddJztcbiAgfTtcblxuICAvLyBIZWxwZXIgZm9yIHRvQm9vbGVhblxuICBmdW5jdGlvbiBib29sTWF0Y2gocywgbWF0Y2hlcnMpIHtcbiAgICB2YXIgaSwgbWF0Y2hlciwgZG93biA9IHMudG9Mb3dlckNhc2UoKTtcbiAgICBtYXRjaGVycyA9IFtdLmNvbmNhdChtYXRjaGVycyk7XG4gICAgZm9yIChpID0gMDsgaSA8IG1hdGNoZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBtYXRjaGVyID0gbWF0Y2hlcnNbaV07XG4gICAgICBpZiAoIW1hdGNoZXIpIGNvbnRpbnVlO1xuICAgICAgaWYgKG1hdGNoZXIudGVzdCAmJiBtYXRjaGVyLnRlc3QocykpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKG1hdGNoZXIudG9Mb3dlckNhc2UoKSA9PT0gZG93bikgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgdmFyIGVzY2FwZUNoYXJzID0ge1xuICAgIGx0OiAnPCcsXG4gICAgZ3Q6ICc+JyxcbiAgICBxdW90OiAnXCInLFxuICAgIGFtcDogJyYnLFxuICAgIGFwb3M6IFwiJ1wiXG4gIH07XG5cbiAgdmFyIHJldmVyc2VkRXNjYXBlQ2hhcnMgPSB7fTtcbiAgZm9yKHZhciBrZXkgaW4gZXNjYXBlQ2hhcnMpIHJldmVyc2VkRXNjYXBlQ2hhcnNbZXNjYXBlQ2hhcnNba2V5XV0gPSBrZXk7XG4gIHJldmVyc2VkRXNjYXBlQ2hhcnNbXCInXCJdID0gJyMzOSc7XG5cbiAgLy8gc3ByaW50ZigpIGZvciBKYXZhU2NyaXB0IDAuNy1iZXRhMVxuICAvLyBodHRwOi8vd3d3LmRpdmVpbnRvamF2YXNjcmlwdC5jb20vcHJvamVjdHMvamF2YXNjcmlwdC1zcHJpbnRmXG4gIC8vXG4gIC8vIENvcHlyaWdodCAoYykgQWxleGFuZHJ1IE1hcmFzdGVhbnUgPGFsZXhhaG9saWMgW2F0KSBnbWFpbCAoZG90XSBjb20+XG4gIC8vIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5cbiAgdmFyIHNwcmludGYgPSAoZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gZ2V0X3R5cGUodmFyaWFibGUpIHtcbiAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFyaWFibGUpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIHZhciBzdHJfcmVwZWF0ID0gc3RyUmVwZWF0O1xuXG4gICAgdmFyIHN0cl9mb3JtYXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghc3RyX2Zvcm1hdC5jYWNoZS5oYXNPd25Qcm9wZXJ0eShhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIHN0cl9mb3JtYXQuY2FjaGVbYXJndW1lbnRzWzBdXSA9IHN0cl9mb3JtYXQucGFyc2UoYXJndW1lbnRzWzBdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJfZm9ybWF0LmZvcm1hdC5jYWxsKG51bGwsIHN0cl9mb3JtYXQuY2FjaGVbYXJndW1lbnRzWzBdXSwgYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgc3RyX2Zvcm1hdC5mb3JtYXQgPSBmdW5jdGlvbihwYXJzZV90cmVlLCBhcmd2KSB7XG4gICAgICB2YXIgY3Vyc29yID0gMSwgdHJlZV9sZW5ndGggPSBwYXJzZV90cmVlLmxlbmd0aCwgbm9kZV90eXBlID0gJycsIGFyZywgb3V0cHV0ID0gW10sIGksIGssIG1hdGNoLCBwYWQsIHBhZF9jaGFyYWN0ZXIsIHBhZF9sZW5ndGg7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgdHJlZV9sZW5ndGg7IGkrKykge1xuICAgICAgICBub2RlX3R5cGUgPSBnZXRfdHlwZShwYXJzZV90cmVlW2ldKTtcbiAgICAgICAgaWYgKG5vZGVfdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBvdXRwdXQucHVzaChwYXJzZV90cmVlW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlX3R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgICAgICBtYXRjaCA9IHBhcnNlX3RyZWVbaV07IC8vIGNvbnZlbmllbmNlIHB1cnBvc2VzIG9ubHlcbiAgICAgICAgICBpZiAobWF0Y2hbMl0pIHsgLy8ga2V5d29yZCBhcmd1bWVudFxuICAgICAgICAgICAgYXJnID0gYXJndltjdXJzb3JdO1xuICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IG1hdGNoWzJdLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgIGlmICghYXJnLmhhc093blByb3BlcnR5KG1hdGNoWzJdW2tdKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzcHJpbnRmKCdbXy5zcHJpbnRmXSBwcm9wZXJ0eSBcIiVzXCIgZG9lcyBub3QgZXhpc3QnLCBtYXRjaFsyXVtrXSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFyZyA9IGFyZ1ttYXRjaFsyXVtrXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChtYXRjaFsxXSkgeyAvLyBwb3NpdGlvbmFsIGFyZ3VtZW50IChleHBsaWNpdClcbiAgICAgICAgICAgIGFyZyA9IGFyZ3ZbbWF0Y2hbMV1dO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHsgLy8gcG9zaXRpb25hbCBhcmd1bWVudCAoaW1wbGljaXQpXG4gICAgICAgICAgICBhcmcgPSBhcmd2W2N1cnNvcisrXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoL1tec10vLnRlc3QobWF0Y2hbOF0pICYmIChnZXRfdHlwZShhcmcpICE9ICdudW1iZXInKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHNwcmludGYoJ1tfLnNwcmludGZdIGV4cGVjdGluZyBudW1iZXIgYnV0IGZvdW5kICVzJywgZ2V0X3R5cGUoYXJnKSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzhdKSB7XG4gICAgICAgICAgICBjYXNlICdiJzogYXJnID0gYXJnLnRvU3RyaW5nKDIpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2MnOiBhcmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGFyZyk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZCc6IGFyZyA9IHBhcnNlSW50KGFyZywgMTApOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2UnOiBhcmcgPSBtYXRjaFs3XSA/IGFyZy50b0V4cG9uZW50aWFsKG1hdGNoWzddKSA6IGFyZy50b0V4cG9uZW50aWFsKCk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZic6IGFyZyA9IG1hdGNoWzddID8gcGFyc2VGbG9hdChhcmcpLnRvRml4ZWQobWF0Y2hbN10pIDogcGFyc2VGbG9hdChhcmcpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ28nOiBhcmcgPSBhcmcudG9TdHJpbmcoOCk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncyc6IGFyZyA9ICgoYXJnID0gU3RyaW5nKGFyZykpICYmIG1hdGNoWzddID8gYXJnLnN1YnN0cmluZygwLCBtYXRjaFs3XSkgOiBhcmcpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3UnOiBhcmcgPSBNYXRoLmFicyhhcmcpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3gnOiBhcmcgPSBhcmcudG9TdHJpbmcoMTYpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1gnOiBhcmcgPSBhcmcudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhcmcgPSAoL1tkZWZdLy50ZXN0KG1hdGNoWzhdKSAmJiBtYXRjaFszXSAmJiBhcmcgPj0gMCA/ICcrJysgYXJnIDogYXJnKTtcbiAgICAgICAgICBwYWRfY2hhcmFjdGVyID0gbWF0Y2hbNF0gPyBtYXRjaFs0XSA9PSAnMCcgPyAnMCcgOiBtYXRjaFs0XS5jaGFyQXQoMSkgOiAnICc7XG4gICAgICAgICAgcGFkX2xlbmd0aCA9IG1hdGNoWzZdIC0gU3RyaW5nKGFyZykubGVuZ3RoO1xuICAgICAgICAgIHBhZCA9IG1hdGNoWzZdID8gc3RyX3JlcGVhdChwYWRfY2hhcmFjdGVyLCBwYWRfbGVuZ3RoKSA6ICcnO1xuICAgICAgICAgIG91dHB1dC5wdXNoKG1hdGNoWzVdID8gYXJnICsgcGFkIDogcGFkICsgYXJnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG91dHB1dC5qb2luKCcnKTtcbiAgICB9O1xuXG4gICAgc3RyX2Zvcm1hdC5jYWNoZSA9IHt9O1xuXG4gICAgc3RyX2Zvcm1hdC5wYXJzZSA9IGZ1bmN0aW9uKGZtdCkge1xuICAgICAgdmFyIF9mbXQgPSBmbXQsIG1hdGNoID0gW10sIHBhcnNlX3RyZWUgPSBbXSwgYXJnX25hbWVzID0gMDtcbiAgICAgIHdoaWxlIChfZm10KSB7XG4gICAgICAgIGlmICgobWF0Y2ggPSAvXlteXFx4MjVdKy8uZXhlYyhfZm10KSkgIT09IG51bGwpIHtcbiAgICAgICAgICBwYXJzZV90cmVlLnB1c2gobWF0Y2hbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKChtYXRjaCA9IC9eXFx4MjV7Mn0vLmV4ZWMoX2ZtdCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgcGFyc2VfdHJlZS5wdXNoKCclJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKG1hdGNoID0gL15cXHgyNSg/OihbMS05XVxcZCopXFwkfFxcKChbXlxcKV0rKVxcKSk/KFxcKyk/KDB8J1teJF0pPygtKT8oXFxkKyk/KD86XFwuKFxcZCspKT8oW2ItZm9zdXhYXSkvLmV4ZWMoX2ZtdCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICAgICAgICBhcmdfbmFtZXMgfD0gMTtcbiAgICAgICAgICAgIHZhciBmaWVsZF9saXN0ID0gW10sIHJlcGxhY2VtZW50X2ZpZWxkID0gbWF0Y2hbMl0sIGZpZWxkX21hdGNoID0gW107XG4gICAgICAgICAgICBpZiAoKGZpZWxkX21hdGNoID0gL14oW2Etel9dW2Etel9cXGRdKikvaS5leGVjKHJlcGxhY2VtZW50X2ZpZWxkKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgZmllbGRfbGlzdC5wdXNoKGZpZWxkX21hdGNoWzFdKTtcbiAgICAgICAgICAgICAgd2hpbGUgKChyZXBsYWNlbWVudF9maWVsZCA9IHJlcGxhY2VtZW50X2ZpZWxkLnN1YnN0cmluZyhmaWVsZF9tYXRjaFswXS5sZW5ndGgpKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBpZiAoKGZpZWxkX21hdGNoID0gL15cXC4oW2Etel9dW2Etel9cXGRdKikvaS5leGVjKHJlcGxhY2VtZW50X2ZpZWxkKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIGZpZWxkX2xpc3QucHVzaChmaWVsZF9tYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKChmaWVsZF9tYXRjaCA9IC9eXFxbKFxcZCspXFxdLy5leGVjKHJlcGxhY2VtZW50X2ZpZWxkKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIGZpZWxkX2xpc3QucHVzaChmaWVsZF9tYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdbXy5zcHJpbnRmXSBodWg/Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdbXy5zcHJpbnRmXSBodWg/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXRjaFsyXSA9IGZpZWxkX2xpc3Q7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXJnX25hbWVzIHw9IDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcmdfbmFtZXMgPT09IDMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignW18uc3ByaW50Zl0gbWl4aW5nIHBvc2l0aW9uYWwgYW5kIG5hbWVkIHBsYWNlaG9sZGVycyBpcyBub3QgKHlldCkgc3VwcG9ydGVkJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcnNlX3RyZWUucHVzaChtYXRjaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdbXy5zcHJpbnRmXSBodWg/Jyk7XG4gICAgICAgIH1cbiAgICAgICAgX2ZtdCA9IF9mbXQuc3Vic3RyaW5nKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyc2VfdHJlZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHN0cl9mb3JtYXQ7XG4gIH0pKCk7XG5cblxuXG4gIC8vIERlZmluaW5nIHVuZGVyc2NvcmUuc3RyaW5nXG5cbiAgdmFyIF9zID0ge1xuXG4gICAgVkVSU0lPTjogJzIuNC4wJyxcblxuICAgIGlzQmxhbms6IGZ1bmN0aW9uKHN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHN0ciA9ICcnO1xuICAgICAgcmV0dXJuICgvXlxccyokLykudGVzdChzdHIpO1xuICAgIH0sXG5cbiAgICBzdHJpcFRhZ3M6IGZ1bmN0aW9uKHN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKC88XFwvP1tePl0rPi9nLCAnJyk7XG4gICAgfSxcblxuICAgIGNhcGl0YWxpemUgOiBmdW5jdGlvbihzdHIpe1xuICAgICAgc3RyID0gc3RyID09IG51bGwgPyAnJyA6IFN0cmluZyhzdHIpO1xuICAgICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbiAgICB9LFxuXG4gICAgY2hvcDogZnVuY3Rpb24oc3RyLCBzdGVwKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgICAgc3RyID0gU3RyaW5nKHN0cik7XG4gICAgICBzdGVwID0gfn5zdGVwO1xuICAgICAgcmV0dXJuIHN0ZXAgPiAwID8gc3RyLm1hdGNoKG5ldyBSZWdFeHAoJy57MSwnICsgc3RlcCArICd9JywgJ2cnKSkgOiBbc3RyXTtcbiAgICB9LFxuXG4gICAgY2xlYW46IGZ1bmN0aW9uKHN0cil7XG4gICAgICByZXR1cm4gX3Muc3RyaXAoc3RyKS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG4gICAgfSxcblxuICAgIGNvdW50OiBmdW5jdGlvbihzdHIsIHN1YnN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwgfHwgc3Vic3RyID09IG51bGwpIHJldHVybiAwO1xuXG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgICAgIHN1YnN0ciA9IFN0cmluZyhzdWJzdHIpO1xuXG4gICAgICB2YXIgY291bnQgPSAwLFxuICAgICAgICBwb3MgPSAwLFxuICAgICAgICBsZW5ndGggPSBzdWJzdHIubGVuZ3RoO1xuXG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBwb3MgPSBzdHIuaW5kZXhPZihzdWJzdHIsIHBvcyk7XG4gICAgICAgIGlmIChwb3MgPT09IC0xKSBicmVhaztcbiAgICAgICAgY291bnQrKztcbiAgICAgICAgcG9zICs9IGxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH0sXG5cbiAgICBjaGFyczogZnVuY3Rpb24oc3RyKSB7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5zcGxpdCgnJyk7XG4gICAgfSxcblxuICAgIHN3YXBDYXNlOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UoL1xcUy9nLCBmdW5jdGlvbihjKXtcbiAgICAgICAgcmV0dXJuIGMgPT09IGMudG9VcHBlckNhc2UoKSA/IGMudG9Mb3dlckNhc2UoKSA6IGMudG9VcHBlckNhc2UoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBlc2NhcGVIVE1MOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UoL1smPD5cIiddL2csIGZ1bmN0aW9uKG0peyByZXR1cm4gJyYnICsgcmV2ZXJzZWRFc2NhcGVDaGFyc1ttXSArICc7JzsgfSk7XG4gICAgfSxcblxuICAgIHVuZXNjYXBlSFRNTDogZnVuY3Rpb24oc3RyKSB7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKC9cXCYoW147XSspOy9nLCBmdW5jdGlvbihlbnRpdHksIGVudGl0eUNvZGUpe1xuICAgICAgICB2YXIgbWF0Y2g7XG5cbiAgICAgICAgaWYgKGVudGl0eUNvZGUgaW4gZXNjYXBlQ2hhcnMpIHtcbiAgICAgICAgICByZXR1cm4gZXNjYXBlQ2hhcnNbZW50aXR5Q29kZV07XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2ggPSBlbnRpdHlDb2RlLm1hdGNoKC9eI3goW1xcZGEtZkEtRl0rKSQvKSkge1xuICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnNlSW50KG1hdGNoWzFdLCAxNikpO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoID0gZW50aXR5Q29kZS5tYXRjaCgvXiMoXFxkKykkLykpIHtcbiAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSh+fm1hdGNoWzFdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZW50aXR5O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZXNjYXBlUmVnRXhwOiBmdW5jdGlvbihzdHIpe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZSgvKFsuKis/Xj0hOiR7fSgpfFtcXF1cXC9cXFxcXSkvZywgJ1xcXFwkMScpO1xuICAgIH0sXG5cbiAgICBzcGxpY2U6IGZ1bmN0aW9uKHN0ciwgaSwgaG93bWFueSwgc3Vic3RyKXtcbiAgICAgIHZhciBhcnIgPSBfcy5jaGFycyhzdHIpO1xuICAgICAgYXJyLnNwbGljZSh+fmksIH5+aG93bWFueSwgc3Vic3RyKTtcbiAgICAgIHJldHVybiBhcnIuam9pbignJyk7XG4gICAgfSxcblxuICAgIGluc2VydDogZnVuY3Rpb24oc3RyLCBpLCBzdWJzdHIpe1xuICAgICAgcmV0dXJuIF9zLnNwbGljZShzdHIsIGksIDAsIHN1YnN0cik7XG4gICAgfSxcblxuICAgIGluY2x1ZGU6IGZ1bmN0aW9uKHN0ciwgbmVlZGxlKXtcbiAgICAgIGlmIChuZWVkbGUgPT09ICcnKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLmluZGV4T2YobmVlZGxlKSAhPT0gLTE7XG4gICAgfSxcblxuICAgIGpvaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgIHNlcGFyYXRvciA9IGFyZ3Muc2hpZnQoKTtcblxuICAgICAgaWYgKHNlcGFyYXRvciA9PSBudWxsKSBzZXBhcmF0b3IgPSAnJztcblxuICAgICAgcmV0dXJuIGFyZ3Muam9pbihzZXBhcmF0b3IpO1xuICAgIH0sXG5cbiAgICBsaW5lczogZnVuY3Rpb24oc3RyKSB7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5zcGxpdChcIlxcblwiKTtcbiAgICB9LFxuXG4gICAgcmV2ZXJzZTogZnVuY3Rpb24oc3RyKXtcbiAgICAgIHJldHVybiBfcy5jaGFycyhzdHIpLnJldmVyc2UoKS5qb2luKCcnKTtcbiAgICB9LFxuXG4gICAgc3RhcnRzV2l0aDogZnVuY3Rpb24oc3RyLCBzdGFydHMpe1xuICAgICAgaWYgKHN0YXJ0cyA9PT0gJycpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKHN0ciA9PSBudWxsIHx8IHN0YXJ0cyA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTsgc3RhcnRzID0gU3RyaW5nKHN0YXJ0cyk7XG4gICAgICByZXR1cm4gc3RyLmxlbmd0aCA+PSBzdGFydHMubGVuZ3RoICYmIHN0ci5zbGljZSgwLCBzdGFydHMubGVuZ3RoKSA9PT0gc3RhcnRzO1xuICAgIH0sXG5cbiAgICBlbmRzV2l0aDogZnVuY3Rpb24oc3RyLCBlbmRzKXtcbiAgICAgIGlmIChlbmRzID09PSAnJykgcmV0dXJuIHRydWU7XG4gICAgICBpZiAoc3RyID09IG51bGwgfHwgZW5kcyA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTsgZW5kcyA9IFN0cmluZyhlbmRzKTtcbiAgICAgIHJldHVybiBzdHIubGVuZ3RoID49IGVuZHMubGVuZ3RoICYmIHN0ci5zbGljZShzdHIubGVuZ3RoIC0gZW5kcy5sZW5ndGgpID09PSBlbmRzO1xuICAgIH0sXG5cbiAgICBzdWNjOiBmdW5jdGlvbihzdHIpe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgICAgIHJldHVybiBzdHIuc2xpY2UoMCwgLTEpICsgU3RyaW5nLmZyb21DaGFyQ29kZShzdHIuY2hhckNvZGVBdChzdHIubGVuZ3RoLTEpICsgMSk7XG4gICAgfSxcblxuICAgIHRpdGxlaXplOiBmdW5jdGlvbihzdHIpe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICBzdHIgID0gU3RyaW5nKHN0cikudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvKD86XnxcXHN8LSlcXFMvZywgZnVuY3Rpb24oYyl7IHJldHVybiBjLnRvVXBwZXJDYXNlKCk7IH0pO1xuICAgIH0sXG5cbiAgICBjYW1lbGl6ZTogZnVuY3Rpb24oc3RyKXtcbiAgICAgIHJldHVybiBfcy50cmltKHN0cikucmVwbGFjZSgvWy1fXFxzXSsoLik/L2csIGZ1bmN0aW9uKG1hdGNoLCBjKXsgcmV0dXJuIGMgPyBjLnRvVXBwZXJDYXNlKCkgOiBcIlwiOyB9KTtcbiAgICB9LFxuXG4gICAgdW5kZXJzY29yZWQ6IGZ1bmN0aW9uKHN0cil7XG4gICAgICByZXR1cm4gX3MudHJpbShzdHIpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0rKS9nLCAnJDFfJDInKS5yZXBsYWNlKC9bLVxcc10rL2csICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgZGFzaGVyaXplOiBmdW5jdGlvbihzdHIpe1xuICAgICAgcmV0dXJuIF9zLnRyaW0oc3RyKS5yZXBsYWNlKC8oW0EtWl0pL2csICctJDEnKS5yZXBsYWNlKC9bLV9cXHNdKy9nLCAnLScpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIGNsYXNzaWZ5OiBmdW5jdGlvbihzdHIpe1xuICAgICAgcmV0dXJuIF9zLmNhcGl0YWxpemUoX3MuY2FtZWxpemUoU3RyaW5nKHN0cikucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJykpO1xuICAgIH0sXG5cbiAgICBodW1hbml6ZTogZnVuY3Rpb24oc3RyKXtcbiAgICAgIHJldHVybiBfcy5jYXBpdGFsaXplKF9zLnVuZGVyc2NvcmVkKHN0cikucmVwbGFjZSgvX2lkJC8sJycpLnJlcGxhY2UoL18vZywgJyAnKSk7XG4gICAgfSxcblxuICAgIHRyaW06IGZ1bmN0aW9uKHN0ciwgY2hhcmFjdGVycyl7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIGlmICghY2hhcmFjdGVycyAmJiBuYXRpdmVUcmltKSByZXR1cm4gbmF0aXZlVHJpbS5jYWxsKHN0cik7XG4gICAgICBjaGFyYWN0ZXJzID0gZGVmYXVsdFRvV2hpdGVTcGFjZShjaGFyYWN0ZXJzKTtcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKG5ldyBSZWdFeHAoJ14nICsgY2hhcmFjdGVycyArICcrfCcgKyBjaGFyYWN0ZXJzICsgJyskJywgJ2cnKSwgJycpO1xuICAgIH0sXG5cbiAgICBsdHJpbTogZnVuY3Rpb24oc3RyLCBjaGFyYWN0ZXJzKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgaWYgKCFjaGFyYWN0ZXJzICYmIG5hdGl2ZVRyaW1MZWZ0KSByZXR1cm4gbmF0aXZlVHJpbUxlZnQuY2FsbChzdHIpO1xuICAgICAgY2hhcmFjdGVycyA9IGRlZmF1bHRUb1doaXRlU3BhY2UoY2hhcmFjdGVycyk7XG4gICAgICByZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZShuZXcgUmVnRXhwKCdeJyArIGNoYXJhY3RlcnMgKyAnKycpLCAnJyk7XG4gICAgfSxcblxuICAgIHJ0cmltOiBmdW5jdGlvbihzdHIsIGNoYXJhY3RlcnMpe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICBpZiAoIWNoYXJhY3RlcnMgJiYgbmF0aXZlVHJpbVJpZ2h0KSByZXR1cm4gbmF0aXZlVHJpbVJpZ2h0LmNhbGwoc3RyKTtcbiAgICAgIGNoYXJhY3RlcnMgPSBkZWZhdWx0VG9XaGl0ZVNwYWNlKGNoYXJhY3RlcnMpO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UobmV3IFJlZ0V4cChjaGFyYWN0ZXJzICsgJyskJyksICcnKTtcbiAgICB9LFxuXG4gICAgdHJ1bmNhdGU6IGZ1bmN0aW9uKHN0ciwgbGVuZ3RoLCB0cnVuY2F0ZVN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpOyB0cnVuY2F0ZVN0ciA9IHRydW5jYXRlU3RyIHx8ICcuLi4nO1xuICAgICAgbGVuZ3RoID0gfn5sZW5ndGg7XG4gICAgICByZXR1cm4gc3RyLmxlbmd0aCA+IGxlbmd0aCA/IHN0ci5zbGljZSgwLCBsZW5ndGgpICsgdHJ1bmNhdGVTdHIgOiBzdHI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIF9zLnBydW5lOiBhIG1vcmUgZWxlZ2FudCB2ZXJzaW9uIG9mIHRydW5jYXRlXG4gICAgICogcHJ1bmUgZXh0cmEgY2hhcnMsIG5ldmVyIGxlYXZpbmcgYSBoYWxmLWNob3BwZWQgd29yZC5cbiAgICAgKiBAYXV0aG9yIGdpdGh1Yi5jb20vcnd6XG4gICAgICovXG4gICAgcHJ1bmU6IGZ1bmN0aW9uKHN0ciwgbGVuZ3RoLCBwcnVuZVN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcblxuICAgICAgc3RyID0gU3RyaW5nKHN0cik7IGxlbmd0aCA9IH5+bGVuZ3RoO1xuICAgICAgcHJ1bmVTdHIgPSBwcnVuZVN0ciAhPSBudWxsID8gU3RyaW5nKHBydW5lU3RyKSA6ICcuLi4nO1xuXG4gICAgICBpZiAoc3RyLmxlbmd0aCA8PSBsZW5ndGgpIHJldHVybiBzdHI7XG5cbiAgICAgIHZhciB0bXBsID0gZnVuY3Rpb24oYyl7IHJldHVybiBjLnRvVXBwZXJDYXNlKCkgIT09IGMudG9Mb3dlckNhc2UoKSA/ICdBJyA6ICcgJzsgfSxcbiAgICAgICAgdGVtcGxhdGUgPSBzdHIuc2xpY2UoMCwgbGVuZ3RoKzEpLnJlcGxhY2UoLy4oPz1cXFcqXFx3KiQpL2csIHRtcGwpOyAvLyAnSGVsbG8sIHdvcmxkJyAtPiAnSGVsbEFBIEFBQUFBJ1xuXG4gICAgICBpZiAodGVtcGxhdGUuc2xpY2UodGVtcGxhdGUubGVuZ3RoLTIpLm1hdGNoKC9cXHdcXHcvKSlcbiAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKC9cXHMqXFxTKyQvLCAnJyk7XG4gICAgICBlbHNlXG4gICAgICAgIHRlbXBsYXRlID0gX3MucnRyaW0odGVtcGxhdGUuc2xpY2UoMCwgdGVtcGxhdGUubGVuZ3RoLTEpKTtcblxuICAgICAgcmV0dXJuICh0ZW1wbGF0ZStwcnVuZVN0cikubGVuZ3RoID4gc3RyLmxlbmd0aCA/IHN0ciA6IHN0ci5zbGljZSgwLCB0ZW1wbGF0ZS5sZW5ndGgpK3BydW5lU3RyO1xuICAgIH0sXG5cbiAgICB3b3JkczogZnVuY3Rpb24oc3RyLCBkZWxpbWl0ZXIpIHtcbiAgICAgIGlmIChfcy5pc0JsYW5rKHN0cikpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiBfcy50cmltKHN0ciwgZGVsaW1pdGVyKS5zcGxpdChkZWxpbWl0ZXIgfHwgL1xccysvKTtcbiAgICB9LFxuXG4gICAgcGFkOiBmdW5jdGlvbihzdHIsIGxlbmd0aCwgcGFkU3RyLCB0eXBlKSB7XG4gICAgICBzdHIgPSBzdHIgPT0gbnVsbCA/ICcnIDogU3RyaW5nKHN0cik7XG4gICAgICBsZW5ndGggPSB+fmxlbmd0aDtcblxuICAgICAgdmFyIHBhZGxlbiAgPSAwO1xuXG4gICAgICBpZiAoIXBhZFN0cilcbiAgICAgICAgcGFkU3RyID0gJyAnO1xuICAgICAgZWxzZSBpZiAocGFkU3RyLmxlbmd0aCA+IDEpXG4gICAgICAgIHBhZFN0ciA9IHBhZFN0ci5jaGFyQXQoMCk7XG5cbiAgICAgIHN3aXRjaCh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgICAgICBwYWRsZW4gPSBsZW5ndGggLSBzdHIubGVuZ3RoO1xuICAgICAgICAgIHJldHVybiBzdHIgKyBzdHJSZXBlYXQocGFkU3RyLCBwYWRsZW4pO1xuICAgICAgICBjYXNlICdib3RoJzpcbiAgICAgICAgICBwYWRsZW4gPSBsZW5ndGggLSBzdHIubGVuZ3RoO1xuICAgICAgICAgIHJldHVybiBzdHJSZXBlYXQocGFkU3RyLCBNYXRoLmNlaWwocGFkbGVuLzIpKSArIHN0clxuICAgICAgICAgICAgICAgICAgKyBzdHJSZXBlYXQocGFkU3RyLCBNYXRoLmZsb29yKHBhZGxlbi8yKSk7XG4gICAgICAgIGRlZmF1bHQ6IC8vICdsZWZ0J1xuICAgICAgICAgIHBhZGxlbiA9IGxlbmd0aCAtIHN0ci5sZW5ndGg7XG4gICAgICAgICAgcmV0dXJuIHN0clJlcGVhdChwYWRTdHIsIHBhZGxlbikgKyBzdHI7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbHBhZDogZnVuY3Rpb24oc3RyLCBsZW5ndGgsIHBhZFN0cikge1xuICAgICAgcmV0dXJuIF9zLnBhZChzdHIsIGxlbmd0aCwgcGFkU3RyKTtcbiAgICB9LFxuXG4gICAgcnBhZDogZnVuY3Rpb24oc3RyLCBsZW5ndGgsIHBhZFN0cikge1xuICAgICAgcmV0dXJuIF9zLnBhZChzdHIsIGxlbmd0aCwgcGFkU3RyLCAncmlnaHQnKTtcbiAgICB9LFxuXG4gICAgbHJwYWQ6IGZ1bmN0aW9uKHN0ciwgbGVuZ3RoLCBwYWRTdHIpIHtcbiAgICAgIHJldHVybiBfcy5wYWQoc3RyLCBsZW5ndGgsIHBhZFN0ciwgJ2JvdGgnKTtcbiAgICB9LFxuXG4gICAgc3ByaW50Zjogc3ByaW50ZixcblxuICAgIHZzcHJpbnRmOiBmdW5jdGlvbihmbXQsIGFyZ3Ype1xuICAgICAgYXJndi51bnNoaWZ0KGZtdCk7XG4gICAgICByZXR1cm4gc3ByaW50Zi5hcHBseShudWxsLCBhcmd2KTtcbiAgICB9LFxuXG4gICAgdG9OdW1iZXI6IGZ1bmN0aW9uKHN0ciwgZGVjaW1hbHMpIHtcbiAgICAgIGlmICghc3RyKSByZXR1cm4gMDtcbiAgICAgIHN0ciA9IF9zLnRyaW0oc3RyKTtcbiAgICAgIGlmICghc3RyLm1hdGNoKC9eLT9cXGQrKD86XFwuXFxkKyk/JC8pKSByZXR1cm4gTmFOO1xuICAgICAgcmV0dXJuIHBhcnNlTnVtYmVyKHBhcnNlTnVtYmVyKHN0cikudG9GaXhlZCh+fmRlY2ltYWxzKSk7XG4gICAgfSxcblxuICAgIG51bWJlckZvcm1hdCA6IGZ1bmN0aW9uKG51bWJlciwgZGVjLCBkc2VwLCB0c2VwKSB7XG4gICAgICBpZiAoaXNOYU4obnVtYmVyKSB8fCBudW1iZXIgPT0gbnVsbCkgcmV0dXJuICcnO1xuXG4gICAgICBudW1iZXIgPSBudW1iZXIudG9GaXhlZCh+fmRlYyk7XG4gICAgICB0c2VwID0gdHlwZW9mIHRzZXAgPT0gJ3N0cmluZycgPyB0c2VwIDogJywnO1xuXG4gICAgICB2YXIgcGFydHMgPSBudW1iZXIuc3BsaXQoJy4nKSwgZm51bXMgPSBwYXJ0c1swXSxcbiAgICAgICAgZGVjaW1hbHMgPSBwYXJ0c1sxXSA/IChkc2VwIHx8ICcuJykgKyBwYXJ0c1sxXSA6ICcnO1xuXG4gICAgICByZXR1cm4gZm51bXMucmVwbGFjZSgvKFxcZCkoPz0oPzpcXGR7M30pKyQpL2csICckMScgKyB0c2VwKSArIGRlY2ltYWxzO1xuICAgIH0sXG5cbiAgICBzdHJSaWdodDogZnVuY3Rpb24oc3RyLCBzZXApe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTsgc2VwID0gc2VwICE9IG51bGwgPyBTdHJpbmcoc2VwKSA6IHNlcDtcbiAgICAgIHZhciBwb3MgPSAhc2VwID8gLTEgOiBzdHIuaW5kZXhPZihzZXApO1xuICAgICAgcmV0dXJuIH5wb3MgPyBzdHIuc2xpY2UocG9zK3NlcC5sZW5ndGgsIHN0ci5sZW5ndGgpIDogc3RyO1xuICAgIH0sXG5cbiAgICBzdHJSaWdodEJhY2s6IGZ1bmN0aW9uKHN0ciwgc2VwKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgc3RyID0gU3RyaW5nKHN0cik7IHNlcCA9IHNlcCAhPSBudWxsID8gU3RyaW5nKHNlcCkgOiBzZXA7XG4gICAgICB2YXIgcG9zID0gIXNlcCA/IC0xIDogc3RyLmxhc3RJbmRleE9mKHNlcCk7XG4gICAgICByZXR1cm4gfnBvcyA/IHN0ci5zbGljZShwb3Mrc2VwLmxlbmd0aCwgc3RyLmxlbmd0aCkgOiBzdHI7XG4gICAgfSxcblxuICAgIHN0ckxlZnQ6IGZ1bmN0aW9uKHN0ciwgc2VwKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgc3RyID0gU3RyaW5nKHN0cik7IHNlcCA9IHNlcCAhPSBudWxsID8gU3RyaW5nKHNlcCkgOiBzZXA7XG4gICAgICB2YXIgcG9zID0gIXNlcCA/IC0xIDogc3RyLmluZGV4T2Yoc2VwKTtcbiAgICAgIHJldHVybiB+cG9zID8gc3RyLnNsaWNlKDAsIHBvcykgOiBzdHI7XG4gICAgfSxcblxuICAgIHN0ckxlZnRCYWNrOiBmdW5jdGlvbihzdHIsIHNlcCl7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHN0ciArPSAnJzsgc2VwID0gc2VwICE9IG51bGwgPyAnJytzZXAgOiBzZXA7XG4gICAgICB2YXIgcG9zID0gc3RyLmxhc3RJbmRleE9mKHNlcCk7XG4gICAgICByZXR1cm4gfnBvcyA/IHN0ci5zbGljZSgwLCBwb3MpIDogc3RyO1xuICAgIH0sXG5cbiAgICB0b1NlbnRlbmNlOiBmdW5jdGlvbihhcnJheSwgc2VwYXJhdG9yLCBsYXN0U2VwYXJhdG9yLCBzZXJpYWwpIHtcbiAgICAgIHNlcGFyYXRvciA9IHNlcGFyYXRvciB8fCAnLCAnO1xuICAgICAgbGFzdFNlcGFyYXRvciA9IGxhc3RTZXBhcmF0b3IgfHwgJyBhbmQgJztcbiAgICAgIHZhciBhID0gYXJyYXkuc2xpY2UoKSwgbGFzdE1lbWJlciA9IGEucG9wKCk7XG5cbiAgICAgIGlmIChhcnJheS5sZW5ndGggPiAyICYmIHNlcmlhbCkgbGFzdFNlcGFyYXRvciA9IF9zLnJ0cmltKHNlcGFyYXRvcikgKyBsYXN0U2VwYXJhdG9yO1xuXG4gICAgICByZXR1cm4gYS5sZW5ndGggPyBhLmpvaW4oc2VwYXJhdG9yKSArIGxhc3RTZXBhcmF0b3IgKyBsYXN0TWVtYmVyIDogbGFzdE1lbWJlcjtcbiAgICB9LFxuXG4gICAgdG9TZW50ZW5jZVNlcmlhbDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGFyZ3NbM10gPSB0cnVlO1xuICAgICAgcmV0dXJuIF9zLnRvU2VudGVuY2UuYXBwbHkoX3MsIGFyZ3MpO1xuICAgIH0sXG5cbiAgICBzbHVnaWZ5OiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuXG4gICAgICB2YXIgZnJvbSAgPSBcIsSFw6DDocOkw6LDo8Olw6bEg8SHxJnDqMOpw6vDqsOsw63Dr8OuxYLFhMOyw7PDtsO0w7XDuMWbyJnIm8O5w7rDvMO7w7HDp8W8xbpcIixcbiAgICAgICAgICB0byAgICA9IFwiYWFhYWFhYWFhY2VlZWVlaWlpaWxub29vb29vc3N0dXV1dW5jenpcIixcbiAgICAgICAgICByZWdleCA9IG5ldyBSZWdFeHAoZGVmYXVsdFRvV2hpdGVTcGFjZShmcm9tKSwgJ2cnKTtcblxuICAgICAgc3RyID0gU3RyaW5nKHN0cikudG9Mb3dlckNhc2UoKS5yZXBsYWNlKHJlZ2V4LCBmdW5jdGlvbihjKXtcbiAgICAgICAgdmFyIGluZGV4ID0gZnJvbS5pbmRleE9mKGMpO1xuICAgICAgICByZXR1cm4gdG8uY2hhckF0KGluZGV4KSB8fCAnLSc7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIF9zLmRhc2hlcml6ZShzdHIucmVwbGFjZSgvW15cXHdcXHMtXS9nLCAnJykpO1xuICAgIH0sXG5cbiAgICBzdXJyb3VuZDogZnVuY3Rpb24oc3RyLCB3cmFwcGVyKSB7XG4gICAgICByZXR1cm4gW3dyYXBwZXIsIHN0ciwgd3JhcHBlcl0uam9pbignJyk7XG4gICAgfSxcblxuICAgIHF1b3RlOiBmdW5jdGlvbihzdHIsIHF1b3RlQ2hhcikge1xuICAgICAgcmV0dXJuIF9zLnN1cnJvdW5kKHN0ciwgcXVvdGVDaGFyIHx8ICdcIicpO1xuICAgIH0sXG5cbiAgICB1bnF1b3RlOiBmdW5jdGlvbihzdHIsIHF1b3RlQ2hhcikge1xuICAgICAgcXVvdGVDaGFyID0gcXVvdGVDaGFyIHx8ICdcIic7XG4gICAgICBpZiAoc3RyWzBdID09PSBxdW90ZUNoYXIgJiYgc3RyW3N0ci5sZW5ndGgtMV0gPT09IHF1b3RlQ2hhcilcbiAgICAgICAgcmV0dXJuIHN0ci5zbGljZSgxLHN0ci5sZW5ndGgtMSk7XG4gICAgICBlbHNlIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIGV4cG9ydHM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBwcm9wIGluIHRoaXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KHByb3ApIHx8IHByb3AubWF0Y2goL14oPzppbmNsdWRlfGNvbnRhaW5zfHJldmVyc2UpJC8pKSBjb250aW51ZTtcbiAgICAgICAgcmVzdWx0W3Byb3BdID0gdGhpc1twcm9wXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgcmVwZWF0OiBmdW5jdGlvbihzdHIsIHF0eSwgc2VwYXJhdG9yKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuXG4gICAgICBxdHkgPSB+fnF0eTtcblxuICAgICAgLy8gdXNpbmcgZmFzdGVyIGltcGxlbWVudGF0aW9uIGlmIHNlcGFyYXRvciBpcyBub3QgbmVlZGVkO1xuICAgICAgaWYgKHNlcGFyYXRvciA9PSBudWxsKSByZXR1cm4gc3RyUmVwZWF0KFN0cmluZyhzdHIpLCBxdHkpO1xuXG4gICAgICAvLyB0aGlzIG9uZSBpcyBhYm91dCAzMDB4IHNsb3dlciBpbiBHb29nbGUgQ2hyb21lXG4gICAgICBmb3IgKHZhciByZXBlYXQgPSBbXTsgcXR5ID4gMDsgcmVwZWF0Wy0tcXR5XSA9IHN0cikge31cbiAgICAgIHJldHVybiByZXBlYXQuam9pbihzZXBhcmF0b3IpO1xuICAgIH0sXG5cbiAgICBuYXR1cmFsQ21wOiBmdW5jdGlvbihzdHIxLCBzdHIyKXtcbiAgICAgIGlmIChzdHIxID09IHN0cjIpIHJldHVybiAwO1xuICAgICAgaWYgKCFzdHIxKSByZXR1cm4gLTE7XG4gICAgICBpZiAoIXN0cjIpIHJldHVybiAxO1xuXG4gICAgICB2YXIgY21wUmVnZXggPSAvKFxcLlxcZCspfChcXGQrKXwoXFxEKykvZyxcbiAgICAgICAgdG9rZW5zMSA9IFN0cmluZyhzdHIxKS50b0xvd2VyQ2FzZSgpLm1hdGNoKGNtcFJlZ2V4KSxcbiAgICAgICAgdG9rZW5zMiA9IFN0cmluZyhzdHIyKS50b0xvd2VyQ2FzZSgpLm1hdGNoKGNtcFJlZ2V4KSxcbiAgICAgICAgY291bnQgPSBNYXRoLm1pbih0b2tlbnMxLmxlbmd0aCwgdG9rZW5zMi5sZW5ndGgpO1xuXG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICB2YXIgYSA9IHRva2VuczFbaV0sIGIgPSB0b2tlbnMyW2ldO1xuXG4gICAgICAgIGlmIChhICE9PSBiKXtcbiAgICAgICAgICB2YXIgbnVtMSA9IHBhcnNlSW50KGEsIDEwKTtcbiAgICAgICAgICBpZiAoIWlzTmFOKG51bTEpKXtcbiAgICAgICAgICAgIHZhciBudW0yID0gcGFyc2VJbnQoYiwgMTApO1xuICAgICAgICAgICAgaWYgKCFpc05hTihudW0yKSAmJiBudW0xIC0gbnVtMilcbiAgICAgICAgICAgICAgcmV0dXJuIG51bTEgLSBudW0yO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuczEubGVuZ3RoID09PSB0b2tlbnMyLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIHRva2VuczEubGVuZ3RoIC0gdG9rZW5zMi5sZW5ndGg7XG5cbiAgICAgIHJldHVybiBzdHIxIDwgc3RyMiA/IC0xIDogMTtcbiAgICB9LFxuXG4gICAgbGV2ZW5zaHRlaW46IGZ1bmN0aW9uKHN0cjEsIHN0cjIpIHtcbiAgICAgIGlmIChzdHIxID09IG51bGwgJiYgc3RyMiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICAgIGlmIChzdHIxID09IG51bGwpIHJldHVybiBTdHJpbmcoc3RyMikubGVuZ3RoO1xuICAgICAgaWYgKHN0cjIgPT0gbnVsbCkgcmV0dXJuIFN0cmluZyhzdHIxKS5sZW5ndGg7XG5cbiAgICAgIHN0cjEgPSBTdHJpbmcoc3RyMSk7IHN0cjIgPSBTdHJpbmcoc3RyMik7XG5cbiAgICAgIHZhciBjdXJyZW50ID0gW10sIHByZXYsIHZhbHVlO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBzdHIyLmxlbmd0aDsgaSsrKVxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBzdHIxLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYgKGkgJiYgailcbiAgICAgICAgICAgIGlmIChzdHIxLmNoYXJBdChqIC0gMSkgPT09IHN0cjIuY2hhckF0KGkgLSAxKSlcbiAgICAgICAgICAgICAgdmFsdWUgPSBwcmV2O1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGgubWluKGN1cnJlbnRbal0sIGN1cnJlbnRbaiAtIDFdLCBwcmV2KSArIDE7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdmFsdWUgPSBpICsgajtcblxuICAgICAgICAgIHByZXYgPSBjdXJyZW50W2pdO1xuICAgICAgICAgIGN1cnJlbnRbal0gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICByZXR1cm4gY3VycmVudC5wb3AoKTtcbiAgICB9LFxuXG4gICAgdG9Cb29sZWFuOiBmdW5jdGlvbihzdHIsIHRydWVWYWx1ZXMsIGZhbHNlVmFsdWVzKSB7XG4gICAgICBpZiAodHlwZW9mIHN0ciA9PT0gXCJudW1iZXJcIikgc3RyID0gXCJcIiArIHN0cjtcbiAgICAgIGlmICh0eXBlb2Ygc3RyICE9PSBcInN0cmluZ1wiKSByZXR1cm4gISFzdHI7XG4gICAgICBzdHIgPSBfcy50cmltKHN0cik7XG4gICAgICBpZiAoYm9vbE1hdGNoKHN0ciwgdHJ1ZVZhbHVlcyB8fCBbXCJ0cnVlXCIsIFwiMVwiXSkpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKGJvb2xNYXRjaChzdHIsIGZhbHNlVmFsdWVzIHx8IFtcImZhbHNlXCIsIFwiMFwiXSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gQWxpYXNlc1xuXG4gIF9zLnN0cmlwICAgID0gX3MudHJpbTtcbiAgX3MubHN0cmlwICAgPSBfcy5sdHJpbTtcbiAgX3MucnN0cmlwICAgPSBfcy5ydHJpbTtcbiAgX3MuY2VudGVyICAgPSBfcy5scnBhZDtcbiAgX3Mucmp1c3QgICAgPSBfcy5scGFkO1xuICBfcy5sanVzdCAgICA9IF9zLnJwYWQ7XG4gIF9zLmNvbnRhaW5zID0gX3MuaW5jbHVkZTtcbiAgX3MucSAgICAgICAgPSBfcy5xdW90ZTtcbiAgX3MudG9Cb29sICAgPSBfcy50b0Jvb2xlYW47XG5cbiAgLy8gRXhwb3J0aW5nXG5cbiAgLy8gQ29tbW9uSlMgbW9kdWxlIGlzIGRlZmluZWRcbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cylcbiAgICAgIG1vZHVsZS5leHBvcnRzID0gX3M7XG5cbiAgICBleHBvcnRzLl9zID0gX3M7XG4gIH1cblxuICAvLyBSZWdpc3RlciBhcyBhIG5hbWVkIG1vZHVsZSB3aXRoIEFNRC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUuc3RyaW5nJywgW10sIGZ1bmN0aW9uKCl7IHJldHVybiBfczsgfSk7XG5cblxuICAvLyBJbnRlZ3JhdGUgd2l0aCBVbmRlcnNjb3JlLmpzIGlmIGRlZmluZWRcbiAgLy8gb3IgY3JlYXRlIG91ciBvd24gdW5kZXJzY29yZSBvYmplY3QuXG4gIHJvb3QuXyA9IHJvb3QuXyB8fCB7fTtcbiAgcm9vdC5fLnN0cmluZyA9IHJvb3QuXy5zdHIgPSBfcztcbn0odGhpcywgU3RyaW5nKTtcbiJdfQ==
;