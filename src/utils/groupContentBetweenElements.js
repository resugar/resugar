export default function groupContentBetweenElements<T, U>(elements: Array<T>, startsNewGroupPredicate: (element: T) => boolean, contentBetweenElements: (left: T, right: T) => U): Array<Array<U>> {
  const result = [];
  let group = [];

  for (let i = 0; i < elements.length - 1; i++) {
    const thisElement = elements[i];
    const nextElement = elements[i + 1];

    if (i > 0 && startsNewGroupPredicate(thisElement)) {
      result.push(group);
      group = [];
    }

    group.push(contentBetweenElements(thisElement, nextElement));
  }

  result.push(group);

  return result;
}
