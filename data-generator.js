var fs = require('fs');
var _ = require('./lodash_full');

var hitStrength = [0,1,.462,.308,.231,.154,.154,.077,.077,.077,.077,.077,.077,.077];

var pitchStrength = [0,.923,.846,.846,.769,.846,.692,.846,.692,.769,.692,.846,.538,.846];
console.log(pitchStrength.length);


var seen = {};
var key;
var lbl = ["-","A",2,3,4,5,6,7,8,9,10,"J","Q","K"];
var out ="hand,strength(mult)\n";
//process.exit();
var db = pitchStrength;
var c1,c2,c3;
var data = [];
for( var i=1; i < db.length; i++) {
    for( var j=1; j < db.length; j++) {
        for( var k=1; k < db.length; k++) {
            key = _.sortBy([i,j,k]);
            if( !_.has(seen,""+key)) {
                seen[""+key] = db[i]*db[j]*db[k];
                out += ""+
                   lbl[i] +"-"+
                   lbl[j] +"-"+ 
                   lbl[k] +","+
                   db[i]*db[j]*db[k] +"\n"; 
//                console.log(out);
            } else {
//                console.log("...skipping key: " + key);
            }
//            data.push([lbl[i],lbl[j],lbl[k],db[i]*db[j]*db[k]]);

        }
    }
}

//console.log(_.keys(seen),_.values(seen));

//fs.writeFile("./pitchStrengthDB.json",JSON.stringify(data,null,2));
fs.writeFile("./pitchStrengthDB.csv",out);