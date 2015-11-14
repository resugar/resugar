export default function clone(object) {
  return JSON.parse(JSON.stringify(object));
}
