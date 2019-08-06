// config={"forceDefaultExport": true}
console.log('Start of file');
var defaultExport = {};
defaultExport = a;
if (b) {
  defaultExport.d = e;
}
for (let f in defaultExport) {
  defaultExport[f]++;
}
defaultExport[g] = {
  h() {
    console.log(this);
  }
};
export default defaultExport;
console.log('End of file');
