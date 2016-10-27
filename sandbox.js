/* 
values from Game AI Fuzzy Example
undesireable: left, 0, 25, 50
veryDesireable: right, 50,75,100
desireable: tri, 25, 50, 75

*/

var fzUndesireable = { type:'left', pt:[0,25,50]};
var fzDesireable = { type:'tri', pt:[25,50,75]};
var fzVeryDesireable = { type:'right', pt:[50, 75, 100]};

var fzTrapTest = { type: 'trap', pt:[0,10,15,25]};


var val = 100;
function membership(val,set) {
    return fuzzySetMembership(val,set.type,set.pt[0], set.pt[1], set.pt[2], set.pt[3] || undefined);
}


