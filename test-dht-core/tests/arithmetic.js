var arithmetic = new Arithmetic();

var peerTo = "c6sdf7s2wlo3l3di";
var peers = ["uwj3gwqc0049rudi", "wdy0kqhwryhkt9"];
var result = arithmetic.findNearest(peerTo, peers);
if(result === "wdy0kqhwryhkt9"){
  console.log("TEST PASSED");
} else {
  console.log("TEST FAILED");
}