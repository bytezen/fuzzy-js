/*
  if we are running as a google sheet then underscore will be underscoreGS;
  
  otherwise lets run lodash;
*/

function clamp(val,min,max) {
    return Math.min(max, Math.max(val,min));
}

function norm(val,min,max) {
  if( max == min ) {
      return 0.0;
  }
  return (val-min)/(max-min);
}

function lerp(min,max,t) {
  return (1-t)*min + t*max;
}

function map(val,oldmin,oldmax,newmin,newmax) {
  var t = norm(val,oldmin,oldmax);
  return lerp(newmin,newmax,t);
}

//lerp between min and max and return N samples
function lerpArray(min,max, N) {
  var ret = [];
  for(var i=0; i <= N-1; i++) {
    ret.push( lerp(min,max, norm(i,0,N-1) ) );
  }
  
  return ret;
}

function zip(a,b) {
  var len = Math.min(a.length,b.length);
  var ret = []
  
  for(var i=0; i< len; i++) {
     ret.push( [a[i],b[i]]);  
  }
  return ret;
}

function range(beg,lim, step) {
  var ret = [];
  var inc = step || 1;
  if(lim == undefined) {
    lim = beg;
    beg = 0;
  }
  
  for(var i=beg; i < lim; i+=inc) {
    ret.push(i);
  }
  
  return ret;
}



function envelopeSegment(beg,end,begLevel, endLevel) {
  var count = end - beg + 1;
  return lerpArray(begLevel,endLevel, count);
}

function smoothstep(x) {
  return (x * x * ( 3 - (2 * x) ) );
}

function scurveLeft(beg,end, resolution) {
  var ret = [];
  var t;
  for(var i = 0; i < resolution; i++) {
    t = smoothstep(norm(i,0,resolution-1));
    ret.push( lerp(beg,end,t) );
  }
  return ret;
}

function scurve(beg, peak, end, resolution) {
  var ret = [];
  var nPeak = norm(peak,beg,end);
  var t, nt;
  for(var i = 0; i < resolution; i++) {
    nt = norm(i,0, resolution - 1 );
    
    if( nt <= nPeak ) {
      t = norm(nt,0,nPeak);
      ret.push( lerp(0,1.0,smoothstep(t)) );
    } else {
      t = norm(nt,nPeak,1.0);
      ret.push( lerp(0.0,1.0,smoothstep(1.0 - t)) );
    }
    
//    t = smoothstep(t);
    
  }
  
  return ret;
}

function sustain(beg,end,level) {
//   var count = end - beg + 1;
//   return( lerpArray(level,level,count));
  return envelopeSegment(beg,end,level,level);
}


function release(beg,end,sustainLevel,releaseLevel) {
 return envelopeSegment(beg,end,sustainLevel,releaseLevel) 
}

function attack(beg,end) {
  return envelopeSegment(beg,end,0,1.0); 
}

function formatDataSeries(rangeBeg,domain) {

//  var ret = [];
//  for(var i=0; i < domain.length; i++) {
//    ret.push( [ rangeBeg + i, domain[i] ]);
//  }
  
  //return ret;
  return zip(range(rangeBeg,rangeBeg + domain.length ),domain)  
}

/*

@param {endInclusive} boolean flag specifying if the last value should be included in the series

*/
function getAttackDataSeries(beg,end, endInclusive) {
  var dropOne = endInclusive || false;
  var series = attack(beg,end);
  
  if(!dropOne) {
    series.pop();
  }  
  
  return formatDataSeries(beg,series);
}


function constantSeries(beg,end,endInclusive) {
  var dropOne = endInclusive || false;
  var level = 1.0;
  var series = sustain(beg,end,level);
  
  if(!dropOne) {
    series.pop();
  } 
  
  return  formatDataSeries(beg, series);  
}


function constantTrueSeries(beg,end) {
  var series = lerpArray(1.0,1.0, end - beg +1); 
  return zip(range(beg,end+1),series);
}

function constantFalseSeries(beg,end) {
  var series = lerpArray(0.0,0.0, end - beg + 1);
  return zip(range(beg,end+1),series);
}

function rampDownSeries(beg,end) {
  var series = lerpArray(1.0,0.0,end-beg+1);
  var rng = range(beg,end+1);
  return zip(rng,series);
  
}

function rampUpSeries(beg,end) {
  var series = lerpArray(0,1.0,end-beg+1);
  var rng = range(beg,end+1);
  return zip(rng,series);
}


/* --- FUZZY SETS --- */

function leftShoulderFuzzySet(p0, p1, p2) {
   //var shoulderSeries = constantSeries(p0,p1,false);
   var shoulderSeries = constantTrueSeries(p0,p1);
   var rampSeries = rampDownSeries(p1,p2);
  
  shoulderSeries.pop();
  return shoulderSeries.concat(rampSeries);
}


function triangleFuzzySet(p0, p1, p2) {
  var rampUp = rampUpSeries(p0,p1);//getAttackDataSeries(p0,p1,false);
  var rampDown = rampDownSeries(p1, p2);
  
  rampUp.pop();
  return rampUp.concat(rampDown);  
}

function rightShoulderFuzzySet(p0, p1, p2 ) {
  var rampSeries = rampUpSeries(p0,p1);
  var shoulderSeries = constantTrueSeries(p1, p2);//,true);
  rampSeries.pop();
  return rampSeries.concat(shoulderSeries);
}

function trapezoidFuzzySet(p0,p1,p2,p3) {
  var rampUp = rampUpSeries(p0,p1);
  rampUp.pop(); // remove redundant ending of rampUp with shoulder beginning
  var shoulder = constantTrueSeries(p1,p2);
  shoulder.pop();
  var rampDown = rampDownSeries(p2,p3);
  
  return rampUp.concat(shoulder).concat(rampDown);
}

function smoothFuzzySet(beg, peak, end, resolution) {
  var res = resolution || 50;
  //subtract 1 from resolution so that the end is included. (do the math ;-)
  var rng = range(beg,end+1, (end - beg )/ (res-1));
  return zip(rng,scurve(beg,peak,end,res)); 
}



// --- Fuzzy Intersection code --- //


function setsOverlap(a,b) {
  var minA, maxA, minB, maxB; 
}

//patch
//underscore.each = underscore._each;

//wrapper for functional library
function _filter(arr,fn) {
    if(underscore != undefined) {
        return underscore._filter(arr, fn);          
    } else {
        return _.filter(arr, fn);
    }  
}

function _each(arr,fn) {
    if(underscore != undefined) {
        return underscore._each(arr,fn);
    } else {
        return _.each(arr,fn);
    }
}

function _has(arr,fn) {
    if(underscore != undefined) {
        return underscore._has(arr,fn);
    } else {
        return _.has(arr,fn);
    }    
}

function _map(arr, fn) {    
    if(underscore != undefined) {
        return underscore._map(arr,fn);
    } else {
        return _.map(arr,fn);
    }
}
//
//function cellTo2dArray(cells) {
//  var ret = [];
//  for(var i=0; i < cells.length; i++ ) {
//    if(cells[i].length == 2) {
//      ret.push(cells[i])
//    }
//  }
//  return ret;
//}


// @param {a} 2 dimensional array of arrays [inputVal, fuzzySetVal]
// @param {b} 2 dimensional array of arrays [inputVal, fuzzySetVal]
// 
// @return 2 dim array for fuzzy set and result
function fuzzyAnd(a,b){
  var objA = {}, objB = {};
  var seenInd = [];  

  //convert from 2D array to objects for easier lookup
//  underscore._each(a, function(x) {
//    objA[x[0]] = x[1];
//  });

    _each(a,function(x) {
    objA[x[0]] = x[1];
  });
//  underscore._each(b, function(x) {
//    objB[x[0]] = x[1];
//  });
   _each(b, function(x) {
    objB[x[0]] = x[1];
  } )
  //concatenate the sets
  var all = a.concat(b);
 
  var andSet = underscore._map(all, function(x) { 
    //if you have not seen it then keep going
    var i = x[0];
    //if we have seen this index skip it
    if( seenInd.indexOf(i) == -1 ) {
      seenInd.push(i);       
      var compA = underscore._has(objA, i) ? objA[i] : 0;     
      var compB = underscore._has(objB, i) ? objB[i] : 0;
      
      return( [i, Math.min(compA, compB)] );
    }
  })
  
  return andSet;
}



// @param {a} 2 dimensional array of arrays [inputVal, fuzzySetVal]
// @param {b} 2 dimensional array of arrays [inputVal, fuzzySetVal]
// 
// @return 2 dim array for fuzzy set and result
function fuzzyOr(a,b) {
  var objA = {}, objB = {};
  var seenInd = [];  

  //convert from 2D array to objects for easier lookup
  underscore._each(a, function(x) {
    objA[x[0]] = x[1];
  });
  underscore._each(b, function(x) {
    objB[x[0]] = x[1];
  });
   
  //concatenate the sets
  var all = a.concat(b);
  var orSet = underscore._map(all, function(x) {
    var i = x[0];

    //if we have seen this index skip it    
    if( seenInd.indexOf(i) == -1 ) {
      seenInd.push(i);       
      var compA = underscore._has(objA, i) ? objA[i] : 0;     
      var compB = underscore._has(objB, i) ? objB[i] : 0;
      
      return( [i, Math.max(compA,compB)] );
    }    
    
  });
  
  return orSet;
}

// @param {set} fuzzySet - 2 dimensional array of arrays [inputVal,fuzzySetVal] sorted ascending by inputVal
// @param {rangeMin} minimum range value
// @param {rangeMax} maximum range value
//
// @return {set} array of 2 dimensinal arrays [inputVal, fuzzySetVal] where the range of inputValues 
//               spans [rangeMin, rangeMax]; the input set is not modified
function padSet(set, rangeMin, rangeMax) {
  var setRangeMin = set[0][0];
  var setRangeMax = set[set.length - 1][0];
  var prepend = [];
  
  for(var i=rangeMin; i < setRangeMin; i++ ) {
   prepend.push([i,0]); 
  }
  
  for(i=setRangeMax + 1; i <= rangeMax; i++ ){ 
    set.push([i,0]);
  }
  
  return prepend.concat(set);
}



/* ------- FUZZY VARIABLE FUZZIFY ---- */



function fuzzySetMembership(val,setType,p0,p1,p2,p3) {
  var rangeMax = p3 || p2;
  var rangeMin = p0;
  var a,b,interval=-1;
  
val  = clamp(val,rangeMin, rangeMax);
//  return [rangeMin,rangeMax,val]
  if( rangeMin > val || val > rangeMax ) {
   return -1; 
  }
  
  if( val <= p1 ) {
    
    a = p0;
    b = p1;
    interval = 0;
  } else if( val <= p2 ) {
    a = p1;
    b = p2;
    interval = 1;
  } else if( val <= p3 ) {
    a = p2
    b = p3;
    interval = 2;
  } else {
    return -1;
  }
  
  if(setType=='left') {
    switch(interval) {
      case 0:
        return 1.0;
        break;
      case 1:
        return map(val,a,b,1.0,0.0);
        break;
      case 2:
      default:
        return -1;
    }
  }
  
  if(setType=='right') {
    switch(interval) {
      case 0:
        return map(val,a,b,0.0,1.0);
        break;
      case 1:
        return 1.0;
        break;
      case 2:
      default:
        return -1;        
    }
    
  }
  
  if(setType=='tri') {
    switch(interval) {
      case 0:
        return map(val,a,b,0.0,1.0);
        break;
      case 1:
        return map(val,a,b,1.0,0.0);            
        break;
      case 2:
        default:
        return -1;
    }
  }
  
  if(setType =='trap') {
    switch(interval) {
        case 0:
            return map(val,a,b,0.0,1.0);
            break;
        case 1:
            return 1.0;
            break;
        case 2:
            return map(val,a,b,1.0,0.0);
            break;
        default:
            return -1;
            
    }
  }
    
  return -1;
}

/*
@param {set} fuzzy set 2d array of [index, fuzzyVal]
@param {val} membership value in set

@return {set} fuzzy set that corresponds to that membership level. This will clip the fuzzy set @ val
*/
function fuzzySetConfidence(val,set) {
//  return set;
  return underscore._map(set, function(x) {
    if(x[1] < val) {
      return x;
    } else {
      return [x[0],val];
    }
  }); 
}

/* ------ DEFUZZIFICATION ----- */

/*
@param {flv} 3d array? an array of [[]]

@return {number} the concrete value that this composite fuzzy variable resolves to
*/

function defuzzMaxAv(maxAv,fuzzyMembership) {
 return  maxAv * fuzzyMembership; 
}


function averageOfMax(setType,p0,p1,p2,p3){
  var a, b;
  if(setType == 'left') {
    a = p0;
    b = p1;
  } else if(setType == 'right') {
    a = p1;
    b = p2;
  } else if(setType == 'tri') {
    a = b = p1; 
  } else if(setType == 'trap') {
    a = p1;
    b = p2;
  }
  
  return (a + b) * 0.5;
}



/*
utility method for google spreadsheet to take 3 fuzzy sets
and merge them into an flv data structure.  the data structure is
a [[[]],[[]],...] [ [[ind,val],[ind,val],...[ind,val]], ...]  or an array of fuzzy sets
where fuzzy sets are arrays of lists length 2


*/
function defuzz3(a,b,c) {
  return _defuzzify([a,b,c]); 
}