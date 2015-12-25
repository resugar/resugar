export default function replace(destination: Object, source: Object): Object {
  for (let key in destination) {
    delete destination[key];
  }

  for (let key in source) {
    destination[key] = source[key];
  }

  return destination;
}
