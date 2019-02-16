console.log('Start of file');
let defaultExport = {};
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
