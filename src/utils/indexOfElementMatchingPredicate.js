export default function indexOfElementMatchingPredicate<T>(
  list: Array<T>,
  predicate: (element: T) => boolean,
  start: number=0
): number {
  let index = start;
  while (index < list.length) {
    let element = list[index];
    if (predicate(element)) {
      return index;
    }
    index++;
  }
  return ~index;
}
