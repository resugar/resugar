export default function splice<T>(array: Array<T>, element: T, ...elements: Array<T>) {
  let index = array.indexOf(element);
  if (index < 0) {
    throw new Error(`cannot splice when element is not present in the array`);
  }
  array.splice(index, 1, ...elements);
}
